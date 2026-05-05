import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Container,
    Grid,
    Paper,
    TextField,
    Typography,
    Card,
    CardContent,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Divider,
    Stack,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    TablePagination,
    Autocomplete,
    FormHelperText,
    InputAdornment,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Add, Remove, Delete, ShoppingCart, Close, LocalDining, Edit, Visibility, VisibilityOff, Chat, Person, CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import { menuAPI, cateringAPI, traysAPI, authAPI, settingsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import PhoneInput from '../../components/PhoneInput';
import { isWithinDeliveryRadius, METERS_PER_MILE } from '../../services/googleMapsService';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { formatSpiceLevelLabel } from '../../utils/spiceLevel';

interface CartItem {
    menuItem: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    tray?: string;
    trayName?: string;
    taxRate?: number | null;
    spiceLevel?: string;
    isCustom?: boolean;
}

const SPICE_LEVELS = [
    { id: 'mild', label: 'Mild' },
    { id: 'moderate', label: 'Moderate' },
    { id: 'more_spicy', label: 'More Spicy' }
];

interface CateringFormData {
    customerName: string;
    customerPhone: string;
    customerDialCode: string;
    customerEmail: string;
    occasion: string;
    occasionDate: string;
    occasionPersonName?: string;
    requiredDate: string;
    serviceType: string;
    address: string;
    city: string;
    state: string;
    county: string;
    country: string;
    zipCode: string;
    latitude: string;
    longitude: string;
    googleMapsLink: string;
    processingPerson: string;
    additionalServices?: string;
}

const CateringPage = () => {
    const navigate = useNavigate();
    const { slug: routeSlug } = useParams<{ slug: string }>();
    const { user, tenantSlug, login } = useAuth();
    const { formatCurrency, settings, refreshSettings } = useSettings();
    const currentSlug = routeSlug || tenantSlug || '';
    const headingFontSize = { xs: '1rem', sm: '1.2rem' };
    const bodyFontSize = { xs: '0.8rem', sm: '0.95rem' };
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [trays, setTrays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<CartItem[]>([]);

    // Tabs state
    const [activeTab, setActiveTab] = useState<number>(0);
    const [myOrders, setMyOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Guest counts
    const [guests, setGuests] = useState({
        adults: { veg: 0, nonVeg: 0 },
        kids: { veg: 0, nonVeg: 0 },
    });

    // Tray selection dialog state
    const [trayDialogOpen, setTrayDialogOpen] = useState(false);
    const [trayDialogItem, setTrayDialogItem] = useState<any>(null);
    const [traySelections, setTraySelections] = useState<Record<string, number>>({});
    const [selectedSpice, setSelectedSpice] = useState<string>('mild');

    // Edit mode state
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

    const [formData, setFormData] = useState<CateringFormData>({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        customerDialCode: settings?.restaurant?.dialCode || '1',
        occasion: '',
        requiredDate: '',
        serviceType: 'takeaway',
        address: '',
        city: '',
        state: '',
        county: '',
        country: '',
        zipCode: '',
        latitude: '',
        longitude: '',
        googleMapsLink: '',
        processingPerson: 'Online Order',
        occasionDate: '',
        occasionPersonName: '',
        additionalServices: '',
    });
    const [occasionInputValue, setOccasionInputValue] = useState('');
    const [addCustomOccasionOpen, setAddCustomOccasionOpen] = useState(false);
    const [customOccasion, setCustomOccasion] = useState('');
    
    // Custom item state
    const [customItemName, setCustomItemName] = useState('');
    const [customItemQty, setCustomItemQty] = useState<number>(1);
    
    // Check if the occasion is a celebratory one that needs a person's name
    const isCelebratoryOccasion = [
        'birthday', 'wedding', 'anniversary', 'engagement', 'baby shower'
    ].some(keyword => formData.occasion?.toLowerCase().includes(keyword));

    const [occasionsList, setOccasionsList] = useState<string[]>((settings?.restaurant?.occasions || [
        "Birthday Party",
        "Sweet Sixteen Party",
        "Graduation Party",
        "Wedding Reception",
        "Wedding Anniversary",
        "Engagement Party",
        "Baby Shower",
        "Business Meeting"
    ]).filter(o => o !== 'Others' && o !== 'Other'));

    useEffect(() => {
        if (settings?.restaurant?.occasions) {
            setOccasionsList(settings.restaurant.occasions.filter(o => o !== 'Others' && o !== 'Other'));
        }
    }, [settings?.restaurant?.occasions]);

    const handleAddCustomOccasion = async () => {
        if (customOccasion.trim()) {
            const newOcc = customOccasion.trim();
            let updatedList = occasionsList;
            if (!occasionsList.includes(newOcc)) {
                updatedList = [...occasionsList, newOcc];
                setOccasionsList(updatedList);

                try {
                    // Try to persist if possible, otherwise just use locally
                    if (settingsAPI && settings?.restaurant) {
                        await settingsAPI.update('restaurant', {
                            ...settings.restaurant,
                            occasions: updatedList
                        });
                        if (refreshSettings) await refreshSettings();
                    }
                } catch (error) {
                    console.error('Failed to save custom occasion:', error);
                }
            }
            setFormData({ ...formData, occasion: newOcc });
            setCustomOccasion('');
            setAddCustomOccasionOpen(false);
        }
    };

    const [formSubmitted, setFormSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [checkingDistance, setCheckingDistance] = useState(false);

    // Inline login dialog for guests
    const [loginDialogOpen, setLoginDialogOpen] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginShowPwd, setLoginShowPwd] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginDialogMode, setLoginDialogMode] = useState<'login' | 'register'>('login');
    const [regData, setRegData] = useState({ firstName: '', lastName: '', phone: '' });

    const handleInlineLogin = async () => {
        if (!loginEmail || !loginPassword) {
            toast.error('Please enter email and password');
            return;
        }
        setLoginLoading(true);
        try {
            const res = await login({ email: loginEmail, password: loginPassword, tenantSlug: currentSlug });
            if (res.success) {
                toast.success('Login successful!');
                setLoginDialogOpen(false);
            } else {
                toast.error(res.error || 'Login failed');
            }
        } catch (err: any) {
            toast.error('Login failed. Please check your credentials.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleInlineRegister = async () => {
        if (!regData.firstName || !regData.lastName || !loginEmail || !loginPassword) {
            toast.error('Please fill in all required fields');
            return;
        }
        setLoginLoading(true);
        try {
            const regRes = await authAPI.customerRegister({
                ...regData,
                email: loginEmail,
                password: loginPassword,
                tenantSlug: currentSlug
            });

            if (regRes.status === 201) {
                toast.success('Registration successful!');
                const res = await login({ email: loginEmail, password: loginPassword, tenantSlug: currentSlug });
                if (res.success) {
                    setLoginDialogOpen(false);
                } else {
                    setLoginDialogMode('login');
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoginLoading(false);
        }
    };

    // Auto-fill user info
    useEffect(() => {
        if (user && !editingOrderId) {
            setFormData(prev => ({
                ...prev,
                customerName: prev.customerName || (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()),
                customerEmail: prev.customerEmail || user.email || '',
                customerPhone: prev.customerPhone || user.phone || '',
                customerDialCode: prev.customerDialCode || (user as any).dialCode || settings?.restaurant?.dialCode || '1',
            }));
        }
    }, [user, editingOrderId, settings?.restaurant?.dialCode]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const menuRes = user
                    ? await menuAPI.getAll()
                    : await menuAPI.getPublicMenu(currentSlug);

                const items = Array.isArray(menuRes.data) ? menuRes.data : (menuRes.data?.items || []);
                setMenuItems(items);

                if (user) {
                    const traysRes = await traysAPI.getAll();
                    setTrays(traysRes.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                toast.error('Failed to load menu');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, currentSlug]);

    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewOrder, setViewOrder] = useState<any>(null);

    useEffect(() => {
        if (activeTab === 1 && user) {
            setLoadingOrders(true);
            cateringAPI.getAll()
                .then(res => setMyOrders(res.data?.orders || []))
                .catch(err => toast.error('Failed to load orders'))
                .finally(() => setLoadingOrders(false));
        }
    }, [activeTab, user]);

    // Auto-fill City/State when Zip Code is entered
    useEffect(() => {
        const zipCode = formData.zipCode;
        if ((zipCode.length === 4 || zipCode.length === 5) && !formData.city && !formData.state) {
            const timer = setTimeout(async () => {
                try {
                    if (!(window as any).google) return;
                    const geocoder = new (window as any).google.maps.Geocoder();
                    geocoder.geocode({ address: zipCode }, (results: any, status: string) => {
                        if (status === 'OK' && results[0]) {
                            const components = results[0].address_components;
                            let city = '';
                            let state = '';
                            components.forEach((c: any) => {
                                if (c.types.includes('locality')) city = c.long_name;
                                if (c.types.includes('administrative_area_level_1')) state = c.short_name;
                            });
                            if (city || state) {
                                setFormData(prev => ({
                                    ...prev,
                                    city: prev.city || city,
                                    state: prev.state || state
                                }));
                            }
                        }
                    });
                } catch (error) {
                    console.warn('Zip lookup failed:', error);
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [formData.zipCode]);

    const handleOpenAddItem = (item: any) => {
        const hasTrays = item.isCateringAvailable && item.trayOptions?.length > 0;
        const hasSpice = item.isSpiceLevelAvailable;

        if (hasTrays || hasSpice) {
            setTrayDialogItem(item);
            const init: Record<string, number> = { '__item__': hasTrays ? 0 : 1 };
            if (hasTrays) {
                item.trayOptions.forEach((opt: any) => {
                    const id = opt.tray?._id || opt.tray || '';
                    if (id) init[id] = 0;
                });
            }
            setTraySelections(init);
            setSelectedSpice(item.spiceLevels && item.spiceLevels.length > 0 ? item.spiceLevels[0] : 'mild');
            setTrayDialogOpen(true);
        } else {
            addToCartDirect(item._id, item.name, 1, item.price, undefined, undefined, item.taxRate);
        }
    };

    const addToCartDirect = (menuItemId: string, name: string, qty: number, unitPrice: number, trayId?: string, trayName?: string, taxRate?: number | null, spiceLevel?: string) => {
        const key = trayId ? `${menuItemId}_${trayId}_${spiceLevel || ''}` : `${menuItemId}_${spiceLevel || ''}`;
        setCart(prev => {
            const existing = prev.find(i => {
                const k = i.tray ? `${i.menuItem}_${i.tray}_${i.spiceLevel || ''}` : `${i.menuItem}_${i.spiceLevel || ''}`;
                return k === key;
            });
            if (existing) {
                return prev.map(i => {
                    const k = i.tray ? `${i.menuItem}_${i.tray}_${i.spiceLevel || ''}` : `${i.menuItem}_${i.spiceLevel || ''}`;
                    if (k === key) return { ...i, quantity: i.quantity + qty, total: (i.quantity + qty) * i.unitPrice };
                    return i;
                });
            }
            return [...prev, {
                menuItem: menuItemId,
                name: trayName ? `${name} [${trayName}]` : name,
                quantity: qty,
                unitPrice,
                total: unitPrice * qty,
                tray: trayId,
                trayName,
                taxRate,
                spiceLevel: spiceLevel && spiceLevel !== 'none' ? spiceLevel : undefined,
            }];
        });
    };

    const handleConfirmTraySelection = () => {
        if (!trayDialogItem) return;
        const anySelected = Object.values(traySelections).some(q => q > 0);
        if (!anySelected) {
            toast.error('Please select at least one option quantity');
            return;
        }
        const baseQty = traySelections['__item__'] || 0;
        const spiceToUse = trayDialogItem.isSpiceLevelAvailable ? selectedSpice : undefined;
        if (baseQty > 0) {
            addToCartDirect(trayDialogItem._id, trayDialogItem.name, baseQty, trayDialogItem.price || 0, undefined, undefined, trayDialogItem.taxRate, spiceToUse);
        }
        trayDialogItem.trayOptions.forEach((opt: any) => {
            const trayId = opt.tray?._id || opt.tray || '';
            const qty = traySelections[trayId] || 0;
            if (qty > 0) {
                const trayData = trays.find((t: any) => t._id === trayId) || (typeof opt.tray === 'object' ? opt.tray : null);
                addToCartDirect(trayDialogItem._id, trayDialogItem.name, qty, opt.price || trayDialogItem.price || 0, trayId, trayData?.name || 'Tray', trayDialogItem.taxRate, spiceToUse);
            }
        });
        setTrayDialogOpen(false);
        setTrayDialogItem(null);
        setTraySelections({});
        setSelectedSpice('mild');
    };

    const handleAddCustomItem = () => {
        if (!customItemName.trim()) {
            toast.error('Please enter a custom item name');
            return;
        }
        if (customItemQty < 1) {
            toast.error('Quantity must be at least 1');
            return;
        }
        
        setCart(prev => [...prev, {
            menuItem: '', // empty for custom item
            name: customItemName.trim(),
            quantity: customItemQty,
            unitPrice: 0,
            total: 0,
            isCustom: true
        }]);
        setCustomItemName('');
        setCustomItemQty(1);
        toast.success('Custom item added. Admin will quote a price later.');
    };

    const updateQuantity = (cartKey: string, change: number) => {
        setCart(prev =>
            prev.map(item => {
                const k = item.tray ? `${item.menuItem}_${item.tray}_${item.spiceLevel || ''}` : `${item.menuItem}_${item.spiceLevel || ''}`;
                if (k === cartKey) {
                    const newQty = Math.max(0, item.quantity + change);
                    if (newQty === 0) return null;
                    return { ...item, quantity: newQty, total: newQty * item.unitPrice };
                }
                return item;
            }).filter(Boolean) as CartItem[]
        );
    };

    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const defaultTaxRate = settings.restaurant?.taxRate || 0;
    const taxAmount = cart.reduce((sum, item) => {
        const itemTaxRate = (item.taxRate !== undefined && item.taxRate !== null) ? item.taxRate : defaultTaxRate;
        return sum + (item.total * itemTaxRate / 100);
    }, 0);
    const totalAmount = subtotal + taxAmount;

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isDelivery = formData.serviceType === 'delivery' || formData.serviceType === 'delivery_service';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        if (cart.length === 0) {
            toast.error('Please select items for your order');
            return;
        }

        if (!user) {
            setLoginDialogOpen(true);
            return;
        }

        setFormSubmitted(true);
        if (!formData.customerName.trim()) { toast.error('Full name is required'); return; }
        if (formData.customerPhone.length !== 10) { toast.error('10-digit phone number is required'); return; }
        if (!formData.customerEmail.trim() || !validateEmail(formData.customerEmail)) { toast.error('Valid email is required'); return; }
        if (!formData.occasion) { toast.error('Occasion is required'); return; }
        if (!formData.occasionDate) { toast.error('Occasion date is required'); return; }
        if (!formData.requiredDate || new Date(formData.requiredDate) < new Date()) { toast.error('Valid date and time is required'); return; }

        if (isDelivery) {
            if (!formData.address.trim() || !formData.city.trim() || !formData.state.trim() || !formData.zipCode.trim()) {
                toast.error('Complete delivery address is required');
                return;
            }
            if (settings?.restaurant?.address) {
                try {
                    setCheckingDistance(true);
                    const maxRadiusMeters = (settings.restaurant.deliveryRadius || 15) * METERS_PER_MILE;
                    const result = await isWithinDeliveryRadius(settings.restaurant.address, formData.address, maxRadiusMeters);
                    if (!result.isWithin) {
                        toast.error(`Sorry, we only deliver within ${settings.restaurant.deliveryRadius || 15} miles.`);
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

        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                orderType: formData.serviceType === 'takeaway' ? 'online_takeaway' : formData.serviceType,
                items: cart,
                subtotal,
                tax: { rate: defaultTaxRate, amount: taxAmount },
                totalAmount,
                guests,
                source: 'website',
                location: {
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    county: formData.county,
                    country: formData.country,
                    zipCode: formData.zipCode,
                    latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
                    longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
                    googleMapsLink: formData.googleMapsLink,
                },
            };

            await cateringAPI.create(payload);
            toast.success('Catering order submitted successfully!');
            setCart([]);
            setGuests({ adults: { veg: 0, nonVeg: 0 }, kids: { veg: 0, nonVeg: 0 } });
            setFormData({
                customerName: user?.name || '',
                customerPhone: user?.phone || '',
                customerEmail: user?.email || '',
                customerDialCode: (user as any)?.dialCode || settings?.restaurant?.dialCode || '1',
                occasion: '',
                requiredDate: '',
                serviceType: 'takeaway',
                address: '', city: '', state: '', county: '', country: '', zipCode: '', latitude: '', longitude: '', googleMapsLink: '',
                processingPerson: 'Online Order', occasionDate: '', occasionPersonName: '',
                additionalServices: '',
            });
            setFormSubmitted(false);
        } catch (error) {
            toast.error('Failed to submit order');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" flexDirection="column" gap={2}>
            <CircularProgress size={40} />
            <Typography color="text.secondary" sx={{ fontSize: bodyFontSize }}>Loading catering menu...</Typography>
        </Box>
    );

    return (
        <Container
            maxWidth="lg"
            sx={{
                py: { xs: 1.5, md: 4 },
                px: { xs: 1.5, sm: 3 },
                background: { xs: 'linear-gradient(180deg, #f8f9ff 0%, #f5f6fa 100%)', sm: 'transparent' },
                borderRadius: { xs: 3, sm: 0 },
            }}
        >
            {/* Hero Banner */}
            <Box sx={{
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 45%, #fde68a 100%)',
                borderRadius: 4,
                p: { xs: 1.5, sm: 3, md: 5 },
                mb: { xs: 2, sm: 4 },
                position: 'relative',
                overflow: 'hidden',
                color: '#312e2b',
                border: '1px solid rgba(251, 191, 36, 0.28)',
                boxShadow: '0 14px 36px rgba(180, 83, 9, 0.12)',
            }}>
                <Box
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        position: 'absolute',
                        top: -40,
                        right: -40,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        bgcolor: 'rgba(251, 191, 36, 0.18)'
                    }}
                />
                <Box display="flex" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1.25} mb={1} sx={{ flexDirection: { xs: 'column', sm: 'row' }, position: 'relative', zIndex: 1 }}>
                    <LocalDining sx={{ fontSize: { xs: 22, sm: 32 }, color: '#c2410c' }} />
                    <Typography variant="h4" fontWeight={800} sx={{ fontSize: headingFontSize, lineHeight: 1.25 }}>
                        Catering & Bulk Orders
                    </Typography>
                </Box>
                <Typography sx={{ color: 'rgba(68, 64, 60, 0.88)', fontSize: bodyFontSize, lineHeight: 1.45, maxWidth: { xs: '100%', md: '80%' }, position: 'relative', zIndex: 1 }}>
                    Plan your next event with our delicious menu. Professional catering for any size.
                </Typography>
            </Box>

            {user && (
                <Tabs
                    value={activeTab}
                    onChange={(e, val) => setActiveTab(val)}
                    sx={{
                        mb: { xs: 1.5, md: 4 },
                        bgcolor: 'background.paper',
                        borderRadius: 2.5,
                        px: 0.5,
                        boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
                        '& .MuiTabs-indicator': { height: 3, borderRadius: 3 },
                        '& .MuiTab-root': {
                            minHeight: { xs: 40, sm: 44 },
                            py: { xs: 0.75, sm: 1 },
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: bodyFontSize,
                            color: 'text.secondary',
                            borderRadius: 2,
                        },
                        '& .Mui-selected': { color: 'primary.main' },
                    }}
                >
                    <Tab label="✨ New Order" />
                    <Tab label="📋 My Orders" />
                </Tabs>
            )}

            {activeTab === 0 && (
                <Grid container spacing={{ xs: 2, sm: 4 }}>
                    {/* Menu Items */}
                    <Grid item xs={12} md={7}>
                        <Typography
                            variant="h5"
                            fontWeight={800}
                            mb={{ xs: 1, sm: 2.5 }}
                            sx={{ fontSize: headingFontSize, textAlign: { xs: 'center', sm: 'left' }, lineHeight: { xs: 1.25, sm: 1.3 } }}
                        >
                            Select Items
                        </Typography>
                        <Grid container spacing={{ xs: 1, sm: 2 }}>
                            {menuItems.filter(item => item.isCateringAvailable).map((item) => {
                                const qty = cart.filter(i => i.menuItem === item._id).reduce((sum, i) => sum + i.quantity, 0);
                                return (
                                    <Grid item xs={12} sm={6} key={item._id}>
                                        <Card
                                            sx={{
                                                borderRadius: { xs: 2.5, sm: 4 },
                                                border: qty > 0 ? '2px solid' : '1px solid',
                                                borderColor: qty > 0 ? 'primary.main' : 'rgba(0,0,0,0.06)',
                                                bgcolor: qty > 0 ? alpha('#4F46E5', 0.03) : 'background.paper',
                                                boxShadow: qty > 0 ? '0 10px 24px rgba(79,70,229,0.16)' : '0 6px 18px rgba(0,0,0,0.06)',
                                            }}
                                        >
                                            <CardContent sx={{ p: { xs: 1, sm: 2.25 }, '&:last-child': { pb: { xs: 1, sm: 2.25 } } }}>
                                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={{ xs: 0.35, sm: 1 }}>
                                                    <Typography
                                                        variant="subtitle1"
                                                        fontWeight={800}
                                                        sx={{
                                                            letterSpacing: 0.2,
                                                            fontSize: headingFontSize,
                                                            lineHeight: { xs: 1.2, sm: 1.43 },
                                                        }}
                                                    >
                                                        {item.name}
                                                    </Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" gap={{ xs: 0.75, sm: 1 }}>
                                                    <Typography
                                                        variant="h6"
                                                        color="text.primary"
                                                        fontWeight={900}
                                                        sx={{ fontSize: headingFontSize, lineHeight: 1.2 }}
                                                    >
                                                        {formatCurrency(item.price)}
                                                    </Typography>
                                                    {qty === 0 ? (
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            onClick={() => handleOpenAddItem(item)}
                                                            startIcon={<Add sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' } }} />}
                                                            sx={{
                                                                borderRadius: 999,
                                                                fontWeight: 800,
                                                                textTransform: 'none',
                                                                px: { xs: 1.25, sm: 2 },
                                                                py: { xs: 0.35, sm: 0.5 },
                                                                minHeight: { xs: 28, sm: undefined },
                                                                fontSize: bodyFontSize,
                                                                boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                                                                '& .MuiButton-startIcon': { mr: { xs: 0.35, sm: 1 } },
                                                            }}
                                                        >
                                                            Add
                                                        </Button>
                                                    ) : (
                                                        <Box
                                                            display="flex"
                                                            alignItems="center"
                                                            gap={0.5}
                                                            sx={{
                                                                bgcolor: 'primary.main',
                                                                borderRadius: 999,
                                                                px: { xs: 0.35, sm: 0.5 },
                                                                py: { xs: 0.15, sm: 0.25 },
                                                                boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                                                            }}
                                                        >
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    const cartItem = cart.find(i => i.menuItem === item._id);
                                                                    if (cartItem) {
                                                                        const k = cartItem.tray ? `${cartItem.menuItem}_${cartItem.tray}_${cartItem.spiceLevel || ''}` : `${cartItem.menuItem}_${cartItem.spiceLevel || ''}`;
                                                                        updateQuantity(k, -1);
                                                                    }
                                                                }}
                                                                sx={{ color: 'white', p: { xs: 0.35, sm: 0.5 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                                                            >
                                                                <Remove sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                                                            </IconButton>
                                                            <Typography variant="body2" fontWeight={800} sx={{ color: 'white', minWidth: 18, textAlign: 'center', fontSize: bodyFontSize }}>
                                                                {qty}
                                                            </Typography>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleOpenAddItem(item)}
                                                                sx={{ color: 'white', p: { xs: 0.35, sm: 0.5 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                                                            >
                                                                <Add sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                                                            </IconButton>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>

                        {/* Custom Item Section */}
                        <Box mt={{ xs: 2, sm: 4 }}>
                            <Typography variant="h6" fontWeight={700} mb={{ xs: 1, sm: 2 }} sx={{ fontSize: headingFontSize }}>
                                Need something else?
                            </Typography>
                            <Card sx={{ borderRadius: 3, border: '1px dashed', borderColor: 'primary.main', bgcolor: alpha('#4F46E5', 0.02) }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="body2" color="text.secondary" mb={2} sx={{ fontSize: bodyFontSize }}>
                                        Don't see what you're looking for? Add a custom item and our admin will provide a quote.
                                    </Typography>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} sm={6}>
                                            <TextField 
                                                label="Custom Item Name / Description" 
                                                fullWidth 
                                                size="small"
                                                value={customItemName}
                                                onChange={e => setCustomItemName(e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={3}>
                                            <TextField 
                                                label="Quantity" 
                                                type="number"
                                                fullWidth 
                                                size="small"
                                                value={customItemQty}
                                                onChange={e => setCustomItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                inputProps={{ min: 1 }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={3}>
                                            <Button 
                                                variant="outlined" 
                                                fullWidth 
                                                onClick={handleAddCustomItem}
                                                startIcon={<Add />}
                                            >
                                                Add Request
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Box>
                    </Grid>

                    {/* Order Summary Form */}
                    <Grid item xs={12} md={5}>
                        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, position: 'sticky', top: 20, mx: 'auto' }}>
                            <Typography variant="h6" fontWeight={700} mb={3} sx={{ textAlign: { xs: 'center', sm: 'left' }, fontSize: headingFontSize }}>
                                Order Details
                            </Typography>
                            <form onSubmit={handleSubmit}>
                                <Stack
                                    spacing={2.5}
                                    sx={{
                                        alignItems: { xs: 'center', sm: 'stretch' },
                                        '& > *': { width: '100%' },
                                    }}
                                >
                                    <TextField label="Full Name" fullWidth required value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} InputLabelProps={{ sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} />
                                    <TextField label="Phone Number" fullWidth required value={formData.customerPhone} onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} InputLabelProps={{ sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} />
                                    <TextField label="Email" fullWidth value={formData.customerEmail} onChange={e => setFormData({ ...formData, customerEmail: e.target.value })} />

                                    <Grid
                                        container
                                        spacing={2}
                                        sx={{
                                            width: '100%',
                                            m: 0,
                                            '& > .MuiGrid-item': { pl: { xs: 0, sm: 2 } },
                                        }}
                                    >
                                        <Grid item xs={12} sm={6}>
                                            <TextField select fullWidth required label="Service Type" value={formData.serviceType} onChange={e => setFormData({ ...formData, serviceType: e.target.value })} InputLabelProps={{ sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }}>
                                                <MenuItem value="takeaway">Online Takeaway</MenuItem>
                                                <MenuItem value="delivery">Delivery</MenuItem>
                                                <MenuItem value="delivery_service">Delivery & Service</MenuItem>
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                                <Autocomplete
                                                    freeSolo
                                                    fullWidth
                                                    options={occasionsList}
                                                    value={formData.occasion || ''}
                                                    inputValue={occasionInputValue}
                                                    onInputChange={(e, newValue) => setOccasionInputValue(newValue)}
                                                    onChange={(e, newValue) => {
                                                        setFormData({ ...formData, occasion: newValue || '' });
                                                    }}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Occasion"
                                                            required
                                                            InputLabelProps={{
                                                                ...params.InputLabelProps,
                                                                sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } }
                                                            }}
                                                            sx={{
                                                                '& .MuiOutlinedInput-root': {
                                                                    borderTopRightRadius: 0,
                                                                    borderBottomRightRadius: 0
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                />
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={() => setAddCustomOccasionOpen(true)}
                                                    sx={{
                                                        minWidth: 40,
                                                        height: 56,
                                                        borderTopLeftRadius: 0,
                                                        borderBottomLeftRadius: 0,
                                                        boxShadow: 'none',
                                                        px: 0,
                                                        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'
                                                    }}
                                                >
                                                    <Add />
                                                </Button>
                                            </Box>
                                        </Grid>
                                    </Grid>

                                    <Grid
                                        container
                                        spacing={2}
                                        sx={{
                                            width: '100%',
                                            m: 0,
                                            '& > .MuiGrid-item': { pl: { xs: 0, sm: 2 } },
                                        }}
                                    >
                                        <Grid item xs={12} sm={6}>
                                            <TextField label="Occasion Date" type="date" fullWidth required value={formData.occasionDate} onChange={e => setFormData({ ...formData, occasionDate: e.target.value })} InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} inputProps={{ min: new Date().toISOString().split('T')[0] }} />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField label=" Delivery Date & Time" type="datetime-local" fullWidth required value={formData.requiredDate} onChange={e => setFormData({ ...formData, requiredDate: e.target.value })} InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }} inputProps={{ min: new Date().toISOString().slice(0, 16) }} />
                                        </Grid>
                                        {isCelebratoryOccasion && (
                                            <Grid item xs={12}>
                                                <TextField label="Occasion For (Person Name)" fullWidth value={formData.occasionPersonName} onChange={e => setFormData({ ...formData, occasionPersonName: e.target.value })} />
                                            </Grid>
                                        )}
                                    </Grid>

                                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: alpha('#4F46E5', 0.02), width: '100%' }}>
                                        <Typography variant="subtitle2" fontWeight={700} color="primary.main" mb={2} sx={{ fontSize: headingFontSize }}>Guest Counts</Typography>
                                        <Grid container spacing={3}>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 1, fontSize: bodyFontSize }}>Adults</Typography>
                                                <Box display="flex" gap={1}>
                                                    <TextField label="Veg" size="small" type="number" value={guests.adults.veg} onChange={e => setGuests({ ...guests, adults: { ...guests.adults, veg: Math.max(0, parseInt(e.target.value) || 0) } })} inputProps={{ min: 0 }} />
                                                    <TextField label="Non-Veg" size="small" type="number" value={guests.adults.nonVeg} onChange={e => setGuests({ ...guests, adults: { ...guests.adults, nonVeg: Math.max(0, parseInt(e.target.value) || 0) } })} inputProps={{ min: 0 }} />
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 1, fontSize: bodyFontSize }}>Kids</Typography>
                                                <Box display="flex" gap={1}>
                                                    <TextField label="Veg" size="small" type="number" value={guests.kids.veg} onChange={e => setGuests({ ...guests, kids: { ...guests.kids, veg: Math.max(0, parseInt(e.target.value) || 0) } })} inputProps={{ min: 0 }} />
                                                    <TextField label="Non-Veg" size="small" type="number" value={guests.kids.nonVeg} onChange={e => setGuests({ ...guests, kids: { ...guests.kids, nonVeg: Math.max(0, parseInt(e.target.value) || 0) } })} inputProps={{ min: 0 }} />
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </Box>

                                    {isDelivery && (
                                        <AddressAutocomplete
                                            label="Event Address"
                                            value={formData.address}
                                            onChange={val => setFormData(prev => ({ ...prev, address: val }))}
                                            onSelect={addr => setFormData(prev => ({
                                                ...prev, address: addr.fullAddress, city: addr.city, state: addr.state, country: addr.country, zipCode: addr.zipCode
                                            }))}
                                            apiKey={settings.system.googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                                        />
                                    )}



                                    <TextField label="Special Instructions / Additional Services" multiline rows={2} fullWidth value={formData.additionalServices} onChange={e => setFormData({ ...formData, additionalServices: e.target.value })} />

                                    <Divider />
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700} mb={1} sx={{ fontSize: headingFontSize }}>Cart Summary</Typography>
                                        {cart.length === 0 ? (
                                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: bodyFontSize }}>Your cart is empty</Typography>
                                        ) : (
                                            <List dense>
                                                {cart.map((item, idx) => {
                                                    const cartKey = item.tray ? `${item.menuItem}_${item.tray}_${item.spiceLevel || ''}` : `${item.menuItem}_${item.spiceLevel || ''}`;
                                                    return (
                                                        <ListItem key={idx} secondaryAction={
                                                            <IconButton edge="end" size="small" color="error" onClick={() => updateQuantity(cartKey, -999)}>
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        }>
                                                            <ListItemText
                                                                primary={
                                                                    <Box display="flex" alignItems="center" gap={1}>
                                                                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: bodyFontSize }}>{item.name}</Typography>
                                                                        {item.spiceLevel && (
                                                                            <Chip
                                                                                label={item.spiceLevel}
                                                                                size="small"
                                                                                sx={{
                                                                                    height: 18,
                                                                                    fontSize: '0.6rem',
                                                                                    bgcolor: alpha('#e65100', 0.1),
                                                                                    color: '#e65100',
                                                                                    border: '1px solid currentColor',
                                                                                    textTransform: 'uppercase'
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </Box>
                                                                }
                                                                secondary={
                                                                    item.isCustom 
                                                                    ? `${item.quantity} x (Price TBD by Admin)` 
                                                                    : `${item.quantity} x ${formatCurrency(item.unitPrice)}`
                                                                }
                                                            />
                                                        </ListItem>
                                                    );
                                                })}
                                            </List>
                                        )}
                                    </Box>

                                    <Box sx={{ p: 2, bgcolor: alpha('#4F46E5', 0.05), borderRadius: 2 }}>
                                        <Box display="flex" justifyContent="space-between" mb={1}>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: bodyFontSize }}>Subtotal</Typography>
                                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: bodyFontSize }}>{formatCurrency(subtotal)}</Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between" mb={1}>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: bodyFontSize }}>
                                                Tax {taxAmount > 0 && `(${(taxAmount / subtotal * 100).toFixed(1)}%)`}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700} color={taxAmount > 0 ? 'warning.dark' : 'text.secondary'} sx={{ fontSize: bodyFontSize }}>
                                                {formatCurrency(taxAmount)}
                                            </Typography>
                                        </Box>
                                        <Divider sx={{ my: 1 }} />
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="h6" fontWeight={800} sx={{ fontSize: headingFontSize }}>Total</Typography>
                                            <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ fontSize: headingFontSize }}>{formatCurrency(totalAmount)}</Typography>
                                        </Box>
                                    </Box>

                                    <Button
                                        type="submit"
                                        variant="contained"
                                        fullWidth
                                        size="large"
                                        disabled={cart.length === 0 || submitting}
                                        sx={{ 
                                            py: 1.5, 
                                            borderRadius: 3, 
                                            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                                            color: '#ffffff !important',
                                            fontWeight: 700,
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)',
                                                color: '#ffffff !important',
                                            }
                                        }}
                                    >
                                        {submitting ? <CircularProgress size={24} color="inherit" /> : 'Submit Catering Order'}
                                    </Button>
                                </Stack>
                            </form>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {activeTab === 1 && user && (
                <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table>
                            <TableHead sx={{ bgcolor: 'grey.50' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {myOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((o: any) => (
                                    <TableRow key={o._id}>
                                        <TableCell sx={{ color: 'primary.main', fontWeight: 700 }}>{o.orderNumber}</TableCell>
                                        <TableCell>{new Date(o.requiredDate).toLocaleDateString()}</TableCell>
                                        <TableCell><Chip label={o.status?.toUpperCase()} size="small" color="primary" variant="outlined" /></TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{formatCurrency(o.totalAmount)}</TableCell>
                                        <TableCell align="center">
                                            <Box display="flex" gap={1} justifyContent="center">
                                                <Button size="small" variant="outlined" startIcon={<Visibility />} onClick={() => { setViewOrder(o); setViewDialogOpen(true); }}>View</Button>
                                                <Button size="small" variant="contained" startIcon={<Chat />} onClick={() => navigate(`/${currentSlug}/customer/catering/track/${o.trackingToken || o._id}`)}>Track</Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination rowsPerPageOptions={[5, 10]} component="div" count={myOrders.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} />
                </Paper>
            )}

            {/* Tray Selection Dialog */}
            <Dialog open={trayDialogOpen} onClose={() => setTrayDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{trayDialogItem?.name}</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">Base Item (No Tray)</Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                                <IconButton size="small" onClick={() => setTraySelections(p => ({ ...p, '__item__': Math.max(0, (p['__item__'] || 0) - 1) }))}><Remove /></IconButton>
                                <Typography>{traySelections['__item__'] || 0}</Typography>
                                <IconButton size="small" onClick={() => setTraySelections(p => ({ ...p, '__item__': (p['__item__'] || 0) + 1 }))}><Add /></IconButton>
                            </Box>
                        </Box>
                        {trayDialogItem?.trayOptions?.map((opt: any) => {
                            const tid = opt.tray?._id || opt.tray || '';
                            const tdata = trays.find(t => t._id === tid) || (typeof opt.tray === 'object' ? opt.tray : null);
                            return (
                                <Box key={tid} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant="body2" fontWeight={700}>{tdata?.name || 'Tray'}</Typography>
                                        <Typography variant="caption" color="text.secondary">Serves ~{opt.servingSize}</Typography>
                                    </Box>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <IconButton size="small" onClick={() => setTraySelections(p => ({ ...p, [tid]: Math.max(0, (p[tid] || 0) - 1) }))}><Remove /></IconButton>
                                        <Typography>{traySelections[tid] || 0}</Typography>
                                        <IconButton size="small" onClick={() => setTraySelections(p => ({ ...p, [tid]: (p[tid] || 0) + 1 }))}><Add /></IconButton>
                                    </Box>
                                </Box>
                            );
                        })}

                        {trayDialogItem?.isSpiceLevelAvailable && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Spicy Level
                                </Typography>
                                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ gap: 1.5 }}>
                                    {(trayDialogItem?.spiceLevels?.length > 0 ? trayDialogItem.spiceLevels : SPICE_LEVELS.map(l => l.id)).map((lvl: string) => {
                                        const isSelected = selectedSpice === lvl;
                                        const getSpiceColor = (l: string) => {
                                            const norm = l.toLowerCase();
                                            if (norm.includes('mild')) return { main: '#2e7d32' };
                                            if (norm.includes('medium') || norm.includes('moderate')) return { main: '#ed6c02' };
                                            if (norm.includes('hot') || norm.includes('spicy')) return { main: '#d32f2f' };
                                            return { main: '#1a3353' };
                                        };
                                        const color = getSpiceColor(lvl);

                                        return (
                                            <Box
                                                key={lvl}
                                                onClick={() => setSelectedSpice(lvl)}
                                                sx={{
                                                    flex: '1 1 auto',
                                                    minWidth: '100px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 1,
                                                    py: 1,
                                                    px: { xs: 1, sm: 2 },
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    border: `1.5px solid ${isSelected ? color.main : alpha(color.main, 0.2)}`,
                                                    bgcolor: isSelected ? color.main : 'white',
                                                    color: isSelected ? 'white' : color.main,
                                                    transition: 'all 0.2s',
                                                    boxShadow: isSelected ? `0 4px 12px ${alpha(color.main, 0.3)}` : 'none',
                                                    '&:hover': {
                                                        bgcolor: isSelected ? color.main : alpha(color.main, 0.05),
                                                        borderColor: color.main,
                                                    }
                                                }}
                                            >
                                                {isSelected ?
                                                    <CheckCircle sx={{ fontSize: 18, color: 'white' }} /> :
                                                    <RadioButtonUnchecked sx={{ fontSize: 18, color: alpha(color.main, 0.4) }} />
                                                }
                                                <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                    {formatSpiceLevelLabel(lvl)}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            </Box>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTrayDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleConfirmTraySelection}>Add to Order</Button>
                </DialogActions>
            </Dialog>

            {/* View Order Dialog */}
            <Dialog 
                open={viewDialogOpen} 
                onClose={() => setViewDialogOpen(false)} 
                maxWidth="sm" 
                fullWidth 
                sx={{ zIndex: { xs: 1050, md: 1300 } }}
                PaperProps={{ sx: { mt: { xs: '80px', md: 'auto' }, mb: { xs: 2, md: 'auto' } } }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: headingFontSize }}>Order: {viewOrder?.orderNumber}</Typography>
                    <IconButton 
                        onClick={() => setViewDialogOpen(false)} 
                        size="small"
                        sx={{ 
                            bgcolor: 'error.main', 
                            color: 'white', 
                            '&:hover': { bgcolor: 'error.dark' }, 
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            minWidth: 24
                        }}
                    >
                        <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {viewOrder && (
                        <List disablePadding>
                            <ListItem><ListItemText primary={viewOrder.serviceType === 'takeaway' || viewOrder.serviceType === 'online_takeaway' ? 'Delivery Date & Time' : 'Delivery Date & Time'} secondary={new Date(viewOrder.requiredDate).toLocaleString()} /></ListItem>
                            <ListItem><ListItemText primary="Service" secondary={viewOrder.serviceType?.toUpperCase()} /></ListItem>
                            <ListItem><ListItemText primary="Total" secondary={formatCurrency(viewOrder.totalAmount || 0)} /></ListItem>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ px: 2, mb: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: bodyFontSize }}>Occasion Details</Typography>
                                <Typography variant="body2" sx={{ textTransform: 'capitalize', fontSize: bodyFontSize }}><b>Occasion:</b> {viewOrder.occasion || 'N/A'}</Typography>
                                {viewOrder.occasionPersonName && (
                                    <Typography variant="body2" sx={{ fontSize: bodyFontSize }}><b>For:</b> {viewOrder.occasionPersonName}</Typography>
                                )}
                                <Typography variant="body2" sx={{ fontSize: bodyFontSize }}><b>Occasion Date:</b> {viewOrder.occasionDate ? new Date(viewOrder.occasionDate).toLocaleDateString() : 'N/A'}</Typography>

                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, mt: 1, fontSize: bodyFontSize }}>Guest Counts</Typography>
                                <Typography variant="body2" sx={{ fontSize: bodyFontSize }}><b>Adults:</b> {viewOrder.guests?.adults?.veg + viewOrder.guests?.adults?.nonVeg === 0 ? 'N/A' : `Veg: ${viewOrder.guests?.adults?.veg}, Non-Veg: ${viewOrder.guests?.adults?.nonVeg}`}</Typography>
                                <Typography variant="body2" sx={{ fontSize: bodyFontSize }}><b>Kids:</b> {viewOrder.guests?.kids?.veg + viewOrder.guests?.kids?.nonVeg === 0 ? 'N/A' : `Veg: ${viewOrder.guests?.kids?.veg}, Non-Veg: ${viewOrder.guests?.kids?.nonVeg}`}</Typography>

                                {viewOrder.additionalServices && (
                                    <>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, mt: 1, fontSize: bodyFontSize }}>Special Instructions</Typography>
                                        <Typography variant="body2" sx={{ fontSize: bodyFontSize }}>{viewOrder.additionalServices}</Typography>
                                    </>
                                )}
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ px: 2, mt: 1, fontSize: headingFontSize }}>Items:</Typography>
                            {viewOrder.items?.map((item: any, i: number) => (
                                <ListItem key={i}>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography variant="body2" fontWeight={700} sx={{ fontSize: bodyFontSize }}>{item.name}</Typography>
                                                {item.spiceLevel && (
                                                    <Chip
                                                        label={item.spiceLevel}
                                                        size="small"
                                                        sx={{
                                                            height: 18,
                                                            fontSize: '0.6rem',
                                                            bgcolor: alpha('#e65100', 0.1),
                                                            color: '#e65100',
                                                            border: '1px solid currentColor',
                                                            textTransform: 'uppercase'
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        }
                                        secondary={`${item.quantity} x ${formatCurrency(item.unitPrice)}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
                    <Button variant="contained" color="primary" startIcon={<Chat />} onClick={() => { setViewDialogOpen(false); navigate(`/${currentSlug}/customer/catering/track/${viewOrder?.trackingToken || viewOrder?._id}`); }}>Track / Chat</Button>
                </DialogActions>
            </Dialog>

            {/* Inline Login Dialog */}
            <Dialog open={loginDialogOpen} onClose={() => setLoginDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
                <DialogTitle sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'inline-flex', p: 2, borderRadius: '20px', background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: 'white', mb: 2 }}>
                        <Person sx={{ fontSize: 32 }} />
                    </Box>
                    <Typography variant="h5" fontWeight={800} sx={{ fontSize: headingFontSize }}>{loginDialogMode === 'login' ? 'Welcome Back' : 'Create Account'}</Typography>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        {loginDialogMode === 'register' && (
                            <Box display="flex" gap={2}>
                                <TextField label="First Name" fullWidth value={regData.firstName} onChange={e => setRegData({ ...regData, firstName: e.target.value })} />
                                <TextField label="Last Name" fullWidth value={regData.lastName} onChange={e => setRegData({ ...regData, lastName: e.target.value })} />
                            </Box>
                        )}
                        <TextField label="Email" fullWidth value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                        <TextField label="Password" type={loginShowPwd ? 'text' : 'password'} fullWidth value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                            InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setLoginShowPwd(!loginShowPwd)}>{loginShowPwd ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
                        <Button fullWidth variant="contained" size="large" onClick={loginDialogMode === 'login' ? handleInlineLogin : handleInlineRegister} disabled={loginLoading} sx={{ py: 1.5, borderRadius: 3, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
                            {loginLoading ? <CircularProgress size={24} color="inherit" /> : 'Continue'}
                        </Button>
                        <Button variant="text" fullWidth onClick={() => setLoginDialogMode(loginDialogMode === 'login' ? 'register' : 'login')}>
                            {loginDialogMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 4, pt: 1 }}>
                    <Button fullWidth variant="outlined" onClick={() => setLoginDialogOpen(false)} sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}>Maybe Later</Button>
                </DialogActions>
            </Dialog>

            {/* Custom Occasion Dialog */}
            <Dialog open={addCustomOccasionOpen} onClose={() => setAddCustomOccasionOpen(false)}>
                <DialogTitle>Add Custom Occasion</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Occasion Name"
                        fullWidth
                        variant="outlined"
                        value={customOccasion}
                        onChange={(e) => setCustomOccasion(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddCustomOccasionOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddCustomOccasion} variant="contained" color="primary">Add</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default CateringPage;
