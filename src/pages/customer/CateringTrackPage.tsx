import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Container,
    Paper,
    Typography,
    Grid,
    Divider,
    Stepper,
    Step,
    StepLabel,
    List,
    ListItem,
    ListItemText,
    TextField,
    Button,
    Stack,
    CircularProgress,
    alpha,
    useTheme,
    Chip,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { cateringAPI, ordersAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { downloadFile } from '../../utils/fileDownload';
import { Assignment, Chat, Event, History, Receipt } from '@mui/icons-material';

const SUCCESS_STATUSES = new Set(['succeeded']);
const FAILURE_STATUSES = new Set(['canceled', 'requires_payment_method', 'failed']);
const PROCESSING_STATUSES = new Set(['processing', 'requires_action', 'requires_confirmation', 'requires_capture']);

interface CateringCardPaymentFormProps {
    amount: number;
    slug: string;
    onSuccess: (paymentIntentId: string) => Promise<void>;
    onCancel: () => void;
    loading: boolean;
}

const CateringCardPaymentForm: React.FC<CateringCardPaymentFormProps> = ({
    amount,
    slug,
    onSuccess,
    onCancel,
    loading,
}) => {
    const stripe = useStripe();
    const elements = useElements();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const waitForVerifiedIntent = async (intentId: string, timeout = 60000) => {
        const start = Date.now();

        while (Date.now() - start < timeout) {
            const res = await ordersAPI.verifyPublicPaymentIntent(slug, intentId);
            const status = res.data?.status;

            if (SUCCESS_STATUSES.has(status)) {
                return { ok: true as const, status };
            }

            if (FAILURE_STATUSES.has(status)) {
                return {
                    ok: false as const,
                    status,
                    error: res.data?.lastPaymentError?.message || 'Payment failed',
                };
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        return {
            ok: false as const,
            status: 'timeout',
            error: 'Payment is still processing. Please verify before retrying.',
        };
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const { data } = await ordersAPI.createPublicPaymentIntent(amount, slug, 'usd');
            const clientSecret = data?.clientSecret;
            if (!clientSecret) {
                throw new Error('Failed to initialize Stripe payment');
            }

            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement)!,
                },
            });

            if (result.error) {
                const message = result.error.message || 'Payment failed';
                setError(message);
                toast.error(message);
                return;
            }

            if (result.paymentIntent && SUCCESS_STATUSES.has(result.paymentIntent.status)) {
                await onSuccess(result.paymentIntent.id);
                return;
            }

            if (result.paymentIntent && PROCESSING_STATUSES.has(result.paymentIntent.status)) {
                const verified = await waitForVerifiedIntent(result.paymentIntent.id);
                if (verified.ok) {
                    await onSuccess(result.paymentIntent.id);
                    return;
                }

                setError(verified.error);
                toast.error(verified.error);
                return;
            }

            const status = result.paymentIntent?.status || 'unknown';
            const message = `Payment not completed. Current status: ${status}.`;
            setError(message);
            toast.error(message);
        } catch (err: any) {
            console.error('Catering Stripe payment failed:', err);
            const message = err?.response?.data?.message || err.message || 'Payment failed';
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const isBusy = loading || submitting;

    return (
        <form onSubmit={handleSubmit}>
            <Box
                sx={{
                    p: 2,
                    border: '1px solid #e5e7eb',
                    borderRadius: 2,
                    backgroundColor: '#fafafa',
                }}
            >
                <CardElement
                    options={{
                        style: {
                            base: {
                                fontSize: '16px',
                                color: '#1f2937',
                                '::placeholder': {
                                    color: '#9ca3af',
                                },
                            },
                            invalid: {
                                color: '#b91c1c',
                            },
                        },
                    }}
                />
            </Box>

            {error && (
                <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                    {error}
                </Typography>
            )}

            <Box display="flex" gap={2} pt={3}>
                <Button fullWidth variant="outlined" onClick={onCancel} disabled={isBusy}>
                    Cancel
                </Button>
                <Button fullWidth type="submit" variant="contained" disabled={!stripe || isBusy}>
                    {isBusy ? <CircularProgress size={22} color="inherit" /> : `Pay ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}`}
                </Button>
            </Box>
        </form>
    );
};

