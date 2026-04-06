import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Tooltip,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Tabs,
    Tab,
    Grid,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    useTheme,
    useMediaQuery,
    Card,
    CardContent,
    CardActionArea,
    Divider,
    Stack,
    TablePagination
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle as ApproveIcon,
    Cancel as RejectIcon,
    Info as InfoIcon,
    Refresh as RefreshIcon,
    ViewList as ListIcon,
    Timeline as TimelineIcon,
    Event as EventIcon,
    Add as BookIcon,
    RestaurantMenu as OrderIcon,
    Close
} from '@mui/icons-material';

import { bookingsAPI, tablesAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import PhoneInput from 'src/components/PhoneInput';

const BookingsAdminPage: React.FC = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { tenantSlug } = useAuth();
    const { settings } = useSettings();

    const handleCreateOrder = async (booking: any) => {
        if (!booking.checkedIn) {
            try {
                await bookingsAPI.checkIn(booking._id);
            } catch (err) {
                console.error("Auto check-in failed:", err);
            }
        }

        const query = new URLSearchParams({
            tableId: booking.table?._id || '',
            tableName: booking.table?.tableName || booking.table?.tableNumber || '',
            customerName: booking.customer?.name ||
                (booking.guestInfo ? `${booking.guestInfo.firstName || ''} ${booking.guestInfo.lastName || ''}`.trim() : ''),
            customerPhone: booking.customer?.phone || booking.guestInfo?.phone || '',
            customerEmail: booking.customer?.email || booking.guestInfo?.email || '',
            guestCount: booking.guests?.toString() || '1'
        }).toString();

        navigate(`/${tenantSlug}/pos?${query}`);
    };
    const [bookings, setBookings] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
    const [actionNote, setActionNote] = useState('');
    const [processing, setProcessing] = useState(false);

    // New State for Timeline
    const [tabValue, setTabValue] = useState(0);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // New Booking State
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [bookingStep, setBookingStep] = useState(1);
    const [availableTables, setAvailableTables] = useState<any[]>([]);
    const [newBooking, setNewBooking] = useState({
        date: new Date(),
        time: '',
        guests: 2,
        duration: 90,
        tableId: '',
        firstName: '',
        phone: '',
        dialCode: settings?.restaurant?.dialCode || '1',
        specialRequests: ''
    });

    // Sync dial code with settings
    useEffect(() => {
        if (settings?.restaurant?.dialCode) {
            setNewBooking(prev => ({ ...prev, dialCode: settings.restaurant.dialCode }));
        }
    }, [settings?.restaurant?.dialCode]);

    // Pagination State
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (tabValue === 0) {
                params.page = page + 1;
                params.limit = rowsPerPage;
            } else {
                params.date = selectedDate.toISOString();
                params.limit = 1000; // Get all for timeline
            }

            const [bookingsRes, tablesRes] = await Promise.all([
                bookingsAPI.getAll(params),
                tablesAPI.getAll()
            ]);

            const bookingsData = (bookingsRes.data && Array.isArray(bookingsRes.data.data)) ? bookingsRes.data.data : [];
            const tablesData = Array.isArray(tablesRes.data) ? tablesRes.data : [];

            if (tabValue === 0) {
                setBookings(bookingsData);
                setTotalCount(bookingsRes.data?.total || 0);
            } else {
                setBookings(bookingsData);
            }
            setTables(tablesData);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, rowsPerPage, tabValue, selectedDate]);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const timeSlots = useMemo(() => {
        const slots = [];
        const startHour = 11; // 11 AM
        const endHour = 22;   // 10 PM
        for (let hour = startHour; hour < endHour; hour++) {
            const d = new Date(); d.setHours(hour, 0, 0, 0);
            slots.push({ label: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }), value: `${hour.toString().padStart(2, '0')}:00` });
            d.setMinutes(30);
            slots.push({ label: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }), value: `${hour.toString().padStart(2, '0')}:30` });
        }
        return slots;
    }, []);

    const handleCheckAvailability = async () => {
        if (!newBooking.time) {
            toast.error('Please select time');
            return;
        }
        setProcessing(true);
        try {
            const response = await bookingsAPI.checkAvailability({
                date: newBooking.date.toISOString(),
                time: newBooking.time,
                guests: newBooking.guests,
                duration: newBooking.duration
            });
            setAvailableTables(response.data);
            if (response.data.length > 0) {
                setBookingStep(2);
            } else {
                toast.error('No tables available for selected criteria');
            }
        } catch (error) {
            toast.error('Failed to check availability');
        } finally {
            setProcessing(false);
        }
    };

    const handleCreateBooking = async () => {
        if (!newBooking.tableId || !newBooking.firstName || !newBooking.phone) {
            toast.error('Please fill all required fields');
            return;
        }
        if (newBooking.phone.length !== 10) {
            toast.error('Phone number must be exactly 10 digits');
            return;
        }
        if (/[^a-zA-Z\s]/.test(newBooking.firstName)) {
            toast.error('Guest name should only contain characters');
            return;
        }
        setProcessing(true);
        try {
            const bookingData = {
                tableId: newBooking.tableId,
                bookingDate: newBooking.date,
                bookingTime: newBooking.time,
                duration: newBooking.duration,
                guestCount: newBooking.guests,
                specialRequests: newBooking.specialRequests,
                guestInfo: {
                    firstName: newBooking.firstName,
                    phone: newBooking.phone
                },
                status: 'confirmed', // Auto-confirm admin bookings
                source: 'admin'
            };
            await bookingsAPI.create(bookingData);
            toast.success('Booking created successfully');
            setCreateDialogOpen(false);
            fetchData();
            // Reset form
            setNewBooking({
                date: new Date(),
                time: '',
                guests: 2,
                duration: 90,
                tableId: '',
                firstName: '',
                phone: '',
                dialCode: settings?.restaurant?.dialCode || '1',
                specialRequests: ''
            });
            setBookingStep(1);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create booking');
        } finally {
            setProcessing(false);
        }
    };

    const handleCheckout = async (bookingId: string) => {
        setProcessing(true);
        try {
            await bookingsAPI.updateStatus(bookingId, 'completed');
            toast.success('Guest checked out successfully');
            fetchData();
        } catch (error) {
            console.error('Error checking out:', error);
            toast.error('Failed to complete checkout');
        } finally {
            setProcessing(false);
        }
    };

    const handleStatusUpdate = async () => {
        if (!selectedBooking || !actionType) return;

        setProcessing(true);
        try {
            const status = actionType === 'approve' ? 'confirmed' : 'cancelled';
            const customerNote = actionNote.trim();
            await bookingsAPI.updateStatus(selectedBooking._id, status, customerNote || undefined);
            toast.success(`Booking ${status} successfully`);
            setActionDialogOpen(false);
            setActionNote('');
            fetchData();
        } catch (error) {
            console.error('Error updating booking status:', error);
            toast.error('Failed to update booking status');
        } finally {
            setProcessing(false);
        }
    };

    const openActionDialog = (booking: any, type: 'approve' | 'reject') => {
        setSelectedBooking(booking);
        setActionType(type);
        setActionNote('');
        setActionDialogOpen(true);
    };

    const openDetailsDialog = (booking: any) => {
        setSelectedBooking(booking);
        setDetailsOpen(true);
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

    // Timeline View Helpers
    const timelineStartHour = 11; // 11 AM
    const timelineEndHour = 23;   // 11 PM
    const totalHours = timelineEndHour - timelineStartHour;

    const getBookingPosition = (booking: any) => {
        const date = new Date(booking.date);
        const start = new Date(booking.timeSlot?.start || date);

        // Ensure start time is valid
        if (isNaN(start.getTime())) return { left: '0%', width: '0%' };

        const startHour = start.getHours() + (start.getMinutes() / 60);

        // Normalize booking start relative to timeline start
        let relativeStart = startHour - timelineStartHour;

        const durationHours = (booking.duration || 120) / 60;

        let leftPercent = (relativeStart / totalHours) * 100;
        let widthPercent = (durationHours / totalHours) * 100;

        // Clip bookings outside the timeline
        if (leftPercent < 0) {
            widthPercent += leftPercent;
            leftPercent = 0;
        }
        if (leftPercent + widthPercent > 100) {
            widthPercent = 100 - leftPercent;
        }
        if (widthPercent < 0) widthPercent = 0;

        return { left: `${leftPercent}%`, width: `${widthPercent}%` };
    };

    // Filter bookings for selected date
    const dailyBookings = useMemo(() => {
        return bookings.filter(b => {
            const bDate = new Date(b.date);
            return bDate.getDate() === selectedDate.getDate() &&
                bDate.getMonth() === selectedDate.getMonth() &&
                bDate.getFullYear() === selectedDate.getFullYear() &&
                b.status !== 'cancelled' && b.status !== 'no_show';
        });
    }, [bookings, selectedDate]);

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', mb: 3, gap: 2 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 'bold',
                            width: isMobile ? '100%' : 'auto',
                            textAlign: isMobile ? 'center' : 'left',
                            whiteSpace: isMobile ? 'nowrap' : 'normal',
                            fontSize: { xs: 'clamp(1.5rem, 6vw, 2rem)', md: '2.125rem' },
                            overflow: isMobile ? 'hidden' : 'visible',
                            textOverflow: isMobile ? 'ellipsis' : 'clip'
                        }}
                    >
                        Bookings Management
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                        {tabValue === 1 && (
                            <DatePicker
                                label="Filter Date"
                                value={selectedDate}
                                onChange={(newValue) => newValue && setSelectedDate(newValue)}
                                slotProps={{ textField: { size: 'small', sx: { bgcolor: 'background.paper', width: isMobile ? '100%' : 180 } } }}
                            />
                        )}
                        <Button
                            variant="contained"
                            startIcon={<BookIcon />}
                            onClick={() => {
                                setBookingStep(1);
                                setCreateDialogOpen(true);
                            }}
                            sx={{ flex: isMobile ? 1 : 'initial' }}
                        >
                            New Booking
                        </Button>
                        <IconButton onClick={fetchData} color="primary" sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
                            <RefreshIcon />
                        </IconButton>
                    </Box>
                </Box>

                <Paper sx={{ mb: 3 }}>
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant={isMobile ? "fullWidth" : "standard"}>
                        <Tab icon={<ListIcon />} iconPosition="start" label="List View" />
                        <Tab icon={<TimelineIcon />} iconPosition="start" label="Timeline View" />
                    </Tabs>
                </Paper>

                {/* List View */}
                {tabValue === 0 && (
                    <Box>
                        {loading ? (
                            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                        ) : bookings.length === 0 ? (
                            <Box textAlign="center" p={4}><Typography color="text.secondary">No bookings found</Typography></Box>
                        ) : isMobile ? (
                            // Mobile Card View
                            <Stack spacing={2}>
                                {bookings.map((booking) => (
                                    <Card key={booking._id} sx={{ cursor: 'pointer' }}>
                                        <CardActionArea onClick={() => handleCreateOrder(booking)}>
                                            <CardContent>
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        ID: {booking.bookingId}
                                                    </Typography>
                                                    <Chip
                                                        label={booking.status.toUpperCase()}
                                                        color={getStatusColor(booking.status) as any}
                                                        size="small"
                                                    />
                                                </Stack>

                                                <Grid container spacing={1} mb={2}>
                                                    <Grid item xs={12}>
                                                        <Typography variant="subtitle2" fontWeight="bold">
                                                            {booking.customer?.name || booking.guestInfo?.firstName || 'Guest'}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {booking.customer?.phone || booking.guestInfo?.phone}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary" display="block">Date & Time</Typography>
                                                        <Typography variant="body2">
                                                            {new Date(booking.date).toLocaleDateString()}
                                                        </Typography>
                                                        <Typography variant="caption">
                                                            {booking.timeSlot?.requested}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary" display="block">Table</Typography>
                                                        <Typography variant="body2">
                                                            {booking.table?.tableName || booking.table?.tableNumber || 'N/A'}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        <Typography variant="caption" color="text.secondary">Guests: </Typography>
                                                        <Typography component="span" variant="body2">{booking.guests}</Typography>
                                                    </Grid>
                                                </Grid>
                                            </CardContent>
                                        </CardActionArea>
                                        <Divider />
                                        <CardContent sx={{ pt: 1, pb: '16px !important' }}>
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Tooltip title="View Details">
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); openDetailsDialog(booking); }}>
                                                        <InfoIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                {booking.status === 'confirmed' && !booking.checkedIn && (
                                                    <Tooltip title="Order Food">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={(e) => { e.stopPropagation(); handleCreateOrder(booking); }}
                                                        >
                                                            <OrderIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {booking.checkedIn && booking.status !== 'completed' && (
                                                    <Tooltip title={booking.table?.currentOrder ? "Complete the order" : "Finalize booking"}>
                                                        <span onClick={(e) => e.stopPropagation()}>
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                color="warning"
                                                                onClick={(e) => { e.stopPropagation(); handleCheckout(booking._id); }}
                                                                disabled={!!booking.table?.currentOrder}
                                                                sx={{ fontWeight: 'bold' }}
                                                            >
                                                                Checkout
                                                            </Button>
                                                        </span>
                                                    </Tooltip>
                                                )}
                                                {booking.status === 'pending' && !booking.checkedIn && (
                                                    <>
                                                        <Tooltip title="Approve">
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                onClick={(e) => { e.stopPropagation(); openActionDialog(booking, 'approve'); }}
                                                            >
                                                                <ApproveIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Reject">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={(e) => { e.stopPropagation(); openActionDialog(booking, 'reject'); }}
                                                            >
                                                                <RejectIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Stack>
                        ) : (
                            // Desktop Table View
                            <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Booking ID</TableCell>
                                            <TableCell>Customer</TableCell>
                                            <TableCell>Date & Time</TableCell>
                                            <TableCell>Table</TableCell>
                                            <TableCell>Guests</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {bookings.map((booking) => (
                                            <TableRow
                                                key={booking._id}
                                                hover
                                                onClick={() => handleCreateOrder(booking)}
                                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            >
                                                <TableCell onClick={(e) => { e.stopPropagation(); openDetailsDialog(booking); }}>
                                                    {booking.bookingId}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {booking.customer?.name || booking.guestInfo?.firstName || 'Guest'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {booking.customer?.phone || booking.guestInfo?.phone}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {new Date(booking.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {booking.timeSlot?.requested}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {booking.table?.tableName || booking.table?.tableNumber || 'N/A'}
                                                </TableCell>
                                                <TableCell>{booking.guests}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={booking.status.toUpperCase()}
                                                        color={getStatusColor(booking.status) as any}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="View Details">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => { e.stopPropagation(); openDetailsDialog(booking); }}
                                                        >
                                                            <InfoIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    {booking.status === 'confirmed' && !booking.checkedIn && (
                                                        <Tooltip title="Order Food">
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={(e) => { e.stopPropagation(); handleCreateOrder(booking); }}
                                                            >
                                                                <OrderIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    {booking.checkedIn && booking.status !== 'completed' && (
                                                        <Tooltip title={booking.table?.currentOrder ? "Complete the order" : "Finalize booking"}>
                                                            <span onClick={(e) => e.stopPropagation()}>
                                                                <Button
                                                                    size="small"
                                                                    variant="contained"
                                                                    color="warning"
                                                                    onClick={(e) => { e.stopPropagation(); handleCheckout(booking._id); }}
                                                                    disabled={!!booking.table?.currentOrder}
                                                                    sx={{ fontWeight: 'bold' }}
                                                                >
                                                                    Checkout
                                                                </Button>
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                    {booking.status === 'pending' && !booking.checkedIn && (
                                                        <>
                                                            <Tooltip title="Approve">
                                                                <IconButton
                                                                    size="small"
                                                                    color="success"
                                                                    onClick={(e) => { e.stopPropagation(); openActionDialog(booking, 'approve'); }}
                                                                >
                                                                    <ApproveIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Reject">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={(e) => { e.stopPropagation(); openActionDialog(booking, 'reject'); }}
                                                                >
                                                                    <RejectIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                        {!loading && bookings.length > 0 && (
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                component="div"
                                count={totalCount}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                            />
                        )}
                    </Box>
                )}

                {/* Timeline View */}
                {tabValue === 1 && (
                    <Paper sx={{ p: isMobile ? 1 : 2, maxWidth: '100%' }}>
                        {isMobile ? (
                            <Box>
                                {tables.length === 0 ? (
                                    <Box sx={{ textAlign: 'center', p: 4 }}><CircularProgress /></Box>
                                ) : (
                                    tables.map(table => {
                                        const tableBookings = dailyBookings.filter(
                                            b => b.table?._id === table._id || b.table === table._id
                                        );
                                        return (
                                            <Box key={table._id} sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: '#f5f5f5' }}>
                                                <Typography variant="subtitle2" fontWeight={700}>{table.tableName}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Cap: {table.capacity} | {table.location || 'Hall'}
                                                </Typography>
                                                <Box sx={{ mt: 1 }}>
                                                    {tableBookings.length === 0 ? (
                                                        <Typography variant="caption" color="text.secondary">No bookings</Typography>
                                                    ) : (
                                                        tableBookings.map(booking => (
                                                            <Box
                                                                key={booking._id}
                                                                onClick={() => openDetailsDialog(booking)}
                                                                sx={{
                                                                    p: 1.5, mb: 1, borderRadius: 2,
                                                                    bgcolor: booking.status === 'confirmed' ? 'success.light' : 'warning.light',
                                                                    border: 1,
                                                                    borderColor: booking.status === 'confirmed' ? 'success.main' : 'warning.main',
                                                                    cursor: 'pointer', '&:hover': { opacity: 0.85 }
                                                                }}
                                                            >
                                                                <Typography variant="body2" fontWeight={600} sx={{ color: '#000' }}>
                                                                    {booking.guestInfo?.firstName || booking.customer?.name || 'Guest'}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {booking.timeSlot?.requested} · {booking.guests} guests
                                                                </Typography>
                                                            </Box>
                                                        ))
                                                    )}
                                                </Box>
                                            </Box>
                                        );
                                    })
                                )}
                                <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 16, height: 16, bgcolor: 'warning.light', border: 1, borderColor: 'warning.main', borderRadius: 1 }} />
                                        <Typography variant="caption">Pending</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 16, height: 16, bgcolor: 'success.light', border: 1, borderColor: 'success.main', borderRadius: 1 }} />
                                        <Typography variant="caption">Confirmed</Typography>
                                    </Box>
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ minWidth: 800 }}>

                                {/* Time Header */}
                                <Box sx={{ display: 'flex', ml: '150px', borderBottom: 1, borderColor: 'divider', pb: 1, mb: 2 }}>
                                    {Array.from({ length: totalHours + 1 }).map((_, i) => (
                                        <Box key={i} sx={{ flex: 1, textAlign: 'left', borderLeft: 1, borderColor: 'divider', pl: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {timelineStartHour + i}:00
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>

                                {/* Tables Rows */}
                                {tables.length === 0 ? (
                                    <Box sx={{ textAlign: 'center', p: 4 }}>
                                        <CircularProgress />
                                    </Box>
                                ) : (
                                    tables.map(table => (
                                        <Box key={table._id} sx={{ display: 'flex', mb: 2, alignItems: 'center', height: 50 }}>
                                            {/* Table Label */}
                                            <Box sx={{ width: '150px', pr: 2, borderRight: 1, borderColor: 'divider' }}>
                                                <Typography variant="subtitle2" noWrap>
                                                    {table.tableName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Cap: {table.capacity} | {table.location || 'Hall'}
                                                </Typography>
                                            </Box>

                                            {/* Timeline Track */}
                                            <Box sx={{ flex: 1, position: 'relative', height: '100%', bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                                {/* Grid Lines */}
                                                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>
                                                    {Array.from({ length: totalHours + 1 }).map((_, i) => (
                                                        <Box key={i} sx={{ flex: 1, borderLeft: '1px dashed #e0e0e0' }} />
                                                    ))}
                                                </Box>

                                                {/* Bookings */}
                                                {dailyBookings
                                                    .filter(b => b.table?._id === table._id || b.table === table._id)
                                                    .map(booking => {
                                                        const pos = getBookingPosition(booking);
                                                        return (
                                                            <Tooltip
                                                                key={booking._id}
                                                                title={`${booking.guestInfo?.firstName || booking.customer?.name || 'Guest'} (${booking.guests}p) - ${booking.timeSlot?.requested}`}
                                                            >
                                                                <Box
                                                                    onClick={() => openDetailsDialog(booking)}
                                                                    sx={{
                                                                        position: 'absolute',
                                                                        left: pos.left,
                                                                        width: pos.width,
                                                                        top: 4,
                                                                        bottom: 4,
                                                                        bgcolor: booking.status === 'confirmed' ? 'success.light' : 'warning.light',
                                                                        border: 1,
                                                                        borderColor: booking.status === 'confirmed' ? 'success.main' : 'warning.main',
                                                                        borderRadius: 1,
                                                                        zIndex: 1,
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        overflow: 'hidden',
                                                                        px: 0.5,
                                                                        opacity: 0.9,
                                                                        '&:hover': { opacity: 1, boxShadow: 2 }
                                                                    }}
                                                                >
                                                                    <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', color: '#000' }}>
                                                                        {booking.guestInfo?.firstName || booking.customer?.name || 'Guest'}
                                                                    </Typography>
                                                                </Box>
                                                            </Tooltip>
                                                        );
                                                    })}
                                            </Box>
                                        </Box>
                                    ))
                                )}
                                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 16, height: 16, bgcolor: 'warning.light', border: 1, borderColor: 'warning.main', borderRadius: 1 }} />
                                        <Typography variant="caption">Pending</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 16, height: 16, bgcolor: 'success.light', border: 1, borderColor: 'success.main', borderRadius: 1 }} />
                                        <Typography variant="caption">Confirmed</Typography>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Paper>
                )}

                {/* Create Booking Dialog */}
                <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {bookingStep === 1 ? 'New Booking' : 'Table Confirmation'}
                        <IconButton
                            onClick={() => setCreateDialogOpen(false)}
                            size="small"
                            sx={{
                                bgcolor: 'error.main',
                                color: 'white',
                                width: 24,
                                height: 24,
                                '&:hover': { bgcolor: 'error.dark' }
                            }}
                        >
                            <Close sx={{ fontSize: '1rem' }} />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        {bookingStep === 1 ? (
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={12}>
                                    <DatePicker
                                        label="Date"
                                        value={newBooking.date}
                                        onChange={(d) => d && setNewBooking({ ...newBooking, date: d })}
                                        slotProps={{ textField: { fullWidth: true } }}
                                        disablePast
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <FormControl fullWidth required>
                                        <InputLabel sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>Time</InputLabel>
                                        <Select
                                            value={newBooking.time}
                                            label="Time"
                                            onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
                                        >
                                            {timeSlots.map(t => (
                                                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Guests"
                                        type="number"
                                        fullWidth
                                        required
                                        InputLabelProps={{ sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }}
                                        value={newBooking.guests}
                                        onChange={(e) => setNewBooking({ ...newBooking, guests: parseInt(e.target.value) || 1 })}
                                    />
                                </Grid>
                            </Grid>
                        ) : (
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={12}>
                                    <FormControl fullWidth required>
                                        <InputLabel sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>Select Table</InputLabel>
                                        <Select
                                            value={newBooking.tableId}
                                            label="Select Table"
                                            onChange={(e) => setNewBooking({ ...newBooking, tableId: e.target.value })}
                                        >
                                            {availableTables.map(t => (
                                                <MenuItem key={t._id} value={t._id}>
                                                    {t.tableName} (Cap: {t.capacity}) - {t.location}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Guest Name"
                                        fullWidth
                                        required
                                        InputLabelProps={{ sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } } }}
                                        value={newBooking.firstName}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                            setNewBooking({ ...newBooking, firstName: val });
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                        <PhoneInput
                                            value={newBooking.phone}
                                            onChange={(val) => {
                                                const clean = val.replace(/\D/g, '');
                                                if (clean.length <= 10) {
                                                    setNewBooking({ ...newBooking, phone: clean });
                                                }
                                            }}
                                            dialCode={newBooking.dialCode || '1'}
                                            onDialCodeChange={(code) => setNewBooking({ ...newBooking, dialCode: code })}
                                            label="Phone Number"
                                            required
                                            fullWidth
                                        />
                                    </Box>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        label="Special Requests"
                                        fullWidth
                                        multiline
                                        rows={2}
                                        value={newBooking.specialRequests}
                                        onChange={(e) => setNewBooking({ ...newBooking, specialRequests: e.target.value })}
                                    />
                                </Grid>
                            </Grid>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                        {bookingStep === 1 ? (
                            <Button variant="contained" onClick={handleCheckAvailability} disabled={processing}>
                                Check Availability
                            </Button>
                        ) : (
                            <>
                                <Button onClick={() => setBookingStep(1)}>Back</Button>
                                <Button variant="contained" onClick={handleCreateBooking} disabled={processing}>
                                    Confirm Table
                                </Button>
                            </>
                        )}
                    </DialogActions>
                </Dialog>

                {/* Details Dialog */}
                <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Booking Details
                        <IconButton
                            onClick={() => setDetailsOpen(false)}
                            size="small"
                            sx={{
                                bgcolor: 'error.main',
                                color: 'white',
                                width: 24,
                                height: 24,
                                '&:hover': { bgcolor: 'error.dark' }
                            }}
                        >
                            <Close sx={{ fontSize: '1rem' }} />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        {selectedBooking && (
                            <Box>
                                <Typography variant="subtitle1" gutterBottom><strong>ID:</strong> {selectedBooking.bookingId}</Typography>
                                <Typography variant="subtitle1" gutterBottom>
                                    <strong>Customer:</strong> {selectedBooking.customer?.name || selectedBooking.guestInfo?.firstName}
                                </Typography>
                                <Typography variant="subtitle1" gutterBottom>
                                    <strong>Contact:</strong> {selectedBooking.customer?.phone || selectedBooking.guestInfo?.phone}
                                </Typography>
                                <Typography variant="subtitle1" gutterBottom>
                                    <strong>Email:</strong> {selectedBooking.customer?.email || selectedBooking.guestInfo?.email}
                                </Typography>
                                <Typography variant="subtitle1" gutterBottom>
                                    <strong>Date:</strong> {new Date(selectedBooking.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                                </Typography>
                                <Typography variant="subtitle1" gutterBottom>
                                    <strong>Time:</strong> {selectedBooking.timeSlot?.requested}
                                </Typography>
                                <Typography variant="subtitle1" gutterBottom>
                                    <strong>Table:</strong> {selectedBooking.table?.tableName || selectedBooking.table?.tableNumber}
                                </Typography>
                                <Typography variant="subtitle1" gutterBottom>
                                    <strong>Guests:</strong> {selectedBooking.guests}
                                </Typography>
                                <Typography variant="subtitle1" gutterBottom>
                                    <strong>Occasion:</strong> {selectedBooking.occasion || 'None'}
                                </Typography>
                                <Typography variant="subtitle1" gutterBottom>
                                    <strong>Special Requests:</strong> {selectedBooking.specialRequests || 'None'}
                                </Typography>
                                <Typography variant="subtitle1" gutterBottom>
                                    <strong>Status:</strong> {selectedBooking.status}
                                </Typography>
                                {selectedBooking.reservationFee && selectedBooking.reservationFee.amount > 0 && (
                                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                        <Typography variant="subtitle2" color="primary" gutterBottom>Reservation Fee</Typography>
                                        <Typography variant="body2"><strong>Amount:</strong> ${selectedBooking.reservationFee.amount}</Typography>
                                        <Typography variant="body2">
                                            <strong>Payment:</strong> {selectedBooking.reservationFee.paid ? (
                                                <Chip label="PAID" size="small" color="success" sx={{ ml: 1, height: 20 }} />
                                            ) : (
                                                <Chip label="UNPAID" size="small" color="default" sx={{ ml: 1, height: 20 }} />
                                            )}
                                        </Typography>
                                        {selectedBooking.reservationFee.refunded && (
                                            <Typography variant="body2" sx={{ mt: 1, color: 'error.main', fontWeight: 'bold' }}>
                                                REFUNDED
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        {selectedBooking?.status === 'confirmed' && (
                            <Button
                                variant="contained"
                                startIcon={<OrderIcon />}
                                onClick={() => {
                                    handleCreateOrder(selectedBooking);
                                    setDetailsOpen(false);
                                }}
                            >
                                Order Food
                            </Button>
                        )}
                        {selectedBooking?.status === 'pending' && (
                            <>
                                <Button
                                    color="error"
                                    onClick={() => {
                                        setDetailsOpen(false);
                                        openActionDialog(selectedBooking, 'reject');
                                    }}
                                >
                                    Reject
                                </Button>
                                <Button
                                    color="success"
                                    variant="contained"
                                    onClick={() => {
                                        setDetailsOpen(false);
                                        openActionDialog(selectedBooking, 'approve');
                                    }}
                                >
                                    Approve
                                </Button>
                            </>
                        )}
                        <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                    </DialogActions>
                </Dialog>

                {/* Action Dialog */}
                <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)}>
                    <DialogTitle>
                        {actionType === 'approve' ? 'Table Confirmation' : 'Reject Booking'}
                    </DialogTitle>
                    <DialogContent>
                        <Typography gutterBottom>
                            {actionType === 'approve'
                                ? 'Are you sure you want to confirm this table booking?'
                                : `Are you sure you want to ${actionType} this booking?`}
                        </Typography>
                        <TextField
                            fullWidth
                            label={actionType === 'approve' ? 'Note to guest (optional)' : 'Reason for rejection (optional)'}
                            placeholder={actionType === 'approve'
                                ? 'Example: Your table is confirmed near the window.'
                                : 'Example: We are fully booked for that slot, please try 8:00 PM.'}
                            value={actionNote}
                            onChange={(e) => setActionNote(e.target.value)}
                            margin="dense"
                            multiline
                            minRows={2}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant="contained"
                            color={actionType === 'approve' ? 'success' : 'error'}
                            onClick={handleStatusUpdate}
                            disabled={processing}
                        >
                            {processing ? 'Processing...' : (actionType === 'approve' ? 'Confirm Table' : 'Confirm')}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </LocalizationProvider>
    );
};

export default BookingsAdminPage;
