import {
    Inventory2 as InventoryIcon,
    PendingActions as PendingIcon,
    ReceiptLong as OrdersIcon,
    Storefront as StoreIcon,
    TaskAlt as ReceivedIcon,
} from '@mui/icons-material';
import {
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { providerPortalAPI } from '../../services/api';

const ACCENT = '#00695c';

const STATUS_COLOR: Record<string, 'warning' | 'success' | 'default'> = {
    placed: 'warning',
    received: 'success',
    cancelled: 'default',
};

/** Landing page of the Material Provider Portal: order counts and recent activity. */
const ProviderDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const providerName = (user as any)?.firstName || 'Provider';

    const [summary, setSummary] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        providerPortalAPI.summary()
            .then((res) => { if (!cancelled) setSummary(res.data); })
            .catch(() => { /* tiles fall back to zero; nothing actionable for the provider */ })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const counts = summary?.counts || { placed: 0, received: 0, cancelled: 0, total: 0 };

    const tiles = [
        { key: 'total', icon: <OrdersIcon />, label: 'Total Orders', value: counts.total, to: '/provider/orders' },
        { key: 'placed', icon: <PendingIcon />, label: 'Awaiting Delivery', value: counts.placed, to: '/provider/orders?status=placed' },
        { key: 'received', icon: <ReceivedIcon />, label: 'Received', value: counts.received, to: '/provider/orders?status=received' },
        { key: 'restaurants', icon: <StoreIcon />, label: 'Restaurants', value: summary?.restaurantCount || 0, to: '/provider/orders' },
    ];

    return (
        <Box sx={{ pb: 4 }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    mb: 3,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${ACCENT} 0%, #004d40 100%)`,
                    color: '#fff',
                }}
            >
                <Typography variant="h5" fontWeight={700}>Welcome, {providerName}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>{user?.email}</Typography>
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress sx={{ color: ACCENT }} />
                </Box>
            ) : (
                <>
                    <Stack
                        direction="row"
                        spacing={2}
                        flexWrap="wrap"
                        useFlexGap
                        sx={{ mb: 3 }}
                    >
                        {tiles.map((tile) => (
                            <Card
                                key={tile.key}
                                variant="outlined"
                                onClick={() => navigate(tile.to)}
                                sx={{
                                    flex: '1 1 180px',
                                    minWidth: 150,
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'border-color .15s',
                                    '&:hover': { borderColor: ACCENT },
                                }}
                            >
                                <CardContent>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: ACCENT, mb: 1 }}>
                                        {tile.icon}
                                    </Stack>
                                    <Typography variant="h4" fontWeight={700}>{tile.value}</Typography>
                                    <Typography variant="body2" color="text.secondary">{tile.label}</Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>

                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                        Recent Orders
                    </Typography>
                    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                        {(summary?.recent || []).length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <InventoryIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                                <Typography color="text.secondary">No orders yet.</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Orders placed by restaurants will appear here.
                                </Typography>
                            </Box>
                        ) : (
                            <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
                                {summary.recent.map((o: any) => (
                                    <Stack
                                        key={`${o.tenantSlug}-${o._id}`}
                                        direction="row"
                                        alignItems="center"
                                        spacing={1.5}
                                        sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                        onClick={() => navigate('/provider/orders')}
                                    >
                                        <Avatar src={o.restaurantLogo || undefined} sx={{ width: 32, height: 32, bgcolor: ACCENT, fontSize: '0.8rem' }}>
                                            {o.restaurantName?.charAt(0)?.toUpperCase()}
                                        </Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={600} noWrap>{o.restaurantName}</Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                                {(o.items || []).map((it: any) => it.name).join(', ') || o.orderText || '—'}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={o.status}
                                            size="small"
                                            color={STATUS_COLOR[o.status] || 'default'}
                                            sx={{ textTransform: 'capitalize' }}
                                        />
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                    </Paper>
                </>
            )}
        </Box>
    );
};

export default ProviderDashboardPage;
