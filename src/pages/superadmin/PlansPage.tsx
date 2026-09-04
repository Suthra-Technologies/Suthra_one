import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
    Edit as EditIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    BarChart as BarChartIcon,
    WorkspacePremium as CrownIcon,
    EnergySavingsLeaf as LeafIcon,
    Bolt as BoltIcon,
    EmailOutlined as EmailIcon,
    SmsOutlined as SmsIcon,
    StorefrontOutlined as StoreIcon,
    ArrowForward as ArrowForwardIcon,
    SavingsOutlined as CoinsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { superAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { CardGridSkeleton } from '../../components/common/PageSkeleton';

const DS = {
    pageBg: '#F8F9FB',
    text: '#0F172A',
    muted: '#6B7280',
    border: '#E5E7EB',
    orange: '#F27121',
    orangeHover: '#E06518',
    purple: '#7C4DFF',
    purpleSoft: '#F3EEFF',
    green: '#10B981',
    greenSoft: '#ECFDF5',
    greenText: '#059669',
    pink: '#EC4899',
    pinkSoft: '#FDF2F8',
    blue: '#3B82F6',
    blueSoft: '#EFF6FF',
    font: "'Inter', 'Plus Jakarta Sans', sans-serif",
    heading: "'Plus Jakarta Sans', 'Inter', sans-serif",
    shadow: '0 1px 2px rgba(15,23,42,0.04), 0 10px 28px rgba(15,23,42,0.05)',
};

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
    { key: 'payroll', label: 'Employees & Payroll' },
    { key: 'helpguide', label: 'Help & Guide' },
];

const CORE_FEATURES = [
    'dashboard', 'orders', 'pos', 'tables', 'bookings', 'kitchen', 'menu', 'globaladdons',
    'promocoupons', 'disputes', 'purchaseorders', 'vendors', 'materialproviders', 'recipes',
    'users', 'customers', 'assets', 'expenses', 'customisescreens', 'reports', 'serviceusage',
    'customeractivities', 'invoices', 'auditlogs', 'subscription', 'support', 'customersupport',
    'settings', 'managenotifications',
];

const resourceWindowLabel = (interval: string, trialDays?: number): string => {
    if (interval === 'trial') return `${trialDays || 7} Days`;
    if (interval === 'yearly') return 'Year';
    if (interval === 'one-time') return 'Month';
    return 'Month';
};

const fmtLimit = (n?: number) => (!n ? 'Unlimited' : n.toLocaleString());

interface SubscriptionPlan {
    _id: string;
    name: string;
    price: number;
    interval: 'monthly' | 'yearly' | 'one-time' | 'trial';
    trialDays?: number;
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
    baseplanId?: string | null;
    disableStripeOnboarding?: boolean;
    disableDelivery?: boolean;
    disableSms?: boolean;
    disableEmail?: boolean;
}

type TabKey = 'all' | 'subscription' | 'topup';
type BillingKey = 'monthly' | 'yearly';

const getSubTheme = (plan: SubscriptionPlan, popularId?: string) => {
    const name = (plan.name || '').toLowerCase();
    if (plan._id === popularId || /max|pro|popular|premium/.test(name)) {
        return {
            accent: DS.purple,
            iconBg: DS.purpleSoft,
            icon: <CrownIcon sx={{ color: DS.purple }} />,
            popular: true,
        };
    }
    if (/start|free|trial|basic/.test(name) || plan.interval === 'trial' || plan.price === 0) {
        return {
            accent: DS.green,
            iconBg: DS.greenSoft,
            icon: <LeafIcon sx={{ color: DS.green }} />,
            popular: false,
        };
    }
    return {
        accent: DS.orange,
        iconBg: '#FFF4EC',
        icon: <BoltIcon sx={{ color: DS.orange }} />,
        popular: false,
    };
};

const getTopupTheme = (plan: SubscriptionPlan) => {
    const rt = plan.resourceType || 'none';
    if (rt === 'sms') {
        return { accent: DS.blue, soft: DS.blueSoft, icon: <SmsIcon sx={{ color: DS.blue }} />, desc: 'Use credits for customer notifications & alerts' };
    }
    if (rt === 'email') {
        return { accent: DS.pink, soft: DS.pinkSoft, icon: <EmailIcon sx={{ color: DS.pink }} />, desc: 'Use credits for transactional and marketing emails' };
    }
    return { accent: DS.purple, soft: DS.purpleSoft, icon: <StoreIcon sx={{ color: DS.purple }} />, desc: 'Custom credits for your business needs' };
};

