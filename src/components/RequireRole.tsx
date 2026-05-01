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
        console.log('RequireRole: No user found, redirecting to login');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Superadmin doesn't need a tenant
    const isSuperAdmin = user.role === 'superadmin' || user.roles?.includes('superadmin');

    // For non-superadmin users, require tenant
    if (!isSuperAdmin && !tenantSlug) {
        console.log('RequireRole: No tenantSlug found for non-superadmin, redirecting to login. User:', user.email);
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role not permitted → unauthorized page. Use hasRole to check against the active role.
    // Superadmin bypasses specific role checks within a tenant
    if (!isSuperAdmin && !hasRole(allowedRoles)) {
        // Fallback: check if the user's static role matches if hasRole fails or activeRole isn't set yet (though it should be)
        if (!allowedRoles.includes(user.role)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    // All good – render nested route(s)
    return <Outlet />;
};