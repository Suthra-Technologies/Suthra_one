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
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { ordersAPI, ubereatsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
import AddItemsDialog from './AddItemsDialog';
import PaymentCollectionDialog from './PaymentCollectionDialog';
import DisputeInitiationDialog from './DisputeInitiationDialog';

interface OrderDetailsDialogProps {
    open: boolean;
    order: any | null;
    onClose: () => void;
    onUpdate?: () => void;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({ open, order, onClose, onUpdate }) => {
    const { formatCurrency } = useSettings();
    const { user } = useAuth();
    const theme = useTheme();
    const [addItemsDialogOpen, setAddItemsDialogOpen] = useState(false);
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

    if (!order) return null;

    const canAddMoreItems = canAddItems(order.status, order.orderType, order);
    // Global Dine In orders have already paid - don't show collect payment
    const canCollectPayment = order.orderType === 'dine_in' && order.status === 'served' && !isGlobalDineIn(order);

    const handleSimulate = async (status: string) => {
        setSimulating(true);
        try {
            if (status === 'sync') {
                await ordersAPI.syncUberEatsStatus(order._id);
                toast.success('Sync successful');
            } else {
                await ordersAPI.simulateUberEatsStatus(order._id, status);
                toast.success(`Successfully simulated ${status} status`);
            }
            if (onUpdate) onUpdate();
        } catch (error: any) {
            console.error('Simulation/Sync error:', error);
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSimulating(false);
        }
    };

    const handleAddItemsSuccess = () => {
        setAddItemsDialogOpen(false);
        if (onUpdate) {
            onUpdate();
        }
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
                                    <strong>Name:</strong> {order.customer.name}
                                </Typography>
                            )}
                            {order.customer?.phone && (
                                <Typography variant="body2">
                                    <strong>Phone:</strong> {order.customer.phone}
                                </Typography>
                            )}
                            {order.customer?.email && (
                                <Typography variant="body2">
                                    <strong>Email:</strong> {order.customer.email}
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
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
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
                                                            url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                                                        } else {
                                                            url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
                                                        }
                                                        window.open(url, '_blank');
                                                    }}
                                                    sx={{ ml: 1, padding: '0 8px', minWidth: 'auto', verticalAlign: 'middle' }}
                                                    variant="outlined"
                                                >
                                                    Map
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
                                    Delivery Details ({order.uberEatsDeliveryId ? 'Uber Eats' : 'DoorDash'})
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
                                    {order.uberEatsDeliveryId && (user?.role === 'admin' || user?.role === 'manager') && (
                                        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                                            {order.status === 'delivered' && (
                                                <Button size="small" variant="outlined" onClick={handleViewProof}>
                                                    View Proof of Delivery
                                                </Button>
                                            )}
                                            {order.status === 'delivered' && (
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
                                                    {item.modifiers && item.modifiers.length > 0 && (
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            + {item.modifiers.map((m: any) => m.name).join(', ')}
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
                            {order.tax?.amount > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2">Tax </Typography>
                                    <Typography variant="body2">{formatCurrency(order.tax.amount)}</Typography>
                                </Box>
                            )}
                            {order.processingFee > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2">Processing Fee:</Typography>
                                    <Typography variant="body2">{formatCurrency(order.processingFee)}</Typography>
                                </Box>
                            )}
                            {order.serviceCharge?.amount > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2">Service Charge ({order.serviceCharge.rate}%):</Typography>
                                    <Typography variant="body2">{formatCurrency(order.serviceCharge.amount)}</Typography>
                                </Box>
                            )}
                            {order.discount?.amount > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                                    <Typography variant="body2">
                                        Discount {order.discount.code ? `(${order.discount.code})` : ''}:
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        -{formatCurrency(order.discount.amount)}
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
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                <Typography variant="body2">Payment Method:</Typography>
                                <Chip
                                    label={order.paymentStatus === 'pending' ? 'PENDING' : getPaymentMethodLabel(order.payments && order.payments.length > 0 ? order.payments.map((p: any) => p.method) : order.paymentMethod)}
                                    size="small"
                                    color={order.paymentStatus === 'pending' ? 'warning' : 'default'}
                                />
                            </Box>
                        </Stack>
                    </Box>
                    <Divider sx={{ my: 2 }} />

                    {/* Uber Eats Simulator (Sandbox) - Commented for production
                    {order.uberEatsDeliveryId && (user?.role === 'admin' || user?.role === 'manager') && (
                        <>
                            <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05), border: `1px dashed ${theme.palette.info.main}` }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', color: theme.palette.info.main }}>
                                    <Box component="span" sx={{ mr: 1 }}>🧪</Box> Uber Eats Delivery Simulator (Sandbox)
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                    Manually move this delivery through states to test webhooks and status transitions.
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                    <Button 
                                        size="small" 
                                        variant="outlined" 
                                        color="primary"
                                        component="a"
                                        href={order.trackingUrl}
                                        target="_blank"
                                        startIcon={<Box component="span">🔗</Box>}
                                    >
                                        Open Tracking Page (Simulate Here)
                                    </Button>
                                    <Button 
                                        size="small" 
                                        variant="outlined" 
                                        color="info" 
                                        disabled={simulating || order.status === 'on_the_way'}
                                        onClick={() => handleSimulate('pickup_completed')}
                                    >
                                        Picked Up
                                    </Button>
                                    <Button 
                                        size="small" 
                                        variant="outlined" 
                                        color="success" 
                                        disabled={simulating || order.status === 'delivered'}
                                        onClick={() => handleSimulate('delivered')}
                                    >
                                        Delivered
                                    </Button>
                                    <Button 
                                        size="small" 
                                        variant="contained" 
                                        color="warning"
                                        disabled={simulating}
                                        onClick={() => handleSimulate('pickup_completed')}
                                        sx={{ fontWeight: 'bold' }}
                                    >
                                        🚀 Force: Picked Up
                                    </Button>
                                    <Button 
                                        size="small" 
                                        variant="contained" 
                                        color="success"
                                        disabled={simulating}
                                        onClick={() => handleSimulate('delivered')}
                                        sx={{ fontWeight: 'bold' }}
                                    >
                                        ✅ Force: Delivered
                                    </Button>
                                    <Button 
                                        size="small" 
                                        variant="outlined" 
                                        color="secondary"
                                        disabled={simulating}
                                        onClick={() => handleSimulate('sync')}
                                        startIcon={<Box component="span">🔄</Box>}
                                    >
                                        Sync Status
                                    </Button>
                                    <Button 
                                        size="small" 
                                        variant="outlined" 
                                        color="error" 
                                        disabled={simulating || order.status === 'cancelled'}
                                        onClick={() => handleSimulate('canceled')}
                                    >
                                        Canceled
                                    </Button>
                                </Stack>
                            </Box>
                            <Divider sx={{ my: 2 }} />
                        </>
                    )}
                    */}

                    {/* Status History */}
                    {order.statusHistory && order.statusHistory.length > 0 && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    Status History
                                </Typography>
                                <Stack spacing={2} sx={{ mt: 2 }}>
                                    {order.statusHistory.map((history: any, index: number) => (
                                        <Box
                                            key={index}
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
                                    ))}
                                </Stack>
                            </Box>
                        </>
                    )}
                </DialogContent>

                <DialogActions>
                    {canAddMoreItems && (
                        <Button
                            startIcon={<AddIcon />}
                            onClick={() => setAddItemsDialogOpen(true)}
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
                        <Button
                            startIcon={<DisputeIcon />}
                            onClick={() => setDisputeDialogOpen(true)}
                            color="error"
                        >
                            Dispute Order
                        </Button>
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
                    if (onUpdate) onUpdate();
                }}
            />

            {/* Add Items Dialog */}
            <AddItemsDialog
                open={addItemsDialogOpen}
                order={order}
                onClose={() => setAddItemsDialogOpen(false)}
                onSuccess={handleAddItemsSuccess}
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
