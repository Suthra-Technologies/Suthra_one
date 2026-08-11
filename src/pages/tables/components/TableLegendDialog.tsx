// src/pages/tables/components/TableLegendDialog.tsx
import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Stack,
    Divider,
    Paper,
    useTheme,
    alpha,
} from '@mui/material';
import {
    CheckCircle as AvailableIcon,
    Block as OccupiedIcon,
    EventAvailable as ReservedIcon,
    CleaningServices as CleaningIcon,
    DoNotDisturb as OutOfOrderIcon,
    Link as MergedIcon,
    AccessTime as TimeIcon,
    TableRestaurant as TableIcon,
} from '@mui/icons-material';

interface TableLegendDialogProps {
    open: boolean;
    onClose: () => void;
}

const TableLegendDialog: React.FC<TableLegendDialogProps> = ({ open, onClose }) => {
    const theme = useTheme();

    const statusLegend = [
        {
            title: 'Available',
            description: 'Table is empty, clean, and ready for seating guests.',
            color: '#10B981',
            bgColor: '#ECFDF5',
            borderColor: '#10B981',
            icon: <AvailableIcon sx={{ color: '#10B981', fontSize: 20 }} />,
            example: 'Available (Click to Seat / Take Order)',
        },
        {
            title: 'Occupied / Seated',
            description: 'Guests are seated with an active order in progress.',
            color: '#EF4444',
            bgColor: '#FEF2F2',
            borderColor: '#EF4444',
            icon: <OccupiedIcon sx={{ color: '#EF4444', fontSize: 20 }} />,
            example: 'Occupied (Live Seating Timer Active)',
        },
        {
            title: 'Reserved',
            description: 'Booked for an upcoming reservation slot.',
            color: '#F59E0B',
            bgColor: '#FFFBEB',
            borderColor: '#F59E0B',
            icon: <ReservedIcon sx={{ color: '#F59E0B', fontSize: 20 }} />,
            example: 'Reserved (Shows Guest Name & Time)',
        },
        {
            title: 'Needs Cleaning',
            description: 'Guests left. Table needs busing and sanitizing before next party.',
            color: '#06B6D4',
            bgColor: '#ECFEFF',
            borderColor: '#06B6D4',
            icon: <CleaningIcon sx={{ color: '#06B6D4', fontSize: 20 }} />,
            example: '1-Tap "Mark Clean" to make Available',
        },
        {
            title: 'Merged Group',
            description: 'Combined with another table for large group seating.',
            color: '#8B5CF6',
            bgColor: '#F5F3FF',
            borderColor: '#8B5CF6',
            icon: <MergedIcon sx={{ color: '#8B5CF6', fontSize: 20 }} />,
            example: '🔗 Linked to Primary Table',
        },
        {
            title: 'Out of Order / Inactive',
            description: 'Table is under maintenance or temporarily unavailable.',
            color: '#6B7280',
            bgColor: '#F3F4F6',
            borderColor: '#6B7280',
            icon: <OutOfOrderIcon sx={{ color: '#6B7280', fontSize: 20 }} />,
            example: 'Disabled',
        },
    ];

    const timerLegend = [
        {
            time: '< 45 mins',
            status: 'Normal Dining',
            color: '#10B981',
            bgColor: '#ECFDF5',
            description: 'Guests seated recently; meal in progress.',
        },
        {
            time: '45 - 90 mins',
            status: 'Approaching Turn Time',
            color: '#F59E0B',
            bgColor: '#FFFBEB',
            description: 'Standard dining window; preparing for dessert or check.',
        },
        {
            time: '> 1h 30m',
            status: 'Extended Turn Time Alert',
            color: '#EF4444',
            bgColor: '#FEF2F2',
            description: 'High occupancy duration; prompt check presentation.',
        },
    ];

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3, p: 1 }
            }}
        >
            <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex' }}>
                    <TableIcon color="primary" />
                </Box>
                <Box>
                    <Typography variant="h6" fontWeight="bold">
                        Floor Plan & Table Legend
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Color codes, seating timers, and dining indicators
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ py: 2.5 }}>
                {/* Table Status Section */}
                <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                    Table Status Colors
                </Typography>

                <Stack spacing={1.5} sx={{ mb: 3 }}>
                    {statusLegend.map((item) => (
                        <Paper
                            key={item.title}
                            variant="outlined"
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                borderLeft: `5px solid ${item.borderColor}`,
                                bgcolor: alpha(item.bgColor, 0.5),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex' }}>
                                    {item.icon}
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: item.color }}>
                                        {item.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        {item.description}
                                    </Typography>
                                </Box>
                            </Box>
                        </Paper>
                    ))}
                </Stack>

                <Divider sx={{ my: 2 }} />

                {/* Seating Timer Badges Section */}
                <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimeIcon fontSize="small" sx={{ color: 'primary.main' }} /> Seating Duration Alerts
                </Typography>

                <Stack spacing={1.2}>
                    {timerLegend.map((timer) => (
                        <Box
                            key={timer.time}
                            sx={{
                                p: 1.2,
                                px: 1.8,
                                borderRadius: 2,
                                bgcolor: timer.bgColor,
                                border: `1px solid ${alpha(timer.color, 0.3)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                    sx={{
                                        px: 1.2,
                                        py: 0.4,
                                        borderRadius: 1.5,
                                        bgcolor: timer.color,
                                        color: '#FFFFFF',
                                        fontWeight: 800,
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                    }}
                                >
                                    <TimeIcon sx={{ fontSize: 13 }} />
                                    {timer.time}
                                </Box>
                                <Box>
                                    <Typography variant="body2" fontWeight={700} sx={{ color: timer.color, fontSize: '0.85rem' }}>
                                        {timer.status}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {timer.description}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    ))}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 2.5, py: 1.5 }}>
                <Button onClick={onClose} variant="contained" color="primary" sx={{ borderRadius: 2, px: 3, fontWeight: 'bold' }}>
                    Got It
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TableLegendDialog;
