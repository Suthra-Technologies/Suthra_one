import {
    Close as CloseIcon,
    LocationOn as LocationOnIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ordersAPI, tablesAPI } from '../services/api';
import {
    canAddItems,
    getAllStatusesForType,
    getAvailableStatuses,
    getStatusLabel,
    STATUS_LABELS,
} from '../utils/orderWorkflows';
import { useAuth } from '../context/AuthContext';

interface OrderUpdateDialogProps {
    open: boolean;
    order: any | null;
    onClose: () => void;
    onUpdate: () => void;
}

const OrderUpdateDialog: React.FC<OrderUpdateDialogProps> = ({ open, order, onClose, onUpdate }) => {
    const [newStatus, setNewStatus] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [tables, setTables] = useState<any[]>([]);
    const { user } = useAuth();
    const isDeliveryBoy = user?.role === 'delivery';
    useEffect(() => {
        if (order) {
            // Get available statuses for this order type
            let availableStatuses = getAllStatusesForType(order.orderType);
            // Fallback to all known statuses if workflow missing or empty
            if (!availableStatuses || availableStatuses.length === 0) {
                console.error('No workflow found for order type', order.orderType, '- falling back to all statuses');
                availableStatuses = Object.keys(STATUS_LABELS);
            }

            // If current status is not in the list, we should still show it as the selected value
            // instead of resetting to 'pending'.
            setNewStatus(order.status);
            setNotes('');
        }
    }, [order]);

    const handleSubmit = async () => {
        if (!order || !newStatus) return;

        try {
            setLoading(true);

            // Update order status first
            await ordersAPI.updateStatus(order._id, newStatus, notes || undefined);
            toast.success("Order status updated successfully");

            // 🔵 If dine-in & order completed → free the table
            if (order.orderType === "dine_in" && newStatus === "completed") {
                try {
                    // const table = tables.find(t => t.tableNumber === order.tableNumber);
                    console.log(order.table?._id, 'chk');
                    if (order.table?._id) {
                        await tablesAPI.updateStatus(order.table._id, "available");
                    }
                } catch (err) {
                    console.error("Failed to free table:", err);
                    toast.error("Failed to update table status");
                }
            }

            onUpdate();
            onClose();
        } catch (error: any) {
            console.error("Error updating order:", error);
            toast.error(error.response?.data?.message || "Failed to update order");
        } finally {
            setLoading(false);
        }
    };


    if (!order) return null;

    const canAddMoreItems = canAddItems(order.status, order.orderType);

    // For normal users, show all statuses for the type
    // For delivery boys, show only the next available statuses to prevent invalid transitions
    let availableStatuses = isDeliveryBoy
        ? getAvailableStatuses(order.status, order.orderType)
        : getAllStatusesForType(order.orderType);

    if (!availableStatuses || availableStatuses.length === 0) {
        availableStatuses = Object.keys(STATUS_LABELS);
    }

    // Debug logging
    console.log('Order Type:', order.orderType);
    console.log('Available Statuses:', availableStatuses);
    console.log('Current Status:', order.status);
    console.log('New Status:', newStatus);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Update Order Status
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{
                        bgcolor: 'error.main',
                        color: 'common.white',
                        width: 24,
                        height: 24,
                        '&:hover': {
                            bgcolor: 'error.dark',
                        }
                    }}
                >
                    <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {/* Order Info */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Order #{order.orderNumber?.split('-').pop() || order._id.slice(-6)}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">Current Status:</Typography>
                        <Chip label={getStatusLabel(order.status)} size="small" />
                    </Stack>
                </Box>

                {/* Delivery Address - Only for delivery/online orders */}
                {(order.orderType === 'delivery' || order.orderType === 'online') && order.deliveryAddress && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Delivery Address
                        </Typography>
                        <Stack spacing={0.5}>
                            {order.deliveryAddress?.fullAddress && (
                                <Typography variant="body2">
                                    {order.deliveryAddress?.fullAddress}
                                </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary">
                                {[
                                    order.deliveryAddress?.landmark,
                                    order.deliveryAddress?.city,
                                    order.deliveryAddress?.pincode
                                ].filter(Boolean).join(', ')}
                            </Typography>
                            {((order.deliveryAddress?.latitude && order.deliveryAddress?.longitude) || order.deliveryAddress?.fullAddress) && (
                                <Button
                                    size="small"
                                    startIcon={<LocationOnIcon />}
                                    sx={{ alignSelf: 'flex-start', mt: 0.5, p: 0 }}
                                    onClick={() => {
                                        let url;
                                        if (order.deliveryAddress?.latitude && order.deliveryAddress?.longitude) {
                                            url = `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryAddress.latitude},${order.deliveryAddress.longitude}`;
                                        } else {
                                            url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.deliveryAddress?.fullAddress || '')}`;
                                        }
                                        window.open(url, '_blank');
                                    }}
                                >
                                    Get Directions
                                </Button>
                            )}
                        </Stack>
                        <Divider sx={{ my: 2 }} />
                    </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Status Update - Based on Order Type */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>New Status</InputLabel>
                    <Select
                        value={newStatus}
                        label="New Status"
                        onChange={(e) => setNewStatus(e.target.value as string)}
                    >
                        {/* Ensure current status is always an option */}
                        {!availableStatuses.includes(order.status) && (
                            <MenuItem value={order.status}>
                                {getStatusLabel(order.status)} (Current - Invalid for Type)
                            </MenuItem>
                        )}
                        {availableStatuses.map((status) => (
                            <MenuItem key={status} value={status}>
                                {getStatusLabel(status)}
                                {status === order.status && ' (Current)'}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Notes */}
                <TextField
                    fullWidth
                    label="Notes (Optional)"
                    multiline
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this status change..."
                    sx={{ mb: 2 }}
                />

                {/* Info about adding items */}
                {canAddMoreItems && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        This order is in "Served" status. You can add more items to this order from the order details view.
                    </Alert>
                )}

                {/* Warning for cancelled status */}
                {newStatus === 'cancelled' && newStatus !== order.status && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        Cancelling this order cannot be undone. Please confirm this action.
                    </Alert>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || newStatus === order.status}
                >
                    {loading ? 'Updating...' : 'Update Status'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default OrderUpdateDialog;
