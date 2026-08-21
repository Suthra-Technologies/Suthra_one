import {
    Dashboard as DashboardIcon,
    Inventory2 as InventoryIcon,
    Logout,
    Menu as MenuIcon,
    Person as PersonIcon,
    ReceiptLong as OrdersIcon,
} from '@mui/icons-material';
import {
    alpha,
    AppBar,
    Avatar,
    Box,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
} from '@mui/material';
import React from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

const DRAWER_WIDTH = 280;

/** Portal accent — kept distinct from the superadmin red so the two never look alike. */
const ACCENT = '#00695c';

/**
 * Shell for the Material Provider portal. Mirrors SuperAdminLayout: providers are
 * platform-level accounts with no tenant, so they get their own top-level portal
 * rather than a page inside a restaurant's app.
 */
const MaterialProviderLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [mobileOpen, setMobileOpen] = React.useState(false);

    usePullToRefresh();

    // A freshly provisioned account must set its own password before it can
    // reach anything. Rendering the redirect here (rather than only at login)
    // means a bookmarked deep link or a page reload cannot slip past it.
    if ((user as any)?.mustChangePassword) {
        return <Navigate to="/provider/change-password" replace />;
    }

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleProfileMenuClose = () => setAnchorEl(null);

    const handleLogout = async () => {
        handleProfileMenuClose();
        await logout();
        navigate('/login');
    };

    const menuItems = [
        { path: '/provider', label: 'Dashboard', icon: <DashboardIcon /> },
        { path: '/provider/orders', label: 'Orders', icon: <OrdersIcon /> },
        { path: '/provider/materials', label: 'My Materials', icon: <InventoryIcon /> },
    ];

    const isActiveRoute = (path: string) => {
        if (path === '/provider') return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    const providerName = (user as any)?.firstName || 'Material Provider';

    const drawer = (
        <Box>
            <Box
                sx={{ p: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => {
                    navigate('/provider');
                    setMobileOpen(false);
                }}
            >
                <Box
                    component="img"
                    src="/nexzen_logo.jpg"
                    alt="NexZen POS Logo"
                    sx={{ width: 'auto', height: 80, objectFit: 'contain', borderRadius: 1, mb: 1.5 }}
                />
                <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2, color: ACCENT }}>
                    Material Provider
                </Typography>
            </Box>
            <Divider />

            <Box sx={{ p: 2, bgcolor: alpha(ACCENT, 0.05) }}>
                <Typography variant="subtitle2" fontWeight="medium" noWrap>
                    {providerName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {user?.email}
                </Typography>
            </Box>
            <Divider />

            <List sx={{ px: 1, py: 2 }}>
                {menuItems.map((item) => {
                    const active = isActiveRoute(item.path);
                    return (
                        <ListItem key={item.path} disablePadding>
                            <ListItemButton
                                onClick={() => {
                                    navigate(item.path);
                                    setMobileOpen(false);
                                }}
                                selected={active}
                                sx={{
                                    borderRadius: 1,
                                    mb: 0.5,
                                    '&.Mui-selected': {
                                        bgcolor: alpha(ACCENT, 0.12),
                                        '&:hover': { bgcolor: alpha(ACCENT, 0.16) },
                                    },
                                    '&:hover': { bgcolor: alpha(ACCENT, 0.08) },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40, color: active ? ACCENT : 'text.secondary' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    sx={{
                                        '& .MuiListItemText-primary': {
                                            fontSize: '0.875rem',
                                            fontWeight: active ? 600 : 400,
                                            color: active ? ACCENT : 'text.primary',
                                        },
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar
                position="fixed"
                sx={{
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    ml: { md: `${DRAWER_WIDTH}px` },
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    pt: { xs: 'var(--safe-area-inset-top, env(safe-area-inset-top, 0px))', md: 0 },
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
                        Material Provider Portal
                    </Typography>
                    <IconButton onClick={handleProfileMenuOpen} color="inherit">
                        <Avatar sx={{ width: 32, height: 32, bgcolor: ACCENT }}>
                            {providerName.charAt(0)?.toUpperCase() || 'P'}
                        </Avatar>
                    </IconButton>
                </Toolbar>
            </AppBar>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleProfileMenuClose}
                onClick={handleProfileMenuClose}
            >
                <MenuItem onClick={() => navigate('/provider/profile')}>
                    <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                    Profile
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                    <Logout fontSize="small" sx={{ mr: 1 }} />
                    Logout
                </MenuItem>
            </Menu>

            <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
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

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    px: { xs: 1, sm: 2, md: 3 },
                    pb: { xs: 1.5, sm: 2, md: 3 },
                    pt: { xs: 0.25, sm: 0.75, md: 3 },
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    mt: { xs: 'calc(64px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))', md: '64px' },
                    minHeight: 'calc(100vh - 64px)',
                    backgroundColor: 'background.default',
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
};

export default MaterialProviderLayout;
