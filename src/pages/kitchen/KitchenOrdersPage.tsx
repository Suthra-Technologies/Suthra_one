import {
    Refresh as RefreshIcon,
    Restaurant as RestaurantIcon,
    AccessTime as TimeIcon
} from '@mui/icons-material';
import {
    alpha,
    Box,
    Card,
    CardActions,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    LinearProgress,
    Menu,
    MenuItem,
    Typography,
    useTheme,
    useMediaQuery
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { ordersAPI } from '../../services/api';

const KitchenOrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedOrderType, setSelectedOrderType] = useState<string | null>(null);
    const { hasRole } = useAuth();
    const { formatCurrency } = useSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await ordersAPI.getActive();
            const ordersData = Array.isArray(response.data) ? response.data : [];
            // Filter orders that should not be in kitchen (e.g. ready for pickup/takeaway are usually at counter)
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
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleStatusClick = (event: React.MouseEvent<HTMLButtonElement>, order: any) => {
        setAnchorEl(event.currentTarget);
        setSelectedOrderId(order._id);
        setSelectedOrderType(order.orderType);
    };

    const handleStatusClose = () => {
        setAnchorEl(null);
        setSelectedOrderId(null);
        setSelectedOrderType(null);
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!selectedOrderId) return;

        try {
            await ordersAPI.update(selectedOrderId, { status: newStatus });
            toast.success('Order status updated');
            fetchOrders(); // Refresh list
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        } finally {
            handleStatusClose();
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
            case 'delivered':
                return 'success';
            case 'pending':
            case 'preparing':
                return 'warning';
            case 'cancelled':
                return 'error';
            case 'ready':
            case 'ready_to_pick':
            case 'in-progress':
                return 'info';
            default:
                return 'default';
        }
    };

    const getProgressColor = (progress: number) => {
        if (progress === 100) return 'success';
        if (progress >= 50) return 'info';
        if (progress > 0) return 'warning';
        return 'error';
    };

    const canManageOrders = hasRole(['admin', 'manager', 'kitchen_staff', 'food_runner']);

    const filteredOrders = orders.filter((order) => {
        const matchType =
            orderTypeFilter === 'all'
                ? true
                : order.orderType === orderTypeFilter;

        const matchStatus =
            statusFilter === 'all'
                ? true
                : order.status === statusFilter;

        return matchType && matchStatus;
    });



    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', md: 'flex-start' },
                    gap: 2,   // 🔥 NEW
                    mb: 4
                }}

            >
                {/* LEFT SIDE — Kitchen Orders Title */}
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 'bold',
                        color: { xs: '#000', md: 'inherit' },
                        background: { xs: 'none', md: 'linear-gradient(45deg, #FF9800 30%, #FF5722 90%)' },
                        WebkitBackgroundClip: { xs: 'none', md: 'text' },
                        WebkitTextFillColor: { xs: '#000', md: 'transparent' },
                        width: { xs: '100%', md: 'auto' },
                        textAlign: { xs: 'center', md: 'left' },
                        fontSize: { xs: '1.2rem', md: '2.125rem' }
                    }}
                >
                    Kitchen Display
                </Typography>

                {/* RIGHT SIDE — STATUS + FILTERS */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: { xs: 'center', md: 'flex-end' },
                        gap: 1,
                        width: { xs: '100%', md: 'auto' }
                    }}
                >
                    {/* STATUS ROW */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: { xs: 'wrap', md: 'wrap' },
                            gap: { xs: 0.5, md: 1 },
                            justifyContent: 'center',
                            width: '100%',
                        }}
                    >

                        {[
                            { label: 'Pending', value: 'pending', color: '#f59e0b' },
                            { label: 'Preparing', value: 'preparing', color: '#f97316' },
                            { label: 'Ready', value: 'ready', color: '#0284c7' },
                            { label: 'Total Active', value: 'all', color: '#6366f1' }
                        ].map((item) => {
                            const isActive = statusFilter === item.value;

                            const count =
                                item.value === 'all'
                                    ? orders.length
                                    : orders.filter(o => o.status === item.value).length;

                            return (
                                <Chip
                                    key={item.value}
                                    label={`${count} ${item.label}`}
                                    onClick={() => setStatusFilter(item.value)}
                                    clickable
                                    size="small"
                                    sx={{
                                        bgcolor: isActive ? item.color : 'transparent',
                                        color: isActive ? '#fff' : item.color,
                                        border: `1px solid ${item.color}`,
                                        fontWeight: 700,
                                        borderRadius: 1.5,
                                        cursor: 'pointer',
                                        fontSize: { xs: '0.62rem', md: '0.8125rem' },
                                        height: { xs: 24, md: 32 },
                                        px: { xs: 0, md: 0.5 }
                                    }}
                                />
                            );
                        })}

                        <IconButton
                            onClick={fetchOrders}
                            size={isMobile ? "small" : "medium"}
                            sx={{
                                bgcolor: theme.palette.mode === 'light' ? '#f3f4f6' : alpha(theme.palette.background.paper, 0.5),
                                p: { xs: 0.5, md: 1 }
                            }}
                        >
                            <RefreshIcon fontSize={isMobile ? "small" : "medium"} />
                        </IconButton>
                    </Box>

                    {/* TYPE ROW */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            justifyContent: { xs: 'flex-start', md: 'flex-end' },  // 🔥 NEW
                            width: '100%'  // 🔥 NEW
                        }}
                    >
                        {[
                            { label: 'All Types', value: 'all' },
                            { label: 'Dine In', value: 'dine_in' },
                            { label: 'Takeaway', value: 'takeaway' },
                            { label: 'Delivery', value: 'delivery' }
                        ].map((filter) => {
                            const isActive = orderTypeFilter === filter.value;

                            return (
                                <Chip
                                    key={filter.value}
                                    label={filter.label}
                                    onClick={() => setOrderTypeFilter(filter.value)}
                                    clickable
                                    sx={{
                                        bgcolor: isActive
                                            ? (theme.palette.mode === 'light' ? '#e5e7eb' : alpha(theme.palette.primary.main, 0.2))
                                            : (theme.palette.mode === 'light' ? '#f9fafb' : alpha(theme.palette.background.paper, 0.5)),
                                        border: `1px solid ${theme.palette.divider}`,
                                        color: theme.palette.text.primary,
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        cursor: 'pointer'
                                    }}
                                />
                            );
                        })}
                    </Box>
                </Box>
            </Box>



            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                    <CircularProgress color="warning" />
                </Box>
            ) : orders.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 5, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
                    <Typography variant="h6" color="text.secondary">
                        No active kitchen orders.
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
                    {filteredOrders.map((order) => (
                        <Grid
                            item
                            xs={12}
                            sm={6}
                            md={4}
                            lg={3}
                            key={order._id}
                        >
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: theme.shadows[8],
                                    },
                                    background: theme.palette.mode === 'dark'
                                        ? 'linear-gradient(145deg, #1e1e1e, #2d2d2d)'
                                        : 'linear-gradient(145deg, #ffffff, #f5f5f5)',
                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    borderLeft: `6px solid ${((theme.palette as any)[getStatusColor(order.status)]?.main || theme.palette.warning.main)
                                        }`
                                }}
                            >
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                                            <Typography variant="h6" color="info.main" sx={{ fontWeight: 'bold', mb: 0 }}>
                                                Token No: {order.dailyTokenNumber}
                                            </Typography>
                                            <Chip
                                                label={order.status?.replace(/_/g, ' ').toUpperCase()}
                                                color={getStatusColor(order.status) as any}
                                                size="small"
                                                sx={{ fontWeight: 'bold' }}
                                            />
                                        </Box>
                                    </Box>

                                    {/* Table Information (if applicable) */}
                                    {(order.orderType === 'dine_in' && (order.tableNumber || order.table)) && (
                                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 2 }}>
                                            Table: {order.tableNumber || order.table?.tableNumber || order.table?.number || order.table?.tableName || order.table?.name}
                                        </Typography>
                                    )}

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, color: 'text.secondary' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <RestaurantIcon fontSize="small" sx={{ mr: 1 }} />
                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                {order.orderType?.replace('_', ' ').toUpperCase()}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <TimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                                            <Typography variant="body2">
                                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Progress Bar */}
                                    {order.items && order.items.length > 0 && (() => {
                                        const readyItems = order.items.filter((item: any) => item.preparationStatus === 'ready').length;
                                        const progress = (readyItems / order.items.length) * 100;
                                        return (
                                            <Box sx={{ mt: 2, mb: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: '500' }}>
                                                        Items Ready ({readyItems}/{order.items.length})
                                                    </Typography>
                                                    <Typography variant="caption" fontWeight="bold" color={getProgressColor(progress) as any}>
                                                        {Math.round(progress)}%
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={progress}
                                                    color={getProgressColor(progress) as any}
                                                    sx={{
                                                        height: 6,
                                                        borderRadius: 3,
                                                        bgcolor: alpha(theme.palette.grey[500], 0.1)
                                                    }}
                                                />
                                            </Box>
                                        );
                                    })()}

                                    <Box
                                        sx={{
                                            mt: 1.5,
                                            p: 1.25,
                                            bgcolor: alpha(theme.palette.warning.main, 0.05),
                                            borderRadius: 1.5,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}`
                                        }}
                                    >
                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, fontSize: '0.75rem' }}>
                                            Total Items
                                        </Typography>
                                        <Typography variant="h6" color="warning.main" sx={{ fontWeight: 800, lineHeight: 1 }}>
                                            {order.items?.length || 0}
                                        </Typography>
                                    </Box>
                                </CardContent>

                                <CardActions sx={{ p: 2, pt: 0, justifyContent: 'flex-end' }}>
                                    {/* {canManageOrders && (
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="warning"
                                            endIcon={<MoreVertIcon />}
                                            onClick={(e) => handleStatusClick(e, order)}
                                        >
                                            Update Status
                                        </Button>
                                    )} */}
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleStatusClose}
            >
                <MenuItem onClick={() => handleStatusChange('confirmed')}>Confirm Order</MenuItem>
                <MenuItem onClick={() => handleStatusChange('preparing')}>Preparing</MenuItem>
                {selectedOrderType === 'dine_in' && (
                    <MenuItem onClick={() => handleStatusChange('ready')}>Ready (Dine In)</MenuItem>
                )}
                {selectedOrderType === 'takeaway' && (
                    <MenuItem onClick={() => handleStatusChange('ready_to_takeaway')}>Ready (Takeaway)</MenuItem>
                )}
                {['delivery', 'online', 'online_takeaway'].includes(selectedOrderType || '') && (
                    <MenuItem onClick={() => handleStatusChange('ready_to_pickup')}>Ready (Pickup/Delivery)</MenuItem>
                )}
            </Menu>
        </Box >
    );
};

export default KitchenOrdersPage;