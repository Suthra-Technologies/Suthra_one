import { useEffect, useState } from 'react';
import {
    Lock, Dashboard, ShoppingCart, PointOfSale, TableRestaurant, Event as EventIcon,
    Kitchen, MenuBook, ShoppingBag, LocalOffer, Gavel, Celebration, Inventory,
    DeleteSweep, PlaylistAdd, Store as VendorIcon, Assignment as MaterialIcon,
    Restaurant, People, AccountBox, AccessTime as AccessTimeIcon, Assignment,
    MonetizationOn, DashboardCustomize, Assessment, Public as WebIcon, Receipt,
    AdminPanelSettings, HeadsetMic, Forum, Settings, NotificationsActive,
    Payments as PayrollIcon, AutoStories,
} from '@mui/icons-material';
import { Box, Typography, Button, Paper, Chip } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { subscriptionAPI } from '../services/api';
import { UpgradeCardSkeleton } from '../components/common/PageSkeleton';
import { planFeatureLabel } from '../utils/planFeatures';

const FEATURE_ICONS: Record<string, typeof Lock> = {
    dashboard: Dashboard, orders: ShoppingCart, pos: PointOfSale, tables: TableRestaurant,
    bookings: EventIcon, kitchen: Kitchen, menu: MenuBook, globaladdons: ShoppingBag,
    promocoupons: LocalOffer, disputes: Gavel, catering: Celebration, inventory: Inventory,
    wastemanagement: DeleteSweep, purchaseorders: PlaylistAdd, vendors: VendorIcon,
    materialproviders: MaterialIcon, recipes: Restaurant, users: People, customers: AccountBox,
    attendance: AccessTimeIcon, assets: Assignment, expenses: MonetizationOn,
    customisescreens: DashboardCustomize, reports: Assessment, serviceusage: WebIcon,
    customeractivities: Assessment, invoices: Receipt, auditlogs: Assessment,
    subscription: AdminPanelSettings, support: HeadsetMic, customersupport: Forum,
    settings: Settings, managenotifications: NotificationsActive, payroll: PayrollIcon,
    helpguide: AutoStories,
};

const FEATURE_PITCH: Record<string, string> = {
    customersupport: 'handle support requests, SLAs and refunds without leaving the register',
    support: 'reach platform support directly and track your tickets',
    payroll: 'manage staff pay, hours and payroll runs',
    reports: 'see sales, inventory and staff performance at a glance',
    inventory: 'track stock levels and avoid running out',
    users: 'add more staff accounts with role-based access',
    invoices: 'generate and manage customer invoices',
    auditlogs: 'review a full history of changes across your account',
};

interface PlanOption {
    _id: string;
    name: string;
    price: number;
    interval: string;
    features: string[];
}

export const Unauthorized = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, activeRole } = useAuth();
    const { formatCurrency } = useSettings();
    const state = location.state as { reason?: string; feature?: string } | null;

    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState<PlanOption[]>([]);

    const isPlanIssue = state?.reason === 'plan';
    const feature = state?.feature;

    useEffect(() => {
        if (!isPlanIssue) return;
        setLoading(true);
        subscriptionAPI.getPlans()
            .then(res => setPlans(res.data || []))
            .catch(() => setPlans([]))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlanIssue]);

    if (!isPlanIssue) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h4" color="error">
                    🚫 You don't have permission to view this page.
                </Typography>
                <Typography sx={{ mt: 2 }}>
                    If you think this is a mistake, please contact your system administrator.
                </Typography>
            </Box>
        );
    }

    if (loading) {
        return <UpgradeCardSkeleton />;
    }

    const featureLabel = feature ? planFeatureLabel(feature) : 'This feature';
    const pitch = feature ? FEATURE_PITCH[feature] : undefined;
    const FeatureIcon = (feature && FEATURE_ICONS[feature]) || Lock;

    const tenant: any = user?.tenant;
    const currentPlanId = tenant?.currentPlan?._id || tenant?.currentPlan;
    const currentPlan = plans.find(p => p._id === currentPlanId) || null;

    // Cheapest plan that includes the missing feature (or unlocks it via legacy 'core').
    const candidates = feature
        ? plans
            .filter(p => p._id !== currentPlanId)
            .filter(p => p.features.includes(feature) || p.features.includes('core'))
            .sort((a, b) => a.price - b.price)
        : [];
    const nextPlan = candidates[0] || null;

    const isAdmin = activeRole === 'admin' || user?.roles?.includes('admin');

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: { xs: 2, sm: 4 } }}>
            <Paper sx={{ p: { xs: 3, sm: 5 }, maxWidth: 560, width: '100%', textAlign: 'center', borderRadius: 3 }}>
                <Box
                    sx={{
                        width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 3,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'background.paper',
                        border: '2px solid',
                        borderColor: 'primary.main',
                    }}
                >
                    <FeatureIcon sx={{ color: 'primary.main' }} />
                </Box>

                <Typography variant="h5" fontWeight={800} gutterBottom>
                    {featureLabel} is a {nextPlan ? nextPlan.name : 'higher-tier'} feature
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    {currentPlan ? `Your ${currentPlan.name} doesn't include this.` : 'Your current plan doesn\'t include this.'}
                    {' '}
                    {pitch ? `Upgrade to ${pitch}.` : 'Upgrade your plan to unlock it.'}
                </Typography>

                {(currentPlan || nextPlan) && (
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, textAlign: 'left', flexDirection: { xs: 'column', sm: 'row' } }}>
                        {currentPlan && (
                            <Box sx={{ flex: 1, p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Typography fontWeight={700}>{currentPlan.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {formatCurrency(currentPlan.price)}/{currentPlan.interval === 'yearly' ? 'yr' : 'mo'}
                                </Typography>
                            </Box>
                        )}
                        {nextPlan && (
                            <Box sx={{ flex: 1, p: 2, borderRadius: 2, border: '2px solid', borderColor: 'primary.main', position: 'relative', bgcolor: (t) => t.palette.mode === 'dark' ? 'action.hover' : 'primary.50' }}>
                                <Chip
                                    label="UNLOCKS THIS"
                                    size="small"
                                    color="primary"
                                    sx={{ position: 'absolute', top: -12, left: 12, fontWeight: 700, fontSize: 10 }}
                                />
                                <Typography fontWeight={700} sx={{ mt: 0.5 }}>{nextPlan.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {formatCurrency(nextPlan.price)}/{nextPlan.interval === 'yearly' ? 'yr' : 'mo'}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {isAdmin ? (
                        <>
                            <Button variant="contained" size="large" onClick={() => navigate('/subscription')}>
                                {nextPlan ? `Upgrade to ${nextPlan.name}` : 'View Plans'}
                            </Button>
                            <Button variant="outlined" size="large" onClick={() => navigate('/subscription')}>
                                Compare all plans
                            </Button>
                        </>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Ask an admin to upgrade your plan to access this feature.
                        </Typography>
                    )}
                </Box>
            </Paper>
        </Box>
    );
};
