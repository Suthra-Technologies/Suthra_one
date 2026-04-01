import {
    Add as AddIcon,
    ShoppingCart as CartIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Remove as RemoveIcon,
    RestaurantMenu,
    Search as SearchIcon,
    SearchOff,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    CardMedia,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    Divider,
    FormControl,
    FormControlLabel,
    FormGroup,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Modal,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Slider,
    Tab,
    Tabs,
    TextField,
    Typography,
    alpha,
} from '@mui/material';
import type { AxiosError } from 'axios';
import { format } from 'date-fns';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useSearchParams } from "react-router-dom";
import theme from 'src/theme/theme';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import PaymentModal from '../../components/PaymentModal';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { couponsAPI, menuAPI, ordersAPI, settingsAPI, tablesAPI, usersAPI, traysAPI } from '../../services/api';
import PhoneInput from 'src/components/PhoneInput';
import { isWithinDeliveryRadius, METERS_PER_MILE } from '../../services/googleMapsService';


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


const POSPage: React.FC = () => {
    const { user, getUserFullName } = useAuth();
    const { formatCurrency, settings } = useSettings();

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

    // Coupon handling
    const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);

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
    const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery' | 'online'>('takeaway');
    const [tableNumber, setTableNumber] = useState('');
    const [waiterName, setWaiterName] = useState('');
    const [guestCount, setGuestCount] = useState(1);
    const [tableError, setTableError] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState<any>({});
    const [gstPercent, setGstPercent] = useState(settings?.restaurant?.taxRate || 5);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [tip, setTip] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'card' | 'zelle' | 'venmo'>('cash');
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [manualPaymentDialogOpen, setManualPaymentDialogOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState<any>(null);
    const [cardPrintReceipt, setCardPrintReceipt] = useState(false);
    const [cardSignInForApiCall, setCardSignInForApiCall] = useState(false);
    const [isCartVisible, setIsCartVisible] = useState(false);
    const cartSectionRef = useRef<HTMLDivElement | null>(null);
    // Guard to prevent re-loading stale order data after an order is submitted
    const orderSubmittedRef = useRef(false);
    const [trays, setTrays] = useState<any[]>([]);
    const [tempSelectedTray, setTempSelectedTray] = useState<any | null>(null);
    const [customerDialCode, setCustomerDialCode] = useState(settings?.restaurant?.dialCode || '1');
    const [checkingDistance, setCheckingDistance] = useState(false);

    // Sync dial code with settings when they load
    useEffect(() => {
        if (settings?.restaurant?.dialCode) {
            setCustomerDialCode(settings.restaurant.dialCode);
        }
    }, [settings?.restaurant?.dialCode]);

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

    const [isGstLocked, setIsGstLocked] = useState(false);

    // Dynamic Search Placeholder logic
    const placeholderItems = ['Pizza', 'Biryani', 'Idli', 'Dosa', 'Burger', 'Coffee'];
    const [placeholderIndex, setPlaceholderIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholderItems.length);
        }, 3000); // Slightly slower for better readability
        return () => clearInterval(timer);
    }, []);

    // Fetch menu, categories, tables
    const fetchMenu = async () => {
        try {
            setLoading(true);
            const [menuRes, categoriesRes, tablesRes, settingsRes, traysRes] = await Promise.all([
                menuAPI.getAll(),
                menuAPI.getAllCategories(),
                tablesAPI.getAll(),
                settingsAPI.getAll(),
                traysAPI.getAll(),
            ]);
            setMenuItems(menuRes.data);
            setCategories(categoriesRes.data);
            setTables(tablesRes.data);
            setTrays(traysRes.data);

            const restaurantSettings = settingsRes.data.find((s: any) => s.category === 'restaurant')?.settings;
            if (restaurantSettings?.taxRate !== undefined) {
                setGstPercent(restaurantSettings.taxRate);
                setIsGstLocked(true);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            // toast.error('Failed to load menu data');
        } finally {
            setLoading(false);
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
    const handleValidateCoupon = React.useCallback(async (silent = false) => {
        if (!couponCode) {
            setCouponDiscount(0);
            return;
        }
        try {
            const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
            console.log(`[Coupon] Validating "${couponCode}" | Cart Total: $${cartTotal} | Silent: ${silent}`);

            const res = await ordersAPI.validateCoupon(couponCode);
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
            setCouponCode(''); // Clear invalid coupon
            if (!silent) {
                toast.error(error.response?.data?.message || error.message || 'Invalid coupon');
            } else {
                // Silent notification that coupon was removed
                toast.success('Coupon removed - minimum order amount not met', { icon: 'ℹ️' });
            }
        }
    }, [couponCode, cart]);
    const [searchParams, setSearchParams] = useSearchParams();
    const mode = searchParams.get("mode");   // 'edit' | null
    const orderId = searchParams.get("orderId");
    const existingOrderId = searchParams.get("orderId");
    const isEditMode = !!existingOrderId;
    const resetData = () => {
        setCart([]);
        setCouponCode("");
        setCouponDiscount(0);
        setGstPercent(settings?.restaurant?.taxRate || 5);
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

        setSelectedTable(null);   // ✅ important
        setCardPrintReceipt(false);
        setCardSignInForApiCall(false);
        setIsGstLocked(!!settings?.restaurant?.taxRate);
    };



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
                    // For a NEW order from booking, clear previous state first
                    resetData();
                    setSelectedTable(table);
                    setTableNumber(table.tableNumber);
                    setOrderType('dine_in');
                }
            }
        }

        // Always try to pick up customer info/guest count from URL if provided,
        // to support navigation from bookings even when an order already exists.
        if (tables.length > 0 || isEditMode) {
            const guests = searchParams.get("guestCount");
            if (guests) {
                const gCount = parseInt(guests);
                if (!isNaN(gCount) && gCount > 0) setGuestCount(gCount);
            }

            const cName = searchParams.get("customerName");
            if (cName) setCustomerName(cName);

            const cPhone = searchParams.get("customerPhone");
            if (cPhone) {
                const digits = cPhone.replace(/\D/g, '');
                if (cPhone.startsWith('+')) {
                    setCustomerDialCode(digits.slice(0, -10));
                    setCustomerPhone(digits.slice(-10));
                } else {
                    setCustomerPhone(digits.slice(-10));
                }
            }

            const cEmail = searchParams.get("customerEmail");
            if (cEmail) setCustomerEmail(cEmail);
        }
    }, [isEditMode, existingOrderId, tables, searchParams]);

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

            setCustomerName(urlName || ord.customer?.name || '');
            const rawPhone = urlPhone || ord.customer?.phone || '';
            const digits = rawPhone.replace(/\D/g, '');
            if (rawPhone.startsWith('+')) {
                setCustomerDialCode(digits.slice(0, -10));
                setCustomerPhone(digits.slice(-10));
            } else {
                setCustomerPhone(digits.slice(-10));
            }
            setCustomerEmail(urlEmail || ord.customer?.email || '');
            setGstPercent(ord.gstPercent || 5);
            setDiscountPercent(ord.discountPercent || 0);
            setPaymentMethod(ord.paymentMethod || 'cash');
            setCardPrintReceipt(Boolean(ord.cardOptions?.printReceipt));
            setCardSignInForApiCall(Boolean(ord.cardOptions?.signInForApiCall));
            setIsGstLocked(true);

            if (ord.orderType === "dine_in") {
                const table = tables.find((t) => t.tableNumber === ord.tableNumber);

                setSelectedTable(table || null);
                setTableNumber(ord.tableNumber || "");
                setWaiterName(ord.waiterName || "");
                setGuestCount(ord.guestCount || 1);
            }


            // Load items into cart
            const formattedCart = ord.items.map((i: any) => ({
                _id: i.menuItem,
                name: i.name,
                price: i.price,
                quantity: i.quantity,
            }));

            setCart(formattedCart);

        } catch (err) {
            toast.error("Failed to load order");
        }
    };



    // Ensure payment method is valid based on settings
    useEffect(() => {
        if (!settings.system?.posPaymentMethods) return;

        const methods = settings.system.posPaymentMethods;
        const currentValid = (methods as any)[paymentMethod];

        if (currentValid === false) {
            // Find first available method
            const available = Object.entries(methods).find(([_, enabled]) => enabled === true);
            if (available) {
                setPaymentMethod(available[0] as any);
            }
        }
    }, [settings.system?.posPaymentMethods, paymentMethod]);

    // Initialise data
    useEffect(() => {
        fetchMenu();
        fetchWaiters();
    }, []);

    // Refresh coupons when order type or cart total changes
    useEffect(() => {
        fetchAvailableCoupons();

        // Re-validate applied coupon when cart changes
        if (couponCode && couponDiscount > 0) {
            handleValidateCoupon(true); // Silent re-validation
        }
    }, [orderType, cart, couponCode, couponDiscount, handleValidateCoupon]);

    // Filtering menu items
    const filteredItems = useMemo(() => {
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        return menuItems.filter((item) => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory =
                selectedCategory === 'all' ||
                (item.category && (item.category._id === selectedCategory || item.category === selectedCategory));
            const matchesFoodType =
                foodTypeFilter === 'all' || item.foodType === foodTypeFilter;

            // In standard modes, show items that are specifically available for regular ordering
            let isAvailableByMode = !!item.isAvailable && !!item.isActive;

            // Apply scheduling filters for regular items (if not using special catering interface)
            if (item.isWeeklyScheduleEnabled) {
                // Check if today is one of the available days
                const isDayAvailable = (item.availableDays || []).some((d: string) => d.toLowerCase() === currentDay);
                
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

    const addToCart = (item: any) => {
        setCart((prev: any[]) => {
            const cartId = item.cartId ?? item._id; // unique key per variant

            const existing = prev.find((c) => c.cartId === cartId);

            if (existing) {
                return prev.map((c) =>
                    c.cartId === cartId ? { ...c, quantity: c.quantity + 1 } : c
                );
            }

            return [...prev, { ...item, cartId, quantity: 1 }];
        });
    };



    const removeFromCart = (cartId: string) => {
        setCart((prev) => prev.filter((i) => i.cartId !== cartId));
    };



    const updateQuantity = (cartId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((i) => {
                    if (i.cartId === cartId) {
                        const newQty = i.quantity + delta;
                        return newQty > 0 ? { ...i, quantity: newQty } : null;
                    }
                    return i;
                })
                .filter(Boolean) as any[]
        );
    };

    const getItemQuantity = (itemId: string) => {
        return cart
            .filter((i) => i._id === itemId)
            .reduce((sum, i) => sum + i.quantity, 0);
    };

    const handleDecrement = (itemId: string) => {
        // Find the last added variant of this item to decrement
        const itemInCart = [...cart].reverse().find((i) => i._id === itemId);
        if (itemInCart) {
            updateQuantity(itemInCart.cartId, -1);
        }
    };



    const formatSmartPrice = (price: number) => {
        const formatted = formatCurrency(price);
        return price % 1 === 0 ? formatted.replace(/\.00$/, '') : formatted;
    };

    const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    // Calculate total tax based on item-specific rates
    const taxAmount = cart.reduce((sum, item) => {
        const itemTotal = item.price * item.quantity;
        const itemTaxRate = (item.taxRate !== undefined && item.taxRate !== null)
            ? item.taxRate
            : gstPercent;
        return sum + (itemTotal * (itemTaxRate / 100));
    }, 0);
    const discountAmount = cartTotal * (discountPercent / 100);
    const serviceChargeAmount = (orderType === 'dine_in' && guestCount > 3) ? Math.round(cartTotal * 0.18) : 0;
    const finalTotal = cartTotal + taxAmount - discountAmount - couponDiscount + serviceChargeAmount + (Number(tip) || 0);

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
        }

        // Validate phone
        if (!customerPhone) {
            setCustomerPhoneTouched(true);
            setCustomerPhoneError('Phone number is required');
            hasError = true;
        } else if (customerPhone.length !== 10) {
            setCustomerPhoneTouched(true);
            setCustomerPhoneError('Phone number must be exactly 10 digits');
            hasError = true;
        }

        // Validate email (optional)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (customerEmail && !emailRegex.test(customerEmail)) {
            setCustomerEmailTouched(true);
            setCustomerEmailError('Please enter a valid email address');
            hasError = true;
        } else {
            setCustomerEmailError('');
        }

        // Validate table selection for dine-in orders
        if (orderType === 'dine_in' && !selectedTable) {
            setTableError('Please select a table for dine-in orders');
            hasError = true;
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

            if (paymentMethod === 'zelle' || paymentMethod === 'venmo') {
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
        await submitOrder(`MANUAL_${paymentMethod.toUpperCase()}`);
    };
    const fetchTables = async () => {
        try {
            const res = await tablesAPI.getAll();
            setTables(res.data);
        } catch (err) {
            console.error("Failed to load tables", err);
        }
    };

    const fetchWaiters = async () => {
        try {
            const res = await usersAPI.getUsers();
            const allUsers = res.data.data || res.data.users || res.data || [];
            setWaiters(allUsers.filter((u: any) =>
                u.isActive !== false &&
                (u.role === 'waiter' || (Array.isArray(u.roles) && u.roles.includes('waiter')))
            ));
        } catch (err) {
            console.error("Failed to load waiters", err);
        }
    };

    const submitOrder = async (paymentIntentId?: string, tipOverride?: number) => {
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

            if (orderType === 'dine_in') {
                // For dine-in, always start with pending status
                finalPaymentStatus = 'pending';
                finalPaymentIntentId = undefined; // No payment intent for dine-in initially

                if (paymentMethod === 'card' || paymentMethod === 'online') {
                    // Replace card/online with cash for dine-in orders
                    finalPaymentMethod = 'cash';
                    console.log(`[Dine-in Payment] Replaced ${paymentMethod} with cash (pending status)`);
                } else if (paymentMethod === 'cash' || paymentMethod === 'zelle' || paymentMethod === 'venmo') {
                    // Keep cash/zelle/venmo but with pending status until payment is collected
                    console.log(`[Dine-in Payment] Keeping ${paymentMethod} with pending status`);
                }
            }

            const payload = {
                items: cart.map((i) => ({
                    menuItem: i._id,
                    name: i.name,
                    quantity: i.quantity,
                    price: i.price,
                    total: i.price * i.quantity,
                    modifiers: i.modifiers,
                    variant: i.variant,
                    tray: i.tray,
                    trayMultiplier: i.trayMultiplier,
                })),
                totalAmount: cartTotal,
                tip: tipValue,
                gstPercent,
                discountPercent,
                couponCode: couponCode || undefined,
                orderType,
                table: selectedTable?._id || undefined,
                paymentMethod: finalPaymentMethod,
                paymentStatus: finalPaymentStatus,
                paymentIntentId: finalPaymentIntentId,
                ...(finalPaymentMethod === 'card' && {
                    cardOptions: {
                        printReceipt: cardPrintReceipt,
                        signInForApiCall: cardSignInForApiCall,
                    },
                }),

                ...(orderType === "dine_in" && {
                    tableNumber: selectedTable?.tableNumber || tableNumber,
                    waiterName,
                    guestCount,
                }),

                ...(orderType === "delivery" && { deliveryAddress }),

                customer: {
                    name: customerName || undefined,
                    phone: customerPhone ? `+${customerDialCode}${customerPhone}` : undefined,

                    email: customerEmail || undefined,
                },
            };

            if (isEditMode && existingOrderId) {
                await ordersAPI.update(existingOrderId, payload);
                toast.success("Order updated");
            } else {
                await ordersAPI.create(payload);
                // toast.success("Order placed");
            }

            // Set guard BEFORE clearing URL/state to prevent useEffect from re-loading stale order data
            orderSubmittedRef.current = true;

            // First clear URL and local state to exit edit/booking mode
            setSearchParams({}, { replace: true });
            resetData();

            // Then handle table status update and refresh
            if (orderType === "dine_in" && selectedTable?._id) {
                try {
                    const updateData = { status: "occupied" };
                    await tablesAPI.update(selectedTable._id, updateData);
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
        if (item.modifierGroups) {
            item.modifierGroups.forEach(g => {
                const defs = g.options.filter(o => o.isDefault);
                if (defs.length > 0) {
                    // For single select, only take the first default
                    if (g.selectionType === 'single') {
                        defaults[g.name] = [defs[0]];
                    } else {
                        defaults[g.name] = defs;
                    }
                }
            });
        }
        setTempModifiers(defaults);
        setTempSelectedTray(null);

        // Check if item has spice levels enabled
        const hasSpiceLevels = (item as any).isSpiceLevelAvailable && (item as any).spiceLevels && (item as any).spiceLevels.length > 0;
        const hasTrays = false;

        if ((item.variants && item.variants.length > 0) || (item.modifierGroups && item.modifierGroups.length > 0) || hasTrays || hasSpiceLevels) {
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
        if (selectedItem.modifierGroups) {
            for (const group of selectedItem.modifierGroups) {
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
            modifiers: Object.values(tempModifiers).flat(),
            tray: tempSelectedTray?.tray,
            spiceLevel: hasSpiceLevels ? tempSelectedSpiceLevel : undefined,
            trayMultiplier: 1,
        });

        setVariantModalOpen(false);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: { xs: 'auto', md: 'calc(100vh - 100px)' }, gap: 2 }}>
            {/* Left side – menu */}
            {/* Left side – menu */}
            <Box sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                height: { xs: 'auto', md: '100%' },
                mb: { xs: 2, md: 0 },
                pr: { xs: 1, md: 2 }, // Space between content and scrollbar
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



                {/* Order details */}
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Customer & Order Details
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Customer Name"
                                size="small"
                                fullWidth
                                value={customerName}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                    setCustomerName(value);
                                    if (customerNameTouched && value.trim()) {
                                        setCustomerNameError('');
                                    }
                                }}
                                onBlur={() => {
                                    setCustomerNameTouched(true);
                                    const trimmedName = customerName.trim();
                                    if (!trimmedName) {
                                        setCustomerNameError('Customer name is required');
                                    } else if (trimmedName.length < 3) {
                                        setCustomerNameError('Customer name must be at least 3 characters');
                                    } else {
                                        setCustomerNameError('');
                                    }
                                }}
                                error={customerNameTouched && !!customerNameError}
                                helperText={customerNameTouched && customerNameError}
                                disabled={user?.role === 'customer'}
                                required
                                InputLabelProps={{
                                    sx: {
                                        '& .MuiFormLabel-asterisk': {
                                            color: 'error.main'
                                        }
                                    }
                                }}
                                autoComplete="off"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <PhoneInput
                                label="Phone"
                                size="small"
                                fullWidth
                                value={customerPhone}
                                onChange={(value) => {
                                    const cleaned = value.replace(/\D/g, '').slice(0, 10);
                                    setCustomerPhone(cleaned);
                                    if (customerPhoneTouched && cleaned) {
                                        setCustomerPhoneError('');
                                    }
                                }}
                                onBlur={() => {
                                    setCustomerPhoneTouched(true);
                                    if (!customerPhone) {
                                        setCustomerPhoneError('Phone number is required');
                                    } else if (customerPhone.length !== 10) {
                                        setCustomerPhoneError('Phone number must be exactly 10 digits');
                                    } else {
                                        setCustomerPhoneError('');
                                    }
                                }}
                                error={customerPhoneTouched && !!customerPhoneError}
                                helperText={customerPhoneTouched && customerPhoneError}
                                disabled={user?.role === 'customer'}
                                required
                                dialCode={customerDialCode}
                                onDialCodeChange={setCustomerDialCode}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Email"
                                size="small"
                                fullWidth
                                type="email"
                                value={customerEmail}
                                onChange={(e) => {
                                    setCustomerEmail(e.target.value);
                                    if (customerEmailTouched) {
                                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                        if (e.target.value && !emailRegex.test(e.target.value)) {
                                            setCustomerEmailError('Please enter a valid email address');
                                        } else {
                                            setCustomerEmailError('');
                                        }
                                    }
                                }}
                                onBlur={() => {
                                    setCustomerEmailTouched(true);
                                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                    if (customerEmail && !emailRegex.test(customerEmail)) {
                                        setCustomerEmailError('Please enter a valid email address');
                                    } else {
                                        setCustomerEmailError('');
                                    }
                                }}
                                error={customerEmailTouched && !!customerEmailError}
                                helperText={customerEmailTouched && customerEmailError}
                                disabled={user?.role === 'customer'}
                                autoComplete="off"
                            />
                        </Grid>
                    </Grid>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                        <FormControl component="fieldset" sx={{ alignItems: 'center' }}>
                            <Typography variant="body2" gutterBottom fontWeight="bold">
                                Order Type
                            </Typography>
                            <RadioGroup
                                value={orderType}
                                onChange={(e) => setOrderType(e.target.value as any)}
                                sx={{ flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center' }}
                            >
                                <FormControlLabel value="dine_in" control={<Radio size="small" />} label="Dine‑In" />
                                <FormControlLabel value="takeaway" control={<Radio size="small" />} label="Takeaway" />
                            </RadioGroup>
                        </FormControl>

                        {orderType !== 'dine_in' && (
                            <FormControl component="fieldset" sx={{ alignItems: 'center' }}>
                                <Typography variant="body2" gutterBottom fontWeight="bold">
                                    Payment Method
                                </Typography>
                                <RadioGroup
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                                    sx={{ flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center' }}
                                >
                                    {(settings.system?.posPaymentMethods?.cash ?? true) && (
                                        <FormControlLabel value="cash" control={<Radio size="small" />} label="Cash" />
                                    )}
                                    {(settings.system?.posPaymentMethods?.card ?? true) && (
                                        <FormControlLabel value="card" control={<Radio size="small" />} label="Card" />
                                    )}
                                    {(settings.system?.posPaymentMethods?.zelle ?? true) && (
                                        <FormControlLabel value="zelle" control={<Radio size="small" />} label="Zelle" />
                                    )}
                                    {(settings.system?.posPaymentMethods?.venmo ?? true) && (
                                        <FormControlLabel value="venmo" control={<Radio size="small" />} label="Venmo" />
                                    )}
                                </RadioGroup>
                            </FormControl>
                        )}
                    </Box>

                    {/* {paymentMethod === 'card' && (
                        <FormGroup sx={{ mb: 2 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={cardPrintReceipt}
                                        onChange={(e) => setCardPrintReceipt(e.target.checked)}
                                    />
                                }
                                label="Print receipt"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={cardSignInForApiCall}
                                        onChange={(e) => setCardSignInForApiCall(e.target.checked)}
                                    />
                                }
                                label="Sign"
                            />
                        </FormGroup>
                    )} */}

                    {/* Dine‑in specific */}
                    {orderType === 'dine_in' && (
                        <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 2, gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                                    <Typography variant="body2">Number of Guests:</Typography>
                                    <TextField
                                        type="number"
                                        size="small"
                                        value={guestCount}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (val > 0) setGuestCount(val);
                                        }}
                                        sx={{ width: 80 }}
                                        inputProps={{ min: 1 }}
                                    />
                                </Box>
                                <FormControl size="small" sx={{ width: { xs: '100%', sm: 300 } }}>
                                    <InputLabel>Waiter Name</InputLabel>
                                    <Select
                                        value={waiterName}
                                        label="Waiter Name"
                                        onChange={(e) => setWaiterName(e.target.value)}
                                        MenuProps={{
                                            PaperProps: {
                                                sx: {
                                                    maxWidth: '100%',
                                                    maxHeight: 300
                                                }
                                            }
                                        }}
                                        fullWidth
                                    >
                                        {waiters.map((waiter) => {
                                            const displayName = (waiter.firstName || waiter.lastName)
                                                ? `${waiter.firstName || ''} ${waiter.lastName || ''}`.trim()
                                                : (waiter.username || waiter.email || 'Unknown');
                                            return (
                                                <MenuItem key={waiter._id} value={displayName}>
                                                    {displayName}
                                                </MenuItem>
                                            );
                                        })}
                                    </Select>
                                </FormControl>
                            </Box>
                            <Typography variant="body2" gutterBottom sx={{ color: tableError ? 'error.main' : 'inherit' }}>
                                Select Table (capacity ≥ {guestCount}) <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                            </Typography>
                            {tableError && (
                                <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                                    {tableError}
                                </Typography>
                            )}
                            {loading ? (
                                <CircularProgress size={20} />
                            ) : (
                                <Grid container spacing={1}>
                                    {tables
                                        .filter((t) => (t.status === "available" || t._id === selectedTable?._id) && t.capacity >= guestCount)
                                        .map((table) => (
                                            <Grid item key={table._id}>
                                                <Chip
                                                    label={`${table.tableName || "Table " + table.tableNumber} (${table.capacity} ppl)`}
                                                    onClick={() => {
                                                        setSelectedTable(table);
                                                        setTableNumber(table.tableNumber);
                                                        setTableError('');
                                                    }}
                                                    color={selectedTable?._id === table._id ? "primary" : "default"}
                                                    variant={selectedTable?._id === table._id ? "filled" : "outlined"}
                                                    clickable
                                                />
                                            </Grid>
                                        ))}

                                    {tables.filter((t) => (t.status === "available" || t._id === selectedTable?._id) && t.capacity >= guestCount).length === 0 && (
                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                            No tables available for {guestCount} guests
                                        </Typography>
                                    )}
                                </Grid>

                            )}
                        </Box>
                    )}

                    {/* Delivery specific */}
                    {orderType === 'delivery' && (
                        <Box sx={{ mb: 2 }}>
                            <AddressAutocomplete
                                label="Delivery Address"
                                value={deliveryAddress.fullAddress || ''}
                                onChange={(val) => setDeliveryAddress({ ...deliveryAddress, fullAddress: val })}
                                onSelect={(addr) => setDeliveryAddress({
                                    ...deliveryAddress,
                                    ...addr,
                                    pincode: addr.zipCode
                                })}
                                apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                            />
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="City"
                                        size="small"
                                        fullWidth
                                        value={deliveryAddress.city || ''}
                                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Pincode"
                                        size="small"
                                        fullWidth
                                        value={deliveryAddress.pincode || ''}
                                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Landmark"
                                        size="small"
                                        fullWidth
                                        value={deliveryAddress.landmark || ''}
                                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, landmark: e.target.value })}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {/* GST / Discount (admin only) */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        {user?.role !== 'customer' && (
                            <>
                                <TextField
                                    label="GST %"
                                    type={isGstLocked ? "text" : "number"}
                                    size="small"
                                    value={gstPercent}
                                    onChange={(e) => !isGstLocked && setGstPercent(Number(e.target.value))}
                                    sx={{ width: '80px' }}
                                    InputProps={{
                                        readOnly: isGstLocked
                                    }}
                                />
                                <TextField
                                    label="Discount %"
                                    type="number"
                                    size="small"
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(Math.max(0, Number(e.target.value)))}
                                    sx={{ width: '100px' }}
                                    inputProps={{ min: 0 }}
                                />
                            </>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, flexGrow: 1, width: { xs: '100%', sm: 'auto' } }}>
                            <TextField
                                label="Coupon Code"
                                size="small"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                sx={{ flexGrow: 1 }}
                            />
                            <Button variant="outlined" onClick={() => handleValidateCoupon(false)} sx={{ whiteSpace: 'nowrap' }}>
                                Validate
                            </Button>
                        </Box>
                    </Box>

                    {/* Available coupons list */}
                    {availableCoupons.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Available Coupons
                            </Typography>
                            <List>
                                {availableCoupons.map((c) => (
                                    <ListItem
                                        key={c.code}
                                        divider
                                        sx={{
                                            px: 1,
                                            py: 1.5,
                                            flexDirection: { xs: 'column', sm: 'row' },
                                            alignItems: { xs: 'stretch', sm: 'center' },
                                            gap: 1
                                        }}
                                    >
                                        <ListItemText
                                            primary={`${c.code} - ${c.discountType === 'percentage' ? `${c.discountValue}%` : `$${c.discountValue}`}`}
                                            secondary={`Min Order: $${c.minBillAmount || 0} | Expires: ${c.validTo ? new Date(c.validTo).toLocaleDateString('en-US') : 'N/A'}`}
                                            sx={{ m: 0, flexGrow: 1 }}
                                        />
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => {
                                                setCouponCode(c.code);
                                                handleValidateCoupon(false);
                                            }}
                                            sx={{
                                                flexShrink: 0,
                                                width: 'auto',
                                                mt: { xs: 1, sm: 0 },
                                                alignSelf: { xs: 'center', sm: 'auto' }
                                            }}
                                        >
                                            Apply
                                        </Button>
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}
                </Box>
                {/* Search & category tabs */}
                <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                    <Box sx={{ position: 'relative', flexGrow: 1 }}>
                        <TextField
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    pointerEvents: 'none',
                                    color: 'text.disabled',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    height: '20px'
                                }}
                            >
                                <Typography variant="body2" sx={{ mr: 0.5 }}>Search for</Typography>
                                <Box sx={{ position: 'relative', height: '100%', minWidth: '100px' }}>
                                    <Typography
                                        key={placeholderIndex}
                                        variant="body2"
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            color: 'text.disabled',
                                            animation: 'dynamicTextSlide 3s ease-in-out forwards',
                                        }}
                                    >
                                        '{placeholderItems[placeholderIndex]}'
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>
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
            fontSize: { xs: '0.72rem', sm: '0.8rem', md: '0.875rem' },
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
                                                                    bgcolor: item.displayOption === 'todays_special' ? 'warning.main' : 'info.main',
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
                                                                {item.displayOption === 'todays_special' ? "Today's Special" : 'Weekly Special'}
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
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }} noWrap>{item.name}</Typography>
                                                                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>{formatSmartPrice(item.price)}</Typography>
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
                                                            bgcolor: item.displayOption === 'todays_special' ? 'warning.main' : 'info.main',
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
                                                        {item.displayOption === 'todays_special' ? "Today's Special" : 'Weekly Special'}
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
                                        <Typography variant="h6" color="text.primary" fontWeight="bold" gutterBottom>
                                            {searchQuery ? 'No results found' : 'Menu is empty'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 350, mb: 3 }}>
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
                    </Box>
                )}
            </Box>

            <Modal open={variantModalOpen} onClose={() => setVariantModalOpen(false)}>
                <Box sx={{
                    p: 0,
                    bgcolor: 'white',
                    width: { xs: '95%', sm: 550 },
                    mx: 'auto',
                    mt: { xs: 2, sm: 8 },
                    borderRadius: '32px',
                    maxHeight: '95vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                    position: 'relative',
                    border: 'none',
                    outline: 'none'
                }}>
                    {selectedItem && (
                        <>
                            {/* Header Section */}
                            <Box sx={{ p: 4, pb: 2, display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
                                <Box sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '50%',
                                    bgcolor: alpha('#4F46E5', 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mr: 2,
                                    flexShrink: 0
                                }}>
                                    <span style={{ fontSize: '20px' }}>🔥</span>
                                </Box>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography sx={{
                                        color: 'primary.main',
                                        fontWeight: 900,
                                        fontSize: '0.7rem',
                                        letterSpacing: '1px',
                                        textTransform: 'uppercase',
                                        mb: 0.5
                                    }}>
                                        Choose Spice Level
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 900, fontSize: '1.75rem', color: '#1a1a1a', lineHeight: 1.2, mb: 1 }}>
                                        {selectedItem.name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#757575', fontSize: '0.9rem' }}>
                                        Pick the heat you want before adding this dish to cart.
                                    </Typography>
                                </Box>
                                <IconButton
                                    onClick={() => setVariantModalOpen(false)}
                                    sx={{
                                        position: 'absolute',
                                        right: 24,
                                        top: 24,
                                        border: '1px solid #eee',
                                        '&:hover': { bgcolor: '#f5f5f5' }
                                    }}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Box>

                            <Box sx={{ px: 4, pb: 4 }}>
                                {/* Item Info Card */}
                                <Box sx={{
                                    bgcolor: alpha('#4F46E5', 0.05),
                                    borderRadius: '24px',
                                    p: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: 4
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
                                {((selectedItem.variants?.length || 0) > 0 || (selectedItem.modifierGroups?.length || 0) > 0) && (
                                    <Box sx={{ mb: 4 }}>
                                        <Divider sx={{ mb: 3, borderStyle: 'dashed' }} />
                                        {/* Render variants/modifiers logic here if needed, but the UI focuses on spice levels */}
                                    </Box>
                                )}

                                {/* Heat Preference Section */}
                                {(selectedItem as any).isSpiceLevelAvailable && (selectedItem as any).spiceLevels?.length > 0 && (
                                    <Paper variant="outlined" sx={{
                                        borderRadius: '24px',
                                        p: 3,
                                        borderColor: 'divider',
                                        bgcolor: 'background.paper',
                                        mb: 4
                                    }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <span style={{ fontSize: '16px' }}>🔥</span>
                                                <Typography sx={{ color: 'primary.main', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                                    HEAT PREFERENCE
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={tempSelectedSpiceLevel || (selectedItem as any).spiceLevels[0]}
                                                size="small"
                                                sx={{
                                                    bgcolor: alpha('#4F46E5', 0.1),
                                                    color: 'primary.main',
                                                    fontWeight: 900,
                                                    fontSize: '0.65rem',
                                                    height: 24
                                                }}
                                            />
                                        </Box>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
                                            Slide to the heat you want, and we'll send that choice to the kitchen.
                                        </Typography>

                                        <Box sx={{ px: 2, mb: 2 }}>
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
                                                    '& .MuiSlider-rail': { opacity: 1, bgcolor: alpha('#4F46E5', 0.1) },
                                                    '& .MuiSlider-thumb': {
                                                        height: 28,
                                                        width: 28,
                                                        bgcolor: 'primary.main',
                                                        border: '4px solid white',
                                                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)',
                                                        transition: 'none',
                                                        '&:hover, &.Mui-active': {
                                                            boxShadow: '0 0 0 8px rgba(79, 70, 229, 0.16)',
                                                        },
                                                        '&::after': {
                                                            content: '"🔥"',
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
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                                                {(selectedItem as any).spiceLevels.map((level: string, i: number) => {
                                                    const isSel = (tempSelectedSpiceLevel || (selectedItem as any).spiceLevels[0]) === level;
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
                                                                {level}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{
                                                                fontSize: '0.6rem',
                                                                color: isSel ? 'primary.main' : 'text.disabled',
                                                                opacity: isSel ? 1 : 0.6,
                                                                display: { xs: 'none', sm: 'block' }
                                                            }}>
                                                                {level.toLowerCase().includes('mild') ? 'light' :
                                                                    level.toLowerCase().includes('medium') ? 'Balanced' :
                                                                        level.toLowerCase().includes('hot') ? 'spicy' : 'very spicy'}
                                                            </Typography>
                                                        </Box>
                                                    );
                                                })}
                                            </Box>
                                        </Box>
                                    </Paper>
                                )}

                                {/* Footer Selection Display & Actions */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography sx={{ color: '#bfbfbf', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.5px' }}>
                                            SELECTED
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#1a1a1a' }}>
                                            {tempSelectedSpiceLevel || (selectedItem as any).spiceLevels?.[0] || 'None'}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Button
                                            variant="outlined"
                                            onClick={() => setVariantModalOpen(false)}
                                            sx={{
                                                borderRadius: '50px',
                                                px: 4,
                                                py: 1.5,
                                                borderColor: 'primary.light',
                                                color: 'primary.main',
                                                fontWeight: 900,
                                                textTransform: 'none',
                                                '&:hover': { borderColor: 'primary.main', bgcolor: alpha('#4F46E5', 0.04) }
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            onClick={handleAddToCartFromModal}
                                            sx={{
                                                borderRadius: '50px',
                                                px: 4,
                                                py: 1.5,
                                                bgcolor: 'primary.main',
                                                color: 'white',
                                                fontWeight: 900,
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
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6">Current Order</Typography>
                    {/* <Typography variant="body2" color="text.secondary">
                        Order #{Math.floor(Math.random() * 10000)}
                    </Typography> */}
                </Box>
                <List sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    pr: 1,
                    '&::-webkit-scrollbar': {
                        width: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                        backgroundColor: 'rgba(0,0,0,0.02)',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        borderRadius: '10px',
                    },
                }}>
                    {cart.map((item) => (
                        <ListItem key={item._id} divider>
                            <ListItemText
                                primary={item.name}
                                secondary={
                                    <>
                                        {formatSmartPrice(item.price)}
                                        {item.modifiers && item.modifiers.length > 0 && (
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                {item.modifiers.map((m: any) => m.name).join(', ')}
                                            </Typography>
                                        )}
                                    </>
                                }
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconButton size="small" onClick={() => updateQuantity(item.cartId, -1)}>
                                    <RemoveIcon fontSize="small" />
                                </IconButton>
                                <Typography>{item.quantity}</Typography>
                                <IconButton size="small" onClick={() => updateQuantity(item.cartId, +1)}>
                                    <AddIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => removeFromCart(item.cartId)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        </ListItem>
                    ))}
                    {cart.length === 0 && (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <CartIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                            <Typography color="text.secondary">Cart is empty</Typography>
                        </Box>
                    )}
                </List>
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>Subtotal</Typography>
                        <Typography>{formatSmartPrice(cartTotal)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography>Discount ({discountPercent}%)</Typography>
                        <Typography>{formatSmartPrice(discountAmount)}</Typography>
                    </Box>
                    {couponDiscount > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, color: 'success.main' }}>
                            <Typography>Coupon Discount</Typography>
                            <Typography>-{formatSmartPrice(couponDiscount)}</Typography>
                        </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography>Sales Tax ({gstPercent}%)</Typography>
                        <Typography>{formatSmartPrice(taxAmount)}</Typography>
                    </Box>
                    {serviceChargeAmount > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography>Service Charge (18%)</Typography>
                            <Typography>{formatSmartPrice(serviceChargeAmount)}</Typography>
                        </Box>
                    )}
                    {Number(tip) > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography>Tip</Typography>
                            <Typography>{formatSmartPrice(Number(tip))}</Typography>
                        </Box>
                    )}
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6">Total</Typography>
                        <Typography variant="h6" color="primary.main">
                            {formatSmartPrice(finalTotal)}
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        disabled={cart.length === 0 || placingOrder}
                        startIcon={<CartIcon />}
                        onClick={handlePlaceOrder}
                    >
                        {placingOrder ? 'Placing...' : 'Place Order'}
                    </Button>
                </Box>
            </Paper>

            {/* Payment modal */}
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
                        Payment via {paymentMethod === 'zelle' ? 'Zelle' : 'Venmo'}
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
        </Box>
    );
};

export default POSPage;
