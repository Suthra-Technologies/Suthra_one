import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    InputAdornment,
    Box,
    Tabs,
    Tab,
    IconButton,
    Typography,
    Autocomplete,
    CircularProgress,
} from '@mui/material';
import ActionHistoryList from './common/ActionHistoryList';
import {
    Close as CloseIcon,
} from '@mui/icons-material';
import { inventoryAPI, vendorsAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { validateRequired, validateSKU, validateNumber, validateEmail, validatePhone, getHelperText, hasError } from '../utils/validation';
import type { ValidationResult } from '../utils/validation';
import { useSettings, getUnitsForCountry } from '../context/SettingsContext';

// Vendor interface
interface Vendor {
    _id: string;
    name: string;
    contact?: string;
    email?: string;
    address?: string;
    status: string;
}

interface RawMaterial {
    _id?: string;
    name: string;
    sku: string;
    category: string;
    unit: string;
    currentStock: number | string;
    minimumStock: number | string;
    maximumStock: number | string;
    reorderLevel: number | string;
    costPrice: number | string;
    supplier?: {
        name?: string;
        contact?: string;
        email?: string;
        address?: string;

    };
    actionHistory?: any[];
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    material: RawMaterial | null;
}

// Units are now dynamically loaded from settings based on country

const RawMaterialDialog: React.FC<Props> = ({ open, onClose, onSave, material }) => {
    const { settings, getUnits } = useSettings();
    const units = getUnits();
    const [formData, setFormData] = useState<RawMaterial>({
        name: '',
        sku: '',
        category: 'raw_materials',
        unit: '', // Will be set from settings in useEffect
        currentStock: 0,
        minimumStock: 0,
        maximumStock: 100,
        reorderLevel: 0,
        costPrice: 0,
        supplier: {
            name: '',
            contact: '',
            email: '',
            address: '',
        },
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, ValidationResult>>({});
    const [tabValue, setTabValue] = useState(0);

    // Vendor state
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loadingVendors, setLoadingVendors] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

    // Fetch vendors when dialog opens
    useEffect(() => {
        if (open) {
            fetchVendors();
        }
    }, [open]);

    const fetchVendors = async () => {
        try {
            setLoadingVendors(true);
            const response = await vendorsAPI.getAll({ status: 'active' });
            const vendorList = response.data?.vendors || response.data || [];
            setVendors(vendorList);
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
        } finally {
            setLoadingVendors(false);
        }
    };

    useEffect(() => {
        if (material) {
            setFormData({
                ...material,
                supplier: material.supplier || { name: '', contact: '', email: '', address: '' },
            });
            // Try to find matching vendor by name
            if (material.supplier?.name && vendors.length > 0) {
                const matchingVendor = vendors.find(v => v.name === material.supplier?.name);
                setSelectedVendor(matchingVendor || null);
            } else {
                setSelectedVendor(null);
            }
        } else {
            const defaultUnit = units.length > 0 ? units[0].value : 'kg';
            setFormData({
                name: '',
                sku: '',
                category: 'raw_materials',
                unit: defaultUnit,
                currentStock: 0,
                minimumStock: 0,
                maximumStock: 100,
                reorderLevel: 0,
                costPrice: 0,
                supplier: {
                    name: '',
                    contact: '',
                    email: '',
                    address: '',
                },
            });
            setSelectedVendor(null);
        }
        setErrors({});

        setTabValue(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [material, open, units.length, vendors]);

    const handleChange = React.useCallback((field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error when user types
        setErrors(prev => {
            if (!prev[field] || prev[field].isValid) return prev;
            return { ...prev, [field]: { isValid: true } };
        });
    }, []);

    const handleNumberFieldChange = React.useCallback((field: string, rawValue: string) => {
        let cleanValue = rawValue;
        
        // Remove leading zeros unless it's "0" or starts with "0."
        if (cleanValue.length > 1 && cleanValue.startsWith('0') && !cleanValue.startsWith('0.')) {
            cleanValue = cleanValue.replace(/^0+/, '');
            if (cleanValue === '') cleanValue = '0';
        }

        // Limit to 5 digits before the decimal
        const parts = cleanValue.split('.');
        if (parts[0].length > 5) return;

        handleChange(field, cleanValue);
    }, [handleChange]);

    const handleSupplierChange = React.useCallback((field: string, value: string) => {
        let finalValue = value;
        if (field === 'contact') {
            // Only allow numbers and limit to 10 digits
            finalValue = value.replace(/\D/g, '').slice(0, 10);
        }
        setFormData((prev) => ({
            ...prev,
            supplier: { ...prev.supplier, [field]: finalValue },
        }));
        // Clear supplier field errors
        setErrors(prev => {
            const errorKey = `supplier_${field}`;
            if (!prev[errorKey] || prev[errorKey].isValid) return prev;
            return { ...prev, [errorKey]: { isValid: true } };
        });
    }, []);

    const handleBlur = React.useCallback((field: string) => {
        let validation: ValidationResult;

        // Use a ref-like approach to get current formData without adding it to dependencies
        // Actually, we can just use the state here since handleBlur is usually triggered by user action
        // and we want the most recent data. 
        
        switch (field) {
            case 'name':
                validation = validateRequired(formData.name, 'Material name');
                if (validation.isValid && (formData.name?.length || 0) < 2) {
                    validation = { isValid: false, message: 'Material name must be at least 2 characters' };
                }
                break;
            case 'sku':
                if (!formData.sku || formData.sku.trim() === '') {
                    validation = { isValid: true };
                } else {
                    validation = validateSKU(formData.sku);
                }
                break;
            case 'currentStock':
                validation = validateNumber(formData.currentStock, 'Current stock', 0);
                break;
            case 'minimumStock':
                validation = validateNumber(formData.minimumStock, 'Minimum stock', 0);
                break;
            case 'maximumStock':
                validation = validateNumber(formData.maximumStock, 'Maximum stock', 0);
                break;
            case 'reorderLevel':
                validation = validateNumber(formData.reorderLevel, 'Reorder level', 0);
                break;
            case 'costPrice':
                validation = validateNumber(formData.costPrice, 'Cost price', 0);
                break;
            case 'supplier_name':
                validation = validateRequired(formData.supplier?.name || '', 'Supplier name');
                if (validation.isValid && (formData.supplier?.name || '').length < 4) {
                    validation = { isValid: false, message: 'Supplier name must be at least 4 characters' };
                }
                break;
            case 'supplier_email':
                if (formData.supplier?.email && formData.supplier.email.trim() !== '') {
                    validation = validateEmail(formData.supplier.email);
                } else {
                    validation = { isValid: true }; // Optional field
                }
                break;
            case 'supplier_contact':
                if (formData.supplier?.contact && formData.supplier.contact.trim() !== '') {
                    validation = validatePhone(formData.supplier.contact);
                } else {
                    validation = { isValid: true }; // Optional field
                }
                break;
            default:
                validation = { isValid: true };
        }

        setErrors(prev => {
            const currentError = prev[field];
            if (currentError && currentError.isValid === validation.isValid && currentError.message === validation.message) {
                return prev;
            }
            return { ...prev, [field]: validation };
        });
    }, [formData]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, ValidationResult> = {
            name: validateRequired(formData.name, 'Material name'),
            sku: formData.sku ? validateSKU(formData.sku) : { isValid: true },
            currentStock: validateNumber(formData.currentStock, 'Current stock', 0),
            minimumStock: validateNumber(formData.minimumStock, 'Minimum stock', 0),
            maximumStock: validateNumber(formData.maximumStock, 'Maximum stock', 0),
            reorderLevel: validateNumber(formData.reorderLevel, 'Reorder level', 0),
            costPrice: validateNumber(formData.costPrice, 'Cost price', 0),
            supplier_name: validateRequired(formData.supplier?.name || '', 'Supplier name'),
        };

        if (newErrors.supplier_name.isValid && (formData.supplier?.name || '').length < 4) {
            newErrors.supplier_name = { isValid: false, message: 'Supplier name must be at least 4 characters' };
        }

        // Additional check for material name length
        if (newErrors.name.isValid && formData.name.length < 2) {
            newErrors.name = { isValid: false, message: 'Material name must be at least 2 characters' };
        }

        // Validate optional supplier fields only if filled
        if (formData.supplier?.email && formData.supplier.email.trim() !== '') {
            newErrors.supplier_email = validateEmail(formData.supplier.email);
        }
        if (formData.supplier?.contact && formData.supplier.contact.trim() !== '') {
            newErrors.supplier_contact = validatePhone(formData.supplier.contact);
        }

        setErrors(newErrors);
        return Object.values(newErrors).every(v => v.isValid);
    };

    const handleSubmit = async () => {
        // Validate all fields
        if (!validateForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        try {
            setLoading(true);

            // Only send editable fields, exclude MongoDB internal fields
            const dataToSend = {
                name: formData.name,
                sku: formData.sku,
                category: formData.category,
                unit: formData.unit,
                currentStock: formData.currentStock === '' ? 0 : parseFloat(formData.currentStock as string),
                minimumStock: formData.minimumStock === '' ? 0 : parseFloat(formData.minimumStock as string),
                maximumStock: formData.maximumStock === '' ? 0 : parseFloat(formData.maximumStock as string),
                reorderLevel: formData.reorderLevel === '' ? 0 : parseFloat(formData.reorderLevel as string),
                costPrice: formData.costPrice === '' ? 0 : parseFloat(formData.costPrice as string),
                supplier: formData.supplier,
            };

            if (material?._id) {
                console.log('Calling UPDATE for material ID:', material._id);
                await inventoryAPI.update(material._id, dataToSend);
            } else {
                console.log('Calling CREATE for new material');
                await inventoryAPI.create(dataToSend);
            }

            console.log('Save successful, calling onSave()');
            toast.success('Material saved successfully');
            onSave();
        } catch (err: any) {
            console.error('Save failed:', err);
            toast.error(err.response?.data?.message || 'Failed to save material');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {material ? 'Edit Raw Material' : 'Add Raw Material'}
                </Typography>
                <IconButton
                    onClick={onClose}
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
            <DialogContent sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}>
                {material && (
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                            <Tab label="General Info" />
                            <Tab label="Action History" />
                        </Tabs>
                    </Box>
                )}

                {tabValue === 0 && (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Name"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                onBlur={() => handleBlur('name')}
                                error={hasError(errors.name)}
                                helperText={getHelperText(errors.name)}
                                required
                            />
                        </Grid>
                        {/* <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="SKU"
                                value={formData.sku}
                                onChange={(e) => handleChange('sku', e.target.value)}
                                onBlur={() => handleBlur('sku')}
                                error={hasError(errors.sku)}
                                helperText={getHelperText(errors.sku) || "Leave empty to auto-generate"}
                                placeholder="Auto-generated"
                            />
                        </Grid> */}

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Unit</InputLabel>
                                <Select
                                    value={formData.unit}
                                    label="Unit"
                                    onChange={(e) => handleChange('unit', e.target.value)}
                                >
                                    {units.map((unit) => (
                                        <MenuItem key={unit.value} value={unit.value}>
                                            {unit.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Current Stock"
                                type="number"
                                value={formData.currentStock}
                                onChange={(e) => handleNumberFieldChange('currentStock', e.target.value)}
                                onBlur={() => handleBlur('currentStock')}
                                error={hasError(errors.currentStock)}
                                helperText={getHelperText(errors.currentStock)}
                                inputProps={{ min: 0, step: "any" }}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">{formData.unit}</InputAdornment>,
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Minimum Stock"
                                type="number"
                                value={formData.minimumStock}
                                onChange={(e) => handleNumberFieldChange('minimumStock', e.target.value)}
                                onBlur={() => handleBlur('minimumStock')}
                                error={hasError(errors.minimumStock)}
                                helperText={getHelperText(errors.minimumStock)}
                                inputProps={{ min: 0, step: "any" }}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">{formData.unit}</InputAdornment>,
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Maximum Stock"
                                type="number"
                                value={formData.maximumStock}
                                onChange={(e) => handleNumberFieldChange('maximumStock', e.target.value)}
                                onBlur={() => handleBlur('maximumStock')}
                                error={hasError(errors.maximumStock)}
                                helperText={getHelperText(errors.maximumStock)}
                                inputProps={{ min: 0, step: "any" }}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">{formData.unit}</InputAdornment>,
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Reorder Level"
                                type="number"
                                value={formData.reorderLevel}
                                onChange={(e) => handleNumberFieldChange('reorderLevel', e.target.value)}
                                onBlur={() => handleBlur('reorderLevel')}
                                error={hasError(errors.reorderLevel)}
                                helperText={getHelperText(errors.reorderLevel) || "Alert when stock falls below"}
                                inputProps={{ min: 0, step: "any" }}
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">{formData.unit}</InputAdornment>,
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Cost Price"
                                type="number"
                                value={formData.costPrice}
                                onChange={(e) => handleNumberFieldChange('costPrice', e.target.value)}
                                onBlur={() => handleBlur('costPrice')}
                                error={hasError(errors.costPrice)}
                                helperText={getHelperText(errors.costPrice)}
                                inputProps={{ min: 0, step: "any" }}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">{settings.restaurant.currencySymbol}</InputAdornment>,
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Autocomplete
                                options={vendors}
                                getOptionLabel={(option) => option.name}
                                value={selectedVendor}
                                loading={loadingVendors}
                                onChange={(_, newValue) => {
                                    setSelectedVendor(newValue);
                                    if (newValue) {
                                        // Auto-fill supplier info from vendor
                                        setFormData(prev => ({
                                            ...prev,
                                            supplier: {
                                                name: newValue.name,
                                                contact: newValue.contact || '',
                                                email: newValue.email || '',
                                                address: newValue.address || '',
                                            }
                                        }));
                                    } else {
                                        // Clear supplier info
                                        setFormData(prev => ({
                                            ...prev,
                                            supplier: {
                                                name: '',
                                                contact: '',
                                                email: '',
                                                address: '',
                                            }
                                        }));
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Select Vendor/Supplier"
                                        required
                                        error={hasError(errors.supplier_name)}
                                        helperText={getHelperText(errors.supplier_name) || "Select from your vendor list"}
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {loadingVendors ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                                isOptionEqualToValue={(option, value) => option._id === value._id}
                                noOptionsText={loadingVendors ? "Loading vendors..." : "No vendors found. Add vendors in Vendors page."}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Supplier Contact"
                                value={formData.supplier?.contact || ''}
                                onChange={(e) => handleSupplierChange('contact', e.target.value)}
                                onBlur={() => handleBlur('supplier_contact')}
                                error={hasError(errors.supplier_contact)}
                                helperText={getHelperText(errors.supplier_contact) || "Auto-filled from vendor (editable)"}
                                inputProps={{ maxLength: 10 }}
                                disabled={!selectedVendor}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Supplier Email"
                                type="email"
                                value={formData.supplier?.email || ''}
                                onChange={(e) => handleSupplierChange('email', e.target.value)}
                                onBlur={() => handleBlur('supplier_email')}
                                error={hasError(errors.supplier_email)}
                                helperText="Auto-filled from vendor (editable)"
                                disabled={!selectedVendor}
                            />
                        </Grid>

                        {material && (
                            <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                                <Typography variant="overline" color="text.secondary" fontWeight="bold">System Info</Typography>
                                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="text.secondary" display="block">Created By</Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                            {(material as any).createdBy ? `${(material as any).createdBy.firstName} ${(material as any).createdBy.lastName}` : 'System'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date((material as any).createdAt).toLocaleString()}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="text.secondary" display="block">Last Modified By</Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                            {(material as any).updatedBy ? `${(material as any).updatedBy.firstName} ${(material as any).updatedBy.lastName}` : (material.actionHistory?.[0]?.performedBy || 'System')}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date((material as any).updatedAt || (material as any).createdAt).toLocaleString()}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}
                    </Grid>
                )}

                {tabValue === 1 && material && (
                    <Box mt={2}>
                        <ActionHistoryList history={material.actionHistory || []} emptyMessage="No history for this material." />
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default React.memo(RawMaterialDialog);
