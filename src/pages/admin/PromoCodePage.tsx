import {
    Add as AddIcon,
    Cancel as CancelIcon,
    CheckCircle as CheckCircleIcon,
    Close as CloseIcon,
    ContentCopy as CopyIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Email as EmailIcon,
    EventAvailable as EventIcon,
    GridView as GridViewIcon,
    Info as InfoIcon,
    LocalOffer as LocalOfferIcon,
    Search as SearchIcon,
    Send as SendIcon,
    TrendingUp as TrendingUpIcon,
    ViewList as ViewListIcon,
    AccountBalanceWallet as WalletIcon
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import {
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
    Fade,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tabs,
    Tab,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { format } from 'date-fns';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';
import { promosAPI, customersAPI, reportsAPI, menuAPI } from '../../services/api';

interface Customer {
    name: string;
    email: string;
    phone: string;
    totalOrders: number;
    totalSpent?: number;
}

// types
interface PromoCode {
    _id: string;
    code: string;
    name: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minBillAmount: number;
    maxDiscountAmount?: number;
    validFrom: string;
    validTo: string;
    maxTotalUses?: number;
    currentUses: number;
    maxUsesPerCustomer: number;
    applicableOrderTypes: string[];
    active: boolean;
    offerType: 'cart_total' | 'menu_item' | 'combo';
    applicableItems?: string[];
}

const ORDER_TYPES = [
    { value: 'dine_in', label: 'Dine-in' },
    { value: 'takeaway', label: 'Takeaway' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'online_takeaway', label: 'Online' },
    // { value: 'global_dine_in', label: 'Global QR' }
];

const StatCard = ({ title, value, icon, color, trend }: any) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Card sx={{
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            borderRadius: { xs: 3, sm: 4 },
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: theme.shadows[4]
            }
        }}>
            <Box sx={{
                position: 'absolute',
                top: -10,
                right: -10,
                width: { xs: 50, sm: 80 },
                height: { xs: 50, sm: 80 },
                borderRadius: '50%',
                background: alpha(color, 0.1),
                zIndex: 0
            }} />
            <CardContent sx={{
                position: 'relative',
                zIndex: 1,
                p: { xs: 1.25, sm: 2 },
                '&:last-child': { pb: { xs: 1.25, sm: 2 } }
            }}>
                <Stack direction={isMobile ? "column" : "row"} spacing={{ xs: 1, sm: 2 }} alignItems={isMobile ? "flex-start" : "center"}>
                    <Avatar sx={{
                        bgcolor: alpha(color, 0.2),
                        color: color,
                        width: { xs: 36, sm: 48 },
                        height: { xs: 36, sm: 48 },
                        borderRadius: { xs: '8px', sm: '12px' }
                    }}>
                        {React.cloneElement(icon, { sx: { fontSize: { xs: 18, sm: 24 } } })}
                    </Avatar>
                    <Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' }, textTransform: 'uppercase' }}
                        >
                            {title}
                        </Typography>
                        <Typography variant="h5" fontWeight={800} sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                            {value}
                        </Typography>
                    </Box>
                </Stack>
                {trend && (
                    <Box sx={{ mt: { xs: 0.5, sm: 2 }, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingUpIcon sx={{ color: 'success.main', fontSize: { xs: 12, sm: 16 } }} />
                        <Typography variant="caption" color="success.main" fontWeight={700} sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                            {trend}
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

const Avatar = ({ children, sx, ...props }: any) => (
    <Box sx={{
        width: 48,
        height: 48,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sx
    }} {...props}>
        {children}
    </Box>
);

const PromoCodePage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { settings, formatCurrency } = useSettings();
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(6);
    const [totalItems, setTotalItems] = useState(0);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Dialog state
    const [openDialog, setOpenDialog] = useState(false);
    const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Soft delete & tabs state
    const [tabValue, setTabValue] = useState(0);
    const [counts, setCounts] = useState({ all: 0, active: 0, expired: 0, inactive: 0, deleted: 0 });
    const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
    const [restoreTarget, setRestoreTarget] = useState<{ id: string; code: string } | null>(null);

    // Messaging dialogs
    const [openEmailDialog, setOpenEmailDialog] = useState(false);
    const [openSmsDialog, setOpenSmsDialog] = useState(false);
    const [selectedForMessage, setSelectedForMessage] = useState<PromoCode | null>(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [promoToDelete, setPromoToDelete] = useState<PromoCode | null>(null);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [emailLoading, setEmailLoading] = useState(false);
    const [smsLoading, setSmsLoading] = useState(false);

    // Email form state
    const [emailData, setEmailData] = useState({
        subject: '',
        message: '',
        selectedCustomers: [] as string[],
        selectAll: false,
    });

    // SMS form state
    const [selectedSmsPhones, setSelectedSmsPhones] = useState<string[]>([]);
    const [selectAllSms, setSelectAllSms] = useState(false);
    const [smsSearch, setSmsSearch] = useState('');

    // Defensive date formatter
    const safeFormatDate = (dateStr: string, formatStr: string = 'MMM dd, yyyy') => {
        try {
            if (!dateStr) return 'N/A';
            return format(new Date(dateStr), formatStr);
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        discountType: 'percentage' as 'percentage' | 'fixed',
        discountValue: 0,
        minBillAmount: 0,
        maxDiscountAmount: 0,
        validFrom: format(new Date(), 'yyyy-MM-dd'),
        validTo: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        maxTotalUses: 100,
        maxUsesPerCustomer: 1,
        applicableOrderTypes: ['dine_in', 'takeaway', 'delivery', 'online_takeaway'],
        active: true,
        offerType: 'cart_total' as 'cart_total' | 'menu_item' | 'combo',
        applicableItems: [] as string[],
    });

    const fetchPromos = async () => {
        try {
            setLoading(true);
            const response = await promosAPI.getAll({ 
                page: page + 1, 
                limit: rowsPerPage,
                search: debouncedSearch.trim() || undefined,
                isDeleted: tabValue === 4 ? true : undefined,
                status: tabValue === 1 ? 'active' : tabValue === 2 ? 'expired' : tabValue === 3 ? 'inactive' : undefined
            });
            const responseData = response.data;

            if (responseData.counts) {
                setCounts(responseData.counts);
            }

            if (responseData && (responseData.promos || responseData.coupons) && Array.isArray(responseData.promos || responseData.coupons)) {
                const promosList = responseData.promos || responseData.coupons;
                setPromos(promosList);
                setTotalItems(responseData.total || promosList.length);
            } else if (Array.isArray(responseData)) {
                setPromos(responseData);
                setTotalItems(responseData.length);
            } else {
                setPromos([]);
                setTotalItems(0);
            }
        } catch (error) {
            console.error('Error fetching promos:', error);
            toast.error('Failed to load promo codes');
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(0); // Reset to first page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchCustomers = async () => {
        try {
            const response = await customersAPI.getAll({ page: 1, limit: 1000 });
            const raw = response.data.customers || response.data;
            const fetched: Customer[] = Array.isArray(raw) ? raw : [];
            
            // Filter unique by email or phone to avoid key errors
            const uniqueMap = new Map();
            fetched.forEach(c => {
                const identifier = c.email || c.phone;
                if (identifier && !uniqueMap.has(identifier)) {
                    uniqueMap.set(identifier, c);
                }
            });
            
            setCustomers(Array.from(uniqueMap.values()));
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    useEffect(() => {
        fetchPromos();
        fetchCustomers();
    }, [page, rowsPerPage, debouncedSearch, tabValue]);

    const handleOpenDialog = (promo?: PromoCode) => {
        if (promo) {
            setEditingPromo(promo);
            setFormData({
                code: promo.code,
                name: promo.name,
                description: promo.description || '',
                discountType: promo.discountType,
                discountValue: promo.discountValue,
                minBillAmount: promo.minBillAmount,
                maxDiscountAmount: promo.maxDiscountAmount || 0,
                validFrom: promo.validFrom ? format(new Date(promo.validFrom), 'yyyy-MM-dd') : '',
                validTo: promo.validTo ? format(new Date(promo.validTo), 'yyyy-MM-dd') : '',
                maxTotalUses: promo.maxTotalUses || 0,
                maxUsesPerCustomer: promo.maxUsesPerCustomer || 1,
                applicableOrderTypes: promo.applicableOrderTypes || [],
                active: promo.active,
                offerType: promo.offerType || 'cart_total',
                applicableItems: promo.applicableItems || [],
            });
        } else {
            setEditingPromo(null);
            setFormData({
                code: '',
                name: '',
                description: '',
                discountType: 'percentage',
                discountValue: 10,
                minBillAmount: 0,
                maxDiscountAmount: 0,
                validFrom: format(new Date(), 'yyyy-MM-dd'),
                validTo: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                maxTotalUses: 100,
                maxUsesPerCustomer: 1,
                applicableOrderTypes: ['dine_in', 'takeaway', 'delivery', 'online_takeaway'],
                active: true,
                offerType: 'cart_total',
                applicableItems: [],
            });
        }
        setOpenDialog(true);
    };

    const handleSave = async () => {
        if (formLoading) return;
        if (!formData.code || !formData.name || !formData.discountValue) {
            toast.error('Please fill in required fields');
            return;
        }

        try {
            setFormLoading(true);
            const payload = {
                ...formData,
                code: formData.code.toUpperCase()
            };

            if (editingPromo) {
                await promosAPI.update(editingPromo._id, payload);
                toast.success('Promo code updated');
            } else {
                await promosAPI.create(payload);
                toast.success('Promo code created');
            }
            setOpenDialog(false);
            fetchPromos();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save promo code');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = (promo: PromoCode) => {
        setPromoToDelete(promo);
        setOpenDeleteDialog(true);
    };

    const confirmDelete = async () => {
        if (formLoading) return;
        if (!promoToDelete) return;
        try {
            setFormLoading(true);
            await promosAPI.delete(promoToDelete._id);
            toast.success('Promo code deleted');
            setOpenDeleteDialog(false);
            setPromoToDelete(null);
            fetchPromos();
        } catch (error) {
            toast.error('Failed to delete promo code');
        } finally {
            setFormLoading(false);
        }
    };

    const handleRestorePromo = (promo: PromoCode) => {
        setRestoreTarget({ id: promo._id, code: promo.code });
        setOpenRestoreDialog(true);
    };

    const confirmRestorePromo = async () => {
        if (formLoading) return;
        if (!restoreTarget) return;
        try {
            setFormLoading(true);
            await promosAPI.restore(restoreTarget.id);
            toast.success('Promo code restored successfully');
            setOpenRestoreDialog(false);
            setRestoreTarget(null);
            fetchPromos();
        } catch (error) {
            console.error('Error restoring promo:', error);
            toast.error('Failed to restore promo code');
        } finally {
            setFormLoading(false);
        }
    };

    const toggleStatus = async (promo: PromoCode) => {
        try {
            const newActiveStatus = !promo.active;
            // ONLY send the 'active' field to avoid any backend side-effects or field conflicts
            await promosAPI.update(promo._id, { active: newActiveStatus });
            
            // Update local state directly to prevent visual disappearance and jumping
            setPromos(prev => prev.map(p => p._id === promo._id ? { ...p, active: newActiveStatus } : p));
            
            toast.success(`Promo ${newActiveStatus ? 'activated' : 'deactivated'}`);
        } catch (error: any) {
            console.error('Toggle status error:', error);
            toast.error('Failed to update status: ' + (error.response?.data?.message || error.message));
        }
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success(`Code ${code} copied!`);
    };

    // --- Email Handlers ---
    const handleSelectCustomer = (email: string, checked: boolean) => {
        setEmailData(prev => {
            const selected = checked 
                ? [...prev.selectedCustomers, email]
                : prev.selectedCustomers.filter(e => e !== email);
            return { ...prev, selectedCustomers: selected, selectAll: selected.length === customers.filter(c => c.email).length };
        });
    };

    const handleSelectAllCustomers = (checked: boolean) => {
        const customersWithEmail = customers.filter(c => c.email);
        setEmailData(prev => ({
            ...prev,
            selectAll: checked,
            selectedCustomers: checked ? customersWithEmail.map(c => c.email) : []
        }));
    };

    const handleSendBulkEmail = async () => {
        if (emailLoading) return;
        if (emailData.selectedCustomers.length === 0) {
            toast.error('Please select at least one customer');
            return;
        }
        if (!emailData.subject || !emailData.message) {
            toast.error('Subject and message are required');
            return;
        }

        try {
            setEmailLoading(true);
            await promosAPI.sendBulkEmail({
                promoId: selectedForMessage?._id || '',
                recipients: emailData.selectedCustomers,
                subject: emailData.subject,
                message: emailData.message
            });
            toast.success(`Email campaign sent to ${emailData.selectedCustomers.length} customers`);
            setOpenEmailDialog(false);
            setEmailData({ subject: '', message: '', selectedCustomers: [], selectAll: false });
        } catch (error) {
            toast.error('Failed to send emails');
        } finally {
            setEmailLoading(false);
        }
    };

    // --- SMS Handlers ---
    const handleSelectSmsPhone = (phone: string, checked: boolean) => {
        setSelectedSmsPhones(prev => checked ? [...prev, phone] : prev.filter(p => p !== phone));
    };

    const handleSelectAllSms = (checked: boolean) => {
        const withPhone = customers.filter(c => c.phone);
        setSelectAllSms(checked);
        setSelectedSmsPhones(checked ? withPhone.map(c => c.phone) : []);
    };

    const handleSendSmsBroadcast = async () => {
        if (smsLoading) return;
        if (selectedSmsPhones.length === 0) {
            toast.error('Select recipients');
            return;
        }
        if (!selectedForMessage) return;

        try {
            setSmsLoading(true);
            const message = `Special Offer! Use code ${selectedForMessage.code} to get ${selectedForMessage.discountValue}${selectedForMessage.discountType === 'percentage' ? '%' : '$'} off your next order. Valid until ${safeFormatDate(selectedForMessage.validTo)}.`;
            
            await promosAPI.sendBulkSms({
                promoId: selectedForMessage._id,
                phoneNumbers: selectedSmsPhones
            });
            
            toast.success('SMS broadcast sent successfully');
            setOpenSmsDialog(false);
            setSelectedSmsPhones([]);
            setSelectAllSms(false);
        } catch (error) {
            toast.error('Failed to send SMS');
        } finally {
            setSmsLoading(false);
        }
    };

    const handleOpenEmailDialog = (promo: PromoCode) => {
        setSelectedForMessage(promo);
        setEmailData(prev => ({
            ...prev,
            subject: `Special Offer: ${promo.name}`,
            message: `Hi there!\n\nWe have a special offer for you. Use the promo code ${promo.code} to get ${promo.discountValue}${promo.discountType === 'percentage' ? '%' : '$'} off your order.\n\nThis offer is valid until ${safeFormatDate(promo.validTo)}.\n\nEnjoy your meal!`
        }));
        setOpenEmailDialog(true);
    };

    const handleOpenSmsDialog = (promo: PromoCode) => {
        setSelectedForMessage(promo);
        setOpenSmsDialog(true);
    };

    const getStatusInfo = (promo: PromoCode) => {
        if (!promo) return { label: 'Unknown', color: 'default', icon: <InfoIcon fontSize="small" /> };
        if (!promo.active) return { label: 'Inactive', color: 'error', icon: <CancelIcon fontSize="small" /> };

        try {
            const now = new Date();
            const to = new Date(promo.validTo);
            if (isNaN(to.getTime()) || now > to) return { label: 'Expired', color: 'error', icon: <CancelIcon fontSize="small" /> };

            const from = new Date(promo.validFrom);
            if (!isNaN(from.getTime()) && now < from) return { label: 'Scheduled', color: 'warning', icon: <EventIcon fontSize="small" /> };
        } catch (e) {
            console.error('Date parsing error:', e);
        }

        return { label: 'Active', color: 'success', icon: <CheckCircleIcon fontSize="small" /> };
    };

    const safePromos = Array.isArray(promos) ? promos : [];

    const filteredPromos = safePromos.filter(p =>
        (p.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const stats = useMemo(() => {
        try {
            const activeCount = safePromos.filter(p => getStatusInfo(p).label === 'Active').length;
            const scheduledCount = safePromos.filter(p => getStatusInfo(p).label === 'Scheduled').length;
            const expiredCount = safePromos.filter(p => getStatusInfo(p).label === 'Expired').length;

            return {
                total: totalItems || safePromos.length,
                active: activeCount,
                scheduled: scheduledCount,
                expired: expiredCount,
            };
        } catch (e) {
            console.error('Stats calculation error:', e);
            return { total: 0, active: 0, scheduled: 0, expired: 0 };
        }
    }, [safePromos, totalItems]);

    if (renderError) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h5" color="error" gutterBottom>Something went wrong</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{renderError}</Typography>
                <Button variant="contained" onClick={() => setRenderError(null)}>Try Again</Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100%' }}>
            {/* Header Section */}
            <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ width: { xs: '100%', sm: 'auto' }, textAlign: { xs: 'center', sm: 'left' } }}>
                    <Typography variant="h4" fontWeight={800} sx={{
                        color: { xs: theme.palette.text.primary, sm: 'transparent' },
                        background: { xs: 'none', sm: 'linear-gradient(45deg, #4F46E5 30%, #EC4899 90%)' },
                        WebkitBackgroundClip: { xs: 'none', sm: 'text' },
                        WebkitTextFillColor: { xs: theme.palette.text.primary, sm: 'transparent' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: { xs: 'center', sm: 'flex-start' },
                        gap: 1,
                        fontSize: { xs: '1.45rem', sm: '2.125rem' },
                        mb: { xs: 0.5, sm: 0 }
                    }}>
                        Promo Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        Create and manage discount codes for your customers
                    </Typography>
                </Box>
                <Stack direction="row" spacing={{ xs: 1, sm: 2 }} sx={{ width: { xs: '100%', sm: 'auto' }, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: { xs: 2, sm: 3 }, p: 0.5, border: '1px solid', borderColor: 'divider' }}>
                        <IconButton
                            size="small"
                            onClick={() => setViewMode('list')}
                            color={viewMode === 'list' ? 'primary' : 'default'}
                            sx={{ borderRadius: { xs: 1.5, sm: 2 }, bgcolor: viewMode === 'list' ? alpha(theme.palette.primary.main, 0.1) : 'transparent', p: { xs: 0.5, sm: 1 } }}
                        >
                            <ViewListIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => setViewMode('grid')}
                            color={viewMode === 'grid' ? 'primary' : 'default'}
                            sx={{ borderRadius: { xs: 1.5, sm: 2 }, bgcolor: viewMode === 'grid' ? alpha(theme.palette.primary.main, 0.1) : 'transparent', p: { xs: 0.5, sm: 1 } }}
                        >
                            <GridViewIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                        </IconButton>
                    </Box>
                    <TextField
                        placeholder="Search..."
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: 'text.secondary', fontSize: { xs: 18, sm: 20 } }} />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: { xs: 2, sm: 3 }, bgcolor: 'background.paper', fontSize: { xs: '0.8rem', sm: '0.875rem' } }
                        }}
                        sx={{ flexGrow: { xs: 1, sm: 0 }, width: { sm: 200 } }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                        onClick={() => handleOpenDialog()}
                        sx={{
                            borderRadius: { xs: 2, sm: 3 },
                            minWidth: { xs: 'auto', sm: 140 },
                            px: { xs: 1.5, sm: 3 },
                            py: { xs: 0.8, sm: 1 },
                            boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)',
                            background: 'linear-gradient(45deg, #4F46E5, #6366F1)',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}
                    >
                        {isMobile ? "Add" : "New Promo"}
                    </Button>
                </Stack>
            </Box>

            {/* Quick Stats */}
            <Grid container spacing={{ xs: 1.5, sm: 3 }} sx={{ mb: { xs: 2.5, sm: 4 } }}>
                <Grid item xs={6} sm={6} md={3}>
                    <StatCard title="Total Promos" value={stats.total} icon={<LocalOfferIcon />} color="#4F46E5" />
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                    <StatCard title="Active Now" value={stats.active} icon={<CheckCircleIcon />} color="#10B981" />
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                    <StatCard title="Scheduled" value={stats.scheduled} icon={<EventIcon />} color="#F59E0B" />
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                    <StatCard title="Expired" value={stats.expired} icon={<CancelIcon />} color="#EF4444" />
                </Grid>
            </Grid>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(e, newValue) => {
                        setTabValue(newValue);
                        setPage(0);
                    }}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTab-root': {
                            fontWeight: 'bold',
                            fontFamily: '"Outfit", sans-serif',
                            textTransform: 'none',
                        }
                    }}
                >
                    <Tab label={`All (${counts.all})`} />
                    <Tab label={`Active (${counts.active})`} />
                    <Tab label={`Expired (${counts.expired})`} />
                    <Tab label={`Inactive (${counts.inactive})`} />
                    <Tab label={`Deleted (${counts.deleted})`} />
                </Tabs>
            </Box>

            {/* Content Section */}
            {loading && promos.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
                    <CircularProgress />
                </Box>
            ) : viewMode === 'grid' ? (
                <Grid container spacing={3}>
                    {filteredPromos.map((promo, index) => {
                        const status = getStatusInfo(promo);
                        return (
                            <Grid item xs={12} md={6} lg={4} key={promo._id}>
                                <Fade in timeout={(index % 6) * 100 + 300}>
                                    <Card sx={{
                                        borderRadius: 4,
                                        position: 'relative',
                                        overflow: 'hidden',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        '&:hover': {
                                            boxShadow: theme.shadows[6],
                                            '& .promo-actions': { opacity: 1, transform: 'translateY(0)' }
                                        }
                                    }}>
                                        {/* Card Header with Status */}
                                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
                                            <Chip
                                                label={tabValue === 4 ? "Deleted" : status.label}
                                                color={tabValue === 4 ? "error" : status.color as any}
                                                size="small"
                                                icon={tabValue === 4 ? undefined : status.icon}
                                                sx={{ fontWeight: 700, borderRadius: 1.5 }}
                                            />
                                            {tabValue !== 4 && (
                                                <Stack direction="row" spacing={0.5}>
                                                    <Tooltip title="Send Email">
                                                        <IconButton size="small" color="info" onClick={() => handleOpenEmailDialog(promo)}>
                                                            <EmailIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Toggle Active">
                                                        <Switch
                                                            checked={promo.active}
                                                            onChange={() => toggleStatus(promo)}
                                                            size="small"
                                                            color="success"
                                                        />
                                                    </Tooltip>
                                                </Stack>
                                            )}
                                        </Box>

                                        {/* Card Body - Coupon Style */}
                                        <Box sx={{ p: 3, flexGrow: 1, textAlign: 'center' }}>
                                            <Box sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                px: 2,
                                                py: 1,
                                                borderRadius: 2,
                                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                                border: '2px dashed',
                                                borderColor: alpha(theme.palette.primary.main, 0.3),
                                                mb: 2,
                                                cursor: 'pointer'
                                            }} onClick={() => copyToClipboard(promo.code)}>
                                                <Typography variant="h5" fontWeight={900} sx={{ color: 'primary.main', fontFamily: 'monospace', letterSpacing: 2 }}>
                                                    {promo.code}
                                                </Typography>
                                                <CopyIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                                            </Box>

                                            <Typography variant="h6" fontWeight={700} gutterBottom>
                                                {promo.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                                                {promo.description || 'Get amazing discount on your next order!'}
                                            </Typography>

                                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 1 }}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Typography variant="h4" fontWeight={800} color="secondary.main">
                                                        {promo.discountValue}{promo.discountType === 'percentage' ? '%' : '$'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">OFF</Typography>
                                                </Box>
                                                <Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Typography variant="h4" fontWeight={800} color="text.primary">
                                                        {promo.currentUses || 0}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">USED</Typography>
                                                </Box>
                                            </Box>
                                        </Box>

                                        {/* Card Footer */}
                                        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                                            <Grid container spacing={1}>
                                                <Grid item xs={6}>
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <WalletIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            Min Bill: {formatCurrency(promo.minBillAmount)}
                                                        </Typography>
                                                    </Stack>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <EventIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            Ends: {safeFormatDate(promo.validTo)}
                                                        </Typography>
                                                    </Stack>
                                                </Grid>
                                            </Grid>
                                        </Box>

                                        {/* Quick Action Overlay */}
                                        <Box className="promo-actions" sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            p: 1.5,
                                            bgcolor: alpha(theme.palette.background.paper, 0.95),
                                            display: 'flex',
                                            justifyContent: 'center',
                                            gap: 1,
                                            opacity: 0,
                                            transform: 'translateY(100%)',
                                            transition: 'all 0.3s ease',
                                            backdropFilter: 'blur(4px)',
                                            boxShadow: '0 -4px 10px rgba(0,0,0,0.05)'
                                        }}>
                                            {tabValue === 4 ? (
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    size="small"
                                                    color="success"
                                                    startIcon={<CheckCircleIcon fontSize="small" />}
                                                    onClick={() => handleRestorePromo(promo)}
                                                    sx={{ borderRadius: 2 }}
                                                >
                                                    Restore
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button
                                                        fullWidth
                                                        variant="outlined"
                                                        size="small"
                                                        startIcon={<EditIcon fontSize="small" />}
                                                        onClick={() => handleOpenDialog(promo)}
                                                        sx={{ borderRadius: 2 }}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        fullWidth
                                                        variant="outlined"
                                                        size="small"
                                                        color="error"
                                                        startIcon={<DeleteIcon fontSize="small" />}
                                                        onClick={() => handleDelete(promo)}
                                                        sx={{ borderRadius: 2 }}
                                                    >
                                                        Delete
                                                    </Button>
                                                </>
                                            )}
                                        </Box>
                                    </Card>
                                </Fade>
                            </Grid>
                        );
                    })}
                </Grid>
            ) : isMobile ? (
                <Stack spacing={1.5}>
                    {filteredPromos.map((promo) => {
                        const status = getStatusInfo(promo);
                        return (
                            <Card
                                key={promo._id}
                                sx={{
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    boxShadow: 'none',
                                }}
                            >
                                <CardContent sx={{ p: 1.5 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 0.75,
                                                px: 1.25,
                                                py: 0.5,
                                                borderRadius: 1.5,
                                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                                border: '1px dashed',
                                                borderColor: alpha(theme.palette.primary.main, 0.3),
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => copyToClipboard(promo.code)}
                                        >
                                            <Typography sx={{ fontWeight: 700, color: 'primary.main', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                                {promo.code}
                                            </Typography>
                                            <CopyIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                        </Box>
                                        <Chip
                                            label={tabValue === 4 ? "Deleted" : status.label}
                                            color={tabValue === 4 ? "error" : status.color as any}
                                            size="small"
                                            sx={{ fontWeight: 700, height: 24 }}
                                        />
                                    </Box>

                                    <Typography variant="body2" fontWeight={700} sx={{ mb: 0.25 }}>
                                        {promo.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                        {promo.description || 'No description'}
                                    </Typography>

                                    <Grid container spacing={1} sx={{ mb: 1 }}>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary">Discount</Typography>
                                            <Typography variant="body2" fontWeight={700} color="secondary.main">
                                                {promo.discountValue}{promo.discountType === 'percentage' ? '%' : '$'} OFF
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary">Min Bill</Typography>
                                            <Typography variant="body2" fontWeight={700}>
                                                {formatCurrency(promo.minBillAmount)}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary">Usage</Typography>
                                            <Typography variant="body2" fontWeight={700}>
                                                {promo.currentUses || 0}/{promo.maxTotalUses || '∞'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary">Ends</Typography>
                                            <Typography variant="body2" fontWeight={700}>
                                                {safeFormatDate(promo.validTo)}
                                            </Typography>
                                        </Grid>
                                    </Grid>

                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        {tabValue === 4 ? (
                                            <Button
                                                variant="contained"
                                                size="small"
                                                color="success"
                                                startIcon={<CheckCircleIcon fontSize="small" />}
                                                onClick={() => handleRestorePromo(promo)}
                                                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 'bold' }}
                                            >
                                                Restore
                                            </Button>
                                        ) : (
                                            <>
                                                <Switch
                                                    checked={promo.active}
                                                    onChange={() => toggleStatus(promo)}
                                                    size="small"
                                                    color="success"
                                                    sx={{ mr: 'auto' }}
                                                />
                                                <Stack direction="row" spacing={0.5}>
                                                    <Tooltip title="Send Email">
                                                        <IconButton size="small" color="info" onClick={() => handleOpenEmailDialog(promo)}>
                                                            <EmailIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Edit">
                                                        <IconButton size="small" onClick={() => handleOpenDialog(promo)}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton size="small" color="error" onClick={() => handleDelete(promo)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Stack>
            ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 4, overflowX: 'auto', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                    <Table sx={{ minWidth: 1000 }}>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Promo Code</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Name & Description</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Discount</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Usage</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Validity</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredPromos.map((promo) => {
                                const status = getStatusInfo(promo);
                                return (
                                    <TableRow key={promo._id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell>
                                            <Box sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                px: 1.5,
                                                py: 0.5,
                                                borderRadius: 1.5,
                                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                                border: '1px dashed',
                                                borderColor: alpha(theme.palette.primary.main, 0.3),
                                                cursor: 'pointer'
                                            }} onClick={() => copyToClipboard(promo.code)}>
                                                <Typography sx={{ fontWeight: 700, color: 'primary.main', fontFamily: 'monospace' }}>
                                                    {promo.code}
                                                </Typography>
                                                <CopyIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{promo.name}</Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 200 }}>
                                                {promo.description || 'No description'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={700} color="secondary.main">
                                                {promo.discountValue}{promo.discountType === 'percentage' ? '%' : '$'} OFF
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Min: {formatCurrency(promo.minBillAmount)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ flexGrow: 1, width: 40, height: 4, bgcolor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                                                    <Box sx={{
                                                        width: `${Math.min(100, ((promo.currentUses || 0) / (promo.maxTotalUses || 100)) * 100)}%`,
                                                        height: '100%',
                                                        bgcolor: 'primary.main'
                                                    }} />
                                                </Box>
                                                <Typography variant="caption" fontWeight={600}>
                                                    {promo.currentUses || 0}/{promo.maxTotalUses || '∞'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" display="block">
                                                <Box component="span" sx={{ color: 'text.secondary' }}>From: </Box>
                                                {safeFormatDate(promo.validFrom)}
                                            </Typography>
                                            <Typography variant="caption" display="block">
                                                <Box component="span" sx={{ color: 'text.secondary' }}>To: </Box>
                                                {safeFormatDate(promo.validTo)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip
                                                    label={tabValue === 4 ? "Deleted" : status.label}
                                                    color={tabValue === 4 ? "error" : status.color as any}
                                                    size="small"
                                                    sx={{ fontWeight: 700, height: 24 }}
                                                />
                                                {tabValue !== 4 && (
                                                    <Switch
                                                        checked={promo.active}
                                                        onChange={() => toggleStatus(promo)}
                                                        size="small"
                                                        color="success"
                                                    />
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="right">
                                            {tabValue === 4 ? (
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <Tooltip title="Restore Promo">
                                                        <IconButton
                                                            color="success"
                                                            onClick={() => handleRestorePromo(promo)}
                                                        >
                                                            <CheckCircleIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            ) : (
                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                    <Tooltip title="Send Email">
                                                        <IconButton size="small" color="info" onClick={() => handleOpenEmailDialog(promo)}>
                                                            <EmailIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Edit">
                                                        <IconButton size="small" onClick={() => handleOpenDialog(promo)}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton size="small" color="error" onClick={() => handleDelete(promo)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Pagination */}
            {!loading && promos.length > 0 && (
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                    <TablePagination
                        component="div"
                        count={totalItems}
                        page={page}
                        onPageChange={(_, v) => setPage(v)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[6, 12, 24]}
                    />
                </Box>
            )}

            {/* Empty State */}
            {!loading && filteredPromos.length === 0 && (
                <Paper sx={{
                    p: { xs: 4, md: 10 },
                    textAlign: 'center',
                    borderRadius: 4,
                    bgcolor: 'transparent',
                    border: '1px dashed',
                    borderColor: 'divider',
                    mt: { xs: 2, md: 0 }
                }}>
                    <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                        No Promo Codes Found
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 2, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                        Ready to boost your sales? Create your first promotional code now!
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        sx={{ borderRadius: 3, fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                    >
                        Create My First Promo
                    </Button>
                </Paper>
            )}
            {/* Create/Edit Dialog */}
            <Dialog 
                open={openDialog} 
                onClose={() => setOpenDialog(false)} 
                maxWidth="md" 
                fullWidth 
                fullScreen={isMobile}
                PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4, bgcolor: 'background.default' } }}
            >
                <DialogTitle component="div" sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    borderBottom: '1px solid', 
                    borderColor: alpha(theme.palette.divider, 0.1),
                    bgcolor: 'background.paper',
                    p: isMobile ? 2 : 2.5,
                    pt: isMobile ? '60px' : 2.5
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ 
                            p: 1, 
                            borderRadius: 1.5, 
                            bgcolor: alpha(theme.palette.primary.main, 0.1), 
                            color: 'primary.main',
                            display: 'flex'
                        }}>
                             <LocalOfferIcon fontSize={isMobile ? "small" : "medium"} />
                        </Box>
                        <Typography 
                            variant={isMobile ? "subtitle1" : "h6"} 
                            fontWeight={700}
                            sx={{ fontFamily: '"Outfit", sans-serif', textTransform: 'uppercase', letterSpacing: '0.02em' }}
                        >
                            {editingPromo ? 'Edit Promo Code' : 'Create New Promo'}
                        </Typography>
                    </Box>
                    <IconButton 
                        onClick={() => setOpenDialog(false)} 
                        size="small" 
                        sx={{ 
                            bgcolor: alpha(theme.palette.error.main, 0.1), 
                            color: 'error.main', 
                            '&:hover': { bgcolor: 'error.main', color: 'white' } 
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: isMobile ? 1.5 : 3, bgcolor: 'background.default' }}>
                    <Grid container spacing={isMobile ? 1.5 : 3} sx={{ mt: 0.5 }}>
                        {/* Basic Info */}
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'stretch' }}>
                            <Paper sx={{ 
                                p: isMobile ? 2 : 3, 
                                borderRadius: 3, 
                                width: '100%', 
                                maxWidth: isMobile ? 600 : 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.divider, 0.05),
                                bgcolor: 'background.paper'
                            }}>
                                <Typography 
                                    variant="caption" 
                                    fontWeight={700} 
                                    color="primary" 
                                    sx={{ 
                                        display: 'block', 
                                        mb: 2, 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '0.05em',
                                        fontFamily: '"Outfit", sans-serif'
                                    }}
                                >
                                    Basic Information
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Promo Code"
                                            required
                                            size="small"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                            placeholder="E.g. SUMMER2026"
                                            helperText={isMobile ? "" : "This is what customers will enter"}
                                            InputProps={{ sx: { borderRadius: 2, fontWeight: 700, fontFamily: 'monospace' } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Internal Name"
                                            required
                                            size="small"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="E.g. Summer Festival Offer"
                                            InputProps={{ sx: { borderRadius: 2 } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Description"
                                            multiline
                                            rows={isMobile ? 2 : 1}
                                            size="small"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Short description for customers..."
                                            InputProps={{ sx: { borderRadius: 2 } }}
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                        {/* Discount Rules */}
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'stretch' }}>
                            <Paper sx={{ 
                                p: isMobile ? 2 : 3, 
                                borderRadius: 3, 
                                width: '100%', 
                                maxWidth: isMobile ? 600 : 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.divider, 0.05),
                                bgcolor: 'background.paper'
                            }}>
                                <Typography 
                                    variant="caption" 
                                    fontWeight={700} 
                                    color="primary" 
                                    sx={{ 
                                        display: 'block', 
                                        mb: 2, 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '0.05em',
                                        fontFamily: '"Outfit", sans-serif'
                                    }}
                                >
                                    Discount Rules
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={4}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Discount Type</InputLabel>
                                            <Select
                                                value={formData.discountType}
                                                label="Discount Type"
                                                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                <MenuItem value="percentage">Percentage (%)</MenuItem>
                                                <MenuItem value="fixed">Fixed Amount ($)</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <TextField
                                            fullWidth
                                            label="Value"
                                            type="number"
                                            size="small"
                                            required
                                            value={formData.discountValue === 0 ? '' : formData.discountValue}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    discountValue: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                                                })
                                            }
                                            inputProps={{ min: 0 }}
                                            InputProps={{
                                                endAdornment: <InputAdornment position="end" sx={{ opacity: 0.5 }}>{formData.discountType === 'percentage' ? '%' : '$'}</InputAdornment>,
                                                sx: { borderRadius: 2, fontWeight: 700 }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <TextField
                                            fullWidth
                                            label="Min Order"
                                            type="number"
                                            size="small"
                                            value={formData.minBillAmount === 0 ? '' : formData.minBillAmount}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    minBillAmount: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                                                })
                                            }
                                            inputProps={{ min: 0 }}
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start" sx={{ opacity: 0.5 }}>$</InputAdornment>,
                                                sx: { borderRadius: 2 }
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                        {/* Validity & Limits */}
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'stretch' }}>
                            <Paper sx={{ 
                                p: isMobile ? 2 : 3, 
                                borderRadius: 3, 
                                width: '100%', 
                                maxWidth: isMobile ? 600 : 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.divider, 0.05),
                                bgcolor: 'background.paper'
                            }}>
                                <Typography 
                                    variant="caption" 
                                    fontWeight={700} 
                                    color="primary" 
                                    sx={{ 
                                        display: 'block', 
                                        mb: 2, 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '0.05em',
                                        fontFamily: '"Outfit", sans-serif'
                                    }}
                                >
                                    Validity & Usage Limits
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Valid From"
                                            type="date"
                                            size="small"
                                            required
                                            value={formData.validFrom}
                                            onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                            InputLabelProps={{ shrink: true }}
                                            inputProps={{ 
                                                min: editingPromo ? formData.validFrom : format(new Date(), 'yyyy-MM-dd') 
                                            }}
                                            InputProps={{ sx: { borderRadius: 2 } }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Valid To"
                                            type="date"
                                            size="small"
                                            required
                                            value={formData.validTo}
                                            onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                                            InputLabelProps={{ shrink: true }}
                                            inputProps={{ 
                                                min: (formData.validFrom && formData.validFrom > format(new Date(), 'yyyy-MM-dd')) 
                                                    ? formData.validFrom 
                                                    : format(new Date(), 'yyyy-MM-dd') 
                                            }}
                                            InputProps={{ sx: { borderRadius: 2 } }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Total Limit"
                                            type="number"
                                            size="small"
                                            value={formData.maxTotalUses}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => setFormData({ ...formData, maxTotalUses: Math.max(0, Number(e.target.value)) })}
                                            inputProps={{ min: 0 }}
                                            InputProps={{ sx: { borderRadius: 2 } }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Per User"
                                            type="number"
                                            size="small"
                                            value={formData.maxUsesPerCustomer}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => setFormData({ ...formData, maxUsesPerCustomer: Math.max(0, Number(e.target.value)) })}
                                            inputProps={{ min: 0 }}
                                            InputProps={{ sx: { borderRadius: 2 } }}
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>

                        {/* Availability */}
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'stretch' }}>
                            <Paper sx={{ 
                                p: isMobile ? 2 : 3, 
                                borderRadius: 3, 
                                width: '100%', 
                                maxWidth: isMobile ? 600 : 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.divider, 0.05),
                                bgcolor: 'background.paper'
                            }}>
                                <Typography 
                                    variant="caption" 
                                    fontWeight={700} 
                                    color="primary" 
                                    sx={{ 
                                        display: 'block', 
                                        mb: 1.5, 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '0.05em',
                                        fontFamily: '"Outfit", sans-serif'
                                    }}
                                >
                                    Service Availability
                                </Typography>
                                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                    <InputLabel>Offer Scope</InputLabel>
                                    <Select
                                        value={formData.offerType}
                                        label="Offer Scope"
                                        onChange={(e) => setFormData({ ...formData, offerType: e.target.value as any })}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        <MenuItem value="cart_total">Entire Cart</MenuItem>
                                        <MenuItem value="menu_item">Specific Item</MenuItem>
                                        <MenuItem value="combo">Combo Offer</MenuItem>
                                    </Select>
                                </FormControl>
                                <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 600 }}>Applicable Order Types</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                    {ORDER_TYPES.map((type) => (
                                        <Chip
                                            key={type.value}
                                            label={type.label}
                                            size="small"
                                            onClick={() => {
                                                const current = [...formData.applicableOrderTypes];
                                                const index = current.indexOf(type.value);
                                                if (index > -1) current.splice(index, 1);
                                                else current.push(type.value);
                                                setFormData({ ...formData, applicableOrderTypes: current });
                                            }}
                                            color={formData.applicableOrderTypes.includes(type.value) ? 'primary' : 'default'}
                                            variant={formData.applicableOrderTypes.includes(type.value) ? 'filled' : 'outlined'}
                                            sx={{ borderRadius: 1.5, fontSize: '0.7rem', height: 26 }}
                                        />
                                    ))}
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: isMobile ? 2 : 3, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', gap: 1.5 }}>
                    <Button 
                        onClick={() => setOpenDialog(false)} 
                        sx={{ 
                            textTransform: 'none', 
                            fontWeight: 'bold',
                            color: 'text.secondary'
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={formLoading}
                        sx={{ 
                            borderRadius: 2, 
                            px: 4, 
                            textTransform: 'none', 
                            fontWeight: 'bold',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                    >
                        {formLoading ? <CircularProgress size={24} color="inherit" /> : editingPromo ? 'Update Promo' : 'Create Promo'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Email Promotion Dialog */}
            <Dialog
                open={openEmailDialog}
                onClose={() => setOpenEmailDialog(false)}
                maxWidth="md"
                fullWidth
                fullScreen={isMobile}
                PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4, bgcolor: 'background.default' } }}
            >
                <DialogTitle component="div" sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: alpha(theme.palette.divider, 0.1),
                    bgcolor: 'background.paper',
                    p: isMobile ? 2 : 2.5,
                    pt: isMobile ? '60px' : 2.5
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: alpha(theme.palette.info.main, 0.1),
                            color: 'info.main',
                            display: 'flex'
                        }}>
                            <EmailIcon fontSize={isMobile ? "small" : "medium"} />
                        </Box>
                        <Typography
                            variant={isMobile ? "subtitle1" : "h6"}
                            fontWeight={700}
                            sx={{ fontFamily: '"Outfit", sans-serif', textTransform: 'uppercase' }}
                        >
                            Email Promotion
                        </Typography>
                    </Box>
                    <IconButton
                        onClick={() => setOpenEmailDialog(false)}
                        size="small"
                        sx={{
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            color: 'error.main',
                            '&:hover': { bgcolor: 'error.main', color: 'white' }
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: isMobile ? 1.5 : 3, bgcolor: 'background.default' }}>
                    <Grid container spacing={isMobile ? 1.5 : 3} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} md={7}>
                            <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: 3, bgcolor: 'background.paper', height: '100%' }}>
                                <Typography variant="caption" fontWeight={700} color="primary" sx={{ display: 'block', mb: 2, textTransform: 'uppercase', fontFamily: '"Outfit", sans-serif' }}>
                                    Message Content
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Subject"
                                    size="small"
                                    value={emailData.subject}
                                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                    sx={{ mb: 2 }}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={isMobile ? 6 : 12}
                                    label="Message Body"
                                    size="small"
                                    value={emailData.message}
                                    onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <Paper sx={{ p: isMobile ? 2 : 3, borderRadius: 3, bgcolor: 'background.paper', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="caption" fontWeight={700} color="primary" sx={{ textTransform: 'uppercase', fontFamily: '"Outfit", sans-serif' }}>
                                        Recipients ({emailData.selectedCustomers.length})
                                    </Typography>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={emailData.selectAll}
                                                onChange={(e) => handleSelectAllCustomers(e.target.checked)}
                                            />
                                        }
                                        label={<Typography variant="caption" fontWeight={700}>Select All</Typography>}
                                        sx={{ m: 0 }}
                                    />
                                </Box>
                                <Box sx={{ flexGrow: 1, maxHeight: 400, overflowY: 'auto', pr: 1 }}>
                                    {Array.from(
                                        new Map(
                                            customers.filter(c => c.email).map(c => [c.email, c])
                                        ).values()
                                    ).map((customer, index) => (
                                        <FormControlLabel
                                            key={`customer-email-${index}-${customer.email}`}
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={emailData.selectedCustomers.includes(customer.email)}
                                                    onChange={(e) => handleSelectCustomer(customer.email, e.target.checked)}
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 150 }}>{customer.name || 'Guest'}</Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 150 }}>{customer.email}</Typography>
                                                </Box>
                                            }
                                            sx={{ display: 'flex', mb: 1, ml: 0, p: 1, borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.divider, 0.1), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) } }}
                                        />
                                    ))}
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: isMobile ? 2 : 3, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: alpha(theme.palette.divider, 0.1), gap: 1.5 }}>
                    <Button onClick={() => setOpenEmailDialog(false)} sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSendBulkEmail}
                        disabled={emailLoading || emailData.selectedCustomers.length === 0}
                        startIcon={emailLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                        sx={{
                            borderRadius: 2,
                            px: 4,
                            fontWeight: 'bold',
                            background: 'linear-gradient(45deg, #4F46E5, #6366F1)'
                        }}
                    >
                        Send to {emailData.selectedCustomers.length}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                fullScreen={isMobile}
                PaperProps={{
                    sx: { borderRadius: { xs: 0, sm: 4 }, backgroundImage: 'none' }
                }}
            >
                <DialogTitle component="div" sx={{ 
                    m: 0, 
                    p: { xs: 2.5, sm: 3 }, 
                    pt: { xs: isMobile ? '54px' : 2.5, sm: 3 },
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center'
                }}>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            fontWeight: 800, 
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: { xs: '1.25rem', sm: '1.25rem' }
                        }}
                    >
                        Delete Promo Code
                    </Typography>
                    <IconButton
                        onClick={() => setOpenDeleteDialog(false)}
                        size="small"
                        sx={{
                            color: 'text.secondary',
                            '&:hover': { bgcolor: alpha(theme.palette.divider, 0.1) }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
                    <Box sx={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: '50%', 
                        bgcolor: alpha(theme.palette.error.main, 0.1), 
                        color: 'error.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3
                    }}>
                        <DeleteIcon sx={{ fontSize: 40 }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", mb: 2 }}>
                        Are you sure?
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontWeight: 500, mb: 1 }}>
                        You are about to permanently delete the promo code:
                        <br />
                        <Box component="span" sx={{ color: 'text.primary', fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1 }}>
                            {promoToDelete?.code}
                        </Box>
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mt: 2, fontStyle: 'italic' }}>
                        This promo code will be soft-deleted. You can restore it from the Deleted tab later.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ 
                    p: { xs: 2.5, sm: 3 }, 
                    pb: { xs: isMobile ? '32px' : 2.5, sm: 3 },
                    gap: 1.5,
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                }}>
                    <Button
                        onClick={() => setOpenDeleteDialog(false)}
                        sx={{ 
                            flex: 1,
                            borderRadius: 2.5,
                            py: 1.25,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontFamily: "'Outfit', sans-serif",
                            color: 'text.secondary'
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmDelete}
                        variant="contained"
                        color="error"
                        sx={{ 
                            flex: 1,
                            borderRadius: 2.5,
                            py: 1.25,
                            textTransform: 'none',
                            fontWeight: 800,
                            fontFamily: "'Outfit', sans-serif",
                            boxShadow: `0 8px 16px ${alpha(theme.palette.error.main, 0.3)}`,
                            background: 'linear-gradient(45deg, #EF4444, #DC2626)'
                        }}
                    >
                        Confirm Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Restore Confirmation Dialog */}
            <Dialog
                open={openRestoreDialog}
                onClose={() => setOpenRestoreDialog(false)}
                fullScreen={isMobile}
                PaperProps={{
                    sx: { borderRadius: { xs: 0, sm: 4 }, backgroundImage: 'none' }
                }}
            >
                <DialogTitle component="div" sx={{ 
                    m: 0, 
                    p: { xs: 2.5, sm: 3 }, 
                    pt: { xs: isMobile ? '54px' : 2.5, sm: 3 },
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center'
                }}>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            fontWeight: 800, 
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: { xs: '1.25rem', sm: '1.25rem' }
                        }}
                    >
                        Confirm Restore
                    </Typography>
                    <IconButton
                        onClick={() => setOpenRestoreDialog(false)}
                        size="small"
                        sx={{
                            color: 'text.secondary',
                            '&:hover': { bgcolor: alpha(theme.palette.divider, 0.1) }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
                    <Box sx={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: '50%', 
                        bgcolor: alpha(theme.palette.success.main, 0.1), 
                        color: 'success.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3
                    }}>
                        <CheckCircleIcon sx={{ fontSize: 40 }} />
                    </Box>
                    <Typography sx={{ color: 'text.secondary', fontWeight: 500, mb: 1 }}>
                        Are you sure you want to restore promo code:
                        <br />
                        <Box component="span" sx={{ color: 'text.primary', fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1 }}>
                            {restoreTarget?.code}
                        </Box>
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ 
                    p: { xs: 2.5, sm: 3 }, 
                    pb: { xs: isMobile ? '32px' : 2.5, sm: 3 },
                    gap: 1.5,
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                }}>
                    <Button
                        onClick={() => setOpenRestoreDialog(false)}
                        sx={{ 
                            flex: 1,
                            borderRadius: 2.5,
                            py: 1.25,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontFamily: "'Outfit', sans-serif",
                            color: 'text.secondary'
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmRestorePromo}
                        variant="contained"
                        color="success"
                        sx={{ 
                            flex: 1,
                            borderRadius: 2.5,
                            py: 1.25,
                            textTransform: 'none',
                            fontWeight: 800,
                            fontFamily: "'Outfit', sans-serif",
                            boxShadow: `0 8px 16px ${alpha(theme.palette.success.main, 0.3)}`,
                            background: 'linear-gradient(45deg, #10B981, #059669)'
                        }}
                    >
                        Restore
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PromoCodePage;
