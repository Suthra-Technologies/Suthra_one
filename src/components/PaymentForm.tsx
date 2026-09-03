import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { paymentsAPI } from '../services/api';
import { toast } from 'react-hot-toast';


interface PaymentFormProps {
    amount: number;
    onSuccess: (paymentIntentId: string) => void;
    onCancel: () => void;
}

const SUCCESS_STATUSES = new Set(['succeeded']);
const FAILURE_STATUSES = new Set(['canceled', 'requires_payment_method', 'failed']);
const PROCESSING_STATUSES = new Set(['processing', 'requires_action', 'requires_confirmation', 'requires_capture']);

const CheckoutForm: React.FC<PaymentFormProps> = ({ amount, onSuccess, onCancel }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const waitForVerifiedIntent = async (intentId: string, timeout = 60000) => {
        const start = Date.now();

        while (Date.now() - start < timeout) {
            const res = await paymentsAPI.verifyIntent(intentId);
            const status = res.data?.status;

            if (SUCCESS_STATUSES.has(status)) {
                return { ok: true as const, status };
            }

            if (FAILURE_STATUSES.has(status)) {
                return { ok: false as const, status, error: res.data?.lastPaymentError?.message || 'Payment failed' };
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        return { ok: false as const, status: 'timeout', error: 'Payment is still processing. Please verify before retrying.' };
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Create PaymentIntent on backend
            const { data } = await paymentsAPI.createIntent({ amount });
            const clientSecret = data.clientSecret;

            // 2. Confirm Card Payment
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement)!,
                },
            });

            if (result.error) {
                setError(result.error.message || 'Payment failed');
                toast.error(result.error.message || 'Payment failed');
            } else if (result.paymentIntent && SUCCESS_STATUSES.has(result.paymentIntent.status)) {
                toast.success('Payment successful!');
                onSuccess(result.paymentIntent.id);
            } else if (result.paymentIntent && PROCESSING_STATUSES.has(result.paymentIntent.status)) {
                const verified = await waitForVerifiedIntent(result.paymentIntent.id);
                if (verified.ok) {
                    toast.success('Payment confirmed');
                    onSuccess(result.paymentIntent.id);
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
        } catch (err: any) {
            console.error('Payment error:', err);
            setError(err.message || 'An unexpected error occurred');
            toast.error('Payment failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, mb: 2 }}>
                <CardElement
                    options={{
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
                    }}
                />
            </Box>
            {error && (
                <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                    {error}
                </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button onClick={onCancel} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={!stripe || loading}
                >
                    {loading ? <CircularProgress size={24} /> : `Pay $${amount.toFixed(2)}`}
                </Button>
            </Box>
        </form>
    );
};

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
    const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
    const [loadingKey, setLoadingKey] = useState(false);

    useEffect(() => {
        const loadKey = async () => {
            setLoadingKey(true);
            try {
                const { data } = await paymentsAPI.getConfig();
                const key = data?.publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
                if (key) {
                    setStripePromise(loadStripe(key));
                } else {
                    setStripePromise(null);
                }
            } catch (error) {
                console.error('Failed to fetch Stripe config', error);
                setStripePromise(null);
            } finally {
                setLoadingKey(false);
            }
        };

        loadKey();
    }, []);

    if (loadingKey) {
        return (
            <Box p={2} textAlign="center">
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ mt: 1 }}>Loading payment config...</Typography>
            </Box>
        );
    }

    if (!stripePromise) {
        return (
            <Box p={2}>
                <Typography color="error">
                    Payment system unavailable (Stripe key missing).
                </Typography>
                <Button onClick={props.onCancel} sx={{ mt: 1 }}>Close</Button>
            </Box>
        );
    }

    return (
        <Elements stripe={stripePromise}>
            <CheckoutForm {...props} />
        </Elements>
    );
};

export default PaymentForm;
