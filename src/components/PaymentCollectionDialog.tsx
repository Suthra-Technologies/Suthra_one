import {
    CreditCard as CardIcon,
    AccountBalanceWallet as CashIcon,
    Close as CloseIcon,
    Smartphone as SmartphoneIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    IconButton,
    Paper,
    Radio,
    RadioGroup,
    Typography,
    Stack,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { ordersAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
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
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'zelle' | 'venmo'>('cash');

    // Available payment methods based on settings
    const availableMethods = useMemo(() => [
        { val: 'cash', icon: <CashIcon color="success" />, title: 'Cash', subtitle: 'Accept cash from customer' },
        { val: 'zelle', icon: <SmartphoneIcon color="secondary" />, title: 'Zelle', subtitle: 'Manual Zelle Transfer' },
        { val: 'venmo', icon: <SmartphoneIcon color="success" />, title: 'Venmo', subtitle: 'Manual Venmo Transfer' },
        { val: 'card', icon: <CardIcon color="info" />, title: 'Card', subtitle: 'Process card via Stripe' }
    ].filter(m => settings.system?.posPaymentMethods?.[m.val as keyof typeof settings.system.posPaymentMethods] !== false), [settings.system?.posPaymentMethods]);

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
    const totalAmount = order?.totalAmount || 0;
    
    const totalPaid = (order?.payments || [])
        .filter((p: any) => p.status === 'success' || !p.status)
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    const baseAmount = order ? (order.totalAmount - (order.tip || 0)) : 0;
    const targetTipAmount = (baseAmount * tipPercent) / 100;
    const pendingTipAmount = Math.max(0, targetTipAmount - (order?.tip || 0));
    const adjustedTotal = order ? (baseAmount + Math.max(order.tip || 0, targetTipAmount)) : 0;
    const amountDue = Math.max(0, adjustedTotal - totalPaid);

    const [splitAmount, setSplitAmount] = useState<number | string>(Number(amountDue).toFixed(2));

    // Sync state when dialog opens or initial order changes
    useEffect(() => {
        if (initialOrder && open) {
            setOrder(initialOrder);
            setTipPercent(0);
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
                                                primary={`${p.method.toUpperCase()} Payment`}
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
