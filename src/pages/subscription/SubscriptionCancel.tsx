import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Cancel } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isSubdomainAccess } from '../../utils/tenant.utils';

const SubscriptionCancel: React.FC = () => {
    const navigate = useNavigate();
    const { tenantSlug } = useAuth();
    
    const dashboardPath = isSubdomainAccess() ? '/dashboard' : (tenantSlug ? `/${tenantSlug}/dashboard` : '/login');

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
