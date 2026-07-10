import React from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    IconButton,
    Chip,
    Divider,
    Tooltip
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
    Close as CloseIcon
} from '@mui/icons-material';

interface ViewBookingDialogProps {
    open: boolean;
    onClose: () => void;
    booking: any;
    tables: any[];
    onStatusChange: (bookingId: string, status: string) => void;
    onCheckIn: (bookingId: string) => void;
    getBookingStatusColor: (status: string) => any;
    formatDate: (date: string) => string;
}

const ViewBookingDialog: React.FC<ViewBookingDialogProps> = ({
    open,
    onClose,
    booking,
    tables,
    onStatusChange,
    onCheckIn,
    getBookingStatusColor,
    formatDate
}) => {
    if (!booking) return null;

    const tableId = booking.table?._id || (typeof booking.table === 'string' ? booking.table : null);
    const realTable = tables.find(t => t._id === tableId);
    const hasActiveOrder = !!realTable?.currentOrder;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Booking Details</Typography>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    size="small"
                    sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                            #{booking.bookingId}
                        </Typography>
                        <Chip
                            label={booking.status?.toUpperCase()}
                            color={getBookingStatusColor(booking.status)}
                            size="small"
                        />
                    </Box>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Default Table</Typography>
                            <Typography variant="body1">
                                {booking.table?.tableName || `Table ${booking.table?.tableNumber}` || 'N/A'}
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Date</Typography>
                            <Typography variant="body1">
                                {formatDate(booking.date)}
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Time</Typography>
                            <Typography variant="body1">
                                {booking.timeSlot?.requested}
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Guests</Typography>
                            <Typography variant="body1">
                                {booking.guests} People
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 1 }} />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="text.secondary">Customer Name</Typography>
                            <Typography variant="body1" fontWeight={500}>
                                {booking.guestInfo?.firstName} {booking.guestInfo?.lastName}
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Phone</Typography>
                            <Typography variant="body2">
                                {booking.guestInfo?.phone}
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">Email</Typography>
                            <Typography variant="body2">
                                {booking.guestInfo?.email || '-'}
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                {booking.status === 'pending' && (
                    <Button
                        variant="contained"
                        color="success"
                        onClick={() => {
                            onStatusChange(booking._id, 'confirmed');
                            onClose();
                        }}
                    >
                        Confirm Booking
                    </Button>
                )}

                {(booking.status === 'confirmed' || booking.status === 'pending') && (!booking.checkedIn || !hasActiveOrder) && (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            onCheckIn(booking._id);
                            onClose();
                        }}
                    >
                        Check In
                    </Button>
                )}

                {booking.checkedIn && booking.status !== 'completed' && hasActiveOrder && (
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={() => {
                            onCheckIn(booking._id);
                            onClose();
                        }}
                    >
                        Checkout
                    </Button>
                )}

                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => {
                            onStatusChange(booking._id, 'cancelled');
                            onClose();
                        }}
                    >
                        Cancel Booking
                    </Button>
                )}
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default React.memo(ViewBookingDialog);
