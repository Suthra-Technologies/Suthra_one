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
    FormControlLabel,
    Checkbox,
    Chip,
    Divider,
    Stack,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid2';
import { Edit as EditIcon, Add as AddIcon, Delete as DeleteIcon, Close as CloseIcon } from '@mui/icons-material';
import { superAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { CardGridSkeleton } from '../../components/common/PageSkeleton';

const MODULES: { key: string; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'orders', label: 'Orders' },
    { key: 'pos', label: 'Point of Sale' },
    { key: 'tables', label: 'Tables' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'kitchen', label: 'Kitchen (Display & Orders)' },
    { key: 'menu', label: 'Menu' },
    { key: 'globaladdons', label: 'Global Add-ons' },
    { key: 'promocoupons', label: 'Promo Code & Coupons' },
    { key: 'disputes', label: 'Disputes' },
    { key: 'catering', label: 'Catering' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'wastemanagement', label: 'Waste Management' },
    { key: 'purchaseorders', label: 'Purchase Orders' },
    { key: 'vendors', label: 'Vendors' },
    { key: 'materialproviders', label: 'Material Providers' },
    { key: 'recipes', label: 'Recipes' },
    { key: 'users', label: 'Users' },
    { key: 'customers', label: 'Customers' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'assets', label: 'Asset & Document Management' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'customisescreens', label: 'Customise Screens' },
    { key: 'reports', label: 'Reports' },
    { key: 'serviceusage', label: 'Service Usage' },
    { key: 'customeractivities', label: 'Customer Activities' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'auditlogs', label: 'Audit Logs' },
    { key: 'subscription', label: 'Subscription' },
    { key: 'support', label: 'Super Admin Support' },
    { key: 'customersupport', label: 'Customer Tickets' },
    { key: 'settings', label: 'Settings' },
    { key: 'managenotifications', label: 'Manage Notifications' },
];
// Legacy plans stored a single bundled "core" feature. Before the module-level split,
// every one of these pages was ungated (open to any admin/manager), so a legacy "core"
// plan must keep unlocking all of them to avoid regressing access. Catering, Inventory,
// Waste Management and Attendance are excluded — they were already independently gated.
const CORE_FEATURES = [
    'dashboard', 'orders', 'pos', 'tables', 'bookings', 'kitchen', 'menu', 'globaladdons',
    'promocoupons', 'disputes', 'purchaseorders', 'vendors', 'materialproviders', 'recipes',
    'users', 'customers', 'assets', 'expenses', 'customisescreens', 'reports', 'serviceusage',
    'customeractivities', 'invoices', 'auditlogs', 'subscription', 'support', 'customersupport',
    'settings', 'managenotifications',
];

interface SubscriptionPlan {
    _id: string;
    name: string;
    price: number;
    interval: 'monthly' | 'yearly' | 'one-time';
    type: 'subscription' | 'topup';
    resourceType?: 'email' | 'sms' | 'orders' | 'none';
    resourceCount?: number;
    features: string[];
    maxUsers?: number;
    maxTables?: number;
    maxOrders?: number;
    maxSms?: number;
    maxEmail?: number;
    isActive: boolean;
    stripePriceId?: string;
}

