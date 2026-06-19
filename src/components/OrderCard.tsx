import {
    CheckCircle as CheckIcon,
    Delete as DeleteIcon,
    Event as EventIcon,
    LocalFireDepartment as SpiceIcon,
    LocationOn as LocationOnIcon,
    Payment as PaymentIcon,
    Person as PersonIcon,
    Receipt as ReceiptIcon,
    Restaurant as RestaurantIcon,
    Star as StarIcon,
    AccessTime as TimeIcon,
    Visibility as ViewIcon,
    Cancel as CancelIcon,
    StickyNote2 as NoteIcon,
    Refresh as SyncIcon,
    LocalShipping as DeliveryIcon,
    Phone as PhoneIcon,
    Launch as LaunchIcon,
    MoneyOff as RefundIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
} from '@mui/icons-material';
import {
    alpha,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    Chip,
    CircularProgress,
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
    Tooltip,
    Typography,
    useTheme
} from '@mui/material';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { feedbackAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useActiveTenant } from '../hooks/useActiveTenant';
import { ordersAPI } from '../services/api';
import {
    canAddItems,
    formatTime,
    getAvailableStatuses,
    getOrderTypeLabel,
    getPaymentMethodLabel,
    getStatusColor,
    getStatusLabel,
    getTimeElapsed,
    isGlobalDineIn,
    isOrderActive,
} from '../utils/orderWorkflows';
import { formatSpiceLevelLabel } from '../utils/spiceLevel';
import AddItemsDialog from './AddItemsDialog';
import DeliveryTracker from './DeliveryTracker';
import PaymentCollectionDialog from './PaymentCollectionDialog';

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

interface OrderCardProps {
    order: any;
    onView: (order: any) => void;
    onUpdate: (order: any) => void;
    onPrint: (order: any) => void;
    onAddItem: (order: any) => void;
    canManage?: boolean;
    onRefresh?: () => void;
    onFeedback?: (orderId: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({
    order,
    onView,
    onUpdate,
    onPrint,
    onAddItem,
    canManage = true,
    onRefresh,
    onFeedback,
}) => {
    const { formatCurrency } = useSettings();
    const [addItemsDialogOpen, setAddItemsDialogOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [cancelOrderDialogOpen, setCancelOrderDialogOpen] = useState(false);
    const [cancelNotes, setCancelNotes] = useState('');
    const [itemToDeleteIndex, setItemToDeleteIndex] = useState<number | null>(null);
    const [itemToDeleteDetails, setItemToDeleteDetails] = useState<{ maxQuantity: number, itemName: string } | null>(null);
    const [removeQuantity, setRemoveQuantity] = useState<number>(1);
    const [expanded, setExpanded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [refundDialogOpen, setRefundDialogOpen] = useState(false);
    const [refundTargetIndex, setRefundTargetIndex] = useState<number | null>(null);
    const [refundMethod, setRefundMethod] = useState<'original' | 'cash'>('original');
    const [isRefunding, setIsRefunding] = useState(false);
    // In-house delivery state
    const [inHouseRiders, setInHouseRiders] = useState<any[]>([]);
    const [ridersLoaded, setRidersLoaded] = useState(false);
    const [assigningRider, setAssigningRider] = useState(false);
    const [selectedRider, setSelectedRider] = useState<string>(
        (order.assignedDeliveryUser?._id || order.assignedDeliveryUser || '') as string
    );
    const { user, tenantSlug } = useAuth();
    const isDeliveryBoy = user?.role === 'delivery';

    const canAddMoreItems = canAddItems(order.status, order.orderType, order);
    // Global Dine In orders have already paid - don't show collect payment
    const canCollectPayment = order.orderType === 'dine_in' && order.status === 'served' && !isGlobalDineIn(order);
    const handleAddItemsSuccess = () => {
        setAddItemsDialogOpen(false);
        if (onRefresh) onRefresh();
    };

    const handleNextStatus = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isProcessing) return;

        const availableNextStatuses = getAvailableStatuses(order.status, order.orderType);
        const nextStatus = availableNextStatuses.find((s: string) => s !== 'cancelled');

        if (!nextStatus) return;

        setIsProcessing(true);
        try {
            await ordersAPI.updateStatus(order._id, nextStatus);
            // toast.success(`Order advanced to ${getStatusLabel(nextStatus)}`);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        } finally {
            setIsProcessing(false);
        }
    };

    const nextAvailableStatuses = getAvailableStatuses(order.status, order.orderType);
    const nextStatus = nextAvailableStatuses.find((s: string) => s !== 'cancelled');
    const handlePaymentSuccess = () => {
        setPaymentDialogOpen(false);
        if (onRefresh) onRefresh();
    };

    const handleDeleteItem = (index: number, maxQuantity: number, itemName: string) => {
        setItemToDeleteIndex(index);
        setItemToDeleteDetails({ maxQuantity, itemName });
        setRemoveQuantity(maxQuantity);
        setDeleteConfirmationOpen(true);
    };

    const confirmDelete = async () => {
        if (itemToDeleteIndex === null || isProcessing) return;
        if (itemToDeleteDetails && (removeQuantity < 1 || removeQuantity > itemToDeleteDetails.maxQuantity)) {
            toast.error('Invalid quantity selected');
            return;
        }

        setIsProcessing(true);
        try {
            await ordersAPI.removeItem(order._id, itemToDeleteIndex, removeQuantity);
            toast.success('Item removed');
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error removing item:', error);
            toast.error('Failed to remove item');
        } finally {
            setDeleteConfirmationOpen(false);
            setItemToDeleteIndex(null);
            setItemToDeleteDetails(null);
            setRemoveQuantity(1);
            setIsProcessing(false);
        }
    };

    const handleCancelOrder = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await ordersAPI.updateStatus(order._id, 'cancelled', cancelNotes || 'Cancelled by staff');
            toast.success('Order cancelled successfully');
            if (onRefresh) onRefresh();
            setCancelOrderDialogOpen(false);
        } catch (error) {
            console.error('Error cancelling order:', error);
            toast.error('Failed to cancel order');
        } finally {
            setIsProcessing(false);
        }
    };

