import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

type Props = {
    feature: string;
    guestAllowed?: boolean; // if true, guests (no login) can access this route
};

export const RequireFeature: React.FC<Props> = ({ feature, guestAllowed = false }) => {
    const { user, activeRole, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Guest access allowed for customer-facing routes (e.g. catering page, table booking)
    if (!user && guestAllowed) {
        return <Outlet />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    // Superadmin bypass — sees everything
    if (user.roles?.includes('superadmin')) {
        return <Outlet />;
    }

    // Customer bypass — customers access features based on the restaurant's plan,
    // but the plan may not be populated in their auth token. Always allow customer-facing routes.
    if (activeRole === 'customer') {
        return <Outlet />;
    }

    const tenant: any = user.tenant;
    if (tenant && typeof tenant === 'object') {
        // Access features from populated currentPlan
        const features = tenant.currentPlan?.features || [];
        if (features.includes(feature)) {
            return <Outlet />;
        }
    }

    return <Navigate to="/unauthorized" replace />;
};
