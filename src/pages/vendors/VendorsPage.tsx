import React, { useState, useEffect } from 'react';
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
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tooltip,
    InputAdornment,
    alpha,
    useTheme,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Divider,
    TablePagination,
    CircularProgress,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Store as VendorIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    LocationOn as AddressIcon,
    AccountBalance as BankIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { vendorsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';
import PhoneInput from 'src/components/PhoneInput';

interface Vendor {
    _id: string;
    name: string;
    contact: string;
    email: string;
    address: string;
    gstNumber?: string;
    panNumber?: string;
    status: 'active' | 'inactive';
    categories: string[];
    notes?: string;
    shopName?: string;
    bankDetails?: {
        accountName?: string;
        accountNumber?: string;
        bankName?: string;
        ifscCode?: string;
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

    const [formData, setFormData] = useState({
        name: '',
        shopName: '',
        contact: '',
        email: '',
        address: '',
        gstNumber: '',
        panNumber: '',
        categories: ['raw_materials'] as string[],
        notes: '',
        bankDetails: {
            accountName: '',
            accountNumber: '',
            bankName: '',
            ifscCode: '',
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
            if (statusFilter) params.status = statusFilter;

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
                bankDetails: vendor.bankDetails || {
                    accountName: '',
                    accountNumber: '',
                    bankName: '',
                    ifscCode: '',
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
                    accountName: '',
                    accountNumber: '',
                    bankName: '',
                    ifscCode: '',
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
        if (!validateForm()) {
            toast.error('Please fill all the required fields');
            return;
        }

        try {
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
        }
    };

    const handleDelete = async () => {
        if (!selectedVendor) return;

        try {
            await vendorsAPI.delete(selectedVendor._id);
            toast.success('Vendor deleted successfully');
            setDeleteDialogOpen(false);
            setSelectedVendor(null);
            fetchVendors();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete vendor');
        }
    };

    const handleToggleStatus = async (vendor: Vendor) => {
        try {
            await vendorsAPI.toggleStatus(vendor._id);
            toast.success(`Vendor ${vendor.status === 'active' ? 'deactivated' : 'activated'}`);
            fetchVendors();
        } catch (error: any) {
            toast.error('Failed to update vendor status');
        }
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
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
               <VendorIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: 'primary.main' }} />
                    <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.4rem', sm: '2.125rem' } }}>
                        Vendors
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{ borderRadius: 2, whiteSpace: 'nowrap', fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1.5, sm: 2 } }}
                >
                    Add Vendor
                </Button>
            </Box>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            placeholder="Search vendors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {/* Vendors Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
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
                                        <Chip
                                            label={vendor.status}
                                            color={vendor.status === 'active' ? 'success' : 'default'}
                                            size="small"
                                            onClick={() => handleToggleStatus(vendor)}
                                            sx={{ cursor: 'pointer', textTransform: 'capitalize' }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Edit">
                                            <IconButton onClick={() => handleOpenDialog(vendor)} size="small">
                                                <EditIcon />
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
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
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
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                    {selectedVendor ? 'Edit Vendor' : 'Add New Vendor'}
                    <IconButton
                        onClick={handleCloseDialog}
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
                <DialogContent dividers sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}>
                    <Grid container spacing={3}>
                        {/* Basic Info */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                                Basic Information
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Vendor Name"
                                value={formData.name}
                                onChange={(e) => {
                                    setFormData({ ...formData, name: e.target.value });
                                    if (errors.name) validateField('name', e.target.value);
                                }}
                                onBlur={(e) => validateField('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Shop Name"
                                value={formData.shopName}
                                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
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
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><EmailIcon /></InputAdornment>,
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Address"
                                value={formData.address}
                                onChange={(e) => {
                                    setFormData({ ...formData, address: e.target.value });
                                    if (errors.address) validateField('address', e.target.value);
                                }}
                                onBlur={(e) => validateField('address', e.target.value)}
                                error={!!errors.address}
                                helperText={errors.address}
                                required
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><AddressIcon /></InputAdornment>,
                                }}
                            />
                        </Grid>



                        {/* Categories */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                                Categories
                            </Typography>
                            <FormGroup row>
                                {CATEGORIES.map((cat) => (
                                    <FormControlLabel
                                        key={cat.value}
                                        control={
                                            <Checkbox
                                                checked={formData.categories.includes(cat.value)}
                                                onChange={() => handleCategoryChange(cat.value)}
                                            />
                                        }
                                        label={cat.label}
                                    />
                                ))}
                            </FormGroup>
                        </Grid>

                        {/* Bank Details */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <BankIcon fontSize="small" />
                                Bank Details (Optional)
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Account Holder Name"
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
                                value={formData.bankDetails.bankName}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    bankDetails: { ...formData.bankDetails, bankName: e.target.value }
                                })}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Bank Code"
                                value={formData.bankDetails.ifscCode}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    bankDetails: { ...formData.bankDetails, ifscCode: e.target.value.toUpperCase() }
                                })}
                            />
                        </Grid>

                        {/* Notes */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <TextField
                                fullWidth
                                label="Notes"
                                multiline
                                rows={2}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        {selectedVendor ? 'Update' : 'Create'}
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
        </Box>
    );
};

export default VendorsPage;
