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
  CircularProgress,
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
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useGuestCart } from '../context/GuestCartContext';
import CustomerRegistration from '../components/auth/CustomerRegistration';
import GooglePlacesAutocomplete from '../components/common/GooglePlacesAutocomplete';
import { toast } from 'react-hot-toast';
import { ordersAPI } from '../services/api';
import { isWithinDeliveryRadius, METERS_PER_MILE } from '../services/googleMapsService';



const steps = ['Cart Review', 'Account', 'Delivery Details', 'Payment'];

interface DeliveryInfo {
  address: string;
  phone: string;
  notes: string;
  tip: number | '';
  deliveryTime: string;
}

const CheckoutPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const isAuthenticated = !!user;
  const { cart, setOrderType, setDeliveryAddress, clearCart } = useGuestCart();

  const [activeStep, setActiveStep] = useState<number>(0);
  const [authMethod, setAuthMethod] = useState<'register' | 'login' | 'guest'>('register');
  const [showAuthDialog, setShowAuthDialog] = useState<boolean>(false);
  const [orderType, setOrderTypeState] = useState<'delivery' | 'takeaway'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'card'>('cash');
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    address: '',
    phone: '',
    notes: '',
    tip: '',
    deliveryTime: 'asap',
  });
  const [selectedAddressMode, setSelectedAddressMode] = useState<'saved' | 'new'>(
    user?.savedAddresses?.length ? 'saved' : 'new'
  );
  const [error, setError] = useState<string>('');
  const [checkingDistance, setCheckingDistance] = useState<boolean>(false);

  // Redirect if cart empty
  useEffect(() => {
    if (cart.items.length === 0 && activeStep === 0) {
      if (slug) {
        navigate(`/${slug}/customer/order`);
      } else {
        navigate('/login');
      }
    }
  }, [cart.items.length, navigate, slug, activeStep]);

  // Auto‑skip account step for logged‑in users
  useEffect(() => {
    if (isAuthenticated && activeStep === 1) {
      setActiveStep(2);
    }
  }, [isAuthenticated, activeStep]);

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
    setActiveStep((prev) => prev - 1);
  };

  const handleAuthSuccess = (userData: any) => {
    setShowAuthDialog(false);
    setActiveStep(2);
  };

  const handlePlaceOrder = async () => {
    try {
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
        deliveryAddress: orderType === 'delivery' ? deliveryInfo.address : null,
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
          email: '', // guest email if available
          notes: deliveryInfo.notes,
        },
        total: cart.totalAmount,
        tip: orderType === 'delivery' ? Number(deliveryInfo.tip) || 0 : 0,
      };
      await ordersAPI.create(orderData);
      clearCart();
      toast.success('Order placed successfully!', {
          duration: 5000,
          position: 'top-center',
          style: { background: '#2ecc71', color: '#fff', fontWeight: 'bold' }
      });
      // Redirect back to menu or track order page
      if (slug) {
        navigate(`/${slug}/customer/order`);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      // Prioritize 'error' field which contains subscription limit messages
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to place order. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const renderCartReview = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShoppingCart color="primary" /> Review Your Order
      </Typography>
      {cart.items.map((item: any, index: number) => (
        <Box key={index} sx={{ py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle1">{item.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Quantity: {item.quantity} × ${item.price.toFixed(2)}
              </Typography>
              {item.spiceLevel && (
                <Chip 
                  size="small" 
                  label={`Spice: ${item.spiceLevel}`} 
                  color="warning" 
                  variant="outlined" 
                  sx={{ mt: 0.5, fontWeight: 'bold', textTransform: 'capitalize' }} 
                />
              )}
              {item.customizations.length > 0 && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {item.customizations.map((c: any) => c.name).join(', ')}
                </Typography>
              )}
            </Box>
            <Typography variant="subtitle1" fontWeight="bold">
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
                          setDeliveryInfo(prev => ({ ...prev, address: addrStr }));
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
                    setDeliveryInfo((prev) => ({ ...prev, address: placeData.formattedAddress }));
                  }
                }}
                types={['address']}
                includeCurrentLocation={true}
                required
                apiKey={settings?.system?.googleMapsApiKey}
              />
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Phone Number *"
              value={deliveryInfo.phone}
              onChange={(e) => setDeliveryInfo((prev) => ({ ...prev, phone: e.target.value }))}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <FormLabel>Delivery Time</FormLabel>
              <RadioGroup
                value={deliveryInfo.deliveryTime}
                onChange={(e) => setDeliveryInfo((prev) => ({ ...prev, deliveryTime: e.target.value }))}
              >
                <FormControlLabel value="asap" control={<Radio />} label="ASAP (30-45 mins)" />
                <FormControlLabel value="later" control={<Radio />} label="Schedule for later" />
              </RadioGroup>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Driver Tip ($) (Optional)"
              type="number"
              value={deliveryInfo.tip}
              onChange={(e) => setDeliveryInfo((prev) => ({ ...prev, tip: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) }))}
              inputProps={{ step: "0.50", min: "0" }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Delivery Notes (Optional)"
              multiline
              rows={2}
              value={deliveryInfo.notes}
              onChange={(e) => setDeliveryInfo((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special instructions for delivery..."
            />
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
                onChange={(e) => setDeliveryInfo((prev) => ({ ...prev, phone: e.target.value }))}
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
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            variant={paymentMethod === 'cash' ? 'outlined' : 'elevation'}
            sx={{ borderColor: paymentMethod === 'cash' ? 'primary.main' : 'divider', borderWidth: paymentMethod === 'cash' ? 2 : 1, cursor: 'pointer' }}
            onClick={() => setPaymentMethod('cash')}
          >
            <CardActionArea sx={{ p: 2, height: '100%' }}>
              <Stack alignItems="center" spacing={1}>
                <AttachMoney fontSize="large" color={paymentMethod === 'cash' ? 'primary' : 'action'} />
                <Typography variant="subtitle1" fontWeight="bold">Cash</Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Pay with cash upon delivery or online takeaway
                </Typography>
                {paymentMethod === 'cash' && <CheckCircle color="primary" />}
              </Stack>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            variant={paymentMethod === 'qr' ? 'outlined' : 'elevation'}
            sx={{ borderColor: paymentMethod === 'qr' ? 'primary.main' : 'divider', borderWidth: paymentMethod === 'qr' ? 2 : 1, cursor: 'pointer' }}
            onClick={() => setPaymentMethod('qr')}
          >
            <CardActionArea sx={{ p: 2, height: '100%' }}>
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
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            variant={paymentMethod === 'card' ? 'outlined' : 'elevation'}
            sx={{ borderColor: paymentMethod === 'card' ? 'primary.main' : 'divider', borderWidth: paymentMethod === 'card' ? 2 : 1, cursor: 'pointer' }}
            onClick={() => setPaymentMethod('card')}
          >
            <CardActionArea sx={{ p: 2, height: '100%' }}>
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
          <Typography variant="body2" color="text.secondary">Amount: ${cart.totalAmount.toFixed(2)}</Typography>
        </Box>
      )}
      {paymentMethod === 'card' && (
        <Box sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle1" gutterBottom>Enter Card Details</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Card Number" placeholder="0000 0000 0000 0000" size="small" />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Expiry Date" placeholder="MM/YY" size="small" />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="CVC" placeholder="123" size="small" />
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            This is a secure Stripe integration demo. No actual charge will be made.
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
        return orderType === 'takeaway' || (orderType === 'delivery' && deliveryInfo.address && deliveryInfo.phone);
      case 3:
        return true;
      default:
        return false;
    }
  };

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
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Delivery Fee</Typography>
                    <Typography>$3.99</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Tax</Typography>
                  <Typography>${(cart.totalAmount * 0.08).toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {orderType === 'delivery' && Boolean(Number(deliveryInfo.tip)) && (
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
                      (orderType === 'delivery' ? 3.99 + (Number(deliveryInfo.tip) || 0) : 0) +
                      cart.totalAmount * 0.08
                    ).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined" fullWidth>
                    Back
                  </Button>
                  {activeStep === steps.length - 1 ? (
                    <Button variant="contained" onClick={handlePlaceOrder} disabled={!isStepValid(activeStep)} fullWidth>
                      Place Order
                    </Button>
                  ) : (
                    <Button 
                      variant="contained" 
                      onClick={handleNext} 
                      disabled={!isStepValid(activeStep) || checkingDistance} 
                      fullWidth
                    >
                      {checkingDistance ? <CircularProgress size={24} color="inherit" /> : 'Next'}
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
              <Alert severity="info">Login form would be implemented here.</Alert>
              <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={() => handleAuthSuccess({ firstName: 'Guest', lastName: 'User' })}>
                Demo Login
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default CheckoutPage;
