import React, { useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Cancel } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isSubdomainAccess } from '../../utils/tenant.utils';
import { subscriptionAPI } from '../../services/api';

const SubscriptionCancel: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const { tenantSlug } = useAuth();
    
    const dashboardPath = isSubdomainAccess() ? '/dashboard' : (tenantSlug ? `/${tenantSlug}/dashboard` : '/login');

    useEffect(() => {
        if (sessionId) {
            subscriptionAPI.verifySession(sessionId).catch(err => {
                console.error('Error triggering cancellation verification:', err);
            });
        }
    }, [sessionId]);

    return (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <Card sx={{ maxWidth: 600, textAlign: 'center' }}>
                <CardContent sx={{ p: 4 }}>
                    <Cancel sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
                    <Typography variant="h4" gutterBottom fontWeight="bold">
                        Payment Cancelled
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        Your payment was cancelled. No charges have been made to your account.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                            variant="outlined"
                            size="large"
                            onClick={() => navigate(-1)}
                        >
                            Try Again
                        </Button>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => navigate(dashboardPath)}
                        >
                            Go to Dashboard
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default SubscriptionCancel;
