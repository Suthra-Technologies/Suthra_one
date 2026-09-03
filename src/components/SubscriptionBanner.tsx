import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, IconButton, Paper } from '@mui/material';
import { Close as CloseIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// How long the warning stays dismissed before re-appearing.
const SNOOZE_MS = 60 * 60 * 1000; // 1 hour
const SNOOZE_KEY = 'subscriptionWarningDismissedAt';

const SubscriptionBanner: React.FC = () => {
    const { user, tenantSlug } = useAuth();
    const navigate = useNavigate();

    // `snoozedUntil` = timestamp the warning is hidden until (0 = visible).
    const [snoozedUntil, setSnoozedUntil] = useState<number>(() => {
        const raw = Number(localStorage.getItem(SNOOZE_KEY) || 0);
        return raw && Date.now() - raw < SNOOZE_MS ? raw + SNOOZE_MS : 0;
    });

    // When snoozed, flip back to visible once the hour elapses (without a reload).
    useEffect(() => {
        if (!snoozedUntil) return;
        const remaining = snoozedUntil - Date.now();
        if (remaining <= 0) { setSnoozedUntil(0); return; }
        const t = setTimeout(() => setSnoozedUntil(0), remaining);
        return () => clearTimeout(t);
    }, [snoozedUntil]);

    if (!user?.tenant || typeof user.tenant !== 'object') return null;

    const { subscriptionStatus, trialEndsAt, subscriptionEndsAt } = user.tenant as any;

    // Show only for trial or expired subscriptions
    if (subscriptionStatus !== 'trial' && subscriptionStatus !== 'expired') return null;

    const endDate = subscriptionStatus === 'trial' ? trialEndsAt : subscriptionEndsAt;
    const daysRemaining = endDate
        ? Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

    // Hide if trial still has more than 3 days left
    if (subscriptionStatus === 'trial' && daysRemaining > 3) return null;

    // Respect the 1-hour snooze
    if (snoozedUntil) return null;

    const isExpired = subscriptionStatus === 'expired' || (subscriptionStatus === 'trial' && daysRemaining <= 0);

    const handleClose = () => {
        const now = Date.now();
        localStorage.setItem(SNOOZE_KEY, String(now));
        setSnoozedUntil(now + SNOOZE_MS);
    };

    return (
        <Paper
            elevation={6}
            sx={{
                position: 'fixed',
                top: { xs: 'calc(64px + env(safe-area-inset-top))', sm: 80 },
                right: { xs: 8, sm: 16 },
                zIndex: 1300,
                width: { xs: 'calc(100vw - 16px)', sm: 360 },
                maxWidth: 'calc(100vw - 16px)',
                p: 1.5,
                borderRadius: 2,
                borderLeft: '5px solid',
                borderLeftColor: isExpired ? 'error.main' : 'warning.main',
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
            }}
        >
            <WarningIcon
                fontSize="small"
                sx={{ color: isExpired ? 'error.main' : 'warning.main', mt: 0.25, flexShrink: 0 }}
            />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: isExpired ? 'error.main' : 'warning.main' }}>
                    {isExpired ? 'Subscription expired' : 'Trial ending soon'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {isExpired
                        ? 'Please upgrade to continue using the system.'
                        : `Your free trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`}
                </Typography>
                <Button
                    variant="contained"
                    size="small"
                    color={isExpired ? 'error' : 'warning'}
                    onClick={() => navigate(`/${tenantSlug}/subscription`)}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    Upgrade Now
                </Button>
            </Box>
            <IconButton size="small" onClick={handleClose} aria-label="Dismiss" sx={{ flexShrink: 0, mt: -0.5, mr: -0.5 }}>
                <CloseIcon fontSize="small" />
            </IconButton>
        </Paper>
    );
};

export default SubscriptionBanner;
