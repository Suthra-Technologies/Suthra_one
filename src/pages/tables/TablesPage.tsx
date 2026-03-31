// src/pages/tables/TablesPage.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Box,
    Typography,
    Paper,
    Card,
    CardContent,
    CardActionArea,
    Chip,
    CircularProgress,
    Button,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    FormHelperText,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Menu,
    ListItemIcon,
    ListItemText,
    Divider,
    Badge,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    InputAdornment,
    TablePagination,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    TableRestaurant as TableIcon,
    EventSeat as BookIcon,
    MoreVert as MoreVertIcon,
    CheckCircle as AvailableIcon,
    Block as OccupiedIcon,
    EventAvailable as ReservedIcon,
    CleaningServices as CleaningIcon,
    DoNotDisturb as OutOfOrderIcon,
    Lock as PartialIcon,
    Search as SearchIcon,
    Today as TodayIcon,
    CalendarMonth as CalendarIcon,
    FilterList as FilterIcon,
    Refresh as RefreshIcon,
    Close as CloseIcon,
    ShoppingCart as OrderIcon,
    ViewList as ListIcon,
    Timeline as TimelineIcon,
} from '@mui/icons-material';
import { validatePhone, validateEmail } from '../../utils/validation';
import { useSettings } from '../../context/SettingsContext';
import PhoneInput from '../../components/PhoneInput';
import { tablesAPI, bookingsAPI } from '../../services/api';

// Import Table Images
import Table2Img from '../../assets/images/table-2.jpeg';
import Table4Img from '../../assets/images/table-4.jpeg';
import Table6Img from '../../assets/images/table-6.jpeg';
import Table8Img from '../../assets/images/table-8.jpeg';
import Table10Img from '../../assets/images/table-10.jpeg';
import Table12Img from '../../assets/images/table-12.jpeg';
import Table14Img from '../../assets/images/table-14.jpeg';
import Table16Img from '../../assets/images/table-16.jpeg';
import Table18Img from '../../assets/images/table-18.jpeg';
import Table20Img from '../../assets/images/table-20.jpeg';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

// Helper to get table image based on capacity
const getTableImage = (capacity: number) => {
    if (capacity <= 2) return Table2Img;
    if (capacity <= 4) return Table4Img;
    if (capacity <= 6) return Table6Img;
    if (capacity <= 8) return Table8Img;
    if (capacity <= 10) return Table10Img;
    if (capacity <= 12) return Table12Img;
    if (capacity <= 14) return Table14Img;
    if (capacity <= 16) return Table16Img;
    if (capacity <= 18) return Table18Img;
    return Table20Img;
};

const CAPACITY_OPTIONS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

