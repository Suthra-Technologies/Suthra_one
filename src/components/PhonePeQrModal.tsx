import React, { useEffect, useRef, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    CircularProgress,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { phonePeAPI } from '../services/api';
import { toast } from 'react-hot-toast';

interface PhonePeQrModalProps {
    open: boolean;
    onClose: () => void;
    amount: number;
    /** Called with the PhonePe merchantTransactionId once payment is COMPLETED. */
    onSuccess: (merchantTransactionId: string) => void;
    /** When set, uses the public (no-auth) slug-based endpoints — for guest/kiosk. */
    tenantSlug?: string;
}

/**
 * In-counter PhonePe payment for India tenants (POS / kiosk).
 * Requests a dynamic UPI QR from the backend, renders it for the customer to
 * scan, and reconciles via status polling + the realtime `paymentStatus`
 * socket event (same channel PaymentModal uses for Stripe).
 */
const PhonePeQrModal: React.FC<PhonePeQrModalProps> = ({ open, onClose, amount, onSuccess, tenantSlug }) => {
    const initiate = () =>
        tenantSlug
            ? phonePeAPI.publicInitiate(tenantSlug, { amount, instrument: 'UPI_QR' })
            : phonePeAPI.posInitiate({ amount });
    const checkStatus = (id: string) =>
        tenantSlug ? phonePeAPI.publicStatus(id) : phonePeAPI.status(id);
    const [loading, setLoading] = useState(false);
    const [qrValue, setQrValue] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const txnRef = useRef<string | null>(null);
    const settledRef = useRef(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const cleanup = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };

    const settleSuccess = (txnId: string) => {
        if (settledRef.current) return;
        settledRef.current = true;
        cleanup();
        setStatus('Payment received');
        toast.success('Payment received');
        onSuccess(txnId);
    };

    useEffect(() => {
        if (!open) return;
        settledRef.current = false;
        txnRef.current = null;
        setQrValue(null);
        setError(null);
        setStatus('Generating QR…');
        setLoading(true);

        let cancelled = false;

        (async () => {
            try {
                const { data } = await initiate();
                if (cancelled) return;
                txnRef.current = data.merchantTransactionId;
                const value = data.qrData || data.intentUrl;
                if (!value) {
                    setError('Could not generate a PhonePe QR. Check PhonePe settings.');
                    setStatus('');
                    return;
                }
                setQrValue(value);
                setStatus('Waiting for customer to pay…');

                // Poll status as the primary reconciliation (webhook is best-effort).
                pollRef.current = setInterval(async () => {
                    const current = txnRef.current;
                    if (!current || settledRef.current) return;
                    try {
                        const res = await checkStatus(current);
                        if (res.data?.state === 'COMPLETED' || res.data?.paid) {
                            settleSuccess(current);
                        } else if (res.data?.state === 'FAILED') {
                            cleanup();
                            setError('Payment failed or was cancelled.');
                            setStatus('');
                        }
                    } catch {
                        /* transient — keep polling */
                    }
                }, 3000);
            } catch (err: any) {
                if (!cancelled) {
                    setError(err?.response?.data?.message || 'Failed to start PhonePe payment');
                    setStatus('');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        // Realtime confirmation via socket (dispatched as a window event in SocketContext).
        const handler = (evt: any) => {
            const detail = evt.detail || {};
            const id = detail.merchantTransactionId || detail.paymentIntentId;
            const current = txnRef.current;
            if (!current || !id || id !== current) return;
            if (detail.event === 'payment_succeeded' || detail.status === 'paid') {
                settleSuccess(current);
            } else if (detail.event === 'payment_failed') {
                cleanup();
                setError(detail.error || 'Payment failed.');
                setStatus('');
            }
        };
        window.addEventListener('paymentStatus', handler);

        return () => {
            cancelled = true;
            cleanup();
            window.removeEventListener('paymentStatus', handler);
        };
    }, [open, amount]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Pay with PhonePe / UPI</DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                        ₹{amount.toFixed(2)}
                    </Typography>

                    {loading && (
                        <Box sx={{ py: 4 }}>
                            <CircularProgress />
                            <Typography variant="body2" sx={{ mt: 1 }}>{status}</Typography>
                        </Box>
                    )}

                    {!loading && qrValue && (
                        <Box sx={{ py: 2 }}>
                            <Box sx={{ display: 'inline-block', p: 2, bgcolor: '#fff', borderRadius: 2 }}>
                                <QRCodeSVG value={qrValue} size={220} />
                            </Box>
                            <Typography variant="body2" sx={{ mt: 2 }}>
                                Scan with any UPI app (PhonePe, GPay, Paytm)
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
                                <CircularProgress size={16} />
                                <Typography variant="caption" color="text.secondary">{status}</Typography>
                            </Box>
                        </Box>
                    )}

                    {error && (
                        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                            {error}
                        </Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
};

export default PhonePeQrModal;
