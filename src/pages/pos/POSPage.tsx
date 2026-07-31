import {
    Add as AddIcon,
    ShoppingCart as CartIcon,
    Close as CloseIcon,
    LocalOffer as CouponIcon,
    Remove as RemoveIcon,
    RestaurantMenu,
    Search as SearchIcon,
    SearchOff,
    Tune as TuneIcon,
} from '@mui/icons-material';
import {
    Alert,
    alpha,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    CardMedia,
    Chip,
    CircularProgress,
    Dialog,
    Divider,
    Grid,
    IconButton,
    InputAdornment,
    MenuItem,
    Modal,
    Paper,
    Slider,
    Tab,
    Tabs,
    TextField,
    Typography,
    Radio,
    RadioGroup,
    FormControlLabel,
    Checkbox,
    FormControl
} from '@mui/material';
import type { AxiosError } from 'axios';
import { format } from 'date-fns';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSearchParams } from "react-router-dom";
import theme from 'src/theme/theme';
import PaymentModal from '../../components/PaymentModal';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { autoPrintOrder } from '../../utils/autoPrintOrder';
import { couponsAPI, menuAPI, ordersAPI, rewardsAPI, settingsAPI, tablesAPI, taxAPI, traysAPI, usersAPI } from '../../services/api';
import { isWithinDeliveryRadius, METERS_PER_MILE } from '../../services/googleMapsService';
import CustomerInfoSection from './components/CustomerInfoSection';
import MergeTablesDialog from './components/MergeTablesDialog';
import OrderDetailsSection from './components/OrderDetailsSection';
import CustomItemDialog from './components/CustomItemDialog';
import { validateEmail, validatePhone } from '../../utils/validation';
import { getMaxGuests, getMergedGroup } from './utils/tableCapacity';


type Variant = {
    _id?: string;
    name: string;
    price: number;
    description?: string;
};

type ModifierOption = {
    name: string;
    price: number;
    isDefault?: boolean;
};

type ModifierGroup = {
    name: string;
    selectionType: 'single' | 'multiple';
    required: boolean;
    minSelection?: number;
    maxSelection?: number;
    options: ModifierOption[];
};

type MenuItem = {
    _id: string;
    name: string;
    price: number;
    image?: string;
    category?: { _id?: string; name?: string } | string;
    variants?: Variant[];
    modifierGroups?: ModifierGroup[];
    // allow extra props
    [k: string]: any;
};

// --- Memoized Sub-components for Optimization ---

const MemoizedMenuItemCard = React.memo(({
    item,
    onClick,
    formatCurrency
}: {
    item: MenuItem;
    onClick: (item: MenuItem) => void;
    formatCurrency: (amount: number) => string;
}) => {
    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <CardActionArea onClick={() => onClick(item)} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                {item.image && (
                    <CardMedia
                        component="img"
                        height="140"
                        image={item.image}
                        alt={item.name}
                        sx={{ objectFit: 'cover' }}
                    />
                )}
                <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
                    <Typography 
                        variant="subtitle1" 
                        fontWeight="bold" 
                        noWrap 
                        gutterBottom
                        sx={{ fontSize: { xs: '0.95rem', md: '0.88rem' } }}
                    >
                        {item.name}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography 
                            variant="body1" 
                            color="primary" 
                            fontWeight="700"
                            sx={{ fontSize: { xs: '1rem', md: '0.9rem' } }}
                        >
                            {formatCurrency(item.price)}
                        </Typography>
                        {item.foodType && (
                            <Box sx={{
                                width: 12, height: 12,
                                border: `2px solid ${item.foodType === 'veg' ? '#00a852' : '#e43b3b'}`,
                                borderRadius: '2px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                bgcolor: 'white',
                                p: '1px'
                            }}>
                                <Box sx={{
                                    width: 5, height: 5, borderRadius: '50%',
                                    bgcolor: item.foodType === 'veg' ? '#00a852' : '#e43b3b'
                                }} />
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </CardActionArea>
        </Card>
    );
});


const POSPage: React.FC = () => {
    const { user, getUserFullName, tenantSlug } = useAuth();
    const { formatCurrency, settings } = useSettings();
    const headingFontSize = { xs: '1.1rem', sm: '1.35rem', md: '1.75rem' };
    const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };

    // Basic data
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [waiters, setWaiters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [foodTypeFilter, setFoodTypeFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
    const [cart, setCart] = useState<any[]>([]);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const PAGE_LIMIT = 50;
    const LOAD_MORE_LIMIT = 10;
    const [totalMenuCount, setTotalMenuCount] = useState(0);


    // Coupon handling
    const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [rewardPointsInfo, setRewardPointsInfo] = useState<any>(null);
    const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
    const [rewardDiscount, setRewardDiscount] = useState<number>(0);
    const [isFetchingRewards, setIsFetchingRewards] = useState(false);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [isUnmerging, setIsUnmerging] = useState(false);
    const [suggestedPhone, setSuggestedPhone] = useState<string | null>(null);
    const [customerConflict, setCustomerConflict] = useState<boolean>(false);

    // Customer / order details
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerNameTouched, setCustomerNameTouched] = useState(false);
    const [customerNameError, setCustomerNameError] = useState('');
    const [customerPhoneTouched, setCustomerPhoneTouched] = useState(false);
    const [customerPhoneError, setCustomerPhoneError] = useState('');
    const [customerEmailTouched, setCustomerEmailTouched] = useState(false);
    const [customerEmailError, setCustomerEmailError] = useState('');

    // Pre-order state
    const [isPreOrder, setIsPreOrder] = useState(false);
    const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
    const [scheduledTime, setScheduledTime] = useState('');
    const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery' | 'online'>('takeaway');
    const [tableNumber, setTableNumber] = useState('');
    const [waiterName, setWaiterName] = useState('');
    const [guestCount, setGuestCount] = useState(1);
    const [tableError, setTableError] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState<any>({});
    const [discountPercent, setDiscountPercent] = useState(0);
    const [tip, setTip] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<string>('cash');
    const [cardType, setCardType] = useState<'credit' | 'debit'>('credit');
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [manualPaymentDialogOpen, setManualPaymentDialogOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState<any>(null);
    const [cardPrintReceipt, setCardPrintReceipt] = useState(false);
    const [cardSignInForApiCall, setCardSignInForApiCall] = useState(false);
    const [taxDetails, setTaxDetails] = useState<any>(null);
    const [pendingMergeSecondaryIds, setPendingMergeSecondaryIds] = useState<string[]>([]);
    const [pendingPrimaryTableId, setPendingPrimaryTableId] = useState<string>('');
    const [isCalculatingTax, setIsCalculatingTax] = useState(false);
    const [isCartVisible, setIsCartVisible] = useState(false);
    const cartSectionRef = useRef<HTMLDivElement | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const menuFetchRequestId = useRef(0);
    const preOrderLoadedRef = useRef(false);
    // Guard to prevent re-loading stale order data after an order is submitted
    const orderSubmittedRef = useRef(false);
    const [trays, setTrays] = useState<any[]>([]);
    const [tempSelectedTray, setTempSelectedTray] = useState<any | null>(null);
    const [customerDialCode, setCustomerDialCode] = useState(settings?.restaurant?.dialCode || '1');
    const [checkingDistance, setCheckingDistance] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState<number>(0);
    const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
    const [customItemModalOpen, setCustomItemModalOpen] = useState(false);

    // Sync dial code with settings when they load
    useEffect(() => {
        if (settings?.restaurant?.dialCode) {
            setCustomerDialCode(settings.restaurant.dialCode);
        }
    }, [settings?.restaurant?.dialCode]);

    // Handle live DoorDash quotes
    useEffect(() => {
        const addressString = typeof deliveryAddress === 'object' ? deliveryAddress.fullAddress : deliveryAddress;
        if (orderType !== 'delivery' || !addressString || addressString.length < 10) {
            setDeliveryFee(0);
            setQuoteError(null);
            return;
        }

        let isCancelled = false;
        const fetchQuote = async () => {
            try {
                setIsFetchingQuote(true);
                setQuoteError(null);

                const effectiveTenantSlug = tenantSlug || (settings as any)?.tenantSlug || '';
                // Since this might be admin, try to get tenantSlug from context or route if possible.
                // In POSPage, we have slug from useSearchParams maybe? No.
                // But settings?.tenantSlug should work.

                const response = await ordersAPI.getDeliveryQuote(
                    { fullAddress: addressString },
                    cart.map(i => ({ menuItem: i._id, name: i.name, quantity: i.quantity, price: i.price })),
                    effectiveTenantSlug
                );

                if (!isCancelled) {
                    if (response.data && response.data.fee !== undefined) {
                        setDeliveryFee(response.data.fee);
                    } else {
                        setQuoteError(response.data?.message || 'Could not get delivery quote.');
                        setDeliveryFee(0);
                    }
                }
            } catch (err: any) {
                if (!isCancelled) {
                    const errMsg = err.response?.data?.message || 'Delivery not available for this address.';
                    setQuoteError(errMsg);
                    setDeliveryFee(0);
                    toast.error(errMsg);
                }
            } finally {
                if (!isCancelled) setIsFetchingQuote(false);
            }
        };

        const debounceTimer = setTimeout(fetchQuote, 1000);
        return () => {
            isCancelled = true;
            clearTimeout(debounceTimer);
        };
    }, [orderType, deliveryAddress, cart, (settings as any)?.tenantSlug, tenantSlug]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsCartVisible(entry.isIntersecting);
            },
            { threshold: 0.1 }
        );

        if (cartSectionRef.current) {
            observer.observe(cartSectionRef.current);
        }

        return () => {
            if (cartSectionRef.current) {
                observer.unobserve(cartSectionRef.current);
            }
        };
    }, []);

    // Auto-load more menu items when reaching list bottom
    useEffect(() => {
        if (!nextCursor || loading) return;
        const target = loadMoreRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && nextCursor && !isFetchingMore) {
                    fetchMenu(nextCursor);
                }
            },
            { root: null, rootMargin: '320px 0px', threshold: 0.01 }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [nextCursor, isFetchingMore, loading]);

    // Synchronize selectedTable with latest data from tables array (e.g. after a merge)
    useEffect(() => {
        if (selectedTable && tables.length > 0) {
            const latestTable = tables.find(t => t._id === selectedTable._id);
            if (latestTable) {
                // Only update if something meaningful changed to avoid infinite loops or unnecessary renders
                if (
                    latestTable.isPrimary !== selectedTable.isPrimary ||
                    latestTable.isMerged !== selectedTable.isMerged ||
                    latestTable.mergedWith !== selectedTable.mergedWith ||
                    latestTable.status !== selectedTable.status
                ) {
                    setSelectedTable(latestTable);
                }
            }
        }
    }, [tables, selectedTable?._id]);


    // Dynamic Search Placeholder logic
    const placeholderItems = useMemo(() => {
        if (menuItems && menuItems.length > 0) {
            // Get up to 10 unique item names from the menu
            const names = Array.from(new Set(menuItems.map((item: any) => item.name))).slice(0, 10);
            if (names.length > 0) return names;
        }
        return ['Pizza', 'Biryani', 'Idli', 'Dosa', 'Burger', 'Coffee', 'Juice'];
    }, [menuItems]);

    const [placeholderIndex, setPlaceholderIndex] = useState(0);

    useEffect(() => {
        if (!placeholderItems.length) return;
        const timer = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholderItems.length);
        }, 3000);
        return () => clearInterval(timer);
    }, [placeholderItems.length]);

    // Fetch menu with cursor pagination
    const fetchMenu = async (cursor?: string | null, fresh = false) => {
        const requestId = ++menuFetchRequestId.current;
        try {
            if (cursor) {
                setIsFetchingMore(true);
            } else {
                // Only show global loading spinner if we don't have any items yet
                // This prevents the "menu reloading" flicker when selecting tables
                if (menuItems.length === 0) {
                    setLoading(true);
                }
            }

            const res = await menuAPI.getAll({
                search: searchQuery || undefined,
                category: selectedCategory !== 'all' ? selectedCategory : undefined,
                foodType: foodTypeFilter !== 'all' ? foodTypeFilter : undefined,
                cursor: cursor || undefined,
                limit: cursor ? LOAD_MORE_LIMIT : PAGE_LIMIT,
                isAvailable: true
            });

            const data = res.data;
            const fetchedItems: any[] = Array.isArray(data) ? data : (data?.items ?? []);
            if (requestId !== menuFetchRequestId.current) return; // Stale request
            
            const newCursor = Array.isArray(data) ? null : (data?.nextCursor ?? null);
            const totalCount = Array.isArray(data) ? fetchedItems.length : (data?.totalCount ?? 0);

            if (fresh) {
                setMenuItems(fetchedItems);
            } else {
                setMenuItems(prev => [...prev, ...fetchedItems]);
            }
            setNextCursor(newCursor);
            setTotalMenuCount(totalCount);
        } catch (error) {
            console.error('Error fetching menuItems:', error);
            // toast.error('Failed to load menu');
        } finally {
            if (requestId === menuFetchRequestId.current) {
                setLoading(false);
                setIsFetchingMore(false);
            }
        }
    };

    const initialLoad = async () => {
        try {
            setLoading(true);
            const [categoriesRes, tablesRes, settingsRes, traysRes] = await Promise.all([
                menuAPI.getAllCategories(),
                tablesAPI.getAll(),
                settingsAPI.getAll(),
                traysAPI.getAll(),
            ]);

            setCategories(categoriesRes.data);
            setTables(tablesRes.data);
            setTrays(traysRes.data);

            // Removing explicit fetchMenu(null, true) here because it is redundant
            // with the debounced useEffect([searchQuery, selectedCategory, ...]) 
            // that runs immediately on mount. This prevents "double loading" on start.
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            // setLoading(false) is handled by the fetchMenu call triggered by useEffect
        }
    };

    // Fetch available coupons based on order type
    const fetchAvailableCoupons = async () => {
        try {
            // Use getAll to get everything, then filter frontend-side to ensure we see item-specific coupons
            // even if cart total is 0 (backend getActive might filter by minBillAmount)
            const res = await couponsAPI.getAll({ page: 1, limit: 100 });
            const allCoupons = res.data.coupons || (Array.isArray(res.data) ? res.data : []);

            const now = new Date();
            const validCoupons = allCoupons.filter((c: any) => {
                if (!c.active) return false;

                // Date checks
                if (c.validFrom && new Date(c.validFrom) > now) return false;
                if (c.validTo && new Date(c.validTo) < now) return false;

                // Order Type check
                if (c.applicableOrderTypes && c.applicableOrderTypes.length > 0) {
                    if (!c.applicableOrderTypes.includes(orderType)) return false;
                }

                return true;
            });

            setAvailableCoupons(validCoupons);
        } catch (error) {
            console.error('Error fetching coupons:', error);
            setAvailableCoupons([]);
        }
    };

    // Validate a manually entered coupon code
    const handleValidateCoupon = React.useCallback(async (silent = false, explicitCode?: string) => {
        if (isApplyingCoupon) return;
        const codeToUse = explicitCode !== undefined ? explicitCode : couponCode;

        if (!codeToUse) {
            setCouponDiscount(0);
            return;
        }

        // Validation: Must have items in cart
        if (cart.length === 0) {
            if (!silent) {
                toast.error('Please add items to your cart before applying a coupon');
            }
            return;
        }

        try {
            setIsApplyingCoupon(true);
            const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
            console.log(`[Coupon] Validating "${codeToUse}" | Cart Total: $${cartTotal} | Silent: ${silent}`);

            const res = await ordersAPI.validateCoupon(codeToUse);
            const coupon = res.data;

            console.log(`[Coupon] Min Required: $${coupon.minBillAmount || 0} | Discount: ${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : '$'}`);

            // Check if cart total meets minimum requirement
            if (coupon.minBillAmount && cartTotal < coupon.minBillAmount) {
                throw new Error(`Minimum order amount of $${coupon.minBillAmount} required`);
            }

            let discount = 0;
            const offerType = coupon.offerType || 'cart_total';
            const applicableItems = coupon.applicableItems || [];

            if (offerType === 'menu_item') {
                if (!applicableItems.length) throw new Error('Invalid coupon configuration');

                const matchingItems = cart.filter(item =>
                    applicableItems.includes(item.originalMenuItemId || item._id)
                );

                if (matchingItems.length === 0) {
                    throw new Error('This coupon applies to specific menu items only');
                }

                const matchingTotal = matchingItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                if (coupon.discountType === 'percentage') {
                    discount = (matchingTotal * coupon.discountValue) / 100;
                } else {
                    discount = coupon.discountValue;
                }

            } else if (offerType === 'combo') {
                if (!applicableItems.length) throw new Error('Invalid coupon configuration');

                // Check if ALL applicable items are in cart
                const cartItemIds = new Set(cart.map(i => i.originalMenuItemId || i._id));
                const hasAll = applicableItems.every((id: string) => cartItemIds.has(id));

                if (!hasAll) {
                    throw new Error('This coupon requires a specific combination of items');
                }

                // Discount applies to the combo items
                if (coupon.discountType === 'percentage') {
                    const matchingItems = cart.filter(item => applicableItems.includes(item.originalMenuItemId || item._id));
                    const matchingTotal = matchingItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                    discount = (matchingTotal * coupon.discountValue) / 100;
                } else {
                    discount = coupon.discountValue;
                }

            } else {
                // cart_total
                if (coupon.discountType === 'percentage') {
                    discount = (cartTotal * coupon.discountValue) / 100;
                } else {
                    discount = coupon.discountValue;
                }
            }

            // Cap max discount
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
            }

            // Ensure discount doesn't exceed total
            if (discount > cartTotal) discount = cartTotal;

            console.log(`[Coupon] ✅ Applied! Discount: $${discount}`);
            setCouponDiscount(discount);
            if (!silent) {
                toast.success('Coupon applied');
            }
        } catch (error: any) {
            console.error('Coupon validation error:', error);
            setCouponDiscount(0);
            if (!silent) {
                // In manual mode: clear the code so user knows it failed
                setCouponCode('');
                toast.error(error.response?.data?.message || error.message || 'Invalid coupon');
            } else {
                // In silent re-validation: keep the coupon code so it can auto-apply
                // once the cart total reaches the required minimum — do NOT clear it.
                // Only show a notification if the error is NOT about minimum bill amount,
                // since that resolves itself as items are added.
                const msg: string = error.response?.data?.message || error.message || '';
                const isMinAmountError = msg?.toLowerCase().includes('minimum') || msg?.toLowerCase().includes('min');
                if (!isMinAmountError) {
                    // Coupon is genuinely invalid (expired, not applicable etc.) — clear it
                    setCouponCode('');
                    toast.success('Coupon removed - no longer valid', { icon: 'ℹ️' });
                }
                // Otherwise: silently keep the code; discount stays 0 until cart total grows
            }
        } finally {
            setIsApplyingCoupon(false);
        }
    }, [couponCode, cart]);

    // Fetch Reward Points Info
    useEffect(() => {
        // Reset points redemption whenever customer identity changes to prevent cross-customer point leak
        setPointsToRedeem(0);
        setRewardDiscount(0);

        const fetchRewards = async () => {
            const email = customerEmail?.includes('@') ? customerEmail : '';
            const phone = customerPhone?.length === 10 ? `+${customerDialCode}${customerPhone}` : '';

            if (email || phone) {
                try {
                    setIsFetchingRewards(true);
                    const res = await (rewardsAPI as any).getCustomerInfo({ email, phone });
                    const data = res.data;
                    setRewardPointsInfo(data);

                    if (data.customer) {
                        // Conflict Check: If both are entered but match different profiles
                        // The backend priorities phone, so if matchType is phone but email is different...
                        if (email && phone) {
                            if (data.matchType === 'phone' && data.customer.email && data.customer.email?.toLowerCase() !== email?.toLowerCase()) {
                                setCustomerConflict(true);
                            } else {
                                setCustomerConflict(false);
                            }
                        } else {
                            setCustomerConflict(false);
                        }

                        // Auto-fill logic
                        if (data.matchType === 'phone') {
                            if (!customerName) setCustomerName(data.customer.name);
                            if (!customerEmail) setCustomerEmail(data.customer.email);
                            setSuggestedPhone(null);
                        } else if (data.matchType === 'email') {
                            if (!customerName) setCustomerName(data.customer.name);
                            // For email match, suggest the phone instead of forcing it
                            if (!customerPhone && data.customer.phone) {
                                setSuggestedPhone(data.customer.phone);
                            } else {
                                setSuggestedPhone(null);
                            }
                        }
                    } else {
                        setSuggestedPhone(null);
                        setCustomerConflict(false);
                    }
                } catch (err) {
                    console.error("Failed to fetch rewards info", err);
                } finally {
                    setIsFetchingRewards(false);
                }
            } else {
                setRewardPointsInfo(null);
                setPointsToRedeem(0);
                setRewardDiscount(0);
                setSuggestedPhone(null);
                setCustomerConflict(false);
            }
        };

        const timer = setTimeout(fetchRewards, 800);
        return () => clearTimeout(timer);
    }, [customerPhone, customerEmail, customerDialCode]);

    const [searchParams, setSearchParams] = useSearchParams();
    const mode = searchParams.get("mode");   // 'edit' | null
    const orderId = searchParams.get("orderId");
    const existingOrderId = searchParams.get("orderId");
    const isEditMode = !!existingOrderId;
    const resetData = React.useCallback(() => {
        setCart([]);
        setCouponCode("");
        setCouponDiscount(0);
        setDiscountPercent(0);
        setOrderType("takeaway");
        setPaymentMethod("cash");
        setCustomerName("");
        setCustomerPhone("");
        setCustomerEmail("");
        setCustomerDialCode("1");
        setDeliveryAddress("");
        setTableNumber("");
        setGuestCount(1);
        setWaiterName("");
        setRewardPointsInfo(null);
        setPointsToRedeem(0);
        setRewardDiscount(0);

        setSelectedTable(null);   // ✅ important
        setCardPrintReceipt(false);
        setCardSignInForApiCall(false);
    }, [settings?.restaurant?.dialCode]);



    useEffect(() => {
        // If an order was just submitted, skip re-loading to avoid stale data re-appearing
        if (orderSubmittedRef.current) {
            orderSubmittedRef.current = false;
            return;
        }

        if (isEditMode) {
            loadExistingOrder(existingOrderId);
        } else if (tables.length > 0) {
            // Handle pre-fill table from URL for NEW orders
            const tId = searchParams.get("tableId");
            if (tId) {
                const table = tables.find(t => t._id === tId);
                if (table) {
                    // Check if table is occupied and has an active order
                    if (table.currentOrder && (table.status === 'occupied' || table.status === 'served' || table.status === 'partially_occupied')) {
                        const activeOrderId = typeof table.currentOrder === 'object' ? (table.currentOrder as any)._id : table.currentOrder;
                        if (activeOrderId) {
                            setSearchParams(prev => {
                                const newParams = new URLSearchParams(prev);
                                newParams.set('orderId', activeOrderId);
                                newParams.delete('tableId');
                                return newParams;
                            }, { replace: true });
                            return;
                        }
                    }

                    // Only reset and pre-select if it's not already the selected table
                    // to avoid unnecessary state churn and menu refreshes
                    if (selectedTable?._id !== table._id) {
                        resetData();
                        setSelectedTable(table);
                        setOrderType('dine_in');

                        // Handle Merged Table Numbers
                        let displayTableNumber = table.tableNumber;
                        if (table.isPrimary) {
                            const linkedTables = tables.filter(t => t.mergedWith === table._id);
                            if (linkedTables.length > 0) {
                                displayTableNumber = `${table.tableNumber} + ${linkedTables.map(t => t.tableNumber).join(', ')}`;
                            }
                        } else if (table.mergedWith) {
                            const primary = tables.find(t => t._id === table.mergedWith);
                            const linkedTables = tables.filter(t => t.mergedWith === table.mergedWith && t._id !== table._id);
                            if (primary) {
                                displayTableNumber = `${primary.tableNumber} + ${table.tableNumber}${linkedTables.length > 0 ? ', ' + linkedTables.map(t => t.tableNumber).join(', ') : ''}`;
                            }
                        }
                        setTableNumber(displayTableNumber);
                    }
                }
            }
        }

        // Always try to pick up customer info/guest count from URL if provided,
        // to support navigation from bookings even when an order already exists.
        if (tables.length > 0) {
            const urlGuests = searchParams.get("guestCount");
            const urlName = searchParams.get("customerName");
            const urlPhone = searchParams.get("customerPhone");
            const urlEmail = searchParams.get("customerEmail");

            if (urlGuests) {
                const gCount = parseInt(urlGuests);
                if (!isNaN(gCount) && gCount > 0) setGuestCount(gCount);
            }

            if (urlName) setCustomerName(urlName);

            if (urlPhone) {
                const digits = urlPhone.replace(/\D/g, '');
                if (urlPhone.startsWith('+')) {
                    setCustomerDialCode(digits.slice(0, -10) || settings?.restaurant?.dialCode || '1');
                    setCustomerPhone(digits.slice(-10));
                } else {
                    setCustomerPhone(digits.slice(-10));
                    // Keep existing dial code or use settings default
                }
            }

            if (urlEmail) setCustomerEmail(urlEmail);

            const urlPreOrder = searchParams.get("preOrder");
            if (urlPreOrder && !preOrderLoadedRef.current) {
                preOrderLoadedRef.current = true;
                try {
                    const items = JSON.parse(urlPreOrder);
                    items.forEach((item: any) => {
                        addToCart({
                            menuItem: null,
                            name: item.name,
                            price: item.price,
                            quantity: 1,
                            isCustom: true,
                            notes: 'Pre-ordered outsourced item'
                        });
                    });
                } catch(e) {
                    console.error("Failed to parse preOrder", e);
                }
            }
        }
    }, [isEditMode, existingOrderId, tables, searchParams, resetData, settings?.restaurant?.dialCode]);

    const loadExistingOrder = async (id: string) => {
        setCart([]); // Clear any previous items before loading new ones
        try {
            const res = await ordersAPI.getOne(id);
            const ord = res.data;

            // Fill POS fields
            setOrderType(ord.orderType);

            // Prioritize URL params (from booking navigation) over order data if present
            const urlName = searchParams.get("customerName");
            const urlPhone = searchParams.get("customerPhone");
            const urlEmail = searchParams.get("customerEmail");
            const urlGuestCount = searchParams.get("guestCount");

            setCustomerName(urlName || ord.customer?.name || '');

            const rawPhone = urlPhone || ord.customer?.phone || '';
            const digits = rawPhone.replace(/\D/g, '');
            if (rawPhone.startsWith('+')) {
                setCustomerDialCode(digits.slice(0, -10) || settings?.restaurant?.dialCode || '1');
                setCustomerPhone(digits.slice(-10));
            } else {
                setCustomerPhone(digits.slice(-10));
                // Default dial code if not provided in phone string
                if (!urlPhone && ord.customer?.phone && !ord.customer.phone.startsWith('+')) {
                    // Keep current dial code or fallback to settings
                }
            }
            setCustomerEmail(urlEmail || ord.customer?.email || '');

            if (urlGuestCount) {
                const gCount = parseInt(urlGuestCount);
                if (!isNaN(gCount) && gCount > 0) setGuestCount(gCount);
            } else {
                setGuestCount(ord.guestCount || 1);
            }

            setDiscountPercent(ord.discountPercent || 0);
            setPaymentMethod(ord.paymentMethod || 'cash');
            setCardPrintReceipt(Boolean(ord.cardOptions?.printReceipt));
            setCardSignInForApiCall(Boolean(ord.cardOptions?.signInForApiCall));

            if (ord.orderType === "dine_in") {
                const table = tables.find((t) => t.tableNumber === ord.tableNumber || t._id === ord.table);

                setSelectedTable(table || null);

                // Handle Merged Table Numbers from Order
                let displayTableNumber = ord.tableNumber || "";
                if (ord.mergedTables && ord.mergedTables.length > 0) {
                    const linkedNumbers = ord.mergedTables.map((mt: any) => {
                        const found = tables.find(t => t._id === (typeof mt === 'string' ? mt : mt._id));
                        return found?.tableNumber;
                    }).filter(Boolean);

                    if (linkedNumbers.length > 0) {
                        displayTableNumber = `${displayTableNumber} + ${linkedNumbers.join(', ')}`;
                    }
                }

                setTableNumber(displayTableNumber);
                setWaiterName(ord.waiterName || "");
                // guestCount already handled above with URL priority
            }


            // Load items into cart, preserving every customisation. Dropping any of
            // these would silently strip them from the order on save.
            const items = Array.isArray(ord.items) ? ord.items : [];
            const formattedCart = items.map((i: any) => {
                const menuItemId = (i.menuItem?._id || i.menuItem || '').toString();
                const variantId = i.variant?._id || i.variant?.name || 'base';
                const modifiersStr = (i.modifiers || [])
                    .map((m: any) => m.name)
                    .sort((a: string, b: string) => a.localeCompare(b))
                    .join(',');

                return {
                    _id: menuItemId,
                    cartId: `${menuItemId}::${i.tray || 'none'}::${variantId}::${i.spiceLevel || 'none'}::${modifiersStr}`,
                    name: i.name,
                    price: i.price,
                    quantity: i.quantity,
                    modifiers: i.modifiers || [],
                    variant: i.variant,
                    spiceLevel: i.spiceLevel,
                    notes: i.notes,
                    tray: i.tray,
                    trayMultiplier: i.trayMultiplier,
                    preparationStatus: i.preparationStatus,
                    // Already on the order: display-only. This screen only appends —
                    // changing an existing line is not its job, whatever the kitchen
                    // has or hasn't started.
                    isLocked: true,
                };
            });

            setCart(formattedCart);

        } catch (err) {
            toast.error("Failed to load order");
        }
    };

    const handleUnmerge = async (table: any) => {
        if (isUnmerging) return;
        const primaryId = table.isPrimary ? table._id : table.mergedWith;
        if (!primaryId) return;

        try {
            setIsUnmerging(true);
            await tablesAPI.unmerge(primaryId);
            toast.success('Tables unmerged successfully');

            // Refresh tables WITHOUT reloading the menu
            await fetchTables();

            // After unmerge, find the table again from the updated state to sync selection
            // fetchTables() updates the 'tables' state, so we can search it
            const res = await tablesAPI.getAll(); // Fetch once more to get local data for immediate update
            const refreshedTables = res.data;
            const updatedTable = refreshedTables.find((t: any) => t._id === table._id);
            if (updatedTable) {
                setSelectedTable(updatedTable);
                setTableNumber(updatedTable.tableNumber);
            }
        } catch (error) {
            console.error('Error unmerging tables:', error);
            toast.error('Failed to unmerge tables');
        } finally {
            setIsUnmerging(false);
        }
    };



    // Ensure payment method is valid based on settings
    useEffect(() => {
        if (!settings.system?.posPaymentMethods || orderType === 'dine_in') return;

        const methods = settings.system.posPaymentMethods;
        const currentValid = (methods as any)[paymentMethod];

        if (currentValid === false) {
            // Find first available method
            const available = Object.entries(methods).find(([_, enabled]) => enabled === true);
            if (available) {
                setPaymentMethod(available[0] as any);
            }
        }
    }, [settings.system?.posPaymentMethods, paymentMethod, orderType]);

    // Keep the selected card type valid based on which card types are enabled.
    useEffect(() => {
        if (paymentMethod !== 'card') return;
        const credit = settings.system?.posPaymentMethods?.creditCard ?? true;
        const debit = settings.system?.posPaymentMethods?.debitCard ?? true;
        if (cardType === 'credit' && !credit && debit) setCardType('debit');
        else if (cardType === 'debit' && !debit && credit) setCardType('credit');
    }, [paymentMethod, cardType, settings.system?.posPaymentMethods]);

    // Initialise data
    useEffect(() => {
        initialLoad();
        fetchWaiters();
    }, []);

    // Fetch menu when filters change
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMenu(null, true);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategory, foodTypeFilter]);


    // Refresh coupons when order type or cart total changes
    useEffect(() => {
        fetchAvailableCoupons();

        // Re-validate the coupon whenever cart changes:
        // - If there's already an applied discount, re-check it's still valid
        // - If there's a code but no discount yet (min amount wasn't met before),
        //   attempt validation again now that the cart total may have increased
        if (couponCode) {
            handleValidateCoupon(true); // Silent re-validation
        }
    }, [orderType, cart]);

    // Filtering menu items
    const filteredItems = useMemo(() => {
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' })?.toLowerCase();

        if (!Array.isArray(menuItems)) return [];

        return menuItems.filter((item) => {
            // --- Search ---
            const matchesSearch = item.name?.toLowerCase().includes(searchQuery?.toLowerCase());

            // --- Category ---
            // item.category can be a string ID or a populated { _id, name } object.
            const rawCat = item.category;
            const itemCatId: string = rawCat
                ? (typeof rawCat === 'object' ? (rawCat._id ?? rawCat.id ?? '') : String(rawCat))
                : '';
            const matchesCategory = selectedCategory === 'all' || itemCatId === selectedCategory;

            // --- Food Type ---
            const matchesFoodType = foodTypeFilter === 'all' || item.foodType === foodTypeFilter;

            // --- Availability ---
            // NOTE: item.isActive is NOT a field on IMenuItem returned by the backend.
            // Using !!item.isActive would always be false and hide everything.
            // We only gate on item.isAvailable which IS a real backend field.
            let isAvailableByMode = !!item.isAvailable;

            // Apply weekly-schedule restrictions only when explicitly enabled
            if (item.isWeeklyScheduleEnabled) {
                // Check if today is one of the available days
                const isDayAvailable = (item.availableDays || []).some(
                    (d: string) => d?.toLowerCase() === currentDay
                );

                // If it's "available_only" and today is NOT the day, hide it
                if (item.availabilityType === 'available_only' && !isDayAvailable) {
                    isAvailableByMode = false;
                }

                // Check date ranges
                if (item.validFrom && new Date(item.validFrom) > now) isAvailableByMode = false;
                if (item.validTo && new Date(item.validTo) < now) isAvailableByMode = false;
            }

            return matchesSearch && matchesCategory && matchesFoodType && isAvailableByMode;
        });
    }, [menuItems, searchQuery, selectedCategory, foodTypeFilter]);

    const comboCards = useMemo(() => {
        if (searchQuery) return [];
        return availableCoupons.filter(c =>
            c.offerType === 'combo' &&
            c.active &&
            (c.comboConfig?.length > 0 || c.applicableItems?.length > 0)
        ).map(c => ({
            ...c,
            _id: `combo-${c._id}`,
            name: c.name || c.code,
            isComboCard: true,
            // Gather all images from items in the combo
            images: [
                ...(c.comboConfig || []).map((entry: any) => {
                    // Try to get image from populated menuItem first
                    if (entry.menuItem && typeof entry.menuItem === 'object' && entry.menuItem.image) {
                        return entry.menuItem.image;
                    }
                    // Fallback to searching in local menuItems state
                    const itemId = entry.menuItem?._id || entry.menuItem;
                    const item = menuItems.find(i => i._id === itemId);
                    return item?.image;
                }),
                ...(c.comboConfig?.length ? [] : (c.applicableItems || []).map((itemId: string) => {
                    const item = menuItems.find(i => i._id === itemId);
                    return item?.image;
                }))
            ].filter(Boolean)
        }));
    }, [availableCoupons, menuItems, searchQuery]);

    const addToCart = React.useCallback((item: any) => {
        setCart((prev) => {
            const cartId = item.cartId || item._id;
            // Only merge into a line added in this session. Lines already on the
            // order are display-only, so an identical dish becomes a new line.
            // Match on lineKey (what the item *is*) rather than cartId (the row's
            // unique key), so repeat clicks keep merging into that same new line.
            const existing = prev.find((i) => (i.lineKey || i.cartId) === cartId && !i.isLocked);
            if (existing) {
                toast.success(`${item.name} quantity updated`);
                return prev.map((i) =>
                    i.cartId === existing.cartId ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
                );
            }
            toast.success(`${item.name} added to cart`);
            // A locked line may already hold this cartId; keep the new row addressable.
            const isTaken = prev.some((i) => i.cartId === cartId);
            return [...prev, {
                ...item,
                cartId: isTaken ? `${cartId}::new-${Date.now()}` : cartId,
                lineKey: cartId,
                quantity: item.quantity || 1,
                isLocked: false,
            }];
        });
    }, []);

    const handleAddCustomItem = React.useCallback((name: string, price: number, quantity: number, notes?: string) => {
        const cartId = `custom::${Date.now()}`;
        addToCart({
            _id: cartId,
            cartId,
            name,
            price,
            quantity,
            isCustom: true,
            notes,
        });
        setCustomItemModalOpen(false);
    }, [addToCart]);

    const removeFromCart = React.useCallback((cartId: string) => {
        setCart((prev) => {
            const item = prev.find(i => i.cartId === cartId);
            if (item?.isLocked) {
                toast.error(`${item.name} is already on this order and can't be removed here`);
                return prev;
            }
            if (item) toast.success(`${item.name} removed`);
            return prev.filter((i) => i.cartId !== cartId);
        });
    }, []);

    const updateCartItemQuantity = React.useCallback((cartId: string, delta: number) => {
        setCart((prev) => {
            const target = prev.find((i) => i.cartId === cartId);
            if (target?.isLocked) {
                toast.error(`${target.name} is already on this order — add it again to order more`);
                return prev;
            }
            return prev
                .map((i) => (i.cartId === cartId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
                .filter((i) => i.quantity > 0);
        });
    }, []);

    const getItemQuantity = (itemId: string) => {
        return cart
            .filter((i) => i._id === itemId)
            .reduce((sum, i) => sum + i.quantity, 0);
    };

    const handleDecrement = (itemId: string) => {
        // Find the last added variant of this item to decrement
        const itemInCart = [...cart].reverse().find((i) => i._id === itemId);
        if (itemInCart) {
            updateCartItemQuantity(itemInCart.cartId, -1);
        }
    };

    const formatSmartPrice = (price: number) => {
        const formatted = formatCurrency(price);
        return price % 1 === 0 ? formatted.replace(/\.00$/, '') : formatted;
    };

    const cartTotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);

    const discountAmount = useMemo(() => cartTotal * (discountPercent / 100), [cartTotal, discountPercent]);

    // Debounced Tax Calculation
    useEffect(() => {
        if (cart.length === 0) {
            setTaxDetails(null);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setIsCalculatingTax(true);
                const restaurantSettings = settings?.restaurant || {};

                // Tax is sourced from the RESTAURANT's address for every order type,
                // including delivery — the customer's delivery address never drives the
                // rate. Send the restaurant address explicitly so the payload shows which
                // address the returned rate belongs to.
                const payload = {
                    to_zip: restaurantSettings.zipCode || '',
                    to_state: restaurantSettings.state || '',
                    to_city: restaurantSettings.city || '',
                    to_street: restaurantSettings.address || '',
                    discount: discountAmount + couponDiscount,
                    line_items: cart.map(item => ({
                        itemId: item.originalMenuItemId || item._id,
                        quantity: item.quantity,
                        price: item.price,
                        discount: 0,
                        name: item.name
                    }))
                };

                const res = await taxAPI.calculate(payload);
                setTaxDetails(res.data);
            } catch (err) {
                console.error("[Tax] Dynamic calculation failed:", err);
                // Fallback to null will trigger standard % calculation
            } finally {
                setIsCalculatingTax(false);
            }
        }, 800);

        return () => clearTimeout(timer);
        // deliveryAddress is intentionally not a dependency: tax comes from the
        // restaurant's address, so editing the delivery address must not refire this.
    }, [cart, discountAmount, couponDiscount, settings]);

    const taxAmount = useMemo(() => {
        return taxDetails?.taxAmount || 0;
    }, [taxDetails]);

    const serviceChargeAmount = useMemo(() =>
        (orderType === 'dine_in' && guestCount > 3) ? Math.round(cartTotal * 0.18) : 0,
        [orderType, guestCount, cartTotal]);

    // Calculate Reward Discount
    const totalBeforeRewards = useMemo(() => {
        const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const disc = (subtotal * discountPercent) / 100;
        return subtotal + taxAmount - disc - couponDiscount + serviceChargeAmount + (Number(tip) || 0);
    }, [cart, taxAmount, discountPercent, couponDiscount, serviceChargeAmount, tip]);

    const maxUsablePoints = useMemo(() => {
        if (!rewardPointsInfo?.settings) return 0;
        const pointValue = Number(rewardPointsInfo.settings.pointValue) || 0;
        if (pointValue <= 0) return 0;

        const maxPercentage = (rewardPointsInfo.settings.maxRedemptionPercentage ?? 100) / 100;
        const maxDiscountAllowed = cartTotal * maxPercentage;

        // Capped by available points AND by max allowed discount based on subtotal
        const maxPointsByBill = Math.floor(maxDiscountAllowed / pointValue);
        return Math.min(rewardPointsInfo.points || 0, maxPointsByBill);
    }, [rewardPointsInfo, cartTotal]);

    useEffect(() => {
        if (pointsToRedeem > 0 && rewardPointsInfo?.settings) {
            const pointValue = Number(rewardPointsInfo.settings.pointValue) || 0;
            const maxPercentage = (rewardPointsInfo.settings.maxRedemptionPercentage ?? 100) / 100;
            const maxDiscountAllowed = cartTotal * maxPercentage;

            const calculatedDiscount = Number((pointsToRedeem * pointValue).toFixed(2));

            // Cap discount to maxDiscountAllowed (or totalBeforeRewards)
            const effectiveDiscount = Math.min(calculatedDiscount, maxDiscountAllowed, totalBeforeRewards);
            setRewardDiscount(effectiveDiscount);

            // If pointsToRedeem exceeds what's allowed, adjust it
            if (calculatedDiscount > effectiveDiscount + 0.01) { // 0.01 for float buffer
                const adjustedPoints = Math.floor(effectiveDiscount / pointValue);
                if (adjustedPoints < pointsToRedeem) {
                    setPointsToRedeem(adjustedPoints);
                }
            }
        } else {
            setRewardDiscount(0);
        }
    }, [pointsToRedeem, rewardPointsInfo, totalBeforeRewards, cartTotal]);

    const finalTotal = useMemo(() => {
        const total = totalBeforeRewards - rewardDiscount;
        return Math.max(0, total);
    }, [totalBeforeRewards, rewardDiscount]);

    const handlePlaceOrder = async () => {
        if (cart.length === 0) return;

        // Validate customer details
        let hasError = false;

        // Validate customer name
        const trimmedName = customerName.trim();
        if (!trimmedName) {
            setCustomerNameTouched(true);
            setCustomerNameError('Customer name is required');
            hasError = true;
        } else if (trimmedName.length < 3) {
            setCustomerNameTouched(true);
            setCustomerNameError('Customer name must be at least 3 characters');
            hasError = true;
        } else if (trimmedName.length > 30) {
            setCustomerNameTouched(true);
            setCustomerNameError('Customer name must not exceed 30 characters');
            hasError = true;
        }

        // Validate phone (optional)
        if (customerPhone && customerPhone.trim().length > 0) {
            const phoneValidation = validatePhone(customerPhone, customerDialCode);
            if (!phoneValidation.isValid) {
                setCustomerPhoneTouched(true);
                setCustomerPhoneError(phoneValidation.message || 'Invalid phone number');
                hasError = true;
            } else {
                setCustomerPhoneError('');
            }
        } else {
            setCustomerPhoneError('');
        }

        // Validate email (optional)
        const emailValidation = validateEmail(customerEmail);
        if (customerEmail && !emailValidation.isValid) {
            setCustomerEmailTouched(true);
            setCustomerEmailError(emailValidation.message || 'Please enter a valid email address');
            hasError = true;
        } else {
            setCustomerEmailError('');
        }

        // Validate table selection for dine-in orders
        if (orderType === 'dine_in' && !selectedTable) {
            setTableError('Please select a table for dine-in orders');
            hasError = true;
        }

        // Guests must fit the table. The server rejects this too; catching it here
        // avoids a round trip that loses the cart.
        if (orderType === 'dine_in' && selectedTable) {
            const mergedGroup = getMergedGroup(selectedTable, tables, pendingMergeSecondaryIds);
            const maxGuests = getMaxGuests(mergedGroup);
            if (guestCount > maxGuests) {
                toast.error(`Guest count exceeds table capacity (${maxGuests})`);
                hasError = true;
            }
        }

        if (hasError) {
            toast.error('Please fill required fields before placing the order');
            return;
        }

        if (orderType !== 'dine_in') {
            if (paymentMethod === 'online' || paymentMethod === 'card') {
                setPaymentModalOpen(true);
                return;
            }

            if (paymentMethod !== 'cash' && paymentMethod !== 'online' && paymentMethod !== 'card') {
                setManualPaymentDialogOpen(true);
                return;
            }

            if (paymentMethod === 'cash') {
                await submitOrder('CASH');
                return;
            }
        }

        await submitOrder();
    };

    const handleManualPaymentConfirm = async () => {
        setManualPaymentDialogOpen(false);
        await submitOrder(`MANUAL_${paymentMethod?.toUpperCase()}`);
    };
    const fetchTables = async () => {
        try {
            const res = await tablesAPI.getAll();
            setTables(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to load tables", err);
        }
    };

    const fetchWaiters = async () => {
        try {
            const res = await usersAPI.getUsers();
            const rawData = res.data.data || res.data.users || res.data;
            const allUsers = Array.isArray(rawData) ? rawData : [];
            setWaiters(allUsers.filter((u: any) =>
                u.isActive !== false &&
                (u.role === 'waiter' || (Array.isArray(u.roles) && u.roles.includes('waiter')))
            ));
        } catch (err) {
            console.error("Failed to load waiters", err);
        }
    };

    // Auto-reset payment method for dine-in to avoid 'Zelle' default
    useEffect(() => {
        if (orderType === 'dine_in') {
            setPaymentMethod('cash');
        }
    }, [orderType]);

    const submitOrder = async (paymentIntentId?: string, tipOverride?: number) => {
        if (placingOrder) return;
        if (orderType === 'delivery') {
            const addressString = typeof deliveryAddress === 'object' ? deliveryAddress.fullAddress : deliveryAddress;
            if (!addressString) {
                toast.error('Please enter a delivery address');
                return;
            }

            if (settings?.restaurant?.address) {
                try {
                    setCheckingDistance(true);
                    const maxRadiusMeters = (settings.restaurant.deliveryRadius || 15) * METERS_PER_MILE;
                    const result = await isWithinDeliveryRadius(
                        settings.restaurant.address,
                        addressString,
                        maxRadiusMeters
                    );

                    if (!result.isWithin) {
                        const errorMessage = `Sorry, we only deliver within ${settings.restaurant.deliveryRadius || 15} miles. This address is approx. ${result.distanceText || 'too far away'}.`;
                        toast.error(errorMessage, { duration: 5000 });
                        setCheckingDistance(false);
                        return;
                    }
                } catch (err) {
                    console.error('Distance check failed:', err);
                } finally {
                    setCheckingDistance(false);
                }
            }
        }

        setPlacingOrder(true);

        try {
            const tipValue = typeof tipOverride === 'number' ? tipOverride : tip;
            const isManualCollectedPayment =
                paymentIntentId === 'CASH' ||
                Boolean(paymentIntentId?.startsWith('MANUAL_'));
            const isVerifiedStripePayment =
                (paymentMethod === 'card' || paymentMethod === 'online') &&
                Boolean(paymentIntentId?.startsWith('pi_'));

            // For dine-in orders, dynamically replace card/online with alternative payment methods
            let finalPaymentMethod = paymentMethod;
            let finalPaymentStatus = isManualCollectedPayment || isVerifiedStripePayment ? "paid" : "pending";
            let finalPaymentIntentId = paymentIntentId;

            // Handle fully paid by rewards
            if (finalTotal === 0 && cart.length > 0) {
                finalPaymentMethod = 'rewards' as any;
                finalPaymentStatus = 'paid';
                console.log("[POS] Order fully covered by rewards/coupons. Setting status to PAID.");
            } else if (orderType === 'dine_in' && !isManualCollectedPayment && !isVerifiedStripePayment) {
                // For dine-in, always start with pending status and use 'cash' as a placeholder
                // since the actual payment method is chosen at checkout.
                finalPaymentStatus = 'pending';
                finalPaymentIntentId = undefined; // No payment intent for dine-in initially
                finalPaymentMethod = 'cash';
                console.log(`[Dine-in Payment] Using cash placeholder with pending status`);
            }

            // Calculate merged tables IDs
            // Use pending merges if available, otherwise use existing merges from the table object
            const mergedTableIdsArray = pendingMergeSecondaryIds.length > 0
                ? pendingMergeSecondaryIds
                : (selectedTable?.isPrimary
                    ? tables.filter(t => t.mergedWith === selectedTable._id).map(t => t._id)
                    : selectedTable?.mergedWith
                        ? [selectedTable.mergedWith, ...tables.filter(t => t.mergedWith === selectedTable.mergedWith && t._id !== selectedTable._id).map(t => t._id)]
                        : []);

            const payload = {
                items: cart.map((i) => ({
                    menuItem: i._id,
                    name: i.name,
                    quantity: i.quantity,
                    price: i.price,
                    total: i.price * i.quantity,
                    modifiers: i.modifiers,
                    variant: i.variant,
                    spiceLevel: i.spiceLevel,
                    notes: i.notes,
                    tray: i.tray,
                    trayMultiplier: i.trayMultiplier,
                    // Preserve kitchen progress across an edit.
                    ...(i.preparationStatus && { preparationStatus: i.preparationStatus }),
                })),
                totalAmount: finalTotal,
                subtotal: cartTotal,
                tip: tipValue,
                discountPercent,
                couponCode: couponCode || undefined,
                orderType,
                table: selectedTable?.isMerged ? selectedTable.mergedWith : selectedTable?._id,
                mergedTables: mergedTableIdsArray,
                paymentMethod: finalPaymentMethod,
                paymentStatus: finalPaymentStatus,
                paymentIntentId: finalPaymentIntentId,
                ...(finalPaymentMethod === 'card' && {
                    cardType,
                    cardOptions: {
                        printReceipt: cardPrintReceipt,
                        signInForApiCall: cardSignInForApiCall,
                    },
                }),
                loyaltyPoints: {
                    pointsUsed: pointsToRedeem,
                },
                rewardDiscount: rewardDiscount,

                ...(orderType === "dine_in" && {
                    tableNumber: selectedTable?.isMerged
                        ? (tables.find(t => t._id === selectedTable.mergedWith)?.tableNumber || tableNumber.split(' + ')[0])
                        : tableNumber.split(' + ')[0],
                    waiterName,
                    guestCount,
                }),

                ...(orderType === "delivery" && { deliveryAddress }),

                customer: {
                    name: customerName || undefined,
                    phone: customerPhone ? `+${customerDialCode}${customerPhone}` : undefined,
                    email: customerEmail || undefined,
                },

                // Pre-order fields
                isPreOrder,
                scheduledTime: isPreOrder && scheduledDate && scheduledTime
                    ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
                    : null,
            };

            let savedOrderId: string | undefined;
            if (isEditMode && existingOrderId) {
                await ordersAPI.update(existingOrderId, payload);
                savedOrderId = existingOrderId;
                toast.success("Order updated");
            } else {
                const createRes = await ordersAPI.create(payload);
                // The created order id may come back as data._id / data.data._id / data.order._id.
                savedOrderId = createRes?.data?._id || createRes?.data?.data?._id || createRes?.data?.order?._id;
                // toast.success("Order placed");
            }

            // Auto-print the bill to the Wi-Fi thermal printer (Android only, when enabled).
            // autoPrintOrder dedupes against the socket newOrder path, so it won't double-print.
            if (savedOrderId && settings.system?.autoPrint) {
                autoPrintOrder(savedOrderId, settings.printer, settings.system.autoPrint, formatCurrency)
                    .catch((err) => {
                        console.error('[ThermalPrint] Auto-print failed:', err);
                        toast.error('Auto-print to thermal printer failed. Check the printer Wi-Fi connection.');
                    });
            }

            // Set guard BEFORE clearing URL/state to prevent useEffect from re-loading stale order data
            orderSubmittedRef.current = true;

            // First clear URL and local state to exit edit/booking mode
            setSearchParams({}, { replace: true });
            resetData();
            setPendingMergeSecondaryIds([]);
            setPendingPrimaryTableId('');

            // Then handle table status update and refresh
            if (orderType === "dine_in" && selectedTable?._id) {
                try {
                    await tablesAPI.updateStatus(selectedTable._id, "occupied");
                } catch (err) {
                    console.error("Table status update failed:", err);
                    toast.error("Failed to update table status");
                }
            }

            // Finally refresh tables (guard ref will block useEffect from re-loading old order)
            fetchTables();

        } catch (error) {
            console.error("Order error:", error);
            const axiosError = error as AxiosError<{ message?: string; error?: string }>;
            if (axiosError.code === 'ECONNABORTED') {
                toast.error('Order is taking longer than expected. Please verify the payment before retrying.');
            } else {
                // Prioritize 'error' field which contains subscription limit messages
                const apiMessage = axiosError.response?.data?.error || axiosError.response?.data?.message;
                toast.error(apiMessage || axiosError.message || 'Failed to place order');
            }
        } finally {
            setPlacingOrder(false);
        }
    };




    const handlePaymentSuccess = async (paymentIntentId: string, tipAmount: number) => {
        setPaymentModalOpen(false);
        await submitOrder(paymentIntentId, tipAmount);
    };


    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [variantModalOpen, setVariantModalOpen] = useState(false);
    const [tempSelectedVariant, setTempSelectedVariant] = useState<Variant | null>(null);
    const [tempModifiers, setTempModifiers] = useState<Record<string, ModifierOption[]>>({});
    const [tempSelectedSpiceLevel, setTempSelectedSpiceLevel] = useState<string>('');

    // 4) Updated handleItemClick (unchanged semantics)
    const handleItemClick = (item: MenuItem) => {
        // Reset selections
        setTempSelectedVariant(null);
        setTempSelectedTray(null);
        setTempModifiers({});
        setTempSelectedSpiceLevel('');

        // Auto-select defaults
        const defaults: Record<string, ModifierOption[]> = {};
        const allGroups = [
            ...(item.modifierGroups || []),
            ...((item as any).linkedGroups || [])
        ];
        
        if (allGroups.length > 0) {
            allGroups.forEach(g => {
                // Safety check: ensure g is an object and has options array
                if (g && typeof g === 'object' && Array.isArray(g.options)) {
                    const defs = g.options.filter((o: any) => o.isDefault);
                    if (defs.length > 0) {
                        // For single select, only take the first default
                        if (g.selectionType === 'single') {
                            defaults[g.name] = [defs[0]];
                        } else {
                            defaults[g.name] = defs;
                        }
                    }
                }
            });
        }
        setTempModifiers(defaults);
        setTempSelectedTray(null);

        // Check if item has spice levels enabled
        const hasSpiceLevels = (item as any).isSpiceLevelAvailable && (item as any).spiceLevels && (item as any).spiceLevels.length > 0;
        const hasTrays = false;
        const hasModifiers = (item.modifierGroups && item.modifierGroups.length > 0) || ((item as any).linkedGroups && (item as any).linkedGroups.length > 0);

        if ((item.variants && item.variants.length > 0) || hasModifiers || hasTrays || hasSpiceLevels) {
            setSelectedItem(item);
            if (hasSpiceLevels) {
                setTempSelectedSpiceLevel((item as any).spiceLevels[0]);
            }
            setVariantModalOpen(true);
        } else {
            // no variants/modifiers/applicable trays/spice levels -> add by original id
            const sanitizedItem = { ...item };
            if (!(item as any).isSpiceLevelAvailable) {
                delete sanitizedItem.spiceLevel;
            }
            addToCart(sanitizedItem);
        }
    };

    const handleSelectCombo = async (coupon: any) => {
        let comboConfig = coupon.comboConfig || [];
        
        // Fallback: if comboConfig is empty but applicableItems is not, treat it as a combo of those items (qty 1)
        if (!comboConfig.length && coupon.applicableItems?.length > 0) {
            comboConfig = coupon.applicableItems.map((id: string) => ({
                menuItem: id,
                quantity: 1
            }));
        }

        if (!comboConfig.length) {
            toast.error("This combo offer has no items configured.");
            return;
        }

        let itemsAddedTotal = 0;
        let missingItems = 0;

        for (const entry of comboConfig) {
            const itemId = entry.menuItem?._id || entry.menuItem;
            let item = menuItems.find(i => i._id === itemId);
            
            // If item not in local state (e.g. paginated out), fetch it specifically
            if (!item) {
                try {
                    const res = await menuAPI.getOne(itemId);
                    item = res.data;
                    if (item) {
                        // Optionally add to local state to avoid refetching
                        setMenuItems(prev => [...prev, item]);
                    }
                } catch (err) {
                    console.warn(`[Combo] Failed to fetch missing item ${itemId}`, err);
                }
            }

            if (item) {
                const qtyToAdd = entry.quantity || 1;
                // Add default version to cart
                const sanitizedItem = { ...item };
                // Set default modifiers if any
                const defaults: Record<string, ModifierOption[]> = {};
                const allGroups = [
                    ...(item.modifierGroups || []),
                    ...((item as any).linkedGroups || [])
                ];
                if (allGroups.length > 0) {
                    allGroups.forEach(g => {
                        const defs = g.options.filter((o: any) => o.isDefault);
                        if (defs.length > 0) {
                            defaults[g.name] = g.selectionType === 'single' ? [defs[0]] : defs;
                        }
                    });
                }
                const spiceLevel = (item as any).isSpiceLevelAvailable ? (item as any).spiceLevels?.[0] : undefined;
                const modifiers = Object.entries(defaults).flatMap(([groupName, opts]) => opts.map(o => ({ ...o, groupName })));
                const modifiersStr = modifiers.sort((a, b) => a.name.localeCompare(b.name)).map(m => m.name).join(',');
                const cartId = `${item._id}::none::base::${spiceLevel || 'none'}::${modifiersStr}`;

                // Calculate price including default modifiers
                let itemPrice = item.price;
                modifiers.forEach(m => { itemPrice += m.price; });

                addToCart({
                    ...sanitizedItem,
                    cartId,
                    price: itemPrice,
                    modifiers,
                    spiceLevel,
                    quantity: qtyToAdd
                });
                itemsAddedTotal += qtyToAdd;
            } else {
                console.warn(`[Combo] Item ${itemId} not found`);
                missingItems++;
            }
        }

        if (itemsAddedTotal > 0) {
            setCouponCode(coupon.code);
            toast.success(`Combo "${coupon.name}" added to cart`);
        }
        
        if (missingItems > 0) {
            toast.error(`${missingItems} item(s) in this combo are currently unavailable.`);
        }
    };

    // Helper to calculate current modal price
    const calculateModalTotal = () => {
        if (!selectedItem) return 0;
        // Logic: (Tray Price OR Base Price) + Variant Price + Modifiers
        let basePrice = tempSelectedTray ? tempSelectedTray.price : selectedItem.price;
        let total = basePrice + (tempSelectedVariant ? tempSelectedVariant.price : 0);

        Object.values(tempModifiers).flat().forEach(m => {
            total += m.price;
        });
        return total;
    };

    const handleAddToCartFromModal = () => {
        if (!selectedItem) return;

        // Validation: Check modifier groups
        const allGroups = [
            ...(selectedItem.modifierGroups || []),
            ...((selectedItem as any).linkedGroups || [])
        ];
        
        if (allGroups.length > 0) {
            for (const group of allGroups) {
                // Safety check: skip invalid or unpopulated groups
                if (!group || typeof group !== 'object' || !Array.isArray(group.options)) continue;
                
                const selected = tempModifiers[group.name] || [];

                if (group.required && selected.length === 0) {
                    toast.error(`Please select options for ${group.name}`);
                    return;
                }

                if (group.selectionType === 'multiple' && group.minSelection && selected.length < group.minSelection) {
                    toast.error(`Please select at least ${group.minSelection} options for ${group.name}`);
                    return;
                }
            }
        }

        // Validation: Required Variant
        if (selectedItem.variants && selectedItem.variants.length > 0 && !tempSelectedVariant) {
            toast.error('Please select a variation');
            return;
        }

        // Validation: Required Spice Level
        const hasSpiceLevels = (selectedItem as any).isSpiceLevelAvailable && (selectedItem as any).spiceLevels && (selectedItem as any).spiceLevels.length > 0;
        if (hasSpiceLevels && !tempSelectedSpiceLevel) {
            toast.error('Please select a spice level');
            return;
        }

        // Generate unique cart ID
        const trayId = tempSelectedTray ? tempSelectedTray.tray : 'none';
        const variantId = tempSelectedVariant ? tempSelectedVariant._id || tempSelectedVariant.name : 'base';
        const spiceLevelId = tempSelectedSpiceLevel || 'none';
        const modifiersStr = Object.values(tempModifiers)
            .flat()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(m => m.name)
            .join(',');
        const cartId = `${selectedItem._id}::${trayId}::${variantId}::${spiceLevelId}::${modifiersStr}`;

        const price = calculateModalTotal();

        // Construct display name
        let displayName = selectedItem.name;
        if (tempSelectedTray) {
            const trayData = trays.find(t => t._id === tempSelectedTray.tray);
            displayName += ` [${trayData?.name || 'Tray'}]`;
        }
        if (tempSelectedVariant) displayName += ` (${tempSelectedVariant.name})`;
        if (tempSelectedSpiceLevel) displayName += ` 🌶️ ${tempSelectedSpiceLevel}`;

        const trayData = tempSelectedTray ? trays.find(t => t._id === tempSelectedTray.tray) : null;

        addToCart({
            ...selectedItem,
            _id: selectedItem._id,
            cartId,
            price,
            name: displayName,
            image: selectedItem.image,
            variant: tempSelectedVariant,
            modifiers: Object.entries(tempModifiers).flatMap(([groupName, opts]) => opts.map(o => ({ ...o, groupName }))),
            tray: tempSelectedTray?.tray,
            spiceLevel: hasSpiceLevels ? tempSelectedSpiceLevel : undefined,
            trayMultiplier: 1,
        });

        setVariantModalOpen(false);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: { xs: 'auto', md: 'calc(100vh - 100px)' }, gap: { xs: 1.25, md: 2 } }}>
            {/* Left side – menu */}
            {/* Left side – menu */}
            <Box sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                height: { xs: 'auto', md: '100%' },
                mb: { xs: 2, md: 0 },
                pr: { xs: 0, md: 2 }, // Space between content and scrollbar
                '&::-webkit-scrollbar': {
                    width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                    backgroundColor: 'rgba(0,0,0,0.02)',
                    borderRadius: '10px',
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    borderRadius: '10px',
                    '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.2)',
                    },
                },
            }}>



                {isEditMode && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Adding items to an existing order. Everything already on the
                        order — items, customer, table and billing — is shown for
                        reference and can't be changed here. Pick menu items below to
                        add them; only those new lines are editable.
                    </Alert>
                )}

                {/* Order details */}
                {/* Order details extracted to CustomerInfoSection */}
                <CustomerInfoSection
                    customerName={customerName}
                    setCustomerName={setCustomerName}
                    customerPhone={customerPhone}
                    setCustomerPhone={setCustomerPhone}
                    customerEmail={customerEmail}
                    setCustomerEmail={setCustomerEmail}
                    customerDialCode={customerDialCode}
                    setCustomerDialCode={setCustomerDialCode}
                    orderType={orderType}
                    setOrderType={setOrderType}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    cardType={cardType}
                    setCardType={setCardType}
                    guestCount={guestCount}
                    setGuestCount={setGuestCount}
                    tableNumber={tableNumber}
                    setTableNumber={setTableNumber}
                    waiterName={waiterName}
                    setWaiterName={setWaiterName}
                    deliveryAddress={deliveryAddress}
                    setDeliveryAddress={setDeliveryAddress}
                    customerNameTouched={customerNameTouched}
                    setCustomerNameTouched={setCustomerNameTouched}
                    customerNameError={customerNameError}
                    setCustomerNameError={setCustomerNameError}
                    customerPhoneTouched={customerPhoneTouched}
                    setCustomerPhoneTouched={setCustomerPhoneTouched}
                    customerPhoneError={customerPhoneError}
                    setCustomerPhoneError={setCustomerPhoneError}
                    customerEmailTouched={customerEmailTouched}
                    setCustomerEmailTouched={setCustomerEmailTouched}
                    customerEmailError={customerEmailError}
                    setCustomerEmailError={setCustomerEmailError}
                    rewardPointsInfo={rewardPointsInfo}
                    pointsToRedeem={pointsToRedeem}
                    setPointsToRedeem={setPointsToRedeem}
                    isFetchingRewards={isFetchingRewards}
                    suggestedPhone={suggestedPhone}
                    customerConflict={customerConflict}
                    cartTotal={cartTotal}
                    finalTotal={finalTotal}
                    tableError={tableError}
                    setTableError={setTableError}
                    selectedTable={selectedTable}
                    setSelectedTable={setSelectedTable}
                    tables={tables}
                    waiters={waiters}
                    settings={settings}
                    user={user}
                    checkingDistance={checkingDistance}
                    onOpenMerge={() => setMergeDialogOpen(true)}
                    onUnmerge={handleUnmerge}
                    pendingMergeSecondaryIds={pendingMergeSecondaryIds}
                    isPreOrder={isPreOrder}
                    setIsPreOrder={setIsPreOrder}
                    scheduledDate={scheduledDate}
                    setScheduledDate={setScheduledDate}
                    scheduledTime={scheduledTime}
                    setScheduledTime={setScheduledTime}
                    maxUsablePoints={maxUsablePoints}
                    isApplyingCoupon={isApplyingCoupon}
                    readOnly={isEditMode}
                />
                {/* Table Group Actions (Clear Pending Merge) */}
                {pendingMergeSecondaryIds.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Alert
                            severity="warning"
                            action={
                                <Button color="inherit" size="small" onClick={() => {
                                    setPendingMergeSecondaryIds([]);
                                    setPendingPrimaryTableId('');
                                }}>
                                    Clear
                                </Button>
                            }
                        >
                            Pending merge: Table {tables.find(t => t._id === pendingPrimaryTableId)?.tableNumber} + {pendingMergeSecondaryIds.map(id => tables.find(t => t._id === id)?.tableNumber).join(', ')}
                        </Alert>
                    </Box>
                )}
                {/* Search & category tabs */}
                <Box sx={{ mb: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 2 } }}>
                    <Box sx={{ position: 'relative', flexGrow: 1 }}>
                        <TextField
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''))}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: 'background.paper',
                                }
                            }}
                        />
                        {!searchQuery && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: 42,
                                    right: 14,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    pointerEvents: 'none',
                                    color: 'text.disabled',
                                    height: '24px',
                                    overflow: 'hidden'
                                }}
                            >
                                <Typography variant="body2" sx={{ mr: 0.5, flexShrink: 0, lineHeight: '24px', fontSize: bodyFontSize }}>Search for</Typography>
                                <Box sx={{ position: 'relative', height: '24px', flexGrow: 1, overflow: 'hidden' }}>
                                    <Typography
                                        key={placeholderIndex}
                                        variant="body2"
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: 'text.disabled',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            lineHeight: '24px',
                                            animation: 'dynamicTextSlide 3s ease-in-out forwards',
                                            fontSize: bodyFontSize,
                                        }}
                                    >
                                        '{placeholderItems[placeholderIndex]}'
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>
                    <Button 
                        variant="outlined" 
                        color="secondary" 
                        startIcon={<AddIcon />} 
                        onClick={() => setCustomItemModalOpen(true)}
                        sx={{ whiteSpace: 'nowrap', minWidth: { xs: '100%', sm: 'auto' }, alignSelf: 'stretch' }}
                    >
                        Custom Item
                    </Button>
                </Box>
                {/* Food Type Toggle — above tabs, right-aligned */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: { xs: 'center', sm: 'flex-end' },
                        mb: 1,
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 0.4,
                            bgcolor: 'action.hover',
                            borderRadius: '50px',
                            width: { xs: '100%', sm: 'auto' },
                            justifyContent: { xs: 'center', sm: 'flex-start' },
                        }}
                    >
                        {(['all', 'veg', 'non-veg'] as const).map((type) => {
                            const isActive = foodTypeFilter === type;
                            const vegColor = '#00a852';
                            const nonVegColor = '#e43b3b';
                            const activeBg = type === 'veg' ? vegColor : type === 'non-veg' ? nonVegColor : undefined;
                            return (
                                <Box
                                    key={type}
                                    onClick={() => setFoodTypeFilter(type)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 0.6,
                                        px: { xs: 1.2, sm: 1.5 },
                                        py: { xs: 0.8, sm: 0.6 },
                                        borderRadius: '50px',
                                        cursor: 'pointer',
                                        fontWeight: isActive ? 700 : 400,
                                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                        flex: { xs: 1, sm: 'none' },
                                        transition: 'all 0.2s ease',
                                        bgcolor: isActive ? (activeBg ?? 'primary.main') : 'transparent',
                                        color: isActive ? 'white' : 'text.secondary',
                                        boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                                        userSelect: 'none',
                                        '&:hover': {
                                            bgcolor: isActive ? (activeBg ?? 'primary.main') : 'action.selected',
                                        },
                                    }}
                                >
                                    {type === 'veg' && (
                                        <Box sx={{
                                            width: 11, height: 11,
                                            border: `2px solid ${isActive ? 'white' : vegColor}`,
                                            borderRadius: '2px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            bgcolor: isActive ? 'transparent' : 'white',
                                            flexShrink: 0,
                                        }}>
                                            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: isActive ? 'white' : vegColor }} />
                                        </Box>
                                    )}
                                    {type === 'non-veg' && (
                                        <Box sx={{
                                            width: 11, height: 11,
                                            border: `2px solid ${isActive ? 'white' : nonVegColor}`,
                                            borderRadius: '2px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            bgcolor: isActive ? 'transparent' : 'white',
                                            flexShrink: 0,
                                        }}>
                                            <Box sx={{ width: 0, height: 0, borderLeft: '3px solid transparent', borderRight: '3px solid transparent', borderBottom: `5px solid ${isActive ? 'white' : nonVegColor}` }} />
                                        </Box>
                                    )}
                                    {type === 'all' ? 'All' : type === 'veg' ? 'Veg' : 'Non‑Veg'}
                                </Box>
                            );
                        })}
                    </Box>
                </Box>

                {/* Category Tabs */}
                <Tabs
                    value={selectedCategory}
                    onChange={(_, v) => setSelectedCategory(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{
                        mb: 2,
                        borderBottom: 1,
                        borderColor: 'divider',
                        minHeight: { xs: 40, sm: 48 },
                        '& .MuiTabs-root': {
                            minHeight: { xs: 40, sm: 48 },
                        },
                        '& .MuiTabs-flexContainer': {
                            gap: 0, // ← removed gap causing trailing space
                        },
                        '& .MuiTab-root': {
                            fontSize: bodyFontSize,
                            minWidth: { xs: 'auto', sm: 80, md: 90 }, // ← auto on mobile to shrink-fit
                            maxWidth: { xs: 120, sm: 160, md: 200 },
                            minHeight: { xs: 40, sm: 48 },
                            px: { xs: 1.5, sm: 1.5, md: 2 },
                            py: { xs: 0.8, sm: 1.2, md: 1.5 },
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                        },
                        '& .MuiTabScrollButton-root': {
                            width: { xs: 20, sm: 28, md: 40 },
                            opacity: 1,
                            '&.Mui-disabled': {
                                opacity: 0.3,
                            },
                        },
                        '& .MuiTabs-indicator': {
                            height: { xs: 2, sm: 3 },
                        },
                        // Visual indicators for scrollable edges
                        position: 'relative',
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: 40,
                            background: 'linear-gradient(to left, rgba(255,255,255,0.9), transparent)',
                            pointerEvents: 'none',
                            zIndex: 1,
                            display: { xs: 'block', sm: 'none' }
                        },
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 40,
                            background: 'linear-gradient(to right, rgba(255,255,255,0.9), transparent)',
                            pointerEvents: 'none',
                            zIndex: 1,
                            display: { xs: 'block', sm: 'none' }
                        }
                    }}
                >
                    <Tab label="All Items" value="all" />
                    {categories.map((cat) => (
                        <Tab key={cat._id} label={cat.name} value={cat._id} />
                    ))}
                </Tabs>

                {/* Items grid */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ pb: 2 }}>
                        <Grid container spacing={2}>
                            {/* Render Virtual Combo Cards first */}
                            {(selectedCategory === 'all') && comboCards.map((combo, index) => (
                                <Grid item xs={6} sm={6} md={4} lg={3} key={combo._id}>
                                    <Box
                                        onClick={() => handleSelectCombo(combo)}
                                        sx={{
                                            display: { xs: 'flex', md: 'block' },
                                            flexDirection: 'column',
                                            cursor: 'pointer',
                                            height: '100%',
                                            position: 'relative',
                                            '&:active': { transform: { xs: 'scale(0.98)', md: 'none' } },
                                            transition: 'transform 0.2s',
                                            animation: 'fadeInSlideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                                            animationDelay: `${index * 0.05}s`,
                                        }}
                                    >
                                        {/* Desktop View */}
                                        <Card sx={{
                                            display: { xs: 'none', md: 'flex' },
                                            height: 230,
                                            flexDirection: 'column',
                                            transition: 'all 0.3s ease',
                                            border: '2px solid',
                                            borderColor: 'secondary.light',
                                            bgcolor: 'rgba(156, 39, 176, 0.02)',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 12px 20px rgba(156, 39, 176, 0.2)',
                                                borderColor: 'secondary.main'
                                            }
                                        }}>
                                            <CardActionArea sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                                                <Box sx={{
                                                    position: 'relative',
                                                    height: '70%',
                                                    width: '100%',
                                                    overflow: 'hidden',
                                                    bgcolor: 'grey.100'
                                                }}>
                                                    {/* Image Collage */}
                                                    {combo.images && combo.images.length > 0 ? (
                                                        <Box sx={{
                                                            display: 'grid',
                                                            gridTemplateColumns: combo.images.length > 1 ? '1fr 1fr' : '1fr',
                                                            gridTemplateRows: combo.images.length > 2 ? '1fr 1fr' : '1fr',
                                                            height: '100%',
                                                            width: '100%',
                                                            gap: 0.5,
                                                            p: 0.5,
                                                            bgcolor: 'white'
                                                        }}>
                                                            {combo.images.slice(0, 4).map((img: string, i: number) => (
                                                                <Box
                                                                    key={i}
                                                                    component="img"
                                                                    src={img}
                                                                    sx={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        objectFit: 'cover',
                                                                        borderRadius: 0.5,
                                                                        gridColumn: combo.images.length === 3 && i === 0 ? '1 / span 2' : 'auto'
                                                                    }}
                                                                />
                                                            ))}
                                                        </Box>
                                                    ) : (
                                                        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'secondary.light', color: 'white' }}>
                                                            <CouponIcon sx={{ fontSize: 40 }} />
                                                        </Box>
                                                    )}
                                                    <Box sx={{
                                                        position: 'absolute', top: 0, right: 0,
                                                        bgcolor: 'secondary.main', color: 'white', px: 1, py: 0.5,
                                                        borderBottomLeftRadius: 8, fontWeight: 'bold', fontSize: '0.65rem', zIndex: 2,
                                                        boxShadow: 2
                                                    }}>
                                                        COMBO DEAL
                                                    </Box>
                                                </Box>
                                                <CardContent sx={{ p: 1, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                    <Typography 
                                                        variant="subtitle2" 
                                                        sx={{ fontWeight: 'bold', color: 'secondary.dark', fontSize: { xs: '0.875rem', md: '0.82rem' } }} 
                                                        noWrap
                                                    >
                                                        {combo.name}
                                                    </Typography>
                                                    <Typography 
                                                        variant="caption" 
                                                        color="text.secondary" 
                                                        sx={{ 
                                                            display: '-webkit-box', 
                                                            WebkitLineClamp: 2, 
                                                            WebkitBoxOrient: 'vertical', 
                                                            overflow: 'hidden',
                                                            fontSize: { xs: '0.75rem', md: '0.7rem' }
                                                        }}
                                                    >
                                                        {combo.description || `Special combo offer: ${combo.code}`}
                                                    </Typography>
                                                </CardContent>
                                            </CardActionArea>
                                        </Card>

                                        {/* Mobile Separate View */}
                                        <Box sx={{ display: { xs: 'block', md: 'none' }, width: '100%' }}>
                                            <Box sx={{
                                                width: '100%',
                                                pt: '100%', // 1:1 Aspect Ratio
                                                position: 'relative',
                                                borderRadius: 4,
                                                overflow: 'hidden',
                                                bgcolor: 'action.hover',
                                                mb: 1,
                                                border: '2px solid',
                                                borderColor: 'secondary.light'
                                            }}>
                                                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                                                    {/* Image Collage */}
                                                    {combo.images && combo.images.length > 0 ? (
                                                        <Box sx={{
                                                            display: 'grid',
                                                            gridTemplateColumns: combo.images.length > 1 ? '1fr 1fr' : '1fr',
                                                            gridTemplateRows: combo.images.length > 2 ? '1fr 1fr' : '1fr',
                                                            height: '100%',
                                                            width: '100%',
                                                            gap: 0.5,
                                                            p: 0.5,
                                                            bgcolor: 'white'
                                                        }}>
                                                            {combo.images.slice(0, 4).map((img: string, i: number) => (
                                                                <Box
                                                                    key={i}
                                                                    component="img"
                                                                    src={img}
                                                                    sx={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        objectFit: 'cover',
                                                                        borderRadius: 0.5,
                                                                        gridColumn: combo.images.length === 3 && i === 0 ? '1 / span 2' : 'auto'
                                                                    }}
                                                                />
                                                            ))}
                                                        </Box>
                                                    ) : (
                                                        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'secondary.light', color: 'white' }}>
                                                            <CouponIcon sx={{ fontSize: 40 }} />
                                                        </Box>
                                                    )}
                                                </Box>
                                                <Box sx={{
                                                    position: 'absolute', top: 0, right: 0,
                                                    bgcolor: 'secondary.main', color: 'white', px: 1, py: 0.5,
                                                    borderBottomLeftRadius: 8, fontWeight: 'bold', fontSize: '0.65rem', zIndex: 2,
                                                    boxShadow: 2
                                                }}>
                                                    COMBO DEAL
                                                </Box>
                                            </Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'secondary.dark', fontSize: '0.85rem', lineHeight: 1.2, mb: 0.5 }} noWrap>{combo.name}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.1 }}>
                                                {combo.description || `Special combo`}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            ))}

                            {/* Existing Items */}
                            {filteredItems.map((item, index) => (
                                <Grid item xs={6} sm={6} md={4} lg={3} key={`${selectedCategory}-${item._id}`}>
                                    <Box
                                        onClick={() => handleItemClick(item)}
                                        sx={{
                                            display: { xs: 'flex', md: 'block' },
                                            flexDirection: 'column',
                                            cursor: 'pointer',
                                            height: '100%',
                                            position: 'relative',
                                            '&:active': { transform: { xs: 'scale(0.98)', md: 'none' } },
                                            transition: 'transform 0.2s',
                                            opacity: 0,
                                            animation: 'fadeInSlideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                                            animationDelay: `${index * 0.08}s`, // Slightly slower stagger for elegance
                                        }}
                                    >
                                        <Card sx={{
                                            display: { xs: 'none', md: 'flex' },
                                            height: 230,
                                            flexDirection: 'column',
                                            transition: 'all 0.3s ease',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 12px 20px rgba(79, 70, 229, 0.15)',
                                                borderColor: 'primary.light'
                                            }
                                        }}>
                                            <CardActionArea sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                                                {item.image ? (
                                                    <Box sx={{ position: 'relative', height: '70%', overflow: 'hidden' }}>
                                                        <CardMedia component="img" sx={{ height: '100%', objectFit: 'cover' }} image={item.image} alt={item.name} />
                                                        {(() => {
                                                            const getBestCouponForItem = (itemId: string) => {
                                                                if (!availableCoupons || availableCoupons.length === 0) return null;
                                                                const itemCoupons = availableCoupons.filter(c =>
                                                                    c.offerType === 'menu_item' &&
                                                                    c.applicableItems?.includes(itemId)
                                                                );
                                                                if (itemCoupons.length === 0) return null;
                                                                return itemCoupons.sort((a: any, b: any) => b.discountValue - a.discountValue)[0];
                                                            };

                                                            const coupon = getBestCouponForItem(item._id);
                                                            if (coupon) {
                                                                const discountText = coupon.discountType === 'percentage'
                                                                    ? `${coupon.discountValue}% OFF`
                                                                    : `$${coupon.discountValue} OFF`;

                                                                return (
                                                                    <Box
                                                                        sx={{
                                                                            position: 'absolute',
                                                                            top: 0,
                                                                            left: 45, // Adjusted to not overlap with special badge
                                                                            bgcolor: 'error.main',
                                                                            color: 'white',
                                                                            px: 1,
                                                                            py: 0.5,
                                                                            borderBottomRightRadius: 8,
                                                                            boxShadow: 1,
                                                                            zIndex: 2,
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                        }}
                                                                    >
                                                                        <Typography variant="caption" sx={{ fontWeight: 'bold', lineHeight: 1, fontSize: '0.7rem' }}>
                                                                            {discountText}
                                                                        </Typography>
                                                                    </Box>
                                                                );
                                                            }
                                                            return null;
                                                        })()}

                                                        {/* Scheduling Special Badges */}
                                                        {item.isWeeklyScheduleEnabled && item.displayOption !== 'normal' && (
                                                            <Box
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: 0,
                                                                    bgcolor: item.displayOption === 'todays_special' ? 'warning.main' : item.displayOption === 'weekend_special' ? 'success.main' : 'info.main',
                                                                    color: 'white',
                                                                    px: 1,
                                                                    py: 0.5,
                                                                    borderBottomRightRadius: 8,
                                                                    zIndex: 2,
                                                                    fontWeight: 'bold',
                                                                    fontSize: '0.65rem',
                                                                    textTransform: 'uppercase',
                                                                }}
                                                            >
                                                                {item.displayOption === 'todays_special' ? "Today's Special" : item.displayOption === 'weekend_special' ? 'Weekend Special' : 'Weekly Special'}
                                                            </Box>
                                                        )}
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ position: 'relative', height: '70%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', overflow: 'hidden' }}>
                                                        <Typography variant="caption" color="text.secondary">No Image</Typography>
                                                        {(() => {
                                                            const getBestCouponForItem = (itemId: string) => {
                                                                if (!availableCoupons || availableCoupons.length === 0) return null;
                                                                const itemCoupons = availableCoupons.filter(c =>
                                                                    c.offerType === 'menu_item' &&
                                                                    c.applicableItems?.includes(itemId)
                                                                );
                                                                if (itemCoupons.length === 0) return null;
                                                                return itemCoupons.sort((a: any, b: any) => b.discountValue - a.discountValue)[0];
                                                            };

                                                            const coupon = getBestCouponForItem(item._id);
                                                            if (coupon) {
                                                                const discountText = coupon.discountType === 'percentage'
                                                                    ? `${coupon.discountValue}% OFF`
                                                                    : `$${coupon.discountValue} OFF`;

                                                                return (
                                                                    <Box
                                                                        sx={{
                                                                            position: 'absolute',
                                                                            top: 15,
                                                                            left: -35,
                                                                            width: 130,
                                                                            transform: 'rotate(-45deg)',
                                                                            bgcolor: 'error.main',
                                                                            color: 'white',
                                                                            boxShadow: 2,
                                                                            zIndex: 1,
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            py: 0.5,
                                                                        }}
                                                                    >
                                                                        <Typography variant="caption" sx={{ fontWeight: 'bold', lineHeight: 1, fontSize: '0.75rem' }}>
                                                                            {discountText}
                                                                        </Typography>
                                                                        {coupon.validTo && (
                                                                            <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.9, lineHeight: 1 }}>
                                                                                Exp: {format(new Date(coupon.validTo), 'MM/dd')}
                                                                            </Typography>
                                                                        )}
                                                                    </Box>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </Box>
                                                )}
                                                <CardContent sx={{ p: 1, height: '30%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 0.5 }}>
                                                    {(() => {
                                                        return (
                                                            <>
                                                                <Typography 
                                                                    variant="subtitle2" 
                                                                    sx={{ fontWeight: 'bold', fontSize: { xs: '0.9rem', md: '0.82rem' } }} 
                                                                    noWrap
                                                                >
                                                                    {item.name}
                                                                </Typography>
                                                                <Typography 
                                                                    variant="body2" 
                                                                    color="primary.main" 
                                                                    sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', md: '0.88rem' } }}
                                                                >
                                                                    {formatSmartPrice(item.price)}
                                                                </Typography>
                                                            </>
                                                        );
                                                    })()}
                                                </CardContent>
                                            </CardActionArea>
                                        </Card>

                                        {/* Mobile Separate View */}
                                        <Box sx={{ display: { xs: 'block', md: 'none' }, width: '100%' }}>
                                            <Box sx={{
                                                width: '100%',
                                                pt: '100%', // 1:1 Aspect Ratio
                                                position: 'relative',
                                                borderRadius: 4,
                                                overflow: 'hidden',
                                                bgcolor: 'action.hover',
                                                mb: 1
                                            }}>
                                                {item.image ? (
                                                    <CardMedia
                                                        component="img"
                                                        image={item.image}
                                                        alt={item.name}
                                                        sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Typography variant="caption" color="text.secondary">No Image</Typography>
                                                    </Box>
                                                )}
                                                {/* Coupon Overlay */}
                                                {(() => {
                                                    const coupon = availableCoupons.find(c =>
                                                        c.offerType === 'menu_item' &&
                                                        c.applicableItems?.includes(item._id)
                                                    );
                                                    if (coupon) {
                                                        const discountText = coupon.discountType === 'percentage'
                                                            ? `${coupon.discountValue}% OFF`
                                                            : `$${coupon.discountValue} OFF`;

                                                        return (
                                                            <Box
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: 15,
                                                                    left: -35,
                                                                    width: 130,
                                                                    transform: 'rotate(-45deg)',
                                                                    bgcolor: 'error.main',
                                                                    color: 'white',
                                                                    boxShadow: 2,
                                                                    zIndex: 1,
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    py: 0.5,
                                                                }}
                                                            >
                                                                <Typography variant="caption" sx={{ fontWeight: 'bold', lineHeight: 1, fontSize: '0.75rem' }}>
                                                                    {discountText}
                                                                </Typography>
                                                                {coupon.validTo && (
                                                                    <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.9, lineHeight: 1 }}>
                                                                        Exp: {format(new Date(coupon.validTo), 'MM/dd')}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        );
                                                    }
                                                    return null;
                                                })()}

                                                {/* Scheduling Special Badge Overlay */}
                                                {item.isWeeklyScheduleEnabled && item.displayOption !== 'normal' && (
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 10,
                                                            right: 10,
                                                            bgcolor: item.displayOption === 'todays_special' ? 'warning.main' : item.displayOption === 'weekend_special' ? 'success.main' : 'info.main',
                                                            color: 'white',
                                                            px: 1,
                                                            py: 0.2,
                                                            borderRadius: 1,
                                                            zIndex: 2,
                                                            fontSize: '0.6rem',
                                                            fontWeight: 'bold',
                                                            boxShadow: 2,
                                                            textTransform: 'uppercase'
                                                        }}
                                                    >
                                                        {item.displayOption === 'todays_special' ? "Today's Special" : item.displayOption === 'weekend_special' ? 'Weekend Special' : 'Weekly Special'}
                                                    </Box>
                                                )}
                                            </Box>
                                            <Box sx={{ px: 0.5 }}>
                                                <Typography variant="subtitle2" sx={{
                                                    fontWeight: 'bold',
                                                    lineHeight: 1.2,
                                                    mb: 0.25,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                }}>
                                                    {item.name}
                                                </Typography>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                                        {formatSmartPrice(item.price)}
                                                    </Typography>

                                                    {/* Quantity Controls */}
                                                    <Box>
                                                        {getItemQuantity(item._id) === 0 ? (
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                                                                sx={{
                                                                    borderRadius: '8px',
                                                                    minWidth: '60px',
                                                                    height: '28px',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 'bold',
                                                                    color: '#2e7d32',
                                                                    borderColor: 'divider',
                                                                    bgcolor: theme.palette.mode === 'light' ? 'white' : 'background.paper'
                                                                }}
                                                            >
                                                                ADD
                                                            </Button>
                                                        ) : (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: theme.palette.mode === 'light' ? 'white' : 'background.paper', borderRadius: '8px', p: '2px', border: '1px solid', borderColor: '#2e7d32' }}>
                                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDecrement(item._id); }} sx={{ p: 0.2, color: '#2e7d32' }}>
                                                                    <RemoveIcon sx={{ fontSize: 14 }} />
                                                                </IconButton>
                                                                <Typography sx={{ minWidth: 15, textAlign: 'center', fontWeight: 'bold', fontSize: '0.75rem', color: '#2e7d32' }}>
                                                                    {getItemQuantity(item._id)}
                                                                </Typography>
                                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleItemClick(item); }} sx={{ p: 0.2, color: '#2e7d32' }}>
                                                                    <AddIcon sx={{ fontSize: 14 }} />
                                                                </IconButton>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Grid>
                            ))}
                            {filteredItems.length === 0 && (
                                <Grid item xs={12}>
                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: { xs: 8, md: 12 },
                                        px: 2,
                                        textAlign: 'center',
                                        bgcolor: 'rgba(0,0,0,0.02)',
                                        borderRadius: 4,
                                        border: '2px dashed',
                                        borderColor: 'divider',
                                        mt: 2
                                    }}>
                                        <Box sx={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: '50%',
                                            bgcolor: 'background.paper',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mb: 2,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                        }}>
                                            {searchQuery ? (
                                                <SearchOff sx={{ fontSize: 40, color: 'text.disabled' }} />
                                            ) : (
                                                <RestaurantMenu sx={{ fontSize: 40, color: 'text.disabled' }} />
                                            )}
                                        </Box>
                                        <Typography
                                            variant="h6"
                                            fontWeight="bold"
                                            gutterBottom
                                            sx={{ textAlign: 'center', color: { xs: '#000', md: 'text.primary' }, fontSize: headingFontSize }}
                                        >
                                            {searchQuery ? 'No results found' : 'Menu is empty'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 350, mb: 3, fontSize: bodyFontSize }}>
                                            {searchQuery
                                                ? `We couldn't find any dishes matching "${searchQuery}". Please check the spelling or try a different term.`
                                                : "There are currently no items available in this category. Please check back later or select another category."}
                                        </Typography>
                                        {searchQuery && (
                                            <Button
                                                variant="contained"
                                                onClick={() => setSearchQuery('')}
                                                startIcon={<CloseIcon />}
                                                sx={{
                                                    borderRadius: '20px',
                                                    textTransform: 'none',
                                                    px: 3
                                                }}
                                            >
                                                Clear Search
                                            </Button>
                                        )}
                                    </Box>
                                </Grid>
                            )}
                        </Grid>

                        {/* Load More Button */}
                        {nextCursor && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4, mb: 2, gap: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Showing {menuItems.length} of {totalMenuCount} items
                                </Typography>
                                <Button
                                    variant="outlined"
                                    onClick={() => fetchMenu(nextCursor)}
                                    disabled={isFetchingMore}
                                    sx={{
                                        borderRadius: '50px',
                                        px: 4,
                                        py: 1,
                                        fontWeight: 'bold',
                                        textTransform: 'none',
                                        '&:hover': {
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                >
                                    {isFetchingMore ? (
                                        <>
                                            <CircularProgress size={20} sx={{ mr: 1, color: 'inherit' }} />
                                            Loading...
                                        </>
                                    ) : (
                                        'Load More Items'
                                    )}
                                </Button>
                            </Box>
                        )}

                    </Box>
                )}
            </Box>

            <Modal open={variantModalOpen} onClose={() => setVariantModalOpen(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{
                    p: 0,
                    bgcolor: 'background.paper',
                    width: { xs: '80%', sm: 550 },
                    maxWidth: '100%',
                    mx: 'auto',
                    borderRadius: { xs: '20px', sm: '32px' },
                    maxHeight: { xs: '85vh', sm: '95vh' },
                    overflowY: 'auto',
                    boxShadow: theme => theme.palette.mode === 'dark' ? 'none' : '0 20px 60px rgba(0,0,0,0.1)',
                    position: 'relative',
                    border: 'none',
                    outline: 'none'
                }}>
                    {selectedItem && (
                        <>
                            {/* Header Section */}
                            <Box sx={{ p: { xs: 2, sm: 4 }, pb: { xs: 1, sm: 2 }, display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
                                <Box sx={{
                                    width: { xs: 36, sm: 48 },
                                    height: { xs: 36, sm: 48 },
                                    borderRadius: '50%',
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mr: 2,
                                    flexShrink: 0
                                }}>
                                    {(selectedItem.variants?.length || 0) > 0 || (selectedItem.modifierGroups?.length || 0) > 0 || ((selectedItem as any).linkedGroups?.length || 0) > 0 ? (
                                        <TuneIcon sx={{ fontSize: { xs: '16px', sm: '20px' }, color: 'primary.main' }} />
                                    ) : (
                                        <span style={{ fontSize: '18px' }}>🌶️</span>
                                    )}
                                </Box>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography sx={{
                                        color: 'primary.main',
                                        fontWeight: 900,
                                        fontSize: '0.7rem',
                                        letterSpacing: '1px',
                                        textTransform: 'uppercase',
                                        mb: { xs: 0.5, sm: 0.5 }
                                    }}>
                                    {(selectedItem.variants?.length || 0) > 0 || (selectedItem.modifierGroups?.length || 0) > 0 || ((selectedItem as any).linkedGroups?.length || 0) > 0 ? 'Customize Your Item' : 'Choose Spice Level'}
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 900, fontSize: { xs: '1.25rem', sm: '1.75rem' }, color: 'text.primary', lineHeight: 1.2, mb: 0.5 }}>
                                        {selectedItem.name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                                        Select your preferences before adding this item to the cart.
                                    </Typography>
                                </Box>
                                <IconButton
                                    onClick={() => setVariantModalOpen(false)}
                                    size="small"
                                    sx={{
                                        position: 'absolute',
                                        right: { xs: 12, sm: 16 },
                                        top: { xs: 12, sm: 16 },
                                        bgcolor: 'error.main',
                                        color: 'white',
                                        width: 24,
                                        height: 24,
                                        '&:hover': { bgcolor: 'error.dark' },
                                        zIndex: 1,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <CloseIcon sx={{ fontSize: 12 }} />
                                </IconButton>
                            </Box>

                            <Box sx={{ px: { xs: 2, sm: 4 }, pb: { xs: 1.5, sm: 4 } }}>
                                {/* Item Info Card */}
                                <Box sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                                    borderRadius: '16px',
                                    p: { xs: 1.5, sm: 2 },
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: { xs: 1.5, sm: 4 }
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box
                                            component="img"
                                            src={selectedItem.image || '/placeholder-food.png'}
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: '16px',
                                                objectFit: 'cover',
                                                border: '2px solid',
                                                borderColor: 'primary.light'
                                            }}
                                        />
                                        <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: 'primary.main' }}>
                                            {formatSmartPrice(calculateModalTotal())}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Variants & Modifiers (If any) */}
                                {((selectedItem.variants?.length || 0) > 0 || (selectedItem.modifierGroups?.length || 0) > 0 || ((selectedItem as any).linkedGroups?.length || 0) > 0) && (
                                    <Box sx={{ mb: 4 }}>
                                        <Divider sx={{ mb: 3, borderStyle: 'dashed' }} />
                                        
                                        {/* Variants Section */}
                                        {selectedItem.variants && selectedItem.variants.length > 0 && (
                                            <Box sx={{ mb: 4 }}>
                                                <Typography sx={{ color: 'primary.main', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.5px', mb: 2 }}>
                                                    SELECT OPTION
                                                </Typography>
                                                <RadioGroup
                                                    value={tempSelectedVariant?.name || ''}
                                                    onChange={(e) => {
                                                        const variant = selectedItem.variants?.find(v => v.name === e.target.value);
                                                        if (variant) setTempSelectedVariant(variant);
                                                    }}
                                                >
                                                    <Grid container spacing={2}>
                                                        {selectedItem.variants.map((variant, idx) => (
                                                            <Grid item xs={12} key={idx}>
                                                                <Paper
                                                                    variant="outlined"
                                                                    sx={{
                                                                        p: 2,
                                                                        borderRadius: '16px',
                                                                        cursor: 'pointer',
                                                                        borderColor: tempSelectedVariant?.name === variant.name ? 'primary.main' : 'divider',
                                                                        bgcolor: tempSelectedVariant?.name === variant.name ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                                                                        transition: 'all 0.2s',
                                                                        '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.02) }
                                                                    }}
                                                                    onClick={() => setTempSelectedVariant(variant)}
                                                                >
                                                                    <FormControlLabel
                                                                        value={variant.name}
                                                                        control={<Radio size="small" />}
                                                                        label={
                                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexGrow: 1 }}>
                                                                                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{variant.name}</Typography>
                                                                                <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>+{formatSmartPrice(variant.price)}</Typography>
                                                                            </Box>
                                                                        }
                                                                        sx={{ width: '100%', m: 0, '& .MuiFormControlLabel-label': { flexGrow: 1 } }}
                                                                    />
                                                                </Paper>
                                                            </Grid>
                                                        ))}
                                                    </Grid>
                                                </RadioGroup>
                                            </Box>
                                        )}

                                        {/* Modifier Groups Section */}
                                        {[...(selectedItem.modifierGroups || []), ...((selectedItem as any).linkedGroups || [])]
                                            .filter(g => g && typeof g === 'object')
                                            .map((group, groupIdx) => (
                                            <Box key={groupIdx} sx={{ mb: 4 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography sx={{ color: 'primary.main', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                                            {group.name?.toUpperCase()}
                                                        </Typography>
                                                        {group.required && (
                                                            <Chip label="Required" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900, bgcolor: 'error.main', color: 'white' }} />
                                                        )}
                                                    </Box>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        {group.selectionType === 'single' ? 'Choose 1' : 
                                                            group.minSelection ? `Choose at least ${group.minSelection}` : 
                                                            group.required ? '' : 'Optional'}
                                                    </Typography>
                                                </Box>

                                                <Grid container spacing={1}>
                                                    {group.options.map((option: any, optIdx: number) => {
                                                        const isSelected = (tempModifiers[group.name] || []).some(o => o.name === option.name);
                                                        
                                                        const toggleOption = () => {
                                                            const current = [...(tempModifiers[group.name] || [])];
                                                            if (group.selectionType === 'single') {
                                                                setTempModifiers({ ...tempModifiers, [group.name]: [option] });
                                                            } else {
                                                                if (isSelected) {
                                                                    setTempModifiers({
                                                                        ...tempModifiers,
                                                                        [group.name]: current.filter(o => o.name !== option.name)
                                                                    });
                                                                } else {
                                                                    if (!group.maxSelection || current.length < group.maxSelection) {
                                                                        setTempModifiers({
                                                                            ...tempModifiers,
                                                                            [group.name]: [...current, option]
                                                                        });
                                                                    } else {
                                                                        toast.error(`Maximum ${group.maxSelection} selections allowed for ${group.name}`);
                                                                    }
                                                                }
                                                            }
                                                        };

                                                        return (
                                                            <Grid item xs={12} key={optIdx}>
                                                                <Paper
                                                                    variant="outlined"
                                                                    sx={{
                                                                        p: 1.5,
                                                                        borderRadius: '12px',
                                                                        cursor: 'pointer',
                                                                        borderColor: isSelected ? 'primary.main' : 'divider',
                                                                        bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                                                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }
                                                                    }}
                                                                    onClick={toggleOption}
                                                                >
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                            {group.selectionType === 'single' ? (
                                                                                <Radio size="small" checked={isSelected} sx={{ p: 0.5 }} />
                                                                            ) : (
                                                                                <Checkbox size="small" checked={isSelected} sx={{ p: 0.5 }} />
                                                                            )}
                                                                            <Typography sx={{ fontSize: '0.9rem', fontWeight: isSelected ? 700 : 500 }}>
                                                                                {option.name}
                                                                            </Typography>
                                                                        </Box>
                                                                        {option.price > 0 && (
                                                                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.secondary' }}>
                                                                                +{formatSmartPrice(option.price)}
                                                                            </Typography>
                                                                        )}
                                                                    </Box>
                                                                </Paper>
                                                            </Grid>
                                                        );
                                                    })}
                                                </Grid>
                                            </Box>
                                        ))}
                                    </Box>
                                )}

                                {/* Heat Preference Section */}
                                {(selectedItem as any).isSpiceLevelAvailable && (selectedItem as any).spiceLevels?.length > 0 && (
                                    <Paper variant="outlined" sx={{
                                        borderRadius: { xs: '16px', sm: '24px' },
                                        p: { xs: 2, sm: 3 },
                                        pb: { xs: 1, sm: 3 },
                                        borderColor: 'divider',
                                        bgcolor: 'background.paper',
                                        mb: { xs: 2, sm: 4 }
                                    }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 0.5, sm: 1 } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <span style={{ fontSize: '16px' }}>🌶️</span>
                                                <Typography sx={{ color: 'primary.main', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                                    SPICE SELECTION
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={tempSelectedSpiceLevel || (selectedItem as any).spiceLevels[0]}
                                                size="small"
                                                sx={{
                                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                    color: 'primary.main',
                                                    fontWeight: 900,
                                                    fontSize: '0.65rem',
                                                    height: 24,
                                                    textTransform: 'capitalize'
                                                }}
                                            />
                                        </Box>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: { xs: 1, sm: 4 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                            Slide to the spice level you want, and we'll send that choice to the kitchen.
                                        </Typography>

                                        <Box sx={{ px: { xs: 1, sm: 2 }, mb: { xs: 0, sm: 2 } }}>
                                            <Slider
                                                value={Math.max(0, (selectedItem as any).spiceLevels.indexOf(tempSelectedSpiceLevel || (selectedItem as any).spiceLevels[0]))}
                                                min={0}
                                                max={(selectedItem as any).spiceLevels.length - 1}
                                                step={1}
                                                marks={true}
                                                onChange={(_, val) => setTempSelectedSpiceLevel((selectedItem as any).spiceLevels[val as number])}
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
                                                        boxShadow: theme => theme.palette.mode === 'dark' ? 'none' : '0 4px 12px rgba(79, 70, 229, 0.25)',
                                                        transition: 'none',
                                                        '&:hover, &.Mui-active': {
                                                            boxShadow: (theme) => `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`,
                                                        },
                                                        '&::after': {
                                                            content: '"🌶️"',
                                                            fontSize: '14px',
                                                            position: 'absolute'
                                                        }
                                                    },
                                                    '& .MuiSlider-mark': {
                                                        bgcolor: 'text.disabled',
                                                        height: 6,
                                                        width: 6,
                                                        borderRadius: '50%'
                                                    },
                                                    '& .MuiSlider-markActive': {
                                                        bgcolor: 'primary.main'
                                                    }
                                                }}
                                            />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: { xs: 1, sm: 3 } }}>
                                                {(selectedItem as any).spiceLevels.map((level: string, i: number) => {
                                                    const isSel = (tempSelectedSpiceLevel || (selectedItem as any).spiceLevels[0]) === level;
                                                    const normalizedLevel = level?.toLowerCase().replace(/_/g, ' ');
                                                    return (
                                                        <Box
                                                            key={i}
                                                            onClick={() => setTempSelectedSpiceLevel(level)}
                                                            sx={{
                                                                textAlign: 'center',
                                                                flex: 1,
                                                                cursor: 'pointer',
                                                                userSelect: 'none'
                                                            }}
                                                        >
                                                            <Typography sx={{
                                                                fontSize: '0.7rem',
                                                                fontWeight: isSel ? 900 : 700,
                                                                color: isSel ? 'primary.main' : 'text.disabled',
                                                                textTransform: 'uppercase',
                                                                mb: 0.5,
                                                                transition: 'color 0.2s',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 0.5
                                                            }}>
                                                                {normalizedLevel}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{
                                                                fontSize: '0.6rem',
                                                                color: isSel ? 'primary.main' : 'text.disabled',
                                                                opacity: isSel ? 1 : 0.6,
                                                                display: { xs: 'none', sm: 'block' }
                                                            }}>
                                                                {normalizedLevel.includes('mild') ? 'Light' :
                                                                    normalizedLevel.includes('medium') ? 'Balanced' :
                                                                        normalizedLevel === 'hot' ? 'Spicy' : 'Extra Spicy'}
                                                            </Typography>
                                                        </Box>
                                                    );
                                                })}
                                            </Box>
                                        </Box>
                                    </Paper>
                                )}

                                {/* Footer Selection Display & Actions */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
                                    {(selectedItem as any).isSpiceLevelAvailable && (selectedItem as any).spiceLevels?.length > 0 && (
                                        <Box sx={{ width: { xs: '100%', sm: 'auto' }, display: { xs: 'none', sm: 'block' } }}>
                                            <Typography sx={{ color: 'text.disabled', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.5px' }}>
                                                SELECTED
                                            </Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary' }}>
                                                {tempSelectedSpiceLevel || (selectedItem as any).spiceLevels?.[0] || 'None'}
                                            </Typography>
                                        </Box>
                                    )}
                                    <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, width: { xs: '100%', sm: 'auto' } }}>
                                        <Button
                                            variant="outlined"
                                            onClick={() => setVariantModalOpen(false)}
                                            sx={{
                                                borderRadius: '50px',
                                                px: { xs: 2, sm: 4 },
                                                py: { xs: 1, sm: 1.5 },
                                                flex: { xs: 1, sm: 'none' },
                                                borderColor: 'primary.light',
                                                color: 'primary.main',
                                                fontWeight: 900,
                                                fontSize: { xs: '0.85rem', sm: '0.9rem' },
                                                textTransform: 'none',
                                                '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04) }
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="contained"
                                            size="medium"
                                            onClick={handleAddToCartFromModal}
                                            sx={{
                                                borderRadius: '50px',
                                                px: { xs: 2, sm: 4 },
                                                py: { xs: 1, sm: 1.5 },
                                                flex: { xs: 2, sm: 'none' },
                                                bgcolor: 'primary.main',
                                                color: 'white',
                                                fontWeight: 900,
                                                fontSize: { xs: '0.85rem', sm: '0.9rem' },
                                                textTransform: 'none',
                                                boxShadow: '0 8px 24px rgba(79, 70, 229, 0.25)',
                                                '&:hover': { bgcolor: 'primary.dark' }
                                            }}
                                        >
                                            Add to Cart
                                        </Button>
                                    </Box>
                                </Box>
                            </Box>
                        </>
                    )}
                </Box>
            </Modal>

            {/* Right side – cart */}
            <Paper
                id="cart-payment-section"
                ref={cartSectionRef}
                sx={{ width: { xs: '100%', md: 350 }, display: 'flex', flexDirection: 'column', height: { xs: 'auto', md: '100%' }, flexShrink: 0 }}
            >
                <OrderDetailsSection
                    cart={cart}
                    updateQuantity={updateCartItemQuantity}
                    removeFromCart={removeFromCart}
                    formatSmartPrice={formatSmartPrice}
                    cartTotal={cartTotal}
                    taxAmount={taxAmount}
                    discountAmount={discountAmount}
                    discountPercent={discountPercent}
                    couponDiscount={couponDiscount}
                    couponCode={couponCode}
                    setCouponCode={setCouponCode}
                    handleValidateCoupon={handleValidateCoupon}
                    availableCoupons={availableCoupons}
                    serviceChargeAmount={serviceChargeAmount}
                    tip={tip}
                    setTip={setTip}
                    finalTotal={finalTotal}
                    rewardDiscount={rewardDiscount}
                    placingOrder={placingOrder}
                    handlePlaceOrder={handlePlaceOrder}
                    readOnly={isEditMode}
                />
            </Paper>

            <CustomItemDialog 
                open={customItemModalOpen} 
                onClose={() => setCustomItemModalOpen(false)} 
                onAdd={handleAddCustomItem} 
            />

            {/* Payment Modal */}
            <PaymentModal
                open={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                amount={finalTotal}
                onSuccess={handlePaymentSuccess}
                showTips={false}
            />

            {/* Manual Payment Confirmation Dialog */}
            <Dialog open={manualPaymentDialogOpen} onClose={() => setManualPaymentDialogOpen(false)}>
                <Box sx={{ p: 4, minWidth: 300, textAlign: 'center', position: 'relative' }}>
                    <IconButton
                        onClick={() => setManualPaymentDialogOpen(false)}
                        size="small"
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': {
                                bgcolor: 'error.dark',
                            },
                            width: 24,
                            height: 24,
                        }}
                    >
                        <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <Typography variant="h6" gutterBottom>
                        Payment via {paymentMethod === 'zelle' ? 'Zelle' : paymentMethod === 'venmo' ? 'Venmo' : paymentMethod === 'phonepe' ? 'PhonePe' : paymentMethod === 'gpay' ? 'GPay' : paymentMethod === 'paytm' ? 'Paytm' : paymentMethod?.toUpperCase()}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3 }}>
                        Please collect <strong>{formatSmartPrice(finalTotal)}</strong> from the customer.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button variant="outlined" onClick={() => setManualPaymentDialogOpen(false)}>
                            Back
                        </Button>
                        <Button variant="contained" color="primary" onClick={handleManualPaymentConfirm}>
                            Confirm
                        </Button>
                    </Box>
                </Box>
            </Dialog>

            {/* Mobile Sticky Cart Footer */}
            {
                cart.length > 0 && !isCartVisible && (
                    <Box sx={{
                        display: { xs: 'flex', md: 'none' },
                        position: 'fixed',
                        bottom: 16,
                        left: 16,
                        right: 16,
                        bgcolor: '#10b981', // Premium green color
                        color: 'white',
                        p: 2,
                        borderRadius: 3,
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                        zIndex: 1000,
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {cart.reduce((sum, i) => sum + i.quantity, 0)} Items Added
                            </Typography>
                        </Box>
                        <Button
                            endIcon={<CartIcon />}
                            sx={{ color: 'white', fontWeight: 'bold' }}
                            onClick={() => {
                                const cartElement = document.getElementById('cart-payment-section');
                                cartElement?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            View Cart
                        </Button>
                    </Box>
                )
            }

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeInSlideUp {
                    from { 
                        transform: translateY(30px); 
                        opacity: 0; 
                    }
                    to { 
                        transform: translateY(0); 
                        opacity: 1; 
                    }
                }
                @keyframes dynamicTextSlide {
                    0% { transform: translateY(20px); opacity: 0; }
                    10% { transform: translateY(0px); opacity: 1; }
                    90% { transform: translateY(0px); opacity: 1; }
                    100% { transform: translateY(-20px); opacity: 0; }
                }
            `}</style>
            {/* Merge Tables Dialog */}
            <MergeTablesDialog
                open={mergeDialogOpen}
                onClose={() => setMergeDialogOpen(false)}
                tables={tables}
                onSelect={(pid, sids) => {
                    setPendingPrimaryTableId(pid);
                    setPendingMergeSecondaryIds(sids);

                    const primary = tables.find(t => t._id === pid);
                    if (primary) {
                        setSelectedTable(primary);
                        setTableNumber(primary.tableNumber);
                    }
                }}
                initialPrimaryTableId={selectedTable?._id}
            />
        </Box>
    );
};

export default POSPage;
