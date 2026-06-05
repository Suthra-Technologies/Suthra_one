import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    TextField,
    Paper,
    Chip,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    RadioGroup,
    FormControlLabel,
    Radio,
    alpha,
    ButtonBase,
    IconButton,
    Checkbox,
    InputAdornment,
    CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
    EventAvailable as BookingIcon,
    People as PeopleIcon,
    Schedule as TimeIcon,
    CheckCircle as ConfirmIcon,
    TableRestaurant as TableIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { bookingsAPI, authAPI, tablesAPI, tenantAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { LockOutlined as LockIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import PaymentForm from '../../components/PaymentForm';

const TableBookingPage = () => {
    const { user, getUserFullName, tenantSlug: authTenantSlug, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { slug: urlSlug } = useParams<{ slug: string }>();
    const tenantSlug = authTenantSlug || urlSlug || '';
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
    const [guestCount, setGuestCount] = useState<number>(2);
    const [duration, setDuration] = useState<number>(90);
    const [specialRequests, setSpecialRequests] = useState('');
    const [unavailableSlots, setUnavailableSlots] = useState<string[]>([]);
    const [availableTables, setAvailableTables] = useState<any[]>([]);
    const [selectedTable, setSelectedTable] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [paymentIntentId, setPaymentIntentId] = useState('');
    // Inline login dialog for guests
    const [loginDialogOpen, setLoginDialogOpen] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginShowPwd, setLoginShowPwd] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginDialogMode, setLoginDialogMode] = useState<'login' | 'register'>('login');
    const [regData, setRegData] = useState({ firstName: '', lastName: '', phone: '' });
    const [occasion, setOccasion] = useState('');
    const reservationFee = Number(selectedTable?.reservationFee || 0);
    const requiresReservationPayment = reservationFee > 0;
    const headingFontSize = { xs: '1rem', sm: '1.2rem' };
    const bodyFontSize = { xs: '0.8rem', sm: '0.95rem' };


    // Generate time slots with 30-minute intervals
    const timeSlots = useMemo(() => {
        const slots = [];
        const startHour = 11; // 11 AM
        const endHour = 22;   // 10 PM
        const now = new Date();
        const isToday = selectedDate &&
            selectedDate.getDate() === now.getDate() &&
            selectedDate.getMonth() === now.getMonth() &&
            selectedDate.getFullYear() === now.getFullYear();

        for (let hour = startHour; hour < endHour; hour++) {
            const d = new Date();
            d.setHours(hour, 0, 0, 0);

            // Check if slot is in the past (buffer 30 mins)
            if (isToday && d.getTime() < now.getTime() + 30 * 60000) {
                // skip past times
            } else {
                // :00 slot
                const timeStr00 = `${hour.toString().padStart(2, '0')}:00`;
                if (!unavailableSlots.includes(timeStr00)) {
                    slots.push({
                        label: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                        value: timeStr00
                    });
                }
            }

            // :30 slot
            d.setMinutes(30);
            if (isToday && d.getTime() < now.getTime() + 30 * 60000) {
                // skip
            } else {
                const timeStr30 = `${hour.toString().padStart(2, '0')}:30`;
                if (!unavailableSlots.includes(timeStr30)) {
                    slots.push({
                        label: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                        value: timeStr30
                    });
                }
            }
        }
        return slots;
    }, [selectedDate, unavailableSlots]);

    // Fetch unavailable slots when date or guests change
    useEffect(() => {
        if (!selectedDate || !guestCount) return;

        const fetchUnavailable = async () => {
            try {
                // Format date as YYYY-MM-DD in local time to avoid timezone shifts
                const offset = selectedDate.getTimezoneOffset();
                const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
                const dateStr = localDate.toISOString().split('T')[0];

                const res = user
                    ? await bookingsAPI.getUnavailableSlots(dateStr, guestCount)
                    : await bookingsAPI.publicGetUnavailableSlots(tenantSlug, dateStr, guestCount);
                if (Array.isArray(res.data)) {
                    setUnavailableSlots(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch slots", err);
            }
        };
        fetchUnavailable();
    }, [selectedDate, guestCount]);

    const checkAvailability = async () => {
        if (!selectedDate || !selectedTimeSlot) {
            toast.error('Please select date and time');
            return;
        }
        setLoading(true);
        try {
            const offset = selectedDate.getTimezoneOffset();
            const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
            const dateStr = localDate.toISOString().split('T')[0];

            const response = user
                ? await bookingsAPI.checkAvailability({ date: dateStr, time: selectedTimeSlot, guests: guestCount, duration })
                : await bookingsAPI.publicCheckAvailability(tenantSlug, { date: dateStr, time: selectedTimeSlot, guests: guestCount, duration });
            setAvailableTables(response.data);
            if (response.data.length === 0) {
                toast('No tables available for selected criteria', { icon: '⚠️' });
            }
        } catch (error) {
            console.error('Error checking availability:', error);
            toast.error('Failed to check availability');
        } finally {
            setLoading(false);
        }
    };

    const handleTableSelect = (table: any) => {
        setSelectedTable(table);
        setPaymentIntentId('');
        setIsSuccess(false); // Reset success state when selecting a new table
        setConfirmDialogOpen(true);
    };

    const handleConfirmBooking = async () => {
        if (!selectedTable || !selectedDate || !selectedTimeSlot) return;

        if (!user) {
            setConfirmDialogOpen(false);
            setLoginDialogOpen(true);
            return;
        }

        if (requiresReservationPayment && !paymentIntentId) {
            toast.error('Please complete the reservation fee payment first');
            return;
        }

        await executeBooking();
    };

    const executeBooking = async () => {
        setSubmitting(true);
        try {
            // Format date as YYYY-MM-DD in local time to avoid timezone shifts
            const offset = selectedDate!.getTimezoneOffset();
            const localDate = new Date(selectedDate!.getTime() - (offset * 60 * 1000));
            const dateStr = localDate.toISOString().split('T')[0];

            const bookingData = {
                tableId: selectedTable?._id,
                bookingDate: dateStr,
                bookingTime: selectedTimeSlot,
                guests: guestCount,
                duration,
                occasion,
                specialRequests,
                paymentMethod: requiresReservationPayment ? 'card' : 'cod',
                stripePaymentIntentId: requiresReservationPayment ? paymentIntentId : undefined,
                guestInfo: {
                    firstName: user?.firstName || getUserFullName(),
                    lastName: user?.lastName || '',
                    email: user?.email || '',
                    phone: user?.phone || ''
                }
            };

            await bookingsAPI.create(bookingData);
            setIsSuccess(true);
            toast.success('Booking requested successfully!');
            // setSelectedTable(null); // Keep it to show details in success modal
            setAvailableTables([]);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create booking');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInlineLogin = async () => {
        if (!loginEmail || !loginPassword) {
            toast.error('Please enter email and password');
            return;
        }
        setLoginLoading(true);
        try {
            const res = await login({ email: loginEmail, password: loginPassword, tenantSlug });
            if (res.success) {
                toast.success('Login successful!');
                setLoginDialogOpen(false);
            } else {
                toast.error(res.error || 'Login failed');
            }
        } catch (err: any) {
            toast.error('Login failed. Please check your credentials.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleInlineRegister = async () => {
        if (!regData.firstName || !regData.lastName || !loginEmail || !loginPassword) {
            toast.error('Please fill in all required fields');
            return;
        }
        setLoginLoading(true);
        try {
            const regRes = await authAPI.customerRegister({
                ...regData,
                email: loginEmail,
                password: loginPassword,
                tenantSlug
            });

            if (regRes.status === 201) {
                toast.success('Registration successful!');
                // Auto login
                const res = await login({ email: loginEmail, password: loginPassword, tenantSlug });
                if (res.success) {
                    setLoginDialogOpen(false);
                } else {
                    setLoginDialogMode('login');
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoginLoading(false);
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, fontSize: headingFontSize }}>
                    Book Your Dining Experience
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: bodyFontSize }}>
                    Reserve your preferred table in seconds. Whether it's a romantic evening, a business lunch, or a gathering with friends, we ensure a memorable dining experience.
                </Typography>
                <Grid container spacing={3}>
                    {/* Booking Form */}
                    {/* Booking Form */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 0,
                                height: '100%',
                                maxHeight: '600px', // Fixed height
                                borderRadius: 4,
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                            }}
                        >
                            <Box sx={{
                                p: 3,
                                background: 'linear-gradient(135deg, #6366f1 0%, #4445a3 100%)',
                                color: 'white'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                    <Box sx={{
                                        p: 1,
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        backdropFilter: 'blur(4px)'
                                    }}>
                                        <BookingIcon />
                                    </Box>
                                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: headingFontSize }}>
                                        Reservation Details
                                    </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ opacity: 0.9, ml: 0.5, fontSize: bodyFontSize }}>
                                    Tell us when you'd like to join us and for how many guests.
                                </Typography>
                            </Box>

                            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, flex: 1, overflowY: 'auto' }}>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12 }}>
                                        <DatePicker
                                            label="Select Date"
                                            value={selectedDate}
                                            onChange={(newValue) => setSelectedDate(newValue)}
                                            minDate={new Date()}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    required: true,
                                                    variant: 'outlined',
                                                    sx: { '& .MuiInputLabel-asterisk': { color: 'error.main' } }
                                                }
                                            }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FormControl fullWidth required sx={{ '& .MuiInputLabel-asterisk': { color: 'error.main' } }}>
                                            <InputLabel>Select Time Slot</InputLabel>
                                            <Select
                                                value={selectedTimeSlot}
                                                label="Select Time Slot"
                                                onChange={(e) => setSelectedTimeSlot(e.target.value)}
                                                startAdornment={<TimeIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />}
                                            >
                                                {timeSlots.map((slot) => (
                                                    <MenuItem key={slot.value} value={slot.value}>
                                                        {slot.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            fullWidth
                                            label="Number of Guests"
                                            type="number"
                                            value={guestCount}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                let val = e.target.value;
                                                if (val === '') {
                                                    setGuestCount(0);
                                                    return;
                                                }
                                                if (val.length > 2) {
                                                    val = val.slice(0, 2);
                                                    e.target.value = val;
                                                }
                                                if (/^0[0-9]+/.test(val)) {
                                                    val = val.replace(/^0+/, '');
                                                    e.target.value = val;
                                                }
                                                let num = parseInt(val, 10);
                                                if (num > 20) {
                                                    num = 20;
                                                    e.target.value = '20';
                                                }
                                                setGuestCount(num);
                                            }}
                                            InputProps={{
                                                inputProps: { min: 1, max: 20 },
                                                startAdornment: <PeopleIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                                            }}
                                            required
                                            sx={{ '& .MuiInputLabel-asterisk': { color: 'error.main' } }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <FormControl fullWidth>
                                            <InputLabel>Duration</InputLabel>
                                            <Select
                                                value={duration}
                                                label="Duration"
                                                onChange={(e) => setDuration(e.target.value as number)}
                                            >
                                                <MenuItem value={60}>1 Hour</MenuItem>
                                                <MenuItem value={90}>1.5 Hours</MenuItem>
                                                <MenuItem value={120}>2 Hours</MenuItem>
                                                <MenuItem value={180}>3 Hours</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth
                                            label="Any special requests for our team?"
                                            multiline
                                            rows={2}
                                            value={specialRequests}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpecialRequests(e.target.value)}
                                            placeholder="e.g., Anniversary surprise, allergy notes, window seat preference..."
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <FormControl fullWidth>
                                            <InputLabel>What are you celebrating?</InputLabel>
                                            <Select
                                                value={occasion}
                                                label="What are you celebrating?"
                                                onChange={(e) => setOccasion(e.target.value)}
                                            >
                                                <MenuItem value="">None</MenuItem>
                                                <MenuItem value="Birthday Celebration">Birthday Celebration</MenuItem>
                                                <MenuItem value="Anniversary">Anniversary</MenuItem>
                                                <MenuItem value="Business Meeting">Business Meeting</MenuItem>
                                                <MenuItem value="Date Night">Date Night</MenuItem>
                                                <MenuItem value="Family Dinner">Family Dinner</MenuItem>
                                                <MenuItem value="Friends Gathering">Friends Gathering</MenuItem>
                                                <MenuItem value="Special Occasion">Special Occasion</MenuItem>
                                                <MenuItem value="Other">Other</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>

                                <Box sx={{ mt: 'auto', pt: 2 }}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        onClick={checkAvailability}
                                        disabled={loading || !selectedDate || !selectedTimeSlot}
                                        sx={{
                                            py: 1.5,
                                            fontWeight: 'bold',
                                            textTransform: 'none',
                                            fontSize: bodyFontSize,
                                            borderRadius: 2,
                                            background: loading ? 'grey' : 'linear-gradient(45deg, #6366f1 30%, #4f46e5 90%)',
                                            boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
                                            '&:hover': {
                                                boxShadow: '0 6px 20px 0 rgba(99, 102, 241, 0.29)',
                                            }

                                        }}
                                    >
                                        {loading ? 'Checking Availability...' : 'Find the Perfect Table'}
                                    </Button>
                                </Box>
                            </Box>
                        </Paper>
                    </Grid>
                    {/* Available Tables */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                height: '100%',
                                maxHeight: '600px', // Fixed height
                                borderRadius: 4,
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                justifyContent: { xs: 'flex-start', md: availableTables.length === 0 ? 'center' : 'flex-start' }
                            }}
                        >
                            <Box sx={{
                                p: 3,
                                borderBottom: { xs: '1px solid', md: availableTables.length === 0 ? 'none' : '1px solid' },
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: { xs: 'space-between', md: availableTables.length === 0 ? 'center' : 'space-between' },
                                flexDirection: { xs: 'row', md: availableTables.length === 0 ? 'column' : 'row' },
                                textAlign: { xs: 'left', md: availableTables.length === 0 ? 'center' : 'left' },
                                bgcolor: (theme) => availableTables.length === 0 ? 'transparent' : alpha(theme.palette.background.default, 0.4),
                                gap: 2
                            }}>
                                <Box>
                                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: headingFontSize }}>
                                        Choose Your Table
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: bodyFontSize }}>
                                        Select from our available seating options
                                    </Typography>
                                </Box>
                                {availableTables.length > 0 && (
                                    <Chip
                                        label={`${availableTables.length} Available`}
                                        size="small"
                                        color="success"
                                        sx={{ fontWeight: 'bold', borderRadius: 1.5 }}
                                    />
                                )}
                            </Box>

                            <Box sx={{
                                p: 3,
                                overflowY: 'auto',
                                flex: availableTables.length === 0 ? 'none' : 1,
                                display: { xs: 'block', md: availableTables.length === 0 ? 'none' : 'block' },
                                height: '100%',
                                '&::-webkit-scrollbar': { width: '6px' },
                                '&::-webkit-scrollbar-track': { background: 'transparent' },
                                '&::-webkit-scrollbar-thumb': {
                                    bgcolor: (theme) => alpha(theme.palette.divider, 0.5),
                                    borderRadius: '4px',
                                },
                            }}>
                                {availableTables.length === 0 ? (
                                    <Box sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 2,
                                        opacity: 0.7
                                    }}>
                                        {/* <Box sx={{
                                            p: 3,
                                            bgcolor: (theme) => alpha(theme.palette.grey[200], 0.5),
                                            borderRadius: '50%',
                                            mb: 1
                                        }}>
                                            <TableIcon sx={{ fontSize: 60, color: 'text.disabled' }} />
                                        </Box> */}
                                        {/* <Typography variant="h6" color="text.secondary" fontWeight="600">
                                            Searching for options...
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 300 }}>
                                            Please provide your reservation details on the left to explore our available tables.
                                        </Typography> */}
                                    </Box>
                                ) : (
                                    <Grid container spacing={2}>
                                        {availableTables.map((table) => {
                                            const isSelected = selectedTable?._id === table._id;
                                            return (
                                                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={table._id}>
                                                    <ButtonBase
                                                        onClick={() => handleTableSelect(table)}
                                                        sx={{
                                                            width: '100%',
                                                            textAlign: 'left',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'stretch',
                                                            borderRadius: 3,
                                                            overflow: 'hidden',
                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            border: '2px solid',
                                                            borderColor: isSelected ? 'primary.main' : 'divider',
                                                            boxShadow: isSelected
                                                                ? (theme) => `0 8px 24px ${alpha(theme.palette.primary.main, 0.25)}`
                                                                : 'none',
                                                            bgcolor: isSelected
                                                                ? (theme) => alpha(theme.palette.primary.main, 0.02)
                                                                : 'transparent',
                                                            '&:hover': {
                                                                borderColor: 'primary.main',
                                                                transform: 'translateY(-4px)',
                                                                boxShadow: 2,
                                                                bgcolor: (theme) => alpha(theme.palette.background.paper, 1)
                                                            }
                                                        }}
                                                    >
                                                        <Box sx={{
                                                            p: 2,
                                                            width: '100%', // Ensure full width
                                                            bgcolor: (theme) => isSelected ? 'primary.main' : alpha(theme.palette.grey[200], 0.5),
                                                            color: isSelected ? 'white' : 'text.secondary',
                                                            display: 'flex',
                                                            justifyContent: 'space-between', // Name left, Icon right
                                                            alignItems: 'center'
                                                        }}>
                                                            <Typography variant="subtitle1" fontWeight="bold" sx={{ textAlign: 'left', flex: 1, mr: 1, fontSize: headingFontSize }}>
                                                                {table.tableName || (table.tableNumber ? `Table ${table.tableNumber}` : 'Table')}
                                                            </Typography>
                                                            {isSelected ? <ConfirmIcon fontSize="small" /> : <TableIcon fontSize="small" />}
                                                        </Box>

                                                        <Box sx={{ p: 2 }}>
                                                            <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                                                                <Chip
                                                                    label={table.location || 'Indoor'}
                                                                    size="small"
                                                                    sx={{
                                                                        height: 20,
                                                                        fontSize: bodyFontSize,
                                                                        fontWeight: 700,
                                                                        bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                                                                        color: 'info.main'
                                                                    }}
                                                                />
                                                                <Chip
                                                                    label={table.availabilityStatus || 'Available'}
                                                                    size="small"
                                                                    sx={{
                                                                        height: 20,
                                                                        fontSize: bodyFontSize,
                                                                        fontWeight: 700,
                                                                        bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                                                                        color: 'success.main'
                                                                    }}
                                                                />
                                                            </Box>

                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                                                                <PeopleIcon fontSize="small" sx={{ opacity: 0.7 }} />
                                                                <Typography variant="body2" fontWeight="500" sx={{ fontSize: bodyFontSize }}>
                                                                    Up to {table.capacity} Guests
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </ButtonBase>
                                                </Grid>
                                            );
                                        })}
                                    </Grid>
                                )}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
                {/* Confirmation Dialog */}
                {/* Confirmation Dialog */}
                <Dialog
                    open={confirmDialogOpen}
                    onClose={() => !submitting && setConfirmDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: { borderRadius: 4, bgcolor: 'background.paper', position: 'relative' }
                    }}
                >
                    {isSuccess ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Box sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                bgcolor: alpha('#4caf50', 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto',
                                mb: 3
                            }}>
                                <ConfirmIcon sx={{ fontSize: 48, color: 'success.main' }} />
                            </Box>
                            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ fontSize: headingFontSize }}>
                                Reservation Requested!
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, px: 2, fontSize: bodyFontSize }}>
                                We've received your request for <strong>{selectedTable?.tableName || `Table ${selectedTable?.tableNumber}`}</strong> on <strong>{selectedDate?.toLocaleDateString()}</strong> at <strong>{selectedTimeSlot}</strong>.
                                <br /><br />
                                {requiresReservationPayment
                                    ? 'Your reservation fee has been secured. If this booking is cancelled, any eligible refund will go back to your original payment method and we will confirm it by email.'
                                    : 'Your booking is currently pending. We will notify you once the restaurant confirms your reservation!'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={() => {
                                        setConfirmDialogOpen(false);
                                        setSelectedTable(null);
                                        setPaymentIntentId('');
                                        setAvailableTables([]);
                                        setIsSuccess(false);
                                    }}
                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                                >
                                    Book Another Table
                                </Button>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => navigate(`/${tenantSlug}/customer/bookings`)}
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 'bold',
                                        background: 'linear-gradient(45deg, #6366f1 30%, #4f46e5 90%)',
                                    }}
                                >
                                    View My Bookings
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <>
                            <DialogTitle sx={{ m: 0, p: 2, position: 'relative' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <ConfirmIcon sx={{ mr: 1, color: 'success.main' }} />
                                    Confirm Reservation
                                </Box>
                                <IconButton
                                    aria-label="close"
                                    onClick={() => {
                                        setConfirmDialogOpen(false);
                                        setPaymentIntentId('');
                                    }}
                                    sx={{
                                        position: 'absolute',
                                        right: 12,
                                        top: 12,
                                        color: 'text.secondary',
                                    }}
                                >
                                    <CloseIcon />
                                </IconButton>
                            </DialogTitle>
                            <DialogContent dividers>
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle1" gutterBottom fontWeight="bold" sx={{ fontSize: headingFontSize }}>
                                        Reservation Summary:
                                    </Typography>
                                    <Grid container spacing={2} sx={{ mt: 1 }}>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: bodyFontSize }}>Table</Typography>
                                            <Typography variant="body2" fontWeight="600" sx={{ fontSize: bodyFontSize }}>
                                                {selectedTable?.tableName || `Table ${selectedTable?.tableNumber}`}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: bodyFontSize }}>Date & Time</Typography>
                                            <Typography variant="body2" fontWeight="600" sx={{ fontSize: bodyFontSize }}>
                                                {selectedDate?.toLocaleDateString()} at {selectedTimeSlot}
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: bodyFontSize }}>Guests</Typography>
                                            <Typography variant="body2" fontWeight="600" sx={{ fontSize: bodyFontSize }}>{guestCount} People</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: bodyFontSize }}>Duration</Typography>
                                            <Typography variant="body2" fontWeight="600" sx={{ fontSize: bodyFontSize }}>{duration} minutes</Typography>
                                        </Grid>
                                    </Grid>
                                </Box>

                                {occasion && (
                                    <Typography variant="body2" sx={{ mt: 2, fontSize: bodyFontSize }}>
                                        <strong>Occasion:</strong> {occasion}
                                    </Typography>
                                )}
                                {specialRequests && (
                                    <Typography variant="body2" sx={{ mt: 1, fontSize: bodyFontSize }}>
                                        <strong>Special Requests:</strong> {specialRequests}
                                    </Typography>
                                )}

                                {requiresReservationPayment && (
                                    <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
                                        Reservation fee: ${reservationFee.toFixed(2)}. If the booking is cancelled, the refund goes back to the original payment method and an acknowledgement will be sent by email.
                                    </Alert>
                                )}

                                {!requiresReservationPayment && (
                                    <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
                                        Your request will be sent to the restaurant for approval.
                                    </Alert>
                                )}

                                {requiresReservationPayment && !paymentIntentId && (
                                    <Box sx={{ mt: 3 }}>
                                        <PaymentForm
                                            amount={reservationFee}
                                            onSuccess={(intentId) => {
                                                setPaymentIntentId(intentId);
                                                toast.success('Reservation fee paid');
                                            }}
                                            onCancel={() => {
                                                setPaymentIntentId('');
                                            }}
                                        />
                                    </Box>
                                )}

                                {requiresReservationPayment && paymentIntentId && (
                                    <Alert severity="success" sx={{ mt: 3, borderRadius: 2 }}>
                                        Reservation fee received. You can confirm the booking now.
                                    </Alert>
                                )}
                            </DialogContent>
                            <DialogActions sx={{ p: 2.5 }}>
                                <Button
                                    onClick={() => {
                                        setConfirmDialogOpen(false);
                                        setPaymentIntentId('');
                                    }}
                                    sx={{ textTransform: 'none', fontWeight: 'bold' }}
                                >
                                    Dismiss
                                </Button>
                                <Button
                                    variant="contained"
                                    disabled={submitting || (requiresReservationPayment && !paymentIntentId)}
                                    onClick={handleConfirmBooking}
                                    sx={{
                                        px: 4,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 'bold',
                                        background: 'linear-gradient(45deg, #6366f1 30%, #4f46e5 90%)',
                                    }}
                                >
                                    {submitting ? <CircularProgress size={24} color="inherit" /> : requiresReservationPayment ? 'Confirm Booking' : 'Confirm Reservation'}
                                </Button>
                            </DialogActions>
                        </>
                    )}
                </Dialog>


                {/* Inline Login Dialog for Guests */}
                <Dialog
                    open={loginDialogOpen}
                    onClose={() => setLoginDialogOpen(false)}
                    maxWidth="xs"
                    fullWidth
                    PaperProps={{
                        sx: { borderRadius: 3, p: 1 }
                    }}
                >
                    <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
                        <Box sx={{
                            display: 'inline-flex',
                            p: 1.5,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            color: 'white',
                            mb: 2
                        }}>
                            <LockIcon />
                        </Box>
                        <Typography variant="h5" fontWeight="bold" sx={{ fontSize: headingFontSize }}>
                            {loginDialogMode === 'login' ? 'Login Required' : 'Create Account'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: bodyFontSize }}>
                            {loginDialogMode === 'login'
                                ? 'Please login to confirm your table booking.'
                                : 'Sign up to start booking tables and managing your orders.'}
                        </Typography>
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            {loginDialogMode === 'register' && (
                                <>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <TextField
                                            label="First Name"
                                            fullWidth
                                            value={regData.firstName}
                                            onChange={(e) => setRegData({ ...regData, firstName: e.target.value })}
                                        />
                                        <TextField
                                            label="Last Name"
                                            fullWidth
                                            value={regData.lastName}
                                            onChange={(e) => setRegData({ ...regData, lastName: e.target.value })}
                                        />
                                    </Box>
                                    <TextField
                                        label="Phone Number"
                                        fullWidth
                                        value={regData.phone}
                                        onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                                    />
                                </>
                            )}
                            <TextField
                                label="Email"
                                fullWidth
                                variant="outlined"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (loginDialogMode === 'login' ? handleInlineLogin() : handleInlineRegister())}
                            />
                            <TextField
                                label="Password"
                                fullWidth
                                type={loginShowPwd ? 'text' : 'password'}
                                variant="outlined"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (loginDialogMode === 'login' ? handleInlineLogin() : handleInlineRegister())}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setLoginShowPwd(!loginShowPwd)} edge="end">
                                                {loginShowPwd ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={loginDialogMode === 'login' ? handleInlineLogin : handleInlineRegister}
                                disabled={loginLoading}
                                sx={{
                                    py: 1.5,
                                    borderRadius: 2,
                                    fontWeight: 'bold',
                                    textTransform: 'none',
                                    fontSize: bodyFontSize
                                }}
                            >
                                {loginLoading ? <CircularProgress size={24} color="inherit" /> : (loginDialogMode === 'login' ? 'Login & Continue' : 'Register & Continue')}
                            </Button>

                            <Box sx={{ textAlign: 'center', mt: 1 }}>
                                <Typography variant="body2" sx={{ fontSize: bodyFontSize }}>
                                    {loginDialogMode === 'login' ? (
                                        <>
                                            Don't have an account?{' '}
                                            <Button
                                                variant="text"
                                                size="small"
                                                onClick={() => setLoginDialogMode('register')}
                                                sx={{ fontWeight: 'bold', textTransform: 'none' }}
                                            >
                                                Register Now
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            Already have an account?{' '}
                                            <Button
                                                variant="text"
                                                size="small"
                                                onClick={() => setLoginDialogMode('login')}
                                                sx={{ fontWeight: 'bold', textTransform: 'none' }}
                                            >
                                                Login Instead
                                            </Button>
                                        </>
                                    )}
                                </Typography>
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setLoginDialogOpen(false)}
                            sx={{ borderRadius: 2, textTransform: 'none' }}
                        >
                            Cancel
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </LocalizationProvider>
    );
};

export default TableBookingPage;
