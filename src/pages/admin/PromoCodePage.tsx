import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Grid,
    Card,
    CardContent,
    Chip,
    IconButton,
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Tooltip,
    CircularProgress,
    useTheme,
    alpha,
    Switch,
    FormControlLabel,
    Divider,
    Tabs,
    Tab,
    TablePagination,
    Zoom,
    Fade
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ContentCopy as CopyIcon,
    FilterList as FilterIcon,
    TrendingUp as TrendingUpIcon,
    LocalOffer as LocalOfferIcon,
    EventAvailable as EventIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Email as EmailIcon,
    Sms as SmsIcon,
    Close as CloseIcon,
    Info as InfoIcon,
    KeyboardArrowRight as ArrowRightIcon,
    AccountBalanceWallet as WalletIcon
} from '@mui/icons-material';
import { couponsAPI, menuAPI, customersAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { useSettings } from '../../context/SettingsContext';
import axios from 'axios';

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
    { value: 'global_dine_in', label: 'Global QR' }
];

const StatCard = ({ title, value, icon, color, trend }: any) => {
    const theme = useTheme();
    return (
        <Card sx={{
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            borderRadius: 4,
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
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: alpha(color, 0.1),
                zIndex: 0
            }} />
            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(color, 0.2), color: color }}>
                        {icon}
                    </Avatar>
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                            {title}
                        </Typography>
                        <Typography variant="h5" fontWeight={800}>
                            {value}
                        </Typography>
                    </Box>
                </Stack>
                {trend && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingUpIcon sx={{ color: 'success.main', fontSize: 16 }} />
                        <Typography variant="caption" color="success.main" fontWeight={700}>
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
    const { settings, formatCurrency } = useSettings();
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(6);
    const [totalItems, setTotalItems] = useState(0);

    // Dialog state
    const [openDialog, setOpenDialog] = useState(false);
    const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Messaging dialogs
    const [openEmailDialog, setOpenEmailDialog] = useState(false);
    const [openSmsDialog, setOpenSmsDialog] = useState(false);
    const [selectedForMessage, setSelectedForMessage] = useState<PromoCode | null>(null);
    const [renderError, setRenderError] = useState<string | null>(null);

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
            const response = await couponsAPI.getAll({ page: page + 1, limit: rowsPerPage });
            const responseData = response.data;
            
            if (responseData && responseData.coupons && Array.isArray(responseData.coupons)) {
                setPromos(responseData.coupons);
                setTotalItems(responseData.total || responseData.coupons.length);
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

    useEffect(() => {
        fetchPromos();
    }, [page, rowsPerPage]);

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
                await couponsAPI.update(editingPromo._id, payload);
                toast.success('Promo code updated');
            } else {
                await couponsAPI.create(payload);
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

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this promo code?')) return;
        try {
            await couponsAPI.delete(id);
            toast.success('Promo code deleted');
            fetchPromos();
        } catch (error) {
            toast.error('Failed to delete promo code');
        }
    };

    const toggleStatus = async (promo: PromoCode) => {
        try {
            await couponsAPI.update(promo._id, { ...promo, active: !promo.active });
            toast.success(`Promo ${!promo.active ? 'activated' : 'deactivated'}`);
            fetchPromos();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success(`Code ${code} copied!`);
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
                <Box>
                    <Typography variant="h4" fontWeight={800} sx={{
                        background: 'linear-gradient(45deg, #4F46E5 30%, #EC4899 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5
                    }}>
                        <LocalOfferIcon sx={{ fontSize: 32, color: '#4F46E5' }} />
                        Promo Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Create and manage discount codes for your customers
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <TextField
                        placeholder="Search codes..."
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: 'text.secondary' }} />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 3, bgcolor: 'background.paper' }
                        }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        sx={{
                            borderRadius: 3,
                            px: 3,
                            boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)',
                            background: 'linear-gradient(45deg, #4F46E5, #6366F1)'
                        }}
                    >
                        New Promo
                    </Button>
                </Stack>
            </Box>

            {/* Quick Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Total Promos" value={stats.total} icon={<LocalOfferIcon />} color="#4F46E5" trend="+12% this month" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Active Now" value={stats.active} icon={<CheckCircleIcon />} color="#10B981" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Scheduled" value={stats.scheduled} icon={<EventIcon />} color="#F59E0B" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Expired" value={stats.expired} icon={<CancelIcon />} color="#EF4444" />
                </Grid>
            </Grid>

            {/* Content Section */}
            {loading && promos.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
                    <CircularProgress />
                </Box>
            ) : (
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
                                                label={status.label}
                                                color={status.color as any}
                                                size="small"
                                                icon={status.icon}
                                                sx={{ fontWeight: 700, borderRadius: 1.5 }}
                                            />
                                            <Stack direction="row" spacing={0.5}>
                                                <Tooltip title="Send Email">
                                                    <IconButton size="small" color="info" onClick={() => { setSelectedForMessage(promo); setOpenEmailDialog(true); }}>
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
                                                onClick={() => handleDelete(promo._id)}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                Delete
                                            </Button>
                                        </Box>
                                    </Card>
                                </Fade>
                            </Grid>
                        );
                    })}
                </Grid>
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
                <Paper sx={{ p: 10, textAlign: 'center', borderRadius: 4, bgcolor: 'transparent', border: '1px dashed', borderColor: 'divider' }}>
                    <LocalOfferIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No Promo Codes Found</Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                        Ready to boost your sales? Create your first promotional code now!
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ borderRadius: 3 }}>
                        Create My First Promo
                    </Button>
                </Paper>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight={700}>
                        {editingPromo ? 'Edit Promo Code' : 'Create New Promo'}
                    </Typography>
                    <IconButton onClick={() => setOpenDialog(false)} size="small" sx={{ bgcolor: 'error.light', color: 'error.main', '&:hover': { bgcolor: 'error.main', color: 'white' } }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 4 }}>
                    <Grid container spacing={3} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Promo Code"
                                required
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="E.g. SUMMER2026"
                                helperText="This is what customers will enter"
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Internal Name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="E.g. Summer Festival Offer"
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Description"
                                multiline
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Short description for customers..."
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth>
                                <InputLabel>Discount Type</InputLabel>
                                <Select
                                    value={formData.discountType}
                                    label="Discount Type"
                                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                                    sx={{ borderRadius: 3 }}
                                >
                                    <MenuItem value="percentage">Percentage (%)</MenuItem>
                                    <MenuItem value="fixed">Fixed Amount ($)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Discount Value"
                                type="number"
                                required
                                value={formData.discountValue}
                                onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">{formData.discountType === 'percentage' ? '%' : '$'}</InputAdornment>,
                                    sx: { borderRadius: 3 }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Min Bill Amount"
                                type="number"
                                value={formData.minBillAmount}
                                onChange={(e) => setFormData({ ...formData, minBillAmount: Number(e.target.value) })}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                    sx: { borderRadius: 3 }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Valid From"
                                type="date"
                                required
                                value={formData.validFrom}
                                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Valid To"
                                type="date"
                                required
                                value={formData.validTo}
                                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="Total Uses"
                                type="number"
                                value={formData.maxTotalUses}
                                onChange={(e) => setFormData({ ...formData, maxTotalUses: Number(e.target.value) })}
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="Uses Per Customer"
                                type="number"
                                value={formData.maxUsesPerCustomer}
                                onChange={(e) => setFormData({ ...formData, maxUsesPerCustomer: Number(e.target.value) })}
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Offer Type</InputLabel>
                                <Select
                                    value={formData.offerType}
                                    label="Offer Type"
                                    onChange={(e) => setFormData({ ...formData, offerType: e.target.value as any })}
                                    sx={{ borderRadius: 3 }}
                                >
                                    <MenuItem value="cart_total">Entire Cart</MenuItem>
                                    <MenuItem value="menu_item">Specific Item</MenuItem>
                                    <MenuItem value="combo">Combo Offer</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom fontWeight={700}>Applicable Order Types</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {ORDER_TYPES.map((type) => (
                                    <Chip
                                        key={type.value}
                                        label={type.label}
                                        onClick={() => {
                                            const current = [...formData.applicableOrderTypes];
                                            const index = current.indexOf(type.value);
                                            if (index > -1) current.splice(index, 1);
                                            else current.push(type.value);
                                            setFormData({ ...formData, applicableOrderTypes: current });
                                        }}
                                        color={formData.applicableOrderTypes.includes(type.value) ? 'primary' : 'default'}
                                        variant={formData.applicableOrderTypes.includes(type.value) ? 'filled' : 'outlined'}
                                        sx={{ borderRadius: 2 }}
                                    />
                                ))}
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button onClick={() => setOpenDialog(false)} sx={{ borderRadius: 3, px: 3 }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={formLoading}
                        sx={{ borderRadius: 3, px: 4, minWidth: 120 }}
                    >
                        {formLoading ? <CircularProgress size={24} color="inherit" /> : editingPromo ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default PromoCodePage;
