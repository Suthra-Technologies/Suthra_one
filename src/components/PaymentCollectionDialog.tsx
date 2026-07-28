import {
    CreditCard as CardIcon,
    AccountBalanceWallet as CashIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Smartphone as SmartphoneIcon,
    ReceiptLong as ChequeIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { getActivePaymentMethods } from '../utils/orderWorkflows';
import { ordersAPI, rewardsAPI } from '../services/api';
import { openCashDrawer } from '../utils/cashDrawer';
import PaymentModal from './PaymentModal';

interface PaymentCollectionDialogProps {
    open: boolean;
    order: any | null;
    onClose: () => void;
    onSuccess: () => void;
}

const PaymentCollectionDialog: React.FC<PaymentCollectionDialogProps> = ({
    open,
    order: initialOrder,
    onClose,
    onSuccess,
}) => {
    const { formatCurrency, settings } = useSettings();
    const [order, setOrder] = useState<any>(initialOrder);
    const [paymentMethod, setPaymentMethod] = useState<string>('cash');

    const isIndia = settings?.restaurant?.country?.toLowerCase() === 'india';

    // Available payment methods based on settings
    const availableMethods = useMemo(() => {
        const activeMethods = getActivePaymentMethods(settings);
        
        return activeMethods.map(m => {
            if (m.val === 'cash') return { val: 'cash', icon: <CashIcon color="success" />, title: 'Cash', subtitle: 'Record a cash payment' };
            if (m.val === 'cheque') return { val: 'cheque', icon: <ChequeIcon color="warning" />, title: 'Cheque', subtitle: 'Record a cheque payment' };
            if (m.val === 'card') return { val: 'card', icon: <CardIcon color="info" />, title: 'Card', subtitle: 'Process card via Stripe' };
            
            let iconColor: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' = 'primary';
            if (m.val === 'zelle' || m.val === 'phonepe') iconColor = 'secondary';
            if (m.val === 'venmo' || m.val === 'gpay') iconColor = 'success';
            
            return {
                val: m.val,
                icon: <SmartphoneIcon color={iconColor} />,
                title: m.label,
                subtitle: `Manual ${m.label} Transfer`
            };
        });
    }, [settings]);

    // Ensure initial payment method is valid when dialog opens
    useEffect(() => {
        if (open && availableMethods.length > 0) {
            const isCurrentlyAvailable = availableMethods.some(m => m.val === paymentMethod);
            if (!isCurrentlyAvailable) {
                setPaymentMethod(availableMethods[0].val as any);
            }
        }
    }, [open, availableMethods, paymentMethod]);
    const [loading, setLoading] = useState(false);
    const [stripeModalOpen, setStripeModalOpen] = useState(false);
    const [tipPercent, setTipPercent] = useState<number>(0);

    // Rewards state
    const [rewardPointsInfo, setRewardPointsInfo] = useState<any>(null);
    const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
    const [isFetchingRewards, setIsFetchingRewards] = useState(false);
    const [isApplyingRewards, setIsApplyingRewards] = useState(false);
    const totalAmount = order?.totalAmount || 0;

    const totalPaid = (order?.payments || [])
        .filter((p: any) => p.status === 'success' || !p.status)
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const baseAmount = order ? (order.totalAmount - (order.tip || 0)) : 0;
    const targetTipAmount = (baseAmount * tipPercent) / 100;
    const pendingTipAmount = Math.max(0, targetTipAmount - (order?.tip || 0));
    const adjustedTotal = order ? (baseAmount + Math.max(order.tip || 0, targetTipAmount)) : 0;
    const amountDue = Math.max(0, adjustedTotal - totalPaid);

    const maxUsablePoints = useMemo(() => {
        if (!rewardPointsInfo?.settings) return 0;
        const pointValue = Number(rewardPointsInfo.settings.pointValue) || 0;
        if (pointValue <= 0) return 0;

        const maxPercentage = (rewardPointsInfo.settings.maxRedemptionPercentage ?? 100) / 100;
        const maxDiscountAllowed = (order?.subtotal || 0) * maxPercentage;

        const maxPointsByBill = Math.floor(maxDiscountAllowed / pointValue);
        return Math.min(rewardPointsInfo.points || 0, maxPointsByBill);
    }, [rewardPointsInfo, order]);

    const [splitAmount, setSplitAmount] = useState<number | string>(Number(amountDue).toFixed(2));

    // Sync state when dialog opens or initial order changes
    useEffect(() => {
        if (initialOrder && open) {
            setOrder(initialOrder);
            setTipPercent(0);

            // Check for customer and fetch rewards
            const fetchRewards = async () => {
                const customer = initialOrder.customer;
                if (customer?.email || customer?.phone) {
                    try {
                        setIsFetchingRewards(true);
                        const res = await rewardsAPI.getCustomerInfo({ 
                            email: customer.email, 
                            phone: customer.phone 
                        });
                        setRewardPointsInfo(res.data);
                        // If order already has points used, pre-fill them
                        if (initialOrder.loyaltyPoints?.pointsUsed) {
                            setPointsToRedeem(initialOrder.loyaltyPoints.pointsUsed);
                        }
                    } catch (err) {
                        console.error('Failed to fetch rewards:', err);
                    } finally {
                        setIsFetchingRewards(false);
                    }
                }
            };
            fetchRewards();
        }
    }, [initialOrder, open]);

    // Recalculate splitAmount input default when amountDue changes
    useEffect(() => {
        if (amountDue > 0) {
            setSplitAmount(Number(amountDue).toFixed(2));
        } else {
            setSplitAmount('');
        }
    }, [amountDue]);

    if (!order) return null;

    const handleAddSplit = async (_paymentIntentId?: string) => {
        const amt = parseFloat(splitAmount as string) || 0;
        if (amt <= 0 || amt > amountDue + 0.01) {
            toast.error('Invalid payment amount. Must not exceed remaining balance.');
            return;
        }
        const isFullyPaid = amt >= amountDue - 0.01;
        setLoading(true);
        try {
            const res = await ordersAPI.addPaymentSplit(order._id, {
                amount: amt,
                method: paymentMethod,
                transactionId: _paymentIntentId,
                tipAmount: pendingTipAmount > 0 ? pendingTipAmount : 0
            });
            toast.success(`Payment of ${formatCurrency(amt)} added`);
            // Cash collected — pop the drawer (wired to the billing printer). Best-effort.
            if (paymentMethod === 'cash') {
                openCashDrawer(settings.printer).catch((err) =>
                    console.error('[CashDrawer] Failed to open drawer:', err),
                );
            }
            // If fully paid, auto-forward/complete
            if (res.data.paymentStatus === 'paid' || isFullyPaid) {
                try {
                    await ordersAPI.updateStatus(order._id, 'completed', 'Payment fully collected');
                    toast.success('Order completed and fully paid!');
                    onSuccess();
                    onClose();
                    setPaymentMethod('cash');
                } catch (completeErr) {
                    console.error('Failed to auto-complete order:', completeErr);
                    // Update state so the user can manually click complete if auto-complete failed
                    setOrder(res.data);
                }
            } else {
                setOrder(res.data);
            }
        } catch (error: any) {
            console.error('Error adding payment:', error);
            toast.error(error.response?.data?.message || 'Failed to add payment slice');
        } finally {
            setLoading(false);
            setStripeModalOpen(false);
        }
    };

    const handleRemoveSplit = async (paymentId: string) => {
        if (!window.confirm('Are you sure you want to void this payment?')) return;
        setLoading(true);
        try {
            const res = await ordersAPI.removePaymentSplit(order._id, paymentId);
            toast.success('Payment removed');
            setOrder(res.data);
        } catch (error: any) {
            toast.error('Failed to remove payment');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyRewards = async () => {
        if (!rewardPointsInfo) return;

        setIsApplyingRewards(true);
        try {
            const res = await (ordersAPI as any).update(order._id, {
                loyaltyPoints: {
                    pointsUsed: pointsToRedeem
                }
            });
            toast.success('Reward points applied!');
            setOrder(res.data);
        } catch (err: any) {
            console.error('Failed to apply rewards:', err);
            toast.error(err.response?.data?.message || 'Failed to apply rewards');
        } finally {
            setIsApplyingRewards(false);
        }
    };

    const handleCompleteOrder = async () => {
        setLoading(true);
        try {
            // Already fully paid, we just mark order completed explicitly
            await ordersAPI.updateStatus(order._id, 'completed', 'Payment fully collected');
            toast.success('Order completed and fully paid!');
            onSuccess();
            onClose();
            setPaymentMethod('cash');
        } catch (error: any) {
            toast.error('Failed to complete order');
        } finally {
            setLoading(false);
        }
    };

    const handleCardPayment = () => {
        const amt = parseFloat(splitAmount as string) || 0;
        if (amt <= 0 || amt > amountDue + 0.01) {
            toast.error('Invalid payment amount');
            return;
        }
        setStripeModalOpen(true);
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Collect Payment
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {/* Order Info & Ledger balances */}
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Order #{order.orderNumber?.split('-').pop() || order._id.slice(-6)}
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary">
                                {formatCurrency(order?.totalAmount)}
                            </Typography>
                        </Box>
                        <Box textAlign="right">
                            <Typography variant="subtitle2" color="success.main" gutterBottom>
                                Paid: {formatCurrency(totalPaid)}
                            </Typography>
                            <Typography variant="h5" color={amountDue === 0 ? "success.main" : "error.main"} fontWeight="bold">
                                Due: {formatCurrency(amountDue)}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Previously Successful Payments List */}
                    {order.payments && order.payments.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">Applied Payments</Typography>
                            <Paper variant="outlined" sx={{ mt: 1 }}>
                                <List dense>
                                    {order.payments.map((p: any) => (
                                        <ListItem key={p._id}>
                                            <ListItemText
                                                primary={`${p.method?.toUpperCase() || 'UNKNOWN'} Payment`}
                                                secondary={new Date(p.recordedAt || p.createdAt).toLocaleString()}
                                            />
                                            <ListItemSecondaryAction>
                                                <Typography variant="body2" component="span" sx={{ mr: 2, fontWeight: 'bold' }}>
                                                    {formatCurrency(p.amount)}
                                                </Typography>
                                                <IconButton edge="end" color="error" size="small" onClick={() => handleRemoveSplit(p._id)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        </Box>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Payment Entry (Hidden if fully paid) */}
                    {amountDue > 0 ? (
                        <>
                            {/* Tip Selection Section */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                    Add Tip (Optional)
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {[5, 10, 15, 20].map((rate) => (
                                        <Button
                                            key={rate}
                                            variant={tipPercent === rate ? "contained" : "outlined"}
                                            size="small"
                                            sx={{ minWidth: '60px', borderRadius: 2 }}
                                            onClick={() => {
                                                const newRate = tipPercent === rate ? 0 : rate;
                                                setTipPercent(newRate);
                                            }}
                                        >
                                            {rate}%
                                        </Button>
                                    ))}
                                    <Button
                                        variant={tipPercent === 0 ? "contained" : "outlined"}
                                        size="small"
                                        sx={{ minWidth: '60px', borderRadius: 2 }}
                                        onClick={() => {
                                            setTipPercent(0);
                                        }}
                                    >
                                        No Addl. Tip
                                    </Button>
                                </Stack>
                                {tipPercent > 0 && pendingTipAmount > 0 && (
                                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block', fontWeight: 'medium' }}>
                                        + {formatCurrency(pendingTipAmount)} Tip Selected
                                    </Typography>
                                )}
                            </Box>

                            {/* Reward Points Section */}
                            {(rewardPointsInfo || isFetchingRewards) && (
                                <Box sx={{
                                    mb: 3,
                                    p: 2,
                                    bgcolor: 'rgba(25, 118, 210, 0.04)',
                                    borderRadius: 2,
                                    border: '1px dashed',
                                    borderColor: 'primary.main'
                                }}>
                                    {isFetchingRewards ? (
                                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                                            <CircularProgress size={16} />
                                            <Typography variant="body2">Fetching customer rewards...</Typography>
                                        </Stack>
                                    ) : (
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="bold" color="primary" gutterBottom>
                                                Redeem Reward Points
                                            </Typography>
                                            <Stack direction="row" spacing={2} alignItems="flex-start">
                                                <Box sx={{ flexGrow: 1 }}>
                                                    <Typography variant="body2">
                                                        Balance: <strong>{rewardPointsInfo.points || 0} pts</strong>
                                                        <Chip
                                                            label={`$${rewardPointsInfo.dollarValue || 0} Value`}
                                                            size="small"
                                                            color="success"
                                                            variant="outlined"
                                                            sx={{ height: 18, ml: 1, fontSize: '0.6rem' }}
                                                        />
                                                    </Typography>
                                                    <TextField
                                                        margin="dense"
                                                        label="Points to Redeem"
                                                        type="number"
                                                        size="small"
                                                        fullWidth
                                                        value={pointsToRedeem || ''}
                                                        onChange={(e) => setPointsToRedeem(Math.min(maxUsablePoints, Math.max(0, parseInt(e.target.value) || 0)))}
                                                        inputProps={{ min: 0, max: maxUsablePoints }}
                                                        disabled={rewardPointsInfo.points === 0 || (rewardPointsInfo.points < (rewardPointsInfo.settings?.minPointsToRedeem || 0))}
                                                    />
                                                    {rewardPointsInfo.settings?.minPointsToRedeem > 0 && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Min. {rewardPointsInfo.settings.minPointsToRedeem} pts required.
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Stack spacing={1}>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        onClick={() => setPointsToRedeem(maxUsablePoints)}
                                                        disabled={maxUsablePoints === 0 || (rewardPointsInfo.points < (rewardPointsInfo.settings?.minPointsToRedeem || 0))}
                                                    >
                                                        Max
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={handleApplyRewards}
                                                        disabled={isApplyingRewards || pointsToRedeem < 0}
                                                    >
                                                        {isApplyingRewards ? '...' : 'Apply'}
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </Box>
                                    )}
                                </Box>
                            )}

                            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                                <TextField
                                    label="Amount to Pay"
                                    type="number"
                                    value={splitAmount}
                                    onChange={(e) => setSplitAmount(e.target.value)}
                                    fullWidth
                                    inputProps={{ min: 0.01, step: 0.01, max: amountDue }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
                                    (Max: {formatCurrency(amountDue)})
                                </Typography>
                            </Box>

                            <FormControl component="fieldset" fullWidth>
                                <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
                                    Select Payment Method
                                </FormLabel>
                                <RadioGroup
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                                >
                                    {availableMethods.map((m) => (
                                        <Paper
                                            key={m.val}
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                mb: 2,
                                                cursor: 'pointer',
                                                border: paymentMethod === m.val ? 2 : 1,
                                                borderColor: paymentMethod === m.val ? 'primary.main' : 'divider',
                                                '&:hover': { borderColor: 'primary.main' },
                                            }}
                                            onClick={() => setPaymentMethod(m.val as any)}
                                        >
                                            <FormControlLabel
                                                value={m.val}
                                                control={<Radio />}
                                                label={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {m.icon}
                                                        <Box>
                                                            <Typography variant="body1" fontWeight="medium">{m.title}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{m.subtitle}</Typography>
                                                        </Box>
                                                    </Box>
                                                }
                                            />
                                        </Paper>
                                    ))}
                                </RadioGroup>
                            </FormControl>
                        </>
                    ) : (
                        <Alert severity="success" sx={{ mt: 2, py: 2, fontSize: '1.2rem', display: 'flex', justifyContent: 'center' }}>
                            Order is Fully Paid! This order is ready to be completed.
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={onClose} disabled={loading}>
                        {amountDue > 0 ? "Cancel" : "Close"}
                    </Button>

                    {amountDue > 0 ? (
                        paymentMethod === 'card' ? (
                            <Button
                                onClick={handleCardPayment}
                                variant="contained"
                                disabled={loading || parseFloat(splitAmount as string) <= 0 || parseFloat(splitAmount as string) > amountDue}
                            >
                                Process Card {splitAmount ? formatCurrency(parseFloat(splitAmount as string)) : ''}
                            </Button>
                        ) : (
                            <Button
                                onClick={() => handleAddSplit()}
                                variant="contained"
                                disabled={loading || parseFloat(splitAmount as string) <= 0 || parseFloat(splitAmount as string) > amountDue + 0.01}
                            >
                                {loading ? 'Processing...' :
                                    `${(parseFloat(splitAmount as string) || 0) >= (amountDue - 0.01) ? 'Collect Payment' : 'Add Payment Split'} ${splitAmount ? formatCurrency(parseFloat(splitAmount as string)) : ''}`
                                }
                            </Button>
                        )
                    ) : (
                        <Button
                            onClick={handleCompleteOrder}
                            variant="contained"
                            color="success"
                            disabled={loading}
                        >
                            Complete Order & Print Receipt
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <PaymentModal
                open={stripeModalOpen}
                onClose={() => setStripeModalOpen(false)}
                amount={parseFloat(splitAmount as string) || 0}
                onSuccess={(intentId) => handleAddSplit(intentId)}
            />
        </>
    );
};

export default PaymentCollectionDialog;