const TablesPage: React.FC = () => {
    const { tenantSlug } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const [tables, setTables] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const [bookingViewMode, setBookingViewMode] = useState(0);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Filter State
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Bookings Filter State
    const [bookingDateFilter, setBookingDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
    const [bookingSearchQuery, setBookingSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Add Table Dialog
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [newTableNumber, setNewTableNumber] = useState(0);
    const [newTableCapacity, setNewTableCapacity] = useState(0);
    const [newTableLocation, setNewTableLocation] = useState('indoor');
    const [newTableStatus, setNewTableStatus] = useState('available');

    // Custom Location State
    const [customLocations, setCustomLocations] = useState<string[]>([]);
    const [addLocationDialogOpen, setAddLocationDialogOpen] = useState(false);
    const [newLocationName, setNewLocationName] = useState('');

    // Edit Table Dialog
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState<any>(null);

    // Booking Dialog State
    const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
    const [viewBookingDialogOpen, setViewBookingDialogOpen] = useState(false);
    const [selectedBookingForView, setSelectedBookingForView] = useState<any>(null);
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
    const [bookingTime, setBookingTime] = useState('19:00');
    const [guestCount, setGuestCount] = useState(2);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerDialCode, setCustomerDialCode] = useState(settings?.restaurant?.dialCode || '1');
    const [customerEmail, setCustomerEmail] = useState('');
    const [bookingDuration, setBookingDuration] = useState(120);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tableToDelete, setTableToDelete] = useState<any>(null);

    // Sync dial code with settings
    useEffect(() => {
        if (settings?.restaurant?.dialCode && !customerPhone) {
            setCustomerDialCode(settings.restaurant.dialCode);
        }
    }, [settings?.restaurant?.dialCode]);

    // Quick Actions Menu
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuTable, setMenuTable] = useState<any>(null);

    // Available Time Slots Management
    const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

    useEffect(() => {
        const fetchUnavailableSlots = async () => {
            // Generate all slots first
            const slots: string[] = [];
            for (let h = 11; h < 22; h++) {
                slots.push(`${h.toString().padStart(2, '0')}:00`);
                slots.push(`${h.toString().padStart(2, '0')}:30`);
            }

            // 1. Filter out past times if date is today
            const today = new Date();
            const selectedDate = new Date(bookingDate);
            const isToday = selectedDate.toDateString() === today.toDateString();

            let filteredSlots = slots;
            if (isToday) {
                const currentHours = today.getHours();
                const currentMinutes = today.getMinutes();
                filteredSlots = slots.filter(slot => {
                    const [h, m] = slot.split(':').map(Number);
                    if (h < currentHours) return false;
                    if (h === currentHours && m < currentMinutes) return false;
                    return true;
                });
            }

            // 2. Fetch unavailable slots from backend
            if (bookingDate) {
                try {
                    const res = await bookingsAPI.getUnavailableSlots(bookingDate, guestCount || 2);
                    const unavailable = res.data || [];
                    filteredSlots = filteredSlots.filter(s => !unavailable.includes(s));
                } catch (e) {
                    console.error("Failed to fetch unavailable slots", e);
                }
            }

            setAvailableTimeSlots(filteredSlots);
        };
        fetchUnavailableSlots();
    }, [bookingDate, guestCount]);

    const fetchTables = async () => {
        try {
            setLoading(true);
            const response = await tablesAPI.getAll();
            setTables(response.data);

            const defaultLocations = ['indoor', 'outdoor', 'private_room', 'bar', 'patio', 'main_dining', 'vip_section', 'party_hall', 'terrace'];
            const locations = response.data.map((t: any) => t.location).filter(Boolean);
            const uniqueCustom = [...new Set(locations)].filter(loc => !defaultLocations.includes(loc as string)) as string[];
            setCustomLocations(uniqueCustom);
        } catch (error) {
            console.error('Error fetching tables:', error);
            toast.error('Failed to load tables');
        } finally {
            setLoading(false);
        }
    };

    const fetchBookings = async () => {
        try {
            setBookingsLoading(true);
            const response = await bookingsAPI.getAll({ limit: 1000 });
            setBookings(response.data.data || []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            toast.error('Failed to load bookings');
        } finally {
            setBookingsLoading(false);
        }
    };

    // Auto-checkout paid bookings
    useEffect(() => {
        // We need both bookings and tables to be loaded to cross-reference
        if (bookings.length === 0 || tables.length === 0) return;

        const checkPaidBookings = async () => {
            const paidBookings = bookings.filter(b => {
                // Must be active booking that is checked in
                if (!((b.status === 'confirmed' || b.status === 'pending') && b.checkedIn)) return false;

                // Find the real table object from the tables state to get the most up-to-date order info
                // b.table might be just an ID or a partial object
                const tableId = b.table?._id || (typeof b.table === 'string' ? b.table : null);
                if (!tableId) return false;

                const realTable = tables.find(t => t._id === tableId);

                // If the table has an active order, check its status
                if (realTable?.currentOrder) {
                    const order = realTable.currentOrder;
                    // Check if the order is completed/paid
                    // Note: 'status' or 'paymentStatus' might be used depending on API response
                    return (
                        order.paymentStatus === 'completed' ||
                        order.paymentStatus === 'paid' ||
                        order.status === 'completed'
                    );
                }

                // If table has no current order but booking is checked in:
                // 1. If table is available/cleaning, it implies the order was completed and table freed -> Complete Booking.
                // 2. If table is occupied, it implies the guests are seated but haven't ordered -> Keep Active (Check In).
                if (realTable.status === 'available' || realTable.status === 'cleaning') {
                    return true;
                }

                return false;
            });

            if (paidBookings.length > 0) {
                try {
                    await Promise.all(paidBookings.map(b => bookingsAPI.updateStatus(b._id, 'completed')));
                    toast.success(`Automatically checked out ${paidBookings.length} paid booking(s)`);
                    fetchBookings();
                    // fetchTables(); // No need to fetch tables again if we just used them, but maybe to reflect booking status?
                } catch (error) {
                    console.error('Error auto-checking out bookings:', error);
                }
            }
        };

        if (!bookingsLoading) {
            checkPaidBookings();
        }
    }, [bookings, tables, bookingsLoading]);
    const [touched, setTouched] = useState({
        tableName: false,
        tableNumber: false,
        capacity: false,
        location: false,
        status: false
    });
    const [errors, setErrors] = useState({
        tableName: '',
        tableNumber: '',
        capacity: '',
        location: '',
        status: ''
    });
    const [bookingTouched, setBookingTouched] = useState({
        date: false,
        time: false,
        customerName: false,
        customerPhone: false,
        guests: false,
        duration: false,
        customerEmail: false
    });
    const [bookingErrors, setBookingErrors] = useState({
        date: '',
        time: '',
        customerName: '',
        customerPhone: '',
        guests: '',
        duration: '',
        customerEmail: ''
    });

    const handleAddTable = async () => {
        // Validate before submitting
        if (!validateAll()) {
            toast.error('Please fill all the required fields correctly');
            return;
        }
        try {
            const payload = {
                tableName: newTableName,
                tableNumber: newTableNumber,
                capacity: newTableCapacity,
                location: newTableLocation,
                status: newTableStatus,
            };
            await tablesAPI.create(payload);
            toast.success('Table added successfully');
            setAddDialogOpen(false);
            // reset fields
            setNewTableName('');
            setNewTableNumber(0);
            setNewTableCapacity(0);
            setNewTableLocation('indoor');
            setNewTableStatus('available');
            fetchTables();
        } catch (error: any) {
            console.error('Error adding table:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to add table';
            toast.error(errorMessage);
        }
    };

    const handleEditTable = (table: any) => {
        setSelectedTable(table);
        setEditDialogOpen(true);
        handleCloseMenu();
    };

    const handleUpdateTable = async () => {
        if (!selectedTable) return;
        try {
            const updateData = {
                tableName: selectedTable.tableName,
                tableNumber: selectedTable.tableNumber,
                capacity: selectedTable.capacity,
                location: selectedTable.location,
                status: selectedTable.status,
            };
            await tablesAPI.update(selectedTable._id, updateData);
            toast.success('Table updated successfully');
            setEditDialogOpen(false);
            setSelectedTable(null);
            fetchTables();
        } catch (error) {
            console.error('Error updating table:', error);
            toast.error('Failed to update table');
        }
    };
    const validateField = (name: string, value: any): string => {
        let error = '';
        if (name === 'tableName') {
            const val = value ? value.toString().trim() : '';
            if (val.length > 0 && val.length < 2) {
                error = 'Table name must be at least 2 characters';
            }
        }
        if (name === 'tableNumber') {
            const raw = value === undefined || value === null || value === '' ? '' : value.toString();
            if (raw === '') {
                error = 'Table number is required';
            } else {
                const num = Number(raw);
                if (Number.isNaN(num) || !Number.isInteger(num)) {
                    error = 'Table number must be a whole number';
                } else if (num < 1) {
                    error = 'Table number must be at least 1';
                }

            }
        }
        if (name === 'capacity') {
            const raw = value === undefined || value === null || value === '' ? '' : value.toString();
            if (raw === '') {
                error = 'Capacity is required';
            } else {
                const num = Number(raw);
                if (Number.isNaN(num) || !Number.isInteger(num)) {
                    error = 'Capacity must be a whole number';
                } else if (num < 1) {
                    error = 'Capacity must be at least 1';
                }
            }
        }
        if (name === 'location') {
            if (!value || value.toString().trim() === '') {
                error = 'Location is required';
            }
        }
        if (name === 'status') {
            if (!value || value.toString().trim() === '') {
                error = 'Status is required';
            }
        }
        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
    };

    // Validate all add-table fields and mark them touched so errors show in UI
    const validateAll = (): boolean => {
        const fields = ['tableName', 'tableNumber', 'capacity', 'location', 'status'];
        // mark all as touched
        setTouched(prev => {
            const next = { ...prev } as any;
            fields.forEach(f => next[f] = true);
            return next;
        });

        let hasError = false;
        fields.forEach((f) => {
            let value: any;
            switch (f) {
                case 'tableName': value = newTableName; break;
                case 'tableNumber': value = newTableNumber; break;
                case 'capacity': value = newTableCapacity; break;
                case 'location': value = newTableLocation; break;
                case 'status': value = newTableStatus; break;
                default: value = '';
            }
            const err = validateField(f, value);
            if (err) hasError = true;
        });

        return !hasError;
    };
    const handleDeleteTable = (table: any) => {
        setTableToDelete(table);
        setDeleteDialogOpen(true);
        handleCloseMenu();
    };

    const confirmDeleteTable = async () => {
        if (!tableToDelete) return;
        try {
            await tablesAPI.delete(tableToDelete._id);
            toast.success('Table deleted successfully');
            setDeleteDialogOpen(false);
            setTableToDelete(null);
            fetchTables();
        } catch (error) {
            console.error('Error deleting table:', error);
            toast.error('Failed to delete table');
        }
    };

    const validateBookingField = (name: string, value: any): string => {
        let error = '';
        if (name === 'date') {
            if (!value || value.trim() === '') {
                error = 'Date is required';
            }
        }
        if (name === 'time') {
            if (!value || value.trim() === '') {
                error = 'Time is required';
            }
        }
        if (name === 'customerName') {
            if (!value || value.trim() === '') {
                error = 'Customer name is required';
            }
        }
        if (name === 'customerPhone') {
            const validation = validatePhone(value);
            if (!validation.isValid) {
                error = validation.message || '';
            }
        }
        if (name === 'guests') {
            if (value === undefined || value === null || value === '') {
                error = 'Number of guests is required';
            } else if (value < 1) {
                error = 'Number of guests must be at least 1';
            } else if (value < 0) {
                error = 'Number of guests cannot be negative';
            }
        }
        if (name === 'duration') {
            if (value === undefined || value === null || value === '') {
                error = 'Duration is required';
            } else if (value < 1) {
                error = 'Duration must be at least 1 minute';
            } else if (value < 0) {
                error = 'Duration cannot be negative';
            }
        }
        if (name === 'customerEmail') {
            if (value && value.trim() !== '') {
                const validation = validateEmail(value);
                if (!validation.isValid) {
                    error = validation.message || '';
                }
            }
        }
        setBookingErrors(prev => ({ ...prev, [name]: error }));
        return error;
    };

    const handleOpenBooking = (table: any) => {
        setSelectedTable(table);
        setGuestCount(Math.min(2, table.capacity));
        setBookingTouched({ date: false, time: false, customerName: false, customerPhone: false, guests: false, duration: false, customerEmail: false });
        setBookingErrors({ date: '', time: '', customerName: '', customerPhone: '', guests: '', duration: '', customerEmail: '' });
        setBookingDialogOpen(true);
        handleCloseMenu();
    };

    const handleViewBooking = (booking: any) => {
        setSelectedBookingForView(booking);
        setViewBookingDialogOpen(true);
    };

    const handleCreateBooking = async () => {
        if (!selectedTable) return;

        // Validate all fields
        const fields = ['date', 'time', 'customerName', 'customerPhone', 'guests', 'duration', 'customerEmail'];
        setBookingTouched({ date: true, time: true, customerName: true, customerPhone: true, guests: true, duration: true, customerEmail: true });

        let hasError = false;
        const values: any = {
            date: bookingDate,
            time: bookingTime,
            customerName: customerName,
            customerPhone: customerPhone,
            guests: guestCount,
            duration: bookingDuration
        };

        fields.forEach((field) => {
            const err = validateBookingField(field, values[field]);
            if (err) hasError = true;
        });

        if (hasError) {
            toast.error('Please fill all required fields');
            return;
        }

        if (guestCount > selectedTable.capacity) {
            toast.error(`Guest count exceeds table capacity (${selectedTable.capacity})`);
            return;
        }

        try {
            const payload = {
                tableId: selectedTable._id,
                bookingDate,
                bookingTime,
                guestCount,
                duration: bookingDuration,
                guestInfo: {
                    firstName: customerName.split(' ')[0] || customerName,
                    lastName: customerName.split(' ').slice(1).join(' ') || '',
                    phone: customerPhone,
                    dialCode: customerDialCode,
                    email: customerEmail || undefined
                },
                source: 'admin',
            };

            await bookingsAPI.create(payload);
            toast.success('Booking created successfully');
            setBookingDialogOpen(false);

            // Reset booking fields
            setCustomerName('');
            setCustomerPhone('');
            setCustomerEmail('');
            setBookingDate(new Date().toISOString().split('T')[0]);
            setBookingTime('19:00');

            fetchTables();
            fetchBookings();
        } catch (error: any) {
            console.error('Error creating booking:', error);
            toast.error(error.response?.data?.message || 'Failed to create booking');
        }
    };

    // Quick Status Update
    const handleQuickStatusChange = async (tableId: string, newStatus: string) => {
        try {
            await tablesAPI.updateStatus(tableId, newStatus);
            toast.success(`Table status updated to ${newStatus}`);
            fetchTables();
        } catch (error) {
            console.error('Error updating table status:', error);
            toast.error('Failed to update table status');
        }
        handleCloseMenu();
    };

    // Booking Status Update
    const handleBookingStatusChange = async (bookingId: string, newStatus: string) => {
        try {
            await bookingsAPI.updateStatus(bookingId, newStatus);
            toast.success(`Booking ${newStatus}`);
            fetchBookings();
            fetchTables();
        } catch (error) {
            console.error('Error updating booking status:', error);
            toast.error('Failed to update booking');
        }
    };

    const handleCheckIn = async (bookingId: string) => {
        try {
            // Find the booking in local state to check if already checked in
            const existingBooking = bookings.find(b => b._id === bookingId);
            let booking = existingBooking;

            // Only call API if not already checked in
            if (!existingBooking?.checkedIn) {
                const response = await bookingsAPI.checkIn(bookingId);
                toast.success('Guest checked in successfully');
                fetchBookings();
                fetchTables();
                booking = response.data;
            } else {
                // If already checked in, just proceed to navigation logic
                // We might want to refresh tables to ensure we have latest order info though
                fetchTables();
            }

            if (!booking) return;

            // Navigate to POS for this table immediately
            // booking.table might be populated object or ID string depending on backend
            // Our backend bookings.service checkIn returns the booking doc. 
            // If it's populated on backend, good. If not, we might need to rely on the local list or just ID
            const tableId = (booking.table && booking.table._id) ? booking.table._id : booking.table;

            if (tableId) {
                const queryParams = new URLSearchParams({
                    tableId: tableId.toString(),
                    guestCount: booking.guests?.toString() || '1'
                });

                // Get customer info prioritizing populated customer object, then fall back to guestInfo
                const name = booking.customer?.name ||
                    (booking.guestInfo ? `${booking.guestInfo.firstName || ''} ${booking.guestInfo.lastName || ''}`.trim() : '');
                const phone = booking.customer?.phone || booking.guestInfo?.phone || '';
                const email = booking.customer?.email || booking.guestInfo?.email || '';

                if (name) queryParams.append('customerName', name);
                if (phone) queryParams.append('customerPhone', phone);
                if (email) queryParams.append('customerEmail', email);

                navigate(`/${tenantSlug}/pos?${queryParams.toString()}`);
            }

        } catch (error: any) {
            console.error('Error checking in:', error);
            const msg = error.response?.data?.message || 'Failed to check in guest';
            toast.error(msg);
        }
    };

    // Menu handlers
    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, table: any) => {
        setAnchorEl(event.currentTarget);
        setMenuTable(table);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setMenuTable(null);
    };

    useEffect(() => {
        fetchTables();
        fetchBookings();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available':
                return 'success';
            case 'occupied':
                return 'error';
            case 'partially_occupied':
                return 'error'; // Also red, but maybe distinct? Let's treat like occupied error for now
            case 'reserved':
                return 'warning';
            case 'cleaning':
                return 'info';
            case 'out_of_order':
                return 'default';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'available':
                return <AvailableIcon fontSize="small" />;
            case 'occupied':
                return <OccupiedIcon fontSize="small" />;
            case 'partially_occupied':
                return <PartialIcon fontSize="small" />;
            // case 'reserved':
            //     return <ReservedIcon fontSize="small" />;
            // case 'cleaning':
            //     return <CleaningIcon fontSize="small" />;
            case 'out_of_order':
                return <OutOfOrderIcon fontSize="small" />;
            default:
                return undefined;
        }
    };

    const getBookingStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'success';
            case 'pending':
                return 'warning';
            case 'cancelled':
                return 'error';
            case 'completed':
                return 'info';
            case 'no_show':
                return 'default';
            default:
                return 'default';
        }
    };

    // Filter tables based on status
    const filteredTables = statusFilter === 'all'
        ? tables
        : tables.filter(t => t.status === statusFilter);

    // Count tables by status
    const statusCounts = {
        all: tables.length,
        available: tables.filter(t => t.status === 'available').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        partially_occupied: tables.filter(t => t.status === 'partially_occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length,
        cleaning: tables.filter(t => t.status === 'cleaning').length,
    };

    // Filter bookings based on date, status, and search
    const filteredBookings = bookings.filter(booking => {
        // Date filter
        if (bookingDateFilter) {
            const bookingDateStr = new Date(booking.date).toISOString().split('T')[0];
            if (bookingDateStr !== bookingDateFilter) return false;
        }

        // Status filter
        if (bookingStatusFilter !== 'all' && booking.status !== bookingStatusFilter) {
            return false;
        }

        // Search filter
        if (bookingSearchQuery) {
            const query = bookingSearchQuery.toLowerCase();
            const customerName = `${booking.guestInfo?.firstName || ''} ${booking.guestInfo?.lastName || ''}`.toLowerCase();
            const phone = (booking.guestInfo?.phone || '').toLowerCase();
            const email = (booking.guestInfo?.email || '').toLowerCase();
            const bookingId = (booking.bookingId || '').toLowerCase();
            const tableName = (booking.table?.tableName || booking.table?.tableNumber || '').toString().toLowerCase();

            if (!customerName.includes(query) &&
                !phone.includes(query) &&
                !email.includes(query) &&
                !bookingId.includes(query) &&
                !tableName.includes(query)) {
                return false;
            }
        }

        return true;
    });

    // Pagination
    const paginatedBookings = filteredBookings.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    // Count bookings by status for the selected date
    const bookingStatusCounts = {
        all: filteredBookings.length,
        pending: bookings.filter(b => {
            const d = new Date(b.date).toISOString().split('T')[0];
            return (!bookingDateFilter || d === bookingDateFilter) && b.status === 'pending';
        }).length,
        confirmed: bookings.filter(b => {
            const d = new Date(b.date).toISOString().split('T')[0];
            return (!bookingDateFilter || d === bookingDateFilter) && b.status === 'confirmed';
        }).length,
        completed: bookings.filter(b => {
            const d = new Date(b.date).toISOString().split('T')[0];
            return (!bookingDateFilter || d === bookingDateFilter) && b.status === 'completed';
        }).length,
        cancelled: bookings.filter(b => {
            const d = new Date(b.date).toISOString().split('T')[0];
            return (!bookingDateFilter || d === bookingDateFilter) && b.status === 'cancelled';
        }).length,
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            timeZone: 'UTC'
        });
    };

    // Check if selected date is today
    const isToday = bookingDateFilter === new Date().toISOString().split('T')[0];

    // Timeline Helpers
    const timelineStartHour = 11;
    const timelineEndHour = 23;
    const totalHours = timelineEndHour - timelineStartHour;

    const getBookingPosition = (booking: any) => {
        const date = new Date(booking.date);
        const start = new Date(booking.timeSlot?.start || date);
        if (isNaN(start.getTime())) return { left: '0%', width: '0%' };

        const startHour = start.getHours() + (start.getMinutes() / 60);
        let relativeStart = startHour - timelineStartHour;

        const durationHours = (booking.duration || 120) / 60;

        let leftPercent = (relativeStart / totalHours) * 100;
        let widthPercent = (durationHours / totalHours) * 100;

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

    return (
        <Box>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, gap: 2 }}>
                <Typography variant="h4">Table Management</Typography>
                <Button variant="contained" fullWidth={false} sx={{ width: { xs: '100%', sm: 'auto' } }} startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
                    Add Table
                </Button>
            </Box>

            {/* Tabs */}
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
                <Tab
                    label={
                        <Badge badgeContent={tables.length} color="primary" max={99}>
                            <Box sx={{ pr: 2 }}>Tables</Box>
                        </Badge>
                    }
                />
                <Tab
                    label={
                        <Badge badgeContent={filteredBookings.length} color="warning" max={99}>
                            <Box sx={{ pr: 2 }}>Bookings</Box>
                        </Badge>
                    }
                />
            </Tabs>

            {/* Tab Panel: Tables */}
            <TabPanel value={tabValue} index={0}>
                {/* Status Filter Chips */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                    <Chip
                        label={`All (${statusCounts.all})`}
                        color={statusFilter === 'all' ? 'primary' : 'default'}
                        variant={statusFilter === 'all' ? 'filled' : 'outlined'}
                        onClick={() => setStatusFilter('all')}
                    />
                    <Chip
                        // icon={<AvailableIcon />}
                        label={`Available (${statusCounts.available})`}
                        color={statusFilter === 'available' ? 'primary' : 'default'}
                        variant={statusFilter === 'available' ? 'filled' : 'outlined'}
                        onClick={() => setStatusFilter('available')}
                    />
                    <Chip
                        // icon={<OccupiedIcon />}
                        label={`Occupied (${statusCounts.occupied})`}
                        color={statusFilter === 'occupied' ? 'primary' : 'default'}
                        variant={statusFilter === 'occupied' ? 'filled' : 'outlined'}
                        onClick={() => setStatusFilter('occupied')}
                    />
                    {/* <Chip
                        icon={<PartialIcon />}
                        label={`Partial (${statusCounts.partially_occupied})`}
                        color={statusFilter === 'partially_occupied' ? 'error' : 'default'}
                        onClick={() => setStatusFilter('partially_occupied')}
                    /> */}
                    <Chip
                        // icon={<ReservedIcon />}
                        label={`Reserved (${statusCounts.reserved})`}
                        color={statusFilter === 'reserved' ? 'primary' : 'default'}
                        variant={statusFilter === 'reserved' ? 'filled' : 'outlined'}
                        onClick={() => setStatusFilter('reserved')}
                    />
                    {/* <Chip
                        icon={<CleaningIcon />}
                        label={`Cleaning (${statusCounts.cleaning})`}
                        color={statusFilter === 'cleaning' ? 'info' : 'default'}
                        onClick={() => setStatusFilter('cleaning')}
                    /> */}
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                        <CircularProgress />
                    </Box>
                ) : filteredTables.length === 0 ? (
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body1" color="text.secondary">
                            No tables found.
                        </Typography>
                    </Paper>
                ) : (
                    <Grid container spacing={3}>
                        {filteredTables.map((table) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={table._id}>
                                <Card sx={{
                                    position: 'relative',
                                    borderLeft: `4px solid`,
                                    borderLeftColor: `${getStatusColor(table.status)}.main`,
                                }}>
                                    <CardActionArea onClick={() => handleOpenBooking(table)}>
                                        <CardContent sx={{ textAlign: 'center', p: 0, pb: 1 }}>
                                            <Box sx={{ mb: 2, position: 'relative', width: '100%', mx: 0 }}>
                                                <Box
                                                    component="img"
                                                    src={getTableImage(table.capacity)}
                                                    alt={`Table for ${table.capacity}`}
                                                    sx={{
                                                        width: '100%',
                                                        height: 180,
                                                        objectFit: 'cover',
                                                        opacity: table.status === 'occupied' ? 0.7 : 1,
                                                        filter: table.status === 'occupied' ? 'grayscale(50%)' : 'none',
                                                        transition: 'all 0.3s ease',
                                                        borderRadius: '4px 4px 0 0'
                                                    }}
                                                />
                                                <Chip
                                                    icon={getStatusIcon(table.status)}
                                                    label={table.status.toUpperCase()}
                                                    color={getStatusColor(table.status) as any}
                                                    size="small"
                                                    sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1, boxShadow: 1, bgcolor: 'rgba(255,255,255,0.9)' }}
                                                />
                                            </Box>
                                            <Typography variant="h5" gutterBottom>
                                                {table.tableName || `Table ${table.tableNumber}`}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Capacity: {table.capacity} | {table.location}
                                            </Typography>
                                        </CardContent>
                                    </CardActionArea>

                                    {/* Quick Actions */}
                                    <Box sx={{ p: 1, pt: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Stack direction="row" spacing={0.5}>
                                            <Tooltip title={table.status === 'occupied' || table.status === 'partially_occupied' || table.status === 'served' ? "View Order / Checkout" : "Take Order"}>
                                                <IconButton size="small" color={table.status === 'occupied' || table.status === 'partially_occupied' || table.status === 'served' ? "warning" : "primary"} onClick={() => navigate(`/${tenantSlug}/pos?tableId=${table._id}`)}>
                                                    <OrderIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>

                                            {/* {table.status !== 'available' && (
                                                <Tooltip title="Set Available">
                                                    <IconButton size="small" color="success" onClick={() => handleQuickStatusChange(table._id, 'available')}>
                                                        <AvailableIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )} */}
                                            {/* {table.status !== 'occupied' && table.status !== 'partially_occupied' && (
                                                <Tooltip title="Set Occupied">
                                                    <IconButton size="small" color="error" onClick={() => handleQuickStatusChange(table._id, 'occupied')}>
                                                        <OccupiedIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )} */}
                                            {/* {table.status !== 'cleaning' && (
                                                <Tooltip title="Set Cleaning">
                                                    <IconButton size="small" color="info" onClick={() => handleQuickStatusChange(table._id, 'cleaning')}>
                                                        <CleaningIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )} */}
                                        </Stack>

                                        <IconButton size="small" onClick={(e) => handleOpenMenu(e, table)}>
                                            <MoreVertIcon />
                                        </IconButton>
                                    </Box>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </TabPanel>

            {/* Tab Panel: All Bookings */}
            <TabPanel value={tabValue} index={1}>
                {/* View Switcher */}
                <Paper sx={{ mb: 3 }}>
                    <Tabs value={bookingViewMode} onChange={(_, v) => setBookingViewMode(v)} variant={isMobile ? "fullWidth" : "standard"}>
                        <Tab icon={<ListIcon />} iconPosition="start" label="List View" />
                        <Tab icon={<TimelineIcon />} iconPosition="start" label="Timeline View" />
                    </Tabs>
                </Paper>

                {/* Filters - Shared for both views */}
                <Paper sx={{ p: 2, mb: 2.5 }}>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        gap: 2,
                        alignItems: { xs: 'stretch', md: 'center' },
                        justifyContent: 'space-between',
                        width: '100%'
                    }}>
                        {/* Date Filter */}
                        <TextField
                            label="Date"
                            type="date"
                            value={bookingDateFilter}
                            onChange={(e) => {
                                setBookingDateFilter(e.target.value);
                                setPage(0);
                            }}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            sx={{ minWidth: { xs: '100%', md: 180 } }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <CalendarIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Grouped Right Side: Buttons + Search */}
                        <Box sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: 2,
                            alignItems: 'center',
                            width: { xs: '100%', md: 'auto' }
                        }}>
                            {/* Quick Date Buttons */}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    size="small"
                                    variant={isToday ? 'contained' : 'outlined'}
                                    onClick={() => {
                                        setBookingDateFilter(new Date().toISOString().split('T')[0]);
                                        setPage(0);
                                    }}
                                    startIcon={<TodayIcon />}
                                    sx={{ whiteSpace: 'nowrap' }}
                                >
                                    Today
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        setBookingDateFilter('');
                                        setPage(0);
                                        if (bookingViewMode === 1) setBookingViewMode(0); // Switch to list if viewing all
                                    }}
                                    sx={{ whiteSpace: 'nowrap' }}
                                >
                                    All Dates
                                </Button>
                            </Box>

                            {/* Search */}
                            <Box sx={{ display: 'flex', width: { xs: '100%', md: '300px' }, gap: 1, alignItems: 'center' }}>
                                <TextField
                                    placeholder="Search..."
                                    value={bookingSearchQuery}
                                    onChange={(e) => {
                                        setBookingSearchQuery(e.target.value);
                                        setPage(0);
                                    }}
                                    size="small"
                                    sx={{ flexGrow: 1 }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                {/* Refresh Button (Commented) */}
                                {/* <Tooltip title="Refresh Bookings">
                                    <IconButton onClick={fetchBookings} disabled={bookingsLoading} size="small">
                                        <RefreshIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip> */}
                            </Box>
                        </Box>
                    </Box>

                    {/* Status Filter Chips */}
                    <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                            label={`All (${bookingStatusCounts.all})`}
                            color={bookingStatusFilter === 'all' ? 'primary' : 'default'}
                            onClick={() => { setBookingStatusFilter('all'); setPage(0); }}
                            size="small"
                        />
                        <Chip
                            label={`Pending (${bookingStatusCounts.pending})`}
                            color={bookingStatusFilter === 'pending' ? 'warning' : 'default'}
                            onClick={() => { setBookingStatusFilter('pending'); setPage(0); }}
                            size="small"
                        />
                        <Chip
                            label={`Confirmed (${bookingStatusCounts.confirmed})`}
                            color={bookingStatusFilter === 'confirmed' ? 'success' : 'default'}
                            onClick={() => { setBookingStatusFilter('confirmed'); setPage(0); }}
                            size="small"
                        />
                        <Chip
                            label={`Completed (${bookingStatusCounts.completed})`}
                            color={bookingStatusFilter === 'completed' ? 'info' : 'default'}
                            onClick={() => { setBookingStatusFilter('completed'); setPage(0); }}
                            size="small"
                        />
                        <Chip
                            label={`Cancelled (${bookingStatusCounts.cancelled})`}
                            color={bookingStatusFilter === 'cancelled' ? 'error' : 'default'}
                            onClick={() => { setBookingStatusFilter('cancelled'); setPage(0); }}
                            size="small"
                        />
                    </Stack>
                </Paper>

                {/* Date Header */}
                {bookingDateFilter && (
                    <Alert
                        severity="info"
                        icon={<CalendarIcon />}
                        sx={{ mb: 2 }}
                    >
                        Showing bookings for: <strong>{formatDate(bookingDateFilter)}</strong>
                        {isToday && <Chip label="Today" size="small" color="primary" sx={{ ml: 1 }} />}
                    </Alert>
                )}

                {bookingViewMode === 0 ? (
                    <>

                        {bookingsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                                <CircularProgress />
                            </Box>
                        ) : filteredBookings.length === 0 ? (
                            <Alert severity="info" icon={<TodayIcon />}>
                                No bookings found{bookingDateFilter ? ` for ${formatDate(bookingDateFilter)}` : ''}.
                            </Alert>
                        ) : (
                            <>
                                {isMobile ? (
                                    // Mobile Card View for Bookings
                                    <Stack spacing={2} mb={2}>
                                        {paginatedBookings.map((booking) => (
                                            <Card key={booking._id}>
                                                <CardContent>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                                        <Typography variant="subtitle1" fontFamily="monospace">
                                                            {booking.bookingId}
                                                        </Typography>
                                                        <Chip
                                                            label={booking.status.toUpperCase()}
                                                            color={getBookingStatusColor(booking.status) as any}
                                                            size="small"
                                                        />
                                                    </Stack>

                                                    <Grid container spacing={1} mb={2}>
                                                        <Grid size={{ xs: 6 }}>
                                                            <Typography variant="caption" color="text.secondary">Table</Typography>
                                                            <Typography variant="body2">{booking.table?.tableName || `Table ${booking.table?.tableNumber}` || 'N/A'}</Typography>
                                                        </Grid>
                                                        <Grid size={{ xs: 6 }}>
                                                            <Typography variant="caption" color="text.secondary">Date & Time</Typography>
                                                            <Typography variant="body2">{formatDate(booking.date)} {booking.timeSlot?.requested}</Typography>
                                                        </Grid>
                                                        <Grid size={{ xs: 12 }}>
                                                            <Typography variant="caption" color="text.secondary">Customer</Typography>
                                                            <Typography variant="body2" fontWeight="bold">{booking.guestInfo?.firstName} {booking.guestInfo?.lastName}</Typography>
                                                            <Typography variant="caption">{booking.guestInfo?.phone}</Typography>
                                                        </Grid>
                                                    </Grid>

                                                    <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
                                                        {booking.status === 'pending' && (
                                                            <Button size="small" variant="contained" color="success" onClick={() => handleBookingStatusChange(booking._id, 'confirmed')}>Confirm</Button>
                                                        )}
                                                        {(() => {
                                                            const tableId = booking.table?._id || (typeof booking.table === 'string' ? booking.table : null);
                                                            const realTable = tables.find(t => t._id === tableId);
                                                            const hasActiveOrder = !!realTable?.currentOrder;

                                                            return (
                                                                <>
                                                                    {(booking.status === 'confirmed' || booking.status === 'pending') && (!booking.checkedIn || !hasActiveOrder) && (
                                                                        <Button size="small" variant="contained" color="primary" onClick={() => handleCheckIn(booking._id)}>Check In</Button>
                                                                    )}
                                                                    {booking.checkedIn && booking.status !== 'completed' && hasActiveOrder && (
                                                                        <Button size="small" variant="contained" color="warning" onClick={() => handleCheckIn(booking._id)}>Checkout</Button>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                                            <Button size="small" variant="outlined" color="error" onClick={() => handleBookingStatusChange(booking._id, 'cancelled')}>Cancel</Button>
                                                        )}
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Stack>
                                ) : (
                                    <TableContainer component={Paper} sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                                        <Table>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'grey.100' }}>
                                                    <TableCell><strong>Booking ID</strong></TableCell>
                                                    <TableCell><strong>Table</strong></TableCell>
                                                    <TableCell><strong>Date</strong></TableCell>
                                                    <TableCell><strong>Time</strong></TableCell>
                                                    <TableCell><strong>Guests</strong></TableCell>
                                                    <TableCell><strong>Customer</strong></TableCell>
                                                    <TableCell><strong>Status</strong></TableCell>
                                                    <TableCell><strong>Actions</strong></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {paginatedBookings.map((booking) => (
                                                    <TableRow
                                                        key={booking._id}
                                                        hover
                                                        onClick={() => {
                                                            if (booking.status !== 'completed' && booking.status !== 'cancelled') {
                                                                handleCheckIn(booking._id);
                                                            }
                                                        }}
                                                        sx={{ cursor: (booking.status === 'completed' || booking.status === 'cancelled') ? 'default' : 'pointer' }}
                                                    >
                                                        <TableCell>
                                                            <Typography variant="body2" fontFamily="monospace">
                                                                {booking.bookingId}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                icon={<TableIcon />}
                                                                label={booking.table?.tableName || `Table ${booking.table?.tableNumber}` || 'N/A'}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {formatDate(booking.date)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight="bold">
                                                                {booking.timeSlot?.requested || '-'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={`${booking.guests} guests`}
                                                                size="small"
                                                                color="default"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box>
                                                                <Typography variant="body2" fontWeight="medium">
                                                                    {booking.guestInfo?.firstName} {booking.guestInfo?.lastName}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {booking.guestInfo?.phone}
                                                                </Typography>
                                                                {booking.guestInfo?.email && (
                                                                    <Typography variant="caption" display="block" color="text.secondary">
                                                                        {booking.guestInfo?.email}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={booking.status.toUpperCase()}
                                                                color={getBookingStatusColor(booking.status) as any}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Stack direction="row" spacing={1}>
                                                                {booking.status === 'pending' && (
                                                                    <Button
                                                                        size="small"
                                                                        variant="contained"
                                                                        color="success"
                                                                        onClick={(e) => { e.stopPropagation(); handleBookingStatusChange(booking._id, 'confirmed'); }}
                                                                    >
                                                                        Confirm
                                                                    </Button>
                                                                )}
                                                                {(() => {
                                                                    // Find real table to check order status accurately
                                                                    const tableId = booking.table?._id || (typeof booking.table === 'string' ? booking.table : null);
                                                                    const realTable = tables.find(t => t._id === tableId);
                                                                    const hasActiveOrder = !!realTable?.currentOrder;

                                                                    // Logic:
                                                                    // Check In: (Confirmed/Pending) AND (Not Checked In OR No Active Order)
                                                                    // Checkout: Checked In AND Active Order

                                                                    return (
                                                                        <>
                                                                            {(booking.status === 'confirmed' || booking.status === 'pending') && (!booking.checkedIn || !hasActiveOrder) && (
                                                                                <Button
                                                                                    size="small"
                                                                                    variant="contained"
                                                                                    color="primary"
                                                                                    onClick={(e) => { e.stopPropagation(); handleCheckIn(booking._id); }}
                                                                                >
                                                                                    Check In
                                                                                </Button>
                                                                            )}
                                                                            {booking.checkedIn && booking.status !== 'completed' && hasActiveOrder && (
                                                                                <Tooltip title={hasActiveOrder ? "Go to POS to checkout" : "Finalize booking"}>
                                                                                    <span onClick={(e) => e.stopPropagation()}>
                                                                                        <Button
                                                                                            size="small"
                                                                                            variant="contained"
                                                                                            color="warning"
                                                                                            onClick={(e) => { e.stopPropagation(); handleCheckIn(booking._id); }}
                                                                                            disabled={false}
                                                                                        >
                                                                                            Checkout
                                                                                        </Button>
                                                                                    </span>
                                                                                </Tooltip>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        color="error"
                                                                        onClick={(e) => { e.stopPropagation(); handleBookingStatusChange(booking._id, 'cancelled'); }}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                )}
                                                                {booking.status === 'completed' && (
                                                                    <Chip label="Completed" size="small" color="info" variant="outlined" />
                                                                )}
                                                                {booking.status === 'cancelled' && (
                                                                    <Chip label="Cancelled" size="small" color="error" variant="outlined" />
                                                                )}
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}

                                <TablePagination
                                    component="div"
                                    count={filteredBookings.length}
                                    page={page}
                                    onPageChange={(_, newPage) => setPage(newPage)}
                                    rowsPerPage={rowsPerPage}
                                    onRowsPerPageChange={(e) => {
                                        setRowsPerPage(parseInt(e.target.value, 10));
                                        setPage(0);
                                    }}
                                    rowsPerPageOptions={[5, 10, 25, 50]}
                                />
                            </>
                        )}
                    </>
                ) : (
                    // TIMELINE VIEW CONTENT
                    <Paper sx={{ p: isMobile ? 1 : 2, overflowX: 'auto', maxWidth: '100%' }}>
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

                            {/* Tables Timeline Rows */}
                            {tables.map(table => (
                                <Box key={table._id} sx={{ display: 'flex', mb: 2, alignItems: 'center', height: 50 }}>
                                    {/* Table Label */}
                                    <Box sx={{ width: '150px', pr: 2, borderRight: 1, borderColor: 'divider' }}>
                                        <Typography variant="subtitle2" noWrap>
                                            {table.tableName || `Table ${table.tableNumber}`}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Cap: {table.capacity}
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

                                        {/* Bookings for this table */}
                                        {bookings
                                            .filter(b => (b.table?._id === table._id || b.table === table._id) &&
                                                (!bookingDateFilter || new Date(b.date).toISOString().split('T')[0] === bookingDateFilter) &&
                                                b.status !== 'cancelled')
                                            .map(booking => {
                                                const pos = getBookingPosition(booking);
                                                return (
                                                    <Tooltip
                                                        key={booking._id}
                                                        title={`${booking.guestInfo?.firstName} - ${booking.timeSlot?.requested}`}
                                                    >
                                                        <Box
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
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                overflow: 'hidden',
                                                                px: 0.5,
                                                                opacity: 0.9,
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => handleViewBooking(booking)}
                                                        >
                                                            <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', color: '#000' }}>
                                                                {booking.guestInfo?.firstName}
                                                            </Typography>
                                                        </Box>
                                                    </Tooltip>
                                                );
                                            })}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                )}
            </TabPanel>

            {/* Context Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
            >
                <MenuItem onClick={() => menuTable && handleOpenBooking(menuTable)}>
                    <ListItemIcon><BookIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Book Table</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => menuTable && handleEditTable(menuTable)}>
                    <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Edit Table</ListItemText>
                </MenuItem>
                <Divider />
                {/* <MenuItem onClick={() => menuTable && handleQuickStatusChange(menuTable._id, 'available')}>
                    <ListItemIcon><AvailableIcon fontSize="small" color="success" /></ListItemIcon>
                    <ListItemText>Set Available</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => menuTable && handleQuickStatusChange(menuTable._id, 'occupied')}>
                    <ListItemIcon><OccupiedIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText>Set Occupied</ListItemText>
                </MenuItem> */}
                {/* <MenuItem onClick={() => menuTable && handleQuickStatusChange(menuTable._id, 'reserved')}>
                    <ListItemIcon><ReservedIcon fontSize="small" color="warning" /></ListItemIcon>
                    <ListItemText>Set Reserved</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => menuTable && handleQuickStatusChange(menuTable._id, 'cleaning')}>
                    <ListItemIcon><CleaningIcon fontSize="small" color="info" /></ListItemIcon>
                    <ListItemText>Set Cleaning</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => menuTable && handleQuickStatusChange(menuTable._id, 'out_of_order')}>
                    <ListItemIcon><OutOfOrderIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Set Out of Order</ListItemText>
                </MenuItem>
                <Divider /> */}
                <MenuItem onClick={() => menuTable && handleDeleteTable(menuTable)} sx={{ color: 'error.main' }}>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText>Delete Table</ListItemText>
                </MenuItem>
            </Menu>

            {/* Add Table Dialog */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ m: 0, p: 2, position: 'relative' }}>
                    Add New Table
                    <IconButton
                        aria-label="close"
                        onClick={() => setAddDialogOpen(false)}
                        size="small"
                        sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'error.main', color: 'common.white', '&:hover': { bgcolor: 'error.dark' }, width: 20, height: 20, padding: '4px', minWidth: 'auto', borderRadius: '50%' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        {/* <TextField
    label="Table Name"
    value={newTableName}
    onChange={e => setNewTableName(e.target.value)}
    onBlur={() => {
        setTouched(prev => ({ ...prev, tableName: true }));
        validateField('tableName', newTableName);
    }}
    // required
    error={touched.tableName && Boolean(errors.tableName)}
    helperText={touched.tableName && errors.tableName ? errors.tableName : ''}
/> */}
                        <TextField
                            label="Table Number"
                            type="number"
                            value={newTableNumber === 0 ? '' : newTableNumber}
                            onChange={e => {
                                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                if (val >= 0) setNewTableNumber(val);
                            }}
                            onBlur={() => {
                                setTouched(prev => ({ ...prev, tableNumber: true }));
                                validateField('tableNumber', newTableNumber);
                            }}
                            required
                            error={touched.tableNumber && Boolean(errors.tableNumber)}
                            helperText={touched.tableNumber && errors.tableNumber ? errors.tableNumber : ''}
                            slotProps={{ htmlInput: { min: 1 } }}
                            InputLabelProps={{
                                sx: {
                                    '& .MuiFormLabel-asterisk': {
                                        color: 'error.main'
                                    }
                                }
                            }}
                        />
                        <FormControl fullWidth required error={touched.capacity && Boolean(errors.capacity)}>
                            <InputLabel id="add-capacity-label" sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>Capacity</InputLabel>
                            <Select
                                labelId="add-capacity-label"
                                value={newTableCapacity || ''}
                                label="Capacity"
                                onChange={e => {
                                    const val = Number(e.target.value);
                                    setNewTableCapacity(val);
                                    setTouched(prev => ({ ...prev, capacity: true }));
                                    validateField('capacity', val);
                                }}
                            >
                                {CAPACITY_OPTIONS.map(opt => (
                                    <MenuItem key={opt} value={opt}>{opt} People</MenuItem>
                                ))}
                            </Select>
                            {touched.capacity && errors.capacity && <FormHelperText>{errors.capacity}</FormHelperText>}
                        </FormControl>
                        <Stack direction="row" sx={{ width: '100%' }}>
                            <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderTopRightRadius: 0, borderBottomRightRadius: 0 } }}>
                                <InputLabel>Location</InputLabel>
                                <Select
                                    value={newTableLocation}
                                    label="Location"
                                    onChange={e => {
                                        const v = e.target.value as string;
                                        setNewTableLocation(v);
                                        setTouched(prev => ({ ...prev, location: true }));
                                        validateField('location', v);
                                    }}
                                    MenuProps={{
                                        PaperProps: {
                                            style: {
                                                maxHeight: 250
                                            }
                                        }
                                    }}
                                >
                                    <MenuItem value="indoor">Indoor</MenuItem>
                                    <MenuItem value="outdoor">Outdoor</MenuItem>
                                    <MenuItem value="private_room">Private Room</MenuItem>
                                    <MenuItem value="bar">Bar</MenuItem>
                                    <MenuItem value="patio">Patio</MenuItem>
                                    <MenuItem value="main_dining">Main Dining</MenuItem>
                                    <MenuItem value="vip_section">VIP Section</MenuItem>
                                    <MenuItem value="party_hall">Party Hall</MenuItem>
                                    <MenuItem value="terrace">Terrace</MenuItem>
                                    {customLocations.map(loc => (
                                        <MenuItem key={loc} value={loc} sx={{ textTransform: 'capitalize' }}>
                                            {loc.replace(/_/g, ' ')}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => setAddLocationDialogOpen(true)}
                                sx={{
                                    borderTopLeftRadius: 0,
                                    borderBottomLeftRadius: 0,
                                    minWidth: '56px',
                                    boxShadow: 'none'
                                }}
                            >
                                <AddIcon />
                            </Button>
                        </Stack>
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={newTableStatus}
                                label="Status"
                                onChange={e => {
                                    const v = e.target.value as string;
                                    setNewTableStatus(v);
                                    setTouched(prev => ({ ...prev, status: true }));
                                    validateField('status', v);
                                }}>
                                <MenuItem value="available">Available</MenuItem>
                                <MenuItem value="occupied">Occupied</MenuItem>
                                <MenuItem value="reserved">Reserved</MenuItem>
                                <MenuItem value="cleaning">Cleaning</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddTable}>Add</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Table Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ m: 0, p: 2, position: 'relative' }}>
                    Edit Table
                    <IconButton
                        aria-label="close"
                        onClick={() => setEditDialogOpen(false)}
                        size="small"
                        sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'error.main', color: 'common.white', '&:hover': { bgcolor: 'error.dark' }, width: 20, height: 20, padding: '4px', minWidth: 'auto', borderRadius: '50%' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {selectedTable && (
                        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            {/* <TextField
    label="Table Name"
    value={selectedTable.tableName || ''}
    onChange={e => setSelectedTable({ ...selectedTable, tableName: e.target.value })}
    onBlur={() => {
        setTouched(prev => ({ ...prev, tableName: true }));
        validateField('tableName', selectedTable.tableName);
    }}
    // required
    error={touched.tableName && Boolean(errors.tableName)}
    helperText={touched.tableName && errors.tableName ? errors.tableName : ''}
/> */}
                            <TextField
                                label="Table Number"
                                type="number"
                                value={selectedTable.tableNumber || ''}
                                onChange={e => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                    if (val >= 0) setSelectedTable({ ...selectedTable, tableNumber: val });
                                }}
                                onBlur={() => {
                                    setTouched(prev => ({ ...prev, tableNumber: true }));
                                    validateField('tableNumber', selectedTable.tableNumber);
                                }}
                                required
                                error={touched.tableNumber && Boolean(errors.tableNumber)}
                                helperText={touched.tableNumber && errors.tableNumber ? errors.tableNumber : ''}
                                slotProps={{ htmlInput: { min: 1 } }}
                                InputLabelProps={{
                                    sx: {
                                        '& .MuiFormLabel-asterisk': {
                                            color: 'error.main'
                                        }
                                    }
                                }}
                            />
                            <FormControl fullWidth required error={touched.capacity && Boolean(errors.capacity)}>
                                <InputLabel id="edit-capacity-label" sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>Capacity</InputLabel>
                                <Select
                                    labelId="edit-capacity-label"
                                    value={selectedTable.capacity || ''}
                                    label="Capacity"
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        setSelectedTable({ ...selectedTable, capacity: val });
                                        setTouched(prev => ({ ...prev, capacity: true }));
                                        validateField('capacity', val);
                                    }}
                                >
                                    {CAPACITY_OPTIONS.map(opt => (
                                        <MenuItem key={opt} value={opt}>{opt} People</MenuItem>
                                    ))}
                                </Select>
                                {touched.capacity && errors.capacity && <FormHelperText>{errors.capacity}</FormHelperText>}
                            </FormControl>
                            <Stack direction="row" sx={{ width: '100%' }}>
                                <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderTopRightRadius: 0, borderBottomRightRadius: 0 } }}>
                                    <InputLabel>Location</InputLabel>
                                    <Select
                                        value={selectedTable.location || 'indoor'}
                                        label="Location"
                                        onChange={e => {
                                            const v = e.target.value as string;
                                            setSelectedTable({ ...selectedTable, location: v });
                                            setTouched(prev => ({ ...prev, location: true }));
                                            validateField('location', v);
                                        }}
                                        MenuProps={{
                                            PaperProps: {
                                                style: {
                                                    maxHeight: 250
                                                }
                                            }
                                        }}
                                    >
                                        <MenuItem value="indoor">Indoor</MenuItem>
                                        <MenuItem value="outdoor">Outdoor</MenuItem>
                                        <MenuItem value="private_room">Private Room</MenuItem>
                                        <MenuItem value="bar">Bar</MenuItem>
                                        <MenuItem value="patio">Patio</MenuItem>
                                        <MenuItem value="main_dining">Main Dining</MenuItem>
                                        <MenuItem value="vip_section">VIP Section</MenuItem>
                                        <MenuItem value="party_hall">Party Hall</MenuItem>
                                        <MenuItem value="terrace">Terrace</MenuItem>
                                        {customLocations.map(loc => (
                                            <MenuItem key={loc} value={loc} sx={{ textTransform: 'capitalize' }}>
                                                {loc.replace(/_/g, ' ')}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setAddLocationDialogOpen(true)}
                                    sx={{
                                        borderTopLeftRadius: 0,
                                        borderBottomLeftRadius: 0,
                                        minWidth: '56px',
                                        boxShadow: 'none'
                                    }}
                                >
                                    <AddIcon />
                                </Button>
                            </Stack>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={selectedTable.status || 'available'}
                                    label="Status"
                                    onChange={e => {
                                        const v = e.target.value as string;
                                        setSelectedTable({ ...selectedTable, status: v });
                                        setTouched(prev => ({ ...prev, status: true }));
                                        validateField('status', v);
                                    }}
                                >
                                    <MenuItem value="available">Available</MenuItem>
                                    <MenuItem value="occupied">Occupied</MenuItem>
                                    <MenuItem value="reserved">Reserved</MenuItem>
                                    {/* <MenuItem value="cleaning">Cleaning</MenuItem>
                                    <MenuItem value="out_of_order">Out of Order</MenuItem> */}
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleUpdateTable}>Update</Button>
                </DialogActions>
            </Dialog>

            {/* Booking Dialog */}
            <Dialog open={bookingDialogOpen} onClose={() => setBookingDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ m: 0, p: 2, position: 'relative' }}>
                    Book Table {selectedTable?.tableNumber}
                    <IconButton
                        aria-label="close"
                        onClick={() => setBookingDialogOpen(false)}
                        size="small"
                        sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'error.main', color: 'common.white', '&:hover': { bgcolor: 'error.dark' }, width: 20, height: 20, padding: '4px', minWidth: 'auto', borderRadius: '50%' }}
                    >
                        <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Date"
                                type="date"
                                value={bookingDate}
                                onChange={e => {
                                    setBookingDate(e.target.value);
                                    if (bookingTouched.date) {
                                        validateBookingField('date', e.target.value);
                                    }
                                }}
                                onBlur={() => {
                                    setBookingTouched(prev => ({ ...prev, date: true }));
                                    validateBookingField('date', bookingDate);
                                }}
                                error={bookingTouched.date && Boolean(bookingErrors.date)}
                                helperText={bookingTouched.date && bookingErrors.date ? bookingErrors.date : ''}
                                fullWidth
                                InputLabelProps={{
                                    shrink: true,
                                    sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } }
                                }}
                                inputProps={{ min: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] }} // Restrict to Today (Local Time)
                                required
                            />
                            <FormControl fullWidth required error={bookingTouched.time && Boolean(bookingErrors.time)}>
                                <InputLabel id="booking-time-label" sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>Time</InputLabel>
                                <Select
                                    labelId="booking-time-label"
                                    value={bookingTime}
                                    label="Time"
                                    onChange={e => {
                                        setBookingTime(e.target.value);
                                        if (bookingTouched.time) validateBookingField('time', e.target.value);
                                    }}
                                    onBlur={() => {
                                        setBookingTouched(prev => ({ ...prev, time: true }));
                                        validateBookingField('time', bookingTime);
                                    }}
                                >
                                    {availableTimeSlots.map(slot => (
                                        <MenuItem key={slot} value={slot}>{slot}</MenuItem>
                                    ))}
                                    {availableTimeSlots.length === 0 && (
                                        <MenuItem disabled value="">No slots available</MenuItem>
                                    )}
                                </Select>
                                {bookingTouched.time && bookingErrors.time && <FormHelperText>{bookingErrors.time}</FormHelperText>}
                            </FormControl>
                        </Stack>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Guests"
                                type="number"
                                value={guestCount}
                                onChange={e => {
                                    setGuestCount(Number(e.target.value));
                                    if (bookingTouched.guests) {
                                        validateBookingField('guests', Number(e.target.value));
                                    }
                                }}
                                onBlur={() => {
                                    setBookingTouched(prev => ({ ...prev, guests: true }));
                                    validateBookingField('guests', guestCount);
                                }}
                                fullWidth
                                required
                                helperText={
                                    bookingTouched.guests && bookingErrors.guests
                                        ? bookingErrors.guests
                                        : (selectedTable && guestCount > selectedTable.capacity)
                                            ? `Exceeds capacity of ${selectedTable.capacity}`
                                            : `Max Capacity: ${selectedTable?.capacity || 0}`
                                }
                                error={(bookingTouched.guests && Boolean(bookingErrors.guests)) || (selectedTable && guestCount > selectedTable.capacity)}
                                inputProps={{ min: 1 }}
                                InputLabelProps={{
                                    sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } }
                                }}
                            />
                            <TextField
                                label="Duration (min)"
                                type="number"
                                value={bookingDuration}
                                onChange={e => {
                                    setBookingDuration(Number(e.target.value));
                                    if (bookingTouched.duration) {
                                        validateBookingField('duration', Number(e.target.value));
                                    }
                                }}
                                onBlur={() => {
                                    setBookingTouched(prev => ({ ...prev, duration: true }));
                                    validateBookingField('duration', bookingDuration);
                                }}
                                error={bookingTouched.duration && Boolean(bookingErrors.duration)}
                                helperText={bookingTouched.duration && bookingErrors.duration ? bookingErrors.duration : ''}
                                fullWidth
                                required
                                inputProps={{ min: 1 }}
                                InputLabelProps={{
                                    sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } }
                                }}
                            />
                        </Stack>

                        <TextField
                            label="Customer Name"
                            value={customerName}
                            onChange={e => {
                                setCustomerName(e.target.value);
                                if (bookingTouched.customerName) {
                                    validateBookingField('customerName', e.target.value);
                                }
                            }}
                            onBlur={() => {
                                setBookingTouched(prev => ({ ...prev, customerName: true }));
                                validateBookingField('customerName', customerName);
                            }}
                            error={bookingTouched.customerName && Boolean(bookingErrors.customerName)}
                            helperText={bookingTouched.customerName && bookingErrors.customerName ? bookingErrors.customerName : ''}
                            fullWidth
                            required
                            InputLabelProps={{
                                sx: { '& .MuiFormLabel-asterisk': { color: 'error.main' } }
                            }}
                        />
                        <PhoneInput
                            fullWidth
                            label="Phone Number"
                            value={customerPhone}
                            onChange={(val) => {
                                const clean = val.replace(/\D/g, '').slice(0, 10);
                                setCustomerPhone(clean);
                                if (bookingTouched.customerPhone) {
                                    validateBookingField('customerPhone', clean);
                                }
                            }}
                            dialCode={customerDialCode}
                            onDialCodeChange={setCustomerDialCode}
                            error={bookingTouched.customerPhone && Boolean(bookingErrors.customerPhone)}
                            helperText={bookingTouched.customerPhone && bookingErrors.customerPhone ? bookingErrors.customerPhone : '10-digit mobile number'}
                            required
                        />
                        <TextField
                            label="Email (Optional)"
                            value={customerEmail}
                            onChange={e => {
                                setCustomerEmail(e.target.value);
                                if (bookingTouched.customerEmail) {
                                    validateBookingField('customerEmail', e.target.value);
                                }
                            }}
                            onBlur={() => {
                                setBookingTouched(prev => ({ ...prev, customerEmail: true }));
                                validateBookingField('customerEmail', customerEmail);
                            }}
                            error={bookingTouched.customerEmail && Boolean(bookingErrors.customerEmail)}
                            helperText={bookingTouched.customerEmail && bookingErrors.customerEmail ? bookingErrors.customerEmail : ''}
                            fullWidth
                            type="email"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBookingDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleCreateBooking}
                        disabled={selectedTable && guestCount > selectedTable.capacity}
                    >
                        Book Now
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Booking Details Dialog */}
            <Dialog open={viewBookingDialogOpen} onClose={() => setViewBookingDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Booking Details</Typography>
                    <IconButton
                        aria-label="close"
                        onClick={() => setViewBookingDialogOpen(false)}
                        size="small"
                        sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedBookingForView && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    #{selectedBookingForView.bookingId}
                                </Typography>
                                <Chip
                                    label={selectedBookingForView.status.toUpperCase()}
                                    color={getBookingStatusColor(selectedBookingForView.status) as any}
                                    size="small"
                                />
                            </Box>

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Default Table</Typography>
                                    <Typography variant="body1">
                                        {selectedBookingForView.table?.tableName || `Table ${selectedBookingForView.table?.tableNumber}` || 'N/A'}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Date</Typography>
                                    <Typography variant="body1">
                                        {formatDate(selectedBookingForView.date)}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Time</Typography>
                                    <Typography variant="body1">
                                        {selectedBookingForView.timeSlot?.requested}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Guests</Typography>
                                    <Typography variant="body1">
                                        {selectedBookingForView.guests} People
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Divider sx={{ my: 1 }} />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="caption" color="text.secondary">Customer Name</Typography>
                                    <Typography variant="body1" fontWeight={500}>
                                        {selectedBookingForView.guestInfo?.firstName} {selectedBookingForView.guestInfo?.lastName}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                                    <Typography variant="body2">
                                        {selectedBookingForView.guestInfo?.phone}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Typography variant="caption" color="text.secondary">Email</Typography>
                                    <Typography variant="body2">
                                        {selectedBookingForView.guestInfo?.email || '-'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    {selectedBookingForView && selectedBookingForView.status === 'pending' && (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={() => {
                                handleBookingStatusChange(selectedBookingForView._id, 'confirmed');
                                setViewBookingDialogOpen(false);
                            }}
                        >
                            Confirm Booking
                        </Button>
                    )}

                    {(() => {
                        if (!selectedBookingForView) return null;

                        const tableId = selectedBookingForView.table?._id || (typeof selectedBookingForView.table === 'string' ? selectedBookingForView.table : null);
                        const realTable = tables.find(t => t._id === tableId);
                        const hasActiveOrder = !!realTable?.currentOrder;

                        return (
                            <>
                                {selectedBookingForView.status === 'confirmed' && (!selectedBookingForView.checkedIn || !hasActiveOrder) && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => {
                                            handleCheckIn(selectedBookingForView._id);
                                            setViewBookingDialogOpen(false);
                                        }}
                                    >
                                        Check In
                                    </Button>
                                )}
                                {selectedBookingForView.checkedIn && selectedBookingForView.status !== 'completed' && hasActiveOrder && (
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        onClick={() => {
                                            handleCheckIn(selectedBookingForView._id);
                                            setViewBookingDialogOpen(false);
                                        }}
                                    >
                                        Checkout
                                    </Button>
                                )}
                            </>
                        );
                    })()}

                    {selectedBookingForView && (selectedBookingForView.status === 'pending' || selectedBookingForView.status === 'confirmed') && (
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={() => {
                                handleBookingStatusChange(selectedBookingForView._id, 'cancelled');
                                setViewBookingDialogOpen(false);
                            }}
                        >
                            Cancel Booking
                        </Button>
                    )}
                    <Button onClick={() => setViewBookingDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Custom Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
                    <DeleteIcon sx={{ fontSize: 50, color: 'error.main', mb: 1 }} />
                    <Typography variant="h5" component="div" fontWeight="bold">
                        Confirm Delete
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
                    <Typography variant="body1">
                        Are you sure you want to delete table <strong>{tableToDelete?.tableName || tableToDelete?.tableNumber}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3, px: 3 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        variant="outlined"
                        fullWidth
                        sx={{ borderRadius: 2 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmDeleteTable}
                        variant="contained"
                        color="error"
                        fullWidth
                        sx={{ borderRadius: 2 }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Custom Location Dialog */}
            <Dialog
                open={addLocationDialogOpen}
                onClose={() => setAddLocationDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                slotProps={{
                    backdrop: {
                        sx: {
                            backdropFilter: 'blur(6px)',
                            backgroundColor: 'rgba(0, 0, 0, 0.4)'
                        }
                    }
                }}
            >
                <DialogTitle sx={{ m: 0, p: 2, position: 'relative' }}>
                    Add Custom Location
                    <IconButton
                        aria-label="close"
                        onClick={() => setAddLocationDialogOpen(false)}
                        size="small"
                        sx={{ position: 'absolute', right: 16, top: 16, bgcolor: 'error.main', color: 'common.white', '&:hover': { bgcolor: 'error.dark' }, width: 20, height: 20, padding: '4px', minWidth: 'auto', borderRadius: '50%' }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        <TextField
                            autoFocus
                            label="Location Name"
                            fullWidth
                            value={newLocationName}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (/^[a-zA-Z_\s]*$/.test(val)) {
                                    setNewLocationName(val);
                                }
                            }}
                            placeholder="e.g. Poolside"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ pb: 3, px: 3 }}>
                    <Button onClick={() => setAddLocationDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={() => {
                            if (newLocationName.trim()) {
                                const formatted = newLocationName.trim().replace(/\s+/g, '_').toLowerCase();
                                if (!customLocations.includes(formatted)) {
                                    setCustomLocations(prev => [...prev, formatted]);
                                }
                                setNewTableLocation(formatted);
                                if (editDialogOpen && selectedTable) {
                                    setSelectedTable({ ...selectedTable, location: formatted });
                                }
                                setAddLocationDialogOpen(false);
                                setNewLocationName('');
                            }
                        }}
                        variant="contained"
                        disabled={!newLocationName.trim()}
                    >
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
};

export default TablesPage;
