import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  TextField,
  Chip,
  Tabs,
  Tab,
  Divider,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Paper,
  Container
} from '@mui/material';
import {
  Restaurant,
  ShoppingCart,
  EventSeat,
  History,
  Dashboard as DashboardIcon,
  LocalOffer as LocalOfferIcon,
  SearchOff,
  Collections as CollectionsIcon,
} from '@mui/icons-material';
import TableBookingPage from './customer/TableBookingPage';
import CustomerBookingsPage from './CustomerBookingsPage';
import GalleryPage from './customer/GalleryPage';
import { menuAPI, ordersAPI } from '../services/api';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { PushNotifications } from '@capacitor/push-notifications';
import GooglePlacesAutocomplete from '../components/common/GooglePlacesAutocomplete';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import PhoneInput from '../components/PhoneInput';
import { isWithinDeliveryRadius, METERS_PER_MILE } from '../services/googleMapsService';

const CustomerDashboard: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('status');
      const orderId = params.get('order');
      const sessionId = params.get('session_id');
      if (status === 'success' && orderId && sessionId) {
        (async () => {
          try {
            await ordersAPI.confirmStripeCheckout(orderId, sessionId);
            toast.success('Payment confirmed!');
            const url = new URL(window.location.href);
            url.searchParams.delete('status');
            url.searchParams.delete('order');
            url.searchParams.delete('session_id');
            window.history.replaceState({}, '', url);
          } catch (e) {
            toast.error('Payment confirmation failed');
          }
        })();
      }
    } catch (_e) { }

    // Request Permissions (Location & Notification)
    const initPermissions = async () => {
      // Notification
      if (Capacitor && Capacitor.isNativePlatform()) {
        try {
          let perm = await PushNotifications.checkPermissions();
          if (perm.receive === 'prompt') {
            perm = await PushNotifications.requestPermissions();
          }
          if (perm.receive === 'granted') {
            await PushNotifications.register();
          }
        } catch (e) {
          console.error('Push Permission Error', e);
        }
      } else if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        try {
          await Notification.requestPermission();
        } catch (e) { }
      }

      // Location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('Location success:', pos.coords);
            try {
              localStorage.setItem('userLocation', JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
            } catch (e) { }
          },
          (err) => {
            console.warn('Location denied:', err);
          }
        );
      }
    };

    // Slight delay to ensure UI is ready
    setTimeout(initPermissions, 1500);

  }, []);
  const dashboardCards = [
    {
      title: 'Order Food',
      description: 'Browse menu and place your order',
      icon: <ShoppingCart sx={{ fontSize: 40 }} />,
      color: 'primary',
      action: () => navigate('/customer/order'),
      buttonText: 'Start Ordering'
    },
    {
      title: 'Book a Table',
      description: 'Reserve your perfect dining experience',
      icon: <EventSeat sx={{ fontSize: 40 }} />,
      color: 'secondary',
      action: () => navigate('/customer/book-table'),
      buttonText: 'Book Table'
    },
    {
      title: 'My Bookings',
      description: 'View and manage your table reservations',
      icon: <History sx={{ fontSize: 40 }} />,
      color: 'info',
      action: () => navigate('/customer/bookings'),
      buttonText: 'View Bookings'
    },
    {
      title: 'Order History',
      description: 'Track your past and current orders',
      icon: <Restaurant sx={{ fontSize: 40 }} />,
      color: 'success',
      action: () => navigate('/customer/orders'),
      buttonText: 'View Orders'
    },
    {
      title: 'Restaurant Gallery',
      description: 'See our delicious photos and venue',
      icon: <CollectionsIcon sx={{ fontSize: 40 }} />,
      color: 'warning',
      action: () => navigate('/customer/gallery'),
      buttonText: 'View Gallery'
    }
  ];
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>
          Welcome{user ? `, ${user.firstName}` : ''}!
        </Typography>
        <Typography variant="h6" color="text.secondary">
          What would you like to do today?
        </Typography>
      </Box>
      <Grid container spacing={4}>
        {dashboardCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', textAlign: 'center', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}>
              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Box sx={{ color: `${card.color}.main`, mb: 2 }}>
                  {card.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {card.description}
                </Typography>
                <Button variant="contained" color={card.color as any} onClick={card.action} fullWidth sx={{ mt: 'auto' }}>
                  {card.buttonText}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Paper sx={{ mt: 4, p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Quick Stats
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="h4" color="primary">
              0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Orders
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h4" color="secondary">
              0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upcoming Bookings
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h4" color="success.main">
              0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Orders
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

const CustomerFoodOrdering: React.FC = () => {
  const { isAuthenticated, user, tenantSlug } = useAuth(); // Fix: Get tenantSlug
  const { formatCurrency } = useSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [menuByCategory, setMenuByCategory] = useState<any[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [orderType, setOrderType] = useState<string>('takeaway');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [customerInfo, setCustomerInfo] = useState<{ name: string; phone: string; email: string; address: string }>({ name: '', phone: '', email: '', address: '' });
  const { settings } = useSettings();
  const [customerDialCode, setCustomerDialCode] = useState(settings?.restaurant?.dialCode || '1');
  const [deliveryLocation, setDeliveryLocation] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [checkingDistance, setCheckingDistance] = useState<boolean>(false);

  // Coupon State
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoading(true);
        const [menuRes, couponRes] = await Promise.all([
          menuAPI.getPublicMenu(tenantSlug || ''), // Fix: Pass tenantSlug
          ordersAPI.getCoupons()
        ]);
        const data = Array.isArray(menuRes.data) ? menuRes.data : [];
        setMenuByCategory(data);
        if (data.length > 0) setActiveCategoryId('all');

        // Load Coupons
        if (couponRes.data) {
          setCoupons((couponRes?.data || []).filter((c: any) => c.active && new Date(c.expiryDate) > new Date()));
        }

      } catch (err) {
        toast.error('Failed to load menu data');
      } finally {
        setLoading(false);
      }
    };
    if (tenantSlug) loadMenu(); // Only load if tenantSlug is available
  }, [tenantSlug]);
  const loadMyOrders = async () => {
    if (!isAuthenticated) return;
    try {
      setOrdersLoading(true);
      const res = await ordersAPI.getMyOrders();
      const list = res.data?.orders || res.data?.data || res.data || [];
      setMyOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      // ignore
    } finally {
      setOrdersLoading(false);
    }
  };
  useEffect(() => {
    loadMyOrders();
    const id = setInterval(loadMyOrders, 30000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  useEffect(() => {
    if (user) {
      setCustomerInfo(prev => ({
        ...prev,
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone
      }));
      if ((user as any)?.dialCode) {
        setCustomerDialCode((user as any).dialCode);
      }
    } else if (settings?.restaurant?.dialCode) {
      setCustomerDialCode(settings.restaurant.dialCode);
    }
  }, [user, settings?.restaurant?.dialCode]);
  const allItems = useMemo(() => menuByCategory.flatMap(group => group.items || []), [menuByCategory]);
  const filteredItems = useMemo(() => allItems.filter(it => {
    const matchesCat = activeCategoryId === 'all' ||
      (it.categories && (it?.categories || []).length > 0
        ? it.categories.some((c: any) => (typeof c === 'object' ? c._id : c) === activeCategoryId)
        : it.category?._id === activeCategoryId);
    const matchesSearch = !search || it.name?.toLowerCase().includes(search?.toLowerCase());
    return matchesCat && matchesSearch;
  }), [allItems, activeCategoryId, search]);
  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.item._id === item._id);
      if (existing) {
        return prev.map(ci => ci.item._id === item._id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };
  const updateQty = (itemId: string, qty: number) => {
    setCart(prev => prev.map(ci => ci.item._id === itemId ? { ...ci, quantity: Math.max(1, qty) } : ci).filter(ci => ci.quantity > 0));
  };
  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(ci => ci.item._id !== itemId));
  };
  const subtotal = useMemo(() => cart.reduce((sum, ci) => sum + (ci.item.price * ci.quantity), 0), [cart]);
  const taxRate = 0;
  const total = Math.max(0, subtotal - discount);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await ordersAPI.validateCoupon(couponCode);
      const coupon = res.data;

      // Note: Backend might use 'minBillAmount', frontend might use 'minOrderAmount'. 
      // Coupon schema says 'minBillAmount'. Let's check both for safety or stick to schema.
      const minAmount = coupon.minBillAmount || coupon.minOrderAmount || 0;

      if (subtotal < minAmount) {
        toast.error(`Minimum order amount of ${formatCurrency(minAmount)} required`);
        return;
      }

      let discountAmount = 0;
      const offerType = coupon.offerType || 'cart_total';
      const applicableItems = coupon.applicableItems || [];

      if (offerType === 'menu_item') {
        if (!applicableItems.length) throw new Error('Invalid coupon configuration');

        const matchingItems = cart.filter(ci => applicableItems.includes(ci.item._id));

        if (matchingItems.length === 0) {
          throw new Error('This coupon applies to specific menu items only');
        }

        const matchingTotal = matchingItems.reduce((sum, ci) => sum + (ci.item.price * ci.quantity), 0);

        if (coupon.discountType === 'percentage') {
          discountAmount = (matchingTotal * coupon.discountValue) / 100;
        } else {
          discountAmount = coupon.discountValue;
        }

      } else if (offerType === 'combo') {
        if (!applicableItems.length) throw new Error('Invalid coupon configuration');

        const cartItemIds = new Set(cart.map(ci => ci.item._id));
        const hasAll = applicableItems.every((id: string) => cartItemIds.has(id));

        if (!hasAll) {
          throw new Error('This coupon requires a specific combination of items');
        }

        if (coupon.discountType === 'percentage') {
          const matchingItems = cart.filter(ci => applicableItems.includes(ci.item._id));
          const matchingTotal = matchingItems.reduce((sum, ci) => sum + (ci.item.price * ci.quantity), 0);
          discountAmount = (matchingTotal * coupon.discountValue) / 100;
        } else {
          discountAmount = coupon.discountValue;
        }

      } else {
        // cart_total
        if (coupon.discountType === 'percentage') {
          discountAmount = (subtotal * coupon.discountValue) / 100;
        } else {
          discountAmount = coupon.discountValue;
        }
      }

      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }

      if (discountAmount > subtotal) discountAmount = subtotal;

      setDiscount(discountAmount);
      setAppliedCoupon(coupon);
      toast.success('Coupon applied!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid coupon');
      setDiscount(0);
      setAppliedCoupon(null);
    }
  };
  const placeOrder = async () => {
    try {
      if (!isAuthenticated || !user) {
        toast.error('Please login to place order');
        navigate('/login', { replace: true, state: { from: '/customer' } });
        return;
      }
      if (cart.length === 0) {
        toast.error('Your cart is empty');
        return;
      }
      const items = cart.map(ci => ({ menuItem: ci.item._id, quantity: ci.quantity }));
      const payload: any = {
        orderType: orderType === 'delivery' ? 'delivery' : 'takeaway',
        customer: {
          name: customerInfo.name,
          phone: customerInfo.phone,
          dialCode: customerDialCode,
          email: customerInfo.email
        },
        items,
        tax: { rate: taxRate },
        paymentMethod: paymentMethod === 'card' ? 'card' : 'cash',
        source: 'website',
        status: 'pending',
        notes: '',
        totalAmount: total,
        subtotal: subtotal,
        discount: {
          amount: discount,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
          type: appliedCoupon ? appliedCoupon.discountType : undefined,
          value: appliedCoupon ? appliedCoupon.discountValue : undefined
        },
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        couponId: appliedCoupon ? appliedCoupon._id : undefined
      };

      if (orderType === 'delivery') {
        const deliveryAddress = deliveryLocation?.formattedAddress || customerInfo.address;
        if (!deliveryAddress) {
          toast.error('Please enter a delivery address');
          return;
        }

        if (settings?.restaurant?.address) {
          try {
            setCheckingDistance(true);
            const maxRadiusMeters = (settings.restaurant.deliveryRadius || 15) * METERS_PER_MILE;
            const result = await isWithinDeliveryRadius(
              settings.restaurant.address,
              deliveryAddress,
              maxRadiusMeters
            );

            if (!result.isWithin) {
              const errorMessage = `Sorry, we only deliver within ${settings.restaurant.deliveryRadius || 15} miles. Your address is approx. ${result.distanceText || 'too far away'}.`;
              toast.error(errorMessage, { duration: 5000 });
              setCheckingDistance(false);
              return;
            }
          } catch (err) {
            console.error('Distance check failed:', err);
          } finally {
            setCheckingDistance(false);
          }
        }

        payload.delivery = {
          address: deliveryAddress,
          location: deliveryLocation ? {
            lat: deliveryLocation.location?.lat,
            lng: deliveryLocation.location?.lng,
            placeId: deliveryLocation.placeId
          } : undefined
        };
      }
      const res = await ordersAPI.create(payload);
      toast.success(`Order placed! #${res.data.orderNumber}`);
      setCart([]);
      setDiscount(0);
      setAppliedCoupon(null);
      setCouponCode('');
      loadMyOrders();
      if (paymentMethod === 'card') {
        try {
          const checkout = await ordersAPI.createStripeCheckout(res.data._id);
          const { url, qrCode } = checkout.data || {};
          if (url) {
            try {
              if (Capacitor.isNativePlatform()) {
                await Browser.open({ url });
              } else {
                window.open(url, '_blank', 'noopener,noreferrer');
              }
            } catch {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          }
          if (qrCode) {
            toast.success('Scan QR to pay');
            const w = window.open('', '_blank', 'width=320,height=360');
            if (w) {
              w.document.write(`<html><body style=\"margin:0;padding:16px;font-family:sans-serif;\">` +
                `<h3 style=\"margin:0 0 8px\">Pay for Order ${res.data.orderNumber}</h3>` +
                `<img src=\"${qrCode}\" alt=\"QR Code\" style=\"width:256px;height:256px\" />` +
                (url ? `<p><a href=\"${url}\" target=\"_blank\">Open payment page</a></p>` : '') +
                `<p style=\"color:#666\">Use Stripe test card 4242 4242 4242 4242, any future date, any CVC.</p>` +
                `</body></html>`);
            }
          }
        } catch (e) {
          toast.error('Could not start online payment');
        }
      }
    } catch (err: any) {
      // Prioritize 'error' field which contains subscription limit messages
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to place order';
      toast.error(errorMessage);
    }
  };
  const fmt = (d: any) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  if (loading) {
    return <LoadingSpinner message="Loading menu..." />;
  }
  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>Order Online</Typography>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Tabs value={activeCategoryId} onChange={(_, v) => setActiveCategoryId(v)} variant="scrollable" scrollButtons allowScrollButtonsMobile>
          <Tab label="All" value="all" />
          {menuByCategory.map(group => (
            <Tab key={group.category?._id} label={group.category?.name} value={group.category?._id} />
          ))}
        </Tabs>
        <TextField size="small" placeholder="Search menu..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            {filteredItems.map(item => (
              <Grid item xs={12} sm={6} md={4} key={item._id}>
                <Card>
                  {item.image && (
                    <CardMedia component="img" height="140" image={item.image} alt={item.name} />
                  )}
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600}>{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{item.description}</Typography>
                    <Box mt={1} display="flex" alignItems="center" justifyContent="space-between">
                      <Chip label={`${formatCurrency(item.price)}`} color="primary" size="small" />
                      <Button size="small" variant="contained" onClick={() => addToCart(item)}>Add</Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {filteredItems.length === 0 && (
              <Box sx={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 10,
                px: 3,
                textAlign: 'center',
                bgcolor: 'rgba(0,0,0,0.02)',
                borderRadius: 4,
                border: '2px dashed',
                borderColor: 'divider',
                mt: 2
              }}>
                <Box sx={{
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  bgcolor: 'background.paper',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  {search ? <SearchOff sx={{ fontSize: 35, color: 'text.disabled' }} /> : <Restaurant sx={{ fontSize: 35, color: 'text.disabled' }} />}
                </Box>
                <Typography variant="h6" color="text.primary" fontWeight="bold">
                  {search ? 'No results found' : 'Menu is empty'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, mt: 1 }}>
                  {search
                    ? `We couldn't find anything matching "${search}".`
                    : "There are no items available right now."}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Your Cart</Typography>
              <Divider sx={{ my: 1 }} />
              {cart.length === 0 && <Typography color="text.secondary">No items yet.</Typography>}
              {cart.map(ci => (
                <Box key={ci.item._id} display="flex" alignItems="center" justifyContent="space-between" my={1}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{ci.item.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatCurrency(ci.item.price)}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Button size="small" onClick={() => updateQty(ci.item._id, ci.quantity - 1)}>-</Button>
                    <Typography>{ci.quantity}</Typography>
                    <Button size="small" onClick={() => updateQty(ci.item._id, ci.quantity + 1)}>+</Button>
                    <Button size="small" color="error" onClick={() => removeFromCart(ci.item._id)}>Remove</Button>
                  </Box>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />

              <Box mb={2}>
                <Box display="flex" gap={1} mb={1}>
                  <TextField size="small" placeholder="Coupon Code" value={couponCode} onChange={(e) => setCouponCode(e.target.value?.toUpperCase())} fullWidth disabled={!!appliedCoupon} />
                  {!appliedCoupon ? <Button variant="contained" size="small" onClick={handleApplyCoupon}>Apply</Button> : <Button variant="outlined" size="small" color="error" onClick={() => { setAppliedCoupon(null); setDiscount(0); setCouponCode(''); }}>Remove</Button>}
                </Box>
                {coupons.length > 0 && !appliedCoupon && (
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {coupons.filter(c => !c.minOrderAmount || subtotal >= c.minOrderAmount).map(c => (
                      <Chip key={c._id} icon={<LocalOfferIcon />} label={`${c.code} (${c.discountType === 'percentage' ? c.discountValue + '%' : formatCurrency(c.discountValue)})`} size="small" onClick={() => setCouponCode(c.code)} clickable color="primary" variant="outlined" />
                    ))}
                  </Box>
                )}
              </Box>

              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Subtotal</Typography>
                <Typography>{formatCurrency(subtotal)}</Typography>
              </Box>
              {discount > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography color="success.main">Discount</Typography>
                  <Typography color="success.main">-{formatCurrency(discount)}</Typography>
                </Box>
              )}
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel id="order-type-label">Order Type</InputLabel>
                <Select labelId="order-type-label" label="Order Type" value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                  <MenuItem value="takeaway">Takeaway</MenuItem>
                  <MenuItem value="delivery">Delivery</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel id="payment-method-label">Payment Method</InputLabel>
                <Select labelId="payment-method-label" label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <MenuItem value="cash">Cash on Delivery</MenuItem>
                  <MenuItem value="card">Card (Stripe Test)</MenuItem>
                </Select>
              </FormControl>
              <TextField fullWidth size="small" label="Name" sx={{ mb: 1 }} inputProps={{ maxLength: 30 }} value={customerInfo.name} onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value.slice(0, 30) })} />
              <Box sx={{ mb: 1 }}>
                <PhoneInput
                  fullWidth
                  size="small"
                  label="Phone"
                  value={customerInfo.phone}
                  onChange={(val) => setCustomerInfo({ ...customerInfo, phone: val })}
                  dialCode={customerDialCode}
                  onDialCodeChange={setCustomerDialCode}
                />
              </Box>
              <TextField fullWidth size="small" label="Email" sx={{ mb: 1 }} value={customerInfo.email} onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })} />
              {orderType === 'delivery' && (
                <Box sx={{ mb: 1 }}>
                  <GooglePlacesAutocomplete label="Delivery Address *" placeholder="Search address" value={customerInfo.address} onChange={(val: string) => setCustomerInfo({ ...customerInfo, address: val })} onPlaceSelect={(place: any) => { setDeliveryLocation(place); if (place?.formattedAddress) { setCustomerInfo({ ...customerInfo, address: place.formattedAddress }); } }} required types={['address']} countryRestriction={import.meta.env.VITE_MAPS_COUNTRIES ? import.meta.env.VITE_MAPS_COUNTRIES.split(',').map((c: string) => c.trim()?.toLowerCase()).filter(Boolean) : ['in', 'us']} />
                </Box>
              )}
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                disabled={cart.length === 0 || checkingDistance} 
                onClick={placeOrder}
              >
                {checkingDistance ? 'Checking Distance...' : `Place Order (${formatCurrency(total)})`}
              </Button>
            </CardContent>
          </Card>
          <Box mt={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6" sx={{ cursor: 'pointer' }} onClick={() => navigate('/customer/orders')}>My Orders</Typography>
                  <Box>
                    <Button size="small" onClick={() => navigate('/customer/orders')} sx={{ mr: 1 }}>View All</Button>
                    <Button size="small" onClick={loadMyOrders} disabled={ordersLoading}>Refresh</Button>
                  </Box>
                </Box>
                <Divider sx={{ my: 1 }} />
                {myOrders.length === 0 && (
                  <Typography color="text.secondary">No orders yet.</Typography>
                )}
                {myOrders.map(order => (
                  <Box key={order._id} mb={1.5} p={1} borderRadius={1} border="1px solid rgba(0,0,0,0.08)">
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" fontWeight={600}>#{order.orderNumber}</Typography>
                      <Chip size="small"
                        label={
                          order.status === 'ready_to_takeaway' ? 'Ready for Pickup' :
                            order.status === 'ready_to_pickup' ? 'Ready for Pickup' :
                              order.status === 'on_the_way' ? 'Out for Delivery' :
                                order.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c?.toUpperCase())
                        }
                        color={
                          ['ready', 'ready_to_takeaway', 'ready_to_pickup', 'delivered', 'completed'].includes(order.status) ? 'success' :
                            ['preparing', 'in-progress', 'on_the_way'].includes(order.status) ? 'warning' :
                              order.status === 'pending' ? 'default' : 'primary'
                        }
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">Placed: {fmt(order.createdAt)}{order.preparationTime?.startedAt ? ` • Started: ${fmt(order.preparationTime.startedAt)}` : ''}{order.preparationTime?.completedAt ? ` • Ready: ${fmt(order.preparationTime.completedAt)}` : ''} • <strong>{order.orderType === 'takeaway' ? 'Online Takeaway' : order.orderType?.toUpperCase()}</strong></Typography>
                    <Box mt={0.5}>
                      <Typography variant="caption" color="text.secondary">{order.items?.length || 0} item(s) • Total {formatCurrency(order.totalAmount || 0)}</Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

const CustomerApp: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<CustomerDashboard />} />
      <Route path="/order" element={<CustomerFoodOrdering />} />
      <Route path="/book-table" element={<TableBookingPage />} />
      <Route path="/bookings" element={<CustomerBookingsPage />} />
      <Route path="/orders" element={<CustomerBookingsPage />} />
      <Route path="/gallery" element={<GalleryPage />} />
    </Routes>
  );
};

export default CustomerApp;
