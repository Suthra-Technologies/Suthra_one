import { Check } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { alpha, useTheme } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { subscriptionAPI, tenantAPI } from '../../services/api';
import { getTenantSlugFromHostname, isSubdomainAccess } from '../../utils/tenant.utils';
import { CardGridSkeleton } from '../../components/common/PageSkeleton';
import { splitPlanFeatures, planFeatureLabel } from '../../utils/planFeatures';

interface Plan {
    _id: string;
    name: string;
    price: number;
    interval: 'monthly' | 'yearly';
    description: string;
    features: string[];
    maxUsers?: number;
    maxTables?: number;
    maxOrders?: number;
    maxSms?: number;
    maxEmail?: number;
    maxEmails?: number;
    baseplanId?: string | null;
}

interface TopupPlan {
    _id: string;
    name: string;
    price: number;
    description?: string;
    resourceType: 'email' | 'sms' | 'orders';
    resourceCount: number;
}

const RESOURCE_LABELS: Record<string, string> = {
    email: 'Emails',
    sms: 'SMS',
    orders: 'Orders',
};

const SubscriptionPage: React.FC = () => {
    const { user } = useAuth();
    const { formatCurrency } = useSettings();
    const theme = useTheme();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [topupPlans, setTopupPlans] = useState<TopupPlan[]>([]);
    const [planType, setPlanType] = useState<'subscription' | 'topup'>('subscription');
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState<string | null>(null);
    const [currentTenant, setCurrentTenant] = useState<any>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; plan: Plan | null }>({
        open: false,
        plan: null
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [plansRes, topupsRes, tenantRes] = await Promise.all([
                    subscriptionAPI.getPlans(),
                    subscriptionAPI.getTopups(),
                    tenantAPI.getCurrent()
                ]);

                // 🔥 Sort plans in the correct order
                const sortOrder = ["Monthly", "Quarterly", "Yearly", "Enterprise Plan"];

                const sortedPlans = plansRes.data.sort(
                    (a: Plan, b: Plan) =>
                        sortOrder.indexOf(a.name) - sortOrder.indexOf(b.name)
                );

                setPlans(sortedPlans);
                setTopupPlans(topupsRes.data || []);
                setCurrentTenant(tenantRes.data);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load subscription data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubscribeClick = (plan: Plan) => {
        setConfirmDialog({ open: true, plan });
    };

    const handleConfirmSubscription = async () => {
        const plan = confirmDialog.plan;
        if (!plan) return;

        setConfirmDialog({ open: false, plan: null });
        setSubscribing(plan._id);

        try {
            const baseUrl = window.location.origin;
            const currentSlug = getTenantSlugFromHostname();
            const isSubdomain = isSubdomainAccess();
            
            // If on a subdomain, the path starts with /subscription
            // If on a standard path, the path starts with /:slug/subscription
            const successUrl = isSubdomain 
                ? `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`
                : `${baseUrl}/${currentSlug || window.location.pathname.split('/')[1]}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
                
            const cancelUrl = isSubdomain
                ? `${baseUrl}/subscription`
                : `${baseUrl}/${currentSlug || window.location.pathname.split('/')[1]}/subscription`;

            const response = await subscriptionAPI.createCheckoutSession({
                planId: plan._id,
                amount: plan.price,
                successUrl,
                cancelUrl,
            });

            // Redirect to Stripe Checkout
            if (response.data.url) {
                window.location.href = response.data.url;
            } else {
                toast.error('Failed to create checkout session');
                setSubscribing(null);
            }
        } catch (error: any) {
            console.error('Error creating checkout session:', error);
            toast.error(error.response?.data?.message || 'Failed to start checkout. Please try again.');
            setSubscribing(null);
        }
    };

    const handleCloseDialog = () => {
        setConfirmDialog({ open: false, plan: null });
    };

    const handlePurchaseTopup = async (plan: TopupPlan) => {
        setSubscribing(plan._id);
        try {
            const baseUrl = window.location.origin;
            const currentSlug = getTenantSlugFromHostname();
            const isSubdomain = isSubdomainAccess();
            const pathSlug = currentSlug || window.location.pathname.split('/')[1];

            const successUrl = isSubdomain
                ? `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`
                : `${baseUrl}/${pathSlug}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = isSubdomain
                ? `${baseUrl}/subscription`
                : `${baseUrl}/${pathSlug}/subscription`;

            const response = await subscriptionAPI.createTopupCheckout(plan._id, successUrl, cancelUrl);
            if (response.data.url) {
                window.location.href = response.data.url;
            } else {
                toast.error('Failed to create checkout session');
                setSubscribing(null);
            }
        } catch (error: any) {
            console.error('Error creating top-up checkout session:', error);
            toast.error(error.response?.data?.message || 'Failed to start checkout. Please try again.');
            setSubscribing(null);
        }
    };

    // formatPrice function replaced by formatCurrency from context

    if (loading) {
        return <CardGridSkeleton count={3} cardHeight={420} />;
    }



    return (
        <Box sx={{ p: 3, color: 'text.primary' }}>
            <Box sx={{ mb: { xs: 2, sm: 4 }, textAlign: 'center' }}>
                <Typography 
                    variant="h4" 
                    gutterBottom 
                    fontWeight="bold" 
                    color="text.primary"
                    sx={{ fontSize: { xs: '1.45rem', sm: '2.125rem' } }}
                >
                    Subscription Plans
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                    {planType === 'subscription'
                        ? 'Choose the perfect plan for your restaurant'
                        : 'Add extra credits on top of your current plan'}
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 3, sm: 4 } }}>
                <ToggleButtonGroup
                    value={planType}
                    exclusive
                    color="primary"
                    onChange={(_e, value) => { if (value) setPlanType(value); }}
                    aria-label="plan type"
                >
                    <ToggleButton value="subscription" sx={{ px: 3, textTransform: 'none', fontWeight: 600 }}>
                        Subscription Plans
                    </ToggleButton>
                    <ToggleButton value="topup" sx={{ px: 3, textTransform: 'none', fontWeight: 600 }}>
                        Top-up Plans
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {planType === 'subscription' && currentTenant?.subscriptionStatus === 'trial' && (
                <Alert severity="info" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                    You are currently on a free trial. Upgrade now to continue using all features without interruption.
                </Alert>
            )}

            {planType === 'subscription' ? (
            <Grid container spacing={3} justifyContent="center">
                {plans.map((plan) => {
                    const isCurrentPlan = currentTenant?.currentPlan &&
                        (currentTenant.currentPlan === plan._id ||
                            currentTenant.currentPlan?._id === plan._id ||
                            String(currentTenant.currentPlan) === String(plan._id));
                    const subscriptionStatus = currentTenant?.subscriptionStatus;
                    const isExpired = subscriptionStatus === 'expired' ||
                        (subscriptionStatus === 'active' && currentTenant?.subscriptionEndsAt && new Date(currentTenant.subscriptionEndsAt) < new Date()) ||
                        (subscriptionStatus === 'trial' && currentTenant?.trialEndsAt && new Date(currentTenant.trialEndsAt) < new Date());
                    const isActive = subscriptionStatus === 'active' && !isExpired;
                    const isTrial = subscriptionStatus === 'trial' && !isExpired;
                    const isYearly = plan.interval === 'yearly';

                    return (
                        <Grid size={{ xs: 12, md: 4 }} key={plan._id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative',
                                    border: isCurrentPlan
                                        ? `2px solid ${'#4F46E5'}`
                                        : isYearly
                                            ? `2px solid ${theme.palette.primary.main}`
                                            : `1px solid ${theme.palette.divider}`,
                                    bgcolor: isCurrentPlan
                                        ? alpha('#4F46E5', theme.palette.mode === 'dark' ? 0.15 : 0.08)
                                        : theme.palette.background.paper,
                                    boxShadow: isCurrentPlan
                                        ? `0 0 0 3px ${alpha('#4F46E5', 0.2)}, 0 4px 20px ${alpha('#4F46E5', 0.15)}`
                                        : 'none',
                                    transform: isYearly && !isCurrentPlan ? 'scale(1.02)' : 'none',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        transform: isCurrentPlan ? 'scale(1.02)' : isYearly ? 'scale(1.05)' : 'scale(1.02)',
                                        boxShadow: isCurrentPlan
                                            ? `0 0 0 3px ${alpha('#4F46E5', 0.3)}, 0 8px 28px ${alpha('#4F46E5', 0.2)}`
                                            : theme.palette.mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.4)' : 6,
                                    },
                                }}
                            >
                                {/* Current/Trial Status Badges */}
                                {isCurrentPlan && isActive && (
                                    <Chip
                                        label="✓ Current Plan"
                                        color="primary"
                                        size="small"
                                        sx={{ position: 'absolute', top: 10, left: 10, fontWeight: 'bold', zIndex: 1 }}
                                    />
                                )}
                                {isCurrentPlan && isTrial && (
                                    <Chip
                                        label="Trial Plan"
                                        color="info"
                                        size="small"
                                        variant="filled"
                                        sx={{ position: 'absolute', top: 10, left: 10, fontWeight: 'bold', zIndex: 1 }}
                                    />
                                )}
                                {/* Expired Plan Badge */}
                                {isCurrentPlan && isExpired && (
                                    <Chip
                                        label="Plan Expired"
                                        color="error"
                                        size="small"
                                        sx={{ position: 'absolute', top: 10, left: 10, fontWeight: 'bold', zIndex: 1 }}
                                    />
                                )}
                                {/* Best Value Badge */}
                                {isYearly && (
                                    <Chip
                                        label="Best Value"
                                        color="primary"
                                        size="small"
                                        sx={{ position: 'absolute', top: 10, right: 10, fontWeight: 'bold', zIndex: 1 }}
                                    />
                                )}
                                <CardHeader
                                    title={plan.name}
                                    subheader={plan.description}
                                    titleTypographyProps={{
                                        align: 'center',
                                        variant: 'h6',
                                        fontWeight: 'bold',
                                        color: 'text.primary',
                                        sx: { fontSize: { xs: '1.05rem', sm: '1.2rem' } }
                                    }}
                                    subheaderTypographyProps={{ align: 'center', color: 'text.secondary', sx: { fontSize: '0.75rem' } }}
                                    sx={{
                                        bgcolor: isCurrentPlan
                                            ? alpha('#4F46E5', theme.palette.mode === 'dark' ? 0.2 : 0.1)
                                            : theme.palette.mode === 'dark'
                                                ? alpha(theme.palette.primary.main, 0.1)
                                                : 'grey.100',
                                        pb: 0,
                                        pt: isCurrentPlan || isYearly ? 3.5 : 1.5,
                                    }}
                                />
                                <CardContent sx={{ flexGrow: 1, textAlign: 'left', py: 1.5 }}>
                                   <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                        <Typography component="h2" variant="h4" color={isCurrentPlan ? 'primary.main' : 'text.primary'}
                                            sx={{ fontSize: { xs: '1.5rem', sm: '2.1rem' } }}>
                                            {formatCurrency(plan.price)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                            /{plan.interval}
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ my: 1 }} />
                                    {(() => {
                                        const { basePlan, extra } = splitPlanFeatures(plan, plans);
                                        const limitItems = [
                                            typeof plan.maxUsers === 'number' && plan.maxUsers > 0 ? `Max Users: ${plan.maxUsers}` : 'Unlimited Users',
                                            typeof plan.maxTables === 'number' && plan.maxTables > 0 ? `Max Tables: ${plan.maxTables}` : 'Unlimited Tables',
                                            typeof plan.maxOrders === 'number' && plan.maxOrders > 0 ? `Max Orders/mo: ${plan.maxOrders}` : 'Unlimited Orders',
                                            typeof plan.maxSms === 'number' && plan.maxSms > 0 ? `Max SMS/mo: ${plan.maxSms}` : 'Unlimited SMS',
                                            typeof (plan.maxEmail ?? plan.maxEmails) === 'number' && (plan.maxEmail ?? plan.maxEmails)! > 0
                                                ? `Max Emails/mo: ${plan.maxEmail ?? plan.maxEmails}`
                                                : 'Unlimited Emails',
                                        ];
                                        return (
                                            <>
                                                <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                                                    Limits:
                                                </Typography>
                                                {limitItems.map((item, j) => (
                                                    <Typography key={j} variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                                                        • {item}
                                                    </Typography>
                                                ))}

                                                <Typography variant="body2" fontWeight={700} sx={{ mt: 1.5, mb: 0.5 }}>
                                                    {basePlan ? `Everything in ${basePlan.name}, plus:` : 'Features:'}
                                                </Typography>
                                                <Stack spacing={0.4}>
                                                    {extra.map((feature, index) => (
                                                        <Stack key={index} direction="row" spacing={1} alignItems="center">
                                                            <Check color="success" fontSize="small" />
                                                            <Typography variant="body2">{planFeatureLabel(feature)}</Typography>
                                                        </Stack>
                                                    ))}
                                                </Stack>
                                            </>
                                        );
                                    })()}
                                </CardContent>
                                <Box sx={{ p: 1.5, textAlign: 'center' }}>
                                    {isCurrentPlan && isActive ? (
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            color="primary"
                                            size="medium"
                                            disabled
                                            sx={{ opacity: 1, '&.Mui-disabled': { bgcolor: '#4F46E5', color: '#fff', opacity: 0.8 } }}
                                        >
                                            ✓ Current Plan
                                        </Button>
                                    ) : (
                                        <Button
                                            fullWidth
                                            variant={isYearly ? 'contained' : 'outlined'}
                                            color="primary"
                                            size="medium"
                                            onClick={() => handleSubscribeClick(plan)}
                                            disabled={!!subscribing}
                                        >
                                            {subscribing === plan._id ? (
                                                <CircularProgress size={24} />
                                            ) : (isCurrentPlan && isTrial) ? (
                                                'Subscribe Now'
                                            ) : (isCurrentPlan && currentTenant?.subscriptionStatus === 'expired') ? (
                                                'Renew Plan'
                                            ) : isCurrentPlan ? (
                                                'Renew Plan'
                                            ) : (
                                                'Subscribe Now'
                                            )}
                                        </Button>
                                    )}
                                </Box>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
            ) : topupPlans.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography color="text.secondary">No top-up plans are available right now.</Typography>
                </Box>
            ) : (
                <Grid container spacing={3} justifyContent="center">
                    {topupPlans.map((plan) => {
                        const resourceLabel = RESOURCE_LABELS[plan.resourceType] ?? plan.resourceType;
                        return (
                            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={plan._id}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        maxWidth: 280,
                                        mx: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        position: 'relative',
                                        border: `1px solid ${theme.palette.divider}`,
                                        bgcolor: theme.palette.background.paper,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            transform: 'scale(1.02)',
                                            boxShadow: theme.palette.mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.4)' : 6,
                                        },
                                    }}
                                >
                                    <CardHeader
                                        title={plan.name}
                                        subheader={plan.description}
                                        titleTypographyProps={{ align: 'center', variant: 'h6', fontWeight: 'bold', color: 'text.primary', sx: { fontSize: { xs: '1rem', sm: '1.1rem' } } }}
                                        subheaderTypographyProps={{ align: 'center', color: 'text.secondary', sx: { fontSize: '0.75rem' } }}
                                        sx={{
                                            bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.1) : 'grey.100',
                                            pb: 0,
                                            pt: 1.5,
                                        }}
                                    />
                                    <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 1.5 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                            <Typography component="h2" variant="h4" color="text.primary" sx={{ fontSize: { xs: '1.4rem', sm: '1.9rem' } }}>
                                                {formatCurrency(plan.price)}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                                /one-time
                                            </Typography>
                                        </Box>
                                        <Divider sx={{ my: 1 }} />
                                        <List dense disablePadding>
                                            <ListItem disableGutters sx={{ py: 0.25 }}>
                                                <ListItemIcon sx={{ minWidth: 28 }}>
                                                    <Check color="success" fontSize="small" />
                                                </ListItemIcon>
                                                <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={`${plan.resourceCount.toLocaleString()} ${resourceLabel}`} />
                                            </ListItem>
                                            <ListItem disableGutters sx={{ py: 0.25 }}>
                                                <ListItemIcon sx={{ minWidth: 28 }}>
                                                    <Check color="success" fontSize="small" />
                                                </ListItemIcon>
                                                <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary="Credits never expire" />
                                            </ListItem>
                                            <ListItem disableGutters sx={{ py: 0.25 }}>
                                                <ListItemIcon sx={{ minWidth: 28 }}>
                                                    <Check color="success" fontSize="small" />
                                                </ListItemIcon>
                                                <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary="Used after your monthly allowance is exhausted" />
                                            </ListItem>
                                        </List>
                                    </CardContent>
                                    <Box sx={{ p: 1.5, textAlign: 'center' }}>
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            color="primary"
                                            size="small"
                                            onClick={() => handlePurchaseTopup(plan)}
                                            disabled={!!subscribing}
                                        >
                                            {subscribing === plan._id ? <CircularProgress size={20} /> : 'Buy Top-up'}
                                        </Button>
                                    </Box>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmDialog.open}
                onClose={handleCloseDialog}
                aria-labelledby="subscription-dialog-title"
                aria-describedby="subscription-dialog-description"
            >
                <DialogTitle id="subscription-dialog-title">
                    Confirm Subscription
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="subscription-dialog-description">
                        Are you sure you want to subscribe to the <strong>{confirmDialog.plan?.name}</strong> plan?
                        <br />
                        You will be charged <strong>{confirmDialog.plan && formatCurrency(confirmDialog.plan.price)}</strong> per {confirmDialog.plan?.interval}.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="inherit">
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmSubscription} variant="contained" color="primary" autoFocus>
                        Proceed to Payment
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SubscriptionPage;