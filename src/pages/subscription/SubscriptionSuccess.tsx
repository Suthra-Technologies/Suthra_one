import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Card, CardContent, CircularProgress } from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { subscriptionAPI, phonePeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { isSubdomainAccess } from '../../utils/tenant.utils';

const SubscriptionSuccess: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const phonePeTxn = searchParams.get('phonepe_txn');
    const [verifying, setVerifying] = useState(true);
    const [success, setSuccess] = useState(false);
    const { tenantSlug, refreshProfile } = useAuth();

    const dashboardPath = isSubdomainAccess() ? '/dashboard' : (tenantSlug ? `/${tenantSlug}/dashboard` : '/login');

    useEffect(() => {
        const verify = async () => {
            // PhonePe return — poll status (which fulfills the purchase server-side).
            if (phonePeTxn) {
                try {
                    let paid = false;
                    for (let i = 0; i < 5; i++) {
                        const res = await phonePeAPI.status(phonePeTxn);
                        if (res?.data?.state === 'COMPLETED' || res?.data?.paid) { paid = true; break; }
                        if (res?.data?.state === 'FAILED') break;
                        await new Promise(r => setTimeout(r, 2000));
                    }
                    if (!paid) throw new Error('Payment not completed');
                    setSuccess(true);
                    toast.success('Payment verified! Your subscription is active.');
                    try { await refreshProfile(); } catch { /* ignore */ }
                } catch (error) {
                    console.error('PhonePe verification failed:', error);
                    toast.error('Could not verify payment status. Please contact support.');
                } finally {
                    setVerifying(false);
                }
                return;
            }

            if (!sessionId) {
                setVerifying(false);
                return;
            }

            try {
                const response = await subscriptionAPI.verifySession(sessionId);
                if (!response?.data?.success) {
                    throw new Error(response?.data?.status || 'Payment not verified');
                }
                setSuccess(true);
                localStorage.removeItem('pending_registration_form');
                toast.success('Payment verified! Your subscription is active.');
                // Refresh profile to get the updated subscription status from backend
                try {
                    await refreshProfile();
                } catch (refreshError) {
                    console.error('Failed to refresh profile:', refreshError);
                }
            } catch (error) {
                console.error('Verification failed:', error);
                toast.error('Could not verify payment status. Please contact support.');
            } finally {
                setVerifying(false);
            }
        };

        verify();
    }, [sessionId, phonePeTxn]);

    return (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <Card sx={{ maxWidth: 600, textAlign: 'center' }}>
                <CardContent sx={{ p: 4 }}>
                    {verifying ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <CircularProgress />
                            <Typography>Verifying payment...</Typography>
                        </Box>
                    ) : success ? (
                        <>
                            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                            <Typography variant="h4" gutterBottom fontWeight="bold">
                                Payment Successful!
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                Thank you for subscribing. Your subscription is now active and you have full access to all features.
                            </Typography>
                            {sessionId && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                                    Session ID: {sessionId}
                                </Typography>
                            )}
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => navigate(dashboardPath)}
                            >
                                Go to Dashboard
                            </Button>
                        </>
                    ) : (
                        <>
                            <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
                            <Typography variant="h4" gutterBottom fontWeight="bold">
                                Verification Failed
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                We couldn't verify your payment automatically. If you have paid, please contact support with your Session ID.
                            </Typography>
                            {sessionId && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                                    Session ID: {sessionId}
                                </Typography>
                            )}
                            <Button
                                variant="outlined"
                                onClick={() => navigate('/support')}
                            >
                                Contact Support
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default SubscriptionSuccess;
