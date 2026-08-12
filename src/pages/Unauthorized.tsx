import { Box, Typography, Button } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

const FEATURE_LABELS: Record<string, string> = {
    dashboard: 'Dashboard', orders: 'Orders', pos: 'Point of Sale', tables: 'Tables',
    bookings: 'Bookings', kitchen: 'Kitchen (Display & Orders)', menu: 'Menu',
    globaladdons: 'Global Add-ons', promocoupons: 'Promo Code & Coupons', disputes: 'Disputes',
    catering: 'Catering', inventory: 'Inventory', wastemanagement: 'Waste Management',
    purchaseorders: 'Purchase Orders', vendors: 'Vendors', materialproviders: 'Material Providers',
    recipes: 'Recipes', users: 'Users', customers: 'Customers', attendance: 'Attendance',
    assets: 'Asset & Document Management', expenses: 'Expenses', customisescreens: 'Customise Screens',
    reports: 'Reports', serviceusage: 'Service Usage', customeractivities: 'Customer Activities',
    invoices: 'Invoices', auditlogs: 'Audit Logs', subscription: 'Subscription',
    support: 'Super Admin Support', customersupport: 'Customer Tickets', settings: 'Settings',
    managenotifications: 'Manage Notifications',
};

export const Unauthorized = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as { reason?: string; feature?: string } | null;

    if (state?.reason === 'plan') {
        const featureLabel = state.feature ? (FEATURE_LABELS[state.feature] || state.feature) : 'this feature';
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h4" color="error">
                    🔒 Upgrade required
                </Typography>
                <Typography sx={{ mt: 2 }}>
                    Your current subscription plan doesn't include <strong>{featureLabel}</strong>.
                    Upgrade your plan to unlock this feature.
                </Typography>
                <Button
                    variant="contained"
                    sx={{ mt: 3 }}
                    onClick={() => navigate('/subscription')}
                >
                    View Plans
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" color="error">
                🚫 You don't have permission to view this page.
            </Typography>
            <Typography sx={{ mt: 2 }}>
                If you think this is a mistake, please contact your system administrator.
            </Typography>
        </Box>
    );
};
