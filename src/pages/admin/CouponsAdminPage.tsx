import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Stack,
    IconButton,
    Checkbox,
    FormControlLabel,
    Grid,
    Card,
    CardContent,
    CircularProgress,
    useTheme,
    useMediaQuery,
    Tooltip,
    TablePagination,
    Avatar,
    InputAdornment,
    Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Email as EmailIcon,
    Send as SendIcon,
    People as PeopleIcon,
    Close as CloseIcon,
    Sms as SmsIcon,
    Search as SearchIcon,
    CheckCircle as CheckCircleIcon,
    Phone as PhoneIcon,
} from '@mui/icons-material';
import { couponsAPI, reportsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useSettings } from '../../context/SettingsContext';

interface Coupon {
    _id: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    validFrom?: Date;
    validTo?: Date;
    maxTotalUses?: number;
    maxUsesPerCustomer?: number;
    applicableOrderTypes?: string[];
    active: boolean;
    description?: string;
    offerType?: 'cart_total' | 'menu_item' | 'combo';
    applicableItems?: string[];
}

interface Customer {
    name: string;
    email: string;
    phone: string;
    totalOrders: number;
    totalSpent?: number;
}

const CouponsAdminPage: React.FC = () => {
    const { settings, formatCurrency } = useSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalCoupons, setTotalCoupons] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [openEmailDialog, setOpenEmailDialog] = useState(false);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [emailLoading, setEmailLoading] = useState(false);
    const [smsLoading, setSmsLoading] = useState(false);
    const [selectedSmsPhones, setSelectedSmsPhones] = useState<string[]>([]);
    const [selectAllSms, setSelectAllSms] = useState(false);
    const [smsSearch, setSmsSearch] = useState('');
    const [openSmsDialog, setOpenSmsDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; code: string } | null>(null);

    const [menuItems, setMenuItems] = useState<any[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        discountType: 'percentage' as 'percentage' | 'fixed',
        discountValue: 0,
        minBillAmount: 0,
        maxDiscountAmount: 0,
        validFrom: '',
        validTo: '',
        maxTotalUses: 0,
        maxUsesPerCustomer: 1,
        applicableOrderTypes: ['dine_in', 'takeaway', 'delivery', 'online_takeaway'] as string[],
        active: true,
        description: '',
        offerType: 'cart_total' as 'cart_total' | 'menu_item' | 'combo',
        applicableItems: [] as string[],
    });

    // Email form state
    const [emailData, setEmailData] = useState({
        subject: '',
        message: '',
        selectedCustomers: [] as string[],
        selectAll: false,
    });

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const response = await couponsAPI.getAll({ page: page + 1, limit: rowsPerPage });
            const data = response.data.coupons || response.data;
            const safeCoupons = Array.isArray(data) ? data : [];
            setCoupons(safeCoupons);
            setTotalCoupons(response.data.total || safeCoupons.length);
        } catch (error) {
            console.error('Error fetching coupons:', error);
            toast.error('Failed to load coupons');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, [page, rowsPerPage]);



    const fetchMenu = async () => {
        try {
            const res = await import('../../services/api').then(m => m.menuAPI.getAll());
            const data = res.data;
            setMenuItems(Array.isArray(data) ? data : (data?.items || []));
        } catch (error) {
            console.error('Failed to load menu items');
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await import('../../services/api').then(m => m.customersAPI.getAll({ page: 1, limit: 1000 }));
            const raw = response.data.customers || response.data;
            const fetched = Array.isArray(raw) ? raw : [];
            setAllCustomers(fetched);
            const customersWithEmail = fetched.filter((c: any) => c.email);
            setCustomers(customersWithEmail);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    // Initial load
    useEffect(() => {
        // fetchCustomers and fetchMenu only need to run once
        fetchCustomers();
        fetchMenu();
    }, []);

    const handleOpenDialog = (coupon?: Coupon) => {
        if (coupon) {
            setSelectedCoupon(coupon);
            setFormData({
                code: coupon.code,
                name: (coupon as any).name || coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                minBillAmount: (coupon as any).minBillAmount || coupon.minOrderAmount || 0,
                maxDiscountAmount: coupon.maxDiscountAmount || 0,
                validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().split('T')[0] : '',
                validTo: coupon.validTo ? new Date(coupon.validTo).toISOString().split('T')[0] : '',
                maxTotalUses: coupon.maxTotalUses || 0,
                maxUsesPerCustomer: coupon.maxUsesPerCustomer || 1,
                applicableOrderTypes: coupon.applicableOrderTypes || ['dine_in', 'takeaway', 'delivery', 'online_takeaway'],
                active: coupon.active,
                description: coupon.description || '',
                offerType: (coupon.offerType as any) || 'cart_total',
                applicableItems: coupon.applicableItems || [],
            });
        } else {
            setSelectedCoupon(null);
            setFormData({
                code: '',
                name: '',
                discountType: 'percentage',
                discountValue: 0,
                minBillAmount: 0,
                maxDiscountAmount: 0,
                validFrom: '',
                validTo: '',
                maxTotalUses: 0,
                maxUsesPerCustomer: 1,
                applicableOrderTypes: ['dine_in', 'takeaway', 'delivery', 'online_takeaway'],
                active: true,
                description: '',
                offerType: 'cart_total',
                applicableItems: [],
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedCoupon(null);
    };

    const handleSaveCoupon = async () => {
        if (
            !formData.code ||
            !formData.name ||
            !formData.discountValue ||
            formData.discountValue <= 0 ||
            !formData.validFrom ||
            !formData.validTo ||
            formData.minBillAmount === undefined ||
            formData.minBillAmount === null ||
            formData.maxTotalUses === undefined ||
            formData.maxTotalUses === null ||
            formData.maxUsesPerCustomer === undefined ||
            formData.maxUsesPerCustomer === null
        ) {
            if (formData.discountValue <= 0 && formData.discountValue !== 0) {
                toast.error('Discount value must be greater than zero');
            } else {
                toast.error('Please fill in required fields');
            }
            return;
        }

        if (formData.validFrom && formData.validTo) {
            const fromDate = new Date(formData.validFrom);
            const toDate = new Date(formData.validTo);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (fromDate > toDate) {
                toast.error('Valid To date must be after Valid From date');
                return;
            }
        }

        try {
            if (selectedCoupon) {
                await couponsAPI.update(selectedCoupon._id, formData);
                toast.success('Coupon updated successfully');
            } else {
                await couponsAPI.create(formData);
                toast.success('Coupon created successfully');
            }
            fetchCoupons();
            handleCloseDialog();
        } catch (error) {
            console.error('Error saving coupon:', error);
            toast.error('Failed to save coupon');
        }
    };

    const handleDeleteCoupon = (coupon: Coupon) => {
        setDeleteTarget({ id: coupon._id, code: coupon.code });
        setOpenDeleteDialog(true);
    };

    const confirmDeleteCoupon = async () => {
        if (!deleteTarget) return;

        try {
            await couponsAPI.delete(deleteTarget.id);
            toast.success('Coupon deleted successfully');
            fetchCoupons();
            setOpenDeleteDialog(false);
            setDeleteTarget(null);
        } catch (error) {
            console.error('Error deleting coupon:', error);
            toast.error('Failed to delete coupon');
        }
    };

    const handleOpenEmailDialog = (coupon: Coupon) => {
        setSelectedCoupon(coupon);
        setEmailData({
            subject: `Special Offer: ${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : settings.restaurant.currencySymbol} OFF with Code ${coupon.code}`,
            message: `Dear Customer,\n\nWe're excited to offer you an exclusive discount!\n\nUse coupon code: ${coupon.code}\nDiscount: ${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : settings.restaurant.currencySymbol} OFF\n${coupon.minOrderAmount ? `Minimum order: ${formatCurrency(coupon.minOrderAmount)}` : ''}\n${coupon.validTo ? `Valid until: ${new Date(coupon.validTo).toLocaleDateString()}` : ''}\n\n${coupon.description || ''}\n\nDon't miss out on this amazing deal!\n\nBest regards,\nYour Restaurant Team`,
            selectedCustomers: [],
            selectAll: false,
        });
        setOpenEmailDialog(true);
    };

    const handleCloseEmailDialog = () => {
        setOpenEmailDialog(false);
        setSelectedCoupon(null);
        setSelectedSmsPhones([]);
        setSelectAllSms(false);
        setEmailData({
            subject: '',
            message: '',
            selectedCustomers: [],
            selectAll: false,
        });
    };

    const customersWithPhone = (Array.isArray(allCustomers) ? allCustomers : []).filter((c: any) => c.phone && c.phone.trim());

    const handleOpenSmsDialog = (coupon: Coupon) => {
        setSelectedCoupon(coupon);
        setSelectedSmsPhones([]);
        setSelectAllSms(false);
        setOpenSmsDialog(true);
    };

    const handleCloseSmsDialog = () => {
        setOpenSmsDialog(false);
        setSelectedCoupon(null);
        setSelectedSmsPhones([]);
        setSelectAllSms(false);
        setSmsSearch('');
    };

    const handleSelectAllSms = (checked: boolean) => {
        setSelectAllSms(checked);
        setSelectedSmsPhones(checked ? customersWithPhone.map((c: any) => c.phone) : []);
    };

    const handleSelectSmsPhone = (phone: string, checked: boolean) => {
        setSelectedSmsPhones(prev =>
            checked ? [...prev, phone] : prev.filter(p => p !== phone)
        );
        setSelectAllSms(false);
    };

    const handleSendSms = async () => {
        if (selectedSmsPhones.length === 0) {
            toast.error('Please select at least one customer');
            return;
        }
        try {
            setSmsLoading(true);
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5006';
            const token = localStorage.getItem('jwt');
            const res = await axios.post(
                `${API_URL}/api/coupons/send-sms`,
                { couponId: selectedCoupon?._id, phoneNumbers: selectedSmsPhones },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(res.data?.message || `SMS sent to ${selectedSmsPhones.length} customer(s)!`);
            setSelectedSmsPhones([]);
            setSelectAllSms(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send SMS');
        } finally {
            setSmsLoading(false);
        }
    };

    const handleSelectAllCustomers = (checked: boolean) => {
        setEmailData(prev => ({
            ...prev,
            selectAll: checked,
            selectedCustomers: checked ? customers.map(c => c.email) : [],
        }));
    };

    const handleSelectCustomer = (email: string, checked: boolean) => {
        setEmailData(prev => ({
            ...prev,
            selectedCustomers: checked
                ? [...prev.selectedCustomers, email]
                : prev.selectedCustomers.filter(e => e !== email),
            selectAll: false,
        }));
    };

    const handleSendBulkEmail = async () => {
        if (emailData.selectedCustomers.length === 0) {
            toast.error('Please select at least one customer');
            return;
        }

        if (!emailData.subject || !emailData.message) {
            toast.error('Please fill in subject and message');
            return;
        }

        try {
            setEmailLoading(true);
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5006';
            const token = localStorage.getItem('jwt');

            await axios.post(
                `${API_URL}/api/coupons/send-bulk-email`,
                {
                    couponId: selectedCoupon?._id,
                    subject: emailData.subject,
                    message: emailData.message,
                    recipients: emailData.selectedCustomers,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            toast.success(`Email sent to ${emailData.selectedCustomers.length} customers!`);
            handleCloseEmailDialog();
        } catch (error) {
            console.error('Error sending bulk email:', error);
            toast.error('Failed to send emails. Please try again.');
        } finally {
            setEmailLoading(false);
        }
    };


    const formatDate = (date?: Date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US');
    };

    // Helper function to check if coupon is truly active
    const isCouponActive = (coupon: Coupon): boolean => {
        if (!coupon.active) return false;
        if (!coupon.validFrom || !coupon.validTo) return false;

        const now = new Date();
        const validFrom = new Date(coupon.validFrom);
        const validTo = new Date(coupon.validTo);

        return now >= validFrom && now <= validTo;
    };

    // Get coupon status with reason
    const getCouponStatus = (coupon: Coupon): { label: string; color: 'success' | 'error' | 'warning' | 'default' } => {
        if (!coupon.active) {
            return { label: 'Inactive', color: 'default' };
        }

        if (!coupon.validFrom || !coupon.validTo) {
            return { label: 'Invalid Dates', color: 'error' };
        }

        const now = new Date();
        const validFrom = new Date(coupon.validFrom);
        const validTo = new Date(coupon.validTo);

        if (now < validFrom) {
            return { label: 'Not Yet Valid', color: 'warning' };
        }

        if (now > validTo) {
            return { label: 'Expired', color: 'error' };
        }

        return { label: 'Active', color: 'success' };
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <Box sx={{ p: 3 }}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
                mb={3}
            >
                <Typography
                    variant="h4"
                    fontWeight="bold"
                    sx={{
                        textAlign: { xs: 'center', sm: 'left' },
                        width: { xs: '100%', sm: 'auto' }
                    }}
                >
                    Discount Coupons Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{
                        width: { xs: '100%', sm: 'auto' },
                        py: { xs: 1.5, sm: 1 }
                    }}
                >
                    Create New Coupon
                </Button>
            </Stack>

            {/* Summary Cards */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Total Coupons
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold">
                                        {totalCoupons}
                                    </Typography>
                                </Box>
                                <EmailIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Active Coupons
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold" color="success.main">
                                        {(Array.isArray(coupons) ? coupons : []).filter(c => isCouponActive(c)).length}
                                    </Typography>
                                </Box>
                                <EmailIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Total Customers
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold">
                                        {customers.length}
                                    </Typography>
                                </Box>
                                <PeopleIcon sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Coupons List */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                    <CircularProgress />
                </Box>
            ) : isMobile ? (
                // Mobile Card View
                <Stack spacing={2}>
                    {(Array.isArray(coupons) ? coupons : []).map((coupon) => (
                        <Card key={coupon._id}>
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Chip label={coupon.code} color="primary" sx={{ fontWeight: 'bold' }} />
                                    {(() => {
                                        const status = getCouponStatus(coupon);
                                        return (
                                            <Chip
                                                label={status.label}
                                                color={status.color}
                                                size="small"
                                            />
                                        );
                                    })()}
                                </Stack>

                                <Grid container spacing={1} mb={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Discount</Typography>
                                        <Typography fontWeight="bold">
                                            {coupon.discountValue}
                                            {coupon.discountType === 'percentage' ? '%' : settings.restaurant.currencySymbol} OFF
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Min Order</Typography>
                                        <Typography>
                                            {formatCurrency((coupon as any).minBillAmount || coupon.minOrderAmount || 0)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">Valid Period</Typography>
                                        <Typography variant="body2">
                                            {formatDate(coupon.validFrom)} - {formatDate(coupon.validTo)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Max Uses</Typography>
                                        <Typography variant="body2">
                                            {coupon.maxTotalUses || 'Unlimited'}
                                        </Typography>
                                    </Grid>
                                </Grid>

                                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1, borderTop: 1, borderColor: 'divider', pt: 2 }}>
                                    <Tooltip title={isCouponActive(coupon) ? "Send Email to Customers" : "Coupon is not active or expired"}>
                                        <span>
                                            <IconButton
                                                color="info"
                                                onClick={() => handleOpenEmailDialog(coupon)}
                                                disabled={!isCouponActive(coupon)}
                                                size="small"
                                            >
                                                <SendIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title={isCouponActive(coupon) ? "Send SMS to Customers" : "Coupon is not active or expired"}>
                                        <span>
                                            <IconButton
                                                color="success"
                                                onClick={() => handleOpenSmsDialog(coupon)}
                                                disabled={!isCouponActive(coupon)}
                                                size="small"
                                            >
                                                <SmsIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Edit">
                                        <IconButton
                                            color="primary"
                                            onClick={() => handleOpenDialog(coupon)}
                                            size="small"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton
                                            color="error"
                                            onClick={() => handleDeleteCoupon(coupon)}
                                            size="small"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            ) : (
                // Desktop Table View
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table sx={{ minWidth: 650 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Code</TableCell>
                                    <TableCell>Discount</TableCell>
                                    <TableCell>Min Order</TableCell>
                                    <TableCell>Valid Period</TableCell>
                                    <TableCell>Max Uses</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(Array.isArray(coupons) ? coupons : []).map((coupon) => (
                                    <TableRow key={coupon._id}>
                                        <TableCell>
                                            <Chip label={coupon.code} color="primary" />
                                        </TableCell>
                                        <TableCell>
                                            <Typography fontWeight="bold">
                                                {coupon.discountValue}
                                                {coupon.discountType === 'percentage' ? '%' : settings.restaurant.currencySymbol} OFF
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {formatCurrency((coupon as any).minBillAmount || coupon.minOrderAmount || 0)}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(coupon.validFrom)} - {formatDate(coupon.validTo)}
                                        </TableCell>
                                        <TableCell>
                                            {coupon.maxTotalUses || 'Unlimited'}
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                const status = getCouponStatus(coupon);
                                                return (
                                                    <Chip
                                                        label={status.label}
                                                        color={status.color}
                                                        size="small"
                                                    />
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Tooltip title={isCouponActive(coupon) ? "Send Email to Customers" : "Coupon is not active or expired"}>
                                                    <span>
                                                        <IconButton
                                                            color="info"
                                                            onClick={() => handleOpenEmailDialog(coupon)}
                                                            disabled={!isCouponActive(coupon)}
                                                        >
                                                            <SendIcon />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title={isCouponActive(coupon) ? "Send SMS to Customers" : "Coupon is not active or expired"}>
                                                    <span>
                                                        <IconButton
                                                            color="success"
                                                            onClick={() => handleOpenSmsDialog(coupon)}
                                                            disabled={!isCouponActive(coupon)}
                                                        >
                                                            <SmsIcon />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Edit">
                                                    <IconButton
                                                        color="primary"
                                                        onClick={() => handleOpenDialog(coupon)}
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => handleDeleteCoupon(coupon)}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </Paper>
            )}

            {coupons.length > 0 && (
                <TablePagination
                    component="div"
                    count={totalCoupons}
                    page={page}
                    onPageChange={(event, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(parseInt(event.target.value, 10));
                        setPage(0);
                    }}
                />
            )}

            {/* Create/Edit Coupon Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="bold">
                        {selectedCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                    </Typography>
                    <IconButton
                        onClick={handleCloseDialog}
                        size="small"
                        sx={{
                            color: 'white',
                            bgcolor: 'error.main',
                            '&:hover': { bgcolor: 'error.dark' },
                            width: 24,
                            height: 24
                        }}
                    >
                        <CloseIcon sx={{ fontSize: '1.1rem' }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Coupon Code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Coupon Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Discount Type</InputLabel>
                                <Select
                                    value={formData.discountType}
                                    label="Discount Type"
                                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                                >
                                    <MenuItem value="percentage">Percentage</MenuItem>
                                    <MenuItem value="fixed">Fixed Amount</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Offer Scope</InputLabel>
                                <Select
                                    value={formData.offerType}
                                    label="Offer Scope"
                                    onChange={(e) => setFormData({ ...formData, offerType: e.target.value as any })}
                                >
                                    <MenuItem value="cart_total">Entire Order (Total Bill)</MenuItem>
                                    <MenuItem value="menu_item">Specific Item(s)</MenuItem>
                                    <MenuItem value="combo">Combo (All items required)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {formData.offerType !== 'cart_total' && (
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Select Items</InputLabel>
                                    <Select
                                        multiple
                                        value={formData.applicableItems}
                                        label="Select Items"
                                        onChange={(e) => setFormData({ ...formData, applicableItems: e.target.value as string[] })}
                                        renderValue={(selected) => (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {(selected as string[]).map((value) => {
                                                    const item = menuItems.find(i => i._id === value);
                                                    return <Chip key={value} label={item?.name || value} size="small" />;
                                                })}
                                            </Box>
                                        )}
                                        MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
                                    >
                                        {menuItems.map((item) => (
                                            <MenuItem key={item._id} value={item._id}>
                                                {item.name} ({formatCurrency(item.price)})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Discount Value"
                                value={formData.discountValue}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val < 0) return;
                                    setFormData({ ...formData, discountValue: val });
                                }}
                                inputProps={{ min: 0, step: formData.discountType === 'percentage' ? 1 : 0.01 }}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Min Bill Amount"
                                value={formData.minBillAmount}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val < 0) return;
                                    setFormData({ ...formData, minBillAmount: val });
                                }}
                                inputProps={{ min: 0 }}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Valid From"
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: today }}
                                value={formData.validFrom}
                                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Valid To"
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: formData.validFrom || today }}
                                value={formData.validTo}
                                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Max Total Uses (0 = Unlimited)"
                                value={formData.maxTotalUses}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val < 0) return;
                                    setFormData({ ...formData, maxTotalUses: val });
                                }}
                                inputProps={{ min: 0 }}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Max Uses Per Customer"
                                value={formData.maxUsesPerCustomer}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val < 0) return;
                                    setFormData({ ...formData, maxUsesPerCustomer: val });
                                }}
                                inputProps={{ min: 0 }}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Applicable Order Types</InputLabel>
                                <Select
                                    multiple
                                    value={formData.applicableOrderTypes}
                                    label="Applicable Order Types"
                                    onChange={(e) => setFormData({ ...formData, applicableOrderTypes: e.target.value as string[] })}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {(selected as string[]).map((value) => (
                                                <Chip key={value} label={value.replace('_', ' ').toUpperCase()} size="small" />
                                            ))}
                                        </Box>
                                    )}
                                >
                                    <MenuItem value="dine_in">Dine In</MenuItem>
                                    <MenuItem value="takeaway">Takeaway</MenuItem>
                                    <MenuItem value="delivery">Delivery</MenuItem>
                                    <MenuItem value="online_takeaway">Online Takeaway</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={formData.active}
                                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                    />
                                }
                                label="Active"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSaveCoupon} variant="contained">
                        {selectedCoupon ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Email Dialog */}
            <Dialog open={openEmailDialog} onClose={handleCloseEmailDialog} maxWidth="md" fullWidth>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="bold">
                        Send Coupon to Customers
                    </Typography>
                    <IconButton
                        onClick={handleCloseEmailDialog}
                        size="small"
                        sx={{
                            color: 'white',
                            bgcolor: 'error.main',
                            '&:hover': { bgcolor: 'error.dark' },
                            width: 24,
                            height: 24
                        }}
                    >
                        <CloseIcon sx={{ fontSize: '1.1rem' }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Email Subject"
                                value={emailData.subject}
                                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={8}
                                label="Email Message"
                                value={emailData.message}
                                onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                                Select Recipients ({emailData.selectedCustomers.length} selected)
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={emailData.selectAll}
                                        onChange={(e) => handleSelectAllCustomers(e.target.checked)}
                                    />
                                }
                                label={`Select All (${customers.length} customers)`}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1, p: 2 }}>
                                {customers.map((customer) => (
                                    <FormControlLabel
                                        key={customer.email}
                                        control={
                                            <Checkbox
                                                checked={emailData.selectedCustomers.includes(customer.email)}
                                                onChange={(e) => handleSelectCustomer(customer.email, e.target.checked)}
                                            />
                                        }
                                        label={
                                            <Box>
                                                <Typography variant="body2">
                                                    {customer.name || 'Guest'} - {customer.email}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {customer.totalOrders} orders | {formatCurrency(customer.totalSpent || 0)} spent
                                                </Typography>
                                            </Box>
                                        }
                                        sx={{ display: 'block', mb: 1 }}
                                    />
                                ))}
                            </Box>
                        </Grid>

                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEmailDialog} disabled={emailLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSendBulkEmail}
                        variant="contained"
                        startIcon={emailLoading ? <CircularProgress size={20} /> : <SendIcon />}
                        disabled={emailLoading}
                    >
                        {emailLoading ? 'Sending...' : `Send to ${emailData.selectedCustomers.length} Customers`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ═══════════════ PREMIUM SMS DIALOG ═══════════════ */}
            <Dialog
                open={openSmsDialog}
                onClose={handleCloseSmsDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
                    }
                }}
            >


                {/* ── Header ── */}
                <Box sx={{
                    px: 3, pt: 3, pb: 0,
                    position: 'relative',
                }}>
                    {/* Close button */}
                    <IconButton
                        onClick={handleCloseSmsDialog}
                        size="small"
                        sx={{
                            position: 'absolute', top: 12, right: 12,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' },
                            width: 24, height: 24,
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>

                    {/* Title row */}
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                        <Box sx={{
                            bgcolor: 'primary.50',
                            borderRadius: 2, p: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <SmsIcon sx={{ color: 'primary.main', fontSize: 26 }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={700} color="text.primary" lineHeight={1.2}>
                                Send Coupon via SMS
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Notify customers with an exclusive discount
                            </Typography>
                        </Box>
                    </Stack>

                    {/* Coupon preview card inside header */}
                    {selectedCoupon && (
                        <Box sx={{
                            bgcolor: 'grey.50',
                            borderRadius: 2,
                            px: 2.5, py: 1.5,
                            mb: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                        }}>
                            <Stack spacing={0.2}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Coupon Code
                                </Typography>
                                <Typography variant="h6" fontWeight={800} color="text.primary" letterSpacing={2}>
                                    {selectedCoupon.code}
                                </Typography>
                            </Stack>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Discount
                                </Typography>
                                <Typography variant="h5" fontWeight={800} color="success.main">
                                    {selectedCoupon.discountValue}
                                    {selectedCoupon.discountType === 'percentage' ? '%' : ' ₹'} OFF
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* ── Body ── */}
                {/* ── Body ── */}
                <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: 500, overflow: 'hidden' }}>
                    {/* Stats strip */}
                    <Stack
                        direction="row"
                        divider={<Divider orientation="vertical" flexItem />}
                        sx={{ bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider', px: 3, py: 1.2 }}
                    >
                        <Box sx={{ flex: 1, textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight={700} color="success.main">
                                {customersWithPhone.length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Total</Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight={700} color="primary.main">
                                {selectedSmsPhones.length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Selected</Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight={700} color="text.secondary">
                                {customersWithPhone.length - selectedSmsPhones.length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Remaining</Typography>
                        </Box>
                    </Stack>

                    <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
                        {/* Search bar */}
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by name or phone…"
                            value={smsSearch}
                            onChange={(e) => setSmsSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 1.5 }}
                        />

                        {/* Select All row */}
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{
                                px: 1.5, py: 0.8,
                                borderRadius: 2,
                                bgcolor: selectAllSms ? 'success.50' : 'transparent',
                                border: '1px solid',
                                borderColor: selectAllSms ? 'success.300' : 'divider',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': { bgcolor: 'success.50', borderColor: 'success.300' },
                                mb: 1,
                            }}
                            onClick={() => handleSelectAllSms(!selectAllSms)}
                        >
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Checkbox
                                    checked={selectAllSms}
                                    onChange={(e) => { e.stopPropagation(); handleSelectAllSms(e.target.checked); }}
                                    color="success"
                                    size="small"
                                    sx={{ p: 0 }}
                                />
                                <Typography variant="body2" fontWeight={600}>
                                    Select All Customers
                                </Typography>
                            </Stack>
                            <Chip
                                label={`${customersWithPhone.length} with phone`}
                                size="small"
                                color="success"
                                variant="outlined"
                            />
                        </Stack>
                    </Box>

                    {/* Customer cards */}
                    <Box sx={{
                        flex: 1,
                        overflowY: 'auto',
                        px: 2.5, pb: 2,
                        '&::-webkit-scrollbar': {
                            width: '6px',
                        },
                        '&::-webkit-scrollbar-track': {
                            background: '#f1f1f1',
                            borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: '#bdbdbd',
                            borderRadius: '4px',
                            '&:hover': {
                                background: '#9e9e9e',
                            },
                        },
                    }}>
                        {(() => {
                            const filtered = customersWithPhone.filter((c: any) => {
                                const q = smsSearch.toLowerCase();
                                return !q || (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
                            });
                            if (filtered.length === 0) {
                                return (
                                    <Box sx={{ textAlign: 'center', py: 5 }}>
                                        <PhoneIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {smsSearch ? 'No customers match your search.' : 'No customers with phone numbers found.'}
                                        </Typography>
                                    </Box>
                                );
                            }
                            return filtered.map((customer: any) => {
                                const isSelected = selectedSmsPhones.includes(customer.phone);
                                const initials = (customer.name || 'G')
                                    .split(' ')
                                    .slice(0, 2)
                                    .map((w: string) => w[0]?.toUpperCase() || '')
                                    .join('');
                                return (
                                    <Box
                                        key={customer.phone}
                                        onClick={() => handleSelectSmsPhone(customer.phone, !isSelected)}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            px: 1.5, py: 1.2,
                                            mb: 0.8,
                                            borderRadius: 2,
                                            border: '1.5px solid',
                                            borderColor: isSelected ? 'success.400' : 'grey.200',
                                            bgcolor: isSelected ? 'rgba(56,239,125,0.08)' : 'background.paper',
                                            cursor: 'pointer',
                                            transition: 'all 0.18s ease',
                                            '&:hover': {
                                                borderColor: 'success.400',
                                                bgcolor: 'rgba(56,239,125,0.06)',
                                                transform: 'translateX(2px)',
                                            },
                                        }}
                                    >
                                        {/* Avatar */}
                                        <Avatar
                                            sx={{
                                                width: 40, height: 40,
                                                bgcolor: isSelected ? 'success.main' : 'grey.300',
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                flexShrink: 0,
                                                transition: 'background-color 0.18s',
                                            }}
                                        >
                                            {isSelected ? <CheckCircleIcon fontSize="small" /> : initials}
                                        </Avatar>

                                        {/* Info */}
                                        <Box flex={1} minWidth={0}>
                                            <Typography variant="body2" fontWeight={600} noWrap>
                                                {customer.name || 'Guest'}
                                            </Typography>
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                <PhoneIcon sx={{ fontSize: 12, color: 'success.main' }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    {customer.phone}
                                                </Typography>
                                            </Stack>

                                        </Box>

                                        {/* Checkbox */}
                                        <Checkbox
                                            checked={isSelected}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handleSelectSmsPhone(customer.phone, e.target.checked)}
                                            color="success"
                                            size="small"
                                            sx={{ flexShrink: 0 }}
                                        />
                                    </Box>
                                );
                            });
                        })()}
                    </Box>
                </DialogContent>

                {/* ── Footer ── */}
                <Box sx={{
                    px: 2.5, py: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'grey.50',
                }}>

                    <Stack direction="row" spacing={1.5}>
                        <Button
                            fullWidth
                            variant="outlined"
                            color="inherit"
                            onClick={handleCloseSmsDialog}
                            disabled={smsLoading}
                            sx={{ borderRadius: 2, fontWeight: 600 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleSendSms}
                            disabled={smsLoading || selectedSmsPhones.length === 0}
                            sx={{
                                borderRadius: 2,
                                fontWeight: 700,
                                background: selectedSmsPhones.length > 0
                                    ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                                    : undefined,
                                color: 'white',
                                boxShadow: selectedSmsPhones.length > 0 ? '0 4px 15px rgba(17,153,142,0.4)' : undefined,
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #0e857a 0%, #2fd96e 100%)',
                                    boxShadow: '0 6px 20px rgba(17,153,142,0.5)',
                                },
                            }}
                        >
                            {smsLoading
                                ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />Sending…</>
                                : `🚀 Send SMS to ${selectedSmsPhones.length} Customer${selectedSmsPhones.length !== 1 ? 's' : ''}`
                            }
                        </Button>
                    </Stack>
                </Box>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                PaperProps={{
                    sx: { borderRadius: 2, p: 1 }
                }}
            >
                <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
                    <Typography variant="h6" fontWeight="bold">Confirm Delete</Typography>
                </DialogTitle>
                <DialogContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography>
                        Are you sure you want to delete coupon <Box component="span" sx={{ fontWeight: 'bold' }}>{deleteTarget?.code}</Box>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 2 }}>
                    <Button
                        onClick={() => setOpenDeleteDialog(false)}
                        variant="outlined"
                        sx={{ borderRadius: 2, minWidth: 100 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmDeleteCoupon}
                        variant="contained"
                        color="error"
                        sx={{ borderRadius: 2, minWidth: 100 }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
};

export default CouponsAdminPage;
