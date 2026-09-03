import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    CircularProgress,
    TextField,
    Tabs,
    Tab,
    Divider,
} from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { ordersAPI, paymentsAPI } from '../services/api';
import { toast } from 'react-hot-toast';

// Stripe will be loaded dynamically per-tenant using the payments/config endpoint

interface PaymentFormProps {
    amount: number;
    // Food subtotal and tax, used (for Connect-routed tenants) to compute the
    // platform application fee so the tenant nets food + tax. Optional — when
    // omitted the platform keeps only the Stripe cost.
    subtotal?: number;
    tax?: number;
    onSuccess: (paymentIntentId: string, tipAmount: number) => void;
    onClose: () => void;
    showTips?: boolean;
}

const SUCCESS_STATUSES = new Set(['succeeded']);
const FAILURE_STATUSES = new Set(['canceled', 'requires_payment_method', 'failed']);
const PROCESSING_STATUSES = new Set(['processing', 'requires_action', 'requires_confirmation', 'requires_capture']);

const PaymentForm: React.FC<PaymentFormProps> = ({ amount, subtotal, tax, onSuccess, onClose, showTips = false }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tip, setTip] = useState(0);
    const [mode, setMode] = useState<'terminal' | 'manual'>('terminal');
    const [terminalStatus, setTerminalStatus] = useState<string>('Ready to collect on reader');
    const [polling, setPolling] = useState(false);
    const [currentIntentId, setCurrentIntentId] = useState<string | null>(null);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [readerCheck, setReaderCheck] = useState<{ checked: boolean; hasReader: boolean; count: number }>({ checked: false, hasReader: true, count: 0 });

    const waitForVerifiedIntent = async (intentId: string, timeout = 60000) => {
        const start = Date.now();

        while (Date.now() - start < timeout) {
            const res = await paymentsAPI.verifyIntent(intentId);
            const status = res.data?.status;

            if (SUCCESS_STATUSES.has(status)) {
                return { ok: true as const, status, data: res.data };
            }

            if (FAILURE_STATUSES.has(status)) {
                return { ok: false as const, status, error: res.data?.lastPaymentError?.message || 'Payment failed' };
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        return { ok: false as const, status: 'timeout', error: 'Payment is still processing. Please verify before retrying.' };
    };

    useEffect(() => {
        setError(null);
        setPaymentError(null);
        setTerminalStatus(mode === 'terminal' ? 'Ready to collect on reader' : '');
        setCurrentIntentId(null);
        setPolling(false);
    }, [mode]);

    useEffect(() => {
        const handler = (evt: any) => {
            const detail = evt.detail || {};
            if (!detail.paymentIntentId || !currentIntentId) return;
            if (detail.paymentIntentId !== currentIntentId) return;

            if (detail.event === 'payment_succeeded' || detail.status === 'succeeded' || detail.payment_status === 'paid') {
                setTerminalStatus('Payment succeeded');
                toast.success('Payment confirmed');
                onSuccess(currentIntentId, tip);
                setPolling(false);
            } else if (detail.event === 'payment_timeout') {
                setTerminalStatus('Payment timed out');
                toast.error('Payment timed out');
                setPolling(false);
            } else if (detail.event === 'payment_failed' || detail.status === 'canceled' || detail.status === 'requires_payment_method' || detail.status === 'failed') {
                setTerminalStatus('Payment failed');
                setPaymentError(detail.error || 'Payment failed');
                toast.error(detail.error || 'Payment failed');
                setPolling(false);
            }
        };
        window.addEventListener('paymentStatus', handler);
        return () => window.removeEventListener('paymentStatus', handler);
    }, [currentIntentId, onSuccess, tip]);

    const predefinedTips = [0, 5, 10, 15, 20];

    // Helper to calculate tip from percentage
    const setTipPercentage = (pct: number) => {
        setTip(Number(((amount * pct) / 100).toFixed(2)));
    }

    const totalAmount = amount + tip;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (mode === 'manual' && (!stripe || !elements)) return;

        setLoading(true);
        setError(null);

        try {
            if (mode === 'manual') {
                const { data } = await paymentsAPI.createIntent({ amount: totalAmount, currency: 'usd', subtotal, tax });
                const { clientSecret } = data;

                const result = await stripe!.confirmCardPayment(clientSecret, {
                    payment_method: {
                        card: elements!.getElement(CardElement)!,
                    },
                });

                if (result.error) {
                    setError(result.error.message || 'Payment failed');
                    toast.error(result.error.message || 'Payment failed');
                } else if (result.paymentIntent && SUCCESS_STATUSES.has(result.paymentIntent.status)) {
                    toast.success('Payment successful!');
                    onSuccess(result.paymentIntent.id, tip);
                } else if (result.paymentIntent && PROCESSING_STATUSES.has(result.paymentIntent.status)) {
                    const verified = await waitForVerifiedIntent(result.paymentIntent.id);
                    if (verified.ok) {
                        toast.success('Payment confirmed');
                        onSuccess(result.paymentIntent.id, tip);
                    } else {
                        setError(verified.error);
                        toast.error(verified.error);
                    }
                } else {
                    const status = result.paymentIntent?.status || 'unknown';
                    const message = `Payment not completed. Current status: ${status}.`;
                    setError(message);
                    toast.error(message);
                }
            } else {
                // Check if a live reader exists (for live mode). For test we proceed regardless.
                if (!readerCheck.checked) {
                    try {
                        const res = await paymentsAPI.checkTerminalReader();
                        setReaderCheck({ checked: true, hasReader: res.data?.hasReader, count: res.data?.count || 0 });
                        if (!res.data?.hasReader) {
                            setTerminalStatus('No live readers connected. Connect a reader or use simulator.');
                            toast.error('No Stripe Terminal reader connected');
                            setLoading(false);
                            return;
                        }
                    } catch (err: any) {
                        console.error('Reader check failed', err);
                        // Allow simulated usage if API fails
                    }
                }
                // Terminal path: create card_present intent and poll until paid (reader will confirm)
                setTerminalStatus('Creating terminal intent...');
                const { data } = await paymentsAPI.createTerminalIntent({ amount: totalAmount, currency: 'usd', subtotal, tax });
                const intentId = data.intentId;
                setCurrentIntentId(intentId);
                setTerminalStatus('Waiting for reader to collect (tap/swipe)...');
                setPolling(true);

                const verified = await waitForVerifiedIntent(intentId);
                if (verified.ok) {
                    setTerminalStatus('Payment succeeded');
                    toast.success('Payment successful on reader');
                    onSuccess(intentId, tip);
                } else if (verified.status === 'timeout') {
                    setTerminalStatus('Still processing on reader');
                    setPaymentError(verified.error);
                    toast.error(verified.error);
                } else {
                    setTerminalStatus('Payment failed');
                    setPaymentError(verified.error);
                    toast.error(verified.error);
                }
                setPolling(false);
            }
        } catch (err: any) {
            console.error('Payment error:', err);
            setError(err.message || 'An error occurred');
            toast.error('Payment failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom align="center">
                    Total to Pay: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)}
                </Typography>

                <Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ mb: 2 }}>
                    <Tab label="Tap/Swipe (Stripe Terminal)" value="terminal" />
                    <Tab label="Manual Card Entry" value="manual" />
                </Tabs>

                {mode === 'terminal' && (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Use the paired Stripe Terminal reader. Amount includes tip.
                    </Typography>
                    <Typography variant="subtitle2">Status: {terminalStatus}</Typography>
                    {polling && <CircularProgress size={20} sx={{ mt: 1 }} />}
                    {paymentError && (
                        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                            {paymentError}
                        </Typography>
                    )}
                    {paymentError && (
                        <Button
                            variant="outlined"
                            size="small"
                            sx={{ mt: 1 }}
                            onClick={() => {
                                setPaymentError(null);
                                setCurrentIntentId(null);
                                setTerminalStatus('Ready to collect on reader');
                            }}
                            disabled={loading}
                        >
                            Retry Payment
                        </Button>
                    )}
                </Box>
                )}

                {showTips && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" gutterBottom>Add Tip</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                            {[0, 10, 15, 20].map((pct) => (
                                <Button
                                    key={pct}
                                    variant={tip === Number(((amount * pct) / 100).toFixed(2)) ? "contained" : "outlined"}
                                    size="small"
                                    onClick={() => setTipPercentage(pct)}
                                >
                                    {pct === 0 ? 'No Tip' : `${pct}%`}
                                </Button>
                            ))}
                        </Box>
                        <TextField
                            label="Custom Tip ($)"
                            type="number"
                            size="small"
                            fullWidth
                            inputProps={{ min: 0, step: 0.01 }}
                            value={tip}
                            onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
                        />
                    </Box>
                )}

                {mode === 'manual' && (
                    <Box sx={{ border: '1px solid #ccc', p: 2, borderRadius: 1, mb: 2 }}>
                        <CardElement options={{
                            style: {
                                base: {
                                    fontSize: '16px',
                                    color: '#424770',
                                    '::placeholder': {
                                        color: '#aab7c4',
                                    },
                                },
                                invalid: {
                                    color: '#9e2146',
                                },
                            },
                        }} />
                    </Box>
                )}
                {error && (
                    <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}
                <DialogActions sx={{ px: 0 }}>
                    <Button onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!stripe || loading}
                        startIcon={loading && <CircularProgress size={20} color="inherit" />}
                    >
                        {loading ? 'Processing...' : `Pay ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)}`}
                    </Button>
                </DialogActions>
            </Box>
        </form>
    );
};

