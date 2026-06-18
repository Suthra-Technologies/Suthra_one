import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    FormHelperText,
    IconButton,
    CircularProgress
} from '@mui/material';
import {
    Close as CloseIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { bookingsAPI } from '../../../services/api';
import { validatePhone, validateEmail } from '../../../utils/validation';
import PhoneInput from '../../../components/PhoneInput';
import CustomInput from '../../../components/common/CustomInput';

interface BookingDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    table: any;
    settings: any;
}

const BookingDialog: React.FC<BookingDialogProps> = ({
    open,
    onClose,
    onSuccess,
    table,
    settings
}) => {
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
    const [bookingTime, setBookingTime] = useState('19:00');
    const [guestCount, setGuestCount] = useState(2);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerDialCode, setCustomerDialCode] = useState(settings?.restaurant?.dialCode || '1');
    const [customerEmail, setCustomerEmail] = useState('');
    const [bookingDuration, setBookingDuration] = useState(120);
    const [isProcessing, setIsProcessing] = useState(false);
    const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

    useEffect(() => {
        if (table && open) {
            setGuestCount(Math.min(2, table.capacity));
            resetBookingFields();
        }
    }, [table, open]);

    const resetBookingFields = () => {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setBookingDate(new Date().toISOString().split('T')[0]);
        setBookingTime('19:00');
        setBookingDuration(120);
        setBookingTouched({ date: false, time: false, customerName: false, customerPhone: false, guests: false, duration: false, customerEmail: false });
        setBookingErrors({ date: '', time: '', customerName: '', customerPhone: '', guests: '', duration: '', customerEmail: '' });
    };

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

    useEffect(() => {
        if (!open) return;

        const fetchUnavailableSlots = async () => {
            const slots: string[] = [];
            for (let h = 11; h < 22; h++) {
                slots.push(`${h.toString().padStart(2, '0')}:00`);
                slots.push(`${h.toString().padStart(2, '0')}:30`);
            }

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
    }, [bookingDate, guestCount, open]);

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
            const validation = validatePhone(value, customerDialCode);
            if (!validation.isValid) {
                error = validation.message || '';
            }
        }
        if (name === 'guests') {
            if (value === undefined || value === null || value === '') {
                error = 'Number of guests is required';
            } else if (value < 1) {
                error = 'Number of guests must be at least 1';
            }
        }
        if (name === 'duration') {
            if (value === undefined || value === null || value === '') {
                error = 'Duration is required';
            } else if (value < 1) {
                error = 'Duration must be at least 1 minute';
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

    const handleCreateBooking = async () => {
        if (isProcessing || !table) return;

        const fields = ['date', 'time', 'customerName', 'customerPhone', 'guests', 'duration', 'customerEmail'];
        setBookingTouched({
            date: true,
            time: true,
            customerName: true,
            customerPhone: true,
            guests: true,
            duration: true,
            customerEmail: true
        });

        let hasError = false;
        const values: any = {
            date: bookingDate,
            time: bookingTime,
            customerName: customerName,
            customerPhone: customerPhone,
            guests: guestCount,
            duration: bookingDuration,
            customerEmail: customerEmail
        };

        fields.forEach((field) => {
            const err = validateBookingField(field, values[field]);
            if (err) hasError = true;
        });

        if (hasError) {
            toast.error('Please fill all required fields correctly');
            return;
        }

        if (guestCount > table.capacity) {
            toast.error(`Guest count exceeds table capacity (${table.capacity})`);
            return;
        }

        try {
            setIsProcessing(true);
            const payload = {
                tableId: table._id,
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
            resetBookingFields();
            onSuccess();
        } catch (error: any) {
            console.error('Error creating booking:', error);
            toast.error(error.response?.data?.message || 'Failed to create booking');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, position: 'relative' }}>
                Book Table {table?.tableNumber}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
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
                                if (bookingTouched.date) validateBookingField('date', e.target.value);
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
                            inputProps={{ min: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] }}
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
                                let valStr = e.target.value;
                                if (valStr === '') {
                                    setGuestCount(0);
                                    if (bookingTouched.guests) validateBookingField('guests', 0);
                                    return;
                                }
                                if (valStr.length > 2) {
                                    valStr = valStr.slice(0, 2);
                                    e.target.value = valStr;
                                }
                                if (/^0[0-9]+/.test(valStr)) {
                                    valStr = valStr.replace(/^0+/, '');
                                    e.target.value = valStr;
                                }
                                let val = parseInt(valStr, 10);
                                if (val > 20) {
                                    val = 20;
                                    e.target.value = '20';
                                }
                                setGuestCount(val);
                                if (bookingTouched.guests) validateBookingField('guests', val);
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
                                    : (table && guestCount > table.capacity)
                                        ? `Exceeds capacity of ${table.capacity}`
                                        : `Max Capacity: ${table?.capacity || 0}`
                            }
                            error={(bookingTouched.guests && Boolean(bookingErrors.guests)) || (table && guestCount > table.capacity)}
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
                                const val = Number(e.target.value);
                                setBookingDuration(val);
                                if (bookingTouched.duration) validateBookingField('duration', val);
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

                    <CustomInput
                        type="name"
                        label="Customer Name"
                        value={customerName}
                        onChange={val => {
                            setCustomerName(val);
                            if (bookingTouched.customerName) validateBookingField('customerName', val);
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
                            const clean = val.replace(/\D/g, '').slice(0, 15);
                            setCustomerPhone(clean);
                            if (bookingTouched.customerPhone) validateBookingField('customerPhone', clean);
                        }}
                        dialCode={customerDialCode}
                        onDialCodeChange={setCustomerDialCode}
                        onBlur={() => {
                            setBookingTouched(prev => ({ ...prev, customerPhone: true }));
                            validateBookingField('customerPhone', customerPhone);
                        }}
                        error={bookingTouched.customerPhone && Boolean(bookingErrors.customerPhone)}
                        helperText={bookingTouched.customerPhone && bookingErrors.customerPhone ? bookingErrors.customerPhone : '10-digit mobile number'}
                        required
                    />
                    <TextField
                        label="Email (Optional)"
                        value={customerEmail}
                        onChange={e => {
                            setCustomerEmail(e.target.value);
                            if (bookingTouched.customerEmail) validateBookingField('customerEmail', e.target.value);
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
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    color="success"
                    onClick={handleCreateBooking}
                    disabled={(table && guestCount > table.capacity) || isProcessing}
                    startIcon={isProcessing && <CircularProgress size={16} color="inherit" />}
                >
                    {isProcessing ? 'Booking...' : 'Book Now'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default React.memo(BookingDialog);
