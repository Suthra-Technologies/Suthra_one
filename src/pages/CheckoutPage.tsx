import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Checkbox,
  Card,
  CardContent,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  CardActionArea,
  Stack,
  Chip,
  alpha,
  useTheme,
  Backdrop,
  CircularProgress as Spinner
} from '@mui/material';
import {
  ShoppingCart,
  Person,
  LocationOn,
  Payment,
  DeliveryDining,
  Storefront,
  QrCode,
  CreditCard,
  AttachMoney,
  CheckCircle,
  Home as HomeIcon,
  Work as WorkIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useActiveTenant } from '../hooks/useActiveTenant';
import { useGuestCart } from '../context/GuestCartContext';
import CustomerRegistration from '../components/auth/CustomerRegistration';
import GooglePlacesAutocomplete from '../components/common/GooglePlacesAutocomplete';
import { toast } from 'react-hot-toast';
import { ordersAPI, authAPI } from '../services/api';
import { isWithinDeliveryRadius, METERS_PER_MILE } from '../services/googleMapsService';



const steps = ['Cart Review', 'Account', 'Delivery Details', 'Payment'];

interface DeliveryInfo {
  address: string;
  phone: string;
  notes: string;
  tip: number | '';
  deliveryTime: string;
  isContactless: boolean;
  dropOffInstructions: string;
  latitude?: number;
  longitude?: number;
  businessName?: string;
}

