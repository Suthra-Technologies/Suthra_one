import {
    Add as AddIcon,
    Cancel as CancelIcon,
    CheckCircle as CheckCircleIcon,
    Circle as CircleIcon,
    Close as CloseIcon,
    Event as EventIcon,
    LocalFireDepartment as SpiceIcon,
    LocationOn as LocationOnIcon,
    StickyNote2 as NoteIcon,
    Gavel as DisputeIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { disputesAPI, ordersAPI, ubereatsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useActiveTenant } from '../hooks/useActiveTenant';
import {
    canAddItems,
    formatDateTime,
    formatTime,
    getOrderTypeLabel,
    getPaymentMethodLabel,
    getStatusColor,
    getStatusLabel,
    isGlobalDineIn,
} from '../utils/orderWorkflows';
import { formatSpiceLevelLabel } from '../utils/spiceLevel';
import PaymentCollectionDialog from './PaymentCollectionDialog';
import DisputeInitiationDialog from './DisputeInitiationDialog';
import MapComponent from './MapComponent';
import { useNotifications } from '../context/NotificationProvider';

const getCustomerCoordinates = (order: any) => {
    if (!order) return undefined;
    const dLoc = order.delivery?.location || 
                 order.deliveryAddress?.location || 
                 order.deliveryAddress || 
                 order.location?.coordinates || 
                 order.location;
    if (!dLoc) return undefined;
    const lat = dLoc.lat || dLoc.latitude || (dLoc.coordinates && dLoc.coordinates.lat);
    const lng = dLoc.lng || dLoc.longitude || (dLoc.coordinates && dLoc.coordinates.lng);
    return (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : undefined;
};

const getCustomerAddress = (order: any) => {
    if (!order) return '';
    const loc = order.location;
    let cateringAddress = '';
    if (loc && typeof loc === 'object') {
        const parts = [
            loc.address || loc.street,
            loc.city,
            loc.state,
            loc.zipCode || loc.pincode
        ].filter(Boolean);
        cateringAddress = parts.join(', ');
    }
    return order.delivery?.address || 
           order.deliveryAddress?.formattedAddress || 
           order.deliveryAddress?.fullAddress || 
           (typeof order.deliveryAddress === 'string' ? order.deliveryAddress : '') ||
           cateringAddress ||
           '';
};

interface OrderDetailsDialogProps {
    open: boolean;
    order: any | null;
    onClose: () => void;
    onUpdate?: () => void;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({ open, order, onClose, onUpdate }) => {
    const { formatCurrency } = useSettings();
    const { user } = useAuth();
    const { deliveryLocations } = useNotifications();
    const navigate = useNavigate();
    const { getRelativePath } = useActiveTenant();
    const theme = useTheme();
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [simulating, setSimulating] = useState(false);
    const [refundDialogOpen, setRefundDialogOpen] = useState(false);
    const [podDialogOpen, setPodDialogOpen] = useState(false);
    const [podImage, setPodImage] = useState<string | null>(null);
    const [podLoading, setPodLoading] = useState(false);
    const [refundLoading, setRefundLoading] = useState(false);
    const [refundForm, setRefundForm] = useState({
        requester_email_id: '',
        notes: '',
        items_missing: '',
        refund_amount: '',
    });
    const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
    const [disputes, setDisputes] = useState<any[]>([]);

    useEffect(() => {
        if (!open || !order?._id) {
            setDisputes([]);
            return;
        }
        disputesAPI.getAll({ orderId: order._id })
            .then(res => setDisputes(res.data || []))
            .catch(err => console.error('Failed to load disputes for order:', err));
    }, [open, order?._id]);

    if (!order) return null;

    const canAddMoreItems = canAddItems(order.status, order.orderType, order);
    // Global Dine In orders have already paid - don't show collect payment
    const canCollectPayment = order.orderType === 'dine_in' && order.status === 'served' && !isGlobalDineIn(order);
    const isCancelled = order.status === 'cancelled' || order.status === 'canceled';
    // Nothing left to dispute once every item's quantity is already under an active dispute
    const allItemsDisputed = (order.items || []).length > 0 && (order.items || []).every(
        (item: any) => Number(item?.quantity || 0) - Number(item?.disputedQuantity || 0) <= 0
    );

    const getDisputeReasonLabel = (reason: string) => (reason || '').replace(/_/g, ' ').toUpperCase();
    const getDisputeStatusLabel = (status: string) => {
        switch (status) {
            case 'open': return 'Open';
            case 'under_investigation': return 'Investigating';
            case 'resolution_pending': return 'Resolution Pending';
            case 'resolved': return 'Resolved';
            case 'rejected': return 'Rejected';
            default: return status;
        }
    };
    const getDisputeStatusColor = (status: string) => {
        switch (status) {
            case 'resolved': return 'success';
            case 'rejected': return 'default';
            case 'under_investigation': return 'warning';
            case 'resolution_pending': return 'info';
            default: return 'error';
        }
    };

    // Merge status-change events and dispute events into one chronological timeline.
    const timelineEvents = [
        ...(order.statusHistory || []).map((history: any) => ({ kind: 'status' as const, timestamp: history.timestamp, data: history })),
        ...disputes.map((dispute: any) => ({ kind: 'dispute' as const, timestamp: dispute.createdAt, data: dispute })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const getPaymentBadgeColor = (method: string | string[]) => {
        let m = method;
        if (Array.isArray(method)) {
            if (method.length > 1) return theme.palette.secondary.main; // purple for split
            m = method[0];
        }

        switch (m?.toString()?.toLowerCase()) {
            case 'card':
            case 'creditcard':
            case 'debitcard':
                return theme.palette.info.main;
            case 'cash':
                return theme.palette.success.main;
            case 'upi':
                return theme.palette.primary.main;
            case 'phonepe':
                return '#5f259f';
            case 'gpay':
                return '#4285F4';
            case 'paytm':
                return '#00baf2';
            case 'zelle':
                return '#7414CA';
            case 'venmo':
                return '#008CFF';
            case 'wallet':
                return '#ed8936';
            case 'cheque':
                return '#718096';
            case 'cod':
                return '#e53e3e';
            case 'online':
                return '#319795';
            default:
                return theme.palette.grey[600];
        }
    };

    const handleSimulate = async (status: string) => {
        setSimulating(true);
        try {
            if (status === 'sync') {
                if (order.uberEatsDeliveryId) {
                    await ordersAPI.syncUberEatsStatus(order._id);
                } else if (order.doordashDeliveryId) {
                    await ordersAPI.syncDoordashStatus(order._id);
                } else {
                    throw new Error('No third-party delivery associated with this order');
                }
                toast.success('Sync successful');
            } else {
                await ordersAPI.simulateUberEatsStatus(order._id, status);
                toast.success(`Successfully simulated ${status} status`);
            }
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error('Simulation/Sync error:', error);
            toast.error(error.response?.data?.message || error.message || 'Operation failed');
        } finally {
            setSimulating(false);
        }
    };

    // Adding items reuses the POS in edit mode: it loads this order's customer,
    // table and cart, and saves back to the same order.
    const handleAddItems = () => {
        onClose();
        navigate(getRelativePath(`/pos?orderId=${order._id}`));
    };

    const handlePaymentSuccess = () => {
        setPaymentDialogOpen(false);
        if (onUpdate) onUpdate();
    };

    const handleViewProof = async () => {
        if (!order.uberEatsDeliveryId) return;
        setPodLoading(true);
        setPodDialogOpen(true);
        try {
            const res = await ubereatsAPI.getProofOfDelivery(order.uberEatsDeliveryId);
            setPodImage(res.data?.document || null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load proof of delivery');
            setPodDialogOpen(false);
        } finally {
            setPodLoading(false);
        }
    };

    const handleSubmitRefund = async () => {
        if (!order.uberEatsDeliveryId) return;
        setRefundLoading(true);
        try {
            await ubereatsAPI.submitRefund({
                delivery_id: order.uberEatsDeliveryId,
                requester_email_id: refundForm.requester_email_id,
                notes: refundForm.notes,
                items_missing: refundForm.items_missing ? refundForm.items_missing.split(',').map((s: string) => s.trim()) : [],
                total_refund_amount: {
                    amount: Math.round(parseFloat(refundForm.refund_amount) * 100),
                    currency_code: 'USD',
                },
            });
            toast.success('Refund request submitted successfully');
            setRefundDialogOpen(false);
            setRefundForm({ requester_email_id: '', notes: '', items_missing: '', refund_amount: '' });
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to submit refund');
        } finally {
            setRefundLoading(false);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Order Details
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
                    {/* Order Header */}
                    <Box sx={{ mb: 3 }}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                            <Typography variant="h5" fontWeight="bold">
                                Order #{order.orderNumber?.split('-').pop() || order._id.slice(-6)}
                            </Typography>
                            <Chip label={getStatusLabel(order.status)} color={getStatusColor(order.status) as any} />
                        </Stack>
                        <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" gap={1}>
                            <Typography variant="body2" color="text.secondary">
                                <strong>Type:</strong> {getOrderTypeLabel(order.orderType, order)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                <strong>Created:</strong> {formatDateTime(order.createdAt)}
                            </Typography>
                            {order.isPreOrder && (
                                <Chip
                                    icon={<EventIcon sx={{ fontSize: 14 }} />}
                                    label="PRE-ORDER"
                                    size="small"
                                    sx={{ fontWeight: 'bold', bgcolor: 'rgba(124,58,237,0.12)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)' }}
                                />
                            )}
                        </Stack>
                        {order.isPreOrder && order.scheduledTime && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5, px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.2)', width: 'fit-content' }}>
                                <EventIcon sx={{ fontSize: 16, mr: 1, color: '#7c3aed' }} />
                                <Typography variant="body2" sx={{ color: '#7c3aed', fontWeight: 600 }}>
                                    Scheduled for: {new Date(order.scheduledTime).toLocaleString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Customer & Table Info */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Customer Information
                        </Typography>
                        <Stack spacing={1}>
                            {order.customer?.name && (
                                <Typography variant="body2">
                                    <strong>Name:</strong> {order.customer?.name || 'Walk-in'}
                                </Typography>
                            )}
                            {order.customer?.phone && (
                                <Typography variant="body2">
                                    <strong>Phone:</strong> {order.customer?.phone}
                                </Typography>
                            )}
                            {order.customer?.email && (
                                <Typography variant="body2">
                                    <strong>Email:</strong> {order.customer?.email}
                                </Typography>
                            )}
                            {(order.tableNumber || order.table) && (
                                <Typography variant="body2">
                                    <strong>Table:</strong> {order.tableNumber || order.table?.tableNumber || order.table?.number || order.table?.tableName || order.table?.name}
                                </Typography>
                            )}
                            {order.waiter?.name && (
                                <Typography variant="body2">
                                    <strong>Waiter:</strong> {order.waiter.name}
                                </Typography>
                            )}
                            {order.notes && (
                                <Box sx={{ mt: 1, p: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.08), borderRadius: 1.5, borderLeft: `4px solid ${theme.palette.warning.main}` }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                        <NoteIcon fontSize="small" color="warning" sx={{ mr: 1 }} />
                                        <Typography variant="subtitle2" color="warning.dark" fontWeight="bold">
                                            Order Notes
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', wordBreak: 'break-word' }}>
                                        {order.notes}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Box>

                    {/* Delivery Address - Only for delivery/online orders */}
                    {(order.orderType === 'delivery' || order.orderType === 'online') && (
                        (() => {
                            const dLoc = order.delivery?.location || order.deliveryAddress?.location || order.deliveryAddress;
                            const lat = dLoc?.lat || dLoc?.latitude;
                            const lng = dLoc?.lng || dLoc?.longitude;
                            const addr = order.delivery?.address || order.deliveryAddress?.formattedAddress || order.deliveryAddress?.fullAddress || (typeof order.deliveryAddress === 'string' ? order.deliveryAddress : '');

                            if (!addr && (!lat || !lng)) return null;

                            return (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                            Delivery Address
                                        </Typography>
                                        <Stack spacing={1}>
                                            <Box>
                                                <Typography variant="body2" component="span">
                                                    <strong>Address:</strong> {addr || 'Location Pin'}
                                                </Typography>
                                                <Button
                                                    size="small"
                                                    startIcon={<LocationOnIcon />}
                                                    onClick={() => {
                                                        let url;
                                                        if (lat && lng) {
                                                            url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                                                        } else {
                                                            url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
                                                        }
                                                        window.open(url, '_blank');
                                                    }}
                                                    sx={{ ml: 1, padding: '0 8px', minWidth: 'auto', verticalAlign: 'middle' }}
                                                    variant="outlined"
                                                >
                                                    Directions
                                                </Button>
                                            </Box>

                                            {order.deliveryAddress?.landmark && (
                                                <Typography variant="body2">
                                                    <strong>Landmark:</strong> {order.deliveryAddress.landmark}
                                                </Typography>
                                            )}
                                            {order.deliveryAddress?.city && (
                                                <Typography variant="body2">
                                                    <strong>City:</strong> {order.deliveryAddress.city} {order.deliveryAddress.pincode ? `- ${order.deliveryAddress.pincode}` : ''}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Box>
                                </>
                            );
                        })()
                    )}

                    {/* Delivery Information Container */}
                    {(['delivery', 'online'].includes(order.orderType) || order.driverName || order.driverPhone || order.trackingUrl || order.uberEatsDeliveryId || order.doordashDeliveryId) && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    Delivery Details {order.uberEatsDeliveryId ? '(Uber Eats)' : order.doordashDeliveryId ? '(DoorDash)' : '(In-House)'}
                                </Typography>
                                <Stack spacing={1}>
                                    {order.driverName && (
                                        <Typography variant="body2">
                                            <strong>Name:</strong> {order.driverName}
                                        </Typography>
                                    )}
                                    {order.driverPhone && (
                                        <Typography variant="body2">
                                            <strong>Phone (Primary):</strong> <a href={`tel:${order.driverPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{order.driverPhone}</a>
                                        </Typography>
                                    )}
                                    {order.dasherPickupPhone && order.dasherPickupPhone !== order.driverPhone && (
                                        <Typography variant="body2">
                                            <strong>Phone (Pickup):</strong> <a href={`tel:${order.dasherPickupPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{order.dasherPickupPhone}</a>
                                        </Typography>
                                    )}
                                    {order.dasherDropoffPhone && order.dasherDropoffPhone !== order.driverPhone && (
                                        <Typography variant="body2">
                                            <strong>Phone (Dropoff):</strong> <a href={`tel:${order.dasherDropoffPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{order.dasherDropoffPhone}</a>
                                        </Typography>
                                    )}
                                    {order.trackingUrl && (
                                        <Typography variant="body2">
                                            <strong>Tracking Link:</strong> <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'none' }}>Track Delivery</a>
                                        </Typography>
                                    )}
                                    {(order.uberEatsDeliveryId || order.doordashDeliveryId) && (user?.role === 'admin' || user?.role === 'manager') && (
                                        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                                            <Button 
                                                size="small" 
                                                variant="outlined" 
                                                color="secondary"
                                                disabled={simulating}
                                                onClick={() => handleSimulate('sync')}
                                                startIcon={simulating ? <CircularProgress size={16} /> : <Box component="span">🔄</Box>}
                                            >
                                                Sync Status
                                            </Button>
                                            {order.uberEatsDeliveryId && order.status === 'delivered' && (
                                                <Button size="small" variant="outlined" onClick={handleViewProof}>
                                                    View Proof of Delivery
                                                </Button>
                                            )}
                                            {order.uberEatsDeliveryId && order.status === 'delivered' && (
                                                <Button size="small" variant="outlined" color="error" onClick={() => setRefundDialogOpen(true)}>
                                                    Request Refund
                                                </Button>
                                            )}
                                        </Stack>
                                    )}
                                    {(order.signatureImageUrl || order.verificationImageUrl) && (
                                        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                            {order.signatureImageUrl && (
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold" gutterBottom>Signature</Typography>
                                                    <Box 
                                                        component="img" 
                                                        src={order.signatureImageUrl} 
                                                        alt="Delivery Signature"
                                                        sx={{ height: 60, width: 'auto', border: '1px solid #ddd', borderRadius: 1, backgroundColor: '#f9f9f9', padding: 0.5 }}
                                                    />
                                                </Box>
                                            )}
                                            {order.verificationImageUrl && (
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold" gutterBottom>Dropoff Photo</Typography>
                                                    <Box 
                                                        component="img" 
                                                        src={order.verificationImageUrl} 
                                                        alt="Verification Photo"
                                                        sx={{ height: 60, width: 'auto', border: '1px solid #ddd', borderRadius: 1, objectFit: 'cover' }}
                                                    />
                                                </Box>
                                            )}
                                        </Stack>
                                    )}

                                    {/* Live Tracking Map for Cashier */}
                                    {((['delivery', 'online'].includes(order.orderType)) && 
                                      (['on_the_way', 'out_for_delivery'].includes(order.status) || deliveryLocations[order._id])) && (
                                        <Box sx={{ mt: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant="subtitle2" color="primary" sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                                                    <Box sx={{ width: 8, height: 8, bgcolor: 'error.main', borderRadius: '50%', mr: 1, animation: 'pulse 1.5s infinite' }} />
                                                    LIVE TRACKING ACTIVE
                                                </Typography>
                                                {routeInfo && (
                                                    <Stack direction="row" spacing={1}>
                                                        <Chip
                                                            size="small"
                                                            color="primary"
                                                            variant="outlined"
                                                            label={`${routeInfo.distance} away`}
                                                            sx={{ fontWeight: 'bold' }}
                                                        />
                                                        <Chip
                                                            size="small"
                                                            color="secondary"
                                                            variant="outlined"
                                                            label={`${routeInfo.duration} arrival`}
                                                            sx={{ fontWeight: 'bold' }}
                                                        />
                                                    </Stack>
                                                )}
                                            </Box>
                                            <MapComponent
                                                center={
                                                    deliveryLocations[order._id] || 
                                                    order.delivery?.currentLocation ||
                                                    getCustomerCoordinates(order) || 
                                                    { lat: 0, lng: 0 }
                                                }
                                                markerPosition={deliveryLocations[order._id] || order.delivery?.currentLocation}
                                                customerPosition={getCustomerCoordinates(order)}
                                                customerAddress={getCustomerAddress(order)}
                                                height="250px"
                                                onRouteInfo={setRouteInfo}
                                            />
                                            <style>{`
                                                @keyframes pulse {
                                                    0% { opacity: 1; transform: scale(1); }
                                                    50% { opacity: 0.5; transform: scale(1.2); }
                                                    100% { opacity: 1; transform: scale(1); }
                                                }
                                            `}</style>
                                        </Box>
                                    )}
                                </Stack>
                            </Box>
                        </>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Order Items */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Order Items
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Item</strong></TableCell>
                                        <TableCell align="center"><strong>Qty</strong></TableCell>
                                        <TableCell align="right"><strong>Price</strong></TableCell>
                                        <TableCell align="right"><strong>Total</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {order.items?.filter((item: any) => item.preparationStatus !== 'cancelled').map((item: any, index: number) => {
                                        return (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                            {item.name || item.menuItem?.name || 'Unknown Item'}
                                                        </Typography>
                                                        {item.preparationStatus === 'ready' && (
                                                            <Tooltip title="Ready to Serve" arrow>
                                                                <CheckCircleIcon
                                                                    sx={{
                                                                        fontSize: 16,
                                                                        color: '#10b981',
                                                                        animation: 'pulse-green 2s infinite',
                                                                        '@keyframes pulse-green': {
                                                                            '0%': { transform: 'scale(0.95)', opacity: 0.8 },
                                                                            '70%': { transform: 'scale(1.2)', opacity: 1 },
                                                                            '100%': { transform: 'scale(0.95)', opacity: 0.8 }
                                                                        }
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                    {item.modifiers && (item?.modifiers || []).length > 0 && (
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            + {(item?.modifiers || []).map((m: any) => m.name).join(', ')}
                                                        </Typography>
                                                    )}
                                                    {item.spiceLevel ? (
                                                        <Chip
                                                            icon={<SpiceIcon sx={{ fontSize: 14 }} />}
                                                            label={`Spice: ${formatSpiceLevelLabel(item.spiceLevel)}`}
                                                            size="small"
                                                            sx={{
                                                                mt: 0.75,
                                                                height: 22,
                                                                fontSize: '0.72rem',
                                                                fontWeight: 700,
                                                                bgcolor: alpha(theme.palette.warning.main, 0.12),
                                                                color: theme.palette.warning.dark,
                                                                border: `1px solid ${alpha(theme.palette.warning.main, 0.28)}`,
                                                                '& .MuiChip-icon': {
                                                                    color: theme.palette.warning.main,
                                                                },
                                                            }}
                                                        />
                                                    ) : null}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {item.quantity}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {formatCurrency(item.price)}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {formatCurrency(item.total || item.price * item.quantity)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Payment Summary */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Payment Summary
                        </Typography>
                        <Stack spacing={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2">Subtotal:</Typography>
                                <Typography variant="body2">{formatCurrency(order.subtotal)}</Typography>
                            </Box>
                            {(order.tax?.amount ?? 0) > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2">Tax </Typography>
                                    <Typography variant="body2">{formatCurrency(order.tax?.amount ?? 0)}</Typography>
                                </Box>
                            )}
                            {(order.processingFee ?? 0) > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2">Processing Fee:</Typography>
                                    <Typography variant="body2">{formatCurrency(order.processingFee ?? 0)}</Typography>
                                </Box>
                            )}
                            {(order.serviceCharge?.amount ?? 0) > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2">Service Charge ({order.serviceCharge?.rate ?? 0}%):</Typography>
                                    <Typography variant="body2">{formatCurrency(order.serviceCharge?.amount ?? 0)}</Typography>
                                </Box>
                            )}
                            {(order.discount?.amount > 0 || order.couponDiscount > 0) && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                                    <Typography variant="body2">
                                        Discount {(order.discount?.couponCode || order.couponCode) ? `(${order.discount?.couponCode || order.couponCode})` : ''}:
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        -{formatCurrency(order.discount?.amount || order.couponDiscount)}
                                    </Typography>
                                </Box>
                            )}
                            {order.rewardDiscount > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                        Points Discount:
                                    </Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        -{formatCurrency(order.rewardDiscount)}
                                    </Typography>
                                </Box>
                            )}
                            {order.deliveryCharge > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2">Delivery Charge:</Typography>
                                    <Typography variant="body2">{formatCurrency(order.deliveryCharge)}</Typography>
                                </Box>
                            )}
                            {order.tip > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2">Tip:</Typography>
                                    <Typography variant="body2">{formatCurrency(order.tip)}</Typography>
                                </Box>
                            )}
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="h6" fontWeight="bold">Total:</Typography>
                                <Typography variant="h6" fontWeight="bold" color="primary">
                                    {formatCurrency(order.totalAmount)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1.5 }}>
                                <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                    Payment Details:
                                </Typography>
                                {order.payments && order.payments.length > 0 ? (
                                    <Stack spacing={1} sx={{ pl: 1 }}>
                                        {order.payments.map((p: any, idx: number) => (
                                            <Box key={p._id || idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Chip
                                                        label={getPaymentMethodLabel(p.method)}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.7rem',
                                                            bgcolor: alpha(getPaymentBadgeColor(p.method) as string, 0.12),
                                                            color: getPaymentBadgeColor(p.method),
                                                            fontWeight: 'bold',
                                                        }}
                                                    />
                                                    {p.transactionId && (
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 0.5, border: '1px solid', borderColor: 'divider' }}>
                                                            Ref: {p.transactionId}
                                                        </Typography>
                                                    )}
                                                </Stack>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {formatCurrency(p.amount)}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pl: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Chip
                                                label={order.paymentStatus === 'pending' ? 'PENDING' : getPaymentMethodLabel(order.paymentMethod)}
                                                size="small"
                                                sx={{
                                                    height: 20,
                                                    fontSize: '0.7rem',
                                                    bgcolor: alpha(order.paymentStatus === 'pending' ? theme.palette.warning.main : getPaymentBadgeColor(order.paymentMethod) as string, 0.12),
                                                    color: order.paymentStatus === 'pending' ? theme.palette.warning.main : getPaymentBadgeColor(order.paymentMethod),
                                                    fontWeight: 'bold',
                                                }}
                                            />
                                            {order.paymentIntentId && (
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 0.5, border: '1px solid', borderColor: 'divider' }}>
                                                    Ref: {order.paymentIntentId}
                                                </Typography>
                                            )}
                                        </Stack>
                                        <Typography variant="body2" fontWeight="bold">
                                            {formatCurrency(order.totalAmount)}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Stack>
                    </Box>
                    <Divider sx={{ my: 2 }} />

                    {/* Delivery Simulator (Sandbox) */}
                    {(order.uberEatsDeliveryId || order.doordashDeliveryId) && (user?.role === 'admin' || user?.role === 'manager') && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05), border: `1px dashed ${theme.palette.info.main}` }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', color: theme.palette.info.main }}>
                                    <Box component="span" sx={{ mr: 1 }}>🧪</Box> Delivery Synchronization & Testing
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                    {order.uberEatsDeliveryId ? 'Manually sync or simulate Uber Eats states.' : 'Manually sync DoorDash delivery status.'}
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                    <Button 
                                        size="small" 
                                        variant="outlined" 
                                        color="secondary"
                                        disabled={simulating}
                                        onClick={() => handleSimulate('sync')}
                                        startIcon={simulating ? <CircularProgress size={16} /> : <Box component="span">🔄</Box>}
                                    >
                                        Sync Status
                                    </Button>

                                    {order.uberEatsDeliveryId && (
                                        <>
                                            <Button 
                                                size="small" 
                                                variant="outlined" 
                                                color="primary"
                                                component="a"
                                                href={order.trackingUrl}
                                                target="_blank"
                                                startIcon={<Box component="span">🔗</Box>}
                                            >
                                                Tracking Page
                                            </Button>
                                            <Button 
                                                size="small" 
                                                variant="contained" 
                                                color="warning"
                                                disabled={simulating || order.status === 'on_the_way'}
                                                onClick={() => handleSimulate('pickup_completed')}
                                                sx={{ fontWeight: 'bold' }}
                                            >
                                                🚀 Force: Picked Up
                                            </Button>
                                            <Button 
                                                size="small" 
                                                variant="contained" 
                                                color="success"
                                                disabled={simulating || order.status === 'delivered'}
                                                onClick={() => handleSimulate('delivered')}
                                                sx={{ fontWeight: 'bold' }}
                                            >
                                                ✅ Force: Delivered
                                            </Button>
                                            <Button 
                                                size="small" 
                                                variant="outlined" 
                                                color="error" 
                                                disabled={simulating || order.status === 'cancelled'}
                                                onClick={() => handleSimulate('canceled')}
                                            >
                                                Cancel Delivery
                                            </Button>
                                        </>
                                    )}
                                </Stack>
                            </Box>
                        </>
                    )}

                    {/* Status History */}
                    {timelineEvents.length > 0 && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    Status History
                                </Typography>
                                <Stack spacing={2} sx={{ mt: 2 }}>
                                    {timelineEvents.map((event, index) => {
                                        if (event.kind === 'dispute') {
                                            const dispute = event.data;
                                            return (
                                                <Box
                                                    key={`dispute-${dispute._id || index}`}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: 2,
                                                        p: 2,
                                                        bgcolor: (t) => alpha(t.palette.error.main, 0.06),
                                                        borderRadius: 1,
                                                        border: '1px solid',
                                                        borderColor: 'error.main',
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: '50%',
                                                            bgcolor: 'error.main',
                                                            color: 'white',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <DisputeIcon fontSize="small" />
                                                    </Box>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                                            <Typography variant="body2" fontWeight="bold" color="error.main">
                                                                Dispute Raised
                                                            </Typography>
                                                            <Chip
                                                                label={getDisputeStatusLabel(dispute.status)}
                                                                color={getDisputeStatusColor(dispute.status) as any}
                                                                size="small"
                                                            />
                                                        </Stack>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {formatTime(dispute.createdAt)}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                            Reason: {getDisputeReasonLabel(dispute.reason)}
                                                        </Typography>
                                                        {dispute.description && (
                                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                                {dispute.description}
                                                            </Typography>
                                                        )}
                                                        {dispute.disputedAmount > 0 && (
                                                            <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }}>
                                                                Disputed Amount: {formatCurrency(dispute.disputedAmount)}
                                                            </Typography>
                                                        )}
                                                        {dispute.resolution && (
                                                            <Typography variant="body2" color="success.main" sx={{ mt: 0.5 }}>
                                                                Resolution: {dispute.resolution.type?.replace(/_/g, ' ')}
                                                                {dispute.resolution.notes ? ` — ${dispute.resolution.notes}` : ''}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            );
                                        }

                                        const history = event.data;
                                        return (
                                            <Box
                                                key={`status-${index}`}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 2,
                                                    p: 2,
                                                    bgcolor: 'background.paper',
                                                    borderRadius: 1,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: '50%',
                                                        bgcolor: `${getStatusColor(history.status)}.main`,
                                                        color: 'white',
                                                    }}
                                                >
                                                    {history.status.includes('completed') || history.status.includes('delivered') ? (
                                                        <CheckCircleIcon fontSize="small" />
                                                    ) : history.status === 'cancelled' ? (
                                                        <CancelIcon fontSize="small" />
                                                    ) : (
                                                        <CircleIcon fontSize="small" />
                                                    )}
                                                </Box>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {getStatusLabel(history.status)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {formatTime(history.timestamp)}
                                                    </Typography>
                                                    {history.notes && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                            {history.notes}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            </Box>
                        </>
                    )}
                </DialogContent>

                <DialogActions>
                    {canAddMoreItems && (
                        <Button
                            startIcon={<AddIcon />}
                            onClick={handleAddItems}
                            variant="outlined"
                            color="primary"
                        >
                            Add Items
                        </Button>
                    )}
                    {canCollectPayment && (
                        <Button
                            onClick={() => setPaymentDialogOpen(true)}
                            variant="contained"
                            color="success"
                        >
                            Collect Payment
                        </Button>
                    )}
                    <Box sx={{ flex: 1 }} />
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                        <Tooltip title={allItemsDisputed ? 'All items on this order already have an active dispute' : ''}>
                            <span>
                                <Button
                                    startIcon={<DisputeIcon />}
                                    onClick={() => setDisputeDialogOpen(true)}
                                    color="error"
                                    disabled={allItemsDisputed}
                                >
                                    Dispute Order
                                </Button>
                            </span>
                        </Tooltip>
                    )}
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Dispute Initiation Dialog */}
            <DisputeInitiationDialog
                open={disputeDialogOpen}
                order={order}
                onClose={() => setDisputeDialogOpen(false)}
                onSuccess={() => {
                    setDisputeDialogOpen(false);
                    disputesAPI.getAll({ orderId: order._id })
                        .then(res => setDisputes(res.data || []))
                        .catch(err => console.error('Failed to reload disputes for order:', err));
                    if (onUpdate) onUpdate();
                }}
            />

            {/* Payment Collection Dialog */}
            <PaymentCollectionDialog
                open={paymentDialogOpen}
                order={order}
                onClose={() => setPaymentDialogOpen(false)}
                onSuccess={handlePaymentSuccess}
            />

            {/* Proof of Delivery Dialog */}
            <Dialog open={podDialogOpen} onClose={() => { setPodDialogOpen(false); setPodImage(null); }} maxWidth="sm" fullWidth>
                <DialogTitle>Proof of Delivery</DialogTitle>
                <DialogContent>
                    {podLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : podImage ? (
                        <Box component="img"
                            src={`data:image/png;base64,${podImage}`}
                            alt="Proof of Delivery"
                            sx={{ width: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                        />
                    ) : (
                        <Typography color="text.secondary" sx={{ py: 2 }}>No proof of delivery available.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setPodDialogOpen(false); setPodImage(null); }}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Refund Request Dialog */}
            <Dialog open={refundDialogOpen} onClose={() => setRefundDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Request Refund</DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="Your Email"
                            value={refundForm.requester_email_id}
                            onChange={(e) => setRefundForm(f => ({ ...f, requester_email_id: e.target.value }))}
                            placeholder="email@example.com"
                        />
                        <TextField
                            fullWidth
                            label="Missing Items (comma separated)"
                            value={refundForm.items_missing}
                            onChange={(e) => setRefundForm(f => ({ ...f, items_missing: e.target.value }))}
                            placeholder="Large Pizza, Soft Drink"
                        />
                        <TextField
                            fullWidth
                            label="Refund Amount (USD)"
                            type="number"
                            value={refundForm.refund_amount}
                            onChange={(e) => setRefundForm(f => ({ ...f, refund_amount: e.target.value }))}
                            placeholder="10.00"
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Notes"
                            value={refundForm.notes}
                            onChange={(e) => setRefundForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="Describe the issue..."
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRefundDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={refundLoading || !refundForm.requester_email_id || !refundForm.refund_amount}
                        onClick={handleSubmitRefund}
                    >
                        {refundLoading ? <CircularProgress size={18} /> : 'Submit Refund'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default OrderDetailsDialog;
