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
    Switch,
    CircularProgress,
    Chip,
    Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Edit as EditIcon, Add as AddIcon, Delete as DeleteIcon, Close as CloseIcon } from '@mui/icons-material';
import { superAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

interface SubscriptionPlan {
    _id: string;
    name: string;
    price: number;
    interval: 'monthly' | 'yearly';
    features: string[];
    maxUsers?: number;
    maxTables?: number;
    maxOrders?: number;
    isActive: boolean;
    stripePriceId?: string;
}

const PlansPage: React.FC = () => {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        interval: 'monthly' as 'monthly' | 'yearly',
        features: '',
        maxUsers: 10,
        maxTables: 20,
        maxOrders: 1000,
        isActive: true,
        cateringEnabled: false,
        inventoryEnabled: false,
        wasteManagementEnabled: false,
        attendanceEnabled: false,
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

    const handleOpenDialog = (plan?: SubscriptionPlan) => {
        if (plan) {
            setEditingPlan(plan);
            const hasCatering = plan.features.includes('catering');
            const hasInventory = plan.features.includes('inventory');
            const hasWasteManagement = plan.features.includes('wastemanagement');
            const hasAttendance = plan.features.includes('attendance');
            const otherFeatures = plan.features.filter(f => !['catering', 'inventory', 'wastemanagement', 'attendance'].includes(f)).join('\n');

            setFormData({
                name: plan.name,
                price: plan.price,
                interval: plan.interval,
                features: otherFeatures,
                maxUsers: plan.maxUsers || 10,
                maxTables: plan.maxTables || 20,
                maxOrders: plan.maxOrders || 1000,
                isActive: plan.isActive,
                cateringEnabled: hasCatering,
                inventoryEnabled: hasInventory,
                wasteManagementEnabled: hasWasteManagement,
                attendanceEnabled: hasAttendance,
            });
        } else {
            setEditingPlan(null);
            setFormData({
                name: '',
                price: 0,
                interval: 'monthly',
                features: '',
                maxUsers: 10,
                maxTables: 20,
                maxOrders: 1000,
                isActive: true,
                cateringEnabled: false,
                inventoryEnabled: false,
                wasteManagementEnabled: false,
                attendanceEnabled: false,
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingPlan(null);
    };

    const handleSave = async () => {
        try {
            const featuresList = formData.features.split('\n').filter(f => f.trim());
            if (formData.cateringEnabled) {
                featuresList.push('catering');
            }
            if (formData.inventoryEnabled) {
                featuresList.push('inventory');
            }
            if (formData.wasteManagementEnabled) {
                featuresList.push('wastemanagement');
            }
            if (formData.attendanceEnabled) {
                featuresList.push('attendance');
            }

            const planData = {
                ...formData,
                features: featuresList,
            };
            // Remove auxiliary field before sending to API if needed, or API ignores it. 
            // Better to clean it up or strictly type the DTO. 
            delete (planData as any).cateringEnabled;
            delete (planData as any).inventoryEnabled;
            delete (planData as any).wasteManagementEnabled;
            delete (planData as any).attendanceEnabled;

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
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                    Create Plan
                </Button>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {plans.map((plan) => (
                        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={plan._id}>
                            <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                    <Box>
                                        <Typography variant="h5" gutterBottom>
                                            {plan.name}
                                        </Typography>
                                        <Typography variant="h4" color="primary" gutterBottom>
                                            ${plan.price}
                                            <Typography component="span" variant="body2" color="text.secondary">
                                                /{plan.interval}
                                            </Typography>


                                        </Typography>
                                        <Typography
                                            component="span"
                                            variant="body2"
                                            sx={{
                                                ml: 1,
                                                color: "success.main",
                                                fontWeight: "bold"
                                            }}
                                        >
                                            • Save 25%
                                        </Typography>
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

                                <Chip
                                    label={plan.isActive ? 'Active' : 'Inactive'}
                                    color={plan.isActive ? 'success' : 'default'}
                                    size="small"
                                    sx={{ mb: 2, width: 'fit-content' }}
                                />

                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Limits:
                                    </Typography>
                                    <Typography variant="body2">• Max Users: {plan.maxUsers || 'Unlimited'}</Typography>
                                    <Typography variant="body2">• Max Tables: {plan.maxTables || 'Unlimited'}</Typography>
                                    <Typography variant="body2">• Max Orders/month: {plan.maxOrders || 'Unlimited'}</Typography>
                                </Box>

                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Features:
                                    </Typography>
                                    {plan.features.map((feature, index) => (
                                        <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                                            ✓ {feature}
                                        </Typography>
                                    ))}
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
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
                            <Grid size={{ xs: 6 }}>
                                <TextField
                                    label="Price"
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setFormData({ ...formData, price: val < 0 ? 0 : val });
                                    }}
                                    fullWidth
                                    required
                                    inputProps={{ min: 0 }}
                                />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
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
                                </TextField>
                            </Grid>
                        </Grid>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 4 }}>
                                <TextField
                                    label="Max Users"
                                    type="number"
                                    value={formData.maxUsers}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setFormData({ ...formData, maxUsers: val < 0 ? 0 : val });
                                    }}
                                    fullWidth
                                    inputProps={{ min: 0 }}
                                />
                            </Grid>
                            <Grid size={{ xs: 4 }}>
                                <TextField
                                    label="Max Tables"
                                    type="number"
                                    value={formData.maxTables}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setFormData({ ...formData, maxTables: val < 0 ? 0 : val });
                                    }}
                                    fullWidth
                                    inputProps={{ min: 0 }}
                                />
                            </Grid>
                            <Grid size={{ xs: 4 }}>
                                <TextField
                                    label="Max Orders"
                                    type="number"
                                    value={formData.maxOrders}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setFormData({ ...formData, maxOrders: val < 0 ? 0 : val });
                                    }}
                                    fullWidth
                                    inputProps={{ min: 0 }}
                                />
                            </Grid>
                        </Grid>

                        <TextField
                            label="Features (one per line)"
                            multiline
                            rows={6}
                            value={formData.features}
                            onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                            fullWidth
                            placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                            }
                            label="Active"
                        />

                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle2" color="primary">System Modules</Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.cateringEnabled}
                                            onChange={(e) => setFormData({ ...formData, cateringEnabled: e.target.checked })}
                                            color="secondary"
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">Catering Service</Typography>
                                            <Typography variant="caption" color="text.secondary">Enable Catering Management Module</Typography>
                                        </Box>
                                    }
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.inventoryEnabled}
                                            onChange={(e) => setFormData({ ...formData, inventoryEnabled: e.target.checked })}
                                            color="secondary"
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">Inventory</Typography>
                                            <Typography variant="caption" color="text.secondary">Enable Inventory Management Module</Typography>
                                        </Box>
                                    }
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.wasteManagementEnabled}
                                            onChange={(e) => setFormData({ ...formData, wasteManagementEnabled: e.target.checked })}
                                            color="secondary"
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">Waste Management</Typography>
                                            <Typography variant="caption" color="text.secondary">Enable Waste Management Module</Typography>
                                        </Box>
                                    }
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.attendanceEnabled}
                                            onChange={(e) => setFormData({ ...formData, attendanceEnabled: e.target.checked })}
                                            color="secondary"
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">Attendance</Typography>
                                            <Typography variant="caption" color="text.secondary">Enable Staff Attendance Module</Typography>
                                        </Box>
                                    }
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained">
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