const CheckoutPage: React.FC = () => {
  const { slug, getRelativePath } = useActiveTenant();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const isAuthenticated = !!user;
  const { cart, setOrderType, setDeliveryAddress, clearCart, updateQuantity, removeItem } = useGuestCart();
  const theme = useTheme();
  
  const taxRate = settings?.restaurant?.taxRate ?? 0;

  const [activeStep, setActiveStep] = useState<number>(0);
  const [authMethod, setAuthMethod] = useState<'register' | 'login' | 'guest'>('register');
  const [showAuthDialog, setShowAuthDialog] = useState<boolean>(false);
  const [orderType, setOrderTypeState] = useState<'delivery' | 'takeaway'>(cart.orderType || 'delivery');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'card'>('card');
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    address: '',
    phone: '',
    notes: '',
    tip: '',
    deliveryTime: 'asap',
    isContactless: false,
    dropOffInstructions: '',
    latitude: undefined,
    longitude: undefined,
    businessName: ''
  });
  const [selectedAddressMode, setSelectedAddressMode] = useState<'saved' | 'new'>(
    user?.savedAddresses?.length ? 'saved' : 'new'
  );
  const [error, setError] = useState<string>('');
  const [checkingDistance, setCheckingDistance] = useState<boolean>(false);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliveryQuotes, setDeliveryQuotes] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [showDistanceDialog, setShowDistanceDialog] = useState<boolean>(false);
  const [placingOrder, setPlacingOrder] = useState<boolean>(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  // Card saving state
  const [saveCard, setSaveCard] = useState<boolean>(false);
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedSavedCard, setSelectedSavedCard] = useState<number | null>(null);

  // Card input state
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvc, setCardCvc] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchSavedCards();
    }
  }, [isAuthenticated]);

  const fetchSavedCards = async () => {
    try {
      const response = await authAPI.getCustomerCards();
      setSavedCards(response.data.savedCards || []);
    } catch (err) {
      console.error('Failed to fetch cards:', err);
    }
  };

  // Tip selection state
  const TIP_PERCENTAGES = [5, 10, 15, 20];
  const [selectedTipPercent, setSelectedTipPercent] = useState<number | 'custom'>(5);
  const [customTipValue, setCustomTipValue] = useState<string>('');
  
  // Scheduling state
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [ageVerification, setAgeVerification] = useState<'pending' | 'above' | 'below'>('pending');

  const hasAlcohol = cart.items.some(item => 
    item.isAlcohol || 
    item.categoryName?.toLowerCase().includes('alcohol') ||
    item.name?.toLowerCase().includes('beer') ||
    item.name?.toLowerCase().includes('wine') ||
    item.name?.toLowerCase().includes('vodka') ||
    item.name?.toLowerCase().includes('whisky')
  );

  // Calculate tip amount from percentage
  const computeTip = (percent: number | 'custom'): number => {
    if (percent === 'custom') return parseFloat(customTipValue) || 0;
    return Math.round(cart.totalAmount * (percent / 100) * 100) / 100;
  };

  // Initialise tip to 5% on mount / when subtotal changes
  useEffect(() => {
    if (selectedTipPercent !== 'custom') {
      setDeliveryInfo(prev => ({ ...prev, tip: computeTip(selectedTipPercent) }));
    }
  }, [cart.totalAmount, selectedTipPercent]);

  const handleTipSelect = (percent: number | 'custom') => {
    setSelectedTipPercent(percent);
    if (percent === 'custom') {
      const val = parseFloat(customTipValue) || 0;
      setDeliveryInfo(prev => ({ ...prev, tip: val }));
    } else {
      setDeliveryInfo(prev => ({ ...prev, tip: computeTip(percent) }));
    }
  };

  // Redirect if cart empty
  useEffect(() => {
    if (cart.items.length === 0 && activeStep === 0 && !placedOrder) {
      if (slug) {
        navigate(getRelativePath('/customer/order'));
      } else {
        navigate('/login');
      }
    }
  }, [cart.items.length, navigate, slug, activeStep, placedOrder]);

  // Auto‑skip account step for logged‑in users
  useEffect(() => {
    if (isAuthenticated && activeStep === 1) {
      setActiveStep(2);
    }
  }, [isAuthenticated, activeStep]);

  // Autofill phone number from user profile
  useEffect(() => {
    if (user?.phone && !deliveryInfo.phone) {
      setDeliveryInfo(prev => ({ ...prev, phone: user.phone || '' }));
    }
  }, [user, deliveryInfo.phone]);

  // Handle age-restricted item logic
  useEffect(() => {
    if (hasAlcohol && deliveryInfo.isContactless) {
      setDeliveryInfo(prev => ({ ...prev, isContactless: false }));
    }
  }, [hasAlcohol, deliveryInfo.isContactless]);

  useEffect(() => {
    if (selectedAddressMode === 'saved' && user?.savedAddresses?.length) {
      const defaultAddr = user.savedAddresses.find(a => a.isDefault) || user.savedAddresses[0];
      if (defaultAddr) {
        setDeliveryInfo(prev => ({
          ...prev,
          address: `${defaultAddr.street}, ${defaultAddr.city}, ${defaultAddr.state} ${defaultAddr.zipCode}`.trim()
        }));
      }
    }
  }, [selectedAddressMode, user?.savedAddresses]);

  // Auto-switch to 'saved' mode if addresses become available (e.g. after background profile refresh)
  useEffect(() => {
    if (user?.savedAddresses?.length && selectedAddressMode === 'new' && !deliveryInfo.address) {
      setSelectedAddressMode('saved');
    }
  }, [user?.savedAddresses, selectedAddressMode, deliveryInfo.address]);

  const generateTimeSlots = (dateString: string) => {
    if (!settings?.restaurant?.businessHours) return [];
    
    const date = new Date(dateString + 'T00:00:00');
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayConfig = settings.restaurant.businessHours.find(bh => bh.day === dayName);
    
    if (!dayConfig || !dayConfig.isOpen) return [];
    
    const openStr = dayConfig.slots?.[0]?.openTime || dayConfig.openTime || '09:00';
    const closeStr = dayConfig.slots?.[0]?.closeTime || dayConfig.closeTime || '22:00';
    
    const slots: string[] = [];
    let current = new Date(`${dateString}T${openStr}`);
    const end = new Date(`${dateString}T${closeStr}`);
    
    const now = new Date();
    // Allow for 60 mins preparation/delivery time buffer
    if (date.toDateString() === now.toDateString()) {
       const earliest = new Date(now.getTime() + 60 * 60 * 1000);
       if (current < earliest) current = earliest;
       
       const mins = current.getMinutes();
       if (mins > 0 && mins <= 15) current.setMinutes(15);
       else if (mins > 15 && mins <= 30) current.setMinutes(30);
       else if (mins > 30 && mins <= 45) current.setMinutes(45);
       else if (mins > 45) { current.setHours(current.getHours() + 1); current.setMinutes(0); }
    }
    
    while (current < end) {
      const hours = String(current.getHours()).padStart(2, '0');
      const minutes = String(current.getMinutes()).padStart(2, '0');
      slots.push(`${hours}:${minutes}`);
      current.setMinutes(current.getMinutes() + 15);
    }
    
    return slots;
  };

  // Handle live DoorDash quotes
  useEffect(() => {
    if (activeStep < 2 || orderType !== 'delivery' || !deliveryInfo.address || deliveryInfo.address.length < 10) {
      if (deliveryFee !== 0) setDeliveryFee(0);
      setQuoteError(null);
      return;
    }

    let isCancelled = false;
    const fetchQuote = async () => {
      try {
        setIsFetchingQuote(true);
        setQuoteError(null);
        
        const tenantSlug = slug || '';
        if (!tenantSlug) return;

        const response = await ordersAPI.getDeliveryQuote(
          { fullAddress: deliveryInfo.address },
          cart.items.map(i => ({ menuItem: i.id, name: i.name, quantity: i.quantity, price: i.price })),
          tenantSlug
        );

        if (!isCancelled) {
          if (response.data && response.data.quotes && response.data.quotes.length > 0) {
            setDeliveryQuotes(response.data.quotes);
            // Default to the first quote (cheapest since backend sorts them)
            setDeliveryFee(response.data.quotes[0].fee);
            setSelectedProvider(response.data.quotes[0].provider);
            setQuoteError(null);
          } else if (response.data && response.data.fee !== undefined) {
             // Fallback for single quote
            setDeliveryFee(response.data.fee);
            setSelectedProvider(response.data.provider || 'doordash');
            setDeliveryQuotes([{ 
              provider: response.data.provider || 'doordash', 
              fee: response.data.fee,
              provider_displayName: response.data.provider_displayName || 'Standard Delivery'
            }]);
          } else {
            setQuoteError(response.data?.message || 'Could not get delivery quote.');
            setDeliveryFee(0);
            setDeliveryQuotes([]);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          const errMsg = err.response?.data?.message || 'Delivery not available for this address.';
          setQuoteError(errMsg);
          
          // Detect distance error
          const lowerMsg = errMsg.toLowerCase();
          if (lowerMsg.includes('distance') || lowerMsg.includes('range') || lowerMsg.includes('too long') || lowerMsg.includes('far')) {
            setShowDistanceDialog(true);
          }
          
          setDeliveryFee(0);
          setDeliveryQuotes([]);
          toast.error(errMsg);
        }
      } finally {
        if (!isCancelled) setIsFetchingQuote(false);
      }
    };

    const debounceTimer = setTimeout(fetchQuote, 1000);
    return () => {
      isCancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [orderType, deliveryInfo.address, cart.items, slug, activeStep]);

  const handleNext = () => {
    if (activeStep === 1 && !isAuthenticated && authMethod !== 'guest') {
      setShowAuthDialog(true);
      return;
    }
    if (activeStep === 2) {
      // Map UI value to backend value
      setOrderType(orderType === 'delivery' ? 'delivery' : 'takeaway');
      if (orderType === 'delivery') {
        setDeliveryAddress(deliveryInfo.address);
        
        // Delivery Radius Check
        const checkDeliveryRadius = async () => {
          if (!deliveryInfo.address) {
            toast.error('Please enter a delivery address');
            return false;
          }
          
          if (!settings?.restaurant?.address) {
            console.warn('Restaurant address not set in settings');
            return true; // If restaurant address is missing, we can't check, so allow (or block)
          }

          try {
            setCheckingDistance(true);
            const maxRadiusMeters = (settings.restaurant.deliveryRadius || 15) * METERS_PER_MILE;
            const result = await isWithinDeliveryRadius(
              settings.restaurant.address,
              deliveryInfo.address,
              maxRadiusMeters
            );

            if (!result.isWithin) {
              const errorMessage = `Sorry, we only deliver within ${settings.restaurant.deliveryRadius || 15} miles. Your address is approx. ${result.distanceText || 'too far away'}.`;
              toast.error(errorMessage, { duration: 5000 });
              setError(errorMessage);
              setShowDistanceDialog(true);
              return false;
            }
            
            setError('');
            return true;
          } catch (err) {
            console.error('Distance check failed:', err);
            // In case of API failure, we might want to allow it or show a warning
            return true; 
          } finally {
            setCheckingDistance(false);
          }
        };

        checkDeliveryRadius().then(isValid => {
          if (isValid) {
            setActiveStep((prev) => prev + 1);
          }
        });
        return; // Don't proceed synchronously
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (activeStep === 2 && isAuthenticated) {
      setActiveStep(0);
    } else {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleAuthSuccess = (userData: any) => {
    setShowAuthDialog(false);
    setActiveStep(2);
  };

  const handlePlaceOrder = async () => {
    try {
      setPlacingOrder(true);
      setError('');
      const isPaidMethod = paymentMethod === 'card' || paymentMethod === 'qr';
      const orderData = {
        items: cart.items.map(item => ({
            menuItem: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            itemTotal: item.itemTotal,
            customizations: item.customizations || [],
            spiceLevel: item.spiceLevel || ''
        })),
        orderType: orderType === 'delivery' ? 'delivery' : 'takeaway',
        paymentMethod,
        paymentStatus: isPaidMethod ? 'paid' : 'pending',
        status: isPaidMethod ? 'confirmed' : 'pending',

        // Pre-order flags: only set when user selects 'Schedule Later'
        isPreOrder: deliveryInfo.deliveryTime === 'later',
        scheduledTime: deliveryInfo.deliveryTime === 'later' && scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
          : null,

        deliveryAddress: orderType === 'delivery' ? {
            fullAddress: deliveryInfo.address,
            latitude: deliveryInfo.latitude,
            longitude: deliveryInfo.longitude,
            city: '',
            state: '',
            pincode: ''
        } : null,
        customer: user ? {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            phone: deliveryInfo.phone || user.phone
        } : {
          firstName: 'Guest',
          lastName: 'User',
          name: 'Guest User',
          phone: deliveryInfo.phone,
          email: '',
          notes: deliveryInfo.notes,
        },
        deliveryTime: deliveryInfo.deliveryTime === 'asap' ? 'ASAP' : `${scheduledDate} ${scheduledTime}`,
        isContactless: deliveryInfo.isContactless,
        dropOffInstructions: deliveryInfo.dropOffInstructions,
        businessName: deliveryInfo.businessName,
        total: cart.totalAmount + (orderType === 'delivery' ? deliveryFee : 0) + (cart.totalAmount * (taxRate / 100)) + (orderType === 'delivery' ? Number(deliveryInfo.tip) || 0 : 0),
        deliveryCharge: orderType === 'delivery' ? deliveryFee : 0,
        deliveryProvider: orderType === 'delivery' ? selectedProvider : null,
        cardDetails: selectedSavedCard !== null ? savedCards[selectedSavedCard] : null,
        tax: cart.totalAmount * (taxRate / 100),
        tip: orderType === 'delivery' ? Number(deliveryInfo.tip) || 0 : 0
      };
      // Save card details if requested
      if (saveCard && paymentMethod === 'card' && selectedSavedCard === null) {
        try {
          // Robust card parsing
          const cleanCardNumber = cardNumber.replace(/\s/g, '');
          const last4 = cleanCardNumber.slice(-4) || '0000';
          
          let brand = 'Visa';
          if (cleanCardNumber.startsWith('5')) brand = 'MasterCard';
          else if (cleanCardNumber.startsWith('3')) brand = 'Amex';
          else if (cleanCardNumber.startsWith('6')) brand = 'Discover';

          const [month, year] = cardExpiry.split('/').map(s => parseInt(s.trim()));
          
          const cardData = {
            brand,
            last4,
            expMonth: month || 12,
            expYear: year ? (year < 100 ? 2000 + year : year) : 2026
          };

          const cardResponse = await authAPI.saveCustomerCard(cardData);
          
          if (cardResponse.data) {
            toast.success('Card saved for future use!');
            // Refresh saved cards
            fetchSavedCards();
          }
        } catch (e) {
          console.error('Failed to save card metadata:', e);
          toast.error('Could not save card details, but proceeding with order.');
        }
      }

      const response = await ordersAPI.create(orderData);
      setPlacingOrder(false);
      clearCart();
      toast.success('Order placed successfully!', {
          duration: 5000,
          position: 'top-center',
          style: { background: '#2ecc71', color: '#fff', fontWeight: 'bold' }
      });
      
      setPlacedOrder(response.data);
      // We don't redirect yet so user can see tracking link if delivery
    } catch (err: any) {
      setPlacingOrder(false);
      // Prioritize 'error' field which contains subscription limit messages
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to place order. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  if (placedOrder) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h4" gutterBottom>Order Placed!</Typography>
          <Typography variant="body1" gutterBottom>Your order number is <strong>{placedOrder.orderNumber || 'N/A'}</strong></Typography>
          {placedOrder.trackingUrl && (
            <Button 
              variant="contained" 
              size="large" 
              href={placedOrder.trackingUrl} 
              target="_blank" 
              sx={{ mt: 3, borderRadius: 2, px: 4 }}
            >
              Track on {placedOrder.deliveryProvider === 'doordash' ? 'DoorDash' : 'Delivery Partner'}
            </Button>
          )}
          <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/')}>Back to Home</Button>
        </Paper>
      </Container>
    );
  }

  const renderCartReview = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShoppingCart color="primary" /> Review Your Order
      </Typography>
      {cart.items.map((item: any, index: number) => (
        <Box key={index} sx={{ py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="600">{item.name}</Typography>
              {item.categoryName && (
                <Typography variant="caption" color="primary" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), px: 1, py: 0.2, borderRadius: 1, fontWeight: '700', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1, verticalAlign: 'middle', display: 'inline-block', mb: 1 }}>
                  {item.categoryName}
                </Typography>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  {item.quantity} x ${item.price.toFixed(2)} = <Box component="span" sx={{ color: 'primary.main', fontWeight: 'bold' }}>${item.itemTotal.toFixed(2)}</Box>
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1.5, px: 1 }}>
                  <Button 
                    size="small" 
                    sx={{ minWidth: 28, p: 0, fontWeight: 'bold' }} 
                    onClick={() => updateQuantity(index, item.quantity - 1)}
                  >
                    -
                  </Button>
                  <Typography variant="body2" sx={{ mx: 1.5, fontWeight: 'bold' }}>
                    {item.quantity}
                  </Typography>
                  <Button 
                    size="small" 
                    sx={{ minWidth: 28, p: 0, fontWeight: 'bold' }} 
                    onClick={() => updateQuantity(index, item.quantity + 1)}
                  >
                    +
                  </Button>
                </Box>
              </Box>
              
              {item.spiceLevel && (
                <Chip 
                  size="small" 
                  label={`Spice: ${item.spiceLevel}`} 
                  color="warning" 
                  variant="outlined" 
                  sx={{ mt: 1, fontWeight: 'bold', textTransform: 'capitalize' }} 
                />
              )}
              {item.customizations.length > 0 && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  {item.customizations.map((c: any) => c.name).join(', ')}
                </Typography>
              )}
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Typography 
                  variant="caption" 
                  onClick={() => navigate(getRelativePath('/customer/order'))}
                  sx={{ 
                    cursor: 'pointer', 
                    color: 'primary.main', 
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    '&:hover': { textDecoration: 'underline' } 
                  }}
                >
                  + Add more items
                </Typography>
                <Typography 
                  variant="caption" 
                  onClick={() => navigate(getRelativePath('/customer/order'))}
                  sx={{ 
                    cursor: 'pointer', 
                    color: 'text.secondary', 
                    fontWeight: 600,
                    '&:hover': { color: 'primary.main', textDecoration: 'underline' }
                  }}
                >
                  Customise order
                </Typography>
                <Typography 
                  variant="caption" 
                  onClick={() => removeItem(index)}
                  sx={{ 
                    cursor: 'pointer', 
                    color: 'error.main', 
                    fontWeight: 600,
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Remove
                </Typography>
              </Box>
            </Box>
            <Typography variant="subtitle1" fontWeight="700" color="primary">
              ${item.itemTotal.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      ))}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2 }}>
        <Typography variant="h6">Total:</Typography>
        <Typography variant="h6" color="primary" fontWeight="bold">
          ${cart.totalAmount.toFixed(2)}
        </Typography>
      </Box>
    </Paper>
  );

  const renderAccountStep = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Person color="primary" /> Account Information
      </Typography>
      {isAuthenticated && user ? (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            You're signed in as {user.firstName} {user.lastName}
          </Alert>
          <Typography variant="body1">
            Your order will be linked to your account for easy tracking and faster future orders.
          </Typography>
        </Box>
      ) : (
        <Box>
          <Typography variant="body1" paragraph>
            To continue with your order, please sign in or create an account.
          </Typography>
          <FormControl component="fieldset">
            <FormLabel component="legend">Choose an option:</FormLabel>
            <RadioGroup value={authMethod} onChange={(e) => setAuthMethod(e.target.value as any)}>
              <FormControlLabel value="register" control={<Radio />} label="Create a new account (recommended)" />
              <FormControlLabel value="login" control={<Radio />} label="Sign in to existing account" />
              <FormControlLabel value="guest" control={<Radio />} label="Continue as guest (limited features)" />
            </RadioGroup>
          </FormControl>
          <Alert severity="info" sx={{ mt: 2 }}>
            Creating an account allows you to track orders, save favorites, and earn loyalty points!
          </Alert>
        </Box>
      )}
    </Paper>
  );

  const renderDeliveryStep = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocationOn color="primary" /> Delivery / Takeaway Details
      </Typography>
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend">Order Type</FormLabel>
        <RadioGroup value={orderType} onChange={(e) => setOrderTypeState(e.target.value as any)} row>
          <FormControlLabel
            value="delivery"
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DeliveryDining /> Delivery
              </Box>
            }
          />
          <FormControlLabel
            value="takeaway"
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Storefront /> Online Takeaway
              </Box>
            }
          />
        </RadioGroup>
      </FormControl>
      {orderType === 'delivery' && (
        <Grid container spacing={2}>
          {user?.savedAddresses && user.savedAddresses.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Saved Addresses</Typography>
                <Grid container spacing={1}>
                  {user.savedAddresses.map((addr, idx) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                      <Card
                        variant={selectedAddressMode === 'saved' && deliveryInfo.address.includes(addr.street || '') ? 'outlined' : 'elevation'}
                        sx={{
                          cursor: 'pointer',
                          borderColor: selectedAddressMode === 'saved' && deliveryInfo.address.includes(addr.street || '') ? 'primary.main' : 'divider',
                          bgcolor: selectedAddressMode === 'saved' && deliveryInfo.address.includes(addr.street || '') ? 'action.hover' : 'background.paper',
                          height: '100%'
                        }}
                        onClick={() => {
                          setSelectedAddressMode('saved');
                          const addrStr = `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`.trim();
                          setDeliveryInfo(prev => ({ 
                            ...prev, 
                            address: addrStr,
                            latitude: addr.coordinates?.lat || addr.lat,
                            longitude: addr.coordinates?.lng || addr.lng
                          }));
                        }}
                      >
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {addr.label === 'Home' ? <HomeIcon fontSize="small" /> : addr.label === 'Work' ? <WorkIcon fontSize="small" /> : <LocationOn fontSize="small" />}
                            <Typography variant="subtitle2" fontWeight="bold">{addr.label}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {addr.street}, {addr.city}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Card
                      variant={selectedAddressMode === 'new' ? 'outlined' : 'elevation'}
                      sx={{
                        cursor: 'pointer',
                        borderColor: selectedAddressMode === 'new' ? 'primary.main' : 'divider',
                        bgcolor: selectedAddressMode === 'new' ? 'action.hover' : 'background.paper',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onClick={() => {
                        setSelectedAddressMode('new');
                        setDeliveryInfo(prev => ({ ...prev, address: '' }));
                      }}
                    >
                      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
                        <Typography variant="subtitle2">Add New Address</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          )}

          {(selectedAddressMode === 'new' || !user?.savedAddresses?.length) && (
            <Grid size={{ xs: 12 }}>
              <GooglePlacesAutocomplete
                label="Delivery Address *"
                placeholder="Enter your delivery address"
                value={deliveryInfo.address}
                onChange={(address: string) => setDeliveryInfo((prev) => ({ ...prev, address }))}
                onPlaceSelect={(placeData: any) => {
                  if (placeData) {
                    setDeliveryInfo((prev) => ({ 
                      ...prev, 
                      address: placeData.formattedAddress,
                      latitude: placeData.lat,
                      longitude: placeData.lng,
                      businessName: (placeData.name && placeData.name !== placeData.formattedAddress) ? placeData.name : prev.businessName
                    }));
                  }
                }}
                types={['address']}
                includeCurrentLocation={true}
                required
                apiKey={settings?.system?.googleMapsApiKey}
              />
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Business / Building Name (Optional)"
              placeholder="e.g. Apartment, Suite, Floor, or Business Name"
              value={deliveryInfo.businessName}
              onChange={(e) => setDeliveryInfo((prev) => ({ ...prev, businessName: e.target.value }))}
              helperText="Helps the courier identify your specific location."
            />
          </Grid>

          {/* Delivery Provider Selection */}
          <Grid size={{ xs: 12 }}>
            {isFetchingQuote && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 3 }}>
                <Spinner size={20} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Finding the best delivery rate for you...</Typography>
              </Box>
            )}
            
            {/* Provider selection hidden from customer view as logic is automatic based on fee */}
            {!isFetchingQuote && deliveryQuotes.length > 0 && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.1) }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main', fontWeight: 600 }}>
                  <CheckCircle fontSize="small" /> Delivery fee calculated successfully based on your location.
                </Typography>
              </Box>
            )}
            
            {quoteError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                {quoteError}
              </Alert>
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Phone Number *"
              value={deliveryInfo.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setDeliveryInfo((prev) => ({ ...prev, phone: value }));
              }}
              placeholder="10-digit mobile number"
              required
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth>
              <FormLabel sx={{ fontWeight: 600, mb: 1 }}>Delivery Time</FormLabel>
              <RadioGroup
                value={deliveryInfo.deliveryTime}
                onChange={(e) => setDeliveryInfo((prev) => ({ ...prev, deliveryTime: e.target.value }))}
                row
              >
                <FormControlLabel 
                  value="asap" 
                  control={<Radio />} 
                  label={<Typography variant="body2" fontWeight="700">ASAP (30-45 mins)</Typography>} 
                />
                <FormControlLabel 
                  value="later" 
                  control={<Radio />} 
                  label={<Typography variant="body2" fontWeight="700">Schedule for later</Typography>} 
                />
              </RadioGroup>
              
              {deliveryInfo.deliveryTime === 'later' && (
                <Stack spacing={2} sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03), borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>Select Date</Typography>
                    <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                      {[0, 1].map((offset) => {
                        const date = new Date();
                        date.setDate(date.getDate() + offset);
                        const dateStr = date.toISOString().split('T')[0];
                        const isSelected = scheduledDate === dateStr;
                        return (
                          <Chip
                            key={dateStr}
                            label={offset === 0 ? 'Today' : 'Tomorrow'}
                            onClick={() => setScheduledDate(dateStr)}
                            color={isSelected ? 'primary' : 'default'}
                            variant={isSelected ? 'filled' : 'outlined'}
                            sx={{ borderRadius: 2, fontWeight: 'bold' }}
                          />
                        );
                      })}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>Available Slots</Typography>
                    <Grid container spacing={1}>
                      {generateTimeSlots(scheduledDate).length > 0 ? (
                        generateTimeSlots(scheduledDate).map((time) => (
                          <Grid size={{ xs: 4, sm: 3, md: 2 }} key={time}>
                            <Button
                              variant={scheduledTime === time ? "contained" : "outlined"}
                              fullWidth
                              size="small"
                              onClick={() => setScheduledTime(time)}
                              sx={{
                                borderRadius: 2,
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                py: 0.5,
                                textTransform: 'none',
                                ...(scheduledTime !== time && {
                                  color: 'text.primary',
                                  borderColor: 'divider',
                                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
                                })
                              }}
                            >
                              {new Date(`2000-01-01T${time}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </Button>
                          </Grid>
                        ))
                      ) : (
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="body2" color="error">No available slots for this date.</Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </Stack>
              )}
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Driver Tip
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                {TIP_PERCENTAGES.map((pct) => (
                  <Chip
                    key={pct}
                    label={`${pct}%  ($${computeTip(pct).toFixed(2)})`}
                    clickable
                    color={selectedTipPercent === pct ? 'primary' : 'default'}
                    variant={selectedTipPercent === pct ? 'filled' : 'outlined'}
                    onClick={() => handleTipSelect(pct)}
                    sx={{
                      fontWeight: selectedTipPercent === pct ? 700 : 500,
                      fontSize: '0.85rem',
                      px: 1,
                    }}
                  />
                ))}
                <Chip
                  label="Custom"
                  clickable
                  color={selectedTipPercent === 'custom' ? 'primary' : 'default'}
                  variant={selectedTipPercent === 'custom' ? 'filled' : 'outlined'}
                  onClick={() => handleTipSelect('custom')}
                  sx={{
                    fontWeight: selectedTipPercent === 'custom' ? 700 : 500,
                    fontSize: '0.85rem',
                    px: 1,
                  }}
                />
              </Box>
              {selectedTipPercent === 'custom' && (
                <TextField
                  size="small"
                  label="Custom Tip ($)"
                  type="number"
                  value={customTipValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomTipValue(val);
                    setDeliveryInfo(prev => ({ ...prev, tip: parseFloat(val) || 0 }));
                  }}
                  inputProps={{ step: '0.50', min: '0' }}
                  sx={{ maxWidth: 200 }}
                />
              )}
              {Number(deliveryInfo.tip) > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Tip amount: ${Number(deliveryInfo.tip).toFixed(2)}
                </Typography>
              )}
            </Box>
          </Grid>

          {hasAlcohol && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 3, border: '2px solid', borderColor: theme.palette.warning.main }}>
                <Typography variant="subtitle2" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, fontWeight: 'bold' }}>
                  <CheckCircle fontSize="small" /> Age Restricted Order (Alcohol)
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  This order contains alcoholic beverages. You must be at least 18 years old to place this order. **Contactless delivery is disabled** for age-restricted items as ID verification is required.
                </Typography>
                <Typography variant="caption" fontWeight="bold" sx={{ mb: 1.5, display: 'block' }}>Please confirm your age:</Typography>
                <Stack direction="row" spacing={2}>
                  <Button 
                    variant={ageVerification === 'above' ? "contained" : "outlined"} 
                    color="success"
                    onClick={() => setAgeVerification('above')}
                    fullWidth
                    sx={{ borderRadius: 2, fontWeight: 'bold' }}
                  >
                    I am Above 18
                  </Button>
                  <Button 
                    variant={ageVerification === 'below' ? "contained" : "outlined"} 
                    color="error"
                    onClick={() => setAgeVerification('below')}
                    fullWidth
                    sx={{ borderRadius: 2, fontWeight: 'bold' }}
                  >
                    I am Below 18
                  </Button>
                </Stack>
                {ageVerification === 'below' && (
                  <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                    You must be 18+ to order alcohol. Please remove the age-restricted items from your cart to proceed.
                  </Alert>
                )}
              </Box>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Box sx={{ 
              mt: 1, 
              p: 2, 
              bgcolor: hasAlcohol ? alpha(theme.palette.action.disabledBackground, 0.1) : alpha(theme.palette.success.main, 0.03), 
              borderRadius: 3, 
              border: '1px solid', 
              borderColor: hasAlcohol ? 'divider' : alpha(theme.palette.success.main, 0.1),
              opacity: hasAlcohol ? 0.7 : 1
            }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deliveryInfo.isContactless}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeliveryInfo(prev => ({ ...prev, isContactless: e.target.checked }))}
                    color="success"
                    disabled={hasAlcohol}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight="700" color={hasAlcohol ? 'text.secondary' : 'text.primary'}>
                      Contactless Delivery {hasAlcohol && '(Disabled for Alcohol)'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Driver will leave the order at your door/lobby</Typography>
                  </Box>
                }
              />
              <TextField
                fullWidth
                required={deliveryInfo.isContactless}
                label={deliveryInfo.isContactless ? "Drop-off Instructions *" : "Drop-off Instructions (Optional)"}
                placeholder="e.g., Leave at the front gate, code is 1234, ring the bell"
                size="small"
                sx={{ mt: 2 }}
                value={deliveryInfo.dropOffInstructions}
                onChange={(e) => setDeliveryInfo(prev => ({ ...prev, dropOffInstructions: e.target.value }))}
                helperText={deliveryInfo.isContactless 
                  ? "Required for contactless delivery (e.g. gate code, door color)" 
                  : "Help the driver find your location accurately (e.g. gate code, floor number, etc.)"}
              />
            </Box>
          </Grid>
        </Grid>
      )}
      {orderType === 'takeaway' && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="subtitle2">Takeaway Information</Typography>
            <Typography variant="body2">
              Your order will be ready for online takeaway in 15-20 minutes. We'll send you a notification when it's ready.
            </Typography>
          </Alert>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Phone Number *"
                value={deliveryInfo.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setDeliveryInfo((prev) => ({ ...prev, phone: value }));
                }}
                placeholder="10-digit mobile number"
                required
              />
            </Grid>
          </Grid>
        </Box>
      )}
    </Paper>
  );

  const renderPaymentStep = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Payment color="primary" /> Payment Method
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }} alignItems="stretch">
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant={paymentMethod === 'qr' ? 'outlined' : 'elevation'}
            sx={{ 
              height: '100%',
              borderColor: paymentMethod === 'qr' ? 'primary.main' : 'divider', 
              borderWidth: paymentMethod === 'qr' ? 2 : 1, 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column' 
            }}
            onClick={() => setPaymentMethod('qr')}
          >
            <CardActionArea sx={{ p: 2, flex: 1 }}>
              <Stack alignItems="center" spacing={1}>
                <QrCode fontSize="large" color={paymentMethod === 'qr' ? 'primary' : 'action'} />
                <Typography variant="subtitle1" fontWeight="bold">QR Code</Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Scan QR code to pay (UPI, Wallet)
                </Typography>
                {paymentMethod === 'qr' && <CheckCircle color="primary" />}
              </Stack>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant={paymentMethod === 'card' ? 'outlined' : 'elevation'}
            sx={{ 
              height: '100%',
              borderColor: paymentMethod === 'card' ? 'primary.main' : 'divider', 
              borderWidth: paymentMethod === 'card' ? 2 : 1, 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={() => setPaymentMethod('card')}
          >
            <CardActionArea sx={{ p: 2, flex: 1 }}>
              <Stack alignItems="center" spacing={1}>
                <CreditCard fontSize="large" color={paymentMethod === 'card' ? 'primary' : 'action'} />
                <Typography variant="subtitle1" fontWeight="bold">Card Payment</Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Secure payment via Stripe
                </Typography>
                {paymentMethod === 'card' && <CheckCircle color="primary" />}
              </Stack>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
      {paymentMethod === 'qr' && (
        <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle1" gutterBottom>Scan to Pay</Typography>
          <QrCode sx={{ fontSize: 150 }} />
          <Typography variant="body2" color="text.secondary">
            Amount Due: ${(
              cart.totalAmount +
              (orderType === 'delivery' && activeStep >= 2 ? deliveryFee + (Number(deliveryInfo.tip) || 0) : 0) +
              cart.totalAmount * (taxRate / 100)
            ).toFixed(2)}
          </Typography>
        </Box>
      )}
      {paymentMethod === 'card' && (
        <Box sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
          {isAuthenticated && savedCards.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="700">Saved Cards</Typography>
              <Grid container spacing={1}>
                {savedCards.map((card, idx) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                    <Card 
                      variant={selectedSavedCard === idx ? 'outlined' : 'elevation'}
                      sx={{ 
                        p: 1.5, 
                        cursor: 'pointer', 
                        borderColor: selectedSavedCard === idx ? 'primary.main' : 'divider',
                        bgcolor: selectedSavedCard === idx ? alpha(theme.palette.primary.main, 0.05) : 'background.paper'
                      }}
                      onClick={() => setSelectedSavedCard(idx)}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <CreditCard color={selectedSavedCard === idx ? "primary" : "action"} />
                        <Box>
                          <Typography variant="body2" fontWeight="700">{card.brand} •••• {card.last4}</Typography>
                          <Typography variant="caption" color="text.secondary">Expires {card.expMonth}/{card.expYear}</Typography>
                        </Box>
                      </Stack>
                    </Card>
                  </Grid>
                ))}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card 
                    variant={selectedSavedCard === null ? 'outlined' : 'elevation'}
                    sx={{ 
                      p: 1.5, 
                      cursor: 'pointer', 
                      borderColor: selectedSavedCard === null ? 'primary.main' : 'divider',
                      bgcolor: selectedSavedCard === null ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onClick={() => setSelectedSavedCard(null)}
                  >
                    <Typography variant="body2" fontWeight="700">+ Use New Card</Typography>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {selectedSavedCard === null ? (
            <>
              <Typography variant="subtitle2" gutterBottom fontWeight="700">Enter Card Details</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField 
                    fullWidth 
                    label="Card Number" 
                    placeholder="0000 0000 0000 0000" 
                    size="small"
                    value={cardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                      setCardNumber(val.slice(0, 19));
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField 
                    fullWidth 
                    label="Expiry Date" 
                    placeholder="MM/YY" 
                    size="small"
                    value={cardExpiry}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                      setCardExpiry(val.slice(0, 5));
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField 
                    fullWidth 
                    label="CVC" 
                    placeholder="123" 
                    size="small"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                </Grid>
                {isAuthenticated && (
                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={<Checkbox checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} size="small" />}
                      label={<Typography variant="body2">Save card for future purposes</Typography>}
                    />
                  </Grid>
                )}
              </Grid>
            </>
          ) : (
            <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
              <Typography variant="body2">Using saved card: <strong>{savedCards[selectedSavedCard].brand} •••• {savedCards[selectedSavedCard].last4}</strong></Typography>
              <Button size="small" sx={{ mt: 1 }} onClick={() => setSelectedSavedCard(null)}>Change Card</Button>
            </Box>
          )}
          
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
            Total Payment: <strong>${(
              cart.totalAmount +
              (orderType === 'delivery' && activeStep >= 2 ? deliveryFee + (Number(deliveryInfo.tip) || 0) : 0) +
              cart.totalAmount * (taxRate / 100)
            ).toFixed(2)}</strong> (Secure Stripe integration demo)
          </Alert>
        </Box>
      )}
    </Paper>
  );

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderCartReview();
      case 1:
        return renderAccountStep();
      case 2:
        return renderDeliveryStep();
      case 3:
        return renderPaymentStep();
      default:
        return 'Unknown step';
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return cart.items.length > 0;
      case 1:
        return isAuthenticated || authMethod === 'guest';
      case 2:
        const isTimeValid = deliveryInfo.deliveryTime === 'asap' || (deliveryInfo.deliveryTime === 'later' && scheduledTime !== '');
        const isContactlessValid = !deliveryInfo.isContactless || (deliveryInfo.isContactless && deliveryInfo.dropOffInstructions.trim() !== '');
        const isAgeValid = !hasAlcohol || ageVerification === 'above';
        return (orderType === 'takeaway' || (orderType === 'delivery' && deliveryInfo.address && deliveryInfo.phone)) && isTimeValid && isContactlessValid && isAgeValid;
      case 3:
        if (paymentMethod === 'card') {
          const isSavedCardSelected = selectedSavedCard !== null;
          const cleanCardNum = cardNumber.replace(/\s/g, '');
          const isAmex = cleanCardNum.startsWith('34') || cleanCardNum.startsWith('37');
          const isCardNumValid = isAmex ? cleanCardNum.length === 15 : cleanCardNum.length === 16;
          const isNewCardEntered = isCardNumValid && cardExpiry.length >= 5 && cardCvc.length >= 3;
          return isSavedCardSelected || isNewCardEntered;
        }
        return true;
      default:
        return false;
    }
  };

  if (placedOrder) {
    const trackingUrl = placedOrder.trackingUrl || placedOrder.uberEatsTrackingUrl || placedOrder.doordashTrackingUrl;
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 8, bgcolor: alpha(theme.palette.success.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.1) }}>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />
          <Typography variant="h3" fontWeight="900" gutterBottom>
            Order Placed!
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Your order <strong>#{placedOrder.orderNumber}</strong> has been received and is being prepared.
          </Typography>
          
          <Stack spacing={2} sx={{ mt: 4, maxWidth: 400, mx: 'auto' }}>
            {trackingUrl && (
              <Button 
                variant="contained" 
                color="success" 
                size="large" 
                fullWidth
                startIcon={<DeliveryDining />}
                sx={{ py: 2, borderRadius: 4, fontWeight: 'bold', fontSize: '1.1rem' }}
                onClick={() => window.open(trackingUrl, '_blank')}
              >
                Track on {placedOrder.deliveryProvider === 'ubereats' ? 'Uber Eats' : 'DoorDash'}
              </Button>
            )}
            <Button 
              variant="outlined" 
              size="large" 
              fullWidth
              sx={{ py: 1.5, borderRadius: 4, fontWeight: 'bold' }}
              onClick={() => {
                 if (slug) navigate(`/${slug}/customer/order`);
                 else navigate('/');
              }}
            >
              Return to Menu
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (cart.items.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ShoppingCart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Your cart is empty
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Add some delicious items to your cart before proceeding to checkout.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/menu')}>
            Browse Menu
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Checkout
      </Typography>
      <Stepper 
    activeStep={activeStep} 
    sx={{ 
        mb: 4,
        '& .MuiStepLabel-label': {
            fontSize: { xs: '0.65rem', sm: '0.875rem' },
            fontWeight: 700,
        },
        '& .MuiStepIcon-root': {
            fontSize: { xs: '1.2rem', sm: '1.5rem' },
        },
        '& .MuiStep-root': {
            px: { xs: 0.5, sm: 1 },
        },
        '& .MuiStepConnector-line': {
            minWidth: { xs: '10px', sm: '20px' },
        }
    }}
>
    {steps.map((label, index) => (
        <Step key={label} completed={activeStep > index}>
            <StepLabel>{label}</StepLabel>
        </Step>
    ))}
</Stepper>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          {renderStepContent(activeStep)}
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Subtotal ({cart.totalItems} items)</Typography>
                  <Typography>${cart.totalAmount.toFixed(2)}</Typography>
                </Box>
                {orderType === 'delivery' && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography>Delivery Fee</Typography>
                      <Typography color={isFetchingQuote ? 'text.secondary' : 'text.primary'} sx={{ fontStyle: activeStep < 2 ? 'italic' : 'normal', fontSize: activeStep < 2 ? '0.85rem' : '1rem' }}>
                        {activeStep < 2 ? 'Calculated at next step' : isFetchingQuote ? 'Calculating...' : `$${deliveryFee.toFixed(2)}`}
                      </Typography>
                    </Box>
                    {selectedProvider && !isFetchingQuote && activeStep >= 2 && (
                      <Typography variant="caption" align="right" display="block" color="primary" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
                        via {selectedProvider === 'doordash' ? 'DoorDash' : 'Uber Eats'}
                      </Typography>
                    )}
                  </>
                )}
                {quoteError && orderType === 'delivery' && activeStep >= 2 && (
                  <Typography variant="caption" color="error" display="block" sx={{ mb: 1 }}>
                    {quoteError}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Tax ({taxRate}%)</Typography>
                  <Typography>${(cart.totalAmount * (taxRate / 100)).toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {orderType === 'delivery' && activeStep >= 2 && Boolean(Number(deliveryInfo.tip)) && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Tip</Typography>
                    <Typography>${Number(deliveryInfo.tip).toFixed(2)}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" color="primary">
                    ${(
                      cart.totalAmount +
                      (orderType === 'delivery' && activeStep >= 2 ? deliveryFee + (Number(deliveryInfo.tip) || 0) : 0) +
                      cart.totalAmount * (taxRate / 100)
                    ).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined" fullWidth>
                    Back
                  </Button>
                  {activeStep === steps.length - 1 ? (
                    <Button 
                      variant="contained" 
                      onClick={handlePlaceOrder} 
                      disabled={!isStepValid(activeStep) || placingOrder} 
                      fullWidth
                      startIcon={placingOrder ? <Spinner size={20} color="inherit" /> : null}
                    >
                      {placingOrder ? 'Placing Order...' : 'Place Order'}
                    </Button>
                  ) : (
                    <Button 
                      variant="contained" 
                      onClick={handleNext} 
                      disabled={!isStepValid(activeStep) || checkingDistance} 
                      fullWidth
                    >
                      {checkingDistance ? <Spinner size={24} color="inherit" /> : 'Next'}
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Dialog open={showAuthDialog} onClose={() => setShowAuthDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{authMethod === 'register' ? 'Create Account' : 'Sign In'}</DialogTitle>
        <DialogContent>
          {authMethod === 'register' ? (
            <CustomerRegistration onClose={() => setShowAuthDialog(false)} onSuccess={handleAuthSuccess} />
          ) : (
            <Box sx={{ p: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Please sign in to your account to continue.
              </Alert>
              <Button 
                variant="contained" 
                fullWidth 
                sx={{ mt: 2 }} 
                onClick={() => handleAuthSuccess({ firstName: 'Guest', lastName: 'User' })}
              >
                Sign In (Demo)
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, flexDirection: 'column', gap: 2 }}
        open={placingOrder}
      >
        <Spinner color="inherit" />
        <Typography variant="h6">Placing your delicious order...</Typography>
        <Typography variant="body2">Please don't refresh the page</Typography>
      </Backdrop>
      {/* Distance Error Dialog */}
      <Dialog
        open={showDistanceDialog}
        onClose={() => setShowDistanceDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1
          }
        }}
      >
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          <Box sx={{ 
            bgcolor: alpha(theme.palette.warning.main, 0.1), 
            color: 'warning.main',
            width: 80,
            height: 80,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3
          }}>
            <WarningIcon sx={{ fontSize: 48 }} />
          </Box>
          <Typography variant="h5" fontWeight="900" gutterBottom sx={{ color: 'text.primary' }}>
            Out of Delivery Range
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
            Unfortunately, this address is outside our standard 15-mile delivery zone. 
            Uber and DoorDash are unable to service this distance.
          </Typography>
          
          <Stack spacing={2}>
            <Button
              variant="contained"
              fullWidth
              size="large"
              color="primary"
              startIcon={<Storefront />}
              sx={{ py: 1.5, borderRadius: 3, fontWeight: 'bold' }}
              onClick={() => {
                setOrderTypeState('takeaway');
                setOrderType('takeaway');
                setShowDistanceDialog(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Switch to Takeaway
            </Button>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              sx={{ py: 1.5, borderRadius: 3, fontWeight: 'bold' }}
              onClick={() => setShowDistanceDialog(false)}
            >
              Try Another Address
            </Button>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Delivery zone: within 15 miles
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default CheckoutPage;
