import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

type Props = {
    allowedRoles: string[]; // e.g. ['admin']
};

export const RequireRole: React.FC<Props> = ({ allowedRoles }) => {
    const { user, isLoading, hasRole, tenantSlug } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Not logged in → go to login page
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Superadmin doesn't need a tenant
    const isSuperAdmin = user.role === 'superadmin' || user.roles?.includes('superadmin');

    // For non-superadmin users, require tenant
    if (!isSuperAdmin && !tenantSlug) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role not permitted → unauthorized page. Use hasRole to check against the active role.
    if (!hasRole(allowedRoles)) {
        // Fallback: check if the user's static role matches if hasRole fails or activeRole isn't set yet (though it should be)
        if (!allowedRoles.includes(user.role)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    // All good – render nested route(s)
    return <Outlet />;
};