const PlansPage: React.FC = () => {
    const theme = useTheme();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        interval: 'monthly' as 'monthly' | 'yearly' | 'one-time',
        type: 'subscription' as 'subscription' | 'topup',
        resourceType: 'none' as 'email' | 'sms' | 'orders' | 'none',
        resourceCount: 0,
        features: '',
        maxUsers: 10,
        maxTables: 20,
        maxOrders: 1000,
        maxSms: 0,
        maxEmail: 0,
        isActive: true,
        modules: [] as string[],
        isLegacyCore: false,
    });

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const response = await superAPI.listPlans();
            setPlans(response.data);
        } catch (error) {
            console.error('Error fetching plans:', error);
            toast.error('Failed to load subscription plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleOpenDialog = (plan?: SubscriptionPlan, defaultType: 'subscription' | 'topup' = 'subscription') => {
        if (plan) {
            setEditingPlan(plan);
            const moduleKeys = new Set(MODULES.map(m => m.key));
            const otherFeatures = plan.features.filter(f => !moduleKeys.has(f) && f !== 'core').join('\n');
            // Legacy plans stored a single bundled "core" feature - expand it into the split modules.
            const modules = plan.features.includes('core')
                ? Array.from(new Set([...plan.features.filter(f => moduleKeys.has(f)), ...CORE_FEATURES]))
                : plan.features.filter(f => moduleKeys.has(f));

            setFormData({
                name: plan.name,
                price: plan.price,
                interval: plan.interval as any,
                type: plan.type || 'subscription',
                resourceType: plan.resourceType || 'none',
                resourceCount: plan.resourceCount || 0,
                features: otherFeatures,
                maxUsers: plan.maxUsers || 10,
                maxTables: plan.maxTables || 20,
                maxOrders: plan.maxOrders || 1000,
                maxSms: plan.maxSms || 0,
                maxEmail: plan.maxEmail || 0,
                isActive: plan.isActive,
                modules,
                isLegacyCore: plan.features.includes('core'),
            });
        } else {
            setEditingPlan(null);
            setFormData({
                name: '',
                price: 0,
                interval: defaultType === 'topup' ? 'one-time' : 'monthly',
                type: defaultType,
                resourceType: 'none',
                resourceCount: 0,
                features: '',
                maxUsers: 10,
                maxTables: 20,
                maxOrders: 1000,
                maxSms: 0,
                maxEmail: 0,
                isActive: true,
                modules: [],
                isLegacyCore: false,
            });
        }
        setDialogOpen(true);
    };

    const toggleModule = (key: string) => {
        setFormData(prev => ({
            ...prev,
            // Any explicit module edit opts this plan into the granular model going forward.
            isLegacyCore: false,
            modules: prev.modules.includes(key)
                ? prev.modules.filter(m => m !== key)
                : [...prev.modules, key],
        }));
    };

    const isFormValid = formData.name.trim() !== '' && formData.price >= 0;

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingPlan(null);
    };

    const handleSave = async () => {
        if (!isFormValid) {
            toast.error('Please fill all required fields');
            return;
        }
        try {
            // Untouched legacy plans keep their bundled "core" feature as-is, so editing
            // unrelated fields (price, limits, etc.) doesn't silently migrate their module model.
            const featuresList = formData.isLegacyCore
                ? [...formData.features.split('\n').filter(f => f.trim()), 'core', ...formData.modules.filter(m => !CORE_FEATURES.includes(m))]
                : [...formData.features.split('\n').filter(f => f.trim()), ...formData.modules];

            const planData = {
                ...formData,
                features: featuresList,
            };
            // Remove auxiliary fields before sending to API.
            delete (planData as any).modules;
            delete (planData as any).isLegacyCore;

            if (editingPlan) {
                await superAPI.updatePlan(editingPlan._id, planData);
                toast.success('Plan updated successfully');
            } else {
                await superAPI.createPlan(planData);
                toast.success('Plan created successfully');
            }

            handleCloseDialog();
            fetchPlans();
        } catch (error) {
            console.error('Error saving plan:', error);
            toast.error('Failed to save plan');
        }
    };

    const handleDelete = (planId: string) => {
        setPlanToDelete(planId);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!planToDelete) return;

        try {
            await superAPI.deletePlan(planToDelete);
            toast.success('Plan deleted successfully');
            fetchPlans();
        } catch (error) {
            console.error('Error deleting plan:', error);
            toast.error('Failed to delete plan');
        } finally {
            setDeleteDialogOpen(false);
            setPlanToDelete(null);
        }
    };

    const renderPlanCard = (plan: SubscriptionPlan) => (
        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={plan._id}>
            <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                        <Typography variant="h5" gutterBottom>
                            {plan.name}
                        </Typography>
                        <Typography variant="h4" color="primary" gutterBottom>
                            ${Number(plan.price || 0).toFixed(2)}
                            <Typography component="span" variant="body2" color="text.secondary">
                                /{plan.type === 'topup' ? 'one-time' : plan.interval}
                            </Typography>
                        </Typography>
                        {plan.type !== 'topup' && (
                            <Typography
                                component="span"
                                variant="body2"
                                sx={{ ml: 1, color: "success.main", fontWeight: "bold" }}
                            >
                                • Save 25%
                            </Typography>
                        )}
                    </Box>
                    <Box>
                        <IconButton size="small" onClick={() => handleOpenDialog(plan)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(plan._id)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                        label={plan.isActive ? 'Active' : 'Inactive'}
                        color={plan.isActive ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                    />
                    <Chip
                        label={plan.type === 'topup' ? 'Top-up' : 'Subscription'}
                        color={plan.type === 'topup' ? 'secondary' : 'primary'}
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 600 }}
                    />
                </Stack>

                {plan.type === 'topup' && (
                    <Box sx={{ mb: 2, p: 1.5, bgcolor: alpha(theme.palette.secondary.main, 0.05), borderRadius: 2, border: '1px dashed', borderColor: 'secondary.main' }}>
                        <Typography variant="subtitle2" color="secondary.main" fontWeight="bold">
                            Resource Credit:
                        </Typography>
                        <Typography variant="body1" fontWeight={800}>
                            {plan.resourceCount?.toLocaleString()} {plan.resourceType?.toUpperCase()} Credits
                        </Typography>
                    </Box>
                )}

                {plan.type !== 'topup' && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Limits:
                        </Typography>
                        <Typography variant="body2">• Max Users: {plan.maxUsers || 'Unlimited'}</Typography>
                        <Typography variant="body2">• Max Tables: {plan.maxTables || 'Unlimited'}</Typography>
                        <Typography variant="body2">• Max Orders/month: {plan.maxOrders || 'Unlimited'}</Typography>
                        <Typography variant="body2">• Max SMS/month: {plan.maxSms || 'Unlimited'}</Typography>
                        <Typography variant="body2">• Max Emails/month: {plan.maxEmail || 'Unlimited'}</Typography>
                    </Box>
                )}

                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Features:
                    </Typography>
                    {plan.features.map((feature, index) => {
                        const featureLabels: Record<string, string> = {
                            ...Object.fromEntries(MODULES.map(m => [m.key, m.label])),
                            core: 'Core Restaurant Operations (legacy: Dashboard, Orders, POS, Tables, Bookings, Kitchen, Promo/Coupons, Disputes)',
                        };
                        return (
                            <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                                ✓ {featureLabels[feature] || feature}
                            </Typography>
                        );
                    })}
                </Box>
            </Paper>
        </Grid>
    );

    return (
        <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: { xs: 1.5, sm: 3 }, pt: { xs: 0.5, sm: 3 } }}>
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                gap: { xs: 2, sm: 0 }
            }}>
                <Typography
                    variant="h4"
                    gutterBottom
                    sx={{
                        textAlign: { xs: 'center', sm: 'left' },
                        width: { xs: '100%', sm: 'auto' },
                        fontSize: { xs: '1.75rem', sm: '2.125rem' },
                        whiteSpace: 'nowrap'
                    }}
                >
                    Subscription Plans
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog(undefined, 'topup')}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                        Create Top-Up
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog(undefined, 'subscription')}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                        Create Subscription
                    </Button>
                </Box>
            </Box>

            {loading ? (
                <CardGridSkeleton count={6} cardHeight={280} />
            ) : (
                <>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Subscription Plans</Typography>
                    {plans.filter(p => p.type !== 'topup').length === 0 ? (
                        <Typography color="text.secondary" sx={{ mb: 4 }}>No subscription plans found.</Typography>
                    ) : (
                        <Grid container spacing={3} sx={{ mb: 5 }}>
                            {plans.filter(p => p.type !== 'topup').map((plan) => renderPlanCard(plan))}
                        </Grid>
                    )}

                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Top-Up Plans</Typography>
                    {plans.filter(p => p.type === 'topup').length === 0 ? (
                        <Typography color="text.secondary" sx={{ mb: 4 }}>No top-up plans found.</Typography>
                    ) : (
                        <Grid container spacing={3} sx={{ mb: 4 }}>
                            {plans.filter(p => p.type === 'topup').map((plan) => renderPlanCard(plan))}
                        </Grid>
                    )}
                </>
            )}

            {/* Create/Edit Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        mt: { xs: 10, sm: 'auto' },
                        mb: { xs: 4, sm: 'auto' }
                    },
                    '& .MuiFormLabel-asterisk': {
                        color: 'error.main'
                    }
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                    <IconButton
                        onClick={handleCloseDialog}
                        size="small"
                        sx={{
                            backgroundColor: 'error.main',
                            color: 'white',
                            width: 24,
                            height: 24,
                            '&:hover': {
                                backgroundColor: 'error.dark',
                            },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Plan Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            fullWidth
                            required
                        />

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    label="Price"
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setFormData({ ...formData, price: isNaN(val) ? 0 : (val < 0 ? 0 : val) });
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    fullWidth
                                    required
                                    inputProps={{ min: 0, step: "0.01" }}
                                />
                            </Grid>
                            
                            {formData.type === 'subscription' && (
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        label="Interval"
                                        select
                                        value={formData.interval}
                                        onChange={(e) => setFormData({ ...formData, interval: e.target.value as any })}
                                        fullWidth
                                        SelectProps={{ native: true }}
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                        <option value="one-time">One-Time</option>
                                    </TextField>
                                </Grid>
                            )}
                        </Grid>

                        {formData.type === 'topup' && (
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        select
                                        label="Resource Type"
                                        value={formData.resourceType}
                                        onChange={(e) => setFormData({ ...formData, resourceType: e.target.value as any })}
                                        fullWidth
                                        SelectProps={{ native: true }}
                                    >
                                        <option value="none">None</option>
                                        <option value="email">Email</option>
                                        <option value="sms">SMS</option>
                                        <option value="orders">Orders</option>
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <TextField
                                        label="Resource Count"
                                        type="number"
                                        value={formData.resourceCount}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setFormData({ ...formData, resourceCount: isNaN(val) ? 0 : (val < 0 ? 0 : val) });
                                        }}
                                        onFocus={(e) => e.target.select()}
                                        fullWidth
                                        inputProps={{ min: 0 }}
                                    />
                                </Grid>
                            </Grid>
                        )}

                        {formData.type === 'subscription' && (
                            <>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            label="Max Users"
                                            type="number"
                                            value={formData.maxUsers}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setFormData({ ...formData, maxUsers: isNaN(val) ? 0 : (val < 0 ? 0 : val) });
                                            }}
                                            onFocus={(e) => e.target.select()}
                                            fullWidth
                                            inputProps={{ min: 0 }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            label="Max Tables"
                                            type="number"
                                            value={formData.maxTables}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setFormData({ ...formData, maxTables: isNaN(val) ? 0 : (val < 0 ? 0 : val) });
                                            }}
                                            onFocus={(e) => e.target.select()}
                                            fullWidth
                                            inputProps={{ min: 0 }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            label="Max Orders / Month"
                                            type="number"
                                            value={formData.maxOrders}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setFormData({ ...formData, maxOrders: isNaN(val) ? 0 : (val < 0 ? 0 : val) });
                                            }}
                                            onFocus={(e) => e.target.select()}
                                            fullWidth
                                            inputProps={{ min: 0 }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            label="Max SMS / Month"
                                            type="number"
                                            value={formData.maxSms}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setFormData({ ...formData, maxSms: isNaN(val) ? 0 : (val < 0 ? 0 : val) });
                                            }}
                                            onFocus={(e) => e.target.select()}
                                            fullWidth
                                            inputProps={{ min: 0 }}
                                            helperText="0 = unlimited"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <TextField
                                            label="Max Emails / Month"
                                            type="number"
                                            value={formData.maxEmail}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setFormData({ ...formData, maxEmail: isNaN(val) ? 0 : (val < 0 ? 0 : val) });
                                            }}
                                            onFocus={(e) => e.target.select()}
                                            fullWidth
                                            inputProps={{ min: 0 }}
                                            helperText="0 = unlimited"
                                        />
                                    </Grid>
                                </Grid>
                                
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="subtitle2" color="primary">Modules</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Select exactly which modules this plan grants access to.
                                </Typography>
                                <Grid container spacing={1}>
                                    {MODULES.map((mod) => (
                                        <Grid size={{ xs: 12, sm: 6 }} key={mod.key}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={formData.modules.includes(mod.key)}
                                                        onChange={() => toggleModule(mod.key)}
                                                    />
                                                }
                                                label={mod.label}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" disabled={!isFormValid}>
                        {editingPlan ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this plan?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={confirmDelete} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PlansPage;
