import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    Chip,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Tab,
    Tabs,
    Pagination,
    Avatar,
    CircularProgress
} from '@mui/material';
import {
    Restaurant,
    People,
    DateRange,
    CheckCircle,
    Cancel,
    Edit,
    MoreVert,
    Email,
    LocationOn,
    AccessTime,
    EventSeat,
    Warning,
    Info,
    Add,
    Schedule,
    Fastfood,
    History as HistoryIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { bookingsAPI, ordersAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import OrderTrackingDialog from '../../components/OrderTrackingDialog';

interface Booking {
    id: string;
    date: Date;
    time: string;
    tableNumber: string | number;
    tableType: string;
    location: string;
    createdAt: Date;
    canCancel: boolean;
    canModify: boolean;
    reservationFeeAmount: number;
    reservationFee?: {
        amount?: number;
        paid?: boolean;
        refunded?: boolean;
        paymentMethod?: string;
        stripePaymentIntentId?: string;
    };
    refunds: Array<{
        id?: string;
        amount: number;
        currency?: string;
        status?: string;
        reason?: string;
        timestamp?: string;
    }>;
    customerInfo: { email: string; phone: string };
    guests: number;
    status: string;
    occasion?: string;
    specialRequests?: string;
}

interface Order {
    _id: string;
    orderNumber: string;
    createdAt: string;
    totalAmount: number;
    status: string;
    items: any[];
    orderType: string;
    paymentStatus?: string;
    paymentIntentId?: string;
    refunds?: Array<{
        id?: string;
        amount: number;
        currency?: string;
        status?: string;
        reason?: string;
        timestamp?: string;
    }>;
    canCancel?: boolean;
}

const MyBookingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, tenantSlug } = useAuth();

    const [tabValue, setTabValue] = useState<number>(0);
    // ... rest of state stays same ...
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showDetails, setShowDetails] = useState<boolean>(false);
    const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
    const [showOrderCancelDialog, setShowOrderCancelDialog] = useState<boolean>(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [trackingOrder, setTrackingOrder] = useState<any | null>(null);
    const [showTracking, setShowTracking] = useState(false);
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;

    // ... useEffects and functions stay same ...


    const filterBookingsByTab = (bookings: Booking[], tabIndex: number) => {
        switch (tabIndex) {
            case 1: // Upcoming
                return bookings.filter(b => b.status === 'confirmed');
            case 2: // Past
                return bookings.filter(b => b.status === 'completed');
            case 3: // Cancelled
                return bookings.filter(b => b.status === 'cancelled');
            default:
                return [];
        }
    };

    const filteredBookings = React.useMemo(() => {
        return filterBookingsByTab(bookings, tabValue);
    }, [bookings, tabValue]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [tabValue]);

    useEffect(() => {
        const totalItems = tabValue === 0 ? orders.length : filteredBookings.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (page > totalPages && totalPages > 0) {
            setPage(totalPages);
        }
    }, [orders.length, filteredBookings.length, tabValue]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [bookingsRes, ordersRes] = await Promise.all([
                bookingsAPI.getByCustomer(),
                ordersAPI.getAll()
            ]);

            const fetchedBookings = bookingsRes.data?.data || bookingsRes.data?.bookings || (Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
            const transformedBookings: Booking[] = fetchedBookings.map((booking: any) => ({
                ...booking,
                id: booking.bookingId || booking._id || booking.id,
                date: new Date(booking.date),
                time: booking.timeSlot?.requested || (booking.timeSlot?.start
                    ? new Date(booking.timeSlot.start).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    })
                    : ''),
                tableNumber: booking.table?.tableNumber || booking.table?.number || 'N/A',
                tableType: booking.table?.type || 'Standard',
                location: booking.table?.section || booking.table?.location || 'Main Dining',
                createdAt: booking.createdAt ? new Date(booking.createdAt) : new Date(),
                canCancel: ['pending', 'confirmed'].includes(booking.status),
                canModify: ['pending', 'confirmed'].includes(booking.status),
                reservationFeeAmount: Number(booking.reservationFee?.amount ?? booking.table?.reservationFee ?? 0),
                reservationFee: booking.reservationFee,
                refunds: Array.isArray(booking.refunds) ? booking.refunds : [],
                customerInfo: booking.customer
                    ? { email: booking.customer.email, phone: booking.customer.phone }
                    : { email: booking.guestInfo?.email, phone: booking.guestInfo?.phone },
                guests: booking.guests || 1,
                status: booking.status,
                occasion: booking.occasion,
                specialRequests: booking.specialRequests
            }));
            setBookings(transformedBookings);

            const fetchedOrders = ordersRes.data?.orders || ordersRes.data?.data || ordersRes.data || [];
            const transformedOrders: Order[] = (Array.isArray(fetchedOrders) ? fetchedOrders : []).map((order: any) => ({
                ...order,
                refunds: Array.isArray(order.refunds) ? order.refunds : [],
                canCancel: ['pending', 'confirmed'].includes(order.status),
            }));
            setOrders(transformedOrders);

        } catch (error) {
            toast.error('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed': return <CheckCircle />;
            case 'pending': return <Schedule />;
            case 'cancelled': return <Cancel />;
            case 'completed': return <CheckCircle />;
            default: return <Info />;
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, booking: Booking) => {
        setAnchorEl(event.currentTarget);
        setSelectedBooking(booking);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleViewDetails = () => {
        setShowDetails(true);
        handleMenuClose();
    };

    const handleCancelBooking = async () => {
        try {
            setLoading(true);
            await bookingsAPI.cancel(selectedBooking?.id || '');
            await fetchData();
            setShowCancelDialog(false);
            setSelectedBooking(null);
            const hasPaidReservationFee = Boolean(selectedBooking?.reservationFee?.paid && selectedBooking?.reservationFee?.stripePaymentIntentId);
            toast.success(hasPaidReservationFee ? 'Booking cancelled. Refund is being sent to your original payment method.' : 'Booking cancelled successfully');
        } catch (error) {
            toast.error('Failed to cancel booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async () => {
        try {
            setLoading(true);
            await ordersAPI.cancel(selectedOrder?._id || '', 'Cancelled by customer');
            await fetchData();
            setShowOrderCancelDialog(false);
            const hasPaidOrder = Boolean(selectedOrder?.paymentStatus === 'paid' && selectedOrder?.paymentIntentId);
            setSelectedOrder(null);
            toast.success(hasPaidOrder ? 'Order cancelled. Refund is being sent to your original payment method.' : 'Order cancelled successfully');
        } catch (error) {
            toast.error('Failed to cancel order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getRefundAmount = (entity: { refunds?: Array<{ amount: number }> }) => {
        return (entity.refunds || []).reduce((sum, refund) => sum + (Number(refund.amount) || 0), 0);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const formatRefundTime = (timestamp?: string) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const renderBookingCard = (booking: Booking) => (
        <Card 
            key={booking.id} 
            sx={{ 
                mb: 2.5, borderRadius: 4, overflow: 'hidden', 
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)', 
                border: '1px solid rgba(0,0,0,0.06)',
                transition: 'all 0.3s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                    <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                            Table {booking.tableNumber}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mt: 0.5 }}>
                            {booking.tableType} • {booking.location}
                        </Typography>
                    </Box>
                    <Chip
                        icon={getStatusIcon(booking.status)}
                        label={booking.status.toUpperCase()}
                        color={getStatusColor(booking.status)}
                        size="small"
                        sx={{ fontWeight: 800, borderRadius: '8px', px: 1 }}
                    />
                </Box>
                
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                        <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                            <DateRange sx={{ fontSize: 18, mr: 1.5, color: 'primary.main' }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">DATE</Typography>
                                <Typography variant="body2" fontWeight={700}>{booking.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                            <AccessTime sx={{ fontSize: 18, mr: 1.5, color: 'primary.main' }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">TIME</Typography>
                                <Typography variant="body2" fontWeight={700}>{booking.time}</Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                            <People sx={{ fontSize: 18, mr: 1.5, color: 'primary.main' }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">GUESTS</Typography>
                                <Typography variant="body2" fontWeight={700}>{booking.guests} {booking.guests === 1 ? 'Person' : 'People'}</Typography>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>

                {booking.status === 'cancelled' && (
                    <Box sx={{ mt: 2.5, p: 1.75, bgcolor: 'rgba(0,0,0,0.025)', borderRadius: 2.5 }}>
                        {booking.reservationFee?.refunded && getRefundAmount(booking) > 0 ? (
                            <>
                                <Typography variant="body2" fontWeight={800}>
                                    Refund sent: {formatCurrency(getRefundAmount(booking))}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Back to your original payment method{booking.refunds[0]?.timestamp ? ` on ${formatRefundTime(booking.refunds[0]?.timestamp)}` : ''}. Confirmation sent by email.
                                </Typography>
                            </>
                        ) : booking.reservationFee?.paid ? (
                            <>
                                <Typography variant="body2" fontWeight={800}>
                                    Refund in progress
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    We&apos;ll send confirmation by email once it&apos;s processed.
                                </Typography>
                            </>
                        ) : (
                            <>
                                <Typography variant="body2" fontWeight={800}>
                                    Booking cancelled
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    No further action needed.
                                </Typography>
                            </>
                        )}
                    </Box>
                )}

                {booking.canCancel && (
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(0,0,0,0.05)', pt: 2 }}>
                        <Button 
                            variant="outlined" 
                            color="error" 
                            size="small"
                            onClick={() => { setSelectedBooking(booking); setShowCancelDialog(true); }}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                        >
                            Cancel Reservation
                        </Button>
                    </Box>
                )}
            </CardContent>
        </Card>
    );

    if (!isAuthenticated && !loading) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Restaurant sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>Sign In Required</Typography>
                    <Button variant="contained" onClick={() => navigate('/customer-auth')} sx={{ mr: 2 }}>Sign In</Button>
                    <Button variant="outlined" onClick={() => navigate(`/${tenantSlug}/book-table`)}>Book as Guest</Button>
                </Paper>
            </Container>
        );
    }

    return (
        <Box sx={{ p: 0, bgcolor: '#fbfbff', minHeight: '100vh' }}>
            {/* Hero Header */}
            <Box sx={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                color: 'white',
                pt: { xs: 6, md: 8 },
                pb: { xs: 6, md: 10 },
                px: 4,
                mb: -6,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: { xs: 0, md: '0 0 40px 40px' },
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            }}>
                <Box sx={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', background: 'rgba(79,70,229,0.1)', filter: 'blur(80px)' }} />
                
                <Container maxWidth="lg">
                    <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                    <HistoryIcon sx={{ color: 'white' }} />
                                </Avatar>
                                <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: '-0.02em', fontSize: { xs: '2rem', md: '2.5rem' } }}>
                                    My Activity
                                </Typography>
                            </Box>
                            <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>
                                Track your orders and manage upcoming table reservations.
                            </Typography>
                        </Box>
                        <Button 
                            variant="contained" 
                            size="large"
                            startIcon={<Add />} 
                            onClick={() => navigate(`/${tenantSlug}/customer/book-table`)}
                            sx={{ 
                                borderRadius: '16px', textTransform: 'none', fontWeight: 700, px: 4, py: 1.5,
                                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)',
                                '&:hover': { background: 'rgba(255,255,255,0.2)' }
                            }}
                        >
                            New Booking
                        </Button>
                    </Box>
                </Container>
            </Box>

            <Container maxWidth="md" sx={{ position: 'relative', zIndex: 2 }}>
                {loading ? (
                    <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <CircularProgress size={40} thickness={4} />
                        <Typography sx={{ mt: 2, fontWeight: 500, color: 'text.secondary' }}>Loading your history...</Typography>
                    </Paper>
                ) : (
                    <>
                        <Box sx={{ mb: 4, bgcolor: 'white', p: 1, borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                            <Tabs 
                                value={tabValue} 
                                onChange={(e, n) => setTabValue(n)} 
                                variant="scrollable" 
                                scrollButtons="auto"
                                sx={{
                                    '& .MuiTabs-indicator': { display: 'none' },
                                    '& .MuiTab-root': { 
                                        borderRadius: '14px', minHeight: 48, mx: 0.5, textTransform: 'none', fontWeight: 700,
                                        '&.Mui-selected': { 
                                            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', 
                                            color: 'white !important',
                                            boxShadow: '0 4px 12px rgba(79,70,229,0.3)'
                                        }
                                    }
                                }}
                            >
                                <Tab icon={<Fastfood fontSize="small" />} iconPosition="start" label={`Orders (${orders.length})`} />
                                <Tab icon={<EventSeat fontSize="small" />} iconPosition="start" label={`Upcoming (${filterBookingsByTab(bookings, 1).length})`} />
                                <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label={`Past (${filterBookingsByTab(bookings, 2).length})`} />
                                <Tab icon={<Cancel fontSize="small" />} iconPosition="start" label={`Cancelled (${filterBookingsByTab(bookings, 3).length})`} />
                            </Tabs>
                        </Box>

                    {tabValue === 0 ? (
                        orders.length === 0 ? (
                            <Paper sx={{ p: 4, textAlign: 'center' }}>
                                <Fastfood sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                                <Typography variant="h6">No Orders Yet</Typography>
                                <Typography color="text.secondary">Your recent food orders will appear here.</Typography>
                                <Button
                                    variant="outlined"
                                    sx={{ mt: 2 }}
                                    onClick={() => navigate(`/${tenantSlug}/customer/order`)}
                                >
                                    Order Food Now
                                </Button>
                            </Paper>
                        ) : (
                            <>
                                {orders.slice((page - 1) * itemsPerPage, page * itemsPerPage).map(o => (
                                    <Card 
                                        key={o._id} 
                                        sx={{ 
                                            mb: 2.5, borderRadius: 4, overflow: 'hidden', 
                                            boxShadow: '0 2px 12px rgba(0,0,0,0.04)', 
                                            border: '1px solid rgba(0,0,0,0.06)',
                                            transition: 'all 0.3s ease',
                                            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }
                                        }}
                                    >
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={800} color="primary.main">
                                                        #{o.orderNumber || o._id.slice(-6).toUpperCase()}
                                                    </Typography>
                                                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                                                        {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={o.status.replace(/_/g, ' ').toUpperCase()}
                                                    color={
                                                        ['completed', 'delivered'].includes(o.status) ? 'success' :
                                                        ['cancelled'].includes(o.status) ? 'error' :
                                                        ['pending'].includes(o.status) ? 'warning' : 'primary'
                                                    }
                                                    size="small"
                                                    sx={{ fontWeight: 800, borderRadius: '8px' }}
                                                />
                                            </Box>
                                            
                                            <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Avatar sx={{ bgcolor: 'white', border: '1px solid rgba(0,0,0,0.06)', color: 'text.secondary' }}>
                                                        <Fastfood sx={{ fontSize: 20 }} />
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                                                            {o.orderType.replace(/_/g, ' ')}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {o.items?.length || 0} items
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Typography variant="h6" fontWeight={900}>
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(o.totalAmount)}
                                                </Typography>
                                            </Box>

                                            {o.status === 'cancelled' && (
                                                <Box sx={{ mt: 2.5, p: 1.75, bgcolor: 'rgba(0,0,0,0.025)', borderRadius: 2.5 }}>
                                                    {o.paymentStatus === 'refunded' && getRefundAmount(o) > 0 ? (
                                                        <>
                                                            <Typography variant="body2" fontWeight={800}>
                                                                Refund sent: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(getRefundAmount(o))}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Back to your original payment method{o.refunds?.[0]?.timestamp ? ` on ${formatRefundTime(o.refunds[0].timestamp)}` : ''}. Confirmation sent by email.
                                                            </Typography>
                                                        </>
                                                    ) : o.paymentStatus === 'paid' ? (
                                                        <>
                                                            <Typography variant="body2" fontWeight={800}>
                                                                Refund in progress
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                We&apos;ll send confirmation by email once it&apos;s processed.
                                                            </Typography>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Typography variant="body2" fontWeight={800}>
                                                                Order cancelled
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                No further action needed.
                                                            </Typography>
                                                        </>
                                                    )}
                                                </Box>
                                            )}

                                            {o.canCancel && (
                                                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(0,0,0,0.05)', pt: 2 }}>
                                                    <Button
                                                        variant="outlined"
                                                        color="error"
                                                        size="small"
                                                        onClick={() => { setSelectedOrder(o); setShowOrderCancelDialog(true); }}
                                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                                                    >
                                                        Cancel Order
                                                    </Button>
                                                </Box>
                                            )}

                                            {o.orderType === 'delivery' && o.status === 'on_the_way' && (
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    startIcon={<LocationOn />}
                                                    sx={{ 
                                                        mt: 2, borderRadius: 2, fontWeight: 700, textTransform: 'none',
                                                        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                                                        boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                                                    }}
                                                    onClick={() => {
                                                        setTrackingOrder(o);
                                                        setShowTracking(true);
                                                    }}
                                                >
                                                    Track Live Order
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                                {orders.length > 0 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
                                        <Pagination
                                            count={Math.ceil(orders.length / itemsPerPage)}
                                            page={page}
                                            onChange={(_, value) => setPage(value)}
                                            color="primary"
                                        />
                                    </Box>
                                )}
                            </>
                        )
                    ) : filteredBookings.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="h6">No Bookings Found</Typography>
                            <Typography color="text.secondary">You don't have any bookings in this category.</Typography>
                        </Paper>
                    ) : (
                        <>
                            {filteredBookings.slice((page - 1) * itemsPerPage, page * itemsPerPage).map(b => renderBookingCard(b))}
                            {filteredBookings.length > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
                                    <Pagination
                                        count={Math.ceil(filteredBookings.length / itemsPerPage)}
                                        page={page}
                                        onChange={(_, value) => setPage(value)}
                                        color="primary"
                                    />
                                </Box>
                            )}
                        </>
                    )}
                </>
            )}

            {/* <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Booking Details</DialogTitle>
                {selectedBooking && (
                    <DialogContent>
                        <List>
                            <ListItem><ListItemIcon><Restaurant /></ListItemIcon><ListItemText primary="Table" secondary={`Table ${selectedBooking.tableNumber} (${selectedBooking.location})`} /></ListItem>
                            <ListItem><ListItemIcon><DateRange /></ListItemIcon><ListItemText primary="Date & Time" secondary={`${selectedBooking.date.toLocaleDateString()} at ${selectedBooking.time}`} /></ListItem>
                            <ListItem><ListItemIcon><People /></ListItemIcon><ListItemText primary="Guests" secondary={selectedBooking.guests} /></ListItem>
                        </List>
                    </DialogContent>
                )}
                <DialogActions><Button onClick={() => setShowDetails(false)}>Close</Button></DialogActions>
            </Dialog> */}

            <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Cancel Booking</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: selectedBooking?.reservationFee?.paid ? 1.25 : 0 }}>
                        Cancel this reservation?
                    </Typography>
                    {selectedBooking?.reservationFee?.paid && selectedBooking?.reservationFee?.stripePaymentIntentId && (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            {`The ${formatCurrency(selectedBooking.reservationFee.amount || 0)} reservation fee will be refunded to your original payment method. A confirmation email will be sent.`}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowCancelDialog(false)}>Back</Button>
                    <Button onClick={handleCancelBooking} color="error" variant="contained">Cancel Now</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={showOrderCancelDialog} onClose={() => setShowOrderCancelDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Cancel Order</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: selectedOrder?.paymentStatus === 'paid' ? 1.25 : 0 }}>
                        Cancel this order?
                    </Typography>
                    {selectedOrder?.paymentStatus === 'paid' && selectedOrder?.paymentIntentId && (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            {`The ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedOrder.totalAmount || 0)} payment will be refunded to your original payment method. A confirmation email will be sent.`}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowOrderCancelDialog(false)}>Back</Button>
                    <Button onClick={handleCancelOrder} color="error" variant="contained">Cancel Now</Button>
                </DialogActions>
            </Dialog>

            {/* <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                 <MenuItem onClick={handleViewDetails}><Info sx={{ mr: 1 }} />View Details</MenuItem>
                 {selectedBooking?.canCancel && (
                     <MenuItem onClick={() => { setShowCancelDialog(true); handleMenuClose(); }} sx={{ color: 'error.main' }}>
                         <Cancel sx={{ mr: 1 }} />Cancel Booking
                     </MenuItem>
                 )}
             </Menu> */}

            <OrderTrackingDialog
                open={showTracking}
                order={trackingOrder}
                onClose={() => setShowTracking(false)}
            />
        </Container>
    </Box>
    );
};

export default MyBookingsPage;