interface PaymentModalProps {
    open: boolean;
    onClose: () => void;
    amount: number;
    subtotal?: number;
    tax?: number;
    onSuccess: (paymentIntentId: string, tipAmount: number) => void;
    showTips?: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ open, onClose, amount, subtotal, tax, onSuccess, showTips = false }) => {
    const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
    const [loadingKey, setLoadingKey] = useState(false);

    useEffect(() => {
        if (!open) return;

        const loadKey = async () => {
            setLoadingKey(true);
            try {
                const { data } = await paymentsAPI.getConfig();
                const key = data?.publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

                if (key) {
                    setStripePromise(loadStripe(key));
                } else {
                    setStripePromise(null);
                    console.warn('Stripe publishable key missing for this tenant.');
                }
            } catch (error) {
                console.error('Failed to fetch Stripe config', error);
                setStripePromise(null);
            } finally {
                setLoadingKey(false);
            }
        };

        loadKey();
    }, [open]);

    const content = () => {
        if (loadingKey) {
            return (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                    <CircularProgress size={28} />
                    <Typography variant="body2" sx={{ mt: 1 }}>Loading payment config...</Typography>
                </Box>
            );
        }

        if (stripePromise) {
            return (
                <Elements stripe={stripePromise}>
                    <PaymentForm amount={amount} subtotal={subtotal} tax={tax} onSuccess={onSuccess} onClose={onClose} showTips={showTips} />
                </Elements>
            );
        }

        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="error" gutterBottom>
                    Payment system is not configured for this restaurant.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Ask an admin to add Stripe keys in payment settings.
                </Typography>
                <Button onClick={onClose} sx={{ mt: 2 }}>Close</Button>
            </Box>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Online Payment</DialogTitle>
            <DialogContent>{content()}</DialogContent>
        </Dialog>
    );
};

export default PaymentModal;