const PlansPage: React.FC = () => {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabKey>('all');
    const [billing, setBilling] = useState<BillingKey>('monthly');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [detailsPlan, setDetailsPlan] = useState<SubscriptionPlan | null>(null);
    const [compareOpen, setCompareOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        interval: 'monthly' as 'monthly' | 'yearly' | 'one-time' | 'trial',
        trialDays: 7,
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
        disableStripeOnboarding: false,
        disableDelivery: false,
        disableSms: false,
        disableEmail: false,
    });
    const [baseplanId, setBaseplanId] = useState('');

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

    const subscriptionPlans = useMemo(() => plans.filter((p) => p.type !== 'topup'), [plans]);
    const topupPlans = useMemo(() => plans.filter((p) => p.type === 'topup'), [plans]);

    const filteredSubscriptionPlans = useMemo(() => {
        return subscriptionPlans.filter((p) => {
            if (billing === 'yearly') return p.interval === 'yearly';
            // Monthly tab shows monthly + trial/one-time subscription plans
            return p.interval === 'monthly' || p.interval === 'trial' || p.interval === 'one-time';
        });
    }, [subscriptionPlans, billing]);

    const popularId = useMemo(() => {
        const priced = filteredSubscriptionPlans.filter((p) => p.interval !== 'trial' && Number(p.price) > 0);
        if (!priced.length) return undefined;
        const byName = priced.find((p) => /max|pro|popular|premium/i.test(p.name));
        if (byName) return byName._id;
        return [...priced].sort((a, b) => Number(b.price) - Number(a.price))[0]?._id;
    }, [filteredSubscriptionPlans]);

    const handleOpenDialog = (plan?: SubscriptionPlan, defaultType: 'subscription' | 'topup' = 'subscription') => {
        if (plan) {
            setEditingPlan(plan);
            const moduleKeys = new Set(MODULES.map((m) => m.key));
            const otherFeatures = plan.features.filter((f) => !moduleKeys.has(f) && f !== 'core').join('\n');
            const modules = plan.features.includes('core')
                ? Array.from(new Set([...plan.features.filter((f) => moduleKeys.has(f)), ...CORE_FEATURES]))
                : plan.features.filter((f) => moduleKeys.has(f));

            setFormData({
                name: plan.name,
                price: plan.price,
                interval: plan.interval as any,
                trialDays: plan.trialDays || 7,
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
                disableStripeOnboarding: !!plan.disableStripeOnboarding,
                disableDelivery: !!plan.disableDelivery,
                disableSms: !!plan.disableSms,
                disableEmail: !!plan.disableEmail,
            });
            setBaseplanId(plan.baseplanId || '');
        } else {
            setEditingPlan(null);
            setFormData({
                name: '',
                price: 0,
                interval: defaultType === 'topup' ? 'one-time' : 'monthly',
                trialDays: 7,
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
                disableStripeOnboarding: false,
                disableDelivery: false,
                disableSms: false,
                disableEmail: false,
            });
            setBaseplanId('');
        }
        setDialogOpen(true);
    };

    const handleInheritFromBaseplan = (planId: string) => {
        setBaseplanId(planId);
        if (!planId) return;
        const basePlan = plans.find((p) => p._id === planId);
        if (!basePlan) return;
        const moduleKeys = new Set(MODULES.map((m) => m.key));
        const baseModules = basePlan.features.includes('core')
            ? Array.from(new Set([...basePlan.features.filter((f) => moduleKeys.has(f)), ...CORE_FEATURES]))
            : basePlan.features.filter((f) => moduleKeys.has(f));
        setFormData((prev) => ({
            ...prev,
            isLegacyCore: false,
            modules: Array.from(new Set([...prev.modules, ...baseModules])),
        }));
    };

    const toggleModule = (key: string) => {
        setFormData((prev) => ({
            ...prev,
            isLegacyCore: false,
            modules: prev.modules.includes(key)
                ? prev.modules.filter((m) => m !== key)
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
            const featuresList = formData.isLegacyCore
                ? [...formData.features.split('\n').filter((f) => f.trim()), 'core', ...formData.modules.filter((m) => !CORE_FEATURES.includes(m))]
                : [...formData.features.split('\n').filter((f) => f.trim()), ...formData.modules];

            const planData = {
                ...formData,
                features: featuresList,
                baseplanId: baseplanId || null,
            };
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

    const priceLabel = (plan: SubscriptionPlan) => {
        if (plan.interval === 'trial') return { amount: 'Free', suffix: ` / ${plan.trialDays || 7} days` };
        const amount = `$${Number(plan.price || 0).toFixed(2)}`;
        const suffix = plan.type === 'topup' ? ' /one-time' : plan.interval === 'yearly' ? ' /year' : ' /month';
        return { amount, suffix };
    };

    const renderSubscriptionCard = (plan: SubscriptionPlan) => {
        const theme = getSubTheme(plan, popularId);
        const price = priceLabel(plan);
        const limits = [
            { label: 'Max Users', value: fmtLimit(plan.maxUsers) },
            { label: 'Max Tables', value: fmtLimit(plan.maxTables) },
            { label: 'Max Orders', value: fmtLimit(plan.maxOrders) },
            { label: 'Max SMS', value: fmtLimit(plan.maxSms) },
            { label: 'Max Emails', value: fmtLimit(plan.maxEmail) },
        ];

        return (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={plan._id}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '16px',
                        border: theme.popular ? `2px solid ${DS.purple}` : `1px solid ${DS.border}`,
                        boxShadow: DS.shadow,
                        position: 'relative',
                        bgcolor: '#fff',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: '0 14px 36px rgba(15,23,42,0.08)',
                        },
                    }}
                >
                    {theme.popular && (
                        <Chip
                            label="Most Popular"
                            size="small"
                            sx={{
                                position: 'absolute',
                                top: -12,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                bgcolor: DS.purple,
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: '11px',
                                height: 24,
                                borderRadius: '999px',
                                fontFamily: DS.font,
                            }}
                        />
                    )}

                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: theme.iconBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {theme.icon}
                        </Box>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: plan.isActive ? DS.green : '#9CA3AF' }} />
                            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: plan.isActive ? DS.greenText : DS.muted, fontFamily: DS.font }}>
                                {plan.isActive ? 'Active' : 'Inactive'}
                            </Typography>
                        </Stack>
                    </Stack>

                    <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '18px', color: DS.text, letterSpacing: '-0.02em' }}>
                        {plan.name}
                    </Typography>

                    <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mt: 0.75, mb: 1, flexWrap: 'wrap' }} useFlexGap>
                        <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '28px', color: theme.popular ? DS.purple : DS.orange, letterSpacing: '-0.03em', lineHeight: 1 }}>
                            {price.amount}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: DS.muted, fontWeight: 500 }}>{price.suffix}</Typography>
                        {plan.interval !== 'trial' && plan.type !== 'topup' && (
                            <Chip
                                label="Save 25%"
                                size="small"
                                sx={{ height: 22, fontSize: '11px', fontWeight: 700, bgcolor: DS.greenSoft, color: DS.greenText, borderRadius: '999px' }}
                            />
                        )}
                    </Stack>

                    <Stack spacing={1} sx={{ flexGrow: 1, my: 1.5 }}>
                        {limits.map((item) => (
                            <Stack key={item.label} direction="row" spacing={1} alignItems="center">
                                <CheckCircleIcon sx={{ fontSize: 18, color: theme.accent }} />
                                <Typography sx={{ fontSize: '13.5px', color: DS.text, fontFamily: DS.font }}>
                                    <Box component="span" sx={{ color: DS.muted }}>{item.label}:</Box>{' '}
                                    <Box component="span" sx={{ fontWeight: 700 }}>{item.value}</Box>
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button
                            fullWidth
                            endIcon={<ArrowForwardIcon sx={{ fontSize: '16px !important' }} />}
                            onClick={() => setDetailsPlan(plan)}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '13px',
                                borderRadius: '10px',
                                fontFamily: DS.font,
                                py: 1,
                                ...(theme.popular
                                    ? {
                                          bgcolor: DS.purple,
                                          color: '#fff',
                                          '&:hover': { bgcolor: '#6A3DE6' },
                                      }
                                    : {
                                          border: `1px solid ${DS.border}`,
                                          color: DS.text,
                                          bgcolor: '#fff',
                                          '&:hover': { bgcolor: '#F9FAFB', borderColor: '#D1D5DB' },
                                      }),
                            }}
                        >
                            View Details
                        </Button>
                        <IconButton
                            onClick={() => handleOpenDialog(plan)}
                            sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '10px',
                                border: `1px solid ${DS.border}`,
                                color: DS.muted,
                                '&:hover': { bgcolor: '#F3F4F6', color: DS.text },
                            }}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            onClick={() => handleDelete(plan._id)}
                            sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '10px',
                                border: '1px solid #FECACA',
                                color: '#EF4444',
                                bgcolor: '#FEF2F2',
                                '&:hover': { bgcolor: '#FEE2E2' },
                            }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </Paper>
            </Grid>
        );
    };

    const renderTopupCard = (plan: SubscriptionPlan) => {
        const theme = getTopupTheme(plan);
        const price = priceLabel(plan);
        return (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={plan._id}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '16px',
                        border: `1px solid ${DS.border}`,
                        boxShadow: DS.shadow,
                        bgcolor: '#fff',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: '0 14px 36px rgba(15,23,42,0.08)',
                        },
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: theme.soft,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {theme.icon}
                        </Box>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: plan.isActive ? DS.green : '#9CA3AF' }} />
                            <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: plan.isActive ? DS.greenText : DS.muted }}>
                                {plan.isActive ? 'Active' : 'Inactive'}
                            </Typography>
                        </Stack>
                    </Stack>

                    <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '18px', color: DS.text }}>
                        {plan.name}
                    </Typography>
                    <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ mt: 0.75, mb: 1.5 }}>
                        <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '28px', color: theme.accent, letterSpacing: '-0.03em' }}>
                            {price.amount}
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: DS.muted }}>{price.suffix}</Typography>
                    </Stack>

                    <Box
                        sx={{
                            mb: 1.75,
                            p: 1.5,
                            borderRadius: '12px',
                            bgcolor: theme.soft,
                            border: `1.5px dashed ${theme.accent}`,
                        }}
                    >
                        <Typography sx={{ fontSize: '12px', color: theme.accent, fontWeight: 700 }}>Resource Credit:</Typography>
                        <Typography sx={{ fontSize: '15px', fontWeight: 800, color: theme.accent, mt: 0.25 }}>
                            {(plan.resourceCount || 0).toLocaleString()} {(plan.resourceType || 'credit').toUpperCase()} Credits
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ flexGrow: 1, mb: 2 }}>
                        <CheckCircleIcon sx={{ fontSize: 18, color: theme.accent, mt: '1px' }} />
                        <Typography sx={{ fontSize: '13.5px', color: DS.text, fontFamily: DS.font }}>{theme.desc}</Typography>
                    </Stack>

                    <Stack direction="row" spacing={1}>
                        <Button
                            fullWidth
                            endIcon={<ArrowForwardIcon sx={{ fontSize: '16px !important' }} />}
                            onClick={() => setDetailsPlan(plan)}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '13px',
                                borderRadius: '10px',
                                border: `1px solid ${DS.border}`,
                                color: DS.text,
                                py: 1,
                                '&:hover': { bgcolor: '#F9FAFB' },
                            }}
                        >
                            View Details
                        </Button>
                        <IconButton
                            onClick={() => handleOpenDialog(plan)}
                            sx={{ width: 42, height: 42, borderRadius: '10px', border: `1px solid ${DS.border}`, color: DS.muted }}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            onClick={() => handleDelete(plan._id)}
                            sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '10px',
                                border: '1px solid #FECACA',
                                color: '#EF4444',
                                bgcolor: '#FEF2F2',
                            }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </Paper>
            </Grid>
        );
    };

    const tabs: { key: TabKey; label: string; count: number }[] = [
        { key: 'all', label: 'All Plans', count: plans.length },
        { key: 'subscription', label: 'Subscription Plans', count: subscriptionPlans.length },
        { key: 'topup', label: 'Top-Up Plans', count: topupPlans.length },
    ];

    const showSubscription = tab === 'all' || tab === 'subscription';
    const showTopup = tab === 'all' || tab === 'topup';

    return (
        <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 4, pt: { xs: 1, sm: 2.5 }, bgcolor: DS.pageBg, minHeight: '100%', fontFamily: DS.font }}>
            {/* Breadcrumb */}
            <Typography sx={{ fontSize: '12.5px', color: DS.muted, mb: 1, fontFamily: DS.font }}>
                <Box
                    component="span"
                    onClick={() => navigate('/superadmin')}
                    sx={{ cursor: 'pointer', '&:hover': { color: DS.orange } }}
                >
                    Home
                </Box>
                {' > '}
                <Box component="span" sx={{ color: DS.text, fontWeight: 600 }}>Subscription Plans</Box>
            </Typography>

            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'stretch', sm: 'flex-start' },
                    gap: 2,
                    mb: 2.75,
                }}
            >
                <Box>
                    <Typography
                        sx={{
                            fontFamily: DS.heading,
                            fontWeight: 800,
                            fontSize: { xs: '24px', sm: '28px' },
                            color: DS.text,
                            letterSpacing: '-0.03em',
                            lineHeight: 1.15,
                        }}
                    >
                        Subscription Plans
                    </Typography>
                    <Typography sx={{ mt: 0.6, color: DS.muted, fontSize: '13.5px', maxWidth: 520 }}>
                        Manage and configure subscription plans for your platform.
                    </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                    <Button
                        startIcon={<BarChartIcon />}
                        onClick={() => setCompareOpen(true)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '13.5px',
                            borderRadius: '10px',
                            border: `1px solid ${DS.border}`,
                            color: DS.text,
                            bgcolor: '#fff',
                            px: 2,
                            '&:hover': { bgcolor: '#F9FAFB' },
                        }}
                    >
                        Compare Plans
                    </Button>
                    <Button
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog(undefined, 'subscription')}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '13.5px',
                            borderRadius: '10px',
                            bgcolor: DS.orange,
                            color: '#fff',
                            px: 2,
                            '&:hover': { bgcolor: DS.orangeHover },
                        }}
                    >
                        Create New Plan
                    </Button>
                </Stack>
            </Box>

            {/* Tabs */}
            <Paper
                elevation={0}
                sx={{
                    mb: 2.75,
                    borderRadius: '14px',
                    border: `1px solid ${DS.border}`,
                    bgcolor: '#fff',
                    px: 1.5,
                    display: 'flex',
                    gap: { xs: 1, sm: 2.5 },
                    overflowX: 'auto',
                }}
            >
                {tabs.map((t) => {
                    const active = tab === t.key;
                    return (
                        <Box
                            key={t.key}
                            component="button"
                            onClick={() => setTab(t.key)}
                            sx={{
                                border: 0,
                                bgcolor: 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                px: 0.75,
                                py: 1.6,
                                whiteSpace: 'nowrap',
                                fontFamily: DS.font,
                                fontSize: '13.5px',
                                fontWeight: active ? 700 : 500,
                                color: active ? DS.orange : DS.muted,
                                borderBottom: active ? `3px solid ${DS.orange}` : '3px solid transparent',
                                '&:hover': { color: DS.orange },
                            }}
                        >
                            {t.label}
                            <Box
                                sx={{
                                    minWidth: 22,
                                    height: 22,
                                    px: 0.75,
                                    borderRadius: '999px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11.5px',
                                    fontWeight: 800,
                                    bgcolor: active ? DS.orange : '#F3F4F6',
                                    color: active ? '#fff' : DS.muted,
                                }}
                            >
                                {t.count}
                            </Box>
                        </Box>
                    );
                })}
            </Paper>

            {loading ? (
                <CardGridSkeleton count={6} cardHeight={320} />
            ) : (
                <>
                    {showSubscription && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 2, sm: 2.75 },
                                mb: 2.75,
                                borderRadius: '16px',
                                border: `1px solid ${DS.border}`,
                                bgcolor: '#fff',
                                boxShadow: DS.shadow,
                            }}
                        >
                            <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                justifyContent="space-between"
                                alignItems={{ xs: 'stretch', md: 'flex-start' }}
                                spacing={2}
                                sx={{ mb: 2.5 }}
                            >
                                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '12px',
                                            bgcolor: '#FFF4EC',
                                            color: DS.orange,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <CrownIcon />
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '17px', color: DS.text }}>
                                            Subscription Plans
                                        </Typography>
                                        <Typography sx={{ fontSize: '13px', color: DS.muted, mt: 0.35 }}>
                                            Recurring plans with monthly or yearly billing for full platform access.
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <Box
                                        sx={{
                                            display: 'inline-flex',
                                            p: 0.4,
                                            borderRadius: '999px',
                                            bgcolor: '#F3F4F6',
                                            border: `1px solid ${DS.border}`,
                                        }}
                                    >
                                        {(['monthly', 'yearly'] as BillingKey[]).map((key) => (
                                            <Box
                                                key={key}
                                                component="button"
                                                onClick={() => setBilling(key)}
                                                sx={{
                                                    border: 0,
                                                    cursor: 'pointer',
                                                    px: 1.75,
                                                    py: 0.7,
                                                    borderRadius: '999px',
                                                    fontFamily: DS.font,
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    textTransform: 'capitalize',
                                                    bgcolor: billing === key ? DS.orange : 'transparent',
                                                    color: billing === key ? '#fff' : DS.muted,
                                                }}
                                            >
                                                {key}
                                            </Box>
                                        ))}
                                    </Box>
                                    <Chip
                                        label="Save up to 20%"
                                        size="small"
                                        sx={{ height: 24, fontSize: '11.5px', fontWeight: 700, bgcolor: DS.greenSoft, color: DS.greenText }}
                                    />
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => handleOpenDialog(undefined, 'subscription')}
                                        sx={{ textTransform: 'none', fontWeight: 700, color: DS.orange }}
                                    >
                                        Add
                                    </Button>
                                </Stack>
                            </Stack>

                            {filteredSubscriptionPlans.length === 0 ? (
                                <Typography sx={{ color: DS.muted, py: 4, textAlign: 'center' }}>
                                    No {billing} subscription plans found.
                                </Typography>
                            ) : (
                                <Grid container spacing={2.25}>
                                    {filteredSubscriptionPlans.map(renderSubscriptionCard)}
                                </Grid>
                            )}
                        </Paper>
                    )}

                    {showTopup && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 2, sm: 2.75 },
                                mb: 2,
                                borderRadius: '16px',
                                border: `1px solid ${DS.border}`,
                                bgcolor: '#fff',
                                boxShadow: DS.shadow,
                            }}
                        >
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                justifyContent="space-between"
                                alignItems={{ xs: 'stretch', sm: 'flex-start' }}
                                spacing={1.5}
                                sx={{ mb: 2.5 }}
                            >
                                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '12px',
                                            bgcolor: '#FFF4EC',
                                            color: DS.orange,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <CoinsIcon />
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '17px', color: DS.text }}>
                                            Top-Up Plans
                                        </Typography>
                                        <Typography sx={{ fontSize: '13px', color: DS.muted, mt: 0.35 }}>
                                            One-time purchase plans for additional credits and resources.
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => handleOpenDialog(undefined, 'topup')}
                                    sx={{ textTransform: 'none', fontWeight: 700, color: DS.orange, alignSelf: { sm: 'center' } }}
                                >
                                    Create Top-Up
                                </Button>
                            </Stack>

                            {topupPlans.length === 0 ? (
                                <Typography sx={{ color: DS.muted, py: 4, textAlign: 'center' }}>No top-up plans found.</Typography>
                            ) : (
                                <Grid container spacing={2.25}>
                                    {topupPlans.map(renderTopupCard)}
                                </Grid>
                            )}
                        </Paper>
                    )}
                </>
            )}

            {/* View Details */}
            <Dialog open={Boolean(detailsPlan)} onClose={() => setDetailsPlan(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontFamily: DS.heading, fontWeight: 800, pr: 6 }}>
                    {detailsPlan?.name}
                    <IconButton
                        onClick={() => setDetailsPlan(null)}
                        size="small"
                        sx={{ position: 'absolute', right: 12, top: 12, bgcolor: 'error.main', color: '#fff', width: 24, height: 24, '&:hover': { bgcolor: 'error.dark' } }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {detailsPlan && (
                        <Stack spacing={1.5}>
                            <Typography sx={{ fontSize: '14px', color: DS.muted }}>
                                Type: <strong>{detailsPlan.type === 'topup' ? 'Top-Up' : 'Subscription'}</strong>
                                {' · '}
                                Interval: <strong>{detailsPlan.interval}</strong>
                                {' · '}
                                Status: <strong>{detailsPlan.isActive ? 'Active' : 'Inactive'}</strong>
                            </Typography>
                            <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '24px', color: DS.orange }}>
                                {priceLabel(detailsPlan).amount}
                                <Typography component="span" sx={{ fontSize: '14px', color: DS.muted, fontWeight: 500 }}>
                                    {priceLabel(detailsPlan).suffix}
                                </Typography>
                            </Typography>
                            {detailsPlan.type === 'topup' ? (
                                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: DS.purpleSoft }}>
                                    Resource Credit: <strong>{(detailsPlan.resourceCount || 0).toLocaleString()} {(detailsPlan.resourceType || '').toUpperCase()}</strong>
                                </Box>
                            ) : (
                                <Stack spacing={0.75}>
                                    <Typography>Max Users: <strong>{fmtLimit(detailsPlan.maxUsers)}</strong></Typography>
                                    <Typography>Max Tables: <strong>{fmtLimit(detailsPlan.maxTables)}</strong></Typography>
                                    <Typography>Max Orders: <strong>{fmtLimit(detailsPlan.maxOrders)}</strong></Typography>
                                    <Typography>Max SMS: <strong>{fmtLimit(detailsPlan.maxSms)}</strong></Typography>
                                    <Typography>Max Emails: <strong>{fmtLimit(detailsPlan.maxEmail)}</strong></Typography>
                                </Stack>
                            )}
                            {!!detailsPlan.features?.length && (
                                <Box>
                                    <Typography sx={{ fontWeight: 700, mb: 0.75 }}>Modules / Features</Typography>
                                    {detailsPlan.features.slice(0, 20).map((f) => (
                                        <Typography key={f} sx={{ fontSize: '13px', color: DS.text, mb: 0.35 }}>
                                            • {MODULES.find((m) => m.key === f)?.label || f}
                                        </Typography>
                                    ))}
                                </Box>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsPlan(null)}>Close</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            const p = detailsPlan;
                            setDetailsPlan(null);
                            if (p) handleOpenDialog(p);
                        }}
                        sx={{ bgcolor: DS.orange, '&:hover': { bgcolor: DS.orangeHover } }}
                    >
                        Edit Plan
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Compare */}
            <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontFamily: DS.heading, fontWeight: 800 }}>Compare Subscription Plans</DialogTitle>
                <DialogContent>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Plan</TableCell>
                                    <TableCell>Price</TableCell>
                                    <TableCell>Interval</TableCell>
                                    <TableCell>Users</TableCell>
                                    <TableCell>Tables</TableCell>
                                    <TableCell>Orders</TableCell>
                                    <TableCell>SMS</TableCell>
                                    <TableCell>Email</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {subscriptionPlans.map((p) => (
                                    <TableRow key={p._id}>
                                        <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                                        <TableCell>{p.interval === 'trial' ? 'Free' : `$${Number(p.price || 0).toFixed(2)}`}</TableCell>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>{p.interval}</TableCell>
                                        <TableCell>{fmtLimit(p.maxUsers)}</TableCell>
                                        <TableCell>{fmtLimit(p.maxTables)}</TableCell>
                                        <TableCell>{fmtLimit(p.maxOrders)}</TableCell>
                                        <TableCell>{fmtLimit(p.maxSms)}</TableCell>
                                        <TableCell>{fmtLimit(p.maxEmail)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCompareOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Create/Edit Dialog — unchanged logic */}
            <Dialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        mt: { xs: 10, sm: 'auto' },
                        mb: { xs: 4, sm: 'auto' },
                    },
                    '& .MuiFormLabel-asterisk': {
                        color: 'error.main',
                    },
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
                            '&:hover': { backgroundColor: 'error.dark' },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        {!editingPlan && (
                            <TextField
                                select
                                label="Plan Type"
                                value={formData.type}
                                onChange={(e) => {
                                    const type = e.target.value as 'subscription' | 'topup';
                                    setFormData({
                                        ...formData,
                                        type,
                                        interval: type === 'topup' ? 'one-time' : formData.interval === 'one-time' ? 'monthly' : formData.interval,
                                    });
                                }}
                                fullWidth
                                SelectProps={{ native: true }}
                            >
                                <option value="subscription">Subscription</option>
                                <option value="topup">Top-Up</option>
                            </TextField>
                        )}
                        <TextField
                            label="Plan Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            fullWidth
                            required
                        />

                        <Grid container spacing={2}>
                            {formData.interval !== 'trial' && (
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
                                        inputProps={{ min: 0, step: '0.01' }}
                                    />
                                </Grid>
                            )}

                            {formData.type === 'subscription' && (
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        label="Interval"
                                        select
                                        value={formData.interval}
                                        onChange={(e) => {
                                            const interval = e.target.value as any;
                                            const defaultingToTrial = interval === 'trial' && !editingPlan;
                                            setFormData({
                                                ...formData,
                                                interval,
                                                ...(interval === 'trial' ? { price: 0 } : {}),
                                                ...(defaultingToTrial
                                                    ? {
                                                          disableStripeOnboarding: true,
                                                          disableDelivery: true,
                                                          disableSms: true,
                                                          disableEmail: true,
                                                      }
                                                    : {}),
                                            });
                                        }}
                                        fullWidth
                                        SelectProps={{ native: true }}
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                        <option value="one-time">One-Time</option>
                                        <option value="trial">Trial</option>
                                    </TextField>
                                </Grid>
                            )}

                            {formData.type === 'subscription' && formData.interval === 'trial' && (
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        label="Trial Days"
                                        type="number"
                                        value={formData.trialDays}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setFormData({ ...formData, trialDays: isNaN(val) ? 0 : (val < 1 ? 1 : val) });
                                        }}
                                        onFocus={(e) => e.target.select()}
                                        fullWidth
                                        inputProps={{ min: 1 }}
                                        helperText="How many days a tenant stays on this trial before it expires"
                                    />
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
                                            label={`Max Orders / ${resourceWindowLabel(formData.interval, formData.trialDays)}`}
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
                                            label={`Max SMS / ${resourceWindowLabel(formData.interval, formData.trialDays)}`}
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
                                            label={`Max Emails / ${resourceWindowLabel(formData.interval, formData.trialDays)}`}
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
                                <TextField
                                    select
                                    label="Inherit modules from plan"
                                    value={baseplanId}
                                    onChange={(e) => handleInheritFromBaseplan(e.target.value)}
                                    fullWidth
                                    SelectProps={{ native: true }}
                                    InputLabelProps={{ shrink: true }}
                                    helperText="Pulls in all modules from the selected plan; you can still add or remove modules below before saving."
                                >
                                    <option value="">None</option>
                                    {plans
                                        .filter((p) => p.type !== 'topup' && p._id !== editingPlan?._id)
                                        .map((p) => (
                                            <option key={p._id} value={p._id}>{p.name}</option>
                                        ))}
                                </TextField>

                                <Divider sx={{ my: 1 }} />
                                <Typography variant="subtitle2" color="primary">Restrictions</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Block tenants on this plan from using these integrations, regardless of their own settings.
                                </Typography>
                                <Stack direction="row" flexWrap="wrap" sx={{ mb: 1 }}>
                                    <FormControlLabel
                                        control={<Checkbox checked={formData.disableStripeOnboarding} onChange={(e) => setFormData({ ...formData, disableStripeOnboarding: e.target.checked })} />}
                                        label="Disable Stripe Onboarding"
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={formData.disableDelivery} onChange={(e) => setFormData({ ...formData, disableDelivery: e.target.checked })} />}
                                        label="Disable Delivery Services"
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={formData.disableSms} onChange={(e) => setFormData({ ...formData, disableSms: e.target.checked })} />}
                                        label="Disable SMS"
                                    />
                                    <FormControlLabel
                                        control={<Checkbox checked={formData.disableEmail} onChange={(e) => setFormData({ ...formData, disableEmail: e.target.checked })} />}
                                        label="Disable Email"
                                    />
                                </Stack>

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
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disabled={!isFormValid}
                        sx={{ bgcolor: DS.orange, '&:hover': { bgcolor: DS.orangeHover } }}
                    >
                        {editingPlan ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete this plan?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PlansPage;
