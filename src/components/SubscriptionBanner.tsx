import React from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SubscriptionBanner: React.FC = () => {
    const { user, tenantSlug } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();

    if (!user?.tenant) return null;

    const { subscriptionStatus, trialEndsAt, subscriptionEndsAt } = user.tenant as any;

    // Show banner only for trial or expired subscriptions
    if (subscriptionStatus !== 'trial' && subscriptionStatus !== 'expired') return null;

    // Determine the relevant end date
    const endDate = subscriptionStatus === 'trial' ? trialEndsAt : subscriptionEndsAt;
    const daysRemaining = endDate
        ? Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

    // Hide banner if trial has more than 3 days left
    if (subscriptionStatus === 'trial' && daysRemaining > 3) return null;

    const isExpired = subscriptionStatus === 'expired' || (subscriptionStatus === 'trial' && daysRemaining <= 0);

    return (
        <Box
            sx={{
                bgcolor: isExpired ? 'error.main' : 'warning.main',
                color: isExpired ? 'error.contrastText' : 'warning.contrastText',
                p: 1,
                textAlign: 'center',
                position: 'sticky',
                top: 64, // Below AppBar
                zIndex: 1100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2,
            }}
        >
            <Typography variant="body2" fontWeight="bold">
                {isExpired
                    ? 'Your subscription has expired. Please upgrade to continue using the system.'
                    : `Your free trial ends in ${daysRemaining} days.`}
            </Typography>
            <Button
                variant="contained"
                size="small"
                color={isExpired ? 'secondary' : 'primary'}
                onClick={() => navigate(`/${tenantSlug}/subscription`)}
                sx={{
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    '&:hover': { bgcolor: 'background.default' },
                }}
            >
                Upgrade Now
            </Button>
        </Box>
    );
};

export default SubscriptionBanner;
