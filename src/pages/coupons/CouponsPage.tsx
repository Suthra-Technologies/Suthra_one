import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    IconButton,
    Tooltip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Grid,
    FormControl,
    InputLabel,
    Select,
    OutlinedInput,
    Switch,
    FormControlLabel,
    useTheme,
    useMediaQuery,
    Card,
    CardContent,
    Stack,
    DialogContentText,

    Divider,
    Tabs,
    Tab,
    TablePagination
} from '@mui/material';
import ActionHistoryList from '../../components/common/ActionHistoryList';
import CustomInput from '../../components/common/CustomInput';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    ContentCopy as CopyIcon,
    Close as CloseIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import InputAdornment from '@mui/material/InputAdornment';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { couponsAPI } from '../../services/api';

const ORDER_TYPES = [
    'dine_in', 'takeaway',
    'global_dine_in', 'global_takeaway',
    'online_takeaway', 'delivery'
];

const ORDER_TYPE_LABELS: Record<string, string> = {
    dine_in: 'Restaurant Dine-in',
    takeaway: 'Restaurant Takeaway',
    global_dine_in: 'Global Dine-in (QR)',
    global_takeaway: 'Global Takeaway (QR)',
    online_takeaway: 'Online Takeaway',
    delivery: 'Online Delivery',
};

const CouponsPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalCoupons, setTotalCoupons] = useState(0);

    const [editingCoupon, setEditingCoupon] = useState<any>(null);
    const [dialogTab, setDialogTab] = useState(0);

    // Delete Confirmation State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [couponToDelete, setCouponToDelete] = useState<{ id: string, code: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        maxDiscountAmount: '',
        minBillAmount: '',
        applicableOrderTypes: ['dine_in', 'takeaway', 'delivery', 'online_takeaway', 'global_dine_in', 'global_takeaway'],
        maxTotalUses: '',
        maxUsesPerCustomer: '1',
        validFrom: format(new Date(), 'yyyy-MM-dd'),
        validTo: '',
        validForDays: '',
        active: true,
    });

    const [touched, setTouched] = useState({
        code: false,
        name: false,
        discountValue: false,
        maxDiscountAmount: false,
        minBillAmount: false,
        maxTotalUses: false,
        maxUsesPerCustomer: false,
        validFrom: false,
        validTo: false,
    });

    const [errors, setErrors] = useState({
        code: '',
        name: '',
        discountValue: '',
        maxDiscountAmount: '',
        minBillAmount: '',
        maxTotalUses: '',
        maxUsesPerCustomer: '',
        validFrom: '',
        validTo: '',
    });

    const validateField = (name: string, value: any, context: { discountType?: string; validFrom?: string } = {}): string => {
        let error = '';

        if (name === 'code') {
            if (!value || value.trim() === '') {
                error = 'Coupon code is required';
            }
        }

        if (name === 'name') {
            if (!value || value.trim() === '') {
                error = 'Coupon name is required';
            } else if ((value || '').toString().trim().length < 2) {
                error = 'Name must be at least 2 characters';
            }
        }

        if (name === 'discountValue') {
            const discountType = context.discountType || 'percentage';
            const raw = (value === undefined || value === null) ? '' : value.toString();
            if (raw === '') {
                error = 'Discount value is required';
            } else {
                const num = Number(raw);
                if (Number.isNaN(num)) {
                    error = 'Discount must be a number';
                } else if (discountType === 'percentage') {
                    if (num < 0 || num > 100) error = 'Percentage must be between 0 and 100';
                } else {
                    if (num < 0) error = 'Discount amount must be at least 0';
                }
            }
        }

        if (name === 'maxDiscountAmount') {
            const raw = (value === undefined || value === null) ? '' : value.toString();
            if (raw === '') {
                // Not necessarily required if not percentage, but logic usually implies it for safety
                if (context.discountType === 'percentage' && !value) {
                    error = 'Max discount amount is required';
                }
            } else {
                const num = Number(raw);
                if (Number.isNaN(num)) {
                    error = 'Must be a number';
                } else if (num < 0) {
                    error = 'Must be at least 0';
                }
            }
        }

        if (name === 'minBillAmount') {
            const raw = (value === undefined || value === null) ? '' : value.toString();
            if (raw === '') {
                error = 'Minimum bill amount is required';
            } else {
                const num = Number(raw);
                if (Number.isNaN(num)) {
                    error = 'Must be a number';
                } else if (num < 0) { // Changed from 1 to 0 based on typical logic allowing 0 min bill
                    error = 'Must be at least 0';
                }
            }
        }

        if (name === 'maxTotalUses') {
            const raw = (value === undefined || value === null) ? '' : value.toString();
            if (raw === '') {
                error = '';
            } else {
                const num = Number(raw);
                if (Number.isNaN(num) || !Number.isInteger(num)) {
                    error = 'Must be a whole number';
                } else if (num < 0) {
                    error = 'Must be 0 or greater';
                }
            }
        }

        if (name === 'maxUsesPerCustomer') {
            const raw = (value === undefined || value === null) ? '' : value.toString();
            if (raw === '') {
                error = 'Max uses per customer is required';
            } else {
                const num = Number(raw);
                if (Number.isNaN(num) || !Number.isInteger(num)) {
                    error = 'Must be a whole number';
                } else if (num < 1) {
                    error = 'Must be at least 1';
                }
            }
        }

        if (name === 'validFrom') {
            if (!value || value.toString().trim() === '') {
                error = 'Valid from date is required';
            }
        }

        if (name === 'validTo') {
            if (!value || value.toString().trim() === '') {
                error = 'Valid to date is required';
            } else if (context.validFrom) {
                try {
                    const from = new Date(context.validFrom);
                    const to = new Date(value);
                    if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && to < from) {
                        error = 'Valid To must be the same or after Valid From';
                    }
                } catch (err) {
                    // ignore
                }
            }
        }

        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
    };

    const validateAll = (): boolean => {
        const fieldsToValidate: string[] = ['code', 'name', 'discountValue', 'minBillAmount', 'maxUsesPerCustomer', 'validFrom', 'validTo'];
        if (formData.discountType === 'percentage') fieldsToValidate.push('maxDiscountAmount');

        setTouched(prev => {
            const next = { ...prev } as any;
            fieldsToValidate.forEach(f => next[f] = true);
            return next;
        });

        let hasError = false;
        fieldsToValidate.forEach((f) => {
            let err = '';
            if (f === 'discountValue') {
                err = validateField('discountValue', formData.discountValue, { discountType: formData.discountType });
            } else if (f === 'maxDiscountAmount') {
                err = validateField('maxDiscountAmount', formData.maxDiscountAmount, { discountType: formData.discountType });
            } else if (f === 'validTo') {
                err = validateField('validTo', formData.validTo, { validFrom: formData.validFrom });
            } else {
                err = validateField(f, (formData as any)[f]);
            }
            if (err) hasError = true;
        });

        return !hasError;
    };

    const fetchCoupons = useCallback(async () => {
        try {
            setLoading(true);
            const response = await couponsAPI.getAll({
                page: page + 1,
                limit: rowsPerPage,
                search: debouncedSearch.trim() || undefined,
            });
            if (response.data.coupons) {
                setCoupons(response.data.coupons);
                setTotalCoupons(response.data.total);
            } else {
                setCoupons(response.data);
                setTotalCoupons((response?.data || []).length);
            }
        } catch (error) {
            console.error('Error fetching coupons:', error);
            toast.error('Failed to load coupons');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, debouncedSearch]);

    // Debounce: wait 400ms after user stops typing before fetching
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(0); // reset to first page on new search
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchCoupons();
    }, [fetchCoupons]);

    const handleOpenDialog = (coupon?: any) => {
        if (coupon) {
            setEditingCoupon(coupon);
            setFormData({
                code: coupon.code || '',
                name: coupon.name || '',
                description: coupon.description || '',
                discountType: coupon.discountType || 'percentage',
                discountValue: coupon.discountValue?.toString() || '',
                maxDiscountAmount: coupon.maxDiscountAmount?.toString() || '',
                minBillAmount: coupon.minBillAmount?.toString() || '',
                applicableOrderTypes: coupon.applicableOrderTypes || [],
                maxTotalUses: coupon.maxTotalUses?.toString() || '',
                maxUsesPerCustomer: coupon.maxUsesPerCustomer?.toString() || '1',
                validFrom: coupon.validFrom ? format(new Date(coupon.validFrom), 'yyyy-MM-dd') : '',
                validTo: coupon.validTo ? format(new Date(coupon.validTo), 'yyyy-MM-dd') : '',
                validForDays: coupon.validForDays?.toString() || '',
                active: coupon.active !== false,
            });
        } else {
            setEditingCoupon(null);
            setFormData({
                code: '',
                name: '',
                description: '',
                discountType: 'percentage',
                discountValue: '',
                maxDiscountAmount: '',
                minBillAmount: '',
                applicableOrderTypes: ['dine_in', 'takeaway', 'delivery', 'online_takeaway'],
                maxTotalUses: '',
                maxUsesPerCustomer: '1',
                validFrom: format(new Date(), 'yyyy-MM-dd'),
                validTo: '',
                validForDays: '',
                active: true,
            });
        }
        setDialogTab(0);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingCoupon(null);
        setTouched({
            code: false,
            name: false,
            discountValue: false,
            maxDiscountAmount: false,
            minBillAmount: false,
            maxTotalUses: false,
            maxUsesPerCustomer: false,
            validFrom: false,
            validTo: false,
        });
        setErrors({
            code: '',
            name: '',
            discountValue: '',
            maxDiscountAmount: '',
            minBillAmount: '',
            maxTotalUses: '',
            maxUsesPerCustomer: '',
            validFrom: '',
            validTo: '',
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleNumberFieldChange = (field: string, rawValue: string, options?: { maxLimit?: number, allowDecimals?: boolean }) => {
        let cleanValue = rawValue.replace(/-/g, '');
        if (options && options.allowDecimals === false) {
            cleanValue = cleanValue.replace(/\./g, '');
        }
        if (cleanValue.length > 1 && cleanValue.startsWith('0') && !cleanValue.startsWith('0.')) {
            cleanValue = cleanValue.replace(/^0+/, '');
            if (cleanValue === '') cleanValue = '0';
        }
        const parts = cleanValue.split('.');
        if (parts[0].length > 3) return;
        
        if (options?.maxLimit !== undefined && Number(cleanValue) > options.maxLimit) {
            return;
        }

        setFormData(prev => ({ ...prev, [field]: cleanValue }));
    };

    const handleNameInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!validateAll()) {
            toast.error('Please fix validation errors before submitting');
            return;
        }
        try {
            const payload = {
                ...formData,
                code: formData.code?.toUpperCase(),
                discountValue: parseFloat(formData.discountValue) || 0,
                maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : undefined,
                minBillAmount: parseFloat(formData.minBillAmount) || 0,
                maxTotalUses: formData.maxTotalUses ? parseInt(formData.maxTotalUses) : undefined,
                maxUsesPerCustomer: parseInt(formData.maxUsesPerCustomer) || 1,
                validForDays: formData.validForDays ? parseInt(formData.validForDays) : undefined,
            };

            if (editingCoupon) {
                await couponsAPI.update(editingCoupon._id, payload);
                toast.success('Coupon updated successfully');
            } else {
                await couponsAPI.create(payload);
                toast.success('Coupon created successfully');
            }
            fetchCoupons();
            handleCloseDialog();
        } catch (error: any) {
            console.error('Error saving coupon:', error);
            toast.error(error.response?.data?.message || 'Failed to save coupon');
        }
    };

    const handleDeleteClick = (id: string, code: string) => {
        setCouponToDelete({ id, code });
        setDeleteDialogOpen(true);
    };

    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setCouponToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!couponToDelete) return;

        setIsDeleting(true);
        try {
            await couponsAPI.delete(couponToDelete.id);
            toast.success('Coupon deleted successfully');
            setDeleteDialogOpen(false);
            setCouponToDelete(null);
            fetchCoupons();
        } catch (error: any) {
            console.error('Error deleting coupon:', error);
            toast.error(error.response?.data?.message || 'Failed to delete coupon');
        } finally {
            setIsDeleting(false);
        }
    };

    const copyCode = (code: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code);
            toast.success('Coupon code copied!');
        }
    };

    const getDiscountDisplay = (coupon: any) => {
        if (coupon.discountType === 'percentage') {
            return `${coupon.discountValue}% OFF${coupon.maxDiscountAmount ? ` (Max $${Number(coupon.maxDiscountAmount || 0).toFixed(2)})` : ''}`;
        }
        return `$${coupon.discountValue} OFF`;
    };

    // Client-side filtered list
    const filteredCoupons = searchQuery.trim()
        ? coupons.filter((c) => {
            const q = searchQuery?.toLowerCase();
            return (
                c.code?.toLowerCase().includes(q) ||
                c.name?.toLowerCase().includes(q) ||
                c.description?.toLowerCase().includes(q)
            );
        })
        : coupons;

    const renderMobileView = () => (
        <Stack spacing={2}>
            {filteredCoupons.map((coupon) => {
                let isCurrentlyActive = !!coupon.active;
                try {
                    const now = new Date();
                    const from = coupon.validFrom ? new Date(coupon.validFrom) : null;
                    const to = coupon.validTo ? new Date(coupon.validTo) : null;
                    if (from && !isNaN(from.getTime())) {
                        const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
                        if (now < fromDay) isCurrentlyActive = false;
                    }
                    if (to && !isNaN(to.getTime())) {
                        const toEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
                        if (now > toEnd) isCurrentlyActive = false;
                    }
                } catch (err) {
                    isCurrentlyActive = !!coupon.active;
                }

                return (
                    <Card key={coupon._id} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                        <CardContent sx={{ pb: 1 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'primary.light', borderRadius: 1, px: 1, py: 0.5 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" color="primary.main" sx={{ fontFamily: 'monospace', mr: 0.5 }}>
                                        {coupon.code}
                                    </Typography>
                                    <IconButton size="small" onClick={() => copyCode(coupon.code)} sx={{ p: 0.5 }}>
                                        <CopyIcon fontSize="small" sx={{ fontSize: '1rem' }} />
                                    </IconButton>
                                </Box>
                                <Chip
                                    label={isCurrentlyActive ? 'Active' : 'Inactive'}
                                    color={isCurrentlyActive ? 'success' : 'error'}
                                    size="small"
                                />
                            </Box>

                            <Typography variant="body1" fontWeight="bold" gutterBottom>{coupon.name}</Typography>

                            <Box display="flex" gap={1} mb={1}>
                                <Chip label={getDiscountDisplay(coupon)} color="secondary" size="small" variant="outlined" />
                                <Chip label={`Min Bill: $${coupon.minBillAmount || 0}`} size="small" variant="outlined" />
                            </Box>

                            <Divider sx={{ my: 1 }} />

                            <Grid container spacing={1}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Validity</Typography>
                                    <Typography variant="body2" fontSize="0.75rem">
                                        {format(new Date(coupon.validFrom), 'MMM dd')} - {format(new Date(coupon.validTo), 'MMM dd, yyyy')}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Usage</Typography>
                                    <Typography variant="body2" fontSize="0.75rem">
                                        {coupon.currentUses || 0} {coupon.maxTotalUses ? `/ ${coupon.maxTotalUses}` : ''} uses
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                        <Box sx={{ bgcolor: '#f9fafb', px: 2, py: 1, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Button
                                size="small"
                                startIcon={<EditIcon />}
                                onClick={() => handleOpenDialog(coupon)}
                                sx={{ color: 'text.secondary' }}
                            >
                                Edit
                            </Button>
                            <Button
                                size="small"
                                startIcon={<DeleteIcon />}
                                color="error"
                                onClick={() => handleDeleteClick(coupon._id, coupon.code)}
                            >
                                Delete
                            </Button>
                        </Box>
                    </Card>
                );
            })}
        </Stack>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, gap: 2 }}>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 'bold',
                        background: 'linear-gradient(45deg, #FF6B6B 30%, #FFE66D 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: { xs: '1.75rem', sm: '2.125rem' }
                    }}
                >
                    Discount Coupons
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    fullWidth={false}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                    Create Coupon
                </Button>
            </Box>

            {/* Search Bar */}
            <Box sx={{ mb: 2 }}>
                <TextField
                    size="small"
                    placeholder="Search by code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: searchQuery ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setSearchQuery('')}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : undefined,
                    }}
                    sx={{ maxWidth: { xs: '100%', sm: 360 } }}
                />
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                    <CircularProgress />
                </Box>
            ) : filteredCoupons.length === 0 ? (
                <Paper sx={{ p: 5, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        {searchQuery ? 'No coupons match your search' : 'No coupons found'}
                    </Typography>
                    {searchQuery ? (
                        <Button variant="outlined" onClick={() => setSearchQuery('')} sx={{ mt: 1 }}>
                            Clear Search
                        </Button>
                    ) : (
                        <>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Create your first discount coupon for customers
                            </Typography>
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                                Create First Coupon
                            </Button>
                        </>
                    )}
                </Paper>
            ) : isMobile ? renderMobileView() : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Code</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Discount</TableCell>
                                <TableCell>Min Bill</TableCell>
                                <TableCell>Order Types</TableCell>
                                <TableCell>Usage</TableCell>
                                <TableCell>Validity</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCoupons.map((coupon) => {
                                let status: 'Active' | 'Expired' | 'Not Yet Valid' | 'Inactive' = 'Active';
                                if (!coupon.active) {
                                    status = 'Inactive';
                                } else {
                                    try {
                                        const now = new Date();
                                        const from = coupon.validFrom ? new Date(coupon.validFrom) : null;
                                        const to = coupon.validTo ? new Date(coupon.validTo) : null;

                                        if (from && !isNaN(from.getTime())) {
                                            const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
                                            if (now < fromDay) status = 'Not Yet Valid';
                                        }

                                        if (status !== 'Not Yet Valid' && to && !isNaN(to.getTime())) {
                                            const toEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
                                            if (now > toEnd) status = 'Expired';
                                        }
                                    } catch (err) {
                                        status = 'Inactive';
                                    }
                                }

                                return (
                                    <TableRow key={coupon._id}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                                                    {coupon.code}
                                                </Typography>
                                                <IconButton size="small" onClick={() => copyCode(coupon.code)}>
                                                    <CopyIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{coupon.name}</TableCell>
                                        <TableCell>
                                            <Chip label={getDiscountDisplay(coupon)} color="success" size="small" />
                                        </TableCell>
                                        <TableCell>${coupon.minBillAmount || 0}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {coupon.applicableOrderTypes.map((type: string) => (
                                                    <Chip key={type} label={ORDER_TYPE_LABELS[type] || type} size="small" variant="outlined" />
                                                ))}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {coupon.currentUses || 0}
                                            {coupon.maxTotalUses && ` / ${coupon.maxTotalUses}`}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" display="block">
                                                {format(new Date(coupon.validFrom), 'MMM dd yyyy')}
                                            </Typography>
                                            <Typography variant="caption" display="block">
                                                to {format(new Date(coupon.validTo), 'MMM dd yyyy')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={status}
                                                color={
                                                    status === 'Active' ? 'success' :
                                                        status === 'Not Yet Valid' ? 'warning' :
                                                            status === 'Expired' ? 'error' : 'default'
                                                }
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Edit">
                                                <IconButton size="small" color="primary" onClick={() => handleOpenDialog(coupon)}>
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small" color="error" onClick={() => handleDeleteClick(coupon._id, coupon.code)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
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

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle sx={{ m: 0, p: 2, position: 'relative' }}>
                    {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                    <IconButton
                        aria-label="close"
                        onClick={handleCloseDialog}
                        size="small"
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            bgcolor: 'error.main',
                            color: 'common.white',
                            '&:hover': { bgcolor: 'error.dark' },
                            width: '20px',
                            height: '20px',
                            minWidth: 'auto',
                            borderRadius: '50%',
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>

                </DialogTitle>
                <DialogContent>
                    <Tabs value={dialogTab} onChange={(_, v) => setDialogTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <Tab label="Details" />
                        <Tab label="History" disabled={!editingCoupon} />
                    </Tabs>

                    {dialogTab === 0 && (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6}>
                                <CustomInput
                                    type="code"
                                    label="Coupon Code"
                                    name="code"
                                    value={formData.code}
                                    onChange={(val) => {
                                        setFormData(prev => ({ ...prev, code: val?.toUpperCase() }));
                                        validateField('code', val?.toUpperCase());
                                    }}
                                    onBlur={() => {
                                        setTouched(prev => ({ ...prev, code: true }));
                                        validateField('code', formData.code);
                                    }}
                                    fullWidth
                                    required
                                    error={touched.code && Boolean(errors.code)}
                                    helperText={
                                        touched.code && errors.code
                                            ? errors.code
                                            : "e.g., FESTIVAL25, DIWALI50"
                                    }
                                    inputProps={{ style: { textTransform: 'uppercase' } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <CustomInput
                                    type="name"
                                    label="Coupon Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={(val) => {
                                        setFormData(prev => ({ ...prev, name: val }));
                                        validateField("name", val);
                                    }}
                                    onBlur={() => {
                                        setTouched(prev => ({ ...prev, name: true }));
                                        validateField("name", formData.name);
                                    }}
                                    error={touched.name && Boolean(errors.name)}
                                    helperText={touched.name && errors.name}
                                    fullWidth
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <CustomInput
                                    type="textarea"
                                    label="Description"
                                    name="description"
                                    value={formData.description}
                                    onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
                                    fullWidth
                                    multiline
                                    rows={2}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="Discount Type"
                                    name="discountType"
                                    value={formData.discountType}
                                    onChange={handleInputChange}
                                    select
                                    fullWidth
                                    required
                                >
                                    <MenuItem value="percentage">Percentage</MenuItem>
                                    <MenuItem value="fixed">Fixed Amount</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomInput
                                    type="number"
                                    label={formData.discountType === 'percentage' ? 'Discount %' : 'Discount Amount ($)'}
                                    name="discountValue"
                                    value={formData.discountValue}
                                    onChange={(val) => {
                                        handleNumberFieldChange('discountValue', val);
                                        validateField('discountValue', val, { discountType: formData.discountType });
                                    }}
                                    onBlur={() => {
                                        setTouched(prev => ({ ...prev, discountValue: true }));
                                        validateField('discountValue', formData.discountValue, { discountType: formData.discountType });
                                    }}
                                    fullWidth
                                    required
                                    inputProps={{ min: 0, step: formData.discountType === 'percentage' ? 1 : 10 }}
                                    error={touched.discountValue && Boolean(errors.discountValue)}
                                    helperText={touched.discountValue && errors.discountValue ? errors.discountValue : ''}
                                />
                            </Grid>
                            {formData.discountType === 'percentage' && (
                                <Grid item xs={12} sm={4}>
                                    <CustomInput
                                        type="number"
                                        label="Max Discount Amount ($)"
                                        name="maxDiscountAmount"
                                        value={formData.maxDiscountAmount}
                                        onChange={(val) => {
                                            handleNumberFieldChange('maxDiscountAmount', val);
                                        }}
                                        onBlur={() => {
                                            setTouched(prev => ({ ...prev, maxDiscountAmount: true }));
                                            validateField('maxDiscountAmount', formData.maxDiscountAmount);
                                        }}
                                        fullWidth
                                        inputProps={{ min: 0, step: 10 }}
                                        error={touched.maxDiscountAmount && Boolean(errors.maxDiscountAmount)}
                                        helperText={
                                            touched.maxDiscountAmount && errors.maxDiscountAmount
                                                ? errors.maxDiscountAmount
                                                : ''
                                        }
                                    />
                                </Grid>
                            )}
                            <Grid item xs={12} sm={6}>
                                <CustomInput
                                    type="number"
                                    label="Minimum Bill Amount ($)"
                                    name="minBillAmount"
                                    value={formData.minBillAmount}
                                    onChange={(val) => {
                                        handleNumberFieldChange('minBillAmount', val);
                                    }}
                                    onBlur={() => {
                                        setTouched(prev => ({ ...prev, minBillAmount: true }));
                                        validateField('minBillAmount', formData.minBillAmount);
                                    }}
                                    fullWidth
                                    inputProps={{ min: 0, step: 10 }}
                                    error={touched.minBillAmount && Boolean(errors.minBillAmount)}
                                    helperText={
                                        touched.minBillAmount && errors.minBillAmount
                                            ? errors.minBillAmount
                                            : ''
                                    }
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Applicable Order Types</InputLabel>
                                    <Select
                                        multiple
                                        name="applicableOrderTypes"
                                        value={formData.applicableOrderTypes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, applicableOrderTypes: e.target.value as string[] }))}
                                        input={<OutlinedInput label="Applicable Order Types" />}
                                        renderValue={(selected) => (selected as string[]).join(', ')}
                                    >
                                        {ORDER_TYPES.map((type) => (
                                            <MenuItem key={type} value={type}>
                                                {ORDER_TYPE_LABELS[type] || type}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <CustomInput
                                    type="number"
                                    allowDecimals={false}
                                    label="Max Total Uses"
                                    name="maxTotalUses"
                                    value={formData.maxTotalUses}
                                    onChange={(val) => {
                                        handleNumberFieldChange('maxTotalUses', val, { allowDecimals: false });
                                    }}
                                    onBlur={() => {
                                        setTouched(prev => ({ ...prev, maxTotalUses: true }));
                                        validateField('maxTotalUses', formData.maxTotalUses);
                                    }}
                                    fullWidth
                                    inputProps={{ min: 0, step: 1 }}
                                    error={touched.maxTotalUses && Boolean(errors.maxTotalUses)}
                                    helperText={
                                        touched.maxTotalUses && errors.maxTotalUses
                                            ? errors.maxTotalUses
                                            : 'Leave empty for unlimited'
                                    }
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <CustomInput
                                    type="number"
                                    allowDecimals={false}
                                    label="Max Uses Per Customer"
                                    name="maxUsesPerCustomer"
                                    value={formData.maxUsesPerCustomer}
                                    onChange={(val) => {
                                        handleNumberFieldChange('maxUsesPerCustomer', val, { maxLimit: 100, allowDecimals: false });
                                    }}
                                    onBlur={() => {
                                        setTouched(prev => ({ ...prev, maxUsesPerCustomer: true }));
                                        validateField('maxUsesPerCustomer', formData.maxUsesPerCustomer);
                                    }}
                                    fullWidth
                                    required
                                    inputProps={{ min: 1, step: 1 }}
                                    error={touched.maxUsesPerCustomer && Boolean(errors.maxUsesPerCustomer)}
                                    helperText={
                                        touched.maxUsesPerCustomer && errors.maxUsesPerCustomer
                                            ? errors.maxUsesPerCustomer
                                            : ''
                                    }
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="Valid From"
                                    name="validFrom"
                                    type="date"
                                    value={formData.validFrom}
                                    onChange={handleInputChange}
                                    onBlur={() => {
                                        setTouched(prev => ({ ...prev, validFrom: true }));
                                        validateField('validFrom', formData.validFrom);
                                    }}
                                    fullWidth
                                    required
                                    InputLabelProps={{ shrink: true }}
                                    error={touched.validFrom && Boolean(errors.validFrom)}
                                    helperText={touched.validFrom && errors.validFrom ? errors.validFrom : ''}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    label="Valid To"
                                    name="validTo"
                                    type="date"
                                    value={formData.validTo}
                                    onChange={handleInputChange}
                                    onBlur={() => {
                                        setTouched(prev => ({ ...prev, validTo: true }));
                                        validateField('validTo', formData.validTo, { validFrom: formData.validFrom });
                                    }}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    error={touched.validTo && Boolean(errors.validTo)}
                                    helperText={touched.validTo && errors.validTo ? errors.validTo : ''}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomInput
                                    type="number"
                                    allowDecimals={false}
                                    label="Or Valid For (Days)"
                                    name="validForDays"
                                    value={formData.validForDays}
                                    onChange={(val) => {
                                        handleNumberFieldChange('validForDays', val, { allowDecimals: false });
                                    }}
                                    fullWidth
                                    inputProps={{ min: 1, step: 1 }}
                                    helperText="e.g., 2, 4, 7 days"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.active}
                                            onChange={handleInputChange}
                                            name="active"
                                        />
                                    }
                                    label="Active"
                                />
                            </Grid>
                        </Grid>
                    )}

                    {dialogTab === 1 && editingCoupon && (
                        <Box sx={{ mt: 2 }}>
                            <ActionHistoryList history={editingCoupon.actionHistory || []} emptyMessage="No history for this coupon." />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!formData.code || !formData.name || !formData.discountValue || !formData.validFrom}
                    >
                        {editingCoupon ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleCancelDelete}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        width: '100%',
                        maxWidth: 400
                    }
                }}
            >
                <DialogTitle id="delete-dialog-title" sx={{ fontWeight: 'bold' }}>
                    Confirm Delete
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        Are you sure you want to delete the coupon with code <strong>"{couponToDelete?.code}"</strong>? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button onClick={handleCancelDelete} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        color="error"
                        variant="contained"
                        disabled={isDeleting}
                        startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
};

export default CouponsPage;