const CateringTrackPage = () => {
    const { slug, id: token } = useParams<{ slug: string, id: string }>();
    const theme = useTheme();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const chatEndRef = useRef<null | HTMLDivElement>(null);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'zelle', notes: '' });
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
    const [loadingStripeConfig, setLoadingStripeConfig] = useState(false);
    const [stripeConfigError, setStripeConfigError] = useState<string | null>(null);

    const statuses = ['pending', 'confirmed', 'completed'];
    const getActiveStep = (status: string) => statuses.indexOf(status);

    const refundedTotal = (order?.refunds || []).reduce((sum: number, refund: any) => sum + (Number(refund.amount) || 0), 0);
    const grossPaid = Number(order?.advanceReceived || 0);
    const netPaid = Math.max(0, grossPaid - refundedTotal);
    const balanceDue = Math.max(0, Number(order?.totalAmount || 0) - netPaid);

    const closePaymentDialog = () => {
        setPaymentDialogOpen(false);
        setPaymentForm({ amount: '', method: 'zelle', notes: '' });
        setStripeConfigError(null);
    };

    const fetchOrder = async () => {
        if (!slug || !token) return;
        try {
            const response = await cateringAPI.track(slug, token);
            setOrder(response.data);
        } catch (error) {
            console.error('Failed to fetch order:', error);
            toast.error('Could not find order. Please check your link.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 30000);
        return () => clearInterval(interval);
    }, [slug, token]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [order?.messages]);

    useEffect(() => {
        const loadStripeConfig = async () => {
            if (!paymentDialogOpen || paymentForm.method !== 'card' || !slug) {
                return;
            }

            setLoadingStripeConfig(true);
            setStripeConfigError(null);

            try {
                const { data } = await ordersAPI.getPublicPaymentConfig(slug);
                const key = data?.publishableKey;

                if (!key) {
                    setStripePromise(null);
                    setStripeConfigError('Stripe is not configured for this restaurant.');
                    return;
                }

                setStripePromise(loadStripe(key));
            } catch (error: any) {
                console.error('Failed to load public Stripe config:', error);
                setStripePromise(null);
                setStripeConfigError(error?.response?.data?.message || 'Failed to load payment configuration');
            } finally {
                setLoadingStripeConfig(false);
            }
        };

        loadStripeConfig();
    }, [paymentDialogOpen, paymentForm.method, slug]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !slug || !token) return;
        setSendingMessage(true);
        try {
            await cateringAPI.addCustomerMessage(slug, token, newMessage);
            setNewMessage('');
            await fetchOrder();
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setSendingMessage(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!slug || !token) return;
        try {
            const response = await cateringAPI.downloadPublicPDF(slug, token);
            await downloadFile(response.data, `Invoice-${order?.orderNumber || 'Catering'}.pdf`, 'application/pdf');
        } catch (error) {
            toast.error('Failed to download PDF');
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    const handleManualPaymentSubmit = async () => {
        if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0 || !slug || !token) {
            toast.error('Please enter a valid amount');
            return;
        }

        setSubmittingPayment(true);
        try {
            await cateringAPI.addPublicPayment(slug, token, {
                amount: parseFloat(paymentForm.amount),
                method: paymentForm.method,
                notes: paymentForm.notes,
            });
            toast.success('Payment recorded successfully!');
            closePaymentDialog();
            await fetchOrder();
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to record payment';
            toast.error(message);
        } finally {
            setSubmittingPayment(false);
        }
    };

    const handleStripePaymentSuccess = async (paymentIntentId: string) => {
        if (!slug || !token) return;

        setSubmittingPayment(true);
        try {
            await cateringAPI.addPublicPayment(slug, token, {
                amount: parseFloat(paymentForm.amount),
                method: 'card',
                notes: paymentForm.notes,
                paymentIntentId,
            });
            toast.success('Card payment recorded successfully!');
            closePaymentDialog();
            await fetchOrder();
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Failed to save card payment';
            toast.error(message);
        } finally {
            setSubmittingPayment(false);
        }
    };

    const getStatusChip = (status: string) => {
        switch (status) {
            case 'confirmed': return <Chip label="Confirmed" color="success" size="small" />;
            case 'completed': return <Chip label="Completed" color="primary" size="small" />;
            case 'cancelled': return <Chip label="Cancelled" color="error" size="small" />;
            default: return <Chip label="Pending" color="warning" size="small" />;
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!order) {
        return (
            <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>Order Not Found</Typography>
                <Typography color="textSecondary">The link you followed may be invalid or expired.</Typography>
            </Container>
        );
    }

    return (
        <Box sx={{ bgcolor: alpha(theme.palette.background.default, 0.5), minHeight: '100vh', py: 4 }}>
            <Container maxWidth="lg">
                <Grid container spacing={4}>
                    <Grid item xs={12} md={7}>
                        <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', mb: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
                                <Box>
                                    <Typography variant="overline" color="primary" fontWeight="bold">Order Tracking</Typography>
                                    <Typography variant="h4" fontWeight="bold">{order.orderNumber}</Typography>
                                    <Typography color="textSecondary">{order.occasion || 'Catering Delivery'}</Typography>
                                    <Button
                                        size="small"
                                        startIcon={<Assignment />}
                                        onClick={handleDownloadPDF}
                                        sx={{ mt: 1 }}
                                    >
                                        Download PDF Invoice
                                    </Button>
                                </Box>
                                <Box textAlign="right">
                                    {getStatusChip(order.status)}
                                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                                        Event Date: {new Date(order.requiredDate).toLocaleDateString()}
                                    </Typography>
                                </Box>
                            </Box>

                            <Divider sx={{ mb: 4 }} />

                            <Stepper activeStep={getActiveStep(order.status)} alternativeLabel sx={{ mb: 6 }}>
                                <Step>
                                    <StepLabel>Order Received</StepLabel>
                                </Step>
                                <Step>
                                    <StepLabel>Confirmed</StepLabel>
                                </Step>
                                <Step>
                                    <StepLabel>Fullfilled</StepLabel>
                                </Step>
                            </Stepper>

                            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                                <Receipt sx={{ mr: 1, color: 'primary.main' }} /> Order Items
                            </Typography>
                            <List disablePadding>
                                {order.items.map((item: any, i: number) => (
                                    <ListItem key={i} sx={{ px: 0, py: 1.5 }}>
                                        <ListItemText
                                            primary={<Typography variant="subtitle1" fontWeight="600">{item.name}</Typography>}
                                            secondary={`${item.quantity} x ${formatCurrency(item.unitPrice)}`}
                                        />
                                        <Typography variant="subtitle1" fontWeight="bold">{formatCurrency(item.total)}</Typography>
                                    </ListItem>
                                ))}
                            </List>

                            <Box sx={{ mt: 3, bgcolor: alpha(theme.palette.primary.main, 0.03), p: 2, borderRadius: 2 }}>
                                <Stack spacing={1}>
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography color="textSecondary">Subtotal</Typography>
                                        <Typography>{formatCurrency(order.subtotal)}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography color="textSecondary">Tax ({order.tax?.rate}%)</Typography>
                                        <Typography>{formatCurrency(order.tax?.amount || 0)}</Typography>
                                    </Box>
                                    {order.discount?.value > 0 && (
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography color="error">Discount</Typography>
                                            <Typography color="error">
                                                -{formatCurrency(order.discount.type === 'percentage' ? (order.subtotal * order.discount.value / 100) : order.discount.value)}
                                            </Typography>
                                        </Box>
                                    )}
                                    <Divider />
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography variant="h6" fontWeight="bold">Total Amount</Typography>
                                        <Typography variant="h6" fontWeight="bold">{formatCurrency(order.totalAmount)}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography color="success.main" fontWeight="500">Gross Paid</Typography>
                                        <Typography color="success.main" fontWeight="500">{formatCurrency(grossPaid)}</Typography>
                                    </Box>
                                    {refundedTotal > 0 && (
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography color="warning.main" fontWeight="500">Refunded</Typography>
                                            <Typography color="warning.main" fontWeight="500">-{formatCurrency(refundedTotal)}</Typography>
                                        </Box>
                                    )}
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography color="primary.main" fontWeight="500">Net Paid</Typography>
                                        <Typography color="primary.main" fontWeight="500">{formatCurrency(netPaid)}</Typography>
                                    </Box>
                                    <Divider />
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography variant="h5" fontWeight="bold">Balance Due</Typography>
                                        <Typography variant="h5" fontWeight="bold" color={balanceDue > 0 ? 'error' : 'success.main'}>
                                            {formatCurrency(balanceDue)}
                                        </Typography>
                                    </Box>

                                    {order.status !== 'pending' && order.status !== 'cancelled' && balanceDue > 0 && (
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            color="primary"
                                            onClick={() => setPaymentDialogOpen(true)}
                                            sx={{ mt: 2, borderRadius: 2, py: 1.5 }}
                                        >
                                            Add Partial Payment
                                        </Button>
                                    )}
                                </Stack>
                            </Box>
                        </Paper>

                        {(order.payments && order.payments.length > 0) && (
                            <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', mb: 3 }}>
                                <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                                    <History sx={{ mr: 1, color: 'primary.main' }} /> Payment History
                                </Typography>
                                <List disablePadding>
                                    {order.payments.map((p: any, i: number) => (
                                        <ListItem key={i} sx={{ px: 0, py: 1, borderBottom: i < order.payments.length - 1 ? '1px solid #eee' : 'none' }}>
                                            <ListItemText
                                                primary={(
                                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                        <Typography fontWeight="600">
                                                            {formatCurrency(p.amount)} via {String(p.method || '').toUpperCase()}
                                                        </Typography>
                                                        {p.paymentIntentId && <Chip size="small" color="info" label="Stripe" />}
                                                        {p.refundId && <Chip size="small" color="warning" label={`Refunded ${formatCurrency(p.refundedAmount || 0)}`} />}
                                                    </Box>
                                                )}
                                                secondary={new Date(p.timestamp).toLocaleString()}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        )}

                        {(order.refunds && order.refunds.length > 0) && (
                            <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Refund History</Typography>
                                <List disablePadding>
                                    {order.refunds.map((refund: any, i: number) => (
                                        <ListItem key={i} sx={{ px: 0, py: 1, borderBottom: i < order.refunds.length - 1 ? '1px solid #eee' : 'none' }}>
                                            <ListItemText
                                                primary={<Typography fontWeight="600">{formatCurrency(refund.amount)} refunded</Typography>}
                                                secondary={`${new Date(refund.timestamp).toLocaleString()}${refund.id ? ` • ${refund.id}` : ''}`}
                                            />
                                            <Chip size="small" color={refund.status === 'succeeded' ? 'success' : 'warning'} label={refund.status || 'processed'} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        )}

                        <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                                <Event sx={{ mr: 1, color: 'primary.main' }} /> Event Information
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="textSecondary" textTransform="uppercase">Delivery Address</Typography>
                                    <Typography variant="body1">{order.location?.address || 'Pickup'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="textSecondary" textTransform="uppercase">Contact Person</Typography>
                                    <Typography variant="body1">{order.customerName}</Typography>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={5}>
                        <Paper sx={{
                            height: { xs: 500, md: '70vh' },
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                            position: 'sticky',
                            top: 24
                        }}>
                            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                                <Typography variant="h6" display="flex" alignItems="center">
                                    <Chat sx={{ mr: 1 }} /> Support Chat
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>We'll respond to your questions here.</Typography>
                            </Box>

                            <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, bgcolor: alpha(theme.palette.background.default, 0.4) }}>
                                {(!order.messages || order.messages.length === 0) && (
                                    <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>
                                        Need to coordinate something? Send us a message!
                                    </Typography>
                                )}
                                {order.messages?.map((msg: any, i: number) => (
                                    <Box key={i} sx={{
                                        alignSelf: msg.role === 'customer' ? 'flex-end' : 'flex-start',
                                        maxWidth: '85%',
                                        bgcolor: msg.role === 'customer' ? 'primary.main' : 'background.paper',
                                        color: msg.role === 'customer' ? 'primary.contrastText' : 'text.primary',
                                        p: 1.5,
                                        borderRadius: 2,
                                        boxShadow: 1
                                    }}>
                                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.8 }}>
                                            {msg.role === 'customer' ? 'You' : msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                        <Typography variant="body2">{msg.message}</Typography>
                                    </Box>
                                ))}
                                <div ref={chatEndRef} />
                            </Box>

                            <Divider />
                            <Box p={2}>
                                <Stack direction="row" spacing={1}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder={
                                            (order.status === 'completed' || order.status === 'cancelled' || (order.requiredDate && new Date(order.requiredDate) < new Date()))
                                            ? 'Chat is closed for this order'
                                            : 'Type your message...'
                                        }
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => {
                                            const isDatePassed = order?.requiredDate && new Date(order.requiredDate) < new Date();
                                            const isChatDisabled = order.status === 'completed' || order.status === 'cancelled' || isDatePassed;
                                            if (e.key === 'Enter' && !isChatDisabled) handleSendMessage();
                                        }}
                                        disabled={sendingMessage || order.status === 'completed' || order.status === 'cancelled' || (order.requiredDate && new Date(order.requiredDate) < new Date())}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={handleSendMessage}
                                        disabled={
                                            !newMessage.trim() ||
                                            sendingMessage ||
                                            order.status === 'completed' ||
                                            order.status === 'cancelled' ||
                                            (order.requiredDate && new Date(order.requiredDate) < new Date())
                                        }
                                        sx={{ borderRadius: 3, px: 3 }}
                                    >
                                        {sendingMessage ? <CircularProgress size={20} color="inherit" /> : 'Send'}
                                    </Button>
                                </Stack>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>

            <Box>
                {paymentDialogOpen && (
                    <Box sx={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Paper sx={{ p: 4, borderRadius: 3, maxWidth: 460, width: '90%' }}>
                            <Typography variant="h5" fontWeight="bold" gutterBottom>Add Payment</Typography>
                            <Typography color="textSecondary" variant="body2" mb={3}>
                                Balance Due: <strong>{formatCurrency(balanceDue)}</strong>
                            </Typography>

                            <Stack spacing={2}>
                                <TextField
                                    label="Payment Amount"
                                    type="number"
                                    fullWidth
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                />
                                <TextField
                                    select
                                    label="Payment Method"
                                    fullWidth
                                    SelectProps={{ native: true }}
                                    value={paymentForm.method}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                >
                                    <option value="zelle">Zelle</option>
                                    <option value="venmo">Venmo</option>
                                    <option value="card">Credit Card</option>
                                    <option value="cash">Cash</option>
                                </TextField>
                                <TextField
                                    label="Notes (Optional)"
                                    fullWidth
                                    value={paymentForm.notes}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                />

                                {paymentForm.method === 'card' ? (
                                    <>
                                        {loadingStripeConfig && (
                                            <Box py={2} textAlign="center">
                                                <CircularProgress size={24} />
                                                <Typography variant="body2" sx={{ mt: 1 }}>
                                                    Loading Stripe payment form...
                                                </Typography>
                                            </Box>
                                        )}

                                        {!loadingStripeConfig && stripeConfigError && (
                                            <Typography color="error" variant="body2">
                                                {stripeConfigError}
                                            </Typography>
                                        )}

                                        {!loadingStripeConfig && stripePromise && paymentForm.amount && parseFloat(paymentForm.amount) > 0 && (
                                            <Elements stripe={stripePromise}>
                                                <CateringCardPaymentForm
                                                    amount={parseFloat(paymentForm.amount)}
                                                    slug={slug || ''}
                                                    onSuccess={handleStripePaymentSuccess}
                                                    onCancel={closePaymentDialog}
                                                    loading={submittingPayment}
                                                />
                                            </Elements>
                                        )}

                                        {!loadingStripeConfig && !stripeConfigError && (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) && (
                                            <Typography color="textSecondary" variant="body2">
                                                Enter a valid amount to load the Stripe card form.
                                            </Typography>
                                        )}
                                    </>
                                ) : (
                                    <Box display="flex" gap={2} pt={2}>
                                        <Button fullWidth variant="outlined" onClick={closePaymentDialog}>
                                            Cancel
                                        </Button>
                                        <Button fullWidth variant="contained" onClick={handleManualPaymentSubmit} disabled={submittingPayment}>
                                            {submittingPayment ? <CircularProgress size={24} /> : 'Record Payment'}
                                        </Button>
                                    </Box>
                                )}
                            </Stack>
                        </Paper>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default CateringTrackPage;
