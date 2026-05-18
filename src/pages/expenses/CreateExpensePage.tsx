import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    TextField,
    MenuItem,
    Stack,
    Grid,
    IconButton,
    Divider,
    alpha,
    useTheme,
    Card,
    CardContent,
    FormControlLabel,
    Switch,
    InputAdornment,
    ToggleButton,
    ToggleButtonGroup,
    Autocomplete,
    createFilterOptions
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Save as SaveIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Payments as PaymentIcon,
    Receipt as ReceiptIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { expensesAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';
import { addDays, addMonths, addYears, format } from 'date-fns';
import { useSettings } from '../../context/SettingsContext';
import { settingsAPI } from '../../services/api';

const CreateExpensePage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const { settings, refreshSettings } = useSettings();
    const [loading, setLoading] = useState(false);
    const [isEdit, setIsEdit] = useState(false);

    const [formData, setFormData] = useState({
        type: 'one_time',
        category: 'other',
        amount: 0,
        payee: { name: '', type: 'organization' },
        dueDate: '',
        frequency: 1,
        frequencyUnit: 'months',
        notes: '',
        payments: [] as any[]
    });

    const [suggestions, setSuggestions] = useState<{ payees: string[], categories: string[] }>({ 
        payees: settings.restaurant.expensePayees || [], 
        categories: settings.restaurant.expenseCategories || ['salaries', 'rent', 'utilities', 'maintenance', 'supplies', 'marketing', 'other'] 
    });

    useEffect(() => {
        if (settings.restaurant) {
            setSuggestions({
                payees: settings.restaurant.expensePayees || [],
                categories: settings.restaurant.expenseCategories || ['salaries', 'rent', 'utilities', 'maintenance', 'supplies', 'marketing', 'other']
            });
        }
    }, [settings.restaurant]);

    // Fetch suggestions from existing expenses too if needed, but merge them
    useEffect(() => {
        const fetchExistingSuggestions = async () => {
            try {
                const res = await expensesAPI.getSuggestions();
                const existing = res.data.data;
                setSuggestions(prev => ({
                    categories: [...new Set([...prev.categories, ...(existing.categories || [])])],
                    payees: [...new Set([...prev.payees, ...(existing.payees || [])])]
                }));
            } catch (error) {
                console.error('Failed to fetch suggestions', error);
            }
        };
        fetchExistingSuggestions();
    }, []);

    // Auto-calculate Due Date for recurring expenses
    useEffect(() => {
        if (formData.type === 'recurring' && formData.frequency > 0 && formData.frequencyUnit) {
            const today = new Date();
            let nextDate: Date;
            
            switch (formData.frequencyUnit) {
                case 'days': nextDate = addDays(today, formData.frequency); break;
                case 'months': nextDate = addMonths(today, formData.frequency); break;
                case 'years': nextDate = addYears(today, formData.frequency); break;
                default: nextDate = today;
            }
            
            setFormData(prev => ({ ...prev, dueDate: format(nextDate, 'yyyy-MM-dd') }));
        }
    }, [formData.type, formData.frequency, formData.frequencyUnit]);

    useEffect(() => {
        if (id) {
            setIsEdit(true);
            fetchExpenseDetails();
        }
    }, [id]);

    const fetchExpenseDetails = async () => {
        setLoading(true);
        try {
            const res = await expensesAPI.getOne(id!);
            const data = res.data.data;
            setFormData({
                type: data.type,
                category: data.category,
                amount: data.amount,
                payee: data.payee,
                dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '',
                frequency: data.frequency || 1,
                frequencyUnit: data.frequencyUnit || 'months',
                notes: data.notes || '',
                payments: data.payments || []
            });
        } catch (error) {
            toast.error('Failed to load expense details');
            navigate('..');
        } finally {
            setLoading(false);
        }
    };

    const categories = suggestions.categories;
    const paymentMethods = ['cash', 'card', /* 'upi', */ 'bank_transfer', 'cheque'];


    const totalPaid = formData.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        if (loading) return;
        e.preventDefault();
        
        if (totalPaid > formData.amount) {
            toast.error('Total payments cannot exceed expense amount');
            return;
        }

        setLoading(true);
        try {
            const dataToSave = { ...formData };
            // Remove sensitive/system fields
            delete (dataToSave as any)._id;
            delete (dataToSave as any).tenant;
            delete (dataToSave as any).createdBy;
            delete (dataToSave as any).updatedBy;
            delete (dataToSave as any).__v;

            if (isEdit) {
                await expensesAPI.update(id!, dataToSave);
                toast.success('Expense updated successfully');
            } else {
                await expensesAPI.create(dataToSave);
                toast.success('Expense recorded successfully');
            }
            navigate('/mythri/expenses');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '100%', mx: 0 }}>
            <Button startIcon={<BackIcon />} onClick={() => navigate('/mythri/expenses')} sx={{ mb: 2 }}>Back to List</Button>
            
            <Typography variant="h4" fontWeight={900} mb={0.5}>{isEdit ? 'Edit Expense' : 'Record New Expense'}</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                {isEdit ? 'Modify the details of this expenditure.' : 'Enter the details of your operational expenditure below.'}
            </Typography>

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    {/* Basic Info */}
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
                            <Typography variant="h6" fontWeight="bold" mb={3} display="flex" alignItems="center">
                                <ReceiptIcon sx={{ mr: 1, color: 'primary.main' }} /> Basic Information
                            </Typography>
                            
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Expense Type</Typography>
                                    <ToggleButtonGroup
                                        value={formData.type}
                                        exclusive
                                        onChange={(_e, val) => val && setFormData({ ...formData, type: val })}
                                        fullWidth
                                        size="small"
                                        color="primary"
                                    >
                                        <ToggleButton value="one_time" sx={{ py: 1 }}>One-Time</ToggleButton>
                                        <ToggleButton value="recurring" sx={{ py: 1 }}>Recurring</ToggleButton>
                                    </ToggleButtonGroup>
                                </Grid>
                                
                                {formData.type === 'recurring' && (
                                    <>
                                        <Grid item xs={12} sm={3}>
                                            <TextField
                                                fullWidth
                                                type="number"
                                                label="Frequency"
                                                value={formData.frequency}
                                                onChange={(e) => setFormData({ ...formData, frequency: Number(e.target.value) })}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={3}>
                                            <TextField
                                                select
                                                fullWidth
                                                label="Unit"
                                                value={formData.frequencyUnit}
                                                onChange={(e) => setFormData({ ...formData, frequencyUnit: e.target.value })}
                                            >
                                                <MenuItem value="days">Days</MenuItem>
                                                <MenuItem value="months">Months</MenuItem>
                                                <MenuItem value="years">Years</MenuItem>
                                            </TextField>
                                        </Grid>
                                    </>
                                )}

                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                                        <Autocomplete
                                            freeSolo
                                            fullWidth
                                            options={[...new Set([...categories, ...suggestions.categories])]}
                                            value={formData.category}
                                            onChange={(_e, val) => setFormData({ ...formData, category: val || '' })}
                                            onInputChange={(_e, val) => setFormData({ ...formData, category: val })}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderTopRightRadius: 0,
                                                    borderBottomRightRadius: 0,
                                                },
                                            }}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Category"
                                                    placeholder="Select or type category"
                                                    required
                                                />
                                            )}
                                            renderOption={(props, option) => (
                                                <Box component="li" {...props} sx={{ display: 'flex !important', justifyContent: 'space-between !important', alignItems: 'center !important', width: '100%' }}>
                                                    <Typography variant="body2">{option}</Typography>
                                                    {suggestions.categories.includes(option) && (
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const updatedCategories = suggestions.categories.filter(c => c !== option);
                                                                setSuggestions(prev => ({
                                                                    ...prev,
                                                                    categories: updatedCategories
                                                                }));
                                                                
                                                                try {
                                                                    await settingsAPI.update('restaurant', {
                                                                        ...settings.restaurant,
                                                                        expenseCategories: updatedCategories
                                                                    });
                                                                    await refreshSettings();
                                                                    toast.success(`Removed "${option}" from categories`);
                                                                } catch (err) {
                                                                    console.error('Failed to persist category deletion', err);
                                                                    toast.error('Removed locally but failed to save to database');
                                                                }
                                                            }}
                                                        >
                                                            <DeleteIcon sx={{ fontSize: 18 }} color="error" />
                                                        </IconButton>
                                                    )}
                                                </Box>
                                            )}
                                        />
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            sx={{
                                                borderTopLeftRadius: 0,
                                                borderBottomLeftRadius: 0,
                                                minWidth: '56px',
                                                boxShadow: 'none',
                                                '&:hover': { boxShadow: 'none' }
                                            }}
                                            onClick={async () => {
                                                const val = formData.category.trim();
                                                if (val && !suggestions.categories.includes(val)) {
                                                    const updatedCategories = [val, ...suggestions.categories];
                                                    setSuggestions(prev => ({
                                                        ...prev,
                                                        categories: updatedCategories
                                                    }));

                                                    try {
                                                        await settingsAPI.update('restaurant', {
                                                            ...settings.restaurant,
                                                            expenseCategories: updatedCategories
                                                        });
                                                        await refreshSettings();
                                                        toast.success(`Added "${val}" to categories`);
                                                    } catch (err) {
                                                        console.error('Failed to persist new category', err);
                                                        toast.error('Added locally but failed to save to database');
                                                    }
                                                }
                                            }}
                                        >
                                            <AddIcon />
                                        </Button>
                                    </Box>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Total Amount"
                                        required
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type="date"
                                        label="Due Date"
                                        InputLabelProps={{ shrink: true }}
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>

                        <Paper sx={{ p: 3, borderRadius: 4 }}>
                            <Typography variant="h6" fontWeight="bold" mb={3}>Payee Details</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Payee Type"
                                        value={formData.payee.type}
                                        onChange={(e) => setFormData({ ...formData, payee: { ...formData.payee, type: e.target.value as any } })}
                                    >
                                        <MenuItem value="organization">Organization</MenuItem>
                                        <MenuItem value="person">Person</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={8}>
                                    <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                                        <Autocomplete
                                            freeSolo
                                            fullWidth
                                            options={suggestions.payees}
                                            value={formData.payee.name}
                                            onChange={(_e, val) => setFormData({ ...formData, payee: { ...formData.payee, name: val || '' } })}
                                            onInputChange={(_e, val) => setFormData({ ...formData, payee: { ...formData.payee, name: val } })}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderTopRightRadius: 0,
                                                    borderBottomRightRadius: 0,
                                                },
                                            }}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    required
                                                    label="Payee Name"
                                                    placeholder="Select or type payee"
                                                />
                                            )}
                                            renderOption={(props, option) => (
                                                <Box component="li" {...props} sx={{ display: 'flex !important', justifyContent: 'space-between !important', alignItems: 'center !important', width: '100%' }}>
                                                    <Typography variant="body2">{option}</Typography>
                                                    {suggestions.payees.includes(option) && (
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const updatedPayees = suggestions.payees.filter(p => p !== option);
                                                                setSuggestions(prev => ({
                                                                    ...prev,
                                                                    payees: updatedPayees
                                                                }));
                                                                
                                                                try {
                                                                    await settingsAPI.update('restaurant', {
                                                                        ...settings.restaurant,
                                                                        expensePayees: updatedPayees
                                                                    });
                                                                    await refreshSettings();
                                                                    toast.success(`Removed "${option}" from payees`);
                                                                } catch (err) {
                                                                    console.error('Failed to persist payee deletion', err);
                                                                    toast.error('Removed locally but failed to save to database');
                                                                }
                                                            }}
                                                        >
                                                            <DeleteIcon sx={{ fontSize: 18 }} color="error" />
                                                        </IconButton>
                                                    )}
                                                </Box>
                                            )}
                                        />
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            sx={{
                                                borderTopLeftRadius: 0,
                                                borderBottomLeftRadius: 0,
                                                minWidth: '56px',
                                                boxShadow: 'none',
                                                '&:hover': { boxShadow: 'none' }
                                            }}
                                            onClick={async () => {
                                                const val = formData.payee.name.trim();
                                                if (val && !suggestions.payees.includes(val)) {
                                                    const updatedPayees = [val, ...suggestions.payees];
                                                    setSuggestions(prev => ({
                                                        ...prev,
                                                        payees: updatedPayees
                                                    }));

                                                    try {
                                                        await settingsAPI.update('restaurant', {
                                                            ...settings.restaurant,
                                                            expensePayees: updatedPayees
                                                        });
                                                        await refreshSettings();
                                                        toast.success(`Added "${val}" to payees`);
                                                    } catch (err) {
                                                        console.error('Failed to persist new payee', err);
                                                        toast.error('Added locally but failed to save to database');
                                                    }
                                                }
                                            }}
                                        >
                                            <AddIcon />
                                        </Button>
                                    </Box>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        label="Notes"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* Split Payments */}
                    <Grid item xs={12} md={5}>
                        <Paper sx={{ p: 3, borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h6" fontWeight="bold" display="flex" alignItems="center">
                                    <PaymentIcon sx={{ mr: 1, color: 'success.main' }} /> Payments
                                </Typography>
                            </Box>

                            <Box sx={{ flexGrow: 1, mb: 3 }}>
                                <Typography variant="subtitle2" color="text.secondary" mb={1}>Select Payment Methods & Amounts</Typography>
                                {formData.amount <= 0 && (
                                    <Typography variant="caption" color="error" sx={{ mb: 2, display: 'block' }}>
                                        Please enter Total Amount first to enable payments.
                                    </Typography>
                                )}
                                <Stack spacing={2}>
                                    {paymentMethods.map((method) => {
                                        const activePayment = formData.payments.find(p => p.method === method);
                                        const isActive = !!activePayment;
                                        const isFullyPaid = totalPaid >= formData.amount && formData.amount > 0;
                                        const isDisabled = formData.amount <= 0 || (isFullyPaid && !isActive);

                                        const handleToggle = () => {
                                            if (isDisabled) return;
                                            if (isActive) {
                                                const newPayments = formData.payments.filter(p => p.method !== method);
                                                setFormData({ ...formData, payments: newPayments });
                                            } else {
                                                const remaining = formData.amount - totalPaid;
                                                const newPayment = {
                                                    method,
                                                    amount: Math.max(0, remaining),
                                                    date: new Date().toISOString().split('T')[0]
                                                };
                                                setFormData({ ...formData, payments: [...formData.payments, newPayment] });
                                            }
                                        };

                                        const handleLocalAmountChange = (val: number) => {
                                            const newPayments = [...formData.payments];
                                            const idx = newPayments.findIndex(p => p.method === method);
                                            if (idx !== -1) {
                                                newPayments[idx].amount = val;
                                                
                                                // Autofill logic for the "next" active payment if needed
                                                const otherActiveIndices = newPayments
                                                    .map((p, i) => ({ method: p.method, index: i }))
                                                    .filter(p => p.method !== method);
                                                
                                                if (otherActiveIndices.length > 0) {
                                                    const currentMethodIdx = paymentMethods.indexOf(method);
                                                    const nextMethod = paymentMethods.slice(currentMethodIdx + 1).find(m => newPayments.some(p => p.method === m));
                                                    
                                                    if (nextMethod) {
                                                        const nextIdx = newPayments.findIndex(p => p.method === nextMethod);
                                                        const totalExcludingNext = newPayments.reduce((sum, p, i) => {
                                                            if (i === nextIdx) return sum;
                                                            return sum + Number(p.amount || 0);
                                                        }, 0);
                                                        newPayments[nextIdx].amount = Math.max(0, formData.amount - totalExcludingNext);
                                                    }
                                                }
                                                
                                                setFormData({ ...formData, payments: newPayments });
                                            }
                                        };

                                        return (
                                            <Card 
                                                key={method} 
                                                variant="outlined" 
                                                sx={{ 
                                                    borderRadius: 3, 
                                                    transition: 'all 0.2s',
                                                    opacity: isDisabled ? 0.6 : 1,
                                                    borderColor: isActive ? 'primary.main' : 'divider',
                                                    bgcolor: isActive ? alpha(theme.palette.primary.main, 0.02) : 'transparent',
                                                    cursor: isDisabled ? 'not-allowed' : 'default'
                                                }}
                                            >
                                                <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <FormControlLabel
                                                        control={
                                                            <Switch 
                                                                size="small" 
                                                                checked={isActive} 
                                                                disabled={isDisabled}
                                                                onChange={handleToggle} 
                                                            />
                                                        }
                                                        label={<Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>{method.replace('_', ' ')}</Typography>}
                                                        sx={{ flexGrow: 1, m: 0 }}
                                                    />
                                                    
                                                    {isActive && (
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            placeholder="Amount"
                                                            value={activePayment.amount}
                                                            disabled={formData.amount <= 0}
                                                            onChange={(e) => handleLocalAmountChange(Number(e.target.value))}
                                                            error={totalPaid > formData.amount}
                                                            sx={{ maxWidth: 150 }}
                                                            InputProps={{
                                                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                                                sx: { borderRadius: 2 }
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Card>
                                        );
                                    })}
                                </Stack>
                            </Box>

                            <Divider sx={{ mb: 2 }} />
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                                <Stack direction="row" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">Total Expense:</Typography>
                                    <Typography variant="body2" fontWeight="bold">${formData.amount.toFixed(2)}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">Total Paid:</Typography>
                                    <Typography variant="body2" fontWeight="bold" color="success.main">${totalPaid.toFixed(2)}</Typography>
                                </Stack>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2">Remaining:</Typography>
                                    <Typography variant="body2" fontWeight="bold" color={totalPaid < formData.amount ? 'error.main' : 'success.main'}>
                                        ${(formData.amount - totalPaid).toFixed(2)}
                                    </Typography>
                                </Stack>
                            </Box>

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={loading}
                                startIcon={loading ? null : <SaveIcon />}
                                sx={{ mt: 3, borderRadius: 3, py: 1.5 }}
                            >
                                {loading ? 'Saving...' : 'Save Expense'}
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};

export default CreateExpensePage;