    const openRefundDialog = (e: React.MouseEvent, realIndex: number) => {
        e.stopPropagation();
        setRefundTargetIndex(realIndex);
        setRefundMethod('original');
        setRefundDialogOpen(true);
    };

    const handleRefundItem = async () => {
        if (refundTargetIndex === null || isRefunding) return;
        setIsRefunding(true);
        try {
            await ordersAPI.refundItem(order._id, refundTargetIndex, refundMethod);
            toast.success('Refund processed successfully');
            setRefundDialogOpen(false);
            if (onRefresh) onRefresh();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to process refund');
        } finally {
            setIsRefunding(false);
        }
    };

    const theme = useTheme();
    const navigate = useNavigate();
    const { slug, getRelativePath } = useActiveTenant();
    const [hasFeedback, setHasFeedback] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        let mounted = true;
        const checkFeedback = async () => {
            if (!(order.orderType === 'dine_in' && order.status === 'completed')) return;
            try {
                const targetSlug = order?.restaurant?.slug || tenantSlug || slug || '';
                if (!targetSlug) return;
                const res = await feedbackAPI.getOrderForFeedback(targetSlug, order._id);
                if (mounted && res?.data?.hasFeedback) setHasFeedback(true);
            } catch (err) {
                // ignore
            }
        };
        checkFeedback();
        return () => { mounted = false; };
    }, [order._id, order.orderType, order.status, order?.restaurant?.slug, tenantSlug, slug]);
    const getPaymentBadgeColor = (method: string | string[]) => {
        let m = method;
        if (Array.isArray(method)) {
            if (method.length > 1) return theme.palette.secondary.main; // purple for split
            m = method[0];
        }

        switch (m?.toString()?.toLowerCase()) {
            case 'card':
                return theme.palette.info.main;
            case 'cash':
                return theme.palette.success.main;
            case 'upi':
                return theme.palette.primary.main;
            default:
                return theme.palette.grey[600];
        }
    };

    return (
        <Card
            onClick={() => onView(order)}
            sx={{
                width: '100%',
                height: '100%', // Fill grid item height
                display: 'flex', // Flex layout
                flexDirection: 'column', // Column direction
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                },
                background:
                    theme.palette.mode === 'dark'
                        ? 'linear-gradient(145deg, #1e1e1e, #2d2d2d)'
                        : 'linear-gradient(145deg, #ffffff, #f5f5f5)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
        >
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header Section */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography
                            variant="h5"
                            component="div"
                            color="primary.main"
                            sx={{ fontWeight: '800', letterSpacing: 0.5, mb: 0.5 }}
                        >
                            {order.dailyTokenNumber ? `Token No #${order.dailyTokenNumber}` : `Order #${order.orderNumber?.split('-').pop() || order._id.slice(-6)}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                            Order ID: {order.orderNumber?.split('-').pop() || order._id.slice(-6)}
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5, flexWrap: 'nowrap', overflow: 'hidden' }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                {getOrderTypeLabel(order.orderType, order)}
                            </Typography>
                            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
                            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                {getTimeElapsed(order.createdAt)}
                            </Typography>
                            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                <TimeIcon sx={{ fontSize: 12, mr: 0.25 }} />
                                {formatTime(order.createdAt)}
                            </Typography>
                        </Stack>
                        {order.isPreOrder && order.scheduledTime && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, px: 1, py: 0.25, borderRadius: 1, bgcolor: alpha('#7c3aed', 0.07), border: '1px solid rgba(124,58,237,0.2)', width: 'fit-content' }}>
                                <EventIcon sx={{ fontSize: 14, mr: 0.5, color: '#7c3aed' }} />
                                <Typography variant="body2" sx={{ color: '#7c3aed', fontWeight: 600, fontSize: '0.75rem' }}>
                                    Sch: {new Date(order.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {order.isPreOrder && (
                            <Chip
                                icon={<EventIcon sx={{ fontSize: 14 }} />}
                                label="PRE-ORDER"
                                size="small"
                                sx={{
                                    fontWeight: 'bold',
                                    bgcolor: alpha('#7c3aed', 0.12),
                                    color: '#7c3aed',
                                    border: '1px solid rgba(124,58,237,0.3)',
                                }}
                            />
                        )}
                        <Chip
                            label={getStatusLabel(order.status)}
                            color={getStatusColor(order.status) as any}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                        />
                        {order.paymentStatus === 'refunded' && (
                            <Chip
                                label="REFUNDED"
                                color="error"
                                variant="outlined"
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                            />
                        )}
                    </Box>
                </Box>


                {/* Customer & Waiter Info */}
                <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                    {order.customer?.name && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', minWidth: 0 }}>
                            <PersonIcon sx={{ fontSize: 18, mr: 1, mt: '2px', color: 'text.secondary', flexShrink: 0 }} />
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', minWidth: 0 }}>
                                    <strong>Customer:</strong>
                                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                        {/^[0-9a-fA-F]{8,24}$/.test(order.customer.name) ? 'Guest' : order.customer.name}
                                    </Box>
                                </Typography>
                                {order.customer?.phone && (
                                    <Typography variant="body2" sx={{
                                        color: 'text.secondary',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem',
                                        '@media print': { display: 'none' }
                                    }}>
                                        Ph: {order.customer.phone}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    )}
                    {order.waiter?.name && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PersonIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                                <strong>Waiter:</strong> {order.waiter.name}
                            </Typography>
                        </Box>
                    )}
                    {order.notes && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 0.5 }}>
                            <NoteIcon fontSize="small" sx={{ mr: 1, color: 'warning.main', mt: 0.3 }} />
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                <strong>Notes:</strong> {order.notes}
                            </Typography>
                        </Box>
                    )}
                    {/* Delivery Address Display */}
                    {['delivery', 'online'].includes(order.orderType) && (
                        (() => {
                            const dLoc = order.delivery?.location || order.deliveryAddress;
                            const lat = dLoc?.lat || dLoc?.latitude;
                            const lng = dLoc?.lng || dLoc?.longitude;
                            const addr = order.delivery?.address || order.deliveryAddress?.formattedAddress || (typeof order.deliveryAddress === 'string' ? order.deliveryAddress : '');

                            if (!addr && !lat) return null;

                            return (
                                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                    <LocationOnIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary', mt: 0.3 }} />
                                    <Box>
                                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                            <strong>Address:</strong> {addr || 'Location Pin'}
                                        </Typography>
                                        {lat && lng && (
                                            <Button
                                                size="small"
                                                startIcon={<LocationOnIcon />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                                                    window.open(url, '_blank');
                                                }}
                                                sx={{ mt: 0.5, fontSize: '0.7rem', p: 0.5, minWidth: 'auto' }}
                                            >
                                                View on Map
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            );
                        })()
                    )}
                </Stack>

                {/* Dasher Information Container */}
                {['delivery', 'online'].includes(order.orderType) && (order.driverName || order.driverPhone || order.dasherPickupPhone || order.dasherDropoffPhone || order.trackingUrl) && (
                    <Box sx={{ mb: 2, p: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.main, 0.08), border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                        <Typography variant="caption" color="info.main" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', mb: 1 }}>
                            <DeliveryIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            Dasher Details
                        </Typography>
                        <Stack spacing={0.5}>
                            {order.driverName && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <PersonIcon sx={{ fontSize: 14, mr: 1, color: 'text.secondary' }} />
                                    <Typography variant="body2">{order.driverName}</Typography>
                                </Box>
                            )}
                            {order.driverPhone && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <PhoneIcon sx={{ fontSize: 14, mr: 1, color: 'text.secondary' }} />
                                    <Typography variant="body2">
                                        <a href={`tel:${order.driverPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{order.driverPhone} (Primary)</a>
                                    </Typography>
                                </Box>
                            )}
                            {order.dasherPickupPhone && order.dasherPickupPhone !== order.driverPhone && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <PhoneIcon sx={{ fontSize: 14, mr: 1, color: 'text.secondary' }} />
                                    <Typography variant="body2">
                                        <a href={`tel:${order.dasherPickupPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{order.dasherPickupPhone} (Pickup)</a>
                                    </Typography>
                                </Box>
                            )}
                            {order.dasherDropoffPhone && order.dasherDropoffPhone !== order.driverPhone && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <PhoneIcon sx={{ fontSize: 14, mr: 1, color: 'text.secondary' }} />
                                    <Typography variant="body2">
                                        <a href={`tel:${order.dasherDropoffPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{order.dasherDropoffPhone} (Dropoff)</a>
                                    </Typography>
                                </Box>
                            )}
                            {order.trackingUrl && (
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                    <LaunchIcon sx={{ fontSize: 14, mr: 1, color: 'info.main' }} />
                                    <Button
                                        size="small"
                                        href={order.trackingUrl}
                                        target="_blank"
                                        onClick={(e) => e.stopPropagation()}
                                        sx={{ padding: 0, minWidth: 'auto', fontSize: '0.8rem', textTransform: 'none' }}
                                    >
                                        Track Delivery
                                    </Button>
                                </Box>
                            )}
                            {order.handoffQr && (
                                <Box sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px dashed #ccc', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <QRCodeSVG value={order.handoffQr} size={48} />
                                    <Box>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>Pickup Code</Typography>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{order.handoffQr}</Typography>
                                    </Box>
                                </Box>
                            )}
                        </Stack>
                    </Box>
                )}

                {/* Delivery Tracker for Delivery Boys */}
                {isDeliveryBoy && order.status === 'on_the_way' && (
                    <Box sx={{ mt: 2 }}>
                        <DeliveryTracker
                            orderId={order._id}
                            customerPosition={getCustomerCoordinates(order)}
                            customerAddress={getCustomerAddress(order)}
                        />
                    </Box>
                )}

                <Divider sx={{ my: 1 }} />

                {/* Order Items */}
                <Box sx={{ mb: 1 }}>
                    {(() => {
                        const allItems: any[] = order.items || [];
                        const activeItems = allItems.map((item: any, i: number) => ({ item, realIndex: i })).filter(({ item }) => item.preparationStatus !== 'cancelled');
                        const cancelledItems = allItems.map((item: any, i: number) => ({ item, realIndex: i })).filter(({ item }) => item.preparationStatus === 'cancelled');
                        const visibleActive = expanded ? activeItems : activeItems.slice(0, 3);
                        const hiddenCount = activeItems.length - 3;
                        const canRefund = order.paymentStatus === 'paid' && order.paymentIntentId;
                        return (
                            <>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', mb: 0.5, display: 'block' }}>
                                    Items ({activeItems.length}{cancelledItems.length > 0 ? ` + ${cancelledItems.length} cancelled` : ''})
                                </Typography>
                                <Stack spacing={0.5} sx={{ maxHeight: expanded ? 300 : 120, overflowY: 'auto', mb: 0.5, transition: 'max-height 0.3s' }}>
                                    {visibleActive.map(({ item, realIndex }) => (
                                        <Box
                                            key={realIndex}
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                p: 0,
                                                mb: 0
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 0.5,
                                                    color: 'text.primary',
                                                    minWidth: 0,
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {item.quantity}x {item.name || item.menuItem?.name || 'Unknown Item'}
                                                    </Typography>
                                                    {item.preparationStatus === 'ready' && (
                                                        <Tooltip title="Ready to Serve" arrow>
                                                            <CheckIcon
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

                                                {item.spiceLevel ? (
                                                    <Chip
                                                        icon={<SpiceIcon sx={{ fontSize: 14 }} />}
                                                        label={`Spice: ${formatSpiceLevelLabel(item.spiceLevel)}`}
                                                        size="small"
                                                        sx={{
                                                            alignSelf: 'flex-start',
                                                            ml: 2,
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

                                                {item.modifiers && item.modifiers.length > 0 && (
                                                    <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 2 }}>
                                                        + {item.modifiers.map((m: any) => m.name).join(', ')}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight="medium"
                                                    sx={{
                                                        mr: 1,
                                                        color: 'text.primary',
                                                    }}
                                                >
                                                    {formatCurrency(item.total || item.price * item.quantity)}
                                                </Typography>
                                                {['pending', 'confirmed'].includes(order.status) && order.orderType === 'dine_in' && item.preparationStatus !== 'ready' && (
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteItem(realIndex, item.quantity, item.name || item.menuItem?.name || 'Unknown Item');
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        </Box>
                                    ))}
                                    {!expanded && hiddenCount > 0 && (
                                        <Typography
                                            variant="caption"
                                            color="primary"
                                            sx={{ fontStyle: 'italic', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                                        >
                                            +{hiddenCount} more items
                                        </Typography>
                                    )}
                                    {expanded && activeItems.length > 3 && (
                                        <Typography
                                            variant="caption"
                                            color="primary"
                                            sx={{ fontStyle: 'italic', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                            onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                                        >
                                            Show less
                                        </Typography>
                                    )}
                                </Stack>

                                {/* Cancelled Items */}
                                {cancelledItems.length > 0 && (
                                    <Box sx={{ mt: 1, pt: 1, borderTop: `1px dashed ${alpha(theme.palette.error.main, 0.3)}` }}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'error.main', display: 'block', mb: 0.5 }}>
                                            Cancelled Items
                                        </Typography>
                                        <Stack spacing={0.5}>
                                            {cancelledItems.map(({ item, realIndex }) => (
                                                <Box key={realIndex} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ textDecoration: 'line-through', color: 'text.disabled', flex: 1 }}
                                                    >
                                                        {item.quantity}x {item.name || item.menuItem?.name || 'Unknown Item'}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>
                                                            {formatCurrency(item.total || item.price * item.quantity)}
                                                        </Typography>
                                                        {canManage && (
                                                            <Tooltip title={canRefund ? 'Process Refund' : 'Mark as refunded (cash)'}>
                                                                <IconButton
                                                                    size="small"
                                                                    color="warning"
                                                                    onClick={(e) => openRefundDialog(e, realIndex)}
                                                                    sx={{ padding: '2px' }}
                                                                >
                                                                    <RefundIcon sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}
                            </>
                        );
                    })()}
                </Box>

                <Divider sx={{ mt: 'auto', mb: 1 }} />

                {/* Payment & Total Section */}
                <Box
                    sx={{
                        p: 1,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        borderRadius: 1,
                    }}
                >
                    <Stack spacing={0.5}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">
                                Subtotal:
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                                {formatCurrency(order.subtotal)}
                            </Typography>
                        </Box>
                        {order.tax?.amount > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Tax:
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                    {formatCurrency(order.tax.amount)}
                                </Typography>
                            </Box>
                        )}
                        {order.processingFee > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Processing Fee:
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                    {formatCurrency(order.processingFee)}
                                </Typography>
                            </Box>
                        )}
                        {order.serviceCharge?.amount > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Service Charge ({order.serviceCharge.rate}%):
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                    {formatCurrency(order.serviceCharge.amount)}
                                </Typography>
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
                                <Typography variant="body2" color="text.secondary">
                                    Delivery Charge:
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                    {formatCurrency(order.deliveryCharge)}
                                </Typography>
                            </Box>
                        )}
                        {order.tip > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Tip:
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                    {formatCurrency(order.tip)}
                                </Typography>
                            </Box>
                        )}
                        <Divider sx={{ my: 0.5 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1" fontWeight="bold">
                                Total:
                            </Typography>
                            <Typography variant="h6" fontWeight="bold" color="primary.main">
                                {formatCurrency(order.totalAmount)}
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                {/* Payment Method */}
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PaymentIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                            Payment:
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip
                            label={order.paymentStatus === 'pending' ? 'PENDING' : getPaymentMethodLabel(order.payments && order.payments.length > 0 ? order.payments.map((p: any) => p.method) : order.paymentMethod)}
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: alpha(order.paymentStatus === 'pending' ? theme.palette.warning.main : getPaymentBadgeColor(order.payments && order.payments.length > 0 ? order.payments[0].method : order.paymentMethod), 0.1),
                                color: order.paymentStatus === 'pending' ? theme.palette.warning.main : getPaymentBadgeColor(order.payments && order.payments.length > 0 ? order.payments[0].method : order.paymentMethod),
                                fontWeight: 'bold',
                            }}
                        />
                        {order.paymentMethod === 'card' && order.cardType && (
                            <Chip
                                label={order.cardType === 'debit' ? 'DEBIT' : 'CREDIT'}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    bgcolor: alpha(theme.palette.info.main, 0.12),
                                    color: theme.palette.info.main,
                                    fontWeight: 'bold',
                                }}
                            />
                        )}
                        {order.paymentStatus === 'paid' && (
                            <Chip
                                label="PAID"
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    bgcolor: alpha(theme.palette.success.main, 0.12),
                                    color: theme.palette.success.main,
                                    fontWeight: 'bold',
                                }}
                            />
                        )}
                    </Stack>
                </Box>
            </CardContent>

            <CardActions sx={{ p: 1, pt: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha(theme.palette.background.default, 0.5), gap: 0.5 }}>
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title="View Details">
                        <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); onView(order); }} sx={{ padding: '4px' }}>
                            <ViewIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Print Bill">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onPrint(order); }} sx={{ padding: '4px' }}>
                            <ReceiptIcon />
                        </IconButton>
                    </Tooltip>

                    {canManage && isOrderActive(order.status) && (
                        <Tooltip title="Cancel Order">
                            <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCancelOrderDialogOpen(true);
                                }}
                                sx={{ padding: '4px' }}
                            >
                                <CancelIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                    {(order.orderType === 'dine_in' && order.status === 'completed') && (
                        <Tooltip title={hasFeedback ? 'Feedback submitted' : 'Give feedback'}>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    aria-label="Give rating"
                                    disabled={hasFeedback}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const targetSlug = order?.restaurant?.slug || slug || '';
                                        const url = `${window.location.origin}${getRelativePath(`/feedback/${order._id}`)}`;
                                        try {
                                            window.open(url, '_blank', 'noopener');
                                        } catch (err) {
                                            console.error('Failed to open feedback url', err);
                                            if (onFeedback) {
                                                onFeedback(order._id);
                                            } else {
                                                window.location.href = url;
                                            }
                                        }

                                        // Poll for feedback submission for a short period
                                        (async () => {
                                            const attempts = 10;
                                            const delayMs = 2000;
                                            for (let i = 0; i < attempts; i++) {
                                                await new Promise(res => setTimeout(res, delayMs));
                                                try {
                                                    const res = await feedbackAPI.getOrderForFeedback(targetSlug, order._id);
                                                    if (res?.data?.hasFeedback) {
                                                        if (mountedRef.current) setHasFeedback(true);
                                                        break;
                                                    }
                                                } catch (pollErr) {
                                                    // ignore and retry
                                                }
                                            }
                                        })();
                                    }}
                                    sx={{ textTransform: 'none', fontSize: '0.75rem', padding: '4px 8px', minWidth: '48px' }}
                                >
                                     {hasFeedback ? 'Rated' : 'Rating'}
                                </Button>
                            </span>
                        </Tooltip>
                    )}
                    {order.doordashDeliveryId && isOrderActive(order.status) && order.status !== 'delivered' && (
                        <Tooltip title="Sync DoorDash Status">
                            <IconButton
                                size="small"
                                color="secondary"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    setIsProcessing(true);
                                    try {
                                        await ordersAPI.syncDoordashStatus(order._id);
                                        toast.success('Sync complete');
                                        if (onRefresh) onRefresh();
                                    } catch (error) {
                                        toast.error('Sync failed');
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                disabled={isProcessing}
                                sx={{ padding: '4px' }}
                            >
                                <SyncIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                    {order.uberEatsDeliveryId && isOrderActive(order.status) && order.status !== 'delivered' && (
                        <Tooltip title="Sync Uber Eats Status">
                            <IconButton
                                size="small"
                                color="info"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    setIsProcessing(true);
                                    try {
                                        await ordersAPI.syncUberEatsStatus(order._id);
                                        toast.success('Sync complete');
                                        if (onRefresh) onRefresh();
                                    } catch (error) {
                                        toast.error('Sync failed');
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                disabled={isProcessing}
                                sx={{ padding: '4px' }}
                            >
                                <SyncIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>

                {/* ── In-House Delivery Banner ── */}
                {order.inHouseDelivery && order.delivery?.provider === 'in_house' && canManage && (
                    <Box
                        sx={{
                            mt: 1,
                            p: 1.5,
                            borderRadius: 2,
                            width: '100%',
                            background: (theme) =>
                                `linear-gradient(135deg, ${alpha(theme.palette.warning.light, 0.18)} 0%, ${alpha(theme.palette.warning.main, 0.08)} 100%)`,
                            border: (theme) => `1.5px solid ${alpha(theme.palette.warning.main, 0.45)}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <DeliveryIcon sx={{ fontSize: 17, color: 'warning.dark' }} />
                            <Typography variant="caption" fontWeight={800} color="warning.dark" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                In-House Delivery
                            </Typography>
                            <Chip
                                label={order.delivery?.status === 'assigned' ? 'Assigned' : 'Pending Assignment'}
                                size="small"
                                sx={{
                                    ml: 'auto',
                                    height: 18,
                                    fontSize: '0.64rem',
                                    fontWeight: 700,
                                    bgcolor: order.delivery?.status === 'assigned' ? alpha('#10b981', 0.15) : alpha('#f59e0b', 0.15),
                                    color: order.delivery?.status === 'assigned' ? '#059669' : '#b45309',
                                }}
                            />
                        </Box>
                        {order.delivery?.status === 'assigned' && order.assignedDeliveryUser && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                    Assigned to:{' '}
                                    <strong>
                                        {typeof order.assignedDeliveryUser === 'object'
                                            ? `${order.assignedDeliveryUser.firstName || ''} ${order.assignedDeliveryUser.lastName || ''}`.trim()
                                            : 'Rider'}
                                    </strong>
                                </Typography>
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                                <InputLabel id={`rider-label-${order._id}`} sx={{ fontSize: '0.75rem' }}>Select Rider</InputLabel>
                                <Select
                                    labelId={`rider-label-${order._id}`}
                                    label="Select Rider"
                                    value={selectedRider}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setSelectedRider(e.target.value as string)}
                                    onOpen={async () => {
                                        if (!ridersLoaded) {
                                            try {
                                                const res = await ordersAPI.getDeliveryStaff();
                                                setInHouseRiders(res.data || []);
                                                setRidersLoaded(true);
                                            } catch {
                                                toast.error('Could not load delivery staff');
                                            }
                                        }
                                    }}
                                    sx={{ fontSize: '0.8rem', height: 34 }}
                                    disabled={assigningRider}
                                >
                                    {inHouseRiders.length === 0 && !ridersLoaded && (
                                        <MenuItem value="" disabled>Loading...</MenuItem>
                                    )}
                                    {inHouseRiders.length === 0 && ridersLoaded && (
                                        <MenuItem value="" disabled>No riders available</MenuItem>
                                    )}
                                    {inHouseRiders.map((r: any) => (
                                        <MenuItem key={r._id} value={r._id}>
                                            {r.firstName} {r.lastName}
                                            {r.phone ? ` · ${r.phone}` : ''}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                size="small"
                                disabled={!selectedRider || assigningRider}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!selectedRider) return;
                                    setAssigningRider(true);
                                    try {
                                        await ordersAPI.assignDeliveryUser(order._id, selectedRider);
                                        toast.success('Rider assigned!');
                                        if (onRefresh) onRefresh();
                                    } catch (err: any) {
                                        toast.error(err?.response?.data?.message || 'Failed to assign rider');
                                    } finally {
                                        setAssigningRider(false);
                                    }
                                }}
                                sx={{
                                    fontSize: '0.7rem',
                                    height: 34,
                                    px: 1.5,
                                    whiteSpace: 'nowrap',
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    color: '#fff',
                                    '&:hover': { background: 'linear-gradient(135deg, #d97706, #b45309)' },
                                    '&:disabled': { opacity: 0.5 },
                                    boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                }}
                            >
                                {assigningRider ? <CircularProgress size={14} color="inherit" /> : 'Assign'}
                            </Button>
                        </Box>
                    </Box>
                )}

                <Stack direction="row" spacing={0.5} alignItems="center">
                    {canManage && nextStatus && (isDeliveryBoy ? ['ready_to_pickup', 'on_the_way', 'ready_to_pick'].includes(order.status) : true) && (
                        // Hide "Next: Completed" for Dine In as it's typically handled via payment collection
                        (order.orderType === 'dine_in' && nextStatus === 'completed' && !isGlobalDineIn(order)) ? null : (
                            // Disable "On the Way" and "Delivered" for third-party delivery (DoorDash/Uber Eats)
                            (() => {
                                const isThirdPartyDelivery = !!(order.doordashDeliveryId || order.uberEatsDeliveryId);
                                const isBlockedStatus = nextStatus === 'on_the_way' || nextStatus === 'delivered';
                                if (isThirdPartyDelivery && isBlockedStatus) {
                                    return (
                                        <Tooltip title="Status is managed by the delivery partner">
                                            <span>
                                                <Button
                                                    variant="contained"
                                                    color="info"
                                                    size="small"
                                                    disabled
                                                    sx={{
                                                        fontSize: '0.65rem',
                                                        padding: '4px 8px',
                                                        textTransform: 'none',
                                                        fontWeight: 'bold',
                                                        minWidth: 'auto',
                                                        height: '28px'
                                                    }}
                                                >
                                                    {`Next: ${getStatusLabel(nextStatus)}`}
                                                </Button>
                                            </span>
                                        </Tooltip>
                                    );
                                }
                                return (
                                    <Button
                                        variant="contained"
                                        color="info"
                                        size="small"
                                        onClick={handleNextStatus}
                                        disabled={isProcessing}
                                        sx={{
                                            fontSize: '0.65rem',
                                            padding: '4px 8px',
                                            textTransform: 'none',
                                            fontWeight: 'bold',
                                            minWidth: 'auto',
                                            height: '28px'
                                        }}
                                    >
                                        {isProcessing ? 'Processing...' : `Next: ${getStatusLabel(nextStatus)}`}
                                    </Button>
                                );
                            })()
                        )
                    )}
                    {canAddMoreItems && (
                        <Button
                            onClick={(e) => { e.stopPropagation(); setAddItemsDialogOpen(true); }}
                            variant="outlined"
                            color="primary"
                            size="small"
                            sx={{ fontSize: '0.65rem', padding: '4px 8px', height: '28px' }}
                        >
                            Add Items
                        </Button>
                    )}
                    {canCollectPayment && (
                        <Button
                            onClick={(e) => { e.stopPropagation(); setPaymentDialogOpen(true); }}
                            variant="contained"
                            color="success"
                            size="small"
                            sx={{ fontSize: '0.65rem', padding: '4px 8px' }}
                        >
                            Collect Payment
                        </Button>
                    )}
                </Stack>

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
            </CardActions>

            <Dialog
                open={deleteConfirmationOpen}
                onClose={() => setDeleteConfirmationOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        width: '100%',
                        maxWidth: 360,
                        p: 1
                    }
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 3, px: 2, pb: 2 }}>
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                            color: 'error.main'
                        }}
                    >
                        <DeleteIcon sx={{ fontSize: 32 }} />
                    </Box>
                    <Typography variant="h6" fontWeight="800" align="center" gutterBottom>
                        Delete Item?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3, px: 2 }}>
                        Are you sure you want to remove <strong>{itemToDeleteDetails?.itemName || (itemToDeleteIndex !== null && order.items[itemToDeleteIndex] ? (order.items[itemToDeleteIndex].name || order.items[itemToDeleteIndex].menuItem?.name || 'this item') : 'this item')}</strong>? This action cannot be undone.
                    </Typography>
                    {itemToDeleteDetails && itemToDeleteDetails.maxQuantity > 1 && (
                        <Box sx={{ width: '100%', mb: 3, px: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, textAlign: 'center' }}>
                                Select Quantity to Remove
                            </Typography>
                            <Stack direction="row" alignItems="center" justifyContent="center" spacing={3} sx={{ mb: 2 }}>
                                <IconButton 
                                    onClick={() => setRemoveQuantity(q => Math.max(1, q - 1))}
                                    disabled={removeQuantity <= 1}
                                    sx={{ 
                                        border: '1.5px solid', 
                                        borderColor: 'divider',
                                        bgcolor: 'background.paper',
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                >
                                    <RemoveIcon />
                                </IconButton>
                                
                                <Box sx={{ minWidth: 60, textAlign: 'center' }}>
                                    <Typography variant="h4" fontWeight="800" color="primary.main">
                                        {removeQuantity}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        of {itemToDeleteDetails.maxQuantity} max
                                    </Typography>
                                </Box>

                                <IconButton 
                                    onClick={() => setRemoveQuantity(q => Math.min(itemToDeleteDetails.maxQuantity, q + 1))}
                                    disabled={removeQuantity >= itemToDeleteDetails.maxQuantity}
                                    sx={{ 
                                        border: '1.5px solid', 
                                        borderColor: 'divider',
                                        bgcolor: 'background.paper',
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                >
                                    <AddIcon />
                                </IconButton>
                            </Stack>

                            <Stack direction="row" spacing={1} justifyContent="center">
                                <Button 
                                    size="small" 
                                    variant="outlined" 
                                    onClick={() => setRemoveQuantity(1)}
                                    sx={{ borderRadius: 4, textTransform: 'none', fontWeight: 600 }}
                                >
                                    Remove 1
                                </Button>
                                <Button 
                                    size="small" 
                                    variant="outlined" 
                                    color="error"
                                    onClick={() => setRemoveQuantity(itemToDeleteDetails.maxQuantity)}
                                    sx={{ borderRadius: 4, textTransform: 'none', fontWeight: 600 }}
                                >
                                    Remove All ({itemToDeleteDetails.maxQuantity})
                                </Button>
                            </Stack>
                        </Box>
                    )}
                    <Stack direction="row" spacing={2} width="100%">
                        <Button
                            onClick={() => setDeleteConfirmationOpen(false)}
                            variant="text"
                            color="inherit"
                            fullWidth
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmDelete}
                            variant="contained"
                            color="error"
                            fullWidth
                            disableElevation
                            disabled={isProcessing}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                boxShadow: '0 8px 16px -4px rgba(211, 47, 47, 0.3)'
                            }}
                        >
                            {isProcessing ? 'Deleting...' : 'Yes, Delete'}
                        </Button>
                    </Stack>
                </Box>
            </Dialog>

            {/* Cancel Order Confirmation Dialog */}
            <Dialog
                open={cancelOrderDialogOpen}
                onClose={() => !isProcessing && setCancelOrderDialogOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        width: '100%',
                        maxWidth: 400,
                        p: 1
                    }
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 3, px: 2, pb: 2 }}>
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                            color: 'error.main'
                        }}
                    >
                        <CancelIcon sx={{ fontSize: 32 }} />
                    </Box>
                    <Typography variant="h6" fontWeight="800" align="center" gutterBottom>
                        Cancel Order?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2, px: 2 }}>
                        Are you sure you want to cancel <strong>Order #{order.orderNumber?.split('-').pop() || order._id.slice(-6)}</strong>?
                    </Typography>

                    {order.paymentStatus === 'paid' && (
                        <Box sx={{
                            bgcolor: alpha(theme.palette.warning.main, 0.1),
                            p: 1.5,
                            borderRadius: 2,
                            mb: 2,
                            width: '100%',
                            border: `1px dashed ${theme.palette.warning.main}`
                        }}>
                            <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 'bold', display: 'block', textAlign: 'center' }}>
                                ⚠️ This order has been PAID. An automatic refund via Stripe will be initiated.
                            </Typography>
                        </Box>
                    )}

                    <TextField
                        fullWidth
                        label="Reason for cancellation"
                        multiline
                        rows={2}
                        value={cancelNotes}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCancelNotes(e.target.value)}
                        placeholder="e.g., Customer requested, Out of stock..."
                        size="small"
                        sx={{ mb: 3 }}
                    />

                    <Stack direction="row" spacing={2} width="100%">
                        <Button
                            onClick={() => setCancelOrderDialogOpen(false)}
                            variant="text"
                            color="inherit"
                            fullWidth
                            disabled={isProcessing}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
                        >
                            Back
                        </Button>
                        <Button
                            onClick={handleCancelOrder}
                            variant="contained"
                            color="error"
                            fullWidth
                            disableElevation
                            disabled={isProcessing}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                boxShadow: '0 8px 16px -4px rgba(211, 47, 47, 0.3)'
                            }}
                        >
                            {isProcessing ? 'Cancelling...' : 'Confirm Cancellation'}
                        </Button>
                    </Stack>
                </Box>
            </Dialog>

            {/* Refund Item Dialog */}
            <Dialog
                open={refundDialogOpen}
                onClose={() => !isRefunding && setRefundDialogOpen(false)}
                onClick={(e) => e.stopPropagation()}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ pb: 1 }}>Process Refund</DialogTitle>
                <DialogContent>
                    {refundTargetIndex !== null && order.items?.[refundTargetIndex] && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Item: <strong>{order.items[refundTargetIndex].name || order.items[refundTargetIndex].menuItem?.name}</strong>
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Amount: <strong>{formatCurrency(order.items[refundTargetIndex].total || order.items[refundTargetIndex].price * order.items[refundTargetIndex].quantity)}</strong> (+ proportional tax)
                            </Typography>
                            <FormControl fullWidth size="small">
                                <InputLabel>Refund Method</InputLabel>
                                <Select
                                    value={refundMethod}
                                    label="Refund Method"
                                    onChange={(e) => setRefundMethod(e.target.value as 'original' | 'cash')}
                                >
                                    <MenuItem value="original" disabled={!order.paymentIntentId}>
                                        Original Payment {!order.paymentIntentId ? '(no card payment)' : ''}
                                    </MenuItem>
                                    <MenuItem value="cash">Cash</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setRefundDialogOpen(false)} disabled={isRefunding} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRefundItem}
                        variant="contained"
                        color="warning"
                        disabled={isRefunding}
                        startIcon={isRefunding ? <CircularProgress size={16} color="inherit" /> : <RefundIcon />}
                    >
                        {isRefunding ? 'Processing...' : 'Confirm Refund'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>

    );
};

export default OrderCard;
