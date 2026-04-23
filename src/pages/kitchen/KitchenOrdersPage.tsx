import {
    Refresh as RefreshIcon,
    Restaurant as RestaurantIcon,
    AccessTime as TimeIcon,
    Whatshot as FlameIcon,
    LocalPrintshop as PrintIcon,
    DoneAll as ReadyIcon,
    PlayArrow as ConfirmIcon,
    CancelOutlined as CancelItemIcon,
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
    useMediaQuery,
    Button,
    Checkbox,
    Stack,
    Tabs,
    Tab,
    Paper,
    Badge
} from '@mui/material';
import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { ordersAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

const KitchenOrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { formatCurrency } = useSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [tabValue, setTabValue] = useState(0);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const response = await ordersAPI.getActive();
            const ordersData = Array.isArray(response.data) ? response.data : [];
            const kitchenOrders = ordersData.filter((order: any) =>
                !['ready_to_takeaway', 'ready_to_pickup', 'on_the_way', 'served', 'delivered', 'completed', 'cancelled'].includes(order.status)
            );
            setOrders(kitchenOrders);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            await ordersAPI.update(orderId, { status: newStatus });
            toast.success(`Order ${newStatus}`);
            fetchOrders();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    const handleItemStatusToggle = async (orderId: string, itemIndex: number, currentStatus: string) => {
        const newStatus = currentStatus === 'ready' ? 'preparing' : 'ready';
        try {
            await ordersAPI.updateItemStatus(orderId, itemIndex, newStatus);
            fetchOrders();
        } catch (error) {
            console.error('Error updating item status:', error);
            toast.error('Failed to update item');
        }
    };

    const handleMarkAllReady = async (orderId: string) => {
        try {
            await ordersAPI.updateAllItemsStatus(orderId, 'ready');
            toast.success('All items marked ready');
            fetchOrders();
        } catch (error) {
            console.error('Error marking all ready:', error);
            toast.error('Failed to update items');
        }
    };

    const filteredOrders = orders.filter((order) => {
        const matchTab = tabValue === 0 ? !order.isPreOrder : order.isPreOrder;
        const matchType = orderTypeFilter === 'all' || order.orderType === orderTypeFilter;
        const matchStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchTab && matchType && matchStatus;
    });

    const DesktopStatBadge = ({ label, count, color, isActive, onClick, urgent }: any) => (
        <Box
            onClick={onClick}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1.5,
                py: 0.4,
                borderRadius: 4,
                border: `1.5px solid ${urgent ? '#F87171' : alpha(color, 0.4)}`,
                bgcolor: urgent ? alpha('#F87171', 0.05) : isActive ? alpha(color, 0.05) : 'transparent',
                color: urgent ? '#EF4444' : color,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                    bgcolor: urgent ? alpha('#F87171', 0.1) : alpha(color, 0.1),
                }
            }}
        >
            {urgent && <FlameIcon sx={{ fontSize: 18, mr: 0.5 }} />}
            <Typography variant="body2" fontWeight={700} sx={{ mr: 0.5 }}>{count}</Typography>
            <Typography variant="caption" fontWeight={600} sx={{ opacity: 0.8 }}>{label}</Typography>
        </Box>
    );

    const DesktopOrderCard = ({ order }: { order: any }) => {
        const readyItems = order.items?.filter((item: any) => item.preparationStatus === 'ready').length || 0;
        const totalItems = order.items?.length || 0;
        const progress = totalItems > 0 ? (readyItems / totalItems) * 100 : 0;
        const timeAgo = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true });
        
        return (
            <Card sx={{
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                bgcolor: '#F5F5F5',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #EDEDED',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-2px)' }
            }}>
                <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: -0.5 }}>#{order.dailyTokenNumber}</Typography>
                            <FlameIcon sx={{ color: '#EF4444', fontSize: 20 }} />
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: '#9CA3AF' }}>
                            <TimeIcon sx={{ fontSize: 16 }} />
                            <Typography variant="caption" fontWeight={600}>{timeAgo}</Typography>
                        </Stack>
                    </Box>

                    <Typography variant="body1" fontWeight={700} sx={{ color: '#4F46E5', mb: 1.5 }}>
                        {order.customer?.name || order.guestInfo?.firstName || 'Guest'}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <Chip
                            label={order.orderType?.replace('_', ' ').toUpperCase()}
                            size="small"
                            variant="outlined"
                            icon={<RestaurantIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{ bgcolor: '#fff', borderColor: '#E5E7EB', fontWeight: 700, borderRadius: 2, height: 26, fontSize: '0.65rem' }}
                        />
                        <Chip
                            label={order.status?.toUpperCase()}
                            size="small"
                            sx={{ bgcolor: '#F59E0B', color: '#fff', fontWeight: 800, borderRadius: 1.5, height: 26, fontSize: '0.65rem' }}
                        />
                    </Stack>

                    <Box sx={{ mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={700} color="#6B7280" sx={{ fontSize: '0.7rem' }}>Items Ready</Typography>
                            <Typography variant="caption" fontWeight={900} color="#F97316" sx={{ fontSize: '0.75rem' }}>{Math.round(progress)}%</Typography>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: '#D1D5DB',
                                '& .MuiLinearProgress-bar': { bgcolor: '#F97316', borderRadius: 3 }
                            }}
                        />
                    </Box>

                    <Box sx={{
                        maxHeight: 250,
                        overflowY: 'auto',
                        pr: 0.5,
                        '&::-webkit-scrollbar': { width: 4 },
                        '&::-webkit-scrollbar-thumb': { bgcolor: '#D1D5DB', borderRadius: 2 }
                    }}>
                        {order.items?.map((item: any, idx: number) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', mb: 1, position: 'relative' }}>
                                <Checkbox
                                    size="small"
                                    checked={item.preparationStatus === 'ready'}
                                    onChange={() => handleItemStatusToggle(order._id, idx, item.preparationStatus)}
                                    sx={{ p: 0, mr: 1, mt: 0.15, color: '#D1D5DB', '&.Mui-checked': { color: '#10B981' } }}
                                />
                                <Box sx={{ flex: 1 }}>
                                    <Typography
                                        variant="body2"
                                        fontWeight={item.preparationStatus === 'ready' ? 500 : 700}
                                        sx={{
                                            textDecoration: item.preparationStatus === 'ready' ? 'line-through' : 'none',
                                            color: item.preparationStatus === 'ready' ? '#9CA3AF' : '#111827',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {item.quantity}x {item.name}
                                    </Typography>
                                    {item.notes && (
                                        <Typography variant="caption" color="#6B7280" sx={{ display: 'flex', alignItems: 'center', mt: 0, fontWeight: 600, fontSize: '0.7rem' }}>
                                            <FlameIcon sx={{ fontSize: 12, mr: 0.3, color: '#4B5563' }} /> Spice: {item.notes}
                                        </Typography>
                                    )}
                                </Box>
                                <IconButton size="small" sx={{ p: 0.2, ml: 0.5, color: '#F87171', opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                    <CancelItemIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                </CardContent>

                <Stack spacing={1.5} sx={{ p: 2.5, pt: 0 }}>
                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<PrintIcon sx={{ fontSize: '18px !important' }} />}
                        sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontWeight: 700,
                            bgcolor: '#EEF2FF',
                            color: '#4F46E5',
                            py: 1,
                            fontSize: '0.9rem',
                            border: '1.5px solid #E0E7FF',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#E0E7FF', boxShadow: 'none' }
                        }}
                    >
                        Print KOT
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<ReadyIcon sx={{ fontSize: '18px !important' }} />}
                        onClick={() => handleMarkAllReady(order._id)}
                        sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontWeight: 700,
                            bgcolor: '#ECFDF5',
                            color: '#10B981',
                            py: 1,
                            fontSize: '0.9rem',
                            border: '1.5px solid #D1FAE5',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#D1FAE5', boxShadow: 'none' }
                        }}
                    >
                        Mark All Ready
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<ConfirmIcon sx={{ color: '#000', fontSize: '20px !important' }} />}
                        onClick={() => handleStatusChange(order._id, 'preparing')}
                        sx={{
                            borderRadius: 3,
                            textTransform: 'none',
                            fontWeight: 800,
                            bgcolor: '#F59E0B',
                            color: '#000',
                            py: 1.2,
                            fontSize: '1rem',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#D97706', boxShadow: 'none' }
                        }}
                    >
                        Confirm
                    </Button>
                </Stack>
            </Card>
        );
    };

    if (isMobile) {
        return (
            <Box sx={{ p: 1.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center' }}>Kitchen Display</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                        {[
                            { label: 'Pending', value: 'pending', color: '#f59e0b' },
                            { label: 'Preparing', value: 'preparing', color: '#f97316' },
                            { label: 'Ready', value: 'ready', color: '#0284c7' },
                            { label: 'Total Active', value: 'all', color: '#6366f1' }
                        ].map((item) => (
                            <Chip
                                key={item.value}
                                label={item.label}
                                onClick={() => setStatusFilter(item.value)}
                                size="small"
                                sx={{
                                    bgcolor: statusFilter === item.value ? item.color : 'transparent',
                                    color: statusFilter === item.value ? '#fff' : item.color,
                                    border: `1px solid ${item.color}`,
                                    borderRadius: 1.5,
                                    fontSize: '0.62rem'
                                }}
                            />
                        ))}
                        <IconButton onClick={fetchOrders} size="small"><RefreshIcon fontSize="small" /></IconButton>
                    </Box>
                </Box>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress color="warning" /></Box>
                ) : filteredOrders.length === 0 ? (
                    <Typography align="center" sx={{ p: 5 }}>No active orders.</Typography>
                ) : (
                    <Grid container spacing={2}>
                        {filteredOrders.map((order) => (
                            <Grid item xs={12} key={order._id}>
                                <Card sx={{ borderLeft: `6px solid ${theme.palette.warning.main}` }}>
                                    <CardContent>
                                        <Typography variant="h6" fontWeight="bold">Token: {order.dailyTokenNumber}</Typography>
                                        <Typography variant="body2">{order.orderType?.toUpperCase()}</Typography>
                                        <Typography variant="caption" color="text.secondary">Items: {order.items?.length}</Typography>
                                        <Button fullWidth variant="contained" color="warning" size="small" sx={{ mt: 1 }} onClick={() => handleStatusChange(order._id, 'preparing')}>Confirm</Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>
        );
    }

    return (
        <Box sx={{ p: 4, bgcolor: '#FFFFFF', minHeight: '100vh' }}>
            {/* Desktop Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h3" fontWeight={900} sx={{ color: '#111827', fontSize: '2.5rem' }}>Kitchen Orders</Typography>
                
                <Stack direction="row" spacing={1.2} alignItems="center">
                    <DesktopStatBadge label="Urgent" count={orders.filter(o => o.status === 'pending').length} color="#EF4444" urgent />
                    <DesktopStatBadge label="Pending" count={orders.filter(o => o.status === 'pending').length} color="#F59E0B" isActive={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} />
                    <DesktopStatBadge label="Preparing" count={orders.filter(o => o.status === 'preparing').length} color="#0EA5E9" isActive={statusFilter === 'preparing'} onClick={() => setStatusFilter('preparing')} />
                    <DesktopStatBadge label="Ready" count={orders.filter(o => o.status === 'ready').length} color="#10B981" isActive={statusFilter === 'ready'} onClick={() => setStatusFilter('ready')} />
                    
                    <Badge badgeContent="99+" color="error" sx={{ '& .MuiBadge-badge': { bgcolor: '#4F46E5', fontWeight: 800, fontSize: '0.65rem' } }}>
                        <Button
                            variant="contained"
                            sx={{
                                bgcolor: '#4F46E5',
                                borderRadius: 3,
                                textTransform: 'none',                                fontWeight: 800,
                                px: 2,
                                py: 0.8,
                                boxShadow: 'none',
                                '&:hover': { bgcolor: '#4338CA', boxShadow: 'none' }
                            }}
                        >
                            Total Active
                        </Button>
                    </Badge>

                    <IconButton 
                        onClick={fetchOrders} 
                        sx={{ 
                            color: '#4F46E5',
                            p: 0.5,
                            '&:hover': { bgcolor: alpha('#4F46E5', 0.1) }
                        }}
                    >
                        <RefreshIcon />
                    </IconButton>
                </Stack>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ 
                    minHeight: 'auto',
                    '& .MuiTabs-indicator': { bgcolor: '#4F46E5', height: 3 },
                    '& .MuiTab-root': { 
                        textTransform: 'none', 
                        fontWeight: 700, 
                        fontSize: '1.2rem', 
                        minWidth: 'auto', 
                        px: 0, 
                        mr: 3,
                        color: '#9CA3AF',
                        '&.Mui-selected': { color: '#4F46E5' }
                    }
                }}>
                    <Tab label="Live Orders" />
                    <Tab label="Pre-Orders" />
                </Tabs>

                <Stack direction="row" spacing={1.2}>
                    {[
                        { label: 'All Types', value: 'all' },
                        { label: 'Dine In', value: 'dine_in', icon: <RestaurantIcon sx={{ fontSize: 18 }} /> },
                        { label: 'Takeaway', value: 'takeaway' },
                        { label: 'Delivery', value: 'delivery' }
                    ].map((filter) => (
                        <Chip
                            key={filter.value}
                            label={filter.label}
                            icon={filter.icon}
                            onClick={() => setOrderTypeFilter(filter.value)}
                            sx={{
                                bgcolor: orderTypeFilter === filter.value ? '#E5E7EB' : 'transparent',
                                border: '1.5px solid #E5E7EB',
                                fontWeight: 700,
                                borderRadius: 4,
                                height: 32,
                                px: 1,
                                fontSize: '0.85rem',
                                '&:hover': { bgcolor: '#F3F4F6' },
                                '& .MuiChip-icon': { color: 'inherit' }
                            }}
                        />
                    ))}
                </Stack>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress color="warning" /></Box>
            ) : filteredOrders.length === 0 ? (
                <Paper sx={{ p: 10, textAlign: 'center', borderRadius: 4, bgcolor: 'transparent', border: '1px dashed #D1D5DB', boxShadow: 'none' }}>
                    <Typography variant="h6" color="#9CA3AF">No active orders in this category.</Typography>
                </Paper>
            ) : (
                <Grid container spacing={3.5}>
                    {filteredOrders.map(order => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={order._id}>
                            <DesktopOrderCard order={order} />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};

export default KitchenOrdersPage;