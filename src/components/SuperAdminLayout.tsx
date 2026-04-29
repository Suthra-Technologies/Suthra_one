import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    IconButton,
    Avatar,
    Menu,
    MenuItem,
    Divider,
    alpha,
} from '@mui/material';
import {
    Store as StoreIcon,
    SupportAgent as SupportIcon,
    Logout,
    Person,
    CardMembership as PlansIcon,
    Dashboard as DashboardIcon,
    Receipt as ReceiptIcon,
    Menu as MenuIcon,
    LocalShipping as DeliveryIcon,
    ContactPage as DemoIcon,
    DirectionsBike as UberDirectIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 280;

const SuperAdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleProfileMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        handleProfileMenuClose();
        await logout();
        navigate('/login');
    };

    const menuItems = [
        { path: '/superadmin', label: 'Dashboard', icon: <DashboardIcon /> },
        { path: '/superadmin/tenants', label: 'Manage Tenants', icon: <StoreIcon /> },
        { path: '/superadmin/plans', label: 'Subscription Plans', icon: <PlansIcon /> },
        { path: '/superadmin/invoices', label: 'Invoices', icon: <ReceiptIcon /> },
        { path: '/superadmin/delivery-reports', label: 'Delivery Reports', icon: <DeliveryIcon /> },
        { path: '/superadmin/demo-requests', label: 'Demo Requests', icon: <DemoIcon /> },
        { path: '/superadmin/sms-logs', label: 'SMS Logs', icon: <ReceiptIcon /> },
        { path: '/superadmin/uber-direct', label: 'Uber Direct', icon: <UberDirectIcon /> },
        { path: '/superadmin/tickets', label: 'Support Tickets', icon: <SupportIcon /> },
    ];

    const isActiveRoute = (path: string) => {
        return location.pathname === path;
    };

    const drawer = (
        <Box>
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                    Super Admin
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Platform Management
                </Typography>
            </Box>
            <Divider />

            <Box sx={{ p: 2, bgcolor: alpha('#d32f2f', 0.05) }}>
                <Typography variant="subtitle2" fontWeight="medium">
                    {user?.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    SUPERADMIN
                </Typography>
            </Box>
            <Divider />

            <List sx={{ px: 1, py: 2 }}>
                {menuItems.map((item) => (
                    <ListItem key={item.path} disablePadding>
                        <ListItemButton
                            onClick={() => {
                                navigate(item.path);
                                setMobileOpen(false);
                            }}
                            selected={isActiveRoute(item.path)}
                            sx={{
                                borderRadius: 1,
                                mb: 0.5,
                                '&.Mui-selected': {
                                    bgcolor: alpha('#d32f2f', 0.12),
                                    '&:hover': {
                                        bgcolor: alpha('#d32f2f', 0.16),
                                    },
                                },
                                '&:hover': {
                                    bgcolor: alpha('#d32f2f', 0.08),
                                },
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: 40,
                                    color: isActiveRoute(item.path) ? 'error.main' : 'text.secondary',
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.label}
                                sx={{
                                    '& .MuiListItemText-primary': {
                                        fontSize: '0.875rem',
                                        fontWeight: isActiveRoute(item.path) ? 600 : 400,
                                        color: isActiveRoute(item.path) ? 'error.main' : 'text.primary',
                                    },
                                }}
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            {/* <Box sx={{ mt: 'auto', p: 2 }}>
                <Typography variant="caption" color="text.secondary" align="center" display="block">
                    Super Admin v1.0.0
                </Typography>
            </Box> */}
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            {/* AppBar */}
            <AppBar
                position="fixed"
                sx={{
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    ml: { md: `${DRAWER_WIDTH}px` },
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
                        Super Admin Portal
                    </Typography>
                    <IconButton onClick={handleProfileMenuOpen} color="inherit">
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'error.main' }}>
                            {user?.email?.charAt(0)?.toUpperCase() || 'S'}
                        </Avatar>
                    </IconButton>
                </Toolbar>
            </AppBar>

            {/* Profile Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleProfileMenuClose}
                onClick={handleProfileMenuClose}
            >
                <MenuItem onClick={handleLogout}>
                    <Logout fontSize="small" sx={{ mr: 1 }} />
                    Logout
                </MenuItem>
            </Menu>

            <Box
                component="nav"
                sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
                aria-label="mailbox folders"
            >
                {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    px: { xs: 1, sm: 2, md: 3 },
                    pb: { xs: 1.5, sm: 2, md: 3 },
                    pt: { xs: 0.25, sm: 0.75, md: 3 },
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    mt: '64px',
                    minHeight: 'calc(100vh - 64px)',
                    backgroundColor: 'background.default',
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
};

export default SuperAdminLayout;
