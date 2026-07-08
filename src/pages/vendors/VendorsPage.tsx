import {
    Add as AddIcon,
    LocationOn as AddressIcon,
    AccountBalance as BankIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Email as EmailIcon,
    Inventory as InventoryIcon,
    ShoppingCart as OrderIcon,
    Phone as PhoneIcon,
    Search as SearchIcon,
    Store as VendorIcon,
    Warning as WarningIcon,
    WhatsApp as WhatsAppIcon,
    RestoreFromTrash as RestoreIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
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
    FormGroup,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    alpha,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import PhoneInput from 'src/components/PhoneInput';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { useSettings } from '../../context/SettingsContext';
import { inventoryAPI, vendorsAPI } from '../../services/api';
import CustomInput from '../../components/common/CustomInput';

interface Vendor {
    _id: string;
    name: string;
    contact: string;
    dialCode?: string;
    email: string;
    address: string;
    gstNumber?: string;
    panNumber?: string;
    status: 'active' | 'inactive';
    categories: string[];
    notes?: string;
    shopName?: string;
    bankDetails?: {
        country?: string;
        accountName?: string;
        accountNumber?: string;
        bankName?: string;
        ifscCode?: string;
        routingNumber?: string;
        accountType?: string;
        usMethod?: string;
        zelleType?: string;
        zelleValue?: string;
    };
    createdAt: string;
}

const CATEGORIES = [
    { value: 'raw_materials', label: 'Raw Materials' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'supplies', label: 'Supplies' },
    { value: 'other', label: 'Other' },
];

const VendorsPage: React.FC = () => {
    const { settings } = useSettings();
    const theme = useTheme();
    const navigate = useNavigate();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const headingFontSize = { xs: '1.12rem', sm: '1.4rem', md: '2.125rem' };
    const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalVendors, setTotalVendors] = useState(0);

    // Reorder Alerts State
    const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
    const [reorderItems, setReorderItems] = useState<any[]>([]);
    const [reorderLoading, setReorderLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        shopName: '',
        contact: '',
        dialCode: '1',
        email: '',
        address: '',
        gstNumber: '',
        panNumber: '',
        categories: ['raw_materials'] as string[],
        notes: '',
        bankDetails: {
            country: 'usa',
            accountName: '',
            accountNumber: '',
            bankName: '',
            ifscCode: '',
            routingNumber: '',
            accountType: 'Checking',
            usMethod: 'bank_transfer',
            zelleType: 'number',
            zelleValue: '',
        },
    });
    const [errors, setErrors] = useState<any>({});


    useEffect(() => {
        fetchVendors();
    }, [searchTerm, statusFilter, page, rowsPerPage]);

    // Sync dial code with settings
    useEffect(() => {
        if (settings?.restaurant?.dialCode && !selectedVendor) {
            setFormData(prev => ({ ...prev, dialCode: settings.restaurant.dialCode }));
        }
    }, [settings?.restaurant?.dialCode, selectedVendor]);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const params: any = {
                page: page + 1,
                limit: rowsPerPage,
            };
            if (searchTerm) params.search = searchTerm;
            if (statusFilter === 'deleted') {
                params.isDeleted = true;
            } else if (statusFilter) {
                params.status = statusFilter;
            }

            const response = await vendorsAPI.getAll(params);
            setVendors(response.data.vendors || []);
            setTotalVendors(response.data.total || 0);
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
            toast.error('Failed to fetch vendors');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleOpenDialog = (vendor?: Vendor) => {
        if (vendor) {
            setSelectedVendor(vendor);
            setFormData({
                name: vendor.name,
                shopName: vendor.shopName || '',
                contact: vendor.contact || '',
                dialCode: vendor.dialCode || '1',
                email: vendor.email || '',
                address: vendor.address || '',
                gstNumber: vendor.gstNumber || '',
                panNumber: vendor.panNumber || '',
                categories: vendor.categories || ['raw_materials'],
                notes: vendor.notes || '',
                bankDetails: {
                    country: vendor.bankDetails?.country || 'usa',
                    accountName: vendor.bankDetails?.accountName || '',
                    accountNumber: vendor.bankDetails?.accountNumber || '',
                    bankName: vendor.bankDetails?.bankName || '',
                    ifscCode: vendor.bankDetails?.ifscCode || '',
                    routingNumber: vendor.bankDetails?.routingNumber || '',
                    accountType: vendor.bankDetails?.accountType || 'Checking',
                    usMethod: vendor.bankDetails?.usMethod || 'bank_transfer',
                    zelleType: vendor.bankDetails?.zelleType || 'number',
                    zelleValue: vendor.bankDetails?.zelleValue || '',
                },
            });
        } else {
            setSelectedVendor(null);
            setFormData({
                name: '',
                shopName: '',
                contact: '',
                dialCode: settings?.restaurant?.dialCode || '1',
                email: '',
                address: '',
                gstNumber: '',
                panNumber: '',
                categories: ['raw_materials'],
                notes: '',
                bankDetails: {
                    country: 'usa',
                    accountName: '',
                    accountNumber: '',
                    bankName: '',
                    ifscCode: '',
                    routingNumber: '',
                    accountType: 'Checking',
                    usMethod: 'bank_transfer',
                    zelleType: 'number',
                    zelleValue: '',
                },
            });
        }
        setDialogOpen(true);
        setErrors({});
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedVendor(null);
        setErrors({});
    };

    const validateField = (name: string, value: any) => {
        let error = '';
        if (name === 'name' && !value.trim()) error = 'Vendor name is required';
        if (name === 'contact') {
            if (!value.trim()) error = 'Contact number is required';
            else if (value.replace(/\D/g, '').length !== 10) error = 'Contact number must be 10 digits';
        }
        if (name === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!value.trim()) error = 'Email is required';
            else if (!emailRegex.test(value)) error = 'Invalid email address';
        }
        if (name === 'address' && !value.trim()) error = 'Address is required';

        setErrors((prev: any) => ({ ...prev, [name]: error }));
        return error;
    };

    const validateForm = () => {
        const newErrors: any = {};
        if (!formData.name.trim()) newErrors.name = 'Vendor name is required';

        if (!formData.contact.trim()) newErrors.contact = 'Contact number is required';
        else if (formData.contact.replace(/\D/g, '').length !== 10) newErrors.contact = 'Contact number must be 10 digits';

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!emailRegex.test(formData.email)) newErrors.email = 'Invalid email address';

        if (!formData.address.trim()) newErrors.address = 'Address is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (submitting) return;
        if (!validateForm()) {
            toast.error('Please fill all the required fields');
            return;
        }

        try {
            setSubmitting(true);
            if (selectedVendor) {
                await vendorsAPI.update(selectedVendor._id, formData);
                toast.success('Vendor updated successfully');
            } else {
                await vendorsAPI.create(formData);
                toast.success('Vendor created successfully');
            }
            handleCloseDialog();
            fetchVendors();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save vendor');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedVendor || isDeleting) return;

        try {
            setIsDeleting(true);
            await vendorsAPI.delete(selectedVendor._id);
            toast.success('Vendor deleted successfully');
            setDeleteDialogOpen(false);
            setSelectedVendor(null);
            fetchVendors();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete vendor');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRestore = async (vendor: Vendor) => {
        try {
            await vendorsAPI.restore(vendor._id);
            toast.success('Vendor restored successfully');
            fetchVendors();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to restore vendor');
        }
    };

    const handleToggleStatus = async (vendor: Vendor) => {
        if (isToggling) return;
        try {
            setIsToggling(true);
            await vendorsAPI.toggleStatus(vendor._id);
            toast.success(`Vendor ${vendor.status === 'active' ? 'deactivated' : 'activated'}`);
            fetchVendors();
        } catch (error: any) {
            toast.error('Failed to update vendor status');
        } finally {
            setIsToggling(false);
        }
    };

    const handleReorderClick = async (vendor: Vendor) => {
        try {
            setSelectedVendor(vendor);
            setReorderLoading(true);
            setReorderDialogOpen(true);
            const response = await vendorsAPI.getReorderAlerts(vendor._id);
            setReorderItems(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch reorder alerts:', error);
            toast.error('Failed to fetch reorder alerts');
        } finally {
            setReorderLoading(false);
        }
    };

    const handleReorderItemChange = (itemId: string, field: string, value: any) => {
        setReorderItems(prev => prev.map(item =>
            item.itemId === itemId ? { ...item, [field]: value } : item
        ));
    };

    const handleSaveReorderSettings = async () => {
        if (reorderLoading) return;
        try {
            setReorderLoading(true);
            // Specifically save reorder levels back to inventory
            await Promise.all(reorderItems.map(item =>
                inventoryAPI.update(item.itemId, { reorderLevel: item.reorderLevel })
            ));
            toast.success('Inventory reorder levels updated successfully');
        } catch (error) {
            console.error('Failed to save reorder levels:', error);
            toast.error('Failed to save some reorder levels');
        } finally {
            setReorderLoading(false);
        }
    };

    const handleCreatePOFromReorder = () => {
        if (!selectedVendor || reorderItems.length === 0) return;

        // Map reorder items to PO item format
        const itemsToReorder = reorderItems.map(item => ({
            description: item.name,
            quantity: item.lastOrderQuantity || 1,
            unit: item.unit,
            unitPrice: item.lastOrderPrice || 0,
            total: (item.lastOrderQuantity || 1) * (item.lastOrderPrice || 0),
            inventoryItem: item.itemId,
            weightValue: '',
            weightUnit: 'lb'
        }));

        // Navigate to Create PO page with pre-filled state
        navigate('/purchase-orders/create', {
            state: {
                vendor: {
                    name: selectedVendor.name,
                    contact: selectedVendor.contact,
                    email: selectedVendor.email,
                    address: selectedVendor.address
                },
                items: itemsToReorder,
                notes: `Auto-generated from Reorder Alerts for ${new Date().toLocaleDateString()}`
            }
        });
    };

    const handleEmailReorder = () => {
        if (!selectedVendor || reorderItems.length === 0) return;

        const restaurantName = (settings?.restaurant as any)?.restaurantName || settings?.restaurant?.name || 'our restaurant';
        const dateStr = new Date().toLocaleDateString();

        const itemBody = reorderItems.map(item => `- ${item.name}: ${item.lastOrderQuantity} ${item.unit}`).join('\n');
        const subject = encodeURIComponent(`Reorder Request from ${restaurantName} - ${dateStr}`);
        const body = encodeURIComponent(`Hi ${selectedVendor.name},\n\nThis is ${restaurantName}. I would like to place an order for the following items on ${dateStr}:\n\n${itemBody}\n\nPlease confirm receipt and let me know the availability.\n\nBest regards,\n${restaurantName}`);

        window.location.href = `mailto:${selectedVendor.email || ''}?subject=${subject}&body=${body}`;
    };

    const handleWhatsAppReorder = () => {
        if (!selectedVendor || reorderItems.length === 0) return;

        const restaurantName = (settings?.restaurant as any)?.restaurantName || settings?.restaurant?.name || 'our restaurant';
        const dateStr = new Date().toLocaleDateString();

        const itemBody = reorderItems.map(item => `* ${item.name}: ${item.lastOrderQuantity} ${item.unit}`).join('%0A');
        const text = encodeURIComponent(`*Reorder Request from ${restaurantName}*\n_Date: ${dateStr}_\n\nHi ${selectedVendor.name},\n\nI would like to place an order for the following items:\n${itemBody}\n\nPlease confirm receipt.\n\nBest regards,\n*${restaurantName}*`);

        const phoneNumber = selectedVendor.contact?.replace(/\D/g, '');
        window.open(`https://wa.me/${phoneNumber}?text=${text}`, '_blank');
    };

    const handleCategoryChange = (category: string) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : [...prev.categories, category],
        }));
    };

    return (
        <Box sx={{
            p: isMobile ? 1.4 : 4,
            pt: isMobile ? '20px' : 4, // Minimize top gap on phones only
            maxWidth: 1600,
            mx: 'auto'
        }}>
            {/* Header */}
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
                mb: isMobile ? 2 : 5,
                gap: { xs: 1.25, sm: 2 }
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: 1.5 }}>
                    <Box sx={{
                        p: isMobile ? 1 : 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        display: 'flex'
                    }}>
                        <VendorIcon fontSize={isMobile ? "small" : "medium"} />
                    </Box>
                    <Typography
                        variant="h4"
                        fontWeight={900}
                        sx={{
                            fontSize: headingFontSize,
                            color: { xs: '#000', sm: 'text.primary' },
                            textAlign: { xs: 'center', sm: 'left' },
                            letterSpacing: '-0.04em'
                        }}
                    >
                        Vendors
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{
                        borderRadius: 2,
                        whiteSpace: 'nowrap',
                        fontSize: bodyFontSize,
                        px: { xs: 2, sm: 3 },
                        py: isMobile ? 0.75 : 1,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)',
                        width: { xs: '100%', sm: 'auto' }
                    }}
                >
                    Add {isMobile ? '' : 'New'} Vendor
                </Button>
            </Box>

            {/* Filters */}
            <Paper sx={{
                p: isMobile ? 1.25 : 2,
                mb: isMobile ? 2 : 4,
                borderRadius: isMobile ? 3 : 2,
                boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.05)' : alpha(theme.palette.divider, 0.1),
                border: isMobile ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none'
            }}>
                <Grid container spacing={2} alignItems="center" justifyContent={isMobile ? "center" : "space-between"}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            placeholder="Search vendors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2 }
                            }}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel sx={{ fontSize: '0.875rem' }}>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => setStatusFilter(e.target.value)}
                                sx={{ borderRadius: 2, fontSize: bodyFontSize }}
                            >
                                <MenuItem value="">All Statuses</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                                <MenuItem value="deleted">Deleted</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {/* Vendors Table */}
            {/* Mobile Cards */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress thickness={2} size={50} /></Box>
                ) : vendors.length === 0 ? (
                    <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 4, border: '2px dashed', borderColor: 'divider', bgcolor: 'transparent', width: '100%', maxWidth: 500 }}>
                        <Typography color="text.secondary" fontWeight={900} sx={{ fontSize: headingFontSize, color: { xs: '#000', sm: 'text.secondary' } }}>No vendors found</Typography>
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ mt: 2, borderRadius: 2 }}>Add First Vendor</Button>
                    </Paper>
                ) : (
                    <Grid container spacing={isMobile ? 0.75 : 2} justifyContent="center" sx={{ width: '100%', m: 0 }}>
                        {vendors.map((vendor) => (
                            <Grid item xs={12} key={vendor._id} sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Paper
                                    sx={{
                                        p: 1.15,
                                        borderRadius: 3,
                                        width: '100%',
                                        maxWidth: 500,
                                        position: 'relative',
                                        border: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                            <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05), color: 'primary.main' }}>
                                                <VendorIcon fontSize="small" />
                                            </Box>
                                            <Box>
                                                <Typography fontWeight={900} sx={{ fontSize: '0.9rem', letterSpacing: '-0.02em' }}>{vendor.name}</Typography>
                                                {vendor.shopName && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem' }}>{vendor.shopName}</Typography>}
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            {statusFilter === 'deleted' ? (
                                                <Tooltip title="Restore Vendor">
                                                    <IconButton onClick={() => handleRestore(vendor)} size="small" sx={{ bgcolor: alpha(theme.palette.success.main, 0.05), color: 'success.main' }}>
                                                        <RestoreIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            ) : (
                                                <>
                                                    <IconButton onClick={() => handleOpenDialog(vendor)} size="small" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), color: 'primary.main' }}><EditIcon fontSize="small" /></IconButton>
                                                    <IconButton onClick={() => { setSelectedVendor(vendor); setDeleteDialogOpen(true); }} size="small" sx={{ bgcolor: alpha(theme.palette.error.main, 0.05), color: 'error.main' }}><DeleteIcon fontSize="small" /></IconButton>
                                                </>
                                            )}
                                        </Box>
                                    </Box>

                                    <Divider sx={{ my: 0.75, borderStyle: 'dashed', opacity: 0.5 }} />

                                    <Grid container spacing={1}>
                                        <Grid item xs={12}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.78rem' }}>{vendor.contact}</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                <Typography variant="body2" sx={{ wordBreak: 'break-all', opacity: 0.8, fontSize: '0.74rem' }}>{vendor.email}</Typography>
                                            </Box>
                                        </Grid>
                                        {vendor.address && (
                                            <Grid item xs={12}>
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                    <AddressIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.2 }} />
                                                    <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.68rem' }}>{vendor.address}</Typography>
                                                </Box>
                                            </Grid>
                                        )}
                                    </Grid>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.25 }}>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            {vendor.categories?.slice(0, 2).map((cat) => (
                                                <Chip
                                                    key={cat}
                                                    label={CATEGORIES.find(c => c.value === cat)?.label || cat}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700 }}
                                                />
                                            ))}
                                            {vendor.categories?.length > 2 && <Chip label={`+${vendor.categories.length - 2}`} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />}
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontWeight: 800,
                                                    color: vendor.status === 'active' ? 'success.main' : 'text.secondary',
                                                    textTransform: 'uppercase',
                                                    minWidth: 54,
                                                    textAlign: 'right',
                                                }}
                                            >
                                                {vendor.status}
                                            </Typography>
                                            {statusFilter !== 'deleted' && (
                                                <Switch
                                                    size="small"
                                                    checked={vendor.status === 'active'}
                                                    onChange={() => handleToggleStatus(vendor)}
                                                    color="success"
                                                    inputProps={{ 'aria-label': `Toggle ${vendor.name} status` }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>

            {/* Desktop Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 2, display: { xs: 'none', md: 'block' } }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Vendor Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Shop Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Contact</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Categories</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : vendors.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">No vendors found</Typography>
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => handleOpenDialog()}
                                        sx={{ mt: 2 }}
                                    >
                                        Add First Vendor
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : (
                            vendors.map((vendor) => (
                                <TableRow key={vendor._id} hover>
                                    <TableCell>
                                        <Typography fontWeight="medium">{vendor.name}</Typography>
                                        {vendor.address && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <AddressIcon fontSize="inherit" />
                                                {vendor.address}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{vendor.shopName || '-'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {vendor.contact && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <PhoneIcon fontSize="small" color="action" />
                                                {vendor.contact}
                                            </Box>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {vendor.email && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <EmailIcon fontSize="small" color="action" />
                                                {vendor.email}
                                            </Box>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {vendor.categories?.slice(0, 2).map((cat) => (
                                                <Chip
                                                    key={cat}
                                                    label={CATEGORIES.find(c => c.value === cat)?.label || cat}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            ))}
                                            {vendor.categories?.length > 2 && (
                                                <Chip label={`+${vendor.categories.length - 2}`} size="small" />
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontWeight: 800,
                                                    color: vendor.status === 'active' ? 'success.main' : 'text.secondary',
                                                    textTransform: 'uppercase',
                                                    minWidth: 54,
                                                }}
                                            >
                                                {vendor.status}
                                            </Typography>
                                            {statusFilter !== 'deleted' && (
                                                <Switch
                                                    size="small"
                                                    checked={vendor.status === 'active'}
                                                    onChange={() => handleToggleStatus(vendor)}
                                                    color="success"
                                                    inputProps={{ 'aria-label': `Toggle ${vendor.name} status` }}
                                                />
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                            {statusFilter === 'deleted' ? (
                                                <Tooltip title="Restore">
                                                    <IconButton onClick={() => handleRestore(vendor)} size="small" sx={{ color: 'success.main' }}>
                                                        <RestoreIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            ) : (
                                                <>
                                                    <Tooltip title="Edit">
                                                        <IconButton onClick={() => handleOpenDialog(vendor)} size="small" sx={{ color: 'primary.main' }}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Reorder Needed Items">
                                                        <IconButton
                                                            onClick={() => handleReorderClick(vendor)}
                                                            size="small"
                                                            sx={{ color: 'warning.main' }}
                                                        >
                                                            <InventoryIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            onClick={() => {
                                                                setSelectedVendor(vendor);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                            size="small"
                                                            color="error"
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={totalVendors}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />

            {/* Add/Edit Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
                fullScreen={isMobile}
                PaperProps={{
                    sx: {
                        borderRadius: isMobile ? 0 : 4,
                        bgcolor: '#f9fafb'
                    }
                }}
            >
                <DialogTitle sx={{
                    p: isMobile ? 2 : 2.5,
                    pt: isMobile ? '60px' : 2.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: 'white',
                    borderBottom: '1px solid',
                    borderColor: alpha(theme.palette.divider, 0.1)
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                            display: 'flex'
                        }}>
                            <VendorIcon fontSize={isMobile ? "small" : "medium"} />
                        </Box>
                        <Typography
                            variant={isMobile ? "subtitle1" : "h6"}
                            fontWeight={700}
                            sx={{
                                letterSpacing: '-0.01em',
                                textTransform: 'uppercase',
                                fontFamily: '"Outfit", sans-serif',
                                fontSize: isMobile ? '0.95rem' : '1.25rem'
                            }}
                        >
                            {selectedVendor ? 'Edit Vendor' : 'Add New Vendor'}
                        </Typography>
                    </Box>
                    <IconButton
                        onClick={handleCloseDialog}
                        size="small"
                        sx={{
                            color: 'text.secondary',
                            bgcolor: alpha(theme.palette.divider, 0.1),
                            '&:hover': { bgcolor: alpha(theme.palette.divider, 0.2) }
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{
                    p: isMobile ? 1.5 : 3,
                    bgcolor: '#f8f9fa',
                    '& .MuiFormLabel-asterisk': { color: 'red' }
                }}>
                    <Grid container spacing={isMobile ? 1.5 : 3}>
                        {/* Basic Info */}
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'stretch' }}>
                            <Paper sx={{
                                p: isMobile ? 2 : 3,
                                borderRadius: 3,
                                width: '100%',
                                maxWidth: isMobile ? 500 : 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.divider, 0.05),
                                bgcolor: 'white'
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
                                <Grid container spacing={isMobile ? 1.5 : 2.5}>
                                    <Grid item xs={12} md={6}>
                                        <CustomInput
                                            type="name"
                                            fullWidth
                                            label="Vendor Name"
                                            value={formData.name}
                                            onChange={(val) => {
                                                setFormData({ ...formData, name: val });
                                                if (errors.name) validateField('name', val);
                                            }}
                                            onBlur={() => validateField('name', formData.name)}
                                            error={!!errors.name}
                                            helperText={errors.name}
                                            required
                                            size={isMobile ? "small" : "medium"}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Shop Name"
                                            value={formData.shopName}
                                            onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                                            size={isMobile ? "small" : "medium"}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <PhoneInput
                                            value={formData.contact}
                                            onChange={(val) => {
                                                const clean = val.replace(/\D/g, '').slice(0, 10);
                                                setFormData({ ...formData, contact: clean });
                                                if (errors.contact) validateField('contact', clean);
                                            }}
                                            dialCode={formData.dialCode || '1'}
                                            onDialCodeChange={(code) => setFormData({ ...formData, dialCode: code })}
                                            label="Contact Number"
                                            required
                                            fullWidth
                                            onBlur={() => validateField('contact', formData.contact)}
                                            error={!!errors.contact}
                                            helperText={errors.contact}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => {
                                                setFormData({ ...formData, email: e.target.value });
                                                if (errors.email) validateField('email', e.target.value);
                                            }}
                                            onBlur={(e) => validateField('email', e.target.value)}
                                            error={!!errors.email}
                                            helperText={errors.email}
                                            required
                                            size={isMobile ? "small" : "medium"}
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" /></InputAdornment>,
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <AddressAutocomplete
                                            label="Address"
                                            value={formData.address}
                                            apiKey={settings.system?.googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                                            onChange={(value) => {
                                                setFormData({ ...formData, address: value });
                                                if (errors.address) validateField('address', value);
                                            }}
                                            onSelect={(addr) => {
                                                const fullAddress = addr.fullAddress || formData.address;
                                                setFormData({ ...formData, address: fullAddress });
                                                validateField('address', fullAddress);
                                            }}
                                            onBlur={() => validateField('address', formData.address)}
                                            error={!!errors.address}
                                            helperText={errors.address}
                                            required
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>



                        {/* Categories */}
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'stretch' }}>
                            <Paper sx={{
                                p: isMobile ? 2 : 3,
                                borderRadius: 3,
                                width: '100%',
                                maxWidth: isMobile ? 500 : 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.divider, 0.05),
                                bgcolor: 'white'
                            }}>
                                <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    color="primary"
                                    sx={{
                                        display: 'block',
                                        mb: 1,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        fontFamily: '"Outfit", sans-serif'
                                    }}
                                >
                                    Service Categories
                                </Typography>
                                <FormGroup row={!isMobile}>
                                    {CATEGORIES.map((cat) => (
                                        <FormControlLabel
                                            key={cat.value}
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={formData.categories.includes(cat.value)}
                                                    onChange={() => handleCategoryChange(cat.value)}
                                                />
                                            }
                                            label={<Typography variant="body2">{cat.label}</Typography>}
                                        />
                                    ))}
                                </FormGroup>
                            </Paper>
                        </Grid>

                        {/* Bank Details */}
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'stretch' }}>
                            <Paper sx={{
                                p: isMobile ? 2 : 3,
                                borderRadius: 3,
                                width: '100%',
                                maxWidth: isMobile ? 500 : 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.divider, 0.05),
                                bgcolor: 'white'
                            }}>
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 2 }}>
                                    <Typography
                                        variant="caption"
                                        fontWeight={700}
                                        color="primary"
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            fontFamily: '"Outfit", sans-serif'
                                        }}
                                    >
                                        <BankIcon fontSize="inherit" />
                                        Bank Settlement Info
                                    </Typography>
                                    <FormControl component="fieldset" size="small">
                                        <RadioGroup
                                            row
                                            value={formData.bankDetails.country || 'usa'}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                bankDetails: { ...formData.bankDetails, country: e.target.value }
                                            })}
                                        >
                                            <FormControlLabel value="usa" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight={600}>USA</Typography>} />
                                            <FormControlLabel value="india" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight={600}>India</Typography>} />
                                        </RadioGroup>
                                    </FormControl>
                                </Box>
                                <Grid container spacing={2}>
                                    {/* USA: choose settlement method — Bank Transfer or Zelle */}
                                    {formData.bankDetails.country === 'usa' && (
                                        <Grid item xs={12}>
                                            <FormControl component="fieldset" size="small">
                                                <RadioGroup
                                                    row
                                                    value={formData.bankDetails.usMethod || 'bank_transfer'}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        bankDetails: { ...formData.bankDetails, usMethod: e.target.value }
                                                    })}
                                                >
                                                    <FormControlLabel value="bank_transfer" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight={600}>Bank Transfer</Typography>} />
                                                    <FormControlLabel value="zelle" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight={600}>Zelle</Typography>} />
                                                </RadioGroup>
                                            </FormControl>
                                        </Grid>
                                    )}

                                    {(formData.bankDetails.country === 'usa' && formData.bankDetails.usMethod === 'zelle') ? (
                                        <>
                                            {/* Zelle settlement */}
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="Account Holder"
                                                    size="small"
                                                    value={formData.bankDetails.accountName}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        bankDetails: { ...formData.bankDetails, accountName: e.target.value }
                                                    })}
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>Zelle Registered With</InputLabel>
                                                    <Select
                                                        value={formData.bankDetails.zelleType || 'number'}
                                                        label="Zelle Registered With"
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            bankDetails: { ...formData.bankDetails, zelleType: e.target.value, zelleValue: '' }
                                                        })}
                                                    >
                                                        <MenuItem value="number">Phone Number</MenuItem>
                                                        <MenuItem value="email">Email</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    label={formData.bankDetails.zelleType === 'email' ? 'Zelle Email' : 'Zelle Phone Number'}
                                                    type={formData.bankDetails.zelleType === 'email' ? 'email' : 'tel'}
                                                    placeholder={formData.bankDetails.zelleType === 'email' ? 'name@example.com' : '+1 555 123 4567'}
                                                    value={formData.bankDetails.zelleValue}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        bankDetails: { ...formData.bankDetails, zelleValue: e.target.value.replace(/\D/g, '').slice(0, 10) }
                                                    })}
                                                />
                                            </Grid>
                                        </>
                                    ) : (
                                        <>
                                            {/* Bank transfer settlement (USA bank transfer or India) */}
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="Account Holder"
                                                    size="small"
                                                    value={formData.bankDetails.accountName}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        bankDetails: { ...formData.bankDetails, accountName: e.target.value }
                                                    })}
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="Account Number"
                                                    size="small"
                                                    value={formData.bankDetails.accountNumber}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        bankDetails: { ...formData.bankDetails, accountNumber: e.target.value }
                                                    })}
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="Bank Name"
                                                    size="small"
                                                    value={formData.bankDetails.bankName}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        bankDetails: { ...formData.bankDetails, bankName: e.target.value }
                                                    })}
                                                />
                                            </Grid>
                                            {formData.bankDetails.country === 'usa' ? (
                                                <>
                                                    <Grid item xs={12} md={6}>
                                                        <TextField
                                                            fullWidth
                                                            label="Routing Number (ABA)"
                                                            size="small"
                                                            value={formData.bankDetails.routingNumber}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                bankDetails: { ...formData.bankDetails, routingNumber: e.target.value }
                                                            })}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} md={6}>
                                                        <FormControl fullWidth size="small">
                                                            <InputLabel>Account Type</InputLabel>
                                                            <Select
                                                                value={formData.bankDetails.accountType || 'Checking'}
                                                                label="Account Type"
                                                                onChange={(e) => setFormData({
                                                                    ...formData,
                                                                    bankDetails: { ...formData.bankDetails, accountType: e.target.value }
                                                                })}
                                                            >
                                                                <MenuItem value="Checking">Checking</MenuItem>
                                                                <MenuItem value="Savings">Savings</MenuItem>
                                                            </Select>
                                                        </FormControl>
                                                    </Grid>
                                                </>
                                            ) : (
                                                <Grid item xs={12} md={6}>
                                                    <TextField
                                                        fullWidth
                                                        label="IFSC Code"
                                                        size="small"
                                                        value={formData.bankDetails.ifscCode}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            bankDetails: { ...formData.bankDetails, ifscCode: e.target.value.toUpperCase() }
                                                        })}
                                                    />
                                                </Grid>
                                            )}
                                        </>
                                    )}
                                </Grid>
                            </Paper>
                        </Grid>

                        {/* Notes */}
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'stretch' }}>
                            <Paper sx={{
                                p: isMobile ? 2 : 3,
                                borderRadius: 3,
                                width: '100%',
                                maxWidth: isMobile ? 500 : 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.divider, 0.05),
                                bgcolor: 'white'
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
                                    Internal Notes
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Notes"
                                    multiline
                                    rows={isMobile ? 3 : 2}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    size="small"
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                </DialogContent>

                <DialogActions sx={{ p: isMobile ? 2 : 3, bgcolor: 'white', borderTop: '1px solid', borderColor: 'divider', gap: 1.5 }}>
                    <Button
                        onClick={handleCloseDialog}
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
                        onClick={handleSubmit}
                        sx={{
                            borderRadius: 2,
                            px: 4,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                    >
                        {selectedVendor ? 'Update Vendor' : 'Create Vendor'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                    Confirm Delete
                    <IconButton
                        onClick={() => setDeleteDialogOpen(false)}
                        size="small"
                        sx={{
                            color: 'white',
                            bgcolor: 'error.main',
                            '&:hover': {
                                bgcolor: 'error.dark',
                            },
                            width: 24,
                            height: 24
                        }}
                    >
                        <CloseIcon sx={{ fontSize: '1.1rem' }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete vendor <strong>{selectedVendor?.name}</strong>?
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reorder Alerts Dialog */}
            <Dialog
                open={reorderDialogOpen}
                onClose={() => setReorderDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarningIcon color="warning" />
                        Reorder Alerts: {selectedVendor?.name}
                    </Box>
                    <IconButton onClick={() => setReorderDialogOpen(false)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {reorderLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : reorderItems.length === 0 ? (
                        <Typography sx={{ py: 2, textAlign: 'center' }}>
                            All items for this vendor are within safe stock levels.
                        </Typography>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Item Name</TableCell>
                                        <TableCell align="right">Current Stock</TableCell>
                                        <TableCell align="right" sx={{ width: 120 }}>Reorder Level</TableCell>
                                        <TableCell align="right" sx={{ width: 140 }}>Order Qty</TableCell>
                                        <TableCell align="right">Unit</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {reorderItems.map((item) => (
                                        <TableRow key={item.itemId}>
                                            <TableCell sx={{ fontWeight: 'medium' }}>{item.name}</TableCell>
                                            <TableCell align="right" sx={{ color: item.currentStock <= item.reorderLevel ? 'error.main' : 'text.primary', fontWeight: 'bold' }}>
                                                {item.currentStock}
                                            </TableCell>
                                            <TableCell align="right">
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    value={item.reorderLevel}
                                                    onChange={(e) => handleReorderItemChange(item.itemId, 'reorderLevel', parseFloat(e.target.value) || 0)}
                                                    InputProps={{ inputProps: { min: 0, style: { textAlign: 'right' } } }}
                                                    sx={{ width: 80 }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    value={item.lastOrderQuantity}
                                                    onChange={(e) => handleReorderItemChange(item.itemId, 'lastOrderQuantity', parseFloat(e.target.value) || 0)}
                                                    InputProps={{ inputProps: { min: 1, style: { textAlign: 'right' } } }}
                                                    sx={{
                                                        width: 100,
                                                        '& .MuiInputBase-input': {
                                                            color: 'primary.main',
                                                            fontWeight: 'bold'
                                                        }
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">{item.unit}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setReorderDialogOpen(false)}>Close</Button>
                    {reorderItems.length > 0 && (
                        <>
                            <Button
                                variant="outlined"
                                color="warning"
                                startIcon={reorderLoading ? <CircularProgress size={20} /> : <EditIcon />}
                                onClick={handleSaveReorderSettings}
                                disabled={reorderLoading}
                            >
                                Save Levels
                            </Button>
                            <Button
                                variant="outlined"
                                color="info"
                                startIcon={<EmailIcon />}
                                onClick={handleEmailReorder}
                            >
                                Email
                            </Button>
                            <Button
                                variant="outlined"
                                color="success"
                                startIcon={<WhatsAppIcon />}
                                onClick={handleWhatsAppReorder}
                            >
                                WhatsApp
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<OrderIcon />}
                                onClick={handleCreatePOFromReorder}
                            >
                                Create PO
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default VendorsPage;
