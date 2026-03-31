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

    let chipColor: 'default' | 'primary' | 'success' | 'warning' | 'error' = 'default';
    let statusText = '';

    if (subscriptionStatus === 'trial') {
        chipColor = daysRemaining <= 3 ? 'warning' : 'primary';
        statusText = 'Trial';
    } else if (subscriptionStatus === 'active') {
        chipColor = daysRemaining <= 7 ? 'warning' : 'success';
        statusText = currentPlan?.name || 'Active';
    } else if (subscriptionStatus === 'expired') {
        chipColor = 'error';
        statusText = 'Expired';
    } else if (subscriptionStatus === 'cancelled') {
        chipColor = 'default';
        statusText = 'Cancelled';
    }

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });

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
                {currentPlan?.name && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 0.5, display: { xs: 'none', sm: 'block' } }}
                    >
                        {currentPlan.name} • {formatDate(expiryDate)}
                    </Typography>
                )}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }}>
                    <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                        {daysRemaining > 0 ? `${daysRemaining}d left` : formatDate(expiryDate)}
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
