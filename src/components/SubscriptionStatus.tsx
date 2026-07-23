import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, Popover } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { CalendarToday } from '@mui/icons-material';
import { tenantAPI } from '../services/api';
import SubscriptionStatusCard from './dashboard/SubscriptionStatusCard';

const SubscriptionStatus: React.FC = () => {
    const { hasRole } = useAuth();
    const [tenant, setTenant] = useState<any>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const fetchTenant = async () => {
            if (hasRole(['admin', 'manager'])) {
                try {
                    const res = await tenantAPI.getCurrent();
                    setTenant(res.data);
                } catch (error) {
                    console.error('Error fetching tenant status:', error);
                }
            }
        };
        fetchTenant();
    }, [hasRole]);

    if (!hasRole(['admin', 'manager']) || !tenant) return null;

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => setAnchorEl(null);
    const open = Boolean(anchorEl);

    const { subscriptionStatus, trialEndsAt, subscriptionEndsAt, currentPlan } = tenant;
    const expiryDate = subscriptionStatus === 'trial' ? trialEndsAt : subscriptionEndsAt;
    const daysRemaining = expiryDate ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

    const dayLabel = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`;

    let chipColor: 'default' | 'primary' | 'success' | 'warning' | 'error' = 'default';
    let statusText = '';

    if (subscriptionStatus === 'trial') {
        chipColor = daysRemaining <= 3 ? 'warning' : 'primary';
        // Only surface the countdown within the final week; otherwise just "Trial".
        statusText = daysRemaining <= 0
            ? 'Trial expired'
            : daysRemaining <= 7
                ? `Trial · expiring in ${dayLabel}`
                : 'Trial';
    } else if (subscriptionStatus === 'active') {
        chipColor = daysRemaining <= 7 ? 'warning' : 'success';
        // Only surface the countdown within the final week; otherwise the plan name.
        statusText = daysRemaining <= 0
            ? 'Expired'
            : daysRemaining <= 7
                ? `Expiring in ${dayLabel}`
                : (currentPlan?.name || 'Active');
    } else if (subscriptionStatus === 'expired') {
        chipColor = 'error';
        statusText = 'Expired';
    } else if (subscriptionStatus === 'cancelled') {
        chipColor = 'default';
        statusText = 'Cancelled';
    }

    const formatDateTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <>
            <Box
                onClick={handleClick}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mr: 2,
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8 },
                }}
            >
                <Chip label={statusText} color={chipColor} size="small" sx={{ fontWeight: 600 }} />
                {currentPlan?.name && statusText !== currentPlan.name && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 0.5, display: { xs: 'none', sm: 'block' } }}
                    >
                        {currentPlan.name}
                    </Typography>
                )}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5, ml: 1 }}>
                    <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                        <strong>{tenant.createdAt ? formatDateTime(tenant.createdAt) : 'N/A'}</strong> — <strong>{formatDateTime(expiryDate)}</strong>
                    </Typography>
                </Box>
            </Box>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ sx: { mt: 1.5, borderRadius: 2, boxShadow: 3 } }}
            >
                <Box sx={{ width: 320 }}>
                    <SubscriptionStatusCard tenant={tenant} />
                </Box>
            </Popover>
        </>
    );
};

export default SubscriptionStatus;
