import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    IconButton,
    useTheme,
    useMediaQuery,
    Chip,
    Divider,
    Stack,
} from '@mui/material';
import {
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    LocalDining as PreparingIcon,
    Restaurant as ReadyIcon,
    DeliveryDining as DeliveryIcon,
    TwoWheeler as BikeIcon,
    DoneAll as CompletedIcon,
    Cancel as CancelIcon,
    AccessTime as TimeIcon,
    LocationOn as LocationIcon,
    Phone as PhoneIcon,
} from '@mui/icons-material';
import { formatDateTime } from '../utils/orderWorkflows';
import { useSettings } from '../context/SettingsContext';
import { ordersAPI } from '../services/api';
import MapComponent from './MapComponent';
import { useNotifications } from '../context/NotificationProvider';

// Helper icons
const AccessTimeIcon = () => <TimeIcon fontSize="small" />;
const LocalDiningIcon = () => <PreparingIcon fontSize="small" />;

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

interface OrderTrackingDialogProps {
    open: boolean;
    order: any | null;
    onClose: () => void;
}

const OrderTrackingDialog: React.FC<OrderTrackingDialogProps> = ({ open, order: initialOrder, onClose }) => {
    const { formatCurrency } = useSettings();
    const { deliveryLocations } = useNotifications();
    interface StepInfo {
        label: string;
        icon: React.ReactNode;
        description: string;
        error?: boolean;
    }

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
    const [order, setOrder] = React.useState(initialOrder);
    const [routeInfo, setRouteInfo] = React.useState<{ distance: string; duration: string } | null>(null);

    // Sync with prop changes
    React.useEffect(() => {
        setOrder(initialOrder);
    }, [initialOrder]);

    // Poll for status updates
    React.useEffect(() => {
        if (!open || !order || ['delivered', 'completed', 'cancelled'].includes(order.status)) return;
        const intervalId = setInterval(async () => {
            try {
                const response = await ordersAPI.getOne(order._id);
                if (response.data && response.data.status !== order.status) {
                    setOrder(response.data);
                }
            } catch (error) {
                console.error('Failed to poll order status', error);
            }
        }, 15000);
        return () => clearInterval(intervalId);
    }, [open, order?._id, order?.status]);

    if (!order) return null;

    // Build steps based on order type and status
    const getSteps = (): StepInfo[] => {
        const isDelivery = order.orderType === 'delivery';

        if (order.status === 'cancelled') {
            return [
                { label: 'Order Placed', icon: <AccessTimeIcon />, description: formatDateTime(order.createdAt) },
                { label: 'Cancelled', icon: <CancelIcon color="error" />, description: 'This order has been cancelled', error: true },
            ];
        }

        const steps: StepInfo[] = [
            { label: 'Order Placed', icon: <AccessTimeIcon />, description: 'We have received your order.' },
            { label: 'Confirmed', icon: <CheckCircleIcon />, description: 'Restaurant has confirmed your order.' },
            { label: 'Preparing', icon: <PreparingIcon />, description: 'Your food is being prepared.' },
            { label: 'Ready', icon: <ReadyIcon />, description: isDelivery ? 'Order is ready for takeaway.' : 'Order is ready to be served.' },
        ];

        if (isDelivery) {
            steps.push({ label: 'On the Way', icon: <BikeIcon />, description: 'Driver is on the way.' });
            steps.push({ label: 'Delivered', icon: <CompletedIcon />, description: 'Enjoy your meal!' });
        } else {
            steps.push({ label: 'Served', icon: <ReadyIcon />, description: 'Food has been served.' });
            steps.push({ label: 'Completed', icon: <CompletedIcon />, description: 'Payment received. Thank you!' });
        }

        return steps;
    };

    const steps = getSteps();

    // Determine active step index
    const getActiveStep = (): number => {
        if (order.status === 'cancelled') return 1;
        const statusMap: Record<string, number> = {
            pending: 0,
            confirmed: 1,
            preparing: 2,
            ready: 3,
            ready_to_pickup: 3,
            on_the_way: 4,
            delivered: 5,
            served: 4,
            completed: 5,
        };
        let activeIndex = statusMap[order.status] ?? 0;
        if (order.orderType !== 'delivery') {
            if (order.status === 'served') activeIndex = 4;
            if (order.status === 'completed') activeIndex = 5;
        }
        return activeIndex;
    };

    const activeStep = getActiveStep();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <BikeIcon sx={{ fontSize: 32 }} />
                    <Box>
                        <Typography variant="h6">Track Order</Typography>
                        <Typography variant="caption">#{order.orderNumber || order._id.slice(-6)}</Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                {/* Estimated Time & Status Banner */}
                <Box sx={{ p: 3, bgcolor: 'background.default', textAlign: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        ESTIMATED ARRIVAL
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
                        {order.estimatedDeliveryTime ? formatDateTime(order.estimatedDeliveryTime) : '30-45 mins'}
                    </Typography>
                    {order.orderType === 'delivery' && order.deliveryAddress && (
                        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <LocationIcon color="action" fontSize="small" />
                            <Typography variant="body2">
                                {order.deliveryAddress.street || order.deliveryAddress.fullAddress}, {order.deliveryAddress.city}
                            </Typography>
                        </Box>
                    )}

                    {/* Live Tracking Map */}
                    {order.orderType === 'delivery' && ['on_the_way', 'out_for_delivery'].includes(order.status) && (
                        <Box sx={{ mt: 3, px: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2" color="primary" sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                                    <Box sx={{ width: 8, height: 8, bgcolor: 'error.main', borderRadius: '50%', mr: 1, animation: 'pulse 1.5s infinite' }} />
                                    LIVE TRACKING ACTIVE
                                </Typography>
                                {(() => {
                                    if (routeInfo) {
                                        return (
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
                                        );
                                    }
                                    return null;
                                })()}
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
                </Box>
                <Divider />

                {/* Stepper */}
                <Box sx={{ p: 3 }}>
                    <Stepper activeStep={activeStep} orientation="vertical">
                        {steps.map((step, index) => (
                            <Step key={step.label} expanded>
                                <StepLabel
                                    StepIconComponent={() => (
                                        <Box
                                            sx={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: '50%',
                                                bgcolor: index <= activeStep ? (step.error ? 'error.main' : 'primary.main') : 'grey.300',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                zIndex: 1,
                                            }}
                                        >
                                            {step.icon}
                                        </Box>
                                    )}
                                >
                                    <Typography variant="subtitle1" fontWeight={index === activeStep ? 'bold' : 'normal'}>
                                        {step.label}
                                    </Typography>
                                </StepLabel>
                                <StepContent>
                                    <Typography variant="body2" color="text.secondary">
                                        {step.description}
                                    </Typography>
                                </StepContent>
                            </Step>
                        ))}
                    </Stepper>
                </Box>
                <Divider />

                {/* Driver Info (if delivery) */}
                {order.orderType === 'delivery' && (order.driver || order.trackingUrl) && (
                    <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Delivery Partner
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main' }}>
                                <BikeIcon />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight="bold">
                                    {order.driver?.name || 'DoorDash Delivery'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {order.status === 'delivered' ? 'Delivered' : 'On the way'}
                                </Typography>
                            </Box>
                            {order.driver?.phone && (
                                <IconButton color="primary" href={`tel:${order.driver.phone}`}>
                                    <PhoneIcon />
                                </IconButton>
                            )}
                            {order.trackingUrl && (
                                <Button 
                                    variant="contained" 
                                    size="small" 
                                    href={order.trackingUrl} 
                                    target="_blank"
                                    startIcon={<DeliveryIcon />}
                                    sx={{ borderRadius: '20px', textTransform: 'none' }}
                                >
                                    Track Live
                                </Button>
                            )}
                        </Stack>
                    </Box>
                )}

                {/* Items List */}
                <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                    <Typography variant="subtitle2" gutterBottom fontWeight="bold">Ordered Items</Typography>
                    <Stack spacing={1.5}>
                        {order.items?.map((item: any, index: number) => (
                            <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="body2" fontWeight="500">{item.name} x {item.quantity}</Typography>
                                    {item.spiceLevel && (
                                        <Chip
                                            label={`Spice: ${item.spiceLevel}`}
                                            size="small"
                                            color="warning"
                                            variant="outlined"
                                            sx={{ mt: 0.5, height: 20, fontSize: '0.65rem', fontWeight: 'bold' }}
                                        />
                                    )}
                                    {item.customizations?.length > 0 && (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {item.customizations.map((c: any) => c.name).join(', ')}
                                        </Typography>
                                    )}
                                </Box>
                                <Typography variant="body2" fontWeight="600">{formatCurrency(item.itemTotal || (item.price * item.quantity))}</Typography>
                            </Box>
                        ))}
                    </Stack>
                </Box>
                <Divider />

                {/* Order Summary */}
                <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                        <Typography variant="body2">
                            {formatCurrency(order.subtotal || order.totalAmount)}
                        </Typography>
                    </Box>
                    {order.tax?.amount > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">Tax ({order.tax.rate}%)</Typography>
                            <Typography variant="body2">
                                {formatCurrency(order.tax.amount)}
                            </Typography>
                        </Box>
                    )}
                    {order.processingFee > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">Processing Fee</Typography>
                            <Typography variant="body2">
                                {formatCurrency(order.processingFee)}
                            </Typography>
                        </Box>
                    )}
                    {order.deliveryCharge > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">Delivery Charge</Typography>
                            <Typography variant="body2">
                                {formatCurrency(order.deliveryCharge)}
                            </Typography>
                        </Box>
                    )}
                    {order.serviceCharge?.amount > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">Service Charge</Typography>
                            <Typography variant="body2">
                                {formatCurrency(order.serviceCharge.amount)}
                            </Typography>
                        </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: '1px dashed #ccc' }}>
                        <Typography variant="subtitle2">Total Amount</Typography>
                        <Typography variant="subtitle2" fontWeight="bold">
                            {formatCurrency(order.totalAmount)}
                        </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                        {order.paymentMethod?.toUpperCase()} • {order.paymentStatus}
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} fullWidth variant="outlined">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default OrderTrackingDialog;
