// src/pages/kitchen/KitchenInterface.tsx
import {
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as ClockIcon,
  DeliveryDining as DeliveryIcon,
  Restaurant as DineInIcon,
  DoneAll as DoneAllIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  TakeoutDining as TakeawayIcon,
  LocalFireDepartment as UrgentIcon,
  Print as PrintIcon,
  CurrencyExchange as RefundIcon
} from '@mui/icons-material';
import {
  alpha,
  Badge,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  Pagination,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { ordersAPI } from '../../services/api';
import { formatSpiceLevelLabel } from '../../utils/spiceLevel';

interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
  notes?: string;
  spiceLevel?: string | null;
  preparationStatus?: 'pending' | 'preparing' | 'ready' | 'cancelled';
  cancelReason?: string;
  preparedAt?: Date;
  cancelledAt?: Date;
}

interface Order {
  _id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  items: OrderItem[];
  createdAt: string;
  tableNumber?: string;
  customer?: { name?: string };
  isPreOrder?: boolean;
  scheduledTime?: string;
  deliveryAddress?: { fullAddress?: string; };
  dailyTokenNumber?: string | number;
  paymentMethod?: string;
  subtotal?: number;
  tax?: { amount?: number };
}

const KitchenInterface: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const theme = useTheme();
  const { socket } = useSocket();
  const { hasRole } = useAuth();
  const canRefund = hasRole(['admin', 'manager', 'cashier']);
  const [activeTab, setActiveTab] = useState<number>(0); // 0: Live Orders, 1: Pre-Orders
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all', 'urgent', 'pending', 'preparing', 'ready'
  const [filterType, setFilterType] = useState<string>('all'); // 'all', 'dine_in', 'takeaway', 'delivery'
  const [page, setPage] = useState(1);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const headingFontSize = { xs: '1rem', md: '1.4rem' };
  const bodyFontSize = { xs: '0.65rem', sm: '0.78rem' };

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelItemRef, setCancelItemRef] = useState<{ orderId: string, itemIndex: number, itemName: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundItemRef, setRefundItemRef] = useState<{ orderId: string, itemIndex: number, itemName: string, orderType: string, itemSubtotal: number, itemTax: number } | null>(null);
  const [refundMethod, setRefundMethod] = useState<'original' | 'cash'>('original');

  const handlePrintKOT = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      toast.error('Popups blocked! Please allow popups to print.');
      return;
    }

    const itemsHtml = order.items
      .filter(item => item.preparationStatus !== 'cancelled')
      .map(item => `
        <div style="display: flex; font-size: 14px; margin-bottom: 4px; color: #444;">
          <div style="flex: 1; padding-right: 10px;">${item.name}</div>
          <div style="width: 40px; text-align: center;">${item.quantity}</div>
        </div>
        ${item.notes ? `<div style="font-size: 12px; color: #666; margin-left: 10px; font-style: italic; margin-bottom: 4px;">📝 ${item.notes}</div>` : ''}
        ${item.spiceLevel ? `<div style="font-size: 12px; color: #000; margin-left: 10px; margin-bottom: 4px;">Spice: ${formatSpiceLevelLabel(item.spiceLevel)}</div>` : ''}
      `).join('');

    const html = `
      <html>
        <head>
          <title>KOT - ${order.orderNumber}</title>
          <style>
            @media print { 
              html, body { height: auto !important; margin: 0 !important; } 
              @page { size: 80mm auto; margin: 0 !important; } 
            }
            body { font-family: 'Courier New', Courier, monospace; font-weight: bold; padding: 10px; margin: 0; width: 80mm; color: #000 !important; height: auto !important; overflow: hidden; }
            .token-no { font-size: 16px; font-weight: 900; margin-bottom: 12px; }
            .info-item { font-size: 13px; margin-bottom: 3px; color: #000; font-weight: bold; }
            .header-row { border-bottom: 2px solid #000; margin-top: 10px; margin-bottom: 6px; display: flex; font-size: 13px; font-weight: 900; color: #000; padding-bottom: 3px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="token-no">Token No: #${order.dailyTokenNumber || 'N/A'}</div>
          
          <div class="info-item" style="display: flex; align-items: center; gap: 4px;">
            Order No: <strong style="background-color: #e3f2fd; color: #1565c0; padding: 2px 6px; border-radius: 4px; font-size: 1.1em;">#${order.orderNumber?.split('-').pop() || 'N/A'}</strong>
          </div>
          <div class="info-item">Customer: ${order.customer?.name || 'Guest'}</div>
          <div class="info-item">Type: ${order.orderType?.replace(/_/g, ' ').toUpperCase()}</div>
          
          <div class="header-row">
            <div style="flex: 1;">Item</div>
            <div style="width: 40px; text-align: center;">Qty</div>
          </div>
          
          <div>
            ${itemsHtml}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Helper functions moved up
  const getElapsedTime = (createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
  };

  const getUrgencyLevel = (createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (diff >= 20) return 'critical'; // > 20 mins
    if (diff >= 10) return 'warning';  // 10-20 mins
    return 'normal'; // < 10 mins
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'preparing': return 'info';
      case 'in-progress': return 'info';
      case 'ready': return 'success';
      case 'ready_to_takeaway': return 'success';
      case 'ready_to_pickup': return 'success';
      default: return 'default';
    }
  };

  const getOrderTypeIcon = (orderType: string) => {
    switch (orderType) {
      case 'dine_in': return <DineInIcon />;
      case 'takeaway': return <TakeawayIcon />;
      case 'delivery': return <DeliveryIcon />;
      default: return <DineInIcon />;
    }
  };

  const getOrderProgress = (items: OrderItem[]) => {
    if (!items || items.length === 0) return 0;
    const activeItems = items.filter(item => item.preparationStatus !== 'cancelled');
    if (activeItems.length === 0) return 100;
    const readyCount = activeItems.filter(item => item.preparationStatus === 'ready').length;
    return (readyCount / activeItems.length) * 100;
  };

  const getProgressColor = (progress: number): 'error' | 'warning' | 'info' | 'success' => {
    if (progress === 100) return 'success';
    if (progress >= 50) return 'info';
    if (progress > 0) return 'warning';
    return 'error';
  };


  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getKitchen();
      const ordersData = Array.isArray(response.data) ? response.data : [];

      // Sort by most recent first
      const sortedOrders = ordersData.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setOrders(sortedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load kitchen orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Listen for real-time updates
    if (socket) {
      socket.on('newOrder', (data: any) => {
        const newOrder = data.order || data;
        if (['pending', 'confirmed', 'preparing', 'in-progress', 'ready'].includes(newOrder.status)) {
          setOrders(prev => [newOrder, ...prev]);
          toast.success(`New order #${newOrder.orderNumber} received!`);

          // Play notification sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
          audio.play().catch(e => console.log('Sound play blocked by browser', e));
        }
      });

      socket.on('orderStatusUpdate', (data: any) => {
        const updatedOrder = data.order || data;
        setOrders(prev => {
          if (!['pending', 'confirmed', 'preparing', 'in-progress', 'ready'].includes(updatedOrder.status)) {
            return prev.filter(o => o._id !== updatedOrder._id);
          }
          const exists = prev.find(o => o._id === updatedOrder._id);
          if (exists) {
            return prev.map(o => o._id === updatedOrder._id ? updatedOrder : o);
          } else {
            return [updatedOrder, ...prev];
          }
        });
      });
    }

    return () => {
      if (socket) {
        socket.off('newOrder');
        socket.off('orderStatusUpdate');
      }
    };
  }, [socket]);

  // Handle individual item status toggle
  const handleItemStatusChange = async (orderId: string, itemIndex: number, currentStatus: string) => {
    const key = `${orderId}-${itemIndex}`;
    if (updatingItems.has(key)) return;
    
    const newStatus = currentStatus === 'ready' ? 'pending' : 'ready';
    setUpdatingItems(prev => new Set(prev).add(key));

    try {
      await ordersAPI.updateItemStatus(orderId, itemIndex, newStatus);

      // Optimistically update local state
      setOrders(prev => prev.map(order => {
        if (order._id === orderId) {
          const updatedItems = [...order.items];
          // Use preparationStatus to match backend schema
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], preparationStatus: newStatus as any };
          return { ...order, items: updatedItems };
        }
        return order;
      }));
    } catch (error) {
      console.error('Error updating item status:', error);
      // toast.error('Failed to update item status');
    } finally {
      setUpdatingItems(prev => {
        const updated = new Set(prev);
        updated.delete(key);
        return updated;
      });
    }
  };

  const handleCancelItemProcess = async () => {
    if (isProcessing) return;
    if (!cancelItemRef || !cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    const { orderId, itemIndex } = cancelItemRef;
    const key = `${orderId}-${itemIndex}`;
    setIsProcessing(true);
    setUpdatingItems(prev => new Set(prev).add(key));
    setCancelDialogOpen(false);

    try {
      await ordersAPI.updateItemStatus(orderId, itemIndex, 'cancelled', cancelReason.trim());

      toast.success('Item cancelled successfully');
      // Refetch whole orders to ensure totalAmount/tax recalculation syncs exactly with backend
      fetchOrders();
    } catch (error) {
      console.error('Error cancelling item:', error);
      toast.error('Failed to cancel item');
    } finally {
      setUpdatingItems(prev => {
        const updated = new Set(prev);
        updated.delete(key);
        return updated;
      });
      setCancelReason('');
      setCancelItemRef(null);
      setIsProcessing(false);
    }
  };

  const handleRefundItem = (orderId: string, itemIndex: number, item: OrderItem, order: Order) => {
    const itemSubtotal = (item.price ?? 0) * item.quantity;
    const orderSubtotal = order.subtotal ?? order.items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
    const orderTax = order.tax?.amount ?? 0;
    const itemTax = orderSubtotal > 0 ? (itemSubtotal / orderSubtotal) * orderTax : 0;
    setRefundItemRef({ orderId, itemIndex, itemName: item.name, orderType: order.orderType, itemSubtotal, itemTax });
    setRefundMethod('original');
    setRefundDialogOpen(true);
  };

  const handleRefundItemProcess = async () => {
    if (isProcessing || !refundItemRef) return;
    const { orderId, itemIndex } = refundItemRef;
    setRefundDialogOpen(false);
    const key = `${orderId}-${itemIndex}`;
    setIsProcessing(true);
    setUpdatingItems(prev => new Set(prev).add(key));

    try {
      await ordersAPI.refundItem(orderId, itemIndex, refundMethod);
      toast.success('Item refunded successfully');
      fetchOrders();
    } catch (error: any) {
      console.error('Error refunding item:', error);
      toast.error(error.response?.data?.message || 'Failed to refund item');
    } finally {
      setUpdatingItems(prev => {
        const updated = new Set(prev);
        updated.delete(key);
        return updated;
      });
      setRefundItemRef(null);
      setIsProcessing(false);
    }
  };

  // Handle marking all items as ready
  const handleMarkAllReady = async (orderId: string) => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      await ordersAPI.updateAllItemsStatus(orderId, 'ready');

      setOrders(prev => prev.map(order => {
        if (order._id === orderId) {
          const updatedItems = order.items.map(item =>
            item.preparationStatus !== 'cancelled'
              ? { ...item, preparationStatus: 'ready' as any }
              : item
          );
          // Note: Backend might auto-update order status to 'ready' too
          return { ...order, items: updatedItems };
        }
        return order;
      }));

      toast.success('All items marked as ready');
    } catch (error) {
      console.error('Error marking all items ready:', error);
      toast.error('Failed to mark all items ready');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle order status progression
  const handleOrderStatusUpdate = async (orderId: string, currentStatus: string, orderType: string, isThirdPartyDelivery = false) => {
    let newStatus = '';
    if (currentStatus === 'pending') newStatus = 'confirmed';
    else if (currentStatus === 'confirmed') newStatus = 'preparing';
    else if (currentStatus === 'preparing' || currentStatus === 'in-progress') {
      if (orderType === 'takeaway') newStatus = 'ready_to_takeaway';
      else if (orderType === 'online_takeaway' || orderType === 'delivery') newStatus = 'ready_to_pickup';
      else newStatus = 'ready';
    } else if (['ready', 'ready_to_takeaway', 'ready_to_pickup'].includes(currentStatus)) {
      if (orderType === 'dine_in') newStatus = 'served';
      else if (orderType === 'delivery' && !isThirdPartyDelivery) newStatus = 'on_the_way';
      else if (orderType === 'delivery' && isThirdPartyDelivery) return; // managed by delivery partner
      else newStatus = 'completed';
    }

    if (!newStatus || isProcessing) return;

    try {
      setIsProcessing(true);
      await ordersAPI.updateStatus(orderId, newStatus);
      toast.success(`Order marked as ${newStatus.replace(/_/g, ' ')}`);
      fetchOrders();
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered orders logic
  const filteredOrders = useMemo(() => {
    let result = orders.filter((o) => (activeTab === 0 ? !o.isPreOrder : o.isPreOrder));

    // Filter by Type
    if (filterType !== 'all') {
      result = result.filter(o => o.orderType === filterType);
    }

    // Filter by Status
    if (filterStatus === 'urgent') {
      result = result.filter(o => getUrgencyLevel(o.createdAt) === 'critical');
    } else if (filterStatus === 'pending') {
      result = result.filter(o => o.status === 'pending');
    } else if (filterStatus === 'preparing') {
      result = result.filter(o => ['confirmed', 'preparing', 'in-progress'].includes(o.status));
    } else if (filterStatus === 'ready') {
      result = result.filter(o => ['ready', 'ready_to_takeaway', 'ready_to_pickup'].includes(o.status));
    }

    return result;
  }, [orders, filterStatus, filterType, activeTab]);

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [filterType, filterStatus, activeTab]);

  // Statistics
  const stats = useMemo(() => {
    const currentOrders = orders.filter((o) => (activeTab === 0 ? !o.isPreOrder : o.isPreOrder));
    const pendingCount = currentOrders.filter(o => o.status === 'pending').length;
    const preparingCount = currentOrders.filter(o => ['confirmed', 'preparing', 'in-progress'].includes(o.status)).length;
    const readyCount = currentOrders.filter(o => ['ready', 'ready_to_takeaway', 'ready_to_pickup'].includes(o.status)).length;
    const urgentCount = currentOrders.filter(o => getUrgencyLevel(o.createdAt) === 'critical').length;
    const totalCount = currentOrders.length;
    return { pendingCount, preparingCount, readyCount, urgentCount, totalCount };
  }, [orders, activeTab]);

  return (
    <Box sx={{ p: 2, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3, gap: 1.5 }}>
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#000', fontSize: headingFontSize, textAlign: 'center' }}>
            Kitchen Orders
          </Typography>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ mt: 1, minHeight: 36, justifyContent: 'center', '& .MuiTabs-flexContainer': { justifyContent: 'center' }, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
          >
            <Tab label="Live Orders" id="kitchen-tab-0" aria-controls="kitchen-tabpanel-0" />
            <Tab label="Pre-Orders" id="kitchen-tab-1" aria-controls="kitchen-tabpanel-1" />
          </Tabs>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', width: '100%' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {stats.urgentCount > 0 && (
              <Chip
                icon={<UrgentIcon />}
                label={`${stats.urgentCount} Urgent`}
                color="error"
                variant={filterStatus === 'urgent' ? "filled" : "outlined"}
                onClick={() => setFilterStatus(filterStatus === 'urgent' ? 'all' : 'urgent')}
                sx={{ animation: 'pulse 1s infinite', cursor: 'pointer' }}
              />
            )}
            <Chip
              label={`${stats.pendingCount} Pending`}
              color="warning"
              variant={filterStatus === 'pending' ? "filled" : "outlined"}
              onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label={`${stats.preparingCount} Preparing`}
              color="info"
              variant={filterStatus === 'preparing' ? "filled" : "outlined"}
              onClick={() => setFilterStatus(filterStatus === 'preparing' ? 'all' : 'preparing')}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label={`${stats.readyCount} Ready`}
              color="success"
              variant={filterStatus === 'ready' ? "filled" : "outlined"}
              onClick={() => setFilterStatus(filterStatus === 'ready' ? 'all' : 'ready')}
              sx={{ cursor: 'pointer' }}
            />
            <Badge badgeContent={stats.totalCount} color="primary">
              <Chip
                label="Total Active"
                color="primary"
                variant={filterStatus === 'all' && filterType === 'all' ? "filled" : "outlined"}
                onClick={() => { setFilterStatus('all'); setFilterType('all'); }}
                sx={{ cursor: 'pointer' }}
              />
            </Badge>
            <Tooltip title="Refresh Orders">
              <IconButton onClick={fetchOrders} color="primary" size="large">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip
              label="All Types"
              variant={filterType === 'all' ? "filled" : "outlined"}
              onClick={() => setFilterType('all')}
              size="small"
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              icon={<DineInIcon fontSize="small" />}
              label="Dine In"
              variant={filterType === 'dine_in' ? "filled" : "outlined"}
              onClick={() => setFilterType('dine_in')}
              size="small"
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              icon={<TakeawayIcon fontSize="small" />}
              label="Takeaway"
              variant={filterType === 'takeaway' ? "filled" : "outlined"}
              onClick={() => setFilterType('takeaway')}
              size="small"
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              icon={<DeliveryIcon fontSize="small" />}
              label="Delivery"
              variant={filterType === 'delivery' ? "filled" : "outlined"}
              onClick={() => setFilterType('delivery')}
              size="small"
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        </Box>
      </Box>

      {/* Orders Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress size={60} />
        </Box>
      ) : filteredOrders.length === 0 ? (
        <Paper sx={{ textAlign: 'center', p: 4, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 3 }}>
          <Typography variant="h5" color="success.main" gutterBottom sx={{ fontSize: headingFontSize }}>
            {filterStatus === 'all' ? '✅ Kitchen is Clear!' : 'No orders found for this filter'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: bodyFontSize }}>
            {filterStatus === 'all' ? 'No active orders. All caught up!' : 'Try selecting a different filter.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {paginatedOrders.map((order) => {
            const progress = getOrderProgress(order.items);
            const urgency = getUrgencyLevel(order.createdAt);
            const isAllReady = progress === 100;

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={order._id}>
                <Card
                  sx={{
                    height: { xs: 'auto', md: 470 },
                    minHeight: { xs: 0, md: 470 },
                    display: 'flex',
                    flexDirection: 'column',
                    borderTop: `6px solid ${urgency === 'critical' ? theme.palette.error.main :
                      urgency === 'warning' ? theme.palette.warning.main :
                        ((theme.palette as any)[getStatusColor(order.status)]?.main || theme.palette.primary.main)
                      }`,
                    bgcolor: isAllReady
                      ? (theme.palette.mode === 'dark' ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.success.main, 0.08))
                      : urgency === 'critical'
                        ? (theme.palette.mode === 'dark' ? alpha(theme.palette.error.main, 0.15) : alpha(theme.palette.error.main, 0.05))
                        : 'background.paper',
                    transition: 'all 0.3s ease',
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.5)' : 2,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.palette.mode === 'dark' ? '0 8px 30px rgba(0,0,0,0.7)' : 6
                    }
                  }}
                >
                  <CardContent sx={{
                    flexGrow: { xs: 0, md: 1 },
                    p: { xs: 1, sm: 1.5 },
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    {/* Header Row */}
                    <Box sx={{ mb: { xs: 0.9, sm: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, lineHeight: 1.2, fontSize: headingFontSize }}>
                            #{order.orderNumber?.split('-').pop() || order._id?.slice(-6)}
                            {urgency === 'critical' && (
                              <UrgentIcon color="error" sx={{ animation: 'pulse 0.5s infinite' }} />
                            )}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              Order:
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem', bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', px: 0.6, py: 0.2, borderRadius: 1 }}>
                              #{order.orderNumber?.split('-').pop() || 'N/A'}
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight="600" color="primary.main" sx={{ mt: 0.5, fontSize: bodyFontSize }}>
                            {order.customer?.name || 'Guest Customer'}
                          </Typography>
                        </Box>

                        <Stack spacing={0.5} alignItems="flex-end">
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <ClockIcon sx={{ fontSize: 16 }} color="action" />
                            <Typography
                              variant="caption"
                              fontWeight="bold"
                              color={urgency === 'critical' ? 'error.main' : urgency === 'warning' ? 'warning.main' : 'text.secondary'}
                              sx={{ fontSize: bodyFontSize }}
                            >
                              {order.isPreOrder && order.scheduledTime
                                ? `Sch: ${new Date(order.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : getElapsedTime(order.createdAt)}
                            </Typography>
                          </Stack>
                          {order.tableNumber && (
                            <Chip
                              label={`TABLE ${order.tableNumber}`}
                              size="small"
                              sx={{ fontWeight: 'bold', bgcolor: 'primary.main', color: 'white', height: 20, fontSize: '0.65rem' }}
                            />
                          )}
                        </Stack>
                      </Box>
                    </Box>

                    {/* Order Type & Status */}
                    <Stack direction="row" spacing={1} sx={{ mb: { xs: 1, sm: 2 }, flexWrap: 'wrap', gap: 1 }} alignItems="center">
                      <Chip
                        icon={getOrderTypeIcon(order.orderType)}
                        label={order.orderType?.replace(/_/g, ' ').toUpperCase() || 'DINE IN'}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 22 }}
                      />
                      <Chip
                        label={order.status?.toUpperCase() || 'PENDING'}
                        color={getStatusColor(order.status) as any}
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 22, fontWeight: 'bold' }}
                      />
                    </Stack>

                    {/* Progress Bar */}
                    <Box sx={{ mb: { xs: 1, sm: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: bodyFontSize }}>
                          Items Ready
                        </Typography>
                        <Typography variant="caption" fontWeight="bold" color={getProgressColor(progress)} sx={{ fontSize: bodyFontSize }}>
                          {Math.round(progress)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        color={getProgressColor(progress)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: alpha(theme.palette.grey[500], 0.2)
                        }}
                      />
                    </Box>

                    {/* Items List with Checkboxes */}
                    <Divider sx={{ mb: { xs: 0.5, sm: 1 } }} />
                    <Box sx={{
                      flexGrow: { xs: 0, md: 1 },
                      maxHeight: { xs: 170, md: 240 },
                      overflowY: 'auto',
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.2),
                        borderRadius: '3px',
                      },
                      '&::-webkit-scrollbar-track': {
                        backgroundColor: 'transparent',
                      }
                    }}>
                      {order.items?.map((item, idx) => {
                        const isReady = item.preparationStatus === 'ready';
                        const isCancelled = item.preparationStatus === 'cancelled';
                        const isUpdating = updatingItems.has(`${order._id}-${idx}`);

                        return (
                          <Box
                            key={idx}
                            sx={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              py: { xs: 0.25, sm: 0.5 },
                              px: { xs: 0.5, sm: 1 },
                              borderBottom: idx < order.items.length - 1 ? '1px dashed' : 'none',
                              borderColor: 'divider',
                              bgcolor: isCancelled ? alpha(theme.palette.error.main, 0.03) : 'transparent',
                              borderRadius: isCancelled ? 1 : 0,
                              opacity: isReady ? 0.7 : 1,
                              textDecoration: isReady ? 'line-through' : 'none',
                              transition: 'all 0.2s ease',
                              mb: isCancelled ? 0.25 : 0
                            }}
                          >
                            {!isCancelled ? (
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={isReady}
                                    onChange={() => handleItemStatusChange(order._id, idx, item.preparationStatus || 'pending')}
                                    disabled={isUpdating}
                                    color="success"
                                    size="small"
                                    sx={{
                                      p: 0.5,
                                      '& .MuiSvgIcon-root': { fontSize: 20 }
                                    }}
                                  />
                                }
                                label={
                                  <Box sx={{ ml: 0.5 }}>
                                    <Typography
                                      variant="body2"
                                      fontWeight={isReady ? 'normal' : 'medium'}
                                      sx={{
                                        color: isReady ? 'text.secondary' : 'text.primary',
                                        fontSize: bodyFontSize,
                                      }}
                                    >
                                      <strong>{item.quantity}x</strong> {item.name}
                                    </Typography>
                                    {item.notes && (
                                      <Typography variant="caption" color="warning.main" display="block" sx={{ fontSize: bodyFontSize }}>
                                        📝 {item.notes}
                                      </Typography>
                                    )}
                                    {item.spiceLevel && (
                                      <Chip
                                        icon={<UrgentIcon sx={{ fontSize: 14 }} />}
                                        label={`Spice: ${formatSpiceLevelLabel(item.spiceLevel)}`}
                                        size="small"
                                        sx={{ mt: 0.75, height: 22, fontSize: bodyFontSize, fontWeight: 700 }}
                                      />
                                    )}
                                  </Box>
                                }
                                sx={{ m: 0, width: '100%' }}
                              />
                            ) : (
                              <Box sx={{ ml: 1, py: 0.5, flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: 'text.disabled',
                                        textDecoration: 'line-through',
                                        fontSize: bodyFontSize,
                                      }}
                                    >
                                      <strong>{item.quantity}x</strong> {item.name}
                                    </Typography>
                                    <Chip
                                      label="CANCELLED"
                                      size="small"
                                      color="error"
                                      sx={{ height: 16, fontSize: bodyFontSize, fontWeight: 'bold', px: 0.5 }}
                                    />
                                  </Box>
                                  {item.cancelReason && (
                                    <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0, fontSize: bodyFontSize, opacity: 0.8 }}>
                                      Reason: {item.cancelReason}
                                    </Typography>
                                  )}
                                  {item.spiceLevel && (
                                    <Chip
                                      icon={<UrgentIcon sx={{ fontSize: 12 }} />}
                                      label={`Spice: ${formatSpiceLevelLabel(item.spiceLevel)}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ ml: 1, mt: 0.5, height: 18, fontSize: bodyFontSize, color: '#e65100', borderColor: '#ffb74d' }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            )}

                            {!isCancelled && (
                              <Tooltip title="Cancel Item">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setCancelItemRef({ orderId: order._id, itemIndex: idx, itemName: item.name });
                                    setCancelReason('');
                                    setCancelDialogOpen(true);
                                  }}
                                  disabled={isUpdating}
                                  sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {isCancelled && canRefund && (
                              <Stack direction="row" spacing={0.5} sx={{ ml: 1 }}>
                                <Tooltip title="Refund Item">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleRefundItem(order._id, idx, item, order)}
                                    disabled={updatingItems.has(`${order._id}-${idx}`)}
                                    sx={{ p: 0.5 }}
                                  >
                                    <RefundIcon sx={{ fontSize: 18 }} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            )}

                            {isUpdating && <CircularProgress size={16} sx={{ ml: 1 }} />}
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>

                  {/* Action Buttons */}
                  <CardActions sx={{ p: { xs: 1, sm: 1.5 }, pt: { xs: 0.1, sm: 0 }, flexDirection: { xs: 'row', sm: 'column' }, gap: { xs: 0.4, sm: 1 }, alignItems: 'stretch', mt: 0 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => handlePrintKOT(order)}
                      startIcon={<PrintIcon />}
                      sx={{ display: { xs: 'none', sm: 'inline-flex' }, mb: { xs: 0, sm: 0.5 }, flex: { xs: 1, sm: 'initial' }, minWidth: 0, fontSize: { xs: '0.62rem', sm: '0.78rem' }, py: { xs: 0.45, sm: 0.7 }, px: { xs: 0.5, sm: 1 }, minHeight: { xs: 28, sm: 34 }, '& .MuiButton-startIcon': { mr: { xs: 0.3, sm: 0.75 } } }}
                    >
                      Print KOT
                    </Button>
                    {!isAllReady && (
                      <Button
                        fullWidth
                        variant="outlined"
                        color="success"
                        size="small"
                        onClick={() => handleMarkAllReady(order._id)}
                        disabled={isProcessing}
                        startIcon={<DoneAllIcon />}
                        sx={{ flex: { xs: 1, sm: 'initial' }, minWidth: 0, fontSize: { xs: '0.62rem', sm: '0.78rem' }, py: { xs: 0.45, sm: 0.7 }, px: { xs: 0.5, sm: 1 }, minHeight: { xs: 28, sm: 34 }, '& .MuiButton-startIcon': { mr: { xs: 0.3, sm: 0.75 } } }}
                      >
                        Mark All Ready
                      </Button>
                    )}

                    {!(order.status === 'ready' || order.status === 'ready_to_takeaway' || order.status === 'ready_to_pickup') && (
                      <Button
                        fullWidth
                        variant="contained"
                        color={isAllReady ? "success" : (getStatusColor(order.status) as any)}
                        onClick={() => handleOrderStatusUpdate(order._id, order.status, order.orderType, !!(order.doordashDeliveryId || order.uberEatsDeliveryId))}
                        startIcon={isAllReady ? <CheckCircleIcon /> : <PlayArrowIcon />}
                        disabled={isProcessing || (!isAllReady && order.status === 'preparing')}
                        sx={{ flex: { xs: 1, sm: 'initial' }, minWidth: 0, fontSize: { xs: '0.62rem', sm: '0.78rem' }, py: { xs: 0.45, sm: 0.7 }, px: { xs: 0.5, sm: 1 }, minHeight: { xs: 28, sm: 34 }, '& .MuiButton-startIcon': { mr: { xs: 0.3, sm: 0.75 } } }}
                      >
                        {order.status === 'pending' ? 'Confirm' :
                          order.status === 'confirmed' ? 'Start' :
                            (isAllReady ? 'Mark Ready' : 'Continue Preparing')}
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {!loading && totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => { setPage(value); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            color="primary"
            size={isMobile ? 'medium' : 'large'}
            showFirstButton
            showLastButton
          />
        </Box>
      )}

{/* Dialog for canceling item */ }
<Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
  <DialogTitle>Cancel Item</DialogTitle>
  <DialogContent>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      You are about to cancel <strong>{cancelItemRef?.itemName}</strong>. Please provide a reason (e.g., "Out of Stock", "Customer Changed Mind").
    </Typography>
    <TextField
      autoFocus
      margin="dense"
      label="Cancellation Reason"
      type="text"
      fullWidth
      variant="outlined"
      value={cancelReason}
      onChange={(e) => setCancelReason(e.target.value)}
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setCancelDialogOpen(false)}>Cancel</Button>
    <Button onClick={handleCancelItemProcess} color="error" variant="contained" disabled={!cancelReason.trim()}>
      Confirm Cancellation
    </Button>
  </DialogActions>
</Dialog>

{/* Dialog for refunding item */}
<Dialog open={refundDialogOpen} onClose={() => setRefundDialogOpen(false)}>
  <DialogTitle>Refund Item</DialogTitle>
  <DialogContent>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Refunding <strong>{refundItemRef?.itemName}</strong> will remove it from the bill. Select how the refund should be issued.
    </Typography>
    <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 2, py: 1.5, mb: 2 }}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2">Item Price</Typography>
        <Typography variant="body2">${refundItemRef?.itemSubtotal?.toFixed(2)}</Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2">Tax</Typography>
        <Typography variant="body2">${refundItemRef?.itemTax?.toFixed(2)}</Typography>
      </Stack>
      <Divider sx={{ my: 0.75 }} />
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2" fontWeight={700}>Total Refund</Typography>
        <Typography variant="body2" fontWeight={700}>${((refundItemRef?.itemSubtotal ?? 0) + (refundItemRef?.itemTax ?? 0)).toFixed(2)}</Typography>
      </Stack>
    </Box>
    {refundItemRef?.orderType === 'dine_in' ? (
      <FormControl>
        <FormLabel>Refund Method</FormLabel>
        <RadioGroup value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as 'original' | 'cash')}>
          <FormControlLabel value="original" control={<Radio />} label="Original Payment Method" />
          <FormControlLabel value="cash" control={<Radio />} label="Cash" />
        </RadioGroup>
      </FormControl>
    ) : (
      <Typography variant="body2" color="text.secondary">
        Refund will be processed to the <strong>original payment method</strong>.
      </Typography>
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setRefundDialogOpen(false)}>Cancel</Button>
    <Button onClick={handleRefundItemProcess} color="error" variant="contained">
      Confirm Refund
    </Button>
  </DialogActions>
</Dialog>

{/* Pulse Animation Style */ }
<style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Box >
  );
};

export default KitchenInterface;
