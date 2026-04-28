import {
    Add,
    Assignment,
    Cancel,
    CheckCircle,
    Close,
    Visibility,
    RadioButtonUnchecked,
} from '@mui/icons-material';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    Grid,
    IconButton,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Stack,
    Switch,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tabs,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Stepper,
    Step,
    StepLabel,
    Tooltip,
} from '@mui/material';

const SPICE_LEVELS = [
    { id: 'mild', label: 'Mild' },
    { id: 'moderate', label: 'Moderate' },
    { id: 'more_spicy', label: 'More Spicy' }
];
import { alpha } from '@mui/material/styles';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import AddressAutocomplete from '../../../components/AddressAutocomplete';
import ActionHistoryList from '../../../components/common/ActionHistoryList';
import { useSettings } from '../../../context/SettingsContext';
import { cateringAPI, customersAPI, menuAPI, recipesAPI, usersAPI, traysAPI, settingsAPI, taxAPI } from '../../../services/api';
import PhoneInput from 'src/components/PhoneInput';
import { useAuth } from '../../../context/AuthContext';
import { downloadFromUrl } from '../../../utils/fileDownload';
import { apiBaseUrl } from '../../../services/api';

const CateringManagementPage = () => {
    const { formatCurrency, settings, refreshSettings } = useSettings();
    const availablePaymentMethods = useMemo(() => [
        { value: 'cash', label: 'Cash' },
        { value: 'card', label: 'Card' },
        { value: 'zelle', label: 'Zelle' },
        { value: 'venmo', label: 'Venmo' }
    ].filter(m => settings.system?.posPaymentMethods?.[m.value as keyof typeof settings.system.posPaymentMethods] !== false), [settings.system?.posPaymentMethods]);
    const { getUserFullName, user } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [requirements, setRequirements] = useState<any | null>(null);
    const [reqLoading, setReqLoading] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [reqDialogOpen, setReqDialogOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [taxDetails, setTaxDetails] = useState<any>(null);
    const [isCalculatingTax, setIsCalculatingTax] = useState(false);
    const [newOrder, setNewOrder] = useState({
        customerName: '',
        customerPhone: '',
        dialCode: '1',
        customerEmail: '',
        requiredDate: '',
        occasion: '',
        occasionDate: '',
        serviceType: 'takeaway',
        guests: {
            adults: { veg: 0, nonVeg: 0 },
            kids: { veg: 0, nonVeg: 0 }
        },
        address: '',
        city: '',
        state: '',
        county: '',
        country: '',
        zipCode: '',
        latitude: null as number | null,
        longitude: null as number | null,
        googleMapsLink: '',
        items: [] as any[],
        notes: '',
        additionalServices: '',
        discount: { type: 'percentage' as 'percentage' | 'fixed', value: 0 },
        advanceReceived: 0,
        payments: [] as any[],
        processingPerson: '',
        occasionPersonName: ''
    });

    // Sync dial code with settings
    useEffect(() => {
        if (settings?.restaurant?.dialCode) {
            setNewOrder(prev => ({ ...prev, dialCode: settings.restaurant.dialCode }));
            setCommissionData(prev => ({ ...prev, extDialCode: settings.restaurant.dialCode }));
        }
    }, [settings?.restaurant?.dialCode]);

    // Auto-fill processing person
    useEffect(() => {
        const fullName = getUserFullName();
        if (fullName && !newOrder.processingPerson) {
            setNewOrder(prev => ({ ...prev, processingPerson: fullName }));
        }
    }, [user, getUserFullName, newOrder.processingPerson]);

    // Debounced Tax Calculation for new/edit catering orders
    useEffect(() => {
        if (newOrder.items.length === 0) {
            setTaxDetails(null);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setIsCalculatingTax(true);
                
                let subtotal = newOrder.items.reduce((sum, item) => sum + (item.total || 0), 0);
                let discountAmt = 0;
                if (newOrder.discount.type === 'percentage') {
                    discountAmt = (subtotal * (newOrder.discount.value || 0)) / 100;
                } else {
                    discountAmt = newOrder.discount.value || 0;
                }

                const payload = {
                    to_zip: newOrder.zipCode || settings.restaurant?.zipCode || '30040',
                    to_state: newOrder.state,
                    to_city: newOrder.city,
                    to_street: newOrder.address,
                    discount: discountAmt,
                    line_items: newOrder.items.map(item => ({
                        itemId: item.menuItem,
                        quantity: item.quantity,
                        price: item.unitPrice,
                        name: item.name
                    }))
                };

                const res = await taxAPI.calculate(payload);
                setTaxDetails(res.data);
            } catch (err) {
                console.error("[Catering Tax] Failed:", err);
                setTaxDetails(null);
            } finally {
                setIsCalculatingTax(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [newOrder.items, newOrder.discount, newOrder.zipCode, newOrder.address, settings]);

    const [expanded, setExpanded] = useState<string | false>('customer');
    const [activeStep, setActiveStep] = useState(0);
    const [itemSelection, setItemSelection] = useState({
        menuItem: null as any,
        trayId: '',
        quantity: 1
    });
    const [trays, setTrays] = useState<any[]>([]);
    const [phoneTouched, setPhoneTouched] = useState(false);
    const [nameTouched, setNameTouched] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [occasionTouched, setOccasionTouched] = useState(false);
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [mapsAuthError, setMapsAuthError] = useState((window as any).googleMapsAuthError || false);
    const [recipeMenuItemIds, setRecipeMenuItemIds] = useState<Set<string>>(new Set());
    const [itemSearch, setItemSearch] = useState('');
    const [itemSelectorConfigs, setItemSelectorConfigs] = useState<Record<string, any>>({});
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [dialogTab, setDialogTab] = useState(0);
    const [categories, setCategories] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);

    const [menuNextCursor, setMenuNextCursor] = useState<string | null>(null);
    const [menuPrevCursors, setMenuPrevCursors] = useState<string[]>([]);
    const [isMenuLoading, setIsMenuLoading] = useState(false);

    // Commission State
    const [users, setUsers] = useState<any[]>([]);
    const [commissionData, setCommissionData] = useState({
        enabled: false,
        type: 'fixed', // 'fixed' | 'percentage'
        amount: 0,
        percentage: 0,
        referenceType: 'external_customer', // 'internal_team' | 'external_customer'
        // External Reference Details
        extCustomer: null as any, // Full customer object
        extName: '',
        extContact: '',
        extDialCode: '1',
        extEmail: '',
        extNotes: '',
        // Internal Reference Details
        intUser: null as any, // Full user object
        intNotes: '',
        // General Commission Notes
        notes: ''
    });

    const [newMessage, setNewMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>(null);
    const [updating, setUpdating] = useState(false);
    const [creating, setCreating] = useState(false);

    // Admin custom-item (off-menu) state
    const [adminCustomItemName, setAdminCustomItemName] = useState('');
    const [adminCustomItemQty, setAdminCustomItemQty] = useState<number>(1);
    const [adminCustomItemPrice, setAdminCustomItemPrice] = useState<number>(0);

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
    const [addCustomOccasionOpen, setAddCustomOccasionOpen] = useState(false);
    const [customOccasion, setCustomOccasion] = useState('');
    const [occasionInputValue, setOccasionInputValue] = useState('');

    const handleAddCustomOccasion = async () => {
        if (customOccasion.trim()) {
            const newOcc = customOccasion.trim();
            let updatedList = occasionsList;
            if (!occasionsList.includes(newOcc)) {
                updatedList = [...occasionsList, newOcc];
                setOccasionsList(updatedList);

                // Persist to backend
                try {
                    await settingsAPI.update('restaurant', {
                        ...settings.restaurant,
                        occasions: updatedList
                    });
                    await refreshSettings();
                    toast.success('New occasion added and saved');
                } catch (error) {
                    console.error('Failed to save custom occasion:', error);
                    toast.error('Occasion added locally but failed to save to settings');
                }
            }
            if (isEditing) {
                setEditData({ ...editData, occasion: newOcc });
            } else {
                setNewOrder({ ...newOrder, occasion: newOcc });
            }
            setOccasionTouched(true);
            setCustomOccasion('');
            setAddCustomOccasionOpen(false);
        }
    };

    const preventScientificNotation = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (['e', 'E', '.', '-', '+'].includes(e.key)) {
            e.preventDefault();
        }
    };

    const handleGuestCountChange = (
        target: 'newOrder' | 'editData',
        type: 'adults' | 'kids',
        category: 'veg' | 'nonVeg',
        value: string
    ) => {
        const num = parseInt(value);
        const safeValue = isNaN(num) ? 0 : Math.max(0, Math.min(num, 9999));
        
        if (target === 'newOrder') {
            setNewOrder(prev => ({
                ...prev,
                guests: {
                    ...prev.guests,
                    [type]: {
                        ...prev.guests[type],
                        [category]: safeValue
                    }
                }
            }));
        } else {
            setEditData(prev => ({
                ...prev,
                guests: {
                    ...prev.guests,
                    [type]: {
                        ...prev.guests[type],
                        [category]: safeValue
                    }
                }
            }));
        }
    };

    const handleDownloadPDF = async (orderId: string, orderNumber: string) => {
        try {
            const token = localStorage.getItem('jwt');
            const fullUrl = `${apiBaseUrl}/catering/${orderId}/pdf`;
            await downloadFromUrl(fullUrl, `Invoice-${orderNumber}.pdf`, {
                Authorization: `Bearer ${token}`,
            });
        } catch (error) {
            toast.error('Failed to download PDF');
        }
    };

    const handleSendEmail = async (orderId: string) => {
        try {
            await cateringAPI.sendEmail(orderId);
            toast.success('Email sent successfully');
        } catch (error) {
            toast.error('Failed to send email');
        }
    };

    const handleSendMessage = async () => {
        const isDatePassed = selectedOrder?.requiredDate && new Date(selectedOrder.requiredDate) < new Date();
        if (!newMessage.trim() || !selectedOrder || selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled' || isDatePassed) return;
        setSendingMessage(true);
        try {
            const response = await cateringAPI.addMessage(selectedOrder._id, newMessage);
            setSelectedOrder(response.data);
            setNewMessage('');
            // Optional: Re-fetch order or update state
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setSendingMessage(false);
        }
    };

    const handleEditOrder = () => {
        const fullName = getUserFullName();
        setEditData({
            ...selectedOrder,
            processingPerson: selectedOrder?.processingPerson || fullName || ''
        });
        setOccasionInputValue(selectedOrder?.occasion || '');
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditData(null);
    };

    const handleSaveUpdate = async () => {
        if (!editData || !selectedOrder) return;

        // Validation
        const isOccasionValid = !!editData.occasion;
        const isOccasionDateValid = !!editData.occasionDate;
        const isOccasionNameRequired = editData.occasion?.toLowerCase().includes('birthday') ||
            editData.occasion?.toLowerCase().includes('anniversary') ||
            editData.occasion?.toLowerCase().includes('wedding');
        const isOccasionNameValid = !isOccasionNameRequired || !!editData.occasionPersonName?.trim();

        if (!isOccasionValid || !isOccasionDateValid || !isOccasionNameValid) {
            if (!isOccasionValid) toast.error('Occasion is required');
            else if (!isOccasionDateValid) toast.error('Occasion Date is required');
            else if (!isOccasionNameValid) toast.error('Name for occasion is required');
            return;
        }

        setUpdating(true);
        try {
            const response = await cateringAPI.update(selectedOrder._id, editData);
            setSelectedOrder(response.data);
            setIsEditing(false);
            setEditData(null);
            fetchOrders(); // Refresh table
            toast.success('Order updated successfully');
        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Failed to update order');
        } finally {
            setUpdating(false);
        }
    };

    const handleRemoveItemFromEdit = (index: number) => {
        const newItems = [...editData.items];
        newItems.splice(index, 1);
        setEditData({ ...editData, items: newItems });
    };

    const handleUpdateEditItemQty = (index: number, newQty: number) => {
        const newItems = [...editData.items];
        newItems[index] = { ...newItems[index], quantity: newQty, total: newItems[index].unitPrice * newQty };
        
        const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
        let discountAmt = editData.discount?.type === 'percentage'
            ? (subtotal * (editData.discount?.value || 0)) / 100
            : (editData.discount?.value || 0);
        const taxRate = editData.tax?.rate || 0;
        const taxAmount = Math.max(0, subtotal - discountAmt) * (taxRate / 100);
        const totalAmount = Math.max(0, subtotal - discountAmt) + taxAmount;

        setEditData({ ...editData, items: newItems, subtotal, totalAmount, tax: { ...editData.tax, amount: taxAmount } });
    };

    const handleUpdateEditItemPrice = (index: number, newPrice: number) => {
        const newItems = [...editData.items];
        newItems[index] = { ...newItems[index], unitPrice: newPrice, total: newPrice * newItems[index].quantity };
        
        const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
        let discountAmt = editData.discount?.type === 'percentage'
            ? (subtotal * (editData.discount?.value || 0)) / 100
            : (editData.discount?.value || 0);
        const taxRate = editData.tax?.rate || 0;
        const taxAmount = Math.max(0, subtotal - discountAmt) * (taxRate / 100);
        const totalAmount = Math.max(0, subtotal - discountAmt) + taxAmount;

        setEditData({ ...editData, items: newItems, subtotal, totalAmount, tax: { ...editData.tax, amount: taxAmount } });
    };

    const handleAddItemsToEdit = (finalizedItems: any[]) => {
        setEditData((prev: any) => ({
            ...prev,
            items: [...prev.items, ...finalizedItems]
        }));
    };

    const handleAddPaymentToEdit = () => {
        const newPayments = [...(editData.payments || [])];
        const currentTotal = editData.totalAmount || 0;
        const otherPaymentsSum = newPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const remainingBalance = parseFloat(Math.max(0, currentTotal - otherPaymentsSum).toFixed(2));

        const defaultMethod = availablePaymentMethods[0]?.value || 'cash';
        newPayments.push({ amount: remainingBalance, method: defaultMethod, timestamp: new Date(), notes: '' });
        setEditData({ ...editData, payments: newPayments });
    };

    const handleRemovePaymentFromEdit = (index: number) => {
        const newPayments = [...editData.payments];
        newPayments.splice(index, 1);
        setEditData({ ...editData, payments: newPayments });
    };

    const handleUpdatePaymentFromEdit = (index: number, field: string, value: any) => {
        const newPayments = [...editData.payments];

        if (field === 'amount') {
            const enteredAmount = Math.max(0, parseFloat(value) || 0);
            const currentTotal = editData.totalAmount || 0;
            const otherPaymentsSum = newPayments.filter((_, i) => i !== index).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            const remainingBalance = parseFloat(Math.max(0, currentTotal - otherPaymentsSum).toFixed(2));
            newPayments[index] = { ...newPayments[index], [field]: Math.min(enteredAmount, remainingBalance) };
        } else {
            newPayments[index] = { ...newPayments[index], [field]: value };
        }

        setEditData({ ...editData, payments: newPayments });
    };

    const handleAddPaymentToCreate = () => {
        const newPayments = [...(newOrder.payments || [])];

        // Re-calculate the current total dynamically
        const subtotal = newOrder.items.reduce((sum, item) => sum + item.total, 0);
        let discountAmt = newOrder.discount.type === 'percentage'
            ? (subtotal * (newOrder.discount.value || 0)) / 100
            : (newOrder.discount.value || 0);
        const discountRatio = subtotal > 0 ? Math.max(0, subtotal - discountAmt) / subtotal : 1;
        const defaultTaxRate = settings?.restaurant?.taxRate || 0;
        const taxAmount = newOrder.items.reduce((sum, item: any) => {
            const itemTaxRate = (item.taxRate !== undefined && item.taxRate !== null) ? item.taxRate : defaultTaxRate;
            return sum + (item.total * discountRatio * itemTaxRate / 100);
        }, 0);

        const currentTotal = Math.max(0, subtotal - discountAmt) + taxAmount;
        const otherPaymentsSum = newPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const remainingBalance = parseFloat(Math.max(0, currentTotal - otherPaymentsSum).toFixed(2));

        const defaultMethod = availablePaymentMethods[0]?.value || 'cash';
        newPayments.push({ amount: remainingBalance, method: defaultMethod, timestamp: new Date(), notes: '' });
        setNewOrder({ ...newOrder, payments: newPayments });
    };

    const handleRemovePaymentFromCreate = (index: number) => {
        const newPayments = [...newOrder.payments];
        newPayments.splice(index, 1);
        setNewOrder({ ...newOrder, payments: newPayments });
    };

    const handleUpdatePaymentFromCreate = (index: number, field: string, value: any) => {
        const newPayments = [...newOrder.payments];

        if (field === 'amount') {
            const enteredAmount = Math.max(0, parseFloat(value) || 0);

            // Re-calculate the current total dynamically
            const subtotal = newOrder.items.reduce((sum, item) => sum + item.total, 0);
            let discountAmt = newOrder.discount.type === 'percentage'
                ? (subtotal * (newOrder.discount.value || 0)) / 100
                : (newOrder.discount.value || 0);
            const discountRatio = subtotal > 0 ? Math.max(0, subtotal - discountAmt) / subtotal : 1;
            const defaultTaxRate = settings?.restaurant?.taxRate || 0;
            const taxAmount = newOrder.items.reduce((sum, item: any) => {
                const itemTaxRate = (item.taxRate !== undefined && item.taxRate !== null) ? item.taxRate : defaultTaxRate;
                return sum + (item.total * discountRatio * itemTaxRate / 100);
            }, 0);

            const currentTotal = Math.max(0, subtotal - discountAmt) + taxAmount;
            const otherPaymentsSum = newPayments.filter((_, i) => i !== index).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            const remainingBalance = parseFloat(Math.max(0, currentTotal - otherPaymentsSum).toFixed(2));

            newPayments[index] = { ...newPayments[index], [field]: Math.min(enteredAmount, remainingBalance) };
        } else {
            newPayments[index] = { ...newPayments[index], [field]: value };
        }

        setNewOrder({ ...newOrder, payments: newPayments });
    };

    const fetchUsers = async () => {
        try {
            const response = await usersAPI.getUsers();
            const allUsers = response.data.data || response.data.users || response.data || [];
            // Filter out customers if needed, or keep all
            setUsers(allUsers);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await customersAPI.getAll({ page: 1, limit: 1000 });
            const allCustomers = response.data.customers || response.data.data || response.data || [];
            setCustomers(allCustomers);
        } catch (error) {
            console.error('Failed to fetch customers', error);
        }
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await cateringAPI.getAll({
                page: page + 1, // Backend uses 1-based pagination
                limit: rowsPerPage
            });
            setOrders(response.data.orders || []);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('Error fetching catering orders:', error);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const fetchMenu = async (search: string = '', cursor: string = '') => {
        try {
            setIsMenuLoading(true);
            // Fetch both menu, recipes and categories
            const [menuRes, recipeRes, catRes] = await Promise.all([
                menuAPI.getAll({ search, cursor, limit: 50, isCateringAvailable: true }),
                recipesAPI.getAll({ limit: 1000 }),
                menuAPI.getAllCategories()
            ]);

            setCategories(Array.isArray(catRes.data) ? catRes.data : (catRes.data?.categories || catRes.data?.data || []));

            // Handle Menu Items
            const menuData = menuRes.data;
            const items = Array.isArray(menuData) ? menuData : (menuData?.items || []);
            setMenuItems(items);
            setMenuNextCursor(menuData?.nextCursor || null);

            // Handle Recipes
            const recipeData = recipeRes.data;
            const recs = Array.isArray(recipeData) ? recipeData : (recipeData?.data || recipeData?.recipes || []);

            const ids = new Set<string>();
            if (Array.isArray(recs)) {
                recs.forEach((r: any) => {
                    const mid = typeof r.menuItem === 'object' ? r.menuItem?._id : r.menuItem;
                    if (mid && r.ingredients && r.ingredients.length > 0) {
                        ids.add(mid.toString());
                    }
                });
            }
            setRecipeMenuItemIds(ids);
        } catch (error) {
            console.error('Error fetching menu/recipes:', error);
            toast.error('Failed to load menu items');
        } finally {
            setIsMenuLoading(false);
        }
    };

    // Debounced Search for Menu Items
    useEffect(() => {
        if (!createDialogOpen && !isEditing) return;
        
        const timer = setTimeout(() => {
            setMenuPrevCursors([]); // Reset pagination on new search
            fetchMenu(itemSearch);
        }, 500);

        return () => clearTimeout(timer);
    }, [itemSearch]);

    const handleMenuNext = () => {
        if (menuNextCursor) {
            setMenuPrevCursors(prev => [...prev, '']); // Placeholder for back logic if backend doesn't support prev cursors
            // Note: Since backend only gives nextCursor, true back navigation is hard without skip/limit.
            // But we can store historical items or cursors.
            // For now, let's just support Next.
            fetchMenu(itemSearch, menuNextCursor);
        }
    };

    const handleMenuPrev = () => {
        // If we want real back navigation, we'd need to store the previous items.
        // Simplified for now: just re-fetch first page if they go back.
        setMenuPrevCursors([]);
        fetchMenu(itemSearch, '');
    };

    useEffect(() => {
        fetchOrders();
    }, [page, rowsPerPage]);

    const fetchTrays = async () => {
        try {
            const res = await traysAPI.getAll();
            setTrays(res.data || []);
        } catch (error) {
            console.error('Error fetching trays:', error);
        }
    };

    useEffect(() => {
        fetchMenu();
        fetchUsers();
        fetchCustomers();
        fetchTrays();

        const handleError = () => setMapsAuthError(true);
        window.addEventListener('google-maps-auth-failure', handleError);
        return () => window.removeEventListener('google-maps-auth-failure', handleError);
    }, []);

    const handleViewRequirements = async (orderId: string) => {
        setReqLoading(true);
        setReqDialogOpen(true);
        try {
            const response = await cateringAPI.getRequirements(orderId);
            setRequirements(response.data);
        } catch (error) {
            console.error('Error fetching requirements:', error);
            toast.error('Failed to calculate requirements');
        } finally {
            setReqLoading(false);
        }
    };

    const getServiceTypeLabel = (type: string) => {
        switch (type) {
            case 'takeaway': return 'Catering Takeaway';
            case 'delivery': return 'Delivery';
            case 'delivery_service': return 'Delivery & Service';
            default: return type;
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await cateringAPI.updateStatus(id, newStatus);
            toast.success(`Order marked as ${newStatus}`);
            fetchOrders();
            if (selectedOrder && selectedOrder._id === id) {
                setSelectedOrder({ ...selectedOrder, status: newStatus });
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleAddItemRow = (itemId: string) => {
        setItemSelectorConfigs(prev => {
            const config = prev[itemId] || { trayRows: [], cook: '', isSelected: false, spiceLevel: 'moderate' };
            const item = menuItems.find(i => i._id === itemId);
            const hasTrays = item?.isCateringAvailable && item?.trayOptions?.length > 0;

            if (!hasTrays) return prev;

            const defaultTray = '';
            const defaultPrice = item?.price || 0;

            return {
                ...prev,
                [itemId]: {
                    ...config,
                    trayRows: [
                        ...(config.trayRows || []),
                        { trayId: defaultTray, price: defaultPrice, quantity: '', isNotSure: false }
                    ]
                }
            };
        });
    };

    const handleRemoveItemRow = (itemId: string, rowIndex: number) => {
        setItemSelectorConfigs(prev => {
            const config = prev[itemId];
            if (!config) return prev;
            const newRows = [...config.trayRows];
            newRows.splice(rowIndex, 1);
            return {
                ...prev,
                [itemId]: { ...config, trayRows: newRows }
            };
        });
    };

    const handleToggleItemSelection = (itemId: string) => {
        setItemSelectorConfigs(prev => {
            const isSelected = !prev[itemId]?.isSelected;
            if (isSelected && (!prev[itemId] || prev[itemId].trayRows?.length === 0)) {
                // Initialize default row if it's a regular item or first time
                const item = menuItems.find(i => i._id === itemId);
                const hasTrays = item?.isCateringAvailable && item?.trayOptions?.length > 0;

                const defaultTray = '';
                const defaultPrice = item?.price || 0;

                return {
                    ...prev,
                    [itemId]: {
                        isSelected,
                        cook: prev[itemId]?.cook || '',
                        spiceLevel: prev[itemId]?.spiceLevel || 'moderate',
                        trayRows: [{ trayId: defaultTray, price: defaultPrice, quantity: '', isNotSure: false }]
                    }
                };
            }
            return {
                ...prev,
                [itemId]: { ...(prev[itemId] || {}), isSelected }
            };
        });
    };

    const handleFinalizeItems = () => {
        const finalizedItems: any[] = [];
        Object.entries(itemSelectorConfigs).forEach(([itemId, config]: [string, any]) => {
            if (!config.isSelected) return;
            const item = menuItems.find(i => i._id === itemId);
            if (!item) return;

            config.trayRows.forEach((row: any) => {
                const qty = row.isNotSure ? 0 : (parseFloat(row.quantity) || 0);
                if (qty === 0 && !row.isNotSure) return;

                let displayName = item.name;
                let trayMultiplier = 1;
                if (row.trayId) {
                    const opt = item.trayOptions?.find((o: any) => (o.tray?._id || o.tray) === row.trayId);
                    const trayData = trays.find(t => t._id === row.trayId) || (opt && typeof opt.tray === 'object' ? opt.tray : null);
                    displayName += ` [${trayData?.name || 'Tray'}]`;
                    trayMultiplier = 1;
                }

                finalizedItems.push({
                    menuItem: item._id,
                    name: displayName,
                    quantity: qty,
                    unitPrice: row.price,
                    basePrice: item.price,
                    total: row.price * qty,
                    tray: row.trayId || undefined,
                    trayMultiplier,
                    cook: config.cook || undefined,
                    spiceLevel: (item.isSpiceLevelAvailable) ? (config.spiceLevel || 'moderate') : undefined,
                    isNotSure: row.isNotSure,
                    taxRate: (item.taxRate !== undefined && item.taxRate !== null) ? item.taxRate : undefined
                });
            });
        });

        if (finalizedItems.length === 0) {
            toast.error("Please configure at least one item with quantity");
            return;
        }

        if (isEditing) {
            handleAddItemsToEdit(finalizedItems);
        } else {
            setNewOrder(prev => ({
                ...prev,
                items: [...prev.items, ...finalizedItems]
            }));
        }
        setItemSelectorConfigs({}); // Reset selector
        setItemSearch('');
    };

    const renderItemSelector = () => {
        // Items are now filtered on the server
        const filtered = menuItems;

        // Group items: Category -> FoodType
        const groupedData: Record<string, { veg: any[], nonVeg: any[], others: any[] }> = {};

        filtered.forEach(item => {
            const catId = typeof item.category === 'object' ? item.category?._id : item.category;
            const category = categories.find(c => c._id === catId);
            const catName = category?.name || 'Other Items';

            if (!groupedData[catName]) {
                groupedData[catName] = { veg: [], nonVeg: [], others: [] };
            }

            if (item.foodType === 'veg') groupedData[catName].veg.push(item);
            else if (item.foodType === 'non-veg') groupedData[catName].nonVeg.push(item);
            else groupedData[catName].others.push(item);
        });

        const cooks = users.filter(u => u.role === 'chef' || u.role === 'cook' || u.role === 'admin' || u.role === 'manager');

        return (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mt: 2, bgcolor: alpha(theme.palette.primary.main, 0.01) }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#1a3353' }}>Select Food Items</Typography>
                </Box>

                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    sx={{ mb: 2 }}
                    InputProps={{
                        startAdornment: <Box component="span" sx={{ mr: 1, color: 'text.secondary' }}>🔍</Box>,
                        sx: { borderRadius: 2 }
                    }}
                />

                <Box sx={{
                    maxHeight: 600,
                    overflowY: 'auto',
                    pr: 0.5,
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': {
                        background: alpha('#adb5bd', 0.4),
                        borderRadius: '10px',
                        '&:hover': { background: alpha('#adb5bd', 0.7) }
                    }
                }}>
                    {Object.entries(groupedData).map(([catName, types]) => (
                        <Box key={catName} sx={{ mb: 3 }}>
                            {/* Main Category Header */}
                            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: '#1a3353', borderBottom: '2px solid', borderColor: alpha(theme.palette.primary.main, 0.1), pb: 0.5 }}>
                                {catName}
                            </Typography>

                            {/* Food Type Groups */}
                            {[
                                { name: 'Veg', items: types.veg, color: '#2e7d32', bg: '#e8f5e9', dot: '#4caf50' },
                                { name: 'Non-Veg', items: types.nonVeg, color: '#c62828', bg: '#ffebee', dot: '#ef5350' },
                                { name: 'Others', items: types.others, color: '#455a64', bg: '#f5f5f5', dot: '#90a4ae' }
                            ].map((type) => type.items.length > 0 && (
                                <Box key={type.name} sx={{ mb: 2, ml: 1 }}>
                                    {/* Type Header */}
                                    <Box sx={{
                                        display: 'flex', alignItems: 'center', gap: 1,
                                        px: 1.5, py: 0.6,
                                        bgcolor: type.bg,
                                        borderLeft: `3px solid ${type.color}`,
                                        borderRadius: '4px 4px 0 0',
                                        border: `1px solid ${alpha(type.color, 0.15)}`,
                                        borderBottom: 'none',
                                    }}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: type.dot, flexShrink: 0 }} />
                                        <Typography variant="caption" fontWeight={700} sx={{ color: type.color, flexGrow: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {type.name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: type.color, opacity: 0.8, fontWeight: 600 }}>
                                            {type.items.length} items
                                        </Typography>
                                    </Box>

                                    {/* Items list for this type */}
                                    <Box sx={{ border: `1px solid ${alpha(type.color, 0.12)}`, borderTop: 'none', borderRadius: '0 0 4px 4px', overflow: 'hidden', bgcolor: 'white' }}>
                                        {type.items.map((item: any, itemIdx: number) => {
                                            const config = itemSelectorConfigs[item._id] || { isSelected: false, trayRows: [], cook: '' };
                                            const hasTrays = item.isCateringAvailable && item.trayOptions?.length > 0;
                                            return (
                                                <Box key={item._id} sx={{
                                                    borderBottom: itemIdx < type.items.length - 1 ? `1px solid ${alpha(type.color, 0.06)}` : 'none',
                                                }}>
                                                    {/* Item Row */}
                                                    <Box
                                                        onClick={() => handleToggleItemSelection(item._id)}
                                                        sx={{
                                                            px: 1.5, py: 0.8,
                                                            display: 'flex', alignItems: 'center', gap: 1,
                                                            cursor: 'pointer',
                                                            bgcolor: config.isSelected ? alpha(type.color, 0.04) : 'transparent',
                                                            borderLeft: config.isSelected ? `3px solid ${type.color}` : '3px solid transparent',
                                                            transition: 'all 0.15s',
                                                            '&:hover': { bgcolor: alpha(type.color, 0.02) },
                                                        }}
                                                    >
                                                        <Checkbox
                                                            size="small"
                                                            checked={config.isSelected}
                                                            onChange={() => handleToggleItemSelection(item._id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            sx={{ p: 0.2, color: alpha(type.color, 0.3), '&.Mui-checked': { color: type.color } }}
                                                        />
                                                        <Typography variant="body2" sx={{ color: config.isSelected ? type.color : 'text.primary', fontWeight: config.isSelected ? 600 : 400 }}>
                                                            {item.name}
                                                        </Typography>
                                                    </Box>

                                                    {/* Config Panel */}
                                                    {config.isSelected && (
                                                        <Box sx={{ px: 2, py: 1.5, bgcolor: alpha(type.color, 0.02), borderTop: `1px dashed ${alpha(type.color, 0.15)}` }}>
                                                            <Stack spacing={1.5}>
                                                                {config.trayRows.map((row: any, idx: number) => (
                                                                    <Grid container spacing={1.5} key={idx} alignItems="flex-start">
                                                                        <Grid item xs={12} sm={hasTrays ? 4 : 4}>
                                                                            {hasTrays ? (
                                                                                <FormControl fullWidth size="small">
                                                                                    <InputLabel shrink={!!row.trayId || true}>Tray Type / Base Price*</InputLabel>
                                                                                    <Select
                                                                                        value={row.trayId || 'INDIVIDUAL'}
                                                                                        label="Tray Type / Base Price*"
                                                                                        displayEmpty
                                                                                        renderValue={(selected) => {
                                                                                            if (selected === 'INDIVIDUAL' || selected === '') return "Base Price (Individual)";
                                                                                            const t = trays.find(tr => tr._id === selected);
                                                                                            const opt = item.trayOptions?.find((o: any) => (o.tray?._id || o.tray) === selected);
                                                                                            const trayName = opt?.tray?.name || t?.name || "Select Tray";
                                                                                            if (opt && opt.servingSize && opt.servingSize > 0) return `${trayName} (Serves ~${opt.servingSize})`;
                                                                                            return trayName;
                                                                                        }}
                                                                                        onChange={(e) => {
                                                                                            const trayId = e.target.value === 'INDIVIDUAL' ? '' : e.target.value;
                                                                                            const price = trayId === '' ? item.price : (item.trayOptions?.find((o: any) => (o.tray?._id || o.tray) === trayId)?.price || 0);
                                                                                            const newRows = [...config.trayRows];
                                                                                            newRows[idx] = { ...row, trayId, price };
                                                                                            setItemSelectorConfigs(prev => ({ ...prev, [item._id]: { ...config, trayRows: newRows } }));
                                                                                        }}
                                                                                    >
                                                                                        <MenuItem value="INDIVIDUAL">
                                                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                                                                                                <Typography variant="body2" fontWeight={600}>Base Price (Individual)</Typography>
                                                                                                <Typography variant="caption" color="primary.main" fontWeight={700}>{formatCurrency(item.price)}</Typography>
                                                                                            </Box>
                                                                                        </MenuItem>
                                                                                        {item.trayOptions?.map((opt: any) => {
                                                                                            const tid = opt.tray?._id || opt.tray;
                                                                                            const t = trays.find(tr => tr._id === tid) || (typeof opt.tray === 'object' ? opt.tray : null);
                                                                                            return (
                                                                                                <MenuItem key={tid} value={tid}>
                                                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                                                                                                        <Typography variant="body2">
                                                                                                            {t?.name} {opt.servingSize && opt.servingSize > 0 && <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>(Serves ~{opt.servingSize})</Typography>}
                                                                                                        </Typography>
                                                                                                        <Typography variant="caption" fontWeight={600}>{formatCurrency(opt.price)}</Typography>
                                                                                                    </Box>
                                                                                                </MenuItem>
                                                                                            );
                                                                                        })}
                                                                                    </Select>
                                                                                </FormControl>
                                                                            ) : (
                                                                                <TextField
                                                                                    label="Price per Item ($)*"
                                                                                    type="number"
                                                                                    size="small"
                                                                                    fullWidth
                                                                                    value={row.price}
                                                                                    inputProps={{ min: 1 }}
                                                                                    onChange={(e) => {
                                                                                        const val = Math.max(1, parseFloat(e.target.value) || 1);
                                                                                        const newRows = [...config.trayRows];
                                                                                        newRows[idx] = { ...row, price: val };
                                                                                        setItemSelectorConfigs(prev => ({ ...prev, [item._id]: { ...config, trayRows: newRows } }));
                                                                                    }}
                                                                                />
                                                                            )}
                                                                        </Grid>
                                                                        {hasTrays && (
                                                                            <Grid item xs={6} sm={4}>
                                                                                <TextField
                                                                                    label={row.trayId === '' ? "Price per Item ($)*" : "Price per Tray ($)*"}
                                                                                    type="number"
                                                                                    size="small"
                                                                                    fullWidth
                                                                                    value={row.price}
                                                                                    inputProps={{ min: 1 }}
                                                                                    onChange={(e) => {
                                                                                        const val = Math.max(1, parseFloat(e.target.value) || 1);
                                                                                        const newRows = [...config.trayRows];
                                                                                        newRows[idx] = { ...row, price: val };
                                                                                        setItemSelectorConfigs(prev => ({ ...prev, [item._id]: { ...config, trayRows: newRows } }));
                                                                                    }}
                                                                                />
                                                                            </Grid>
                                                                        )}
                                                                        <Grid item xs={6} sm={hasTrays ? 3 : 4}>
                                                                            <TextField label="Quantity*" type="number" size="small" fullWidth value={row.quantity} inputProps={{ min: 1 }} error={!row.quantity}
                                                                                helperText={!row.quantity ? <Box component="span" sx={{ color: 'error.main', fontSize: '0.65rem' }}>* Required</Box> : ''}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value === '' ? '' : String(Math.max(1, parseInt(e.target.value) || 1));
                                                                                    const newRows = [...config.trayRows];
                                                                                    newRows[idx] = { ...row, quantity: val };
                                                                                    setItemSelectorConfigs(prev => ({ ...prev, [item._id]: { ...config, trayRows: newRows } }));
                                                                                }}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={1} display="flex" justifyContent="center" pt={0.5}>
                                                                            <IconButton size="small" color="error" onClick={() => (config.trayRows.length > 1) ? handleRemoveItemRow(item._id, idx) : handleToggleItemSelection(item._id)}>
                                                                                <Cancel fontSize="small" />
                                                                            </IconButton>
                                                                        </Grid>
                                                                    </Grid>
                                                                ))}

                                                                {item.isSpiceLevelAvailable && (
                                                                    <Box sx={{ mt: 1, mb: 1.5 }}>
                                                                        <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                            Spicy Level
                                                                        </Typography>
                                                                        <Stack direction="row" spacing={1.5}>
                                                                            {SPICE_LEVELS.map((level) => {
                                                                                const isSelected = config.spiceLevel === level.id;
                                                                                return (
                                                                                    <Box
                                                                                        key={level.id}
                                                                                        onClick={() => setItemSelectorConfigs(prev => ({ ...prev, [item._id]: { ...config, spiceLevel: level.id } }))}
                                                                                        sx={{
                                                                                            flex: 1,
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            gap: 1,
                                                                                            py: 1,
                                                                                            px: { xs: 1, sm: 2 },
                                                                                            borderRadius: '8px',
                                                                                            cursor: 'pointer',
                                                                                            border: `1.5px solid ${isSelected ? '#1a3353' : alpha('#1a3353', 0.15)}`,
                                                                                            bgcolor: isSelected ? '#1a3353' : 'white',
                                                                                            color: isSelected ? 'white' : '#1a3353',
                                                                                            transition: 'all 0.2s',
                                                                                            '&:hover': {
                                                                                                bgcolor: isSelected ? '#1a3353' : alpha('#1a3353', 0.04),
                                                                                                borderColor: '#1a3353',
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        {isSelected ?
                                                                                            <CheckCircle sx={{ fontSize: 18, color: 'white' }} /> :
                                                                                            <RadioButtonUnchecked sx={{ fontSize: 18, color: alpha('#1a3353', 0.3) }} />
                                                                                        }
                                                                                        <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 500, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                                                            {level.label}
                                                                                        </Typography>
                                                                                    </Box>
                                                                                );
                                                                            })}
                                                                        </Stack>
                                                                    </Box>
                                                                )}

                                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 2, mt: 0.5 }}>
                                                                    {/* <FormControl size="small" sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: 300 } }}>
                                                                        <InputLabel shrink>Cook</InputLabel>
                                                                        <Select
                                                                            value={config.cook}
                                                                            label="Cook"
                                                                            displayEmpty
                                                                            notched
                                                                            onChange={(e) => setItemSelectorConfigs(prev => ({ ...prev, [item._id]: { ...config, cook: e.target.value } }))}
                                                                            sx={{ bgcolor: 'white' }}
                                                                        >
                                                                            <MenuItem value=""><em>Select Cook</em></MenuItem>
                                                                            {cooks.map(c => <MenuItem key={c._id} value={c._id}>{c.firstName} {c.lastName}</MenuItem>)}
                                                                        </Select>
                                                                    </FormControl> */}
                                                                    {hasTrays && (
                                                                        <Button
                                                                            size="small"
                                                                            variant="outlined"
                                                                            startIcon={<Add />}
                                                                            onClick={() => handleAddItemRow(item._id)}
                                                                            sx={{
                                                                                borderStyle: 'dashed',
                                                                                borderColor: type.color,
                                                                                color: type.color,
                                                                                px: 2,
                                                                                height: 38,
                                                                                '&:hover': { bgcolor: alpha(type.color, 0.05), borderStyle: 'solid' }
                                                                            }}
                                                                        >
                                                                            Add More Trays
                                                                        </Button>
                                                                    )}
                                                                </Box>
                                                            </Stack>
                                                        </Box>
                                                    )}
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    ))}
                </Box>

                {/* Pagination Controls */}
                {(menuNextCursor || menuPrevCursors.length > 0) && (
                    <Box display="flex" justifyContent="center" alignItems="center" gap={2} mt={2} pt={2} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={isMenuLoading || menuPrevCursors.length === 0}
                            onClick={handleMenuPrev}
                        >
                            Previous
                        </Button>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {isMenuLoading ? 'Loading...' : 'Page results'}
                        </Typography>
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={isMenuLoading || !menuNextCursor}
                            onClick={handleMenuNext}
                        >
                            Next
                        </Button>
                    </Box>
                )}

                {/* Confirm button at bottom */}
                <Box display="flex" justifyContent="flex-end" mt={2}>
                    <Button
                        variant="contained"
                        size="medium"
                        onClick={handleFinalizeItems}
                        sx={{ bgcolor: '#4F46E5', '&:hover': { bgcolor: '#4F46E6' }, px: 3, fontWeight: 700 }}
                    >
                        Confirm Order
                    </Button>
                </Box>
            </Box>
        );
    };

    const handleRemoveItem = (index: number) => {
        setNewOrder(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleAddAdminCustomItem = () => {
        const name = adminCustomItemName.trim();
        if (!name) { toast.error('Please enter a custom item name'); return; }
        if (adminCustomItemQty < 1) { toast.error('Quantity must be at least 1'); return; }
        if (adminCustomItemPrice < 0) { toast.error('Price cannot be negative'); return; }
        const total = adminCustomItemPrice * adminCustomItemQty;
        setNewOrder(prev => ({
            ...prev,
            items: [...prev.items, {
                menuItem: '',
                name,
                quantity: adminCustomItemQty,
                unitPrice: adminCustomItemPrice,
                total,
                isCustom: true,
            }]
        }));
        toast.success(`"${name}" added to order`);
        setAdminCustomItemName('');
        setAdminCustomItemQty(1);
        setAdminCustomItemPrice(0);
    };

    const handleCreateOrder = async () => {
        if (creating) return;

        // Trigger validation
        const isPhoneValid = newOrder.customerPhone.length === 10;
        const isNameValid = !!newOrder.customerName;
        const isEmailValid = !newOrder.customerEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newOrder.customerEmail);
        const isDateValid = !!newOrder.requiredDate;
        const isOccasionValid = !!newOrder.occasion;
        const isOccasionDateValid = !!newOrder.occasionDate;
        const isOccasionNameRequired = newOrder.occasion?.toLowerCase().includes('birthday') ||
            newOrder.occasion?.toLowerCase().includes('anniversary') ||
            newOrder.occasion?.toLowerCase().includes('wedding');
        const isOccasionNameValid = !isOccasionNameRequired || !!newOrder.occasionPersonName?.trim();

        if (!isNameValid || !isPhoneValid || !isEmailValid || !isDateValid || !isOccasionValid || !isOccasionDateValid || !isOccasionNameValid) {
            if (!isOccasionValid) setOccasionTouched(true);
            setNameTouched(true);
            setPhoneTouched(true);
            setEmailTouched(true);
            setFormSubmitted(true);
            return;
        }

        if (newOrder.items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        if (newOrder.serviceType === 'delivery_service') {
            if (!newOrder.address.trim() || !newOrder.city.trim() || !newOrder.state.trim() || !newOrder.county.trim() || !newOrder.country.trim() || !newOrder.zipCode.trim()) {
                toast.error('Please fill in all delivery address details');
                return;
            }
        }

        setCreating(true);
        try {
            const currentSubtotal = newOrder.items.reduce((sum, item) => sum + (item.total || 0), 0);
            const defaultTaxRate = settings.restaurant?.taxRate || 0;
            let currentDiscountAmt = 0;
            if (newOrder.discount.type === 'percentage') {
                currentDiscountAmt = (currentSubtotal * (newOrder.discount.value || 0)) / 100;
            } else {
                currentDiscountAmt = newOrder.discount.value || 0;
            }
            const currentTaxable = Math.max(0, currentSubtotal - currentDiscountAmt);
            
            // Use Dynamic Tax if available, otherwise fallback to static
            const taxAmount = (taxDetails?.taxAmount ?? taxDetails?.amount_to_collect ?? taxDetails?.total_tax ?? (currentTaxable * defaultTaxRate / 100));
            const totalAmount = currentTaxable + taxAmount;

            const payload = {
                ...newOrder,
                subtotal: currentSubtotal,
                tax: {
                    rate: taxDetails?.taxRate !== undefined ? (taxDetails.taxRate * 100) : defaultTaxRate,
                    amount: taxAmount,
                    breakdown: taxDetails?.details || taxDetails?.jurisdictions || null
                },
                totalAmount,
                location: {
                    address: newOrder.address,
                    city: newOrder.city,
                    state: newOrder.state,
                    county: newOrder.county,
                    country: newOrder.country,
                    zipCode: newOrder.zipCode,
                    latitude: newOrder.latitude,
                    longitude: newOrder.longitude,
                    googleMapsLink: newOrder.googleMapsLink
                }
            };

            // Construct Commission Object
            if (commissionData.enabled) {
                let commissionPayload: any = {
                    commissionType: commissionData.type,
                    notes: commissionData.notes
                };

                if (commissionData.type === 'fixed') {
                    commissionPayload.commissionAmount = parseFloat(commissionData.amount.toString());
                } else {
                    commissionPayload.commissionPercentage = parseFloat(commissionData.percentage.toString());
                }

                if (commissionData.referenceType === 'internal_team') {
                    if (!commissionData.intUser) {
                        toast.error('Please select an internal team member');
                        return;
                    }
                    commissionPayload.reference = {
                        type: 'internal_team',
                        name: `${commissionData.intUser.firstName} ${commissionData.intUser.lastName}`,
                        userId: commissionData.intUser._id,
                        notes: commissionData.intNotes
                    };
                } else {
                    // External
                    if (!commissionData.extName) {
                        toast.error('External reference name is required');
                        return;
                    }
                    commissionPayload.reference = {
                        type: 'external_customer',
                        name: commissionData.extName,
                        contact: commissionData.extContact,
                        dialCode: commissionData.extDialCode,
                        email: commissionData.extEmail,
                        notes: commissionData.extNotes,
                        customerId: commissionData.extCustomer?._id
                    };
                }
                // Add to payload
                (payload as any).commission = commissionPayload;
            }

            await cateringAPI.create(payload);
            toast.success('Catering order created successfully');
            setCreateDialogOpen(false);
            setNewOrder({
                customerName: '',
                customerPhone: '',
                dialCode: '1',
                customerEmail: '',
                requiredDate: '',
                occasion: '',
                occasionDate: '',
                serviceType: 'takeaway',
                guests: {
                    adults: { veg: 0, nonVeg: 0 },
                    kids: { veg: 0, nonVeg: 0 }
                },
                address: '',
                city: '',
                state: '',
                county: '',
                country: '',
                zipCode: '',
                latitude: null,
                longitude: null,
                googleMapsLink: '',
                items: [],
                notes: '',
                additionalServices: '',
                discount: { type: 'percentage', value: 0 },
                advanceReceived: 0,
                payments: [],
                processingPerson: getUserFullName(),
                occasionPersonName: ''
            });
            // Reset Commission Data
            setCommissionData({
                enabled: false,
                type: 'fixed',
                amount: 0,
                percentage: 0,
                referenceType: 'external_customer',
                extCustomer: null,
                extName: '',
                extContact: '',
                extEmail: '',
                extNotes: '',
                intUser: null,
                intNotes: '',
                notes: ''
            });
            setNameTouched(false);
            setPhoneTouched(false);
            setEmailTouched(false);
            setFormSubmitted(false);
            setPage(0); // Reset to first page to see the new order
            fetchOrders();
        } catch (error) {
            console.error('Error creating order:', error);
            toast.error('Failed to create order');
        } finally {
            setCreating(false);
        }
    };

    const getStatusChip = (status: string) => {
        let color: any = 'default';
        if (status === 'confirmed' || status === 'ready') color = 'primary';
        if (status === 'completed') color = 'success';
        if (status === 'cancelled') color = 'error';
        if (status === 'pending') color = 'warning';
        return <Chip label={status.toUpperCase()} color={color} size="small" />;
    };

    return (
        <Box p={3}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2} gap={2}>
                <Typography
                    variant="h4"
                    fontWeight="bold"
                    sx={{
                        whiteSpace: isMobile ? 'nowrap' : 'normal',
                        fontSize: { xs: 'clamp(1.75rem, 7vw, 2.5rem)', md: '2.125rem' },
                        overflow: isMobile ? 'hidden' : 'visible',
                        textOverflow: isMobile ? 'ellipsis' : 'clip',
                        width: isMobile ? '100%' : 'auto',
                        textAlign: isMobile ? 'center' : 'left'
                    }}
                >
                    Catering Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    fullWidth={false}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                    onClick={() => {
                        // Reset all form state before opening
                        setNewOrder({
                            customerName: '',
                            customerPhone: '',
                            dialCode: '1',
                            customerEmail: '',
                            requiredDate: '',
                            occasion: '',
                            occasionDate: '',
                            serviceType: 'takeaway',
                            guests: { adults: { veg: 0, nonVeg: 0 }, kids: { veg: 0, nonVeg: 0 } },
                            address: '',
                            city: '',
                            state: '',
                            county: '',
                            country: '',
                            zipCode: '',
                            latitude: null,
                            longitude: null,
                            googleMapsLink: '',
                            items: [],
                            notes: '',
                            additionalServices: '',
                            discount: { type: 'percentage', value: 0 },
                            advanceReceived: 0,
                            payments: [],
                            processingPerson: getUserFullName(),
                            occasionPersonName: ''
                        });
                        setCommissionData({
                            enabled: false,
                            type: 'fixed',
                            amount: 0,
                            percentage: 0,
                            referenceType: 'external_customer',
                            extCustomer: null,
                            extName: '',
                            extContact: '',
                            extEmail: '',
                            extNotes: '',
                            intUser: null,
                            intNotes: '',
                            notes: ''
                        });
                        setItemSelection({ menuItem: null, trayId: '', quantity: 1 });
                        setNameTouched(false);
                        setPhoneTouched(false);
                        setEmailTouched(false);
                        setOccasionTouched(false);
                        setFormSubmitted(false);
                        setActiveStep(0);
                        setCreateDialogOpen(true);
                    }}
                >
                    New Catering Order
                </Button>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            ) : orders.length === 0 ? (
                <Box textAlign="center" p={4}>
                    <Typography color="textSecondary">No catering orders found</Typography>
                </Box>
            ) : isMobile ? (
                // Mobile Card View
                <Stack spacing={2}>
                    {orders.map((order) => (
                        <Card key={order._id}>
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        #{order.orderNumber}
                                    </Typography>
                                    {getStatusChip(order.status)}
                                </Stack>

                                <Grid container spacing={1} mb={2}>
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2">{order.customerName}</Typography>
                                        <Typography variant="caption" color="textSecondary">{order.customerPhone}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary">Required Date</Typography>
                                        <Typography variant="body2">{new Date(order.requiredDate).toLocaleDateString()}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary">Type</Typography>
                                        <Typography variant="body2">
                                            {getServiceTypeLabel(order.serviceType)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="textSecondary">Total Amount</Typography>
                                        <Typography variant="body1" fontWeight="bold" color="primary">
                                            {formatCurrency(order.totalAmount)}
                                        </Typography>
                                    </Grid>
                                </Grid>

                                <Stack direction="column" spacing={1} alignItems="flex-end" sx={{ mt: 1, borderTop: 1, borderColor: 'divider', pt: 2 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Button
                                            size="small"
                                            startIcon={<Visibility />}
                                            onClick={() => { setSelectedOrder(order); setViewDialogOpen(true); }}
                                            sx={{ color: '#7c3aed' }} // Violet
                                        >
                                            Details
                                        </Button>
                                        {order.status === 'pending' && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                startIcon={<CheckCircle />}
                                                onClick={() => handleUpdateStatus(order._id, 'confirmed')}
                                                sx={{
                                                    bgcolor: '#10b981',
                                                    '&:hover': { bgcolor: '#059669' } // Emerald for confirm
                                                }}
                                            >
                                                Confirm
                                            </Button>
                                        )}
                                        {order.status === 'confirmed' && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                startIcon={<CheckCircle />}
                                                onClick={() => handleUpdateStatus(order._id, 'completed')}
                                                sx={{
                                                    bgcolor: '#3730a3',
                                                    '&:hover': { bgcolor: '#312e81' } // Indigo for complete
                                                }}
                                            >
                                                Complete
                                            </Button>
                                        )}
                                    </Stack>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<Assignment />}
                                        onClick={() => handleViewRequirements(order._id)}
                                        sx={{
                                            bgcolor: '#db2777',
                                            '&:hover': { bgcolor: '#be185d' } // Pink/Rose
                                        }}
                                    >
                                        Inventory Estimation
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            ) : (
                // Desktop Table View
                <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: theme.palette.mode === 'light' ? '#f5f5f5' : alpha(theme.palette.primary.main, 0.05) }}>
                            <TableRow>
                                <TableCell><strong>Order #</strong></TableCell>
                                <TableCell><strong>Customer</strong></TableCell>
                                <TableCell><strong>Required Date</strong></TableCell>
                                <TableCell><strong>Type</strong></TableCell>
                                <TableCell><strong>Total Amount</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell align="center"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order._id} hover>
                                    <TableCell>{order.orderNumber}</TableCell>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">{order.customerName}</Typography>
                                            <Typography variant="caption" color="textSecondary">{order.customerPhone}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{new Date(order.requiredDate).toLocaleString()}</TableCell>
                                    <TableCell>{getServiceTypeLabel(order.serviceType)}</TableCell>
                                    <TableCell>
                                        {formatCurrency(order.totalAmount)}
                                    </TableCell>
                                    <TableCell>{getStatusChip(order.status)}</TableCell>
                                    <TableCell align="center">
                                        <Box display="flex" justifyContent="center" alignItems="center" gap={0.5} flexWrap="wrap">
                                            <Tooltip title="View Details">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => { setSelectedOrder(order); setViewDialogOpen(true); }}
                                                    sx={{ color: '#7c3aed', bgcolor: alpha('#7c3aed', 0.08), '&:hover': { bgcolor: alpha('#7c3aed', 0.18) }, borderRadius: 1.5 }}
                                                >
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {order.status === 'pending' && (
                                                <Tooltip title="Confirm Order">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleUpdateStatus(order._id, 'confirmed')}
                                                        sx={{ color: '#10b981', bgcolor: alpha('#10b981', 0.08), '&:hover': { bgcolor: alpha('#10b981', 0.18) }, borderRadius: 1.5 }}
                                                    >
                                                        <CheckCircle fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {order.status === 'confirmed' && (
                                                <Tooltip title="Mark Complete">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleUpdateStatus(order._id, 'completed')}
                                                        sx={{ color: '#3730a3', bgcolor: alpha('#3730a3', 0.08), '&:hover': { bgcolor: alpha('#3730a3', 0.18) }, borderRadius: 1.5 }}
                                                    >
                                                        <CheckCircle fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Inventory Estimation">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleViewRequirements(order._id)}
                                                    sx={{ color: '#db2777', bgcolor: alpha('#db2777', 0.08), '&:hover': { bgcolor: alpha('#db2777', 0.18) }, borderRadius: 1.5 }}
                                                >
                                                    <Assignment fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Pagination */}
            {!loading && orders.length > 0 && (
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(event, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(parseInt(event.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    sx={{ mt: 2 }}
                />
            )}

            {/* Inventory Requirements Dialog */}
            <Dialog open={reqDialogOpen} onClose={() => setReqDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Inventory Estimation Report
                    <IconButton
                        onClick={() => setReqDialogOpen(false)}
                        size="small"
                        sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            width: 24,
                            height: 24,
                            '&:hover': { bgcolor: 'error.dark' }
                        }}
                    >
                        <Close sx={{ fontSize: '1rem' }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {reqLoading ? (
                        <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
                    ) : requirements ? (
                        <Box>
                            <Typography variant="subtitle1" gutterBottom>
                                <strong>For Order:</strong> {requirements.orderNumber}
                            </Typography>
                            {requirements.occasion && (
                                <Typography variant="subtitle1" gutterBottom>
                                    <strong>Occasion:</strong> {requirements.occasion}
                                </Typography>
                            )}
                            <Typography variant="subtitle1" gutterBottom>
                                <strong>Required Date:</strong> {new Date(requirements.requiredDate || requirements.date || Date.now()).toLocaleString()}
                            </Typography>

                            {requirements.missingRecipes && requirements.missingRecipes.length > 0 && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    <strong>Missing Recipes:</strong> The following items do not have linked recipes, so their ingredients are not included in this report:
                                    <ul style={{ margin: '8px 0 0 20px' }}>
                                        {requirements.missingRecipes.map((name: string, i: number) => (
                                            <li key={i}>{name}</li>
                                        ))}
                                    </ul>
                                </Alert>
                            )}

                            <Divider sx={{ my: 2 }} />

                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: theme.palette.mode === 'light' ? '#eee' : alpha(theme.palette.primary.main, 0.1) }}>
                                        <TableRow>
                                            <TableCell><strong>Ingredient / Item</strong></TableCell>
                                            <TableCell align="right"><strong>Qty Needed</strong></TableCell>
                                            <TableCell align="right"><strong>Current Stock</strong></TableCell>
                                            <TableCell align="right"><strong>Unit Cost</strong></TableCell>
                                            <TableCell align="right"><strong>Total Cost</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {requirements.items.map((item: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">{item.name}</Typography>
                                                    {item.breakdown && item.breakdown.length > 0 && (
                                                        <Box mt={0.5}>
                                                            {item.breakdown.map((d: any, idx: number) => (
                                                                <Typography key={idx} variant="caption" display="block" color="textSecondary">
                                                                    {d.name} ({d.qty} x {d.perUnit.toFixed(3)} {item.unit}) = {d.total.toFixed(2)} {item.unit}
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">{item.quantityNeeded.toFixed(2)} {item.unit}</TableCell>
                                                <TableCell align="right" sx={{ color: item.currentStock < item.quantityNeeded ? 'error.main' : 'success.main' }}>
                                                    {item.currentStock.toFixed(2)} {item.unit}
                                                </TableCell>
                                                <TableCell align="right">{formatCurrency(item.costPerUnit)}</TableCell>
                                                <TableCell align="right">{formatCurrency(item.totalCost)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Box display="flex" justifyContent="flex-end" mt={3} p={2} bgcolor={theme.palette.mode === 'light' ? '#f9f9f9' : alpha(theme.palette.background.paper, 0.5)} borderRadius={1}>
                                <Typography variant="h6">
                                    Total Estimated Cost: <strong>{formatCurrency(requirements.totalEstimatedCost)}</strong>
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        <Typography>No requirements data found.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReqDialogOpen(false)}>Close</Button>
                    <Button variant="contained" onClick={() => window.print()}>Print Report</Button>
                </DialogActions>
            </Dialog>

            {/* Order Details Dialog */}
            <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Order Details
                    <IconButton
                        onClick={() => setViewDialogOpen(false)}
                        size="small"
                        sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            width: 24,
                            height: 24,
                            '&:hover': { bgcolor: 'error.dark' }
                        }}
                    >
                        <Close sx={{ fontSize: '1rem' }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedOrder && (
                        <Box>
                            <Tabs
                                value={dialogTab}
                                onChange={(e, newValue) => setDialogTab(newValue)}
                                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                            >
                                <Tab label="Order Details" />
                                <Tab label="Action History" />
                                <Tab
                                    label="Chat Support"
                                    disabled={
                                        selectedOrder.status === 'completed' ||
                                        selectedOrder.status === 'cancelled' ||
                                        (selectedOrder.requiredDate && new Date(selectedOrder.requiredDate) < new Date())
                                    }
                                />
                            </Tabs>

                            {dialogTab === 0 && (
                                <Box>
                                    {!isEditing ? (
                                        <Box>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="subtitle2">Customer Info</Typography>
                                                    <Typography>{selectedOrder.customerName}</Typography>
                                                    <Typography>{selectedOrder.customerPhone}</Typography>
                                                    {selectedOrder.occasionDate && (
                                                        <Typography variant="body2" sx={{ mt: 1 }}>
                                                            <strong>Occasion Date:</strong> {new Date(selectedOrder.occasionDate).toLocaleDateString()}
                                                        </Typography>
                                                    )}
                                                    <Typography>{selectedOrder.customerEmail}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="subtitle2">Order Info</Typography>
                                                    <Typography><strong>#:</strong> {selectedOrder.orderNumber}</Typography>
                                                    <Typography><strong>Service:</strong> {getServiceTypeLabel(selectedOrder.serviceType)}</Typography>
                                                    <Typography><strong>Occasion:</strong> {selectedOrder.occasion || 'N/A'}</Typography>
                                                    {selectedOrder.occasionPersonName && (
                                                        <Typography>
                                                            <strong>Occasion Holder :</strong> {selectedOrder.occasionPersonName}
                                                        </Typography>
                                                    )}
                                                    <Typography><strong>Date:</strong> {new Date(selectedOrder.requiredDate).toLocaleString()}</Typography>
                                                    <Typography><strong>Status:</strong> {getStatusChip(selectedOrder.status)}</Typography>
                                                </Grid>

                                                {selectedOrder.guests && (
                                                    <Grid item xs={12}>
                                                        <Typography variant="subtitle2" gutterBottom>Guest Requirements</Typography>
                                                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                                                            <Table size="small">
                                                                <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                                                    <TableRow>
                                                                        <TableCell sx={{ fontWeight: 'bold' }}>Guests</TableCell>
                                                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Veg</TableCell>
                                                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Non-Veg</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    <TableRow>
                                                                        <TableCell sx={{ fontWeight: 'bold' }}>Adults</TableCell>
                                                                        <TableCell align="center">{selectedOrder.guests.adults?.veg || 0}</TableCell>
                                                                        <TableCell align="center">{selectedOrder.guests.adults?.nonVeg || 0}</TableCell>
                                                                    </TableRow>
                                                                    <TableRow>
                                                                        <TableCell sx={{ fontWeight: 'bold' }}>Kids</TableCell>
                                                                        <TableCell align="center">{selectedOrder.guests.kids?.veg || 0}</TableCell>
                                                                        <TableCell align="center">{selectedOrder.guests.kids?.nonVeg || 0}</TableCell>
                                                                    </TableRow>
                                                                </TableBody>
                                                            </Table>
                                                        </TableContainer>
                                                    </Grid>
                                                )}

                                                {(selectedOrder.serviceType === 'delivery_service' || selectedOrder.serviceType === 'delivery') && (
                                                    <Grid item xs={12}>
                                                        <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: theme.palette.mode === 'light' ? '#f0f7ff' : alpha(theme.palette.info.main, 0.05) }}>
                                                            <Typography variant="subtitle2" gutterBottom>Delivery Location</Typography>
                                                            <Grid container spacing={2}>
                                                                <Grid item xs={12} md={(selectedOrder.location?.latitude && selectedOrder.location?.longitude) ? 6 : 12}>
                                                                    <Typography>{selectedOrder.location?.address}</Typography>
                                                                    {(selectedOrder.location?.city || selectedOrder.location?.state) && (
                                                                        <Typography>
                                                                            {[selectedOrder.location?.city, selectedOrder.location?.state, selectedOrder.location?.county, selectedOrder.location?.zipCode].filter(Boolean).join(', ')}
                                                                        </Typography>
                                                                    )}
                                                                    {selectedOrder.location?.country && (
                                                                        <Typography>{selectedOrder.location.country}</Typography>
                                                                    )}
                                                                    {(selectedOrder.location?.latitude || selectedOrder.location?.longitude) && (
                                                                        <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                                                                            Coordinates: {selectedOrder.location.latitude}, {selectedOrder.location.longitude}
                                                                        </Typography>
                                                                    )}
                                                                </Grid>
                                                            </Grid>
                                                        </Paper>
                                                    </Grid>
                                                )}
                                            </Grid>

                                            <Divider sx={{ my: 2 }} />

                                            <Typography variant="h6" gutterBottom>Items</Typography>
                                            <List>
                                                {selectedOrder.items.map((item: any, i: number) => (
                                                    <ListItem key={i} divider>
                                                        <ListItemText
                                                            primary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                    {item.name}
                                                                    {item.spiceLevel && (
                                                                        <Chip
                                                                            size="small"
                                                                            label={SPICE_LEVELS.find(l => l.id === item.spiceLevel)?.label || item.spiceLevel}
                                                                            variant="outlined"
                                                                            sx={{ ml: 1, height: 18, fontSize: '0.6rem', color: '#e65100', borderColor: '#ffb74d' }}
                                                                        />
                                                                    )}
                                                                </Box>
                                                            }
                                                            secondary={`${formatCurrency(item.unitPrice)} x ${item.quantity}`}
                                                        />
                                                        <Typography fontWeight="bold">{formatCurrency(item.total)}</Typography>
                                                    </ListItem>
                                                ))}
                                            </List>

                                            <Grid container spacing={2} sx={{ mt: 2 }}>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Payment Details</Typography>
                                                    {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                                                        <List>
                                                            {selectedOrder.payments.map((payment: any, idx: number) => (
                                                                <ListItem key={idx} disablePadding sx={{ py: 0.5 }}>
                                                                    <Typography variant="body2">
                                                                        <strong>{formatCurrency(payment.amount)}</strong> via {payment.method?.toUpperCase()} on {new Date(payment.timestamp).toLocaleDateString()}
                                                                        {payment.notes && ` (${payment.notes})`}
                                                                    </Typography>
                                                                </ListItem>
                                                            ))}
                                                        </List>
                                                    ) : (
                                                        <Typography variant="body2">No payments recorded</Typography>
                                                    )}

                                                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 2 }}>Additional Services</Typography>
                                                    <Typography variant="body2">{selectedOrder.additionalServices || 'No additional services'}</Typography>
                                                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 1 }}>Processing Person</Typography>
                                                    <Typography variant="body2">{selectedOrder.processingPerson || 'N/A'}</Typography>
                                                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 1 }}>Internal Notes</Typography>
                                                    <Typography variant="body2">{selectedOrder.notes || 'None'}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Box display="flex" flexDirection="column" alignItems="flex-end">
                                                        <Typography variant="body2">Subtotal: {formatCurrency(selectedOrder.subtotal || 0)}</Typography>
                                                        {selectedOrder.discount?.value > 0 && (
                                                            <Typography variant="body2" color="error">
                                                                Discount ({selectedOrder.discount.type === 'percentage' ? `${selectedOrder.discount.value}%` : formatCurrency(selectedOrder.discount.value)}):
                                                                -{formatCurrency(selectedOrder.discount.type === 'percentage' ? (selectedOrder.subtotal * selectedOrder.discount.value / 100) : selectedOrder.discount.value)}
                                                            </Typography>
                                                        )}
                                                        <Typography variant="body2">Tax ({selectedOrder.tax?.rate || 0}%): {formatCurrency(selectedOrder.tax?.amount || 0)}</Typography>
                                                        <Divider sx={{ width: '100%', my: 1 }} />
                                                        <Typography variant="subtitle1" fontWeight="bold">Total: {formatCurrency(selectedOrder.totalAmount || 0)}</Typography>
                                                        <Typography variant="body2" color="success.main">Advance Paid: {formatCurrency(selectedOrder.advanceReceived || 0)}</Typography>
                                                        <Typography variant="h6" color="error.main" fontWeight="bold">Balance Due: {formatCurrency(Math.max(0, (selectedOrder.totalAmount || 0) - (selectedOrder.advanceReceived || 0)))}</Typography>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    ) : (
                                        <Box>
                                            <Alert severity="info" sx={{ mb: 2 }}>You are in edit mode. Totals will be recalculated upon saving.</Alert>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 2, mb: 1 }}>
                                                        <Autocomplete
                                                            freeSolo
                                                            fullWidth
                                                            size="small"
                                                            options={occasionsList}
                                                            value={editData.occasion || ''}
                                                            inputValue={occasionInputValue}
                                                            onInputChange={(e, newValue) => setOccasionInputValue(newValue)}
                                                            onChange={(e, newValue) => {
                                                                setEditData({ ...editData, occasion: newValue || '' });
                                                            }}
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    label="Occasion"
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
                                                                height: 40,
                                                                borderTopLeftRadius: 0,
                                                                borderBottomLeftRadius: 0,
                                                                boxShadow: 'none',
                                                                px: 0
                                                            }}
                                                        >
                                                            <Add />
                                                        </Button>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        fullWidth
                                                        label="Occasion Date"
                                                        type="date"
                                                        required
                                                        value={editData.occasionDate ? new Date(editData.occasionDate).toISOString().split('T')[0] : ''}
                                                        inputProps={{
                                                            min: new Date().toISOString().split('T')[0]
                                                        }}
                                                        onChange={(e) => setEditData({ ...editData, occasionDate: e.target.value })}
                                                        margin="normal"
                                                        size="small"
                                                        InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }}
                                                    />
                                                </Grid>
                                                {(editData.occasion?.toLowerCase().includes('birthday') || editData.occasion?.toLowerCase().includes('anniversary') || editData.occasion?.toLowerCase().includes('wedding')) && (
                                                    <Grid item xs={12} sm={6}>
                                                        <TextField
                                                            label={
                                                                editData.occasion?.toLowerCase().includes('birthday') ? "Whose Birthday?" :
                                                                    editData.occasion?.toLowerCase().includes('wedding') && !editData.occasion?.toLowerCase().includes('anniversary') ? "Whose Wedding?" :
                                                                        "Whose Anniversary?"
                                                            }
                                                            fullWidth
                                                            size="small"
                                                            required
                                                            placeholder="Example: John's"
                                                            value={editData.occasionPersonName || ''}
                                                            onChange={(e) => setEditData({ ...editData, occasionPersonName: e.target.value })}
                                                            margin="normal"
                                                            InputLabelProps={{ sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }}
                                                        />
                                                    </Grid>
                                                )}
                                                {/* <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        fullWidth
                                                        label="Required Date & Time"
                                                        type="datetime-local"
                                                        value={editData.requiredDate ? new Date(new Date(editData.requiredDate).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                                                        onChange={(e) => setEditData({ ...editData, requiredDate: e.target.value })}
                                                        margin="normal"
                                                        size="small"
                                                        InputLabelProps={{ shrink: true }}
                                                    />
                                                </Grid> */}
                                            </Grid>

                                            <Divider sx={{ my: 2 }} />

                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Typography variant="h6">Edit Items</Typography>
                                            </Box>

                                            <TableContainer component={Paper} variant="outlined">
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>Item Name</TableCell>
                                                            <TableCell align="center">Quantity</TableCell>
                                                            <TableCell align="right">Base / Unit Price</TableCell>
                                                            <TableCell align="right">Total</TableCell>
                                                            <TableCell align="center">Action</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {editData.items.map((item: any, i: number) => (
                                                            <TableRow key={i}>
                                                                <TableCell>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                        {item.name}
                                                                        {item.spiceLevel && (
                                                                            <Chip
                                                                                size="small"
                                                                                label={SPICE_LEVELS.find(l => l.id === item.spiceLevel)?.label || item.spiceLevel}
                                                                                variant="outlined"
                                                                                sx={{ ml: 1, height: 18, fontSize: '0.6rem', color: '#e65100', borderColor: '#ffb74d' }}
                                                                            />
                                                                        )}
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    <TextField
                                                                        type="number"
                                                                        size="small"
                                                                        inputProps={{ min: 0, step: "0.01" }}
                                                                        value={item.quantity}
                                                                        onChange={(e) => handleUpdateEditItemQty(i, parseFloat(e.target.value) || 0)}
                                                                        sx={{ width: 80 }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    {item.basePrice && <Typography variant="caption" display="block">B: {formatCurrency(item.basePrice)}</Typography>}
                                                                    {item.isCustom ? (
                                                                        <TextField
                                                                            type="number"
                                                                            size="small"
                                                                            inputProps={{ min: 0, step: "0.01" }}
                                                                            value={item.unitPrice}
                                                                            onChange={(e) => handleUpdateEditItemPrice(i, parseFloat(e.target.value) || 0)}
                                                                            sx={{ width: 80 }}
                                                                        />
                                                                    ) : (
                                                                        <Typography variant="body2">{formatCurrency(item.unitPrice)}</Typography>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                                                                <TableCell align="center">
                                                                    <IconButton color="error" size="small" onClick={() => handleRemoveItemFromEdit(i)}>
                                                                        <Cancel fontSize="small" />
                                                                    </IconButton>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>

                                            <Box sx={{ mt: 2, p: 2, border: '1px dashed grey', borderRadius: 1 }}>
                                                <Typography variant="subtitle2" gutterBottom>Add More Items</Typography>
                                                <TextField
                                                    fullWidth
                                                    placeholder="Search to add items..."
                                                    size="small"
                                                    value={itemSearch}
                                                    onChange={(e) => setItemSearch(e.target.value)}
                                                    sx={{ mb: 1 }}
                                                />
                                                {itemSearch && renderItemSelector()}
                                            </Box>

                                            <Box sx={{ mt: 3 }}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                    <Typography variant="h6">Payment Details</Typography>
                                                    <Button size="small" variant="outlined" onClick={handleAddPaymentToEdit}>
                                                        Add Payment
                                                    </Button>
                                                </Box>
                                                <TableContainer component={Paper} variant="outlined">
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Amount</TableCell>
                                                                <TableCell>Method</TableCell>
                                                                <TableCell>Date</TableCell>
                                                                <TableCell>Notes</TableCell>
                                                                <TableCell align="center">Action</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {(editData.payments || []).map((payment: any, idx: number) => (
                                                                <TableRow key={idx}>
                                                                    <TableCell>
                                                                        <TextField
                                                                            type="number"
                                                                            size="small"
                                                                            inputProps={{ min: 0, step: "0.01" }}
                                                                            value={payment.amount}
                                                                            onChange={(e) => handleUpdatePaymentFromEdit(idx, 'amount', parseFloat(e.target.value) || 0)}
                                                                            sx={{ width: 100 }}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Select
                                                                            size="small"
                                                                            value={payment.method || 'cash'}
                                                                            onChange={(e) => handleUpdatePaymentFromEdit(idx, 'method', e.target.value)}
                                                                        >
                                                                            {availablePaymentMethods.map(m => (
                                                                                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                                                                            ))}
                                                                        </Select>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <TextField
                                                                            type="date"
                                                                            size="small"
                                                                            value={payment.timestamp ? new Date(payment.timestamp).toISOString().split('T')[0] : ''}
                                                                            onChange={(e) => handleUpdatePaymentFromEdit(idx, 'timestamp', e.target.value)}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <TextField
                                                                            size="small"
                                                                            value={payment.notes || ''}
                                                                            onChange={(e) => handleUpdatePaymentFromEdit(idx, 'notes', e.target.value)}
                                                                            placeholder="Ref/Note"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell align="center">
                                                                        <IconButton color="error" size="small" onClick={() => handleRemovePaymentFromEdit(idx)}>
                                                                            <Cancel fontSize="small" />
                                                                        </IconButton>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                            {(!editData.payments || editData.payments.length === 0) && (
                                                                <TableRow>
                                                                    <TableCell colSpan={5} align="center">
                                                                        <Typography variant="body2" sx={{ py: 2, color: 'text.secondary' }}>
                                                                            No payments recorded for this order.
                                                                        </Typography>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Box>

                                            <Grid container spacing={2} sx={{ mt: 2 }}>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        fullWidth
                                                        label="Additional Services"
                                                        multiline
                                                        rows={2}
                                                        value={editData.additionalServices || ''}
                                                        onChange={(e) => setEditData({ ...editData, additionalServices: e.target.value })}
                                                        margin="normal"
                                                        size="small"
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        fullWidth
                                                        label="Internal Notes"
                                                        multiline
                                                        rows={2}
                                                        value={editData.notes || ''}
                                                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                                        margin="normal"
                                                        size="small"
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        fullWidth
                                                        label="Processing Person"
                                                        value={editData.processingPerson || ''}
                                                        onChange={(e) => setEditData({ ...editData, processingPerson: e.target.value })}
                                                        margin="normal"
                                                        size="small"
                                                    />
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {dialogTab === 1 && (
                                <Box mt={2}>
                                    <ActionHistoryList
                                        history={selectedOrder.actionHistory || []}
                                        emptyMessage="No action history recorded for this catering order."
                                    />
                                </Box>
                            )}

                            {dialogTab === 2 && (
                                <Box mt={2}>
                                    <Paper variant="outlined" sx={{ height: 400, display: 'flex', flexDirection: 'column' }}>
                                        <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                                            {(!selectedOrder.messages || selectedOrder.messages.length === 0) && (
                                                <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>No messages yet.</Typography>
                                            )}
                                            {selectedOrder.messages?.map((msg: any, i: number) => (
                                                <Box key={i} sx={{
                                                    alignSelf: msg.role === 'customer' ? 'flex-start' : 'flex-end',
                                                    maxWidth: '80%',
                                                    bgcolor: msg.role === 'customer' ? 'background.paper' : 'primary.main',
                                                    color: msg.role === 'customer' ? 'text.primary' : 'primary.contrastText',
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    boxShadow: 1
                                                }}>
                                                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.8 }}>
                                                        {msg.sender} ({msg.role}) • {new Date(msg.timestamp).toLocaleString()}
                                                    </Typography>
                                                    <Typography variant="body2">{msg.message}</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                        <Divider />
                                        <Box p={2}>
                                            <Stack direction="row" spacing={1}>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    placeholder={
                                                        (selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled' || (selectedOrder.requiredDate && new Date(selectedOrder.requiredDate) < new Date()))
                                                            ? "Chat is disabled for finalized orders"
                                                            : "Type a message..."
                                                    }
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    onKeyPress={(e) => {
                                                        const isDatePassed = selectedOrder?.requiredDate && new Date(selectedOrder.requiredDate) < new Date();
                                                        const isChatDisabled = selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled' || isDatePassed;
                                                        if (e.key === 'Enter' && !isChatDisabled) handleSendMessage();
                                                    }}
                                                    disabled={selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled' || (selectedOrder.requiredDate && new Date(selectedOrder.requiredDate) < new Date())}
                                                />
                                                <Button
                                                    variant="contained"
                                                    onClick={handleSendMessage}
                                                    disabled={
                                                        !newMessage.trim() ||
                                                        sendingMessage ||
                                                        selectedOrder.status === 'completed' ||
                                                        selectedOrder.status === 'cancelled' ||
                                                        (selectedOrder.requiredDate && new Date(selectedOrder.requiredDate) < new Date())
                                                    }
                                                >
                                                    {sendingMessage ? <CircularProgress size={20} /> : 'Send'}
                                                </Button>
                                            </Stack>
                                        </Box>
                                    </Paper>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                    <Box>
                        {selectedOrder && (
                            <>
                                {!isEditing ? (
                                    <>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleDownloadPDF(selectedOrder._id, selectedOrder.orderNumber)}
                                            startIcon={<Assignment />}
                                            sx={{ mr: 1 }}
                                        >
                                            Download Invoice
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleSendEmail(selectedOrder._id)}
                                            color="secondary"
                                            sx={{ mr: 1 }}
                                        >
                                            Email Receipt
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={handleEditOrder}
                                            color="primary"
                                        >
                                            Edit Order
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={handleSaveUpdate}
                                            color="success"
                                            disabled={updating}
                                            sx={{ mr: 1 }}
                                        >
                                            {updating ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={handleCancelEdit}
                                            color="error"
                                        >
                                            Cancel
                                        </Button>
                                    </>
                                )}
                            </>
                        )}
                    </Box>
                    <Button variant="contained" onClick={() => { setViewDialogOpen(false); setIsEditing(false); }}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Create Order Dialog */}
            <Dialog open={createDialogOpen} onClose={() => { setCreateDialogOpen(false); setActiveStep(0); }} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    New Catering Order
                    <IconButton
                        onClick={() => { setCreateDialogOpen(false); setActiveStep(0); }}
                        size="small"
                        sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            width: 24,
                            height: 24,
                            '&:hover': { bgcolor: 'error.dark' }
                        }}
                    >
                        <Close sx={{ fontSize: '1rem' }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02), p: 2 }}>
                    {(() => {
                        const currentSubtotal = newOrder.items.reduce((sum, item) => sum + (item.total || 0), 0);
                        const defaultTaxRate = settings.restaurant?.taxRate || 0;
                        let currentDiscountAmt = 0;
                        if (newOrder.discount.type === 'percentage') {
                            currentDiscountAmt = (currentSubtotal * (newOrder.discount.value || 0)) / 100;
                        } else {
                            currentDiscountAmt = newOrder.discount.value || 0;
                        }
                        const currentTaxable = Math.max(0, currentSubtotal - currentDiscountAmt);
                        
                        // Use Dynamic Tax if available, otherwise fallback to static
                        const currentTaxAmt = (taxDetails?.taxAmount ?? taxDetails?.amount_to_collect ?? taxDetails?.total_tax ?? (currentTaxable * defaultTaxRate / 100));
                        const currentFinalTotal = currentTaxable + currentTaxAmt;
                        const totalPaid = (newOrder.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                        const currentBalanceDue = Math.max(0, currentFinalTotal - totalPaid);

                        return (
                            <Box>
                                {/* Horizontal Stepper Header */}
                                <Stepper
                                    activeStep={activeStep}
                                    alternativeLabel
                                    sx={{
                                        mb: 2,
                                        pt: 1,
                                        pb: 2,
                                        px: 0.5,
                                        borderRadius: 2,
                                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                                        '& .MuiStepLabel-label': {
                                            fontSize: { xs: '0.6rem', sm: '0.78rem' },
                                            fontWeight: 600,
                                            mt: 0.5,
                                            whiteSpace: 'nowrap',
                                        },
                                        '& .MuiStepLabel-label.Mui-active': { color: 'primary.main', fontWeight: 700 },
                                        '& .MuiStepLabel-label.Mui-completed': { color: 'success.main', fontWeight: 600 },
                                        '& .MuiStepIcon-root': { fontSize: { xs: '1.1rem', sm: '1.5rem' } },
                                        '& .MuiStepIcon-root.Mui-active': { color: 'primary.main', transform: 'scale(1.15)' },
                                        '& .MuiStepIcon-root.Mui-completed': { color: 'success.main' },
                                        '& .MuiStepConnector-line': { borderTopWidth: 2 },
                                        '& .MuiStep-root': { px: { xs: 0.5, sm: 1 } },
                                    }}
                                >
                                    <Step><StepLabel>Customer</StepLabel></Step>
                                    <Step><StepLabel>Details</StepLabel></Step>
                                    <Step><StepLabel>Food</StepLabel></Step>
                                    <Step><StepLabel>Confirm</StepLabel></Step>
                                </Stepper>

                                {/* Step Content Panel */}
                                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, minHeight: 280 }}>

                                    {/* Step 1: Customer Details */}
                                    {activeStep === 0 && (
                                        <Box>
                                            <Typography variant="subtitle2" color="primary" fontWeight={700} mb={2}>
                                                Customer Details
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Customer Name"
                                                        fullWidth
                                                        size="small"
                                                        required
                                                        InputLabelProps={{ sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }}
                                                        value={newOrder.customerName}
                                                        onBlur={() => setNameTouched(true)}
                                                        helperText={nameTouched && !newOrder.customerName ? "Customer name is required" : ""}
                                                        FormHelperTextProps={{ sx: { color: 'error.main' } }}
                                                        onChange={(e) => {
                                                            if (/^[a-zA-Z\s]*$/.test(e.target.value)) {
                                                                setNewOrder({ ...newOrder, customerName: e.target.value })
                                                            }
                                                        }}
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                                        <PhoneInput
                                                            value={newOrder.customerPhone}
                                                            onChange={(val) => {
                                                                const clean = val.replace(/\D/g, '');
                                                                if (clean.length <= 10) {
                                                                    setNewOrder({ ...newOrder, customerPhone: clean });
                                                                }
                                                            }}
                                                            dialCode={newOrder.dialCode || '1'}
                                                            onDialCodeChange={(code) => setNewOrder({ ...newOrder, dialCode: code })}
                                                            label="Phone Number"
                                                            required
                                                            size="small"
                                                            fullWidth
                                                            onBlur={() => setPhoneTouched(true)}
                                                            helperText={
                                                                phoneTouched
                                                                    ? !newOrder.customerPhone
                                                                        ? "Phone number is required"
                                                                        : newOrder.customerPhone.length < 10
                                                                            ? "Phone number must be exactly 10 digits"
                                                                            : ""
                                                                    : ""
                                                            }
                                                            error={phoneTouched && (!newOrder.customerPhone || newOrder.customerPhone.length < 10)}
                                                        />
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <TextField
                                                        label="Email"
                                                        fullWidth
                                                        size="small"
                                                        value={newOrder.customerEmail}
                                                        onBlur={() => setEmailTouched(true)}
                                                        helperText={
                                                            emailTouched && newOrder.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newOrder.customerEmail)
                                                                ? "Please enter a valid email address"
                                                                : ""
                                                        }
                                                        FormHelperTextProps={{ sx: { color: 'error.main' } }}
                                                        onChange={(e) => setNewOrder({ ...newOrder, customerEmail: e.target.value })}
                                                    />
                                                </Grid>
                                            </Grid>
                                            <Box display="flex" justifyContent="flex-end" mt={3}>
                                                <Button
                                                    variant="contained"
                                                    onClick={() => {
                                                        setNameTouched(true);
                                                        setPhoneTouched(true);
                                                        setEmailTouched(true);
                                                        const nameValid = !!newOrder.customerName;
                                                        const phoneValid = newOrder.customerPhone.length === 10;
                                                        const emailValid = !newOrder.customerEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newOrder.customerEmail);
                                                        if (nameValid && phoneValid && emailValid) {
                                                            setActiveStep(1);
                                                        }
                                                    }}
                                                    sx={{ px: 3 }}
                                                >
                                                    Next
                                                </Button>
                                            </Box>
                                        </Box>
                                    )}

                                    {/* Step 2: Catering Details */}
                                    {activeStep === 1 && (
                                        <Box>
                                            <Typography variant="subtitle2" color="primary" fontWeight={700} mb={2}>
                                                Catering Details
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Delivery Date & Time"
                                                        type="datetime-local"
                                                        fullWidth
                                                        size="small"
                                                        required
                                                        InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }}
                                                        value={newOrder.requiredDate}
                                                        inputProps={{
                                                            min: new Date().toISOString().slice(0, 16)
                                                        }}
                                                        helperText={formSubmitted && !newOrder.requiredDate ? "Date & Time is required" : ""}
                                                        FormHelperTextProps={{ sx: { color: 'error.main' } }}
                                                        onChange={(e) => setNewOrder({ ...newOrder, requiredDate: e.target.value })}
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Occasion Date"
                                                        type="date"
                                                        fullWidth
                                                        size="small"
                                                        required
                                                        InputLabelProps={{ shrink: true, sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }}
                                                        value={newOrder.occasionDate}
                                                        inputProps={{
                                                            min: new Date().toISOString().split('T')[0]
                                                        }}
                                                        error={formSubmitted && !newOrder.occasionDate}
                                                        helperText={formSubmitted && !newOrder.occasionDate ? "Occasion Date is required" : ""}
                                                        FormHelperTextProps={{ sx: { color: 'error.main' } }}
                                                        onChange={(e) => setNewOrder({ ...newOrder, occasionDate: e.target.value })}
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                                                        <Autocomplete
                                                            freeSolo
                                                            fullWidth
                                                            size="small"
                                                            options={occasionsList}
                                                            value={newOrder.occasion}
                                                            inputValue={occasionInputValue}
                                                            onInputChange={(e, newValue) => setOccasionInputValue(newValue)}
                                                            onChange={(e, newValue) => {
                                                                setNewOrder({ ...newOrder, occasion: newValue || '' });
                                                                setOccasionTouched(true);
                                                            }}
                                                            onBlur={() => setOccasionTouched(true)}
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    label="Occasion"
                                                                    required
                                                                    error={occasionTouched && !newOrder.occasion}
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            borderTopRightRadius: 0,
                                                                            borderBottomRightRadius: 0
                                                                        }
                                                                    }}
                                                                    InputLabelProps={{
                                                                        ...params.InputLabelProps,
                                                                        sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } }
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
                                                                height: 40,
                                                                borderTopLeftRadius: 0,
                                                                borderBottomLeftRadius: 0,
                                                                boxShadow: 'none',
                                                                px: 0
                                                            }}
                                                        >
                                                            <Add />
                                                        </Button>
                                                    </Box>
                                                </Grid>
                                                {(newOrder.occasion?.toLowerCase().includes('birthday') || newOrder.occasion?.toLowerCase().includes('anniversary') || newOrder.occasion?.toLowerCase().includes('wedding')) && (
                                                    <Grid item xs={12} sm={6}>
                                                        <TextField
                                                            label={
                                                                newOrder.occasion?.toLowerCase().includes('birthday') ? "Whose Birthday?" :
                                                                    newOrder.occasion?.toLowerCase().includes('wedding') && !newOrder.occasion?.toLowerCase().includes('anniversary') ? "Whose Wedding?" :
                                                                        "Whose Anniversary?"
                                                            }
                                                            fullWidth
                                                            size="small"
                                                            required
                                                            placeholder="Example: John's"
                                                            value={newOrder.occasionPersonName || ''}
                                                            error={formSubmitted && !newOrder.occasionPersonName?.trim()}
                                                            helperText={formSubmitted && !newOrder.occasionPersonName?.trim() ? "Name is required" : ""}
                                                            FormHelperTextProps={{ sx: { color: 'error.main' } }}
                                                            InputLabelProps={{ sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }}
                                                            onChange={(e) => {
                                                                if (/^[a-zA-Z\s]*$/.test(e.target.value)) {
                                                                    setNewOrder({ ...newOrder, occasionPersonName: e.target.value })
                                                                }
                                                            }}
                                                        />
                                                    </Grid>
                                                )}
                                                <Grid item xs={12} sm={6}>
                                                    <FormControl fullWidth size="small">
                                                        <InputLabel>Service Type</InputLabel>
                                                        <Select
                                                            value={newOrder.serviceType}
                                                            label="Service Type"
                                                            onChange={(e) => setNewOrder({ ...newOrder, serviceType: e.target.value })}
                                                        >
                                                            <MenuItem value="takeaway">Catering Takeaway</MenuItem>
                                                            <MenuItem value="delivery">Delivery</MenuItem>
                                                            <MenuItem value="delivery_service">Delivery & Service</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Grid>
                                                {(newOrder.serviceType === 'delivery_service' || newOrder.serviceType === 'delivery') && (
                                                    <Grid item xs={12}>
                                                        <AddressAutocomplete
                                                            label="Delivery Address"
                                                            value={newOrder.address}
                                                            onChange={(val) => setNewOrder(prev => ({ ...prev, address: val }))}
                                                            onSelect={(addr) => {
                                                                const mapsLink = `https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`;
                                                                setNewOrder(prev => ({
                                                                    ...prev,
                                                                    address: addr.fullAddress, city: addr.city, state: addr.state, county: addr.county, country: addr.country, zipCode: addr.zipCode, latitude: addr.latitude, longitude: addr.longitude, googleMapsLink: mapsLink
                                                                }));
                                                            }}
                                                            apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                                                        />

                                                        {newOrder.latitude && newOrder.longitude && !mapsAuthError && (
                                                            <Box sx={{ position: 'relative', mt: 2 }}>
                                                                <Box
                                                                    component="iframe"
                                                                    sx={{
                                                                        width: '100%',
                                                                        height: 150,
                                                                        border: 0,
                                                                        borderRadius: 1,
                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                                    }}
                                                                    loading="lazy"
                                                                    allowFullScreen
                                                                    src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${newOrder.latitude},${newOrder.longitude}&zoom=15`}
                                                                />
                                                                <IconButton
                                                                    size="small"
                                                                    sx={{
                                                                        position: 'absolute',
                                                                        top: 4,
                                                                        right: 4,
                                                                        bgcolor: 'rgba(255,255,255,0.7)',
                                                                        '&:hover': { bgcolor: 'white' }
                                                                    }}
                                                                    onClick={() => setMapsAuthError(true)}
                                                                >
                                                                    <Close fontSize="small" />
                                                                </IconButton>
                                                            </Box>
                                                        )}

                                                        <Grid container spacing={2} sx={{ mt: 1 }}>
                                                            <Grid item xs={12} sm={6}>
                                                                <TextField
                                                                    label="City"
                                                                    fullWidth
                                                                    size="small"
                                                                    value={newOrder.city}
                                                                    onChange={(e) => setNewOrder({ ...newOrder, city: e.target.value })}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} sm={6}>
                                                                <TextField
                                                                    label="State"
                                                                    fullWidth
                                                                    size="small"
                                                                    value={newOrder.state}
                                                                    onChange={(e) => setNewOrder({ ...newOrder, state: e.target.value })}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} sm={6}>
                                                                <TextField
                                                                    label="County"
                                                                    fullWidth
                                                                    size="small"
                                                                    value={newOrder.county}
                                                                    onChange={(e) => setNewOrder({ ...newOrder, county: e.target.value })}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} sm={6}>
                                                                <TextField
                                                                    label="Country"
                                                                    fullWidth
                                                                    size="small"
                                                                    value={newOrder.country}
                                                                    onChange={(e) => setNewOrder({ ...newOrder, country: e.target.value })}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} sm={6}>
                                                                <TextField
                                                                    label="Zip Code"
                                                                    fullWidth
                                                                    size="small"
                                                                    value={newOrder.zipCode}
                                                                    onChange={(e) => setNewOrder({ ...newOrder, zipCode: e.target.value })}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12} sm={6}>
                                                                <TextField
                                                                    label="Google Maps Link"
                                                                    fullWidth
                                                                    size="small"
                                                                    value={newOrder.googleMapsLink}
                                                                    onChange={(e) => setNewOrder({ ...newOrder, googleMapsLink: e.target.value })}
                                                                />
                                                            </Grid>
                                                        </Grid>
                                                    </Grid>
                                                )}

                                                <Grid item xs={12}>
                                                    <Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                                            <Typography variant="body2" fontWeight={700} color="text.primary">
                                                                Guest Count
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                (Enter number of guests per category)
                                                            </Typography>
                                                        </Box>
                                                        <TableContainer component={Paper} elevation={0} sx={{ overflow: 'auto' }}>
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', width: '34%', py: 1.4, borderBottom: '1px solid #e0e0e0' }}>
                                                                            Category
                                                                        </TableCell>
                                                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', width: '33%', py: 1.4, borderBottom: '1px solid #e0e0e0' }}>
                                                                            Veg
                                                                        </TableCell>
                                                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase', width: '33%', py: 1.4, borderBottom: '1px solid #e0e0e0' }}>
                                                                            Non-Veg
                                                                        </TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    <TableRow>
                                                                        <TableCell sx={{ py: 1.5 }}>
                                                                            <Typography variant="body2" fontWeight={600}>Adults</Typography>
                                                                        </TableCell>
                                                                        <TableCell align="center" sx={{ py: 1.5 }}>
                                                                            <TextField 
                                                                                size="small" 
                                                                                type="number" 
                                                                                value={newOrder.guests.adults.veg || ''} 
                                                                                onKeyDown={preventScientificNotation}
                                                                                onChange={(e) => handleGuestCountChange('newOrder', 'adults', 'veg', e.target.value)} 
                                                                                inputProps={{ min: 0, max: 9999 }} 
                                                                                sx={{ width: { xs: 60, sm: 80 }, '& .MuiInputBase-input': { textAlign: 'center', fontWeight: 600 } }} 
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell align="center" sx={{ py: 1.5 }}>
                                                                            <TextField 
                                                                                size="small" 
                                                                                type="number" 
                                                                                value={newOrder.guests.adults.nonVeg || ''} 
                                                                                onKeyDown={preventScientificNotation}
                                                                                onChange={(e) => handleGuestCountChange('newOrder', 'adults', 'nonVeg', e.target.value)} 
                                                                                inputProps={{ min: 0, max: 9999 }} 
                                                                                sx={{ width: { xs: 60, sm: 80 }, '& .MuiInputBase-input': { textAlign: 'center', fontWeight: 600 } }} 
                                                                            />
                                                                        </TableCell>
                                                                    </TableRow>
                                                                    <TableRow>
                                                                        <TableCell sx={{ py: 1.5 }}>
                                                                            <Typography variant="body2" fontWeight={600}>Kids</Typography>
                                                                        </TableCell>
                                                                        <TableCell align="center" sx={{ py: 1.5 }}>
                                                                            <TextField 
                                                                                size="small" 
                                                                                type="number" 
                                                                                value={newOrder.guests.kids.veg || ''} 
                                                                                onKeyDown={preventScientificNotation}
                                                                                onChange={(e) => handleGuestCountChange('newOrder', 'kids', 'veg', e.target.value)} 
                                                                                inputProps={{ min: 0, max: 9999 }} 
                                                                                sx={{ width: { xs: 60, sm: 80 }, '& .MuiInputBase-input': { textAlign: 'center', fontWeight: 600 } }} 
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell align="center" sx={{ py: 1.5 }}>
                                                                            <TextField 
                                                                                size="small" 
                                                                                type="number" 
                                                                                value={newOrder.guests.kids.nonVeg || ''} 
                                                                                onKeyDown={preventScientificNotation}
                                                                                onChange={(e) => handleGuestCountChange('newOrder', 'kids', 'nonVeg', e.target.value)} 
                                                                                inputProps={{ min: 0, max: 9999 }} 
                                                                                sx={{ width: { xs: 60, sm: 80 }, '& .MuiInputBase-input': { textAlign: 'center', fontWeight: 600 } }} 
                                                                            />
                                                                        </TableCell>
                                                                    </TableRow>
                                                                    <TableRow sx={{ bgcolor: '#f5f5f5', borderTop: '1px solid #e0e0e0' }}>
                                                                        <TableCell sx={{ py: 1.2 }}>
                                                                            <Typography variant="body2" fontWeight={700}>Total</Typography>
                                                                        </TableCell>
                                                                        <TableCell align="center" sx={{ py: 1.2 }}>
                                                                            <Typography variant="body2" fontWeight={700}>
                                                                                {(newOrder.guests.adults.veg || 0) + (newOrder.guests.kids.veg || 0)}
                                                                            </Typography>
                                                                        </TableCell>
                                                                        <TableCell align="center" sx={{ py: 1.2 }}>
                                                                            <Typography variant="body2" fontWeight={700}>
                                                                                {(newOrder.guests.adults.nonVeg || 0) + (newOrder.guests.kids.nonVeg || 0)}
                                                                            </Typography>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                </TableBody>
                                                            </Table>
                                                        </TableContainer>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                            <Box display="flex" justifyContent="space-between" mt={3}>
                                                <Button onClick={() => setActiveStep(0)} sx={{ px: 2 }}>Back</Button>
                                                <Button
                                                    variant="contained"
                                                    onClick={() => {
                                                        setFormSubmitted(true);
                                                        setOccasionTouched(true);
                                                        const isOccasionNameRequired = newOrder.occasion?.toLowerCase().includes('birthday') ||
                                                            newOrder.occasion?.toLowerCase().includes('anniversary') ||
                                                            newOrder.occasion?.toLowerCase().includes('wedding');
                                                        const isOccasionNameValid = !isOccasionNameRequired || !!newOrder.occasionPersonName?.trim();

                                                        if (!newOrder.requiredDate || !newOrder.occasion || !newOrder.occasionDate || !isOccasionNameValid) {
                                                            return;
                                                        }
                                                        setActiveStep(2);
                                                    }}
                                                    sx={{ px: 3 }}
                                                >
                                                    Next
                                                </Button>
                                            </Box>
                                        </Box>
                                    )}

                                    {/* Step 3: Food Selection */}
                                    {activeStep === 2 && (
                                        <Box>
                                            <Typography variant="subtitle2" color="primary" fontWeight={700} mb={2}>
                                                Food Selection
                                            </Typography>
                                            {renderItemSelector()}

                                            {/* ── Custom / Off-Menu Item ── */}
                                            <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'primary.main', borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                                                <Typography variant="subtitle2" fontWeight={700} color="primary.main" mb={1}>
                                                    ➕ Add Custom / Off-Menu Item
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                                                    Customer requested an item not on the menu? Add it here and set the price.
                                                </Typography>
                                                <Grid container spacing={1.5} alignItems="flex-end">
                                                    <Grid item xs={12} sm={5}>
                                                        <TextField
                                                            label="Item Name / Description"
                                                            size="small"
                                                            fullWidth
                                                            value={adminCustomItemName}
                                                            onChange={e => setAdminCustomItemName(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAdminCustomItem(); } }}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={6} sm={2}>
                                                        <TextField
                                                            label="Qty"
                                                            type="number"
                                                            size="small"
                                                            fullWidth
                                                            value={adminCustomItemQty}
                                                            onChange={e => setAdminCustomItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                            inputProps={{ min: 1 }}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={6} sm={3}>
                                                        <TextField
                                                            label="Unit Price ($)"
                                                            type="number"
                                                            size="small"
                                                            fullWidth
                                                            value={adminCustomItemPrice}
                                                            onChange={e => setAdminCustomItemPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                                                            inputProps={{ min: 0, step: '0.01' }}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} sm={2}>
                                                        <Button
                                                            variant="contained"
                                                            fullWidth
                                                            startIcon={<Add />}
                                                            onClick={handleAddAdminCustomItem}
                                                            sx={{ height: 40 }}
                                                        >
                                                            Add
                                                        </Button>
                                                    </Grid>
                                                </Grid>
                                            </Box>

                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="subtitle2" sx={{ mb: 1 }}>Selected Items</Typography>
                                                <Paper variant="outlined">
                                                    <List disablePadding>
                                                        {newOrder.items.map((item, index) => (
                                                            <ListItem key={index} divider secondaryAction={
                                                                <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}>
                                                                    <Cancel fontSize="small" />
                                                                </IconButton>
                                                            }>
                                                                <ListItemText
                                                                    primary={
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                                                            <Typography variant="body2" fontWeight="bold">{item.name}</Typography>
                                                                            {(item as any).isCustom && (
                                                                                <Chip
                                                                                    size="small"
                                                                                    label="Custom"
                                                                                    sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700 }}
                                                                                />
                                                                            )}
                                                                            {item.spiceLevel && (
                                                                                <Chip
                                                                                    size="small"
                                                                                    label={SPICE_LEVELS.find(l => l.id === item.spiceLevel)?.label || item.spiceLevel}
                                                                                    variant="outlined"
                                                                                    sx={{ ml: 1, height: 18, fontSize: '0.6rem', color: '#e65100', borderColor: '#ffb74d' }}
                                                                                />
                                                                            )}
                                                                        </Box>
                                                                    }
                                                                    secondary={
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            {(item as any).isCustom
                                                                                ? `Custom item — ${formatCurrency(item.unitPrice)} x ${item.quantity} | Total: ${formatCurrency(item.total)}`
                                                                                : `${item.basePrice ? `Base: ${formatCurrency(item.basePrice)} | ` : ''}${formatCurrency(item.unitPrice)} x ${item.isNotSure ? '?' : item.quantity} | Total: ${formatCurrency(item.total)}`
                                                                            }
                                                                        </Typography>
                                                                    }
                                                                />
                                                            </ListItem>
                                                        ))}
                                                        {newOrder.items.length === 0 && (
                                                            <ListItem><Typography variant="body2" color="text.secondary">No items selected yet</Typography></ListItem>
                                                        )}
                                                    </List>
                                                </Paper>
                                                {newOrder.items.length === 0 && (
                                                    <Box sx={{ mt: 1.5, px: 1.5, py: 1, bgcolor: '#fff3e0', border: '1px solid #ffb74d', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 600 }}>
                                                            ⚠ Please select and add at least one food item before proceeding.
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" mt={3}>
                                                <Button onClick={() => setActiveStep(1)} sx={{ px: 2 }}>Back</Button>
                                                <Button
                                                    variant="contained"
                                                    onClick={() => {
                                                        if (newOrder.items.length === 0) {
                                                            toast.error('Please add at least one food item to proceed.');
                                                            return;
                                                        }
                                                        setActiveStep(3);
                                                    }}
                                                    sx={{ px: 3 }}
                                                >
                                                    Next
                                                </Button>
                                            </Box>
                                        </Box>
                                    )}

                                    {/* Step 4: Confirm Order */}
                                    {activeStep === 3 && (
                                        <Box>
                                            <Typography variant="subtitle2" color="primary" fontWeight={700} mb={2}>
                                                Confirm Order
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12}>
                                                    <Typography variant="caption" fontWeight="bold">Additional Services (if any)</Typography>
                                                    <TextField
                                                        multiline
                                                        rows={3}
                                                        fullWidth
                                                        placeholder="e.g. Server required, Decoration, etc."
                                                        value={newOrder.additionalServices}
                                                        onChange={(e) => setNewOrder({ ...newOrder, additionalServices: e.target.value })}
                                                    />
                                                </Grid>

                                                <Grid item xs={12} sm={6}>
                                                    <FormControl fullWidth size="small">
                                                        <InputLabel>Discount Type</InputLabel>
                                                        <Select
                                                            value={newOrder.discount.type}
                                                            label="Discount Type"
                                                            onChange={(e) => setNewOrder({ ...newOrder, discount: { ...newOrder.discount, type: e.target.value as any } })}
                                                        >
                                                            <MenuItem value="percentage">Percentage (%)</MenuItem>
                                                            <MenuItem value="fixed">Fixed Amount ($)</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label={`Discount ${newOrder.discount.type === 'percentage' ? '(%)' : '($)'}`}
                                                        type="number"
                                                        fullWidth
                                                        size="small"
                                                        value={newOrder.discount.value || ''}
                                                        onChange={(e) => setNewOrder({ ...newOrder, discount: { ...newOrder.discount, value: parseFloat(e.target.value) || 0 } })}
                                                    />
                                                </Grid>

                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Amount with tax ($)*"
                                                        fullWidth
                                                        size="small"
                                                        disabled
                                                        value={isCalculatingTax ? 'Calculating...' : currentFinalTotal.toFixed(2)}
                                                        InputProps={{ 
                                                            sx: { fontWeight: 'bold', bgcolor: alpha(theme.palette.success.main, 0.05) },
                                                            endAdornment: isCalculatingTax ? <CircularProgress size={20} /> : null
                                                        }}
                                                    />
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} mt={2}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Payment Details</Typography>
                                                        <Button size="small" variant="outlined" onClick={handleAddPaymentToCreate}>
                                                            Add Payment
                                                        </Button>
                                                    </Box>

                                                    <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'hidden' }}>
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell sx={{ px: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Amount</TableCell>
                                                                    <TableCell sx={{ px: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Method</TableCell>
                                                                    <TableCell sx={{ px: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Date</TableCell>
                                                                    <TableCell sx={{ px: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Notes</TableCell>
                                                                    <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>Action</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {(newOrder.payments || []).map((payment: any, idx: number) => (
                                                                    <TableRow key={idx}>
    <TableCell sx={{ px: { xs: 0.5, sm: 1 } }}>
        <TextField
            type="number"
            size="small"
            inputProps={{ min: 0, step: "0.01" }}
            value={payment.amount}
            onChange={(e) => handleUpdatePaymentFromCreate(idx, 'amount', parseFloat(e.target.value) || 0)}
            sx={{ width: { xs: 60, sm: 100 } }}
        />
    </TableCell>
    <TableCell sx={{ px: { xs: 0.5, sm: 1 } }}>
        <Select
            size="small"
            value={payment.method || 'cash'}
            onChange={(e) => handleUpdatePaymentFromCreate(idx, 'method', e.target.value)}
            sx={{ width: { xs: 70, sm: 'auto' } }}
        >
            {availablePaymentMethods.map(m => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
        </Select>
    </TableCell>
    <TableCell sx={{ px: { xs: 0.5, sm: 1 } }}>
        <TextField
            type="date"
            size="small"
            value={payment.timestamp ? new Date(payment.timestamp).toISOString().split('T')[0] : ''}
            onChange={(e) => handleUpdatePaymentFromCreate(idx, 'timestamp', e.target.value)}
            sx={{ width: { xs: 100, sm: 'auto' } }}
        />
    </TableCell>
    <TableCell sx={{ px: { xs: 0.5, sm: 1 } }}>
        <TextField
            size="small"
            value={payment.notes || ''}
            onChange={(e) => handleUpdatePaymentFromCreate(idx, 'notes', e.target.value)}
            placeholder="Ref/Note"
            sx={{ width: { xs: 70, sm: 'auto' } }}
        />
    </TableCell>
    <TableCell align="center" sx={{ px: { xs: 0.5, sm: 1 } }}>
        <IconButton color="error" size="small" onClick={() => handleRemovePaymentFromCreate(idx)}>
            <Cancel fontSize="small" />
        </IconButton>
    </TableCell>
</TableRow>
                                                                ))}
                                                                {(!newOrder.payments || newOrder.payments.length === 0) && (
                                                                    <TableRow>
                                                                        <TableCell colSpan={5} align="center">
                                                                            <Typography variant="body2" sx={{ py: 1, color: 'text.secondary' }}>
                                                                                No payments recorded yet.
                                                                            </Typography>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
                                                </Grid>

                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Balance Due ($)"
                                                        fullWidth
                                                        size="small"
                                                        disabled
                                                        value={currentBalanceDue.toFixed(2)}
                                                        InputProps={{ sx: { fontWeight: 'bold', color: 'error.main' } }}
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Processing Person"
                                                        fullWidth
                                                        size="small"
                                                        placeholder="Processing Person"
                                                        value={newOrder.processingPerson}
                                                        onChange={(e) => setNewOrder({ ...newOrder, processingPerson: e.target.value })}
                                                    />
                                                </Grid>

                                                <Grid item xs={12}>
                                                    <Typography variant="caption" fontWeight="bold">Internal Notes</Typography>
                                                    <TextField
                                                        multiline
                                                        rows={2}
                                                        fullWidth
                                                        placeholder="Internal notes (not visible to customer)"
                                                        value={newOrder.notes}
                                                        onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                                                    />
                                                </Grid>

                                                <Grid item xs={12}>
                                                    <Divider sx={{ my: 1 }} />
                                                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                        <Typography variant="subtitle2" color="primary">Referral / Commission</Typography>
                                                        <FormControlLabel
                                                            control={<Switch size="small" checked={commissionData.enabled} onChange={(e) => setCommissionData({ ...commissionData, enabled: e.target.checked })} />}
                                                            label={<Typography variant="caption">Enable Commission</Typography>}
                                                        />
                                                    </Stack>

                                                    {commissionData.enabled && (
                                                        <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
                                                            <Grid container spacing={2}>
                                                                {/* Commission Type */}
                                                                <Grid item xs={12}>
                                                                    <FormControl component="fieldset">
                                                                        <FormLabel component="legend" sx={{ fontSize: '0.75rem' }}>Commission Type</FormLabel>
                                                                        <RadioGroup
                                                                            row
                                                                            value={commissionData.type}
                                                                            onChange={(e) => setCommissionData({ ...commissionData, type: e.target.value })}
                                                                        >
                                                                            <FormControlLabel value="fixed" control={<Radio size="small" />} label="Fixed Amount" />
                                                                            <FormControlLabel value="percentage" control={<Radio size="small" />} label="Percentage" />
                                                                        </RadioGroup>
                                                                    </FormControl>
                                                                </Grid>

                                                                {/* Amount / Percentage Input */}
                                                                <Grid item xs={12}>
                                                                    {commissionData.type === 'fixed' ? (
                                                                        <TextField
                                                                            label="Commission Amount"
                                                                            type="number"
                                                                            fullWidth
                                                                            size="small"
                                                                            InputProps={{ startAdornment: <Box component="span" mr={1}>$</Box>, inputProps: { min: 0 } }}
                                                                            value={commissionData.amount}
                                                                            onChange={(e) => {
                                                                                const val = parseFloat(e.target.value);
                                                                                setCommissionData({ ...commissionData, amount: val >= 0 ? val : 0 })
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <TextField
                                                                            label="Commission Percentage"
                                                                            type="number"
                                                                            fullWidth
                                                                            size="small"
                                                                            InputProps={{ endAdornment: <Box component="span" ml={1}>%</Box>, inputProps: { min: 0 } }}
                                                                            value={commissionData.percentage}
                                                                            onChange={(e) => {
                                                                                const val = parseFloat(e.target.value);
                                                                                setCommissionData({ ...commissionData, percentage: val >= 0 ? val : 0 })
                                                                            }}
                                                                        />
                                                                    )}
                                                                </Grid>

                                                                {/* Reference Type */}
                                                                <Grid item xs={12}>
                                                                    <Divider sx={{ my: 1 }} />
                                                                    <FormControl component="fieldset">
                                                                        <FormLabel component="legend" sx={{ fontSize: '0.75rem' }}>Reference / Beneficiary</FormLabel>
                                                                        <RadioGroup
                                                                            row
                                                                            value={commissionData.referenceType}
                                                                            onChange={(e) => setCommissionData({ ...commissionData, referenceType: e.target.value })}
                                                                        >
                                                                            <FormControlLabel value="external_customer" control={<Radio size="small" />} label="External" />
                                                                            <FormControlLabel value="internal_team" control={<Radio size="small" />} label="Internal Team" />
                                                                        </RadioGroup>
                                                                    </FormControl>
                                                                </Grid>

                                                                {/* Reference Details */}
                                                                {commissionData.referenceType === 'internal_team' ? (
                                                                    <>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <Autocomplete
                                                                                options={users}
                                                                                getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.roles?.[0] || 'User'})`}
                                                                                value={commissionData.intUser}
                                                                                onChange={(_, newValue) => setCommissionData({ ...commissionData, intUser: newValue })}
                                                                                renderInput={(params) => <TextField {...params} label="Select Team Member" size="small" fullWidth required />}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <TextField
                                                                                label="Reference Notes"
                                                                                placeholder="e.g. Sales Team"
                                                                                fullWidth
                                                                                size="small"
                                                                                value={commissionData.intNotes}
                                                                                onChange={(e) => setCommissionData({ ...commissionData, intNotes: e.target.value })}
                                                                            />
                                                                        </Grid>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <Autocomplete
                                                                                options={customers}
                                                                                getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name} ${option.phone ? `(${option.phone})` : ''}`}
                                                                                freeSolo
                                                                                value={commissionData.extCustomer || commissionData.extName || ''}
                                                                                onChange={(_, newValue) => {
                                                                                    if (typeof newValue === 'string') {
                                                                                        setCommissionData({
                                                                                            ...commissionData,
                                                                                            extCustomer: null,
                                                                                            extName: newValue
                                                                                        });
                                                                                    } else if (newValue) {
                                                                                        setCommissionData({
                                                                                            ...commissionData,
                                                                                            extCustomer: newValue,
                                                                                            extName: newValue.name || '',
                                                                                            extContact: newValue.phone || '',
                                                                                            extEmail: newValue.email || ''
                                                                                        });
                                                                                    } else {
                                                                                        setCommissionData({
                                                                                            ...commissionData,
                                                                                            extCustomer: null,
                                                                                            extName: '',
                                                                                            extContact: '',
                                                                                            extEmail: ''
                                                                                        });
                                                                                    }
                                                                                }}
                                                                                renderInput={(params) => (
                                                                                    <TextField
                                                                                        {...params}
                                                                                        label="Referrer Name"
                                                                                        fullWidth
                                                                                        size="small"
                                                                                        required
                                                                                        placeholder="Search or enter name"
                                                                                        onChange={(e) => {
                                                                                            if (!commissionData.extCustomer) {
                                                                                                setCommissionData({ ...commissionData, extName: e.target.value });
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <PhoneInput
                                                                                label="Contact Number"
                                                                                fullWidth
                                                                                size="small"
                                                                                value={commissionData.extContact}
                                                                                onChange={(val) => {
                                                                                    const clean = val.replace(/\D/g, '');
                                                                                    if (clean.length <= 10) {
                                                                                        setCommissionData({ ...commissionData, extContact: clean })
                                                                                    }
                                                                                }}
                                                                                dialCode={commissionData.extDialCode}
                                                                                onDialCodeChange={(code) => setCommissionData({ ...commissionData, extDialCode: code })}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <TextField
                                                                                label="Email (Optional)"
                                                                                fullWidth
                                                                                size="small"
                                                                                value={commissionData.extEmail}
                                                                                onChange={(e) => setCommissionData({ ...commissionData, extEmail: e.target.value })}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <TextField
                                                                                label="Reference Notes"
                                                                                placeholder="e.g. Friend of Owner"
                                                                                fullWidth
                                                                                size="small"
                                                                                value={commissionData.extNotes}
                                                                                onChange={(e) => setCommissionData({ ...commissionData, extNotes: e.target.value })}
                                                                            />
                                                                        </Grid>
                                                                    </>
                                                                )}

                                                                <Grid item xs={12}>
                                                                    <TextField
                                                                        label="General Commission Notes"
                                                                        fullWidth
                                                                        size="small"
                                                                        multiline
                                                                        rows={2}
                                                                        value={commissionData.notes}
                                                                        onChange={(e) => setCommissionData({ ...commissionData, notes: e.target.value })}
                                                                    />
                                                                </Grid>
                                                            </Grid>
                                                        </Paper>
                                                    )}
                                                </Grid>
                                            </Grid>
                                            <Box display="flex" justifyContent="space-between" mt={3}>
                                                <Button onClick={() => setActiveStep(2)} sx={{ px: 2 }}>Back</Button>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    onClick={handleCreateOrder}
                                                    sx={{ px: 3 }}
                                                    disabled={creating || isCalculatingTax}
                                                >
                                                    {creating ? 'Creating...' : isCalculatingTax ? 'Calculating Tax...' : '✓ Create Order'}
                                                </Button>
                                            </Box>
                                        </Box>
                                    )}

                                </Paper>
                            </Box>
                        );
                    })()}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setCreateDialogOpen(false); setActiveStep(0); }}>Cancel</Button>
                </DialogActions>
            </Dialog>

            {/* Custom Occasion Dialog */}
            <Dialog open={addCustomOccasionOpen} onClose={() => setAddCustomOccasionOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Add Custom Occasion</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Occasion Name"
                        fullWidth
                        size="small"
                        value={customOccasion}
                        onChange={(e) => setCustomOccasion(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddCustomOccasionOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddCustomOccasion} disabled={!customOccasion.trim()}>Add</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CateringManagementPage;