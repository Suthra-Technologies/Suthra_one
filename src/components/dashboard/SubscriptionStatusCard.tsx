import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    Button,
    useTheme,
    alpha,
    LinearProgress
} from '@mui/material';
import { LocalShipping, Star, AccessTime, Warning } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface SubscriptionStatusCardProps {
    tenant: any;
    loading?: boolean;
}

const SubscriptionStatusCard: React.FC<SubscriptionStatusCardProps> = ({ tenant, loading }) => {
    const theme = useTheme();
    const navigate = useNavigate();

    if (loading) {
        return (
            <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LinearProgress sx={{ width: '80%' }} />
            </Card>
        );
    }

    if (!tenant) return null;

    const { subscriptionStatus, trialEndsAt, subscriptionEndsAt, currentPlan } = tenant;

    // Determine status color and icon
    let statusColor = 'primary';
    let StatusIcon = Star;
    let statusLabel = 'Active';

    if (subscriptionStatus === 'trial') {
        statusColor = 'info';
        StatusIcon = AccessTime;
        statusLabel = 'Free Trial';
    } else if (subscriptionStatus === 'expired' || subscriptionStatus === 'cancelled') {
        statusColor = 'error';
        StatusIcon = Warning;
        statusLabel = subscriptionStatus === 'expired' ? 'Expired' : 'Cancelled';
    } else if (subscriptionStatus === 'active') {
        statusColor = 'success';
        StatusIcon = Star;
        statusLabel = 'Active Plan';
    }

    // State for dynamic days remaining
    const [daysRemaining, setDaysRemaining] = React.useState(() => {
        const end = new Date(subscriptionStatus === 'trial' ? trialEndsAt : subscriptionEndsAt);
        const now = new Date();
        return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    });

    // Effect to update days remaining every hour
    React.useEffect(() => {
        const interval = setInterval(() => {
            const end = new Date(subscriptionStatus === 'trial' ? trialEndsAt : subscriptionEndsAt);
            const now = new Date();
            const remaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            setDaysRemaining(remaining);
        }, 60 * 60 * 1000); // every hour
        return () => clearInterval(interval);
    }, [subscriptionStatus, trialEndsAt, subscriptionEndsAt]);

    // Format date
    // Format date
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(subscriptionStatus === 'trial' ? trialEndsAt : subscriptionEndsAt));

    const planName = currentPlan?.name || (subscriptionStatus === 'trial' ? 'Trial Plan' : 'Active Plan');

    return (
        <Card
            sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${alpha(theme.palette[statusColor as any].main, 0.1)} 0%, ${alpha(
                    theme.palette[statusColor as any].main,
                    0.05
                )} 100%)`,
                border: `1px solid ${alpha(theme.palette[statusColor as any].main, 0.2)}`,
                position: 'relative',
                overflow: 'visible'
            }}
        >
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography variant="overline" color="text.secondary" fontWeight="bold">
                            CURRENT PLAN
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color={`${statusColor}.main`} sx={{ mb: 0.5 }}>
                            {planName}
                        </Typography>
                        <Chip
                            icon={<StatusIcon fontSize="small" />}
                            label={statusLabel}
                            color={statusColor as any}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                        />
                    </Box>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette[statusColor as any].main, 0.1),
                            color: `${statusColor}.main`,
                            display: 'flex'
                        }}
                    >
                        <LocalShipping />
                    </Box>
                </Box>

                <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                        {daysRemaining > 0 ? (
                            <>
                                {subscriptionStatus === 'trial' ? 'Trial ends' : 'Renews'} on <b>{formattedDate}</b>
                            </>
                        ) : (
                            <span style={{ color: theme.palette.error.main, fontWeight: 'bold' }}>
                                Plan expired on {formattedDate}
                            </span>
                        )}
                    </Typography>

                    {daysRemaining > 0 && daysRemaining <= 7 && (
                        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5, fontWeight: 'bold' }}>
                            ⚠️ {daysRemaining} days remaining
                        </Typography>
                    )}
                </Box>

                {(subscriptionStatus === 'trial' || subscriptionStatus === 'expired' || daysRemaining <= 7) && (
                    <Button
                        variant="contained"
                        color={statusColor as any}
                        fullWidth
                        size="small"
                        sx={{ mt: 2 }}
                        onClick={() => navigate('/subscription')}
                    >
                        Upgrade Plan
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};

export default SubscriptionStatusCard;
