import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Chip,
    Stack,
    Tooltip,
    IconButton,
    alpha
} from '@mui/material';
import {
    AccessTime as TimeIcon,
    LocationOn as LocationIcon,
    PlayArrow as StartIcon,
    Stop as StopIcon,
    History as HistoryIcon,
    CheckCircle as CheckIcon
} from '@mui/icons-material';
import { attendanceAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ShiftManager: React.FC = () => {
    const { activeRole, user } = useAuth();
    const [activeShift, setActiveShift] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [note, setNote] = useState('');

    useEffect(() => {
        // Only fetch attendance status if user is logged in
        if (user && activeRole && activeRole !== 'admin' && activeRole !== 'customer') {
            fetchStatus();
        }
    }, [user, activeRole]);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const response = await attendanceAPI.getStatus();
            setActiveShift(response.data);
        } catch (error) {
            console.error('Failed to fetch attendance status', error);
        } finally {
            setLoading(false);
        }
    };

    const getLocation = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });
        });
    };

    const handleClockIn = async () => {
        try {
            setSubmitting(true);
            let location = undefined;

            try {
                const pos = await getLocation();
                location = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                };
            } catch (err) {
                console.warn('Could not get location', err);
                toast.error('Location is required for clock-in. Please enable GPS.');
                setSubmitting(false);
                return;
            }

            const response = await attendanceAPI.clockIn({
                location,
                note
            });
            setActiveShift(response.data);
            setOpenDialog(false);
            setNote('');
            toast.success('Shift started successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to start shift');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClockOut = async () => {
        try {
            setSubmitting(true);
            let location = undefined;

            try {
                const pos = await getLocation();
                location = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                };
            } catch (err) {
                console.warn('Could not get location', err);
            }

            const response = await attendanceAPI.clockOut({ location });
            setActiveShift(null);

            // Show earnings summary
            const shift = response.data;
            toast.success(
                <Box>
                    <Typography variant="subtitle2" fontWeight="bold">Shift Completed!</Typography>
                    <Typography variant="caption">Hours: {shift.totalHours}h | Earned: ${shift.estimatedEarnings}</Typography>
                </Box>,
                { duration: 5000 }
            );
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to end shift');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    // Hide for guests (not logged in), Admin, and Customer
    if (!user || activeRole === 'admin' || activeRole === 'customer') {
        return null;
    }

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                {activeShift ? (
                    <Tooltip title={`Shift started at ${new Date(activeShift.clockInTime).toLocaleTimeString()}`}>
                        <Chip
                            icon={<TimeIcon sx={{ color: 'white !important' }} />}
                            label="ON SHIFT"
                            onClick={handleClockOut}
                            onDelete={handleClockOut}
                            deleteIcon={<StopIcon />}
                            color="success"
                            disabled={submitting}
                            sx={{
                                fontWeight: 'bold',
                                '& .MuiChip-label': { px: 2 },
                                animation: 'pulse-green 2s infinite'
                            }}
                        />
                    </Tooltip>
                ) : (
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<StartIcon />}
                        onClick={() => setOpenDialog(true)}
                        sx={{
                            borderRadius: 2,
                            fontWeight: 'bold',
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                            '&:hover': { bgcolor: 'primary.main', color: 'white' }
                        }}
                    >
                        CLOCK IN
                    </Button>
                )}
            </Box>

            {/* Clock In Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Start Your Shift</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Your location and IP address will be recorded for attendance verification.
                    </Typography>
                    <TextField
                        fullWidth
                        label="Note (Optional)"
                        placeholder="e.g., Morning shift, covering for..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        variant="outlined"
                        size="small"
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setOpenDialog(false)} color="inherit">Cancel</Button>
                    <Button
                        onClick={handleClockIn}
                        variant="contained"
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={16} /> : <CheckIcon />}
                    >
                        START SHIFT
                    </Button>
                </DialogActions>
            </Dialog>

            <style>{`
                @keyframes pulse-green {
                    0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
                }
            `}</style>
        </>
    );
};

export default ShiftManager;
