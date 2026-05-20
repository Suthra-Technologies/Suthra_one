import React, { useState, useEffect } from 'react';
import {
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
    Divider,
    ToggleButton,
    ToggleButtonGroup,
    CircularProgress,
} from '@mui/material';
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
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { useSettings } from '../../context/SettingsContext';
import { useActiveTenant } from '../../hooks/useActiveTenant';
import { menuAPI, ordersAPI } from '../../services/api';

interface MenuItem {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: string | { _id: string; name: string };
    image?: string;
    isAvailable: boolean;
    taxRate?: number | null;
}

interface CartItem extends MenuItem {
    quantity: number;
    cartId: string; // unique id for cart item (in case of variants later)
}

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
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [totalMenuCount, setTotalMenuCount] = useState(0);
    const [cart, setCart] = useState<CartItem[]>([]);
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
    const [orderType, setOrderType] = useState<'global_dine_in' | 'global_takeaway' | 'delivery' | 'online_takeaway'>('global_dine_in');
    const [tableNumber, setTableNumber] = useState<string>('');
    const [taxRate, setTaxRate] = useState<number>(5); // Default 5%, will be updated from settings

    useEffect(() => {
        if (slug) {
            fetchMenu(slug, null, false);
            fetchPublicInfo(slug);
        }
    }, [slug]);

    const fetchPublicInfo = async (tenantSlug: string) => {
        try {
            const [couponsRes, settingsRes] = await Promise.all([
                ordersAPI.getPublicCoupons(tenantSlug),
                ordersAPI.getPublicSettings(tenantSlug)
            ]);
            setAvailableCoupons(couponsRes.data);
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

    const fetchMenu = async (tenantSlug: string, cursor?: string | null, loadMore = false) => {
        try {
            if (loadMore) {
                setIsFetchingMore(true);
            } else {
                setLoading(true);
            }

            const limit = loadMore ? LOAD_MORE_LIMIT : PAGE_LIMIT;
            const response = await menuAPI.getPublicMenu(tenantSlug, undefined, cursor, limit);
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
                const to_zip = restaurantSettings?.zipCode || restaurantSettings?.pincode || '30040';

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

    const addToCart = (item: MenuItem) => {
        const cartId = item._id;
        setCart(prev => {
            const existing = prev.find(c => c.cartId === cartId);
            if (existing) {
                return prev.map(c => c.cartId === cartId ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { ...item, quantity: 1, cartId }];
        });
        // toast.success(`${item.name} added`);
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
            const backendOrderType = orderType === 'global_dine_in' ? 'dine_in' : orderType === 'global_takeaway' ? 'takeaway' : orderType;
            const res = await ordersAPI.validatePublicCoupon(couponCode, slug, backendOrderType);
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
            ? (taxDetails.taxAmount || taxDetails.amount_to_collect || taxDetails.total_tax || 0)
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

    const handlePlaceOrder = async () => {
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
                    taxRate: (item.taxRate !== undefined && item.taxRate !== null) ? item.taxRate : undefined
                })),
                orderType: orderType,
                customer: {
                    name: 'Guest Customer',
                    phone: '',
                },
                paymentMethod: 'upi',
                paymentStatus: 'paid', // Correct status from 'completed' to 'paid'
                status: 'confirmed', // Send directly to confirmed/KOT
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
                notes: `Guest Order - ${orderType}${orderType === 'global_dine_in' && tableNumber ? ` - Table ${tableNumber}` : ''} - Paid via QR`,
                source: 'website'
            };

            const res = await ordersAPI.createPublic(orderData, slug);
            setSuccessOrderNumber(res.data.orderNumber || 'Unknown');
            setCart([]);
            setShowPayment(false);
            setCartOpen(false);
        } catch (error: any) {
            console.error('Order error:', error);
            toast.error(error.response?.data?.message || 'Failed to place order');
        } finally {
            setSubmitting(false);
        }
    };

    const QRCodePayment = () => {
        const totals = calculateTotal();
        // Use provided VPA or fallback - handle both old and new response structures
        const upiSettings = paymentSettings?.upi || paymentSettings;
        const vpa = upiSettings?.vpa || 'pay@upi';
        const name = upiSettings?.name || 'Restaurant';
        const upiString = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${totals.total.toFixed(2)}&tn=Order Payment`;

        // Using qrserver API for simplicity to avoid import issues or missing libraries
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;

        return (
            <Dialog open={showPayment} onClose={() => setShowPayment(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ textAlign: 'center' }}>Scan to Pay</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                    <Typography variant="h3" color="primary" gutterBottom fontWeight="bold">
                        {formatCurrency(totals.total)}
                    </Typography>

                    <Box
                        component="img"
                        src={qrUrl}
                        alt="Payment QR"
                        sx={{
                            width: 250,
                            height: 250,
                            mb: 2,
                            border: '1px solid #ddd',
                            borderRadius: 2,
                            p: 1
                        }}
                    />

                    <Typography variant="body2" color="text.secondary" align="center">
                        Scan with any UPI app<br />(GPay, PhonePe, Paytm, etc.)
                    </Typography>

                    {appliedCoupon && (
                        <Chip label={`Coupon ${appliedCoupon.code} Applied`} color="success" size="small" sx={{ mt: 2 }} />
                    )}
                </DialogContent>
                <DialogActions sx={{ flexDirection: 'column', gap: 1, p: 3 }}>
                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        color="success"
                        onClick={handlePlaceOrder}
                        disabled={submitting}
                        sx={{ py: 1.5, fontSize: '1.1rem' }}
                    >
                        {submitting ? 'Verifying...' : 'I have Paid'}
                    </Button>
                    <Button onClick={() => setShowPayment(false)} fullWidth disabled={submitting}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };

    const SuccessData = () => (
        <Dialog open={!!successOrderNumber} fullWidth maxWidth="xs">
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
                    <Typography variant="overline" sx={{ opacity: 0.8 }}>ORDER NUMBER</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {successOrderNumber}
                    </Typography>
                    <Chip
                        label={
                            orderType === 'global_takeaway' ? 'Global Takeaway' :
                                orderType === 'global_dine_in' ? 'Global Dine In' :
                                    orderType === 'delivery' ? 'Delivery' : 'Global Takeaway'
                        }
                        color="secondary"
                        sx={{ mt: 1, bgcolor: 'white', color: 'primary.main', fontWeight: 'bold' }}
                    />
                </Box>

                <Typography variant="body2" color="text.secondary" align="center">
                    Please show this number at the counter when collecting your order.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setSuccessOrderNumber(null)} fullWidth variant="contained" size="large">
                    Start New Order
                </Button>
            </DialogActions>
        </Dialog>
    );

    const filteredItems = selectedCategory === 'All'
        ? menuItems
        : menuItems.filter(item => {
            const cName = typeof item.category === 'string' ? item.category : item.category?.name;
            return cName === selectedCategory;
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
                {/* Categories */}
                <Box 
                    sx={{ 
                        mb: 2.5, 
                        overflowX: 'auto', 
                        display: 'flex', 
                        gap: 1,
                        pb: 0.75,
                        scrollBehavior: 'smooth',
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                    }}
                >
                    {categories.map(cat => {
                        const isActive = selectedCategory === cat;
                        return (
                            <Chip
                                key={cat}
                                label={cat}
                                onClick={() => setSelectedCategory(cat)}
                                sx={{
                                    fontWeight: 700,
                                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
                                    px: { xs: 0.5, sm: 1.5 },
                                    height: { xs: '28px', sm: '36px' },
                                    borderRadius: '50px',
                                    border: isActive ? 'none' : '1px solid rgba(0,0,0,0.06)',
                                    background: isActive 
                                        ? 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)' 
                                        : '#ffffff',
                                    color: isActive ? '#ffffff' : '#64748b',
                                    boxShadow: isActive 
                                        ? '0 4px 10px rgba(79, 70, 229, 0.25)' 
                                        : '0 2px 4px rgba(0,0,0,0.01)',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        background: isActive 
                                            ? 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)' 
                                            : '#f8fafc',
                                        transform: 'translateY(-1px)',
                                    },
                                    '&:active': {
                                        transform: 'scale(0.95)'
                                    }
                                }}
                            />
                        );
                    })}
                </Box>

                {loading ? (
                    <Typography align="center" sx={{ mt: 4 }}>Loading menu...</Typography>
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
                                                    const backendOrderType = orderType === 'global_dine_in' ? 'dine_in' : orderType === 'global_takeaway' ? 'takeaway' : orderType;
                                                    const isOrderTypeValid = !coupon.applicableOrderTypes ||
                                                        coupon.applicableOrderTypes.length === 0 ||
                                                        coupon.applicableOrderTypes.includes(backendOrderType);

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
                                                            🏷️ {discountText} • {coupon.code}
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
                                                const cartItem = cart.find(c => c.cartId === item._id);
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
                                                            onClick={() => removeFromCart(item._id)}
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
                            onClick={() => fetchMenu(slug!, nextCursor, true)}
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
                                <Typography variant="subtitle2" gutterBottom>Order Type</Typography>
                                <ToggleButtonGroup
                                    value={orderType}
                                    exclusive
                                    onChange={(e, newType) => {
                                        if (newType !== null) setOrderType(newType);
                                    }}
                                    fullWidth
                                    color="primary"
                                    size="small"
                                >
                                    <ToggleButton value="global_dine_in">
                                        <DineInIcon sx={{ mr: 1, fontSize: 20 }} /> Global Dine In
                                    </ToggleButton>
                                    <ToggleButton value="global_takeaway">
                                        <TakeawayIcon sx={{ mr: 1, fontSize: 20 }} /> Global Takeaway
                                    </ToggleButton>
                                    {/* <ToggleButton value="delivery">
                                        <DeliveryIcon sx={{ mr: 1, fontSize: 20 }} /> Delivery
                                    </ToggleButton> */}
                                    {/* <ToggleButton value="online_takeaway">
                                        <OnlineTakeawayIcon sx={{ mr: 1, fontSize: 20 }} /> Online Takeaway
                                    </ToggleButton> */}
                                </ToggleButtonGroup>
                            </Box>

                            {/* Table Number — shown only for Dine In */}
                            {orderType === 'global_dine_in' && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Table Number <Typography component="span" color="text.secondary" variant="caption">(recommended)</Typography>
                                    </Typography>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Enter your table number"
                                        value={tableNumber}
                                        onChange={e => setTableNumber(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            fontSize: '16px',
                                            borderRadius: '8px',
                                            border: `2px solid ${tableNumber ? '#4F46E5' : '#ddd'}`,
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                        So the server knows which table to bring your order to
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
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        disabled={!!appliedCoupon}
                                    />
                                    {appliedCoupon ? (
                                        <Button size="small" color="error" variant="outlined" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>Remove</Button>
                                    ) : (
                                        <Button size="small" variant="contained" onClick={handleApplyCoupon} disabled={!couponCode}>Apply</Button>
                                    )}
                                </Box>

                                {availableCoupons.length > 0 && !appliedCoupon && (
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {availableCoupons.map(c => (
                                            <Chip
                                                key={c._id}
                                                label={c.code}
                                                size="small"
                                                onClick={() => setCouponCode(c.code)}
                                                color="primary"
                                                variant="outlined"
                                                clickable
                                            />
                                        ))}
                                    </Box>
                                )}
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
                                    <Typography>Tax {taxDetails?.taxRate !== undefined ? `(${(taxDetails.taxRate * 100).toFixed(1)}%)` : `(${taxRate}%)`}</Typography>
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

            {QRCodePayment()}
            {SuccessData()}
        </Box>
    );
};

export default GuestPOSPage;
