import React, { useState } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  alpha,
} from '@mui/material';
import {
  ArrowBack,
  Close,
  Email as EmailIcon,
  Logout,
  Menu as MenuIcon,
  Phone as PhoneIcon,
  Place as PlaceIcon,
  Restaurant as RestaurantIcon,
  ShoppingCart,
  EventSeat,
  MenuBook,
  Home as HomeIcon,
  Person,
  History as HistoryIcon,
  Collections as CollectionsIcon,
  Info as InfoIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { useAuth } from 'src/context/AuthContext';
import { useSettings } from 'src/context/SettingsContext';
import { calcCustomerProcessingFee } from 'src/utils/processingFee';
import { useGuestCart } from 'src/context/GuestCartContext';
import { useActiveTenant } from 'src/hooks/useActiveTenant';
import { usePullToRefresh } from 'src/hooks/usePullToRefresh';
import { Capacitor } from '@capacitor/core';

const CustomerLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isNative = Capacitor.isNativePlatform();
  const showMobileUI = isMobile || isNative;
  const navigate = useNavigate();
  const location = useLocation();
  const { slug, getRelativePath } = useActiveTenant();
  const { user, logout, isLoading } = useAuth();
  const { settings, formatCurrency } = useSettings();
  const { cart, updateQuantity, addItem } = useGuestCart();
  
  const totalQuantity = cart.totalItems;
  
  const calculateTotal = () => {
      const subtotal = cart.totalAmount;
      const taxRate = settings?.restaurant?.taxRate || 0;
      const taxAmount = (subtotal * taxRate) / 100;
      // Cart preview assumes a card payment; the actual fee is finalised at checkout.
      const processingFeeAmount = calcCustomerProcessingFee({
          subtotal,
          otherCharges: taxAmount,
          restaurant: settings?.restaurant,
          feeResponsibility: settings?.system?.feeResponsibility,
          isStripePayment: true,
      }).total;
      return subtotal + processingFeeAmount + taxAmount;
  };

  const removeFromCart = (itemId: string) => {
      const itemIndex = cart.items.findIndex((c: any) => c.id === itemId);
      if (itemIndex >= 0) {
          updateQuantity(itemIndex, cart.items[itemIndex].quantity - 1);
      }
  };

  const addToCart = (item: any) => {
      const itemIndex = cart.items.findIndex((c: any) => c.id === item.id);
      if (itemIndex >= 0) {
          updateQuantity(itemIndex, cart.items[itemIndex].quantity + 1);
      }
  };

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  // Pull-to-refresh for mobile apps
  usePullToRefresh();

  const restaurant = settings?.restaurant;
  const restaurantName = (restaurant?.name || 'Restaurant').trim();

  const baseNavLinks = [
    { label: 'Home', path: getRelativePath('/customer/home'), icon: <HomeIcon fontSize="small" /> },
    { label: 'Order', path: getRelativePath('/customer/order'), icon: <ShoppingCart fontSize="small" /> },
    { label: 'Book Table', path: getRelativePath('/customer/book-table'), icon: <EventSeat fontSize="small" /> },
    { label: 'Catering', path: getRelativePath('/customer/catering'), icon: <MenuBook fontSize="small" /> },
    { label: 'Gallery', path: getRelativePath('/customer/gallery'), icon: <CollectionsIcon fontSize="small" /> },
    { label: 'About', path: getRelativePath('/customer/about'), icon: <InfoIcon fontSize="small" /> },
  ];

  // Show 'My Activity' only for logged-in customers
  const navLinks = user
    ? [...baseNavLinks, { label: 'My Activity', path: getRelativePath('/customer/bookings'), icon: <HistoryIcon fontSize="small" /> }]
    : baseNavLinks;

  const isActive = (path: string) => location.pathname === path;

  // Auth guard for public paths
  React.useEffect(() => {
    if (isLoading) return;
    const publicPaths = ['customer/order', 'customer/catering', 'customer/book-table', 'customer/gallery', 'customer/about', 'customer/home'];
    const isPublicPath = publicPaths.some(p => location.pathname.includes(p));
    const token = localStorage.getItem('jwt');
    if (!isPublicPath && (!token || !user)) {
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [user, isLoading, navigate, location.pathname]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Box sx={{ textAlign: 'center' }}>
          <RestaurantIcon sx={{ fontSize: 60, color: 'white', mb: 2, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '1.2rem' }}>Loading...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        /* Below md: let the page height follow content so short menus don’t leave a huge gap above the footer */
        minHeight: { xs: 'auto', md: '100vh' },
        bgcolor: '#fafbfc',
      }}
    >
      {/* ─── Elegant Header ─── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid',
          borderColor: 'rgba(0,0,0,0.06)',
          color: 'text.primary',
          pt: showMobileUI && isNative ? { xs: 'env(safe-area-inset-top)', md: 0 } : 0,
        }}
      >
        <Container maxWidth="lg" disableGutters sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 }, gap: { xs: 0.75, md: 2 } }}>
            {/* Mobile Back Button */}
            {showMobileUI && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {!location.pathname.match(/\/customer\/order\/?$/) && (
                  <IconButton
                    onClick={() => {
                      if (window.history.length > 1) {
                        navigate(-1);
                      } else {
                        navigate(getRelativePath('/customer/order'), { replace: true });
                      }
                    }}
                    aria-label="go back"
                    sx={{
                      mr: 0.5,
                      bgcolor: 'rgba(79,70,229,0.08)',
                      borderRadius: '10px',
                      width: 44,
                      height: 44,
                      minWidth: 44,
                      '&:hover, &:active': {
                        bgcolor: 'rgba(79,70,229,0.15)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <ArrowBack sx={{ color: 'primary.main' }} />
                  </IconButton>
                )}
              </Box>
            )}

            {/* Logo & Brand */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                flexGrow: { xs: 1, md: 0 },
                mr: { md: 4 },
                pl: { xs: 0, md: 0 },
                minWidth: 0,
              }}
              onClick={() => navigate(getRelativePath('/customer/order'))}
            >
              {restaurant?.logo ? (
                <Avatar
                  src={restaurant.logo}
                  alt={restaurant.name}
                  sx={{
                    width: { xs: 40, sm: 46 },
                    height: { xs: 40, sm: 46 },
                    border: '2px solid',
                    borderColor: 'primary.main',
                    boxShadow: '0 2px 8px rgba(79,70,229,0.15)',
                  }}
                />
              ) : (
                <Avatar
                  sx={{
                    width: { xs: 40, sm: 46 },
                    height: { xs: 40, sm: 46 },
                    bgcolor: 'primary.main',
                    boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
                  }}
                >
                  <RestaurantIcon />
                </Avatar>
              )}
              <Box sx={{ display: 'block', minWidth: 0, maxWidth: { xs: 'calc(100vw - 170px)', sm: 'none' } }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '0.85rem', sm: '1.1rem' },
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {restaurant?.name || 'Restaurant'}
                </Typography>
                <Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.7rem' }, color: 'text.secondary', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Order Online
                </Typography>
              </Box>
            </Box>

            {/* Desktop Nav Links */}
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1 }}>
                {navLinks.map((link) => (
                  <Button
                    key={link.path}
                    startIcon={link.icon}
                    onClick={() => navigate(link.path)}
                    sx={{
                      px: 2.5,
                      py: 1,
                      borderRadius: '12px',
                      textTransform: 'none',
                      fontWeight: isActive(link.path) ? 700 : 500,
                      fontSize: '0.9rem',
                      color: isActive(link.path) ? 'primary.main' : 'text.secondary',
                      bgcolor: isActive(link.path) ? 'rgba(79,70,229,0.08)' : 'transparent',
                      '&:hover': {
                        bgcolor: isActive(link.path) ? 'rgba(79,70,229,0.12)' : 'rgba(0,0,0,0.04)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {link.label}
                  </Button>
                ))}
              </Box>
            )}

            <Box sx={{ flexGrow: 1 }} />

            {/* Cart Button */}
            {cart.items.length > 0 && (
                <IconButton
                    onClick={() => setIsCartModalOpen(true)}
                    sx={{
                        mr: { xs: 1, sm: 2 },
                        bgcolor: 'rgba(79,70,229,0.08)',
                        color: 'primary.main',
                        '&:hover': { bgcolor: 'rgba(79,70,229,0.16)' },
                    }}
                >
                    <Badge badgeContent={totalQuantity} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 'bold' } }}>
                        <ShoppingCart fontSize="small" />
                    </Badge>
                </IconButton>
            )}

            {/* Auth Buttons */}
            {!user ? (
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/login', { state: { from: location.pathname } })}
                  sx={{
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 2,
                    borderColor: 'rgba(79,70,229,0.3)',
                    color: 'primary.main',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(79,70,229,0.04)' },
                  }}
                >
                  Login
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => navigate(slug ? getRelativePath('/register') : '/register', { state: { from: location.pathname } })}
                  sx={{
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 2,
                    boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
                    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                    '&:hover': {
                      boxShadow: '0 4px 16px rgba(79,70,229,0.35)',
                      background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)',
                    },
                  }}
                >
                  Register
                </Button>
              </Box>
            ) : (
              <Box>
                <Tooltip title={user?.name || user?.firstName || 'Account'}>
                  <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                    <Avatar
                      src={user?.avatar}
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: 'primary.main',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                      }}
                    >
                      {user?.name?.charAt(0)?.toUpperCase() || user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={() => setAnchorEl(null)}
                  PaperProps={{
                    elevation: 0,
                    sx: {
                      mt: 1.5,
                      minWidth: 180,
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.08)',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
                  </Box>
                  <MenuItem onClick={() => { setAnchorEl(null); navigate(getRelativePath('/customer/bookings')); }}>
                    <HistoryIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                    My Activity
                  </MenuItem>
                  <MenuItem onClick={() => { setAnchorEl(null); navigate(getRelativePath('/customer/profile')); }}>
                    <Person fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                    Profile
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={async () => { setAnchorEl(null); await logout(); navigate('/login'); }}>
                    <Logout fontSize="small" sx={{ mr: 1.5, color: 'error.main' }} />
                    <Typography color="error.main">Logout</Typography>
                  </MenuItem>
                </Menu>
              </Box>
            )}

            {/* Mobile hamburger - on far right */}
            {showMobileUI && (
              <IconButton onClick={() => setMobileOpen(true)} sx={{ ml: 0.5 }}>
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            borderRadius: '0 20px 20px 0',
            bgcolor: 'background.paper',
            pt: showMobileUI && isNative ? 'env(safe-area-inset-top)' : 0,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
            {restaurant?.logo ? (
              <Avatar src={restaurant.logo} alt={restaurant.name} sx={{ width: 36, height: 36 }} />
            ) : (
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                <RestaurantIcon fontSize="small" />
              </Avatar>
            )}
            <Typography fontWeight={700} fontSize="1rem" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {restaurant?.name || 'Restaurant'}
            </Typography>
          </Box>
          <IconButton onClick={() => setMobileOpen(false)} size="small">
            <Close />
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ px: 1, py: 1 }}>
          {navLinks.map((link) => (
            <ListItem key={link.path} disablePadding>
              <ListItemButton
                onClick={() => { navigate(link.path); setMobileOpen(false); }}
                sx={{
                  borderRadius: '12px',
                  mb: 0.5,
                  bgcolor: isActive(link.path) ? 'rgba(79,70,229,0.08)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(79,70,229,0.06)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive(link.path) ? 'primary.main' : 'text.secondary' }}>
                  {link.icon}
                </ListItemIcon>
                <ListItemText
                  primary={link.label}
                  primaryTypographyProps={{
                    fontWeight: isActive(link.path) ? 700 : 500,
                    color: isActive(link.path) ? 'primary.main' : 'text.primary',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* ─── Main Content ─── */}
      <Box
        component="main"
        sx={{
          flexGrow: { xs: 0, md: 1 },
          py: { xs: 2, md: 3 },
          px: { xs: 1, sm: 2 },
          minHeight: { xs: 0, md: 'calc(100vh - 72px - 280px)' },
        }}
      >
        <Outlet />
      </Box>

      {/* ─── Premium Footer ─── */}
      <Box
        component="footer"
        sx={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          color: 'white',
          mt: { xs: 0, md: 'auto' },
        }}
      >
        {/* Main Footer Content */}
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr' },
              gap: { xs: 4, md: 6 },
            }}
          >
            {/* Restaurant Info */}
            <Box sx={{ pl: { xs: 0, md: 0 }, width: '100%', textAlign: 'left !important' }}>
              {/* Mobile: strict vertical stack (logo -> title -> subtitle) */}
              <Box 
                sx={{ 
                  display: { xs: 'flex', md: 'none' }, 
                  flexDirection: 'column', 
                  alignItems: 'flex-start !important', 
                  justifyContent: 'flex-start !important',
                  mb: 3,
                  width: '100%',
                }}
              >
                {restaurant?.logo ? (
                  <Avatar
                    src={restaurant.logo}
                    alt={restaurant.name}
                    sx={{
                      width: 46,
                      height: 46,
                      border: '3px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      mb: 1.5,
                      alignSelf: 'flex-start !important'
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: 46,
                      height: 46,
                      bgcolor: 'rgba(79,70,229,0.6)',
                      border: '3px solid rgba(255,255,255,0.2)',
                      mb: 1.5,
                      alignSelf: 'flex-start !important'
                    }}
                  >
                    <RestaurantIcon sx={{ fontSize: 30 }} />
                  </Avatar>
                )}
                <Typography
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                    color: '#FFFFFF !important',
                    fontSize: '1.55rem !important',
                    textAlign: 'left !important',
                    width: 'fit-content !important',
                    mb: 0.5,
                    alignSelf: 'flex-start !important',
                    fontFamily: '"Outfit", "Inter", "Roboto", sans-serif'
                  }}
                >
                  {restaurantName}
                </Typography>
                <Typography 
                  sx={{ 
                    color: 'rgba(255,255,255,0.7) !important', 
                    fontSize: '0.85rem !important', 
                    fontWeight: 500, 
                    mt: 0.3, 
                    textAlign: 'left !important', 
                    width: 'fit-content !important',
                    alignSelf: 'flex-start !important'
                  }}
                >
                  Delicious Food, Delivered Fresh
                </Typography>
              </Box>

              {/* Desktop/tablet: keep horizontal brand alignment */}
              <Box
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 3,
                }}
              >
                {restaurant?.logo ? (
                  <Avatar
                    src={restaurant.logo}
                    alt={restaurant.name}
                    sx={{
                      width: 46,
                      height: 46,
                      border: '3px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: 46,
                      height: 46,
                      bgcolor: 'rgba(79,70,229,0.6)',
                      border: '3px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    <RestaurantIcon sx={{ fontSize: 30 }} />
                  </Avatar>
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                      color: '#ffffff',
                      fontSize: '1.5rem',
                      wordBreak: 'break-word',
                    }}
                  >
                    {restaurantName}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 500, mt: 0.3 }}>
                    Delicious Food, Delivered Fresh
                  </Typography>
                </Box>
              </Box>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: '0.9rem',
                  lineHeight: 1.7,
                  maxWidth: 400,
                  textAlign: 'left',
                }}
              >
                Experience the finest dining with our carefully curated menu.
                Order online for delivery or takeaway, book a table, or plan your next event with our catering services.
              </Typography>
            </Box>

            {/* Contact Details */}
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  mb: 2.5,
                  fontSize: '1rem',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    bottom: -8,
                    width: 30,
                    height: 3,
                    borderRadius: '4px',
                    background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
                  },
                }}
              >
                Contact Us
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
                {restaurant?.address && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <PlaceIcon sx={{ fontSize: 20, color: 'primary.main', mt: 0.3 }} />
                    <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                      {restaurant.address}
                    </Typography>
                  </Box>
                )}
                {restaurant?.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PhoneIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                    <Link
                      href={`tel:+${restaurant.dialCode || '1'}${restaurant.phone}`}
                      sx={{
                        color: 'rgba(255,255,255,0.75)',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        '&:hover': { color: 'white' },
                        transition: 'color 0.2s',
                      }}
                    >
                      +{restaurant.dialCode || '1'} {restaurant.phone}
                    </Link>
                  </Box>
                )}
                {restaurant?.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <EmailIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                    <Link
                      href={`mailto:${restaurant.email}`}
                      sx={{
                        color: 'rgba(255,255,255,0.75)',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        '&:hover': { color: 'white' },
                        transition: 'color 0.2s',
                      }}
                    >
                      {restaurant.email}
                    </Link>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Quick Links */}
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  mb: 2.5,
                  fontSize: '1rem',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    bottom: -8,
                    width: 30,
                    height: 3,
                    borderRadius: '4px',
                    background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
                  },
                }}
              >
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3 }}>
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    component="button"
                    onClick={() => { navigate(link.path); window.scrollTo(0, 0); }}
                    sx={{
                      color: 'rgba(255,255,255,0.65)',
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      '&:hover': { color: 'white', transform: 'translateX(4px)' },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
              </Box>
            </Box>
          </Box>
        </Container>

        {/* Bottom Bar — platform attribution */}
        <Box
          sx={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            py: { xs: 2, sm: 2.5 },
          }}
        >
          <Container maxWidth="lg">
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: { xs: 1.25, md: 2 },
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: { xs: '0.72rem', sm: '0.8rem' }, order: { xs: 1, md: 1 } }}>
                © {new Date().getFullYear()} NexZentek. All rights reserved.
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: { xs: 0.75, sm: 1 },
                  order: { xs: 3, md: 2 },
                }}
              >
                <Typography
                  component={RouterLink}
                  to="/privacy-policy"
                  sx={{
                    fontSize: { xs: '0.72rem', sm: '0.78rem' },
                    color: 'rgba(255,255,255,0.65)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    '&:hover': { color: 'rgba(129, 140, 248, 1)', textDecoration: 'underline' },
                  }}
                >
                  Privacy Policy
                </Typography>
                <Typography component="span" sx={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.75rem', userSelect: 'none' }}>
                  |
                </Typography>
                <Typography
                  component={RouterLink}
                  to="/terms-and-conditions"
                  sx={{
                    fontSize: { xs: '0.72rem', sm: '0.78rem' },
                    color: 'rgba(255,255,255,0.65)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    '&:hover': { color: 'rgba(129, 140, 248, 1)', textDecoration: 'underline' },
                  }}
                >
                  Terms & Conditions
                </Typography>
              </Box>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  order: { xs: 2, md: 3 },
                }}
              >
                Developed by{' '}
                <Link
                  href="https://nexzentek.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ 
                    color: '#818cf8 !important',
                    fontWeight: 800,
                    '&:hover': { color: '#a5b4fc !important' }
                  }}
                >
                  NexZenTek
                </Link>
              </Typography>
            </Box>
          </Container>
        </Box>
      </Box>

      {/* Pulse animation for loader */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
      `}</style>

      {/* Cart Modal */}
      <Dialog
          open={isCartModalOpen}
          onClose={() => setIsCartModalOpen(false)}
          fullWidth
          maxWidth="xs"
          PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="900">Your Cart</Typography>
              <IconButton onClick={() => setIsCartModalOpen(false)} size="small" sx={{ color: 'text.secondary' }}>
                  <Close />
              </IconButton>
          </DialogTitle>
          <DialogContent sx={{ px: 2, pb: 3 }}>
              {cart.items.length === 0 ? (
                  <Typography color="text.secondary" textAlign="center" py={4}>Your cart is empty.</Typography>
              ) : (
                  <Stack spacing={2} sx={{ mt: 1 }}>
                      {cart.items.map((item) => (
                          <Box key={item.cartId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                                  <Typography variant="subtitle2" fontWeight="700" noWrap>{item.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                      {formatCurrency(item.price)} x {item.quantity}
                                  </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2, px: 1, py: 0.5 }}>
                                  <IconButton size="small" onClick={() => removeFromCart(item.id)} sx={{ p: 0.5 }}>
                                      <RemoveIcon fontSize="small" color="primary.main" />
                                  </IconButton>
                                  <Typography fontWeight="bold" color="primary.main">{item.quantity}</Typography>
                                  <IconButton size="small" onClick={() => addToCart(item)} sx={{ p: 0.5 }}>
                                      <AddIcon fontSize="small" color="primary.main" />
                                  </IconButton>
                              </Box>
                          </Box>
                      ))}
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography fontWeight="600" color="text.secondary">Subtotal</Typography>
                          <Typography fontWeight="600">{formatCurrency(cart.totalAmount)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography fontWeight="900" fontSize="1.1rem">Total</Typography>
                          <Typography fontWeight="900" fontSize="1.1rem" color="primary.main">{formatCurrency(calculateTotal())}</Typography>
                      </Box>
                      
                      <Button
                          variant="contained"
                          fullWidth
                          onClick={() => { setIsCartModalOpen(false); navigate(slug ? getRelativePath('/customer/checkout') : '/customer/checkout'); }}
                          sx={{ py: 1.5, borderRadius: 3, fontWeight: '900', mt: 2 }}
                      >
                          Proceed to Checkout
                      </Button>
                  </Stack>
              )}
          </DialogContent>
      </Dialog>
    </Box>
  );
};

export default CustomerLayout;
