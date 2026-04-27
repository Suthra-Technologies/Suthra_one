import {
    Refresh as RefreshIcon,
    Restaurant as RestaurantIcon,
    AccessTime as TimeIcon,
    DoneAll as ReadyIcon,
    PlayArrow as ConfirmIcon,
    Fastfood as TakeawayIcon,
    DeliveryDining as DeliveryIcon,
} from '@mui/icons-material';
import {
    alpha,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    LinearProgress,
    Typography,
    useTheme,
    Button,
    Stack,
    Paper,
} from '@mui/material';
import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';
import { ordersAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';

const KitchenOrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();
    const theme = useTheme();
    const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const response = await ordersAPI.getActive();
            const ordersData = Array.isArray(response.data) ? response.data : [];
            // Filter out completed/cancelled for KDS
            const kitchenOrders = ordersData.filter((order: any) =>
                !['served', 'delivered', 'completed', 'cancelled'].includes(order.status)
            );
            setOrders(kitchenOrders);
        } catch (error) {
            console.error('Error fetching orders:', error);
            // toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        
        if (socket) {
            const handleOrderUpdate = () => fetchOrders();
            socket.on('newOrder', handleOrderUpdate);
            socket.on('orderStatusUpdate', handleOrderUpdate);
            return () => {
                socket.off('newOrder', handleOrderUpdate);
                socket.off('orderStatusUpdate', handleOrderUpdate);
            };
        }
    }, [fetchOrders, socket]);

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            await ordersAPI.update(orderId, { status: newStatus });
            toast.success(`Order ${newStatus.replace('_', ' ')}`);
            fetchOrders();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    const filteredOrders = orders.filter((order) => {
        const matchType = orderTypeFilter === 'all' || order.orderType === orderTypeFilter;
        const matchStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchType && matchStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#F59E0B';
            case 'preparing': return '#F97316';
            case 'ready': return '#0284C7';
            default: return '#6366F1';
        }
    };

    const OrderCard = ({ order }: { order: any }) => {
        const readyItems = order.items?.filter((item: any) => item.preparationStatus === 'ready').length || 0;
        const totalItems = order.items?.length || 0;
        const progress = totalItems > 0 ? (readyItems / totalItems) * 100 : 0;
        const statusColor = getStatusColor(order.status);
        
        // Format time to 05:06 PM
        const timeStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

        const getOrderIcon = () => {
            if (order.orderType === 'dine_in') return <RestaurantIcon sx={{ fontSize: 20 }} />;
            if (order.orderType === 'takeaway') return <TakeawayIcon sx={{ fontSize: 20 }} />;
            return <DeliveryIcon sx={{ fontSize: 20 }} />;
        };

        return (
            <Card sx={{
                borderRadius: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'hidden',
                borderLeft: `8px solid ${statusColor}`,
                bgcolor: '#fff',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#0284C7', display: 'flex', alignItems: 'center', fontSize: { xs: '1.05rem', sm: '1.5rem' } }}>
                            Token No: {order.dailyTokenNumber || '--'}
                        </Typography>
                        <Chip
                            label={order.status?.toUpperCase() || 'PENDING'}
                            size="small"
                            sx={{
                                bgcolor: alpha(statusColor, 0.1),
                                color: statusColor,
                                fontWeight: 900,
                                borderRadius: '8px',
                                px: 1,
                                height: 28,
                                fontSize: { xs: '0.62rem', sm: '0.7rem' }
                            }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getOrderIcon()}
                            <Typography sx={{ fontWeight: 900, color: '#374151', fontSize: { xs: '0.78rem', sm: '0.9rem' }, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {order.orderType?.replace(/_/g, ' ')}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#6B7280' }}>
                            <TimeIcon sx={{ fontSize: 20 }} />
                            <Typography sx={{ fontWeight: 600, fontSize: { xs: '0.78rem', sm: '0.9rem' } }}>{timeStr}</Typography>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography sx={{ fontWeight: 600, color: '#4B5563', fontSize: { xs: '0.74rem', sm: '0.85rem' } }}>
                                Items Ready ({readyItems}/{totalItems})
                            </Typography>
                            <Typography sx={{ fontWeight: 900, color: '#EF4444', fontSize: { xs: '0.74rem', sm: '0.85rem' } }}>
                                {Math.round(progress)}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                                height: 6,
                                borderRadius: 10,
                                bgcolor: '#F3F4F6',
                                '& .MuiLinearProgress-bar': { bgcolor: '#EF4444', borderRadius: 10 }
                            }}
                        />
                    </Box>

                    <Box sx={{
                        bgcolor: '#FFFBEB',
                        borderRadius: '16px',
                        p: 1.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 'auto'
                    }}>
                        <Typography sx={{ fontWeight: 700, color: '#92400E', fontSize: { xs: '0.68rem', sm: '0.8rem' }, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            TOTAL ITEMS
                        </Typography>
                        <Typography sx={{ fontWeight: 900, color: '#F59E0B', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                            {totalItems}
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#F9FAFB', minHeight: '100vh' }}>
            {/* Header section */}
            <Typography variant="h4" sx={{ fontWeight: 900, textAlign: 'center', mb: 3, color: '#111827', fontSize: { xs: '1.35rem', sm: '2.125rem' } }}>
                Kitchen Display
            </Typography>

            {/* Statistics */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center', mb: 4 }}>
                {[
                    { label: 'Pending', count: orders.filter(o => o.status === 'pending').length, color: '#F59E0B', value: 'pending' },
                    { label: 'Preparing', count: orders.filter(o => o.status === 'preparing' || o.status === 'confirmed').length, color: '#F97316', value: 'preparing' },
                    { label: 'Ready', count: orders.filter(o => o.status === 'ready' || o.status.startsWith('ready_')).length, color: '#0284C7', value: 'ready' },
                    { label: 'Total Active', count: orders.length, color: '#6366F1', value: 'all' }
                ].map((stat) => (
                    <Box
                        key={stat.label}
                        onClick={() => setStatusFilter(stat.value)}
                        sx={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            px: 2,
                            py: 0.8,
                            borderRadius: '100px',
                            border: `2px solid ${stat.color}`,
                            bgcolor: statusFilter === stat.value ? stat.color : 'transparent',
                            color: statusFilter === stat.value ? '#fff' : stat.color,
                            transition: 'all 0.2s',
                            boxShadow: statusFilter === stat.value ? `0 4px 12px ${alpha(stat.color, 0.2)}` : 'none',
                        }}
                    >
                        <Typography sx={{ fontWeight: 900, fontSize: { xs: '0.9rem', sm: '1rem' }, mr: 1 }}>{stat.count}</Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.74rem', sm: '0.85rem' } }}>{stat.label}</Typography>
                    </Box>
                ))}
                <IconButton onClick={fetchOrders} sx={{ bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <RefreshIcon />
                </IconButton>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center', mb: 5 }}>
                {[
                    { label: 'All Types', value: 'all' },
                    { label: 'Dine In', value: 'dine_in' },
                    { label: 'Takeaway', value: 'takeaway' },
                    { label: 'Delivery', value: 'delivery' }
                ].map((type) => (
                    <Chip
                        key={type.value}
                        label={type.label}
                        onClick={() => setOrderTypeFilter(type.value)}
                        sx={{
                            bgcolor: orderTypeFilter === type.value ? '#E5E7EB' : '#fff',
                            fontWeight: 700,
                            fontSize: { xs: '0.72rem', sm: '0.8125rem' },
                            px: 1,
                            height: 36,
                            borderRadius: '12px',
                            border: '1px solid #E5E7EB',
                            '&:hover': { bgcolor: '#F3F4F6' }
                        }}
                    />
                ))}
            </Box>

            {/* Content Area */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress color="warning" /></Box>
            ) : filteredOrders.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10, bgcolor: '#fff', borderRadius: '32px', border: '2px dashed #E5E7EB' }}>
                    <Typography variant="h6" color="text.secondary" fontWeight={600}>No active kitchen orders found.</Typography>
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {filteredOrders.map(order => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={order._id}>
                            <OrderCard order={order} />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};

export default KitchenOrdersPage;