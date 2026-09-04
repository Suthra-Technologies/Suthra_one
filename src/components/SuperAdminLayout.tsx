import {
    Dashboard as DashboardIcon,
    LocalShipping as DeliveryIcon,
    ContactPage as DemoIcon,
    Email as EmailIcon,
    ExpandLess,
    ExpandMore,
    History as HistoryIcon,
    Assessment as LogIcon,
    Logout,
    Menu as MenuIcon,
    Person as PersonIcon,
    CardMembership as PlansIcon,
    Receipt as ReceiptIcon,
    Settings as SettingsIcon,
    Store as StoreIcon,
    SupportAgent as SupportIcon,
    Group as TeamIcon,
    DirectionsBike as UberDirectIcon,
    Category as MaterialProviderIcon
} from '@mui/icons-material';
import {
    alpha,
    AppBar,
    Avatar,
    Box,
    Collapse,
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
    TextField,
    Toolbar,
    Typography,
} from '@mui/material';
import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import SuperAdminNotifications from './SuperAdminNotifications';
import brandIcon from '../assets/images/Images/Home/LogoIcon.webp';

const DRAWER_WIDTH = 280;

const SuperAdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [openGroups, setOpenGroups] = React.useState<{ [key: string]: boolean }>(() => {
        const initial: { [key: string]: boolean } = {};
        // Check if current path matches any of the log paths to auto-expand
        const logPaths = [
            '/superadmin/admin-logs',
            '/superadmin/sms-logs',
            '/superadmin/email-logs',
            '/superadmin/logs/stores',
            '/superadmin/logs/plans',
            '/superadmin/logs/demo-requests',
            '/superadmin/logs/tickets'
        ];
        if (logPaths.some(path => window.location.pathname.startsWith(path))) {
            initial['System Logs'] = true;
        }
        return initial;
    });

    // Pull-to-refresh for mobile apps
    usePullToRefresh();

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

    const toggleGroup = (label: string) => {
        setOpenGroups((prev) => ({
            ...prev,
            [label]: !prev[label],
        }));
    };

    const menuItems = [
        { path: '/superadmin', label: 'Dashboard', icon: <DashboardIcon /> },
        { path: '/superadmin/tenants', label: 'Stores', icon: <StoreIcon />, permKey: 'stores' },
        { path: '/superadmin/plans', label: 'Subscription Plans', icon: <PlansIcon />, permKey: 'plans' },
        { path: '/superadmin/invoices', label: 'Invoices', icon: <ReceiptIcon />, permKey: 'invoices' },
        { path: '/superadmin/delivery-reports', label: 'Delivery Reports', icon: <DeliveryIcon />, permKey: 'delivery' },
        { path: '/superadmin/demo-requests', label: 'Demo Requests', icon: <DemoIcon />, permKey: 'demo_requests' },
        { path: '/superadmin/uber-direct', label: 'Uber Direct', icon: <UberDirectIcon />, permKey: 'delivery' },
        { path: '/superadmin/tickets', label: 'Support Tickets', icon: <SupportIcon />, permKey: 'tickets' },
        { path: '/superadmin/material-providers', label: 'Material Providers', icon: <MaterialProviderIcon />, permKey: 'logs' },
        {
            label: 'System Logs',
            icon: <HistoryIcon />,
            permKey: 'logs',
            children: [
                { path: '/superadmin/admin-logs', label: 'Activity Log', icon: <HistoryIcon /> },
                { path: '/superadmin/sms-logs', label: 'SMS Logs', icon: <ReceiptIcon /> },
                { path: '/superadmin/email-logs', label: 'Email Logs', icon: <EmailIcon /> },
                { path: '/superadmin/logs/stores', label: 'Stores Log', icon: <LogIcon /> },
                { path: '/superadmin/logs/plans', label: 'Plans Log', icon: <LogIcon /> },
                { path: '/superadmin/logs/demo-requests', label: 'Demo Requests Log', icon: <LogIcon /> },
                { path: '/superadmin/logs/tickets', label: 'Tickets Log', icon: <LogIcon /> },
            ]
        },
        { path: '/superadmin/team', label: 'Team', icon: <TeamIcon />, permKey: 'team' },
        { path: '/superadmin/settings', label: 'Settings', icon: <SettingsIcon />, permKey: 'settings' }
    ];

    // RBAC: Filter menu items based on user permissions
    const isRootAdmin = (user as any)?.isRootAdmin;
    const userPermissions: Array<{ module: string }> = (user as any)?.permissions || [];
    const userModules = userPermissions.map((p: any) => p.module);

    const filteredMenuItems = isRootAdmin
        ? menuItems
        : menuItems.filter(item => {
            // Dashboard is always visible
            if (!item.permKey) return true;
            return userModules.includes(item.permKey);
        });

    const isActiveRoute = (path: string) => {
        if (path === '/superadmin') return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    const drawer = (
        <Box>
            <Box 
                sx={{
                    px: 2,
                    py: 2.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    cursor: 'pointer',
                    gap: 1.35,
                }}
                onClick={() => {
                    navigate('/superadmin');
                    setMobileOpen(false);
                }}
            >
                <Box
                    component="img"
                    src={brandIcon}
                    alt="Suthra One"
                    sx={{
                        height: 52,
                        width: 'auto',
                        objectFit: 'contain',
                        flexShrink: 0,
                        filter: 'drop-shadow(0 2px 8px rgba(255,112,52,0.2))',
                    }}
                />
                <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.55, lineHeight: 1 }}>
                        <Typography
                            component="span"
                            sx={{
                                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                                fontWeight: 800,
                                fontSize: '1.15rem',
                                letterSpacing: '-0.03em',
                                color: '#1C2434',
                                lineHeight: 1.05,
                            }}
                        >
                            Suthra
                        </Typography>
                        <Typography
                            component="span"
                            sx={{
                                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                                fontWeight: 800,
                                fontSize: '1.15rem',
                                letterSpacing: '-0.03em',
                                color: '#FF7034',
                                lineHeight: 1.05,
                            }}
                        >
                            One
                        </Typography>
                    </Box>
                    <Typography
                        sx={{
                            fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            color: '#7E8DA5',
                            textTransform: 'uppercase',
                            lineHeight: 1.2,
                            mt: 0.35,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        ALL-IN-ONE POS SYSTEM
                    </Typography>
                </Box>
            </Box>
            <Divider />

            <List sx={{ px: 1, py: 2 }}>
                {filteredMenuItems.map((item) => {
                    const hasChildren = !!item.children;
                    const isOpen = openGroups[item.label] || false;
                    const active = hasChildren
                        ? item.children.some((child) => isActiveRoute(child.path))
                        : isActiveRoute(item.path || '');

                    return (
                        <React.Fragment key={item.label}>
                            <ListItem disablePadding>
                                <ListItemButton
                                    onClick={() => {
                                        if (hasChildren) {
                                            toggleGroup(item.label);
                                        } else if (item.path) {
                                            navigate(item.path);
                                            setMobileOpen(false);
                                        }
                                    }}
                                    selected={active}
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
                                            color: active ? 'error.main' : 'text.secondary',
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.label}
                                        sx={{
                                            '& .MuiListItemText-primary': {
                                                fontSize: '0.875rem',
                                                fontWeight: active ? 600 : 400,
                                                color: active ? 'error.main' : 'text.primary',
                                            },
                                        }}
                                    />
                                    {hasChildren && (isOpen ? <ExpandLess sx={{ color: active ? 'error.main' : 'text.secondary' }} /> : <ExpandMore sx={{ color: active ? 'error.main' : 'text.secondary' }} />)}
                                </ListItemButton>
                            </ListItem>
                            {hasChildren && (
                                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding sx={{ pl: 3 }}>
                                        {item.children.map((child) => {
                                            const childActive = isActiveRoute(child.path);
                                            return (
                                                <ListItem key={child.path} disablePadding>
                                                    <ListItemButton
                                                        onClick={() => {
                                                            navigate(child.path);
                                                            setMobileOpen(false);
                                                        }}
                                                        selected={childActive}
                                                        sx={{
                                                            borderRadius: 1,
                                                            mb: 0.5,
                                                            py: 0.5,
                                                            '&.Mui-selected': {
                                                                bgcolor: alpha('#d32f2f', 0.08),
                                                                '&:hover': {
                                                                    bgcolor: alpha('#d32f2f', 0.12),
                                                                },
                                                            },
                                                            '&:hover': {
                                                                bgcolor: alpha('#d32f2f', 0.04),
                                                            },
                                                        }}
                                                    >
                                                        <ListItemIcon
                                                            sx={{
                                                                minWidth: 32,
                                                                color: childActive ? 'error.main' : 'text.secondary',
                                                            }}
                                                        >
                                                            {React.cloneElement(child.icon, { sx: { fontSize: '1.2rem' } })}
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary={child.label}
                                                            sx={{
                                                                '& .MuiListItemText-primary': {
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: childActive ? 600 : 400,
                                                                    color: childActive ? 'error.main' : 'text.primary',
                                                                },
                                                            }}
                                                        />
                                                    </ListItemButton>
                                                </ListItem>
                                            );
                                        })}
                                    </List>
                                </Collapse>
                            )}
                        </React.Fragment>
                    );
                })}
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
                        {/* Replace with Search box for  Stores, invoices, plans, demo requests, tickets, etc. */}
                        <TextField
                            label="Search"
                            variant="outlined"
                            size="small"
                            sx={{ width: 200 }}
                        />
                    </Typography>
                    <SuperAdminNotifications />
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
                <MenuItem onClick={() => navigate('/superadmin/profile')}>
                    <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                    Profile
                </MenuItem>
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

export default SuperAdminLayout;
