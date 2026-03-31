import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Divider,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Chip,

  IconButton
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  Google as GoogleIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Apple as AppleIcon,
  Visibility,
  VisibilityOff,
  LocationOn,
  Fastfood
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { customerRegister } from '../../services/authService';
import GooglePlacesAutocomplete from '../common/GooglePlacesAutocomplete';
import PhoneInput from '../PhoneInput';
import { useSettings } from '../../context/SettingsContext';

const steps = ['Basic Info', 'Delivery Address', 'Food Preferences'];

const dietaryOptions = [
  { value: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
  { value: 'vegan', label: 'Vegan', icon: '🌱' },
  { value: 'gluten-free', label: 'Gluten-Free', icon: '🌾' },
  { value: 'dairy-free', label: 'Dairy-Free', icon: '🥛' },
  { value: 'nut-free', label: 'Nut-Free', icon: '🥜' },
  { value: 'halal', label: 'Halal', icon: '☪️' },
  { value: 'kosher', label: 'Kosher', icon: '✡️' }
];

const spiceLevels = [
  { value: 'mild', label: 'Mild', icon: '🌶️', color: '#4caf50' },
  { value: 'medium', label: 'Medium', icon: '🌶️🌶️', color: '#ff9800' },
  { value: 'hot', label: 'Hot', icon: '🌶️🌶️🌶️', color: '#f44336' },
  { value: 'extra-hot', label: 'Extra Hot', icon: '🌶️🌶️🌶️🌶️', color: '#d32f2f' }
];

interface CustomerRegistrationProps {
  onClose?: () => void;
  onSuccess?: (userData: any) => void;
}

const CustomerRegistration: React.FC<CustomerRegistrationProps> = ({ onClose, onSuccess }) => {
  const { login } = useAuth();
  const { settings } = useSettings();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dialCode: settings?.restaurant?.dialCode || '1',
    defaultDeliveryAddress: {
      name: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      landmark: '',
      instructions: ''
    },
    dietaryRestrictions: [] as string[],
    spiceLevel: 'medium'
  });

  // Sync dial code with settings
  useEffect(() => {
    if (settings?.restaurant?.dialCode && activeStep === 0) {
      setFormData(prev => ({ ...prev, dialCode: settings.restaurant.dialCode }));
    }
  }, [settings?.restaurant?.dialCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        defaultDeliveryAddress: {
          ...prev.defaultDeliveryAddress,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDietaryChange = (restriction: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.phone.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }
    setLoading(true);
    try {
      const registrationData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        dialCode: formData.dialCode,
        dietaryRestrictions: formData.dietaryRestrictions,
        spiceLevel: formData.spiceLevel,
        defaultDeliveryAddress: formData.defaultDeliveryAddress
      };
      const response = await customerRegister(registrationData);
      if (response.data) {
        await login(response.data);
        onSuccess && onSuccess(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setError('');
    setLoading(true);
    try {
      // Placeholder for social login integration
      alert(`${provider} OAuth integration would be implemented here`);
    } catch (err: any) {
      setError(`${provider} login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            variant="outlined"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            variant="outlined"
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            variant="outlined"
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <PhoneInput
            fullWidth
            label="Phone Number"
            value={formData.phone}
            onChange={(val) => {
              const clean = val.replace(/\D/g, '');
              if (clean.length <= 10) {
                setFormData({ ...formData, phone: clean });
              }
            }}
            dialCode={formData.dialCode}
            onDialCodeChange={(code) => setFormData({ ...formData, dialCode: code })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            required
            variant="outlined"
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              )
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            variant="outlined"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const handleAddressSelect = (placeData: any) => {
    if (placeData) {
      setFormData(prev => ({
        ...prev,
        defaultDeliveryAddress: {
          ...prev.defaultDeliveryAddress,
          street: placeData.formattedAddress,
          city: placeData.components?.city || '',
          state: placeData.components?.state || '',
          zipCode: placeData.components?.zipCode || '',
          placeId: placeData.placeId,
          location: placeData.location
        }
      }));
    }
  };

  const renderDeliveryAddress = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocationOn color="primary" />
        Delivery Address
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Address Name (Home, Office, etc.)"
            name="address.name"
            value={formData.defaultDeliveryAddress.name}
            onChange={handleChange}
            variant="outlined"
            placeholder="e.g., Home, Office, Mom's House"
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <GooglePlacesAutocomplete
            label="Street Address *"
            placeholder="Start typing your address or use current location"
            value={formData.defaultDeliveryAddress.street}
            onChange={(address: string) => {
              setFormData(prev => ({
                ...prev,
                defaultDeliveryAddress: {
                  ...prev.defaultDeliveryAddress,
                  street: address
                }
              }));
            }}
            onPlaceSelect={handleAddressSelect}
            types={['address']}
            countryRestriction={['us']}
            includeCurrentLocation={true}
            variant="outlined"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="City"
            name="address.city"
            value={formData.defaultDeliveryAddress.city}
            onChange={handleChange}
            variant="outlined"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField
            fullWidth
            label="State"
            name="address.state"
            value={formData.defaultDeliveryAddress.state}
            onChange={handleChange}
            variant="outlined"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField
            fullWidth
            label="ZIP Code"
            name="address.zipCode"
            value={formData.defaultDeliveryAddress.zipCode}
            onChange={handleChange}
            variant="outlined"
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Landmark (Optional)"
            name="address.landmark"
            value={formData.defaultDeliveryAddress.landmark}
            onChange={handleChange}
            variant="outlined"
            placeholder="e.g., Near Central Park, Behind Starbucks"
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Delivery Instructions (Optional)"
            name="address.instructions"
            value={formData.defaultDeliveryAddress.instructions}
            onChange={handleChange}
            multiline
            rows={2}
            variant="outlined"
            placeholder="e.g., Ring doorbell twice, Leave at front door, Call when you arrive"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderFoodPreferences = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Fastfood color="primary" />
        Food Preferences
      </Typography>
      <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
        Dietary Restrictions (Optional)
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {dietaryOptions.map((option) => (
          <Chip
            key={option.value}
            label={`${option.icon} ${option.label}`}
            onClick={() => handleDietaryChange(option.value)}
            color={formData.dietaryRestrictions.includes(option.value) ? 'primary' : 'default'}
            variant={formData.dietaryRestrictions.includes(option.value) ? 'filled' : 'outlined'}
            clickable
          />
        ))}
      </Box>
      <Typography variant="subtitle2" gutterBottom>
        Preferred Spice Level
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {spiceLevels.map((level) => (
          <Chip
            key={level.value}
            label={`${level.icon} ${level.label}`}
            onClick={() => setFormData(prev => ({ ...prev, spiceLevel: level.value }))}
            sx={{
              color: formData.spiceLevel === level.value ? 'white' : level.color,
              backgroundColor: formData.spiceLevel === level.value ? level.color : 'transparent',
              borderColor: level.color,
              '&:hover': {
                backgroundColor: level.color,
                color: 'white'
              }
            }}
            variant={formData.spiceLevel === level.value ? 'filled' : 'outlined'}
            clickable
          />
        ))}
      </Box>
    </Box>
  );

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderDeliveryAddress();
      case 2:
        return renderFoodPreferences();
      default:
        return null;
    }
  };

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Typography variant="h4" align="center" gutterBottom>
          Join Our Restaurant
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" gutterBottom>
          Create your account to start ordering delicious food
        </Typography>
        {/* Social Login Buttons */}
        <Box sx={{ my: 3 }}>
          <Typography variant="body2" align="center" gutterBottom>
            Quick Sign Up With
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              sx={{ minWidth: 120 }}
            >
              Google
            </Button>
            <Button
              variant="outlined"
              startIcon={<FacebookIcon />}
              onClick={() => handleSocialLogin('facebook')}
              disabled={loading}
              sx={{ minWidth: 120 }}
            >
              Facebook
            </Button>
            <Button
              variant="outlined"
              startIcon={<TwitterIcon />}
              onClick={() => handleSocialLogin('twitter')}
              disabled={loading}
              sx={{ minWidth: 120 }}
            >
              Twitter
            </Button>
            <Button
              variant="outlined"
              startIcon={<AppleIcon />}
              onClick={() => handleSocialLogin('apple')}
              disabled={loading}
              sx={{ minWidth: 120 }}
            >
              Apple
            </Button>
          </Box>
        </Box>
        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            OR
          </Typography>
        </Divider>
        {/* Multi-step Form */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          {renderStepContent(activeStep)}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  size="large"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  variant="contained"
                  disabled={
                    (activeStep === 0 && (!formData.firstName || !formData.lastName || !formData.email)) ||
                    loading
                  }
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </form>
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Button
              variant="text"
              onClick={onClose}
              sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
            >
              Sign In
            </Button>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CustomerRegistration;
