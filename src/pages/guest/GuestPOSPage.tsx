import React, { useState, useEffect } from 'react';
import {
    alpha,
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Button,
    IconButton,
    Badge,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    AppBar,
    Toolbar,
    useTheme,
    useMediaQuery,
    Paper,
    Slider,
    Divider,
    ToggleButton,
    ToggleButtonGroup,
    CircularProgress,
    Alert,
    TextField,
    MenuItem as MuiMenuItem,
    InputAdornment,
} from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import {
    Add as AddIcon,
    Remove as RemoveIcon,
    ShoppingCart as CartIcon,
    Close as CloseIcon,
    Login as LoginIcon,
    RestaurantMenu as MenuIcon,
    Restaurant as DineInIcon,
    TakeoutDining as TakeawayIcon,
    DeliveryDining as DeliveryIcon,
    ShoppingBag as OnlineTakeawayIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { useSettings } from '../../context/SettingsContext';
import { useActiveTenant } from '../../hooks/useActiveTenant';
import { menuAPI, ordersAPI } from '../../services/api';
import { CardGridSkeleton } from '../../components/common/PageSkeleton';
import { formatSpiceLevelLabel } from '../../utils/spiceLevel';
import PhonePeQrModal from '../../components/PhonePeQrModal';

interface MenuItem {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: string | { _id: string; name: string };
    image?: string;
    isAvailable: boolean;
    taxRate?: number | null;
    isSpiceLevelAvailable?: boolean;
    // Resolved server-side from the item's spice level set.
    spiceLevels?: string[];
    spiceLevelData?: Record<string, string>;
}

interface CartItem extends MenuItem {
    quantity: number;
    // Unique per item + spice level, so the same dish ordered mild and spicy
    // stays as two separate lines.
    cartId: string;
    spiceLevel?: string;
}

// Mirrors the backend rule in orders.service.ts: a coupon matches if it lists the
// exact order type, or the base type the global one maps to. Keeping both means a
// coupon can target QR ordering alone without also covering in-restaurant orders.
const BASE_ORDER_TYPE: Record<string, string> = {
    global_dine_in: 'dine_in',
    global_takeaway: 'takeaway',
};

const couponAppliesToOrderType = (coupon: any, orderType: string): boolean => {
    const types: string[] = coupon?.applicableOrderTypes || [];
    if (types.length === 0) return true;
    return types.includes(orderType) || types.includes(BASE_ORDER_TYPE[orderType]);
};

const GuestPOSPage: React.FC = () => {
    const { slug, getRelativePath } = useActiveTenant();
    const navigate = useNavigate();
    const theme = useTheme();
    const { formatCurrency } = useSettings();

    const PAGE_LIMIT = 50;
    const LOAD_MORE_LIMIT = 10;

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [foodTypeFilter, setFoodTypeFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
    const [searchInput, setSearchInput] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [totalMenuCount, setTotalMenuCount] = useState(0);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [spiceSelectionItem, setSpiceSelectionItem] = useState<MenuItem | null>(null);
    const [tempSpiceLevel, setTempSpiceLevel] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [cartOpen, setCartOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [paymentSettings, setPaymentSettings] = useState<any>(null);
    const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
    const [taxDetails, setTaxDetails] = useState<any>(null);
    const [isCalculatingTax, setIsCalculatingTax] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null);
    const [successTokenNumber, setSuccessTokenNumber] = useState<number | null>(null);
    const [orderType, setOrderType] = useState<'global_dine_in' | 'global_takeaway' | 'delivery' | 'online_takeaway'>('global_dine_in');
    const [tableNumber, setTableNumber] = useState<string>('');
    const [tables, setTables] = useState<any[]>([]);
    const [taxRate, setTaxRate] = useState<number>(5); // Default 5%, will be updated from settings

    const [searchParams] = useSearchParams();
    const tableNoParam = searchParams.get('tableNo');
    const tableIdParam = searchParams.get('tableId');
    const isQrScanned = Boolean(tableNoParam || sessionStorage.getItem('qr_table_no'));

    useEffect(() => {
        const qTableNo = tableNoParam || sessionStorage.getItem('qr_table_no');
        const qTableId = tableIdParam || sessionStorage.getItem('qr_table_id');
        if (tableNoParam) sessionStorage.setItem('qr_table_no', tableNoParam);
        if (tableIdParam) sessionStorage.setItem('qr_table_id', tableIdParam);

        if (qTableNo) {
            setTableNumber(qTableNo);
            setOrderType('global_dine_in');
        }
    }, [tableNoParam, tableIdParam]);

    // Stripe card payment
    const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [stripeLoading, setStripeLoading] = useState(false);
    const [stripeError, setStripeError] = useState<string | null>(null);
    const [stripeRetry, setStripeRetry] = useState(0);

    // Redirect-based payment return (Amazon Pay, etc.)
    const [redirectProcessing, setRedirectProcessing] = useState(false);
    const [redirectError, setRedirectError] = useState<string | null>(null);
    const [redirectPaymentId, setRedirectPaymentId] = useState<string | null>(null);

    // India tenants collect via PhonePe UPI QR instead of Stripe card.
    const isIndia = restaurantSettings?.country?.toLowerCase() === 'india';

    useEffect(() => {
        // India uses PhonePe (no Stripe intent needed).
        if (!showPayment || !slug || isIndia) return;
        let cancelled = false;
        setStripeLoading(true);
        setStripeError(null);
        setStripePromise(null);
        setClientSecret(null);
        const totals = calculateTotal();
        Promise.all([
            ordersAPI.getPublicPaymentConfig(slug, orderType),
            ordersAPI.createPublicPaymentIntent(totals.total, slug, undefined, orderType, totals.subtotal, totals.gst),
        ])
            .then(([configRes, intentRes]) => {
                if (cancelled) return;
                const key = configRes.data?.publishableKey;
                const secret = intentRes.data?.clientSecret;
                if (!key || !secret) { setStripeError('Payment configuration error.'); return; }
                setStripePromise(loadStripe(key));
                setClientSecret(secret);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('[GuestPOS] Stripe init failed:', err?.response?.data || err?.message || err);
                setStripeError('Failed to initialise payment. Please try again.');
            })
            .finally(() => { if (!cancelled) setStripeLoading(false); });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showPayment, slug, stripeRetry]);

    // Handle return from redirect-based payments (Amazon Pay, UPI redirect, etc.)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const paymentIntentId = params.get('payment_intent');
        const redirectStatus = params.get('redirect_status');
        if (!paymentIntentId || !redirectStatus) return;

        // Clean the URL immediately so a page refresh doesn't re-trigger this
        window.history.replaceState({}, '', window.location.pathname);

        const savedStr = sessionStorage.getItem('guestPendingOrder');
        sessionStorage.removeItem('guestPendingOrder');

        if (redirectStatus === 'succeeded' && savedStr) {
            try {
                const savedData = JSON.parse(savedStr);
                setRedirectProcessing(true);
                ordersAPI.createPublic({ ...savedData, paymentIntentId }, savedData.slug)
                    .then((res: any) => {
                        setSuccessOrderNumber(res.data.orderNumber || 'Unknown');
                        setSuccessTokenNumber(res.data.dailyTokenNumber ?? null);
                    })
                    .catch((err: any) => {
                        console.error('Order error after redirect payment:', err);
                        setRedirectPaymentId(paymentIntentId);
                        setRedirectError('Your payment was received but we could not confirm your order automatically. Please show the reference below to a staff member.');
                    })
                    .finally(() => setRedirectProcessing(false));
            } catch (parseErr) {
                console.error('Failed to parse guest pending order:', parseErr);
                setRedirectPaymentId(paymentIntentId);
                setRedirectError('Your payment was received. Please show the reference below to a staff member.');
            }
        } else if (redirectStatus !== 'succeeded') {
            toast.error('Payment was not completed. Please try again.');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (slug) {
            fetchPublicInfo(slug);
        }
    }, [slug]);

    // Debounce typing so we don't fire a request per keystroke.
    useEffect(() => {
        const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // The menu is cursor-paginated, so searching has to go to the server —
    // filtering locally would only ever match the pages already loaded.
    useEffect(() => {
        if (slug) {
            fetchMenu(slug, null, false, searchTerm);
        }
    }, [slug, searchTerm]);

    const fetchPublicInfo = async (tenantSlug: string) => {
        try {
            const [couponsRes, settingsRes, tablesRes] = await Promise.all([
                ordersAPI.getPublicCoupons(tenantSlug),
                ordersAPI.getPublicSettings(tenantSlug),
                ordersAPI.getPublicTables(tenantSlug)
            ]);
            setAvailableCoupons(couponsRes.data);
            setTables(Array.isArray(tablesRes.data) ? tablesRes.data : []);
            setPaymentSettings(settingsRes.data);
            setRestaurantSettings(settingsRes.data?.restaurant || null);

            // Extract tax rate from settings
            if (settingsRes.data?.restaurant?.taxRate) {
                setTaxRate(settingsRes.data.restaurant.taxRate);
                console.log('Guest POS: Tax rate loaded:', settingsRes.data.restaurant.taxRate);
            }
        } catch (error) {
            console.error('Failed to load public info', error);
        }
    };

    const fetchMenu = async (tenantSlug: string, cursor?: string | null, loadMore = false, search?: string) => {
        try {
            if (loadMore) {
                setIsFetchingMore(true);
            } else {
                setLoading(true);
            }

            const limit = loadMore ? LOAD_MORE_LIMIT : PAGE_LIMIT;
            const response = await menuAPI.getPublicMenu(tenantSlug, search || undefined, cursor, limit);
            const data = response.data;
            const items: any[] = data?.items || [];
            const newCursor: string | null = data?.nextCursor ?? null;
            const totalCount: number = data?.totalCount ?? 0;

            if (loadMore) {
                setMenuItems(prev => [...prev, ...items]);
            } else {
                setMenuItems(items);

                // Build category list from API response or fallback to items
                const apiCategories: any[] = data?.categories || [];
                if (apiCategories.length > 0) {
                    setCategories(['All', ...apiCategories.map((c: any) => c.name).filter(Boolean)]);
                } else {
                    const uniqueCategories = Array.from(
                        new Set(items.map((item: any) =>
                            typeof item.category === 'string' ? item.category : item.category?.name
                        ).filter(Boolean))
                    );
                    setCategories(['All', ...uniqueCategories as string[]]);
                }
            }

            setNextCursor(newCursor);
            setTotalMenuCount(totalCount);
        } catch (error) {
            console.error('Error fetching menu:', error);
            toast.error('Failed to load menu. Please check the URL.');
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
        }
    };

    // Debounced Tax Calculation
    useEffect(() => {
        if (cart.length === 0) {
            setTaxDetails(null);
            return;
        }

        const timer = setTimeout(async () => {
            if (!slug) return;
            try {
                setIsCalculatingTax(true);
                // Tax is sourced from the restaurant's address for every order type.
                const to_zip = restaurantSettings?.zipCode || restaurantSettings?.pincode || '';
                const to_state = restaurantSettings?.state || '';
                const to_city = restaurantSettings?.city || '';
                const to_street = restaurantSettings?.address || '';

                // Compute discount amount for tax input
                const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                let discountAmount = 0;
                if (appliedCoupon) {
                    let applicableSubtotal = subtotal;
                    if (appliedCoupon.offerType === 'menu_item' && appliedCoupon.applicableItems?.length > 0) {
                        applicableSubtotal = cart
                            .filter(item => appliedCoupon.applicableItems.includes(item._id))
                            .reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    }
                    if (applicableSubtotal > 0) {
                        if (appliedCoupon.discountType === 'percentage') {
                            discountAmount = (applicableSubtotal * appliedCoupon.discountValue) / 100;
                        } else {
                            discountAmount = Math.min(appliedCoupon.discountValue, applicableSubtotal);
                        }
                        if (appliedCoupon.maxDiscountAmount && discountAmount > appliedCoupon.maxDiscountAmount) {
                            discountAmount = appliedCoupon.maxDiscountAmount;
                        }
                    }
                }

                const payload = {
                    to_zip,
                    to_state,
                    to_city,
                    to_street,
                    discount: discountAmount,
                    line_items: cart.map(item => ({
                        itemId: item._id,
                        quantity: item.quantity,
                        price: item.price,
                        discount: 0,
                        name: item.name
                    }))
                };

                const res = await ordersAPI.calculatePublicTax(payload, slug);
                setTaxDetails(res.data || res);
            } catch (err) {
                console.error("[Tax] Dynamic calculation failed:", err);
                // Fallback to null triggers standard percentage calculation
                setTaxDetails(null);
            } finally {
                setIsCalculatingTax(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [cart, appliedCoupon, restaurantSettings, slug]);

    /** Adds to the cart, keying each spice level as its own line. */
    const addItemToCart = (item: MenuItem, spiceLevel?: string) => {
        const cartId = spiceLevel ? `${item._id}::${spiceLevel}` : item._id;
        setCart(prev => {
            const existing = prev.find(c => c.cartId === cartId);
            if (existing) {
                return prev.map(c => c.cartId === cartId ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { ...item, quantity: 1, cartId, spiceLevel }];
        });
    };

    const addToCart = (item: MenuItem) => {
        // Items offering a spice scale ask first; the levels come from the
        // item's spice level set, resolved by the API.
        if (item.isSpiceLevelAvailable && (item.spiceLevels?.length ?? 0) > 0) {
            // Start on the mildest level, matching the POS dialog.
            setTempSpiceLevel(item.spiceLevels![0]);
            setSpiceSelectionItem(item);
            return;
        }
        addItemToCart(item);
    };

    const handleConfirmSpice = (spiceLevel: string) => {
        if (!spiceSelectionItem) return;
        addItemToCart(spiceSelectionItem, spiceLevel);
        setSpiceSelectionItem(null);
    };

    const removeFromCart = (cartId: string) => {
        setCart(prev => {
            const existing = prev.find(c => c.cartId === cartId);
            if (existing && existing.quantity > 1) {
                return prev.map(c => c.cartId === cartId ? { ...c, quantity: c.quantity - 1 } : c);
            }
            if (prev.length === 1) { // If removing last item
                setAppliedCoupon(null);
                setCouponCode('');
            }
            return prev.filter(c => c.cartId !== cartId);
        });
    };

    const handleApplyCoupon = async () => {
        if (!slug || !couponCode) return;
        try {
            // Send the real order type. The backend matches the global type first and
            // falls back to its base counterpart, so mapping it down here would make a
            // global-only coupon indistinguishable from a restaurant one.
            const res = await ordersAPI.validatePublicCoupon(couponCode, slug, orderType);
            const coupon = res.data;

            if (coupon.offerType === 'menu_item' && coupon.applicableItems?.length > 0) {
                const hasApplicableItem = cart.some(item => coupon.applicableItems.includes(item._id));
                if (!hasApplicableItem) {
                    toast.error('This coupon does not apply to any items in your cart');
                    return;
                }
            }

            const totals = calculateTotal(); // Pre-discount total

            if (totals.subtotal < (coupon.minBillAmount || 0)) {
                toast.error(`Minimum bill amount of ${formatCurrency(coupon.minBillAmount)} required`);
                return;
            }
            setAppliedCoupon(coupon);
            toast.success('Coupon applied!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Invalid coupon');
            setAppliedCoupon(null);
        }
    };

    const calculateTotal = () => {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let discountAmt = 0;

        if (appliedCoupon) {
            let applicableSubtotal = subtotal;

            if (appliedCoupon.offerType === 'menu_item' && appliedCoupon.applicableItems?.length > 0) {
                applicableSubtotal = cart
                    .filter(item => appliedCoupon.applicableItems.includes(item._id))
                    .reduce((sum, item) => sum + (item.price * item.quantity), 0);
            }

            if (applicableSubtotal > 0) {
                if (appliedCoupon.discountType === 'percentage') {
                    discountAmt = (applicableSubtotal * appliedCoupon.discountValue) / 100;
                } else {
                    discountAmt = Math.min(appliedCoupon.discountValue, applicableSubtotal);
                }

                // Cap discount if needed, logic for max discount
                if (appliedCoupon.maxDiscountAmount && discountAmt > appliedCoupon.maxDiscountAmount) {
                    discountAmt = appliedCoupon.maxDiscountAmount;
                }
            }
        }

        const gst = taxDetails
            ? (taxDetails.tax?.amount_to_collect || taxDetails.taxAmount || taxDetails.amount_to_collect || taxDetails.total_tax || 0)
            : cart.reduce((sum, item) => {
                const itemTaxRate = (item.taxRate !== undefined && item.taxRate !== null) ? item.taxRate : taxRate;
                return sum + (item.price * item.quantity * (itemTaxRate / 100));
            }, 0);

        return { subtotal, discount: discountAmt, gst, total: subtotal - discountAmt + gst };
    };

    const handleProceedToPayment = () => {
        setShowPayment(true);
        setCartOpen(false);
    };

    const handleClosePayment = () => {
        setShowPayment(false);
        setStripePromise(null);
        setClientSecret(null);
        setStripeError(null);
    };

    const handlePlaceOrder = async (paymentIntentId: string, method: string = 'card') => {
        if (!slug) return;
        try {
            setSubmitting(true);
            const totals = calculateTotal();

            const orderData = {
                items: cart.map(item => ({
                    menuItem: item._id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.price * item.quantity,
                    taxRate: (item.taxRate !== undefined && item.taxRate !== null) ? item.taxRate : undefined,
                    spiceLevel: item.spiceLevel,
                })),
                orderType,
                customer: { name: 'Guest Customer', phone: '' },
                paymentMethod: method,
                paymentStatus: 'paid',
                paymentIntentId,
                status: 'confirmed',
                subtotal: totals.subtotal,
                totalAmount: totals.total,
                discount: totals.discount,
                couponCode: appliedCoupon?.code,
                tax: {
                    rate: taxDetails?.taxRate !== undefined ? Number((taxDetails.taxRate * 100).toFixed(2)) : taxRate,
                    amount: totals.gst,
                    breakdown: taxDetails?.breakdown || taxDetails
                },
                tableNumber: orderType === 'global_dine_in' ? tableNumber : undefined,
                notes: `Guest Order - ${orderType}${orderType === 'global_dine_in' && tableNumber ? ` - Table ${tableNumber}` : ''} - Paid via Card`,
                source: 'website'
            };

            const res = await ordersAPI.createPublic(orderData, slug);
            setSuccessOrderNumber(res.data.orderNumber || 'Unknown');
            setSuccessTokenNumber(res.data.dailyTokenNumber ?? null);
            setCart([]);
            handleClosePayment();
        } catch (error: any) {
            console.error('Order error:', error);
            toast.error(error.response?.data?.message || 'Failed to place order');
            throw error;
        } finally {
            setSubmitting(false);
        }
    };

    // Inner card form — must be rendered inside <Elements>
    const StripeCardForm: React.FC = () => {
        const stripe = useStripe();
        const elements = useElements();
        const [paymentStatus, setPaymentStatus] = React.useState<'idle' | 'failed' | 'order_failed'>('idle');
        const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
        const [paidIntentId, setPaidIntentId] = React.useState<string | null>(null);
        const [paying, setPaying] = React.useState(false);

        const handlePay = async () => {
            if (!stripe || !elements || !clientSecret) return;

            // Pre-save order data so redirect-based methods (Amazon Pay, etc.)
            // can complete the order after the browser returns from the external auth page
            const totals = calculateTotal();
            sessionStorage.setItem('guestPendingOrder', JSON.stringify({
                slug,
                items: cart.map(item => ({
                    menuItem: item._id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.price * item.quantity,
                    taxRate: (item.taxRate !== undefined && item.taxRate !== null) ? item.taxRate : undefined,
                    spiceLevel: item.spiceLevel,
                })),
                orderType,
                customer: { name: 'Guest Customer', phone: '' },
                paymentMethod: 'card',
                paymentStatus: 'paid',
                status: 'confirmed',
                subtotal: totals.subtotal,
                totalAmount: totals.total,
                discount: totals.discount,
                couponCode: appliedCoupon?.code,
                tax: {
                    rate: taxDetails?.taxRate !== undefined ? Number((taxDetails.taxRate * 100).toFixed(2)) : taxRate,
                    amount: totals.gst,
                    breakdown: taxDetails?.breakdown || taxDetails,
                },
                tableNumber: orderType === 'global_dine_in' ? tableNumber : undefined,
                notes: `Guest Order - ${orderType}${orderType === 'global_dine_in' && tableNumber ? ` - Table ${tableNumber}` : ''} - Paid via Card`,
                source: 'website',
            }));

            setPaying(true);
            setPaymentStatus('idle');
            setErrorMsg(null);

            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: { return_url: window.location.href },
                redirect: 'if_required',
            });

            // Reached here → no redirect happened (card payment inline)
            sessionStorage.removeItem('guestPendingOrder');
            setPaying(false);

            if (error) {
                setErrorMsg(error.message || 'Payment failed. Please try again.');
                setPaymentStatus('failed');
            } else if (paymentIntent?.status === 'succeeded') {
                try {
                    await handlePlaceOrder(paymentIntent.id);
                } catch {
                    setPaidIntentId(paymentIntent.id);
                    setPaymentStatus('order_failed');
                }
            }
        };

        const contactPhone = restaurantSettings?.phone || restaurantSettings?.contactPhone || null;

        if (paymentStatus === 'failed') {
            return (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography sx={{ fontSize: '3rem', mb: 1 }}>❌</Typography>
                    <Typography variant="h6" color="error" fontWeight="bold" gutterBottom>
                        Payment Failed
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {errorMsg}
                    </Typography>
                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        sx={{ mb: 1.5 }}
                        onClick={() => { setPaymentStatus('idle'); setErrorMsg(null); }}
                    >
                        Try Again
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                        Need help?{' '}
                        {contactPhone
                            ? <>Call us at <Box component="a" href={`tel:${contactPhone}`} sx={{ color: 'primary.main', fontWeight: 600 }}>{contactPhone}</Box></>
                            : 'Please contact a staff member for assistance.'
                        }
                    </Typography>
                </Box>
            );
        }

        if (paymentStatus === 'order_failed') {
            return (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography sx={{ fontSize: '3rem', mb: 1 }}>⚠️</Typography>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Payment Received
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Your payment was successful but we could not place the order automatically.
                    </Typography>
                    <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>
                        <Typography variant="caption" display="block" fontWeight="bold">Payment Reference:</Typography>
                        <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>{paidIntentId}</Typography>
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        Please show this reference to a staff member — your order will be confirmed manually.
                        {contactPhone && <> Call us at <Box component="a" href={`tel:${contactPhone}`} sx={{ color: 'primary.main', fontWeight: 600 }}>{contactPhone}</Box>.</>}
                    </Typography>
                </Box>
            );
        }

        return (
            <Box sx={{ width: '100%' }}>
                <Box sx={{ mb: 2 }}>
                    <PaymentElement />
                </Box>
                <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={handlePay}
                    disabled={!stripe || paying || submitting}
                    sx={{ py: 1.5, fontSize: '1.1rem' }}
                >
                    {paying || submitting ? <CircularProgress size={22} color="inherit" /> : `Pay ${formatCurrency(calculateTotal().total)}`}
                </Button>
            </Box>
        );
    };

    const PaymentDialog = () => {
        const totals = calculateTotal();
        return (
            <Dialog open={showPayment} onClose={handleClosePayment} fullWidth maxWidth="xs">
                <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                    <Typography variant="h6" fontWeight="bold">Pay with Card</Typography>
                    <Typography variant="h4" color="primary" fontWeight="bold">{formatCurrency(totals.total)}</Typography>
                    {appliedCoupon && <Chip label={`Coupon ${appliedCoupon.code} Applied`} color="success" size="small" sx={{ mt: 1 }} />}
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    {stripeLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}
                    {stripeError && (
                        <Box>
                            <Alert severity="error" sx={{ mb: 1 }}>{stripeError}</Alert>
                            <Button fullWidth size="small" onClick={() => setStripeRetry(r => r + 1)}>Retry</Button>
                        </Box>
                    )}
                    {!stripeLoading && !stripeError && stripePromise && clientSecret && (
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                            <StripeCardForm />
                        </Elements>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={handleClosePayment} fullWidth disabled={submitting}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };

    const SuccessData = () => (
        <Dialog open={!!successOrderNumber} fullWidth maxWidth="xs">
            <IconButton
                aria-label="close"
                onClick={() => { setSuccessOrderNumber(null); setSuccessTokenNumber(null); }}
                sx={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    color: (theme) => theme.palette.grey[500],
                    zIndex: 10,
                }}
            >
                <CloseIcon />
            </IconButton>
            <DialogContent sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 5,
                scrollbarWidth: 'none', // Hide scrollbar for Firefox
                '&::-webkit-scrollbar': {
                    display: 'none', // Hide scrollbar for Chrome/Safari/Edge
                }
            }}>
                <Typography variant="h1" sx={{ mb: 2 }}>🎉</Typography>
                <Typography variant="h4" gutterBottom align="center">Order Placed!</Typography>
                <Typography color="text.secondary" gutterBottom>Payment Verified</Typography>

                <Box sx={{ my: 3, p: 3, bgcolor: 'primary.light', borderRadius: 2, width: '100%', textAlign: 'center', color: 'primary.contrastText' }}>
                    {successTokenNumber != null ? (
                        <>
                            <Typography variant="overline" sx={{ opacity: 0.8 }}>TOKEN NUMBER</Typography>
                            <Typography sx={{ fontWeight: 'bold', fontSize: '3.5rem', lineHeight: 1.1 }}>
                                {successTokenNumber}
                            </Typography>
                        </>
                    ) : (
                        <>
                            <Typography variant="overline" sx={{ opacity: 0.8 }}>ORDER NUMBER</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 'bold', wordBreak: 'break-all' }}>
                                {successOrderNumber}
                            </Typography>
                        </>
                    )}
                    <Chip
                        label={
                            orderType === 'global_takeaway' ? 'Global Takeaway' :
                                orderType === 'global_dine_in' ? 'Global Dine In' :
                                    orderType === 'delivery' ? 'Delivery' : 'Global Takeaway'
                        }
                        color="secondary"
                        sx={{ mt: 1.5, bgcolor: 'white', color: 'primary.main', fontWeight: 'bold' }}
                    />
                </Box>

                {successTokenNumber != null && (
                    <Typography variant="caption" color="text.secondary" align="center" sx={{ mb: 1, wordBreak: 'break-all' }}>
                        Order ID: {successOrderNumber}
                    </Typography>
                )}

                <Typography variant="body2" color="text.secondary" align="center">
                    Please show this number at the counter when collecting your order.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={() => { setSuccessOrderNumber(null); setSuccessTokenNumber(null); }}
                    fullWidth
                    variant="contained"
                    size="large"
                >
                    Start New Order
                </Button>
            </DialogActions>
        </Dialog>
    );

    const filteredItems = menuItems.filter(item => {
        const cName = typeof item.category === 'string' ? item.category : item.category?.name;
        const matchesCategory = selectedCategory === 'All' || cName === selectedCategory;
        const itemType = (item as any).foodType || 'all';
        const matchesType = foodTypeFilter === 'all' || itemType === foodTypeFilter;
        return matchesCategory && matchesType;
    });

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Header */}
            <AppBar 
                position="sticky" 
                sx={{ 
                    background: 'rgba(255, 255, 255, 0.85)', 
                    backdropFilter: 'blur(12px)', 
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: 'none',
                    top: 0,
                    zIndex: 1100
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
                    <Typography 
                        variant="h6" 
                        component="div" 
                        sx={{ 
                            fontWeight: 900, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            color: '#1e293b',
                            letterSpacing: '0.75px',
                            fontFamily: '"Outfit", "Inter", sans-serif',
                            fontSize: { xs: '1.05rem', sm: '1.25rem' }
                        }}
                    >
                        <MenuIcon sx={{ color: 'primary.main', fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                        {slug?.toUpperCase()}
                        <Box component="span" sx={{ color: 'primary.main' }}>.</Box>
                    </Typography>

                    <Box display="flex" alignItems="center" gap={1}>
                        <IconButton 

                            onClick={() => setCartOpen(true)}
                            sx={{ 
                                bgcolor: 'rgba(79, 70, 229, 0.06)',
                                color: 'primary.main',
                                '&:hover': { bgcolor: 'rgba(79, 70, 229, 0.12)' },
                                p: { xs: 0.75, sm: 1.25 }
                            }}
                        >
                            <Badge badgeContent={cart.length} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 'bold', fontSize: '0.7rem' } }}>
                                <CartIcon sx={{ fontSize: { xs: '1.15rem', sm: '1.4rem' } }} />
                            </Badge>
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Content */}
            <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
                {/* Seated Table Contactless Banner */}
                {tableNumber && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
                        <Chip
                            icon={<DineInIcon sx={{ color: '#fff !important' }} />}
                            label={`📍 Seated at Table ${tableNumber} • Contactless Ordering`}
                            sx={{
                                bgcolor: 'primary.main',
                                color: '#fff',
                                fontWeight: 900,
                                fontSize: { xs: '0.85rem', sm: '1rem' },
                                py: 2.2,
                                px: 2,
                                borderRadius: 4,
                                boxShadow: '0 6px 18px rgba(79, 70, 229, 0.35)',
                                '& .MuiChip-label': { px: 1 }
                            }}
                        />
                    </Box>
                )}

                {/* Filters */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3, alignItems: 'center' }}>
                    {/* Search */}
                    <Box sx={{ flex: 1, minWidth: 200, width: '100%' }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search for dishes..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchInput ? (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearchInput('')} aria-label="Clear search">
                                            <CloseIcon sx={{ fontSize: '1rem' }} />
                                        </IconButton>
                                    </InputAdornment>
                                ) : undefined,
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    bgcolor: '#fff',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    '& fieldset': { borderColor: 'rgba(0,0,0,0.08)' },
                                    '&:hover fieldset': { borderColor: '#4f46e5' },
                                    '&.Mui-focused fieldset': { borderColor: '#4f46e5' }
                                }
                            }}
                        />
                    </Box>

                    {/* Category Dropdown */}
                    <Box sx={{ flex: 1, minWidth: 200, width: '100%' }}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            SelectProps={{
                                MenuProps: {
                                    PaperProps: {
                                        sx: { maxHeight: 300 }
                                    }
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    bgcolor: '#fff',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    '& fieldset': { borderColor: 'rgba(0,0,0,0.08)' },
                                    '&:hover fieldset': { borderColor: '#4f46e5' },
                                    '&.Mui-focused fieldset': { borderColor: '#4f46e5' }
                                }
                            }}
                        >
                            {categories.map(cat => (
                                <MuiMenuItem key={cat} value={cat}>{cat}</MuiMenuItem>
                            ))}
                        </TextField>
                    </Box>

                    {/* Veg / Non-Veg Filter Chips */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {(['all', 'veg', 'non-veg'] as const).map((type) => {
                            const isActive = foodTypeFilter === type;
                            const vegColor = '#00a852';
                            const nonVegColor = '#e43b3b';
                            const activeBg = type === 'veg' ? vegColor : type === 'non-veg' ? nonVegColor : undefined;

                            return (
                                <Chip
                                    key={type}
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {type === 'veg' && (
                                                <Box sx={{ 
                                                    width: 12, height: 12, 
                                                    border: `2px solid ${isActive ? 'white' : vegColor}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    borderRadius: '2px', bgcolor: 'transparent'
                                                }}>
                                                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: isActive ? 'white' : vegColor }} />
                                                </Box>
                                            )}
                                            {type === 'non-veg' && (
                                                <Box sx={{ 
                                                    width: 12, height: 12, 
                                                    border: `2px solid ${isActive ? 'white' : nonVegColor}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    borderRadius: '2px', bgcolor: 'transparent'
                                                }}>
                                                    <Box sx={{ width: 0, height: 0, borderLeft: '3px solid transparent', borderRight: '3px solid transparent', borderBottom: `5px solid ${isActive ? 'white' : nonVegColor}` }} />
                                                </Box>
                                            )}
                                            {type === 'all' ? 'All' : type === 'veg' ? 'Veg' : 'Non‑Veg'}
                                        </Box>
                                    }
                                    onClick={() => setFoodTypeFilter(type)}
                                    sx={{
                                        fontWeight: 600,
                                        borderRadius: '8px',
                                        bgcolor: isActive ? (activeBg || '#4f46e5') : '#fff',
                                        color: isActive ? '#fff' : 'text.primary',
                                        border: '1px solid',
                                        borderColor: isActive ? 'transparent' : 'rgba(0,0,0,0.12)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                        '&:hover': {
                                            bgcolor: isActive ? (activeBg || '#4f46e5') : 'rgba(0,0,0,0.04)',
                                        }
                                    }}
                                />
                            );
                        })}
                    </Box>
                </Box>

                {loading ? (
                    <CardGridSkeleton count={8} cardHeight={220} />
                ) : filteredItems.length === 0 ? (
                    <Box sx={{ textAlign: 'center', mt: 6, mb: 4 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            No dishes found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {searchTerm
                                ? `Nothing matched "${searchTerm}". Try a different search or filter.`
                                : 'Try adjusting your filters.'}
                        </Typography>
                        {searchTerm && (
                            <Button variant="outlined" sx={{ mt: 2, borderRadius: '10px' }} onClick={() => setSearchInput('')}>
                                Clear search
                            </Button>
                        )}
                    </Box>
                ) : (
                    <Grid container spacing={{ xs: 1.5, sm: 3 }}>
                        {filteredItems.map(item => (
                            <Grid item xs={6} sm={6} md={4} lg={3} key={item._id}>
                                <Card 
                                    sx={{ 
                                        height: '100%', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        borderRadius: { xs: '12px', sm: '18px' },
                                        border: '1px solid rgba(0, 0, 0, 0.04)',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                                        overflow: 'hidden',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': { 
                                            transform: 'translateY(-5px)', 
                                            boxShadow: '0 10px 24px rgba(0,0,0,0.06)',
                                            borderColor: 'rgba(79, 70, 229, 0.12)'
                                        },
                                        '&:hover img': {
                                            transform: 'scale(1.06)'
                                        }
                                    }}
                                >
                                    {item.image ? (
                                        <Box sx={{ overflow: 'hidden', position: 'relative' }}>
                                            <CardMedia
                                                component="img"
                                                image={item.image}
                                                alt={item.name}
                                                sx={{ 
                                                    width: '100%', 
                                                    objectFit: 'cover', 
                                                    height: { xs: 120, sm: 180 },
                                                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                                                }}
                                            />
                                        </Box>
                                    ) : (
                                        <Box
                                            sx={{
                                                height: { xs: 120, sm: 180 },
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: 'grey.50',
                                                color: 'text.disabled',
                                                gap: 1,
                                                flexShrink: 0,
                                            }}
                                        >
                                            <MenuIcon sx={{ fontSize: { xs: 36, sm: 48 }, opacity: 0.25 }} />
                                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' }, fontWeight: 600, letterSpacing: '0.5px' }}>
                                                {typeof item.category === 'string' ? item.category : item.category?.name || 'Food Item'}
                                            </Typography>
                                        </Box>
                                    )}
                                    <CardContent sx={{ flexGrow: 1, p: { xs: 1.25, sm: 2 } }}>
                                        {(() => {
                                            const getBestCouponForItem = (itemId: string) => {
                                                if (!availableCoupons || availableCoupons.length === 0) return null;

                                                // Filter for coupons that apply to this item AND the current order type
                                                const itemCoupons = availableCoupons.filter(coupon => {
                                                    const isActive = coupon.active !== false;
                                                    const isMenuItemOffer = coupon.offerType === 'menu_item';
                                                    const isItemIncluded = coupon.applicableItems && coupon.applicableItems.includes(itemId);

                                                    // Check Order Type (if defined in coupon)
                                                    // If applicableOrderTypes is missing or empty, assume valid for all.
                                                    // Otherwise, must include current orderType.
                                                    const isOrderTypeValid = !coupon.applicableOrderTypes ||
                                                        coupon.applicableOrderTypes.length === 0 ||
                                                        couponAppliesToOrderType(coupon, orderType);

                                                    return isActive && isMenuItemOffer && isItemIncluded && isOrderTypeValid;
                                                });

                                                if (itemCoupons.length === 0) return null;

                                                // Return best value
                                                return itemCoupons.sort((a, b) => b.discountValue - a.discountValue)[0];
                                            };

                                            const coupon = getBestCouponForItem(item._id);
                                            if (coupon) {
                                                const discountText = coupon.discountType === 'percentage'
                                                    ? `${coupon.discountValue}% OFF`
                                                    : `${formatCurrency(coupon.discountValue)} OFF`;

                                                return (
                                                    <Box 
                                                        sx={{ 
                                                            mb: { xs: 0.75, sm: 1.5 }, 
                                                            p: { xs: '4px 8px', sm: '8px 12px' }, 
                                                            bgcolor: 'rgba(255, 107, 53, 0.05)', 
                                                            borderRadius: '8px', 
                                                            border: '1px dashed rgba(255, 107, 53, 0.35)',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 0.25
                                                        }}
                                                    >
                                                        <Typography 
                                                            variant="subtitle2" 
                                                            color="#d84315" 
                                                            fontWeight={800} 
                                                            sx={{ 
                                                                fontSize: { xs: '0.62rem', sm: '0.85rem' },
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 0.5
                                                            }}
                                                        >
                                                            🏷️ {discountText}
                                                        </Typography>
                                                        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: { xs: '0.52rem', sm: '0.68rem' }, fontWeight: 500 }}>
                                                            {coupon.minBillAmount ? `Min Order: ${formatCurrency(coupon.minBillAmount)}` : 'No Min Order'}
                                                        </Typography>
                                                    </Box>
                                                );
                                            }
                                            return null;
                                        })()}
                                        <Typography 
                                            variant="h6" 
                                            gutterBottom
                                            sx={{ 
                                                fontSize: { xs: '0.78rem', sm: '1.15rem' }, 
                                                fontWeight: 'bold',
                                                minHeight: { xs: '32px', sm: 'auto' },
                                                overflow: 'hidden',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                color: '#1e293b'
                                            }}
                                        >
                                            {item.name}
                                        </Typography>
                                        {/* <Typography variant="body2" color="text.secondary" paragraph>
                                            {item.description}
                                        </Typography> */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                                            <Typography 
                                                variant="h6" 
                                                color="primary"
                                                sx={{ 
                                                    fontSize: { xs: '0.78rem', sm: '1.15rem' }, 
                                                    fontWeight: 800 
                                                }}
                                            >
                                                {formatCurrency(item.price)}
                                            </Typography>
                                            {(() => {
                                                // A spicy dish can sit in the cart as several lines
                                                // (one per level), so match on the item id and show
                                                // the combined quantity.
                                                const lines = cart.filter(c => c._id === item._id);
                                                const totalQty = lines.reduce((sum, c) => sum + c.quantity, 0);
                                                const cartItem = lines.length > 0 ? { quantity: totalQty } : null;
                                                // Decrementing targets the most recently added line.
                                                const lastLine = lines[lines.length - 1];
                                                return cartItem ? (
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            bgcolor: 'primary.main',
                                                            backgroundImage: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                                                            color: 'white',
                                                            borderRadius: '50px',
                                                            boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)',
                                                            p: '2px'
                                                        }}
                                                    >
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => removeFromCart(lastLine.cartId)}
                                                            sx={{
                                                                color: 'white',
                                                                p: { xs: 0.5, sm: 0.75 },
                                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' }
                                                            }}
                                                        >
                                                            <RemoveIcon fontSize="small" sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }} />
                                                        </IconButton>
                                                        <Typography fontWeight="bold" sx={{ minWidth: { xs: 14, sm: 20 }, textAlign: 'center', userSelect: 'none', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                                                            {cartItem.quantity}
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => addToCart(item)}
                                                            sx={{ 
                                                                color: 'white', 
                                                                p: { xs: 0.5, sm: 0.75 },
                                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' }
                                                            }}
                                                        >
                                                            <AddIcon fontSize="small" sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }} />
                                                        </IconButton>
                                                    </Box>
                                                ) : (
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        startIcon={<AddIcon sx={{ fontSize: { xs: '0.9rem !important', sm: '1.15rem !important' }, mr: { xs: 0.25, sm: 0.5 } }} />}
                                                        onClick={() => addToCart(item)}
                                                        sx={{
                                                            px: { xs: 1.25, sm: 2.25 },
                                                            py: { xs: 0.5, sm: 0.75 },
                                                            fontSize: { xs: '0.72rem', sm: '0.85rem' },
                                                            fontWeight: 700,
                                                            textTransform: 'none',
                                                            borderRadius: '50px',
                                                            background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                                                            boxShadow: '0 4px 10px rgba(79, 70, 229, 0.15)',
                                                            minWidth: { xs: '55px', sm: '80px' },
                                                            '&:hover': {
                                                                background: 'linear-gradient(135deg, #4338ca 0%, #2563eb 100%)',
                                                                boxShadow: '0 6px 14px rgba(79, 70, 229, 0.25)',
                                                            }
                                                        }}
                                                    >
                                                        Add
                                                    </Button>
                                                );
                                            })()}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* Load More */}
                {nextCursor && !loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            Showing {menuItems.length} of {totalMenuCount} items
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={() => fetchMenu(slug!, nextCursor, true, searchTerm)}
                            disabled={isFetchingMore}
                            startIcon={isFetchingMore ? <CircularProgress size={16} /> : undefined}
                        >
                            {isFetchingMore ? 'Loading...' : 'Load More'}
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Cart Dialog with Coupons */}
            <Dialog open={cartOpen} onClose={() => setCartOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        Your Order
                        <IconButton
                            onClick={() => setCartOpen(false)}
                            size="small"
                            sx={{
                                bgcolor: 'error.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'error.dark' },
                                width: 24,
                                height: 24,
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent
                    dividers
                    sx={{
                        '&::-webkit-scrollbar': {
                            width: '5px',
                        },
                        '&::-webkit-scrollbar-track': {
                            boxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)',
                            webkitBoxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)'
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: 'rgba(0,0,0,.1)',
                            borderRadius: '4px',
                        }
                    }}
                >
                    {cart.length === 0 ? (
                        <Typography align="center" color="text.secondary">Cart is empty</Typography>
                    ) : (
                        <>
                            {cart.map(item => (
                                <Box key={item.cartId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, p: 1, border: '1px solid #eee', borderRadius: 2 }}>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="medium">{item.name}</Typography>
                                        {/* Same dish at two heats forms two lines — label them. */}
                                        {item.spiceLevel && (
                                            <Chip
                                                size="small"
                                                label={item.spiceLevelData?.[item.spiceLevel] || formatSpiceLevelLabel(item.spiceLevel)}
                                                sx={{ height: 18, fontSize: '0.65rem', mr: 0.5 }}
                                            />
                                        )}
                                        <Typography variant="caption" color="text.secondary">
                                            {formatCurrency(item.price)} x {item.quantity}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            bgcolor: 'primary.main',
                                            color: 'white',
                                            borderRadius: 1,
                                            boxShadow: 1
                                        }}
                                    >
                                        <IconButton
                                            size="small"
                                            onClick={() => removeFromCart(item.cartId)}
                                            sx={{ color: 'inherit', p: 0.5 }}
                                        >
                                            <RemoveIcon fontSize="small" />
                                        </IconButton>
                                        <Typography fontWeight="bold" sx={{ minWidth: 20, textAlign: 'center', fontSize: '0.9rem', userSelect: 'none' }}>
                                            {item.quantity}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={() => addToCart(item)}
                                            sx={{ color: 'inherit', p: 0.5 }}
                                        >
                                            <AddIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Box>
                            ))}

                            <Divider sx={{ my: 2 }} />

                            {/* Order Type Selection */}
                            <Box sx={{ mb: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="subtitle2">Order Type</Typography>
                                    {isQrScanned && (
                                        <Chip label="🔒 Locked for QR Table Order" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} />
                                    )}
                                </Box>
                                <ToggleButtonGroup
                                    value={orderType}
                                    exclusive
                                    onChange={(e, newType) => {
                                        if (newType !== null) setOrderType(newType);
                                    }}
                                    fullWidth
                                    color="primary"
                                    size="small"
                                    disabled={isQrScanned}
                                >
                                    <ToggleButton value="global_dine_in">
                                        <DineInIcon sx={{ mr: 1, fontSize: 20 }} /> Global Dine In
                                    </ToggleButton>
                                    <ToggleButton value="global_takeaway">
                                        <TakeawayIcon sx={{ mr: 1, fontSize: 20 }} /> Global Takeaway
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Box>

                            {/* Table Number — shown only for Dine In */}
                            {orderType === 'global_dine_in' && (
                                <Box sx={{ mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="subtitle2">
                                            Table Number <Typography component="span" color="text.secondary" variant="caption">(recommended)</Typography>
                                        </Typography>
                                        {isQrScanned && (
                                            <Chip label={`🔒 Table ${tableNumber} Locked`} size="small" color="success" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} />
                                        )}
                                    </Box>
                                    <TextField
                                        select
                                        fullWidth
                                        size="small"
                                        value={tableNumber}
                                        onChange={e => setTableNumber(e.target.value)}
                                        disabled={isQrScanned || tables.length === 0}
                                        SelectProps={{
                                            displayEmpty: true,
                                            renderValue: (selected: any) => {
                                                if (!selected) {
                                                    return <Typography component="span" color="text.secondary">Select your table</Typography>;
                                                }
                                                const t = tables.find(tb => String(tb.tableNumber) === String(selected));
                                                return t ? (t.tableName || `Table ${t.tableNumber}`) : String(selected);
                                            },
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '8px',
                                                '& fieldset': { borderWidth: '2px', borderColor: tableNumber ? '#4F46E5' : '#ddd' },
                                            },
                                        }}
                                    >
                                        {tables.map(t => (
                                            <MuiMenuItem key={t._id} value={String(t.tableNumber)}>
                                                <Box>
                                                    <Typography variant="body2">
                                                        {t.tableName || `Table ${t.tableNumber}`}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Seats {t.capacity}{t.location ? ` • ${t.location}` : ''}
                                                    </Typography>
                                                </Box>
                                            </MuiMenuItem>
                                        ))}
                                    </TextField>
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                        {isQrScanned
                                            ? `🔒 Table ${tableNumber} verified from table QR code scan.`
                                            : tables.length === 0
                                                ? 'Table list unavailable — please tell your server your table number.'
                                                : 'So the server knows which table to bring your order to'}
                                    </Typography>
                                </Box>
                            )}

                            {/* Coupons Section */}
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>Offers & Discounts</Typography>
                                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                    <input
                                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                        placeholder="Enter Coupon Code"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value?.toUpperCase())}
                                        disabled={!!appliedCoupon}
                                    />
                                    {appliedCoupon ? (
                                        <Button size="small" color="error" variant="outlined" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>Remove</Button>
                                    ) : (
                                        <Button size="small" variant="contained" onClick={handleApplyCoupon} disabled={!couponCode}>Apply</Button>
                                    )}
                                </Box>

                            </Box>

                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography>Subtotal</Typography>
                                    <Typography>{formatCurrency(calculateTotal().subtotal)}</Typography>
                                </Box>
                                {appliedCoupon && (
                                    <Box display="flex" justifyContent="space-between" mb={1} color="success.main">
                                        <Typography>Discount ({appliedCoupon.code})</Typography>
                                        <Typography>-{formatCurrency(calculateTotal().discount)}</Typography>
                                    </Box>
                                )}
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography>Tax</Typography>
                                    <Typography>{formatCurrency(calculateTotal().gst)}</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" mt={2}>
                                    <Typography variant="h6">Total</Typography>
                                    <Typography variant="h6" color="primary">{formatCurrency(calculateTotal().total)}</Typography>
                                </Box>
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={cart.length === 0}
                        onClick={handleProceedToPayment}
                    >
                        Proceed to Pay
                    </Button>
                </DialogActions>
            </Dialog>

            {isIndia ? (
                <PhonePeQrModal
                    open={showPayment}
                    onClose={handleClosePayment}
                    amount={calculateTotal().total}
                    tenantSlug={slug || undefined}
                    onSuccess={(merchantTransactionId) => handlePlaceOrder(merchantTransactionId, 'phonepe')}
                />
            ) : (
                PaymentDialog()
            )}
            {SuccessData()}

            {/* Redirect payment processing overlay */}
            <Dialog open={redirectProcessing} maxWidth="xs" fullWidth>
                <DialogContent sx={{ textAlign: 'center', py: 6 }}>
                    <CircularProgress size={52} sx={{ mb: 2 }} />
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Processing Payment…</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Please wait while we confirm your order.
                    </Typography>
                </DialogContent>
            </Dialog>

            {/* Redirect payment succeeded but order creation failed */}
            <Dialog open={!!redirectError && !redirectProcessing} maxWidth="xs" fullWidth>
                <DialogContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography sx={{ fontSize: '3rem', mb: 1 }}>⚠️</Typography>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>Payment Received</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {redirectError}
                    </Typography>
                    <Alert severity="warning" sx={{ textAlign: 'left', mb: 1 }}>
                        <Typography variant="caption" display="block" fontWeight="bold">Payment Reference:</Typography>
                        <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>{redirectPaymentId}</Typography>
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={() => { setRedirectError(null); setRedirectPaymentId(null); }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Spice level picker — mirrors the slider used in the POS item dialog.
                Levels come from the item's spice level set. */}
            <Dialog
                open={!!spiceSelectionItem}
                onClose={() => setSpiceSelectionItem(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: { xs: 3, sm: 5 } } }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h6" fontWeight={900}>{spiceSelectionItem?.name}</Typography>
                </DialogTitle>
                <DialogContent>
                    {(() => {
                        const levels = spiceSelectionItem?.spiceLevels || [];
                        if (levels.length === 0) return null;
                        const current = tempSpiceLevel || levels[0];
                        const index = Math.max(0, levels.indexOf(current));

                        return (
                            <Paper variant="outlined" sx={{
                                borderRadius: { xs: '16px', sm: '24px' },
                                p: { xs: 2, sm: 3 },
                                pb: { xs: 1, sm: 3 },
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                            }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 0.5, sm: 1 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <span style={{ fontSize: '16px' }}>🌶️</span>
                                        <Typography sx={{ color: 'primary.main', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                            SPICE SELECTION
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={spiceSelectionItem?.spiceLevelData?.[current] || formatSpiceLevelLabel(current)}
                                        size="small"
                                        sx={{
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: 'primary.main',
                                            fontWeight: 900,
                                            fontSize: '0.65rem',
                                            height: 24,
                                            textTransform: 'capitalize',
                                        }}
                                    />
                                </Box>
                                <Typography variant="body2" sx={{ color: 'text.secondary', mb: { xs: 1, sm: 4 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                    Slide to the spice level you want, and we'll send that choice to the kitchen.
                                </Typography>

                                {/* Short scales get a narrower track, centred — stretching two
                                    points across the full width leaves a long empty run. */}
                                <Box sx={{
                                    px: { xs: 1, sm: 2 },
                                    mb: { xs: 0, sm: 2 },
                                    width: levels.length <= 2 ? { xs: '70%', sm: '55%' } : levels.length === 3 ? { xs: '85%', sm: '75%' } : '100%',
                                    mx: 'auto',
                                }}>
                                    <Slider
                                        value={index}
                                        min={0}
                                        max={levels.length - 1}
                                        step={1}
                                        marks
                                        onChange={(_, val) => setTempSpiceLevel(levels[val as number])}
                                        sx={{
                                            color: 'primary.main',
                                            height: 8,
                                            '& .MuiSlider-track': { border: 'none', transition: 'none' },
                                            '& .MuiSlider-rail': { opacity: 1, bgcolor: alpha(theme.palette.primary.main, 0.1) },
                                            '& .MuiSlider-thumb': {
                                                height: 28,
                                                width: 28,
                                                bgcolor: 'primary.main',
                                                border: '4px solid',
                                                borderColor: 'background.paper',
                                                boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 4px 12px rgba(79, 70, 229, 0.25)',
                                                transition: 'none',
                                                '&:hover, &.Mui-active': {
                                                    boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`,
                                                },
                                                '&::after': { content: '"🌶️"', fontSize: '14px', position: 'absolute' },
                                            },
                                            '& .MuiSlider-mark': { bgcolor: 'text.disabled', height: 6, width: 6, borderRadius: '50%' },
                                            '& .MuiSlider-markActive': { bgcolor: 'primary.main' },
                                        }}
                                    />
                                    {/* Labels are pinned to the same percentages as the slider
                                        marks. Equal-width flex cells only line up by coincidence
                                        at four levels and drift badly at two or three. */}
                                    <Box sx={{ position: 'relative', height: { xs: 20, sm: 34 }, mt: { xs: 1, sm: 3 } }}>
                                        {levels.map((level, i) => {
                                            const isSel = current === level;
                                            const pct = levels.length > 1 ? (i / (levels.length - 1)) * 100 : 50;
                                            return (
                                                <Box
                                                    key={i}
                                                    onClick={() => setTempSpiceLevel(level)}
                                                    sx={{
                                                        position: 'absolute',
                                                        left: `${pct}%`,
                                                        transform: 'translateX(-50%)',
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                        userSelect: 'none',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    <Typography sx={{
                                                        fontSize: '0.7rem',
                                                        fontWeight: isSel ? 900 : 700,
                                                        color: isSel ? 'primary.main' : 'text.disabled',
                                                        textTransform: 'uppercase',
                                                        mb: 0.5,
                                                        transition: 'color 0.2s',
                                                    }}>
                                                        {formatSpiceLevelLabel(level)}
                                                    </Typography>
                                                    {/* Description comes from the set, not a guess at the level name. */}
                                                    <Typography variant="caption" sx={{
                                                        fontSize: '0.6rem',
                                                        color: isSel ? 'primary.main' : 'text.disabled',
                                                        opacity: isSel ? 1 : 0.6,
                                                        display: { xs: 'none', sm: 'block' },
                                                    }}>
                                                        {spiceSelectionItem?.spiceLevelData?.[level] || ''}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            </Paper>
                        );
                    })()}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setSpiceSelectionItem(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => handleConfirmSpice(tempSpiceLevel || spiceSelectionItem?.spiceLevels?.[0] || '')}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                        Add to Cart
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GuestPOSPage;
