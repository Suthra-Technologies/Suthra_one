import {
  Event as EventIcon,
  Info as InfoIcon,
  RestaurantMenu as MenuIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  TableRestaurant as TableIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import React, { useEffect, useState } from 'react';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enUS } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import OrderCard from '../../components/OrderCard';
import OrderDetailsDialog from '../../components/OrderDetailsDialog';
import OrderTrackingDialog from '../../components/OrderTrackingDialog';
import OrderUpdateDialog from '../../components/OrderUpdateDialog';
import PrintBillDialog from '../../components/PrintBillDialog';
import { useAuth } from '../../context/AuthContext';
import { bookingsAPI, ordersAPI } from '../../services/api';

interface Booking {
  _id: string;
  bookingId: string;
  table: {
    name: string;
    number: number;
  };
  date: string;
  timeSlot: {
    requested: string;
    start: string;
    end: string;
  };
  guests: number;
  status: string;
  specialRequests: string;
  createdAt: string;
}

const OrdersPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Use local date for default
  const [dateFilter, setDateFilter] = useState<Date>(new Date());

  // Customer tabs - 0: Orders, 1: Bookings
  const [activeTab, setActiveTab] = useState(0);
  // POS tabs - 0: Current Orders, 1: Pre Orders
  const [posActiveTab, setPosActiveTab] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Dialog states
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const headingFontSize = { xs: '1.15rem', sm: '1.4rem', md: '2.125rem' };
  const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };
  const navigate = useNavigate();
  const { user, tenantSlug } = useAuth();
  const isCustomer = user?.role === 'customer';
  const canManageOrders = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'cashier' || user?.role === 'food_runner' || user?.role === 'waiter' || user?.role === 'delivery';

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // For delivery role, always filter to delivery orders only
      const effectiveTypeFilter = user?.role === 'delivery' ? 'delivery' : typeFilter;

      // Calculate start and end for the selected day in LOCAL time
      const start = new Date(dateFilter.getFullYear(), dateFilter.getMonth(), dateFilter.getDate(), 0, 0, 0, 0);
      const end = new Date(dateFilter.getFullYear(), dateFilter.getMonth(), dateFilter.getDate(), 23, 59, 59, 999);

      const response = await ordersAPI.filter({
        status: statusFilter,
        orderType: effectiveTypeFilter,
        search: searchQuery,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        isPreOrder: (!isCustomer && posActiveTab === 1) ? true : (!isCustomer && posActiveTab === 0 ? false : undefined),
        page,
        limit: 10
      });
      setOrders(Array.isArray(response.data.orders) ? response.data.orders : []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    if (!isCustomer) return;

    try {
      setBookingsLoading(true);
      const response = await bookingsAPI.getAll();
      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    if (isCustomer) {
      fetchBookings();
    }
  }, [page, statusFilter, typeFilter, dateFilter, posActiveTab]);

  // Handle deep linking for order selection
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const openOrderId = searchParams.get('open');
    if (openOrderId) {
      (async () => {
        try {
          const response = await ordersAPI.getOne(openOrderId);
          if (response.data) {
            setSelectedOrder(response.data);
            if (isCustomer) {
              setTrackingDialogOpen(true);
            } else {
              setDetailsDialogOpen(true);
            }
            
            // Clean up the URL query parameter so it doesn't reopen on subsequent renders/navigation
            const cleanSearch = window.location.search
              .replace(/open=[^&]+&?/, '')
              .replace(/&$/, '');
            const newSearch = cleanSearch === '?' || cleanSearch === '' ? '' : cleanSearch;
            const newUrl = window.location.pathname + newSearch;
            window.history.replaceState({}, '', newUrl);
          }
        } catch (error) {
          console.error('Error fetching order for deep link:', error);
        }
      })();
    }
  }, [window.location.search, isCustomer]);

  // Real-time synchronization
  useEffect(() => {
    const handleRealtimeUpdate = (e?: any) => {
      // Provide single order refresh if detail is available
      if (e?.detail && e.detail._id) {
        handleOrderRefresh(e.detail._id);
      } else {
        fetchOrders();
      }
    };

    window.addEventListener('orderStatusUpdate', handleRealtimeUpdate);
    window.addEventListener('newOrder', handleRealtimeUpdate);

    return () => {
      window.removeEventListener('orderStatusUpdate', handleRealtimeUpdate);
      window.removeEventListener('newOrder', handleRealtimeUpdate);
    };
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleView = (order: any) => {
    setSelectedOrder(order);
    if (isCustomer) {
      setTrackingDialogOpen(true);
    } else {
      setDetailsDialogOpen(true);
    }
  };

  const handleUpdate = (order: any) => {
    setSelectedOrder(order);
    setUpdateDialogOpen(true);
  };

  const handlePrint = (order: any) => {
    setSelectedOrder(order);
    setPrintDialogOpen(true);
  };
  const handleOrderRefresh = async (orderId?: string) => {
    if (orderId) {
      try {
        const response = await ordersAPI.getOne(orderId);
        const updatedOrder = response.data;
        setOrders(prev => prev.map(o => o._id === orderId ? updatedOrder : o));
      } catch (error) {
        console.error('Error fetching single order:', error);
        fetchOrders(); // fallback
      }
    } else {
      fetchOrders();
    }
  };

  const handleOrderUpdate = () => {
    if (selectedOrder) {
      handleOrderRefresh(selectedOrder._id);
    } else {
      fetchOrders();
    }
    handleDialogClose();
  };

  const handleDialogClose = () => {
    setDetailsDialogOpen(false);
    setUpdateDialogOpen(false);
    setPrintDialogOpen(false);
    setTrackingDialogOpen(false);
    setSelectedOrder(null);
  };
  const handleAddItem = (order: any) => {
    console.log("Adding items to:", order);
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      await ordersAPI.updateStatus(orderId, 'confirmed');
      toast.success('Order accepted');
      handleOrderRefresh(orderId);
    } catch {
      toast.error('Failed to accept order');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      await ordersAPI.updateStatus(orderId, 'cancelled');
      toast.success('Order rejected');
      handleOrderRefresh(orderId);
    } catch {
      toast.error('Failed to reject order');
    } finally {
      setIsProcessing(false);
    }
  };


  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleBookTable = () => {
    const path = tenantSlug ? `/${tenantSlug}/customer/book-table` : '/customer/book-table';
    navigate(path);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderOrdersContent = () => (
    <>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: { xs: 1, sm: 3 } }}>
        <Grid container spacing={{ xs: 1, sm: 3 }} alignItems="center">
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              placeholder="Search by Order #, Name or Phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
              <DatePicker
                label="Date"
                value={dateFilter}
                format="MM/dd/yyyy"
                onChange={(newValue) => newValue && setDateFilter(newValue)}
                slotProps={{ 
                  textField: { 
                    fullWidth: true, 
                    size: 'small' 
                  } 
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="preparing">Preparing</MenuItem>
                <MenuItem value="ready">Ready</MenuItem>
                <MenuItem value="served">Served</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {user?.role !== 'delivery' && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Order Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Order Type"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="dine_in">Dine In</MenuItem>
                  <MenuItem value="takeaway">Takeaway</MenuItem>
                  <MenuItem value="delivery">Delivery</MenuItem>
                  <MenuItem value="online">Online (Web/App)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Orders Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No orders found matching your criteria.
          </Typography>
          {isCustomer && (
            <Button
              variant="contained"
              startIcon={<MenuIcon />}
              onClick={() => {
                const path = tenantSlug ? `/${tenantSlug}/customer/order` : '/customer/order';
                navigate(path);
              }}
              sx={{ mt: 2 }}
            >
              Browse Menu & Order
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {orders.map((order) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }} key={order._id} sx={{ display: 'flex' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <OrderCard
                  order={order}
                  onView={() => handleView(order)}
                  onUpdate={() => handleUpdate(order)}
                  onPrint={() => handlePrint(order)}
                  onAddItem={() => handleAddItem(order)}
                  canManage={canManageOrders}
                  onRefresh={() => handleOrderRefresh(order._id)}
                  onAccept={!isCustomer && order.status === 'pending' && !order.isDisputed ? () => handleAcceptOrder(order._id) : undefined}
                  onReject={!isCustomer && order.status === 'pending' && !order.isDisputed ? () => handleRejectOrder(order._id) : undefined}
                  onFeedback={(id: string) => {
                    const targetSlug = order?.restaurant?.slug || tenantSlug || '';
                    navigate(`/${targetSlug}/feedback/${id}`);
                  }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>

      )}

      {/* Pagination */}
      {totalPages > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            size="large"
          />
        </Box>
      )}
    </>
  );

  const renderBookingsContent = () => (
    <>
      {bookingsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : bookings.length === 0 ? (
        <Paper sx={{ p: { xs: 2.5, sm: 5 }, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: headingFontSize }}>
            You haven't made any table bookings yet.
          </Typography>
          <Button
            variant="contained"
            startIcon={<TableIcon />}
            onClick={handleBookTable}
            sx={{ mt: 2 }}
          >
            Book a Table
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size={isMobile ? 'small' : 'medium'} sx={{ minWidth: { xs: 680, sm: 760 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Booking ID</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell>Table</TableCell>
                <TableCell>Guests</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Requests</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" sx={{ fontSize: bodyFontSize }}>
                      {booking.bookingId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.72rem', sm: '0.78rem' } }}>
                      Booked on {formatDate(booking.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EventIcon fontSize="small" color="action" />
                      {formatDate(booking.date)}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <TimeIcon fontSize="small" color="action" />
                      {booking.timeSlot.requested}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {booking.table ? (
                      <Chip label={booking.table.name} size="small" variant="outlined" />
                    ) : (
                      <Typography variant="body2" color="error" sx={{ fontSize: bodyFontSize }}>Table Removed</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PeopleIcon fontSize="small" color="action" />
                      {booking.guests}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={booking.status?.toUpperCase()}
                      color={getStatusColor(booking.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {booking.specialRequests ? (
                      <Tooltip title={booking.specialRequests}>
                        <InfoIcon color="action" fontSize="small" />
                      </Tooltip>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: { xs: 2, sm: 3 },
        gap: { xs: 2, sm: 2 }
      }}>
        {/* Centered Heading and Refresh for Mobile */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          justifyContent: { xs: 'center', sm: 'flex-start' }, 
          width: { xs: '100%', sm: 'auto' } 
        }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 800,
              fontSize: headingFontSize,
              textAlign: { xs: 'center', sm: 'left' },
              color: { xs: '#000', sm: 'text.primary' }
            }}
          >
            {isCustomer ? 'My Orders & Bookings' : 'Orders Management'}
          </Typography>
          <Tooltip title={isCustomer && activeTab === 1 ? "Refresh Bookings" : "Refresh Orders"}>
            <IconButton
              onClick={() => {
                if (isCustomer && activeTab === 1) {
                  fetchBookings();
                } else {
                  fetchOrders();
                }
              }}
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                p: 0.5 
              }}
              size="small"
            >
              <RefreshIcon color="primary" fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {isCustomer && (
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5, 
            alignItems: 'center', 
            justifyContent: { xs: 'center', sm: 'flex-end' }, 
            width: { xs: '100%', sm: 'auto' } 
          }}>
            <Button
              variant="contained"
              startIcon={<MenuIcon />}
              onClick={() => {
                const path = tenantSlug ? `/${tenantSlug}/customer/order` : '/customer/order';
                navigate(path);
              }}
              size="small"
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
            >
              Order Now
            </Button>
            <Button
              variant="outlined"
              startIcon={<TableIcon />}
              onClick={handleBookTable}
              size="small"
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
            >
              Book a Table
            </Button>
          </Box>
        )}
      </Box>

      {/* Customer Tabs */}
      {isCustomer && (
        <Paper sx={{ mb: { xs: 1.5, sm: 3 } }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
            <Tab label="My Orders" icon={<MenuIcon />} iconPosition="start" sx={{ fontSize: bodyFontSize, minHeight: { xs: 42, sm: 48 } }} />
            <Tab label="My Bookings" icon={<TableIcon />} iconPosition="start" sx={{ fontSize: bodyFontSize, minHeight: { xs: 42, sm: 48 } }} />
          </Tabs>
        </Paper>
      )}

      {/* POS Tabs */}
      {!isCustomer && (
        <Paper sx={{ mb: { xs: 1.5, sm: 3 } }}>
          <Tabs value={posActiveTab} onChange={(_, newVal) => setPosActiveTab(newVal)} variant="fullWidth">
            <Tab label="Current Orders" icon={<TimeIcon />} iconPosition="start" sx={{ fontSize: bodyFontSize, minHeight: { xs: 42, sm: 48 } }} />
            <Tab label="Pre Orders" icon={<EventIcon />} iconPosition="start" sx={{ fontSize: bodyFontSize, minHeight: { xs: 42, sm: 48 } }} />
          </Tabs>
        </Paper>
      )}

      {/* Content */}
      {isCustomer ? (
        activeTab === 0 ? renderOrdersContent() : renderBookingsContent()
      ) : (
        renderOrdersContent()
      )}

      {/* Dialogs */}
      <OrderDetailsDialog
        open={detailsDialogOpen}
        order={selectedOrder}
        onClose={handleDialogClose}
        onUpdate={handleOrderUpdate}
      />
      <OrderTrackingDialog
        open={trackingDialogOpen}
        order={selectedOrder}
        onClose={handleDialogClose}
      />
      <OrderUpdateDialog
        open={updateDialogOpen}
        order={selectedOrder}
        onClose={handleDialogClose}
        onUpdate={handleOrderUpdate}
      />
      <PrintBillDialog
        open={printDialogOpen}
        order={selectedOrder}
        onClose={handleDialogClose}
      />
    </Box>
  );
};

export default OrdersPage;
