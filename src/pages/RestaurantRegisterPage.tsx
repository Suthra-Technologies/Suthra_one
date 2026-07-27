import React, { useState, useEffect } from 'react';
import { Backdrop, Box, Paper, TextField, Button, Typography, Alert, CircularProgress, Grid, CssBaseline, Avatar, MenuItem, InputAdornment, Select, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Restaurant, Visibility, VisibilityOff, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { validateEmail, validatePhone, validateName, validatePassword, validateCompanyName, validateRequired, validateEin, getHelperText, hasError } from '../utils/validation';
import type { ValidationResult } from '../utils/validation';
import { useAuth } from '../context/AuthContext';
import PhoneInput from '../components/PhoneInput';

interface RestaurantRegisterForm {
  restaurantName: string;
  slug: string;
  logo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dialCode: string;
  password: string;
  confirmPassword?: string;
  planId?: string;
  ein?: string;
}

interface Plan {
  _id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  features: string[];
  maxUsers?: number;
  maxTables?: number;
  maxOrders?: number;
  maxSms?: number;
}

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5006'}/api`;

const COUNTRIES = [
  { code: 'IN', label: 'India', phone: '+91' },
  { code: 'US', label: 'USA', phone: '+1' },
  { code: 'GB', label: 'UK', phone: '+44' },
  { code: 'AU', label: 'Australia', phone: '+61' },
  { code: 'AE', label: 'UAE', phone: '+971' },
  { code: 'JP', label: 'Japan', phone: '+81' },
  { code: 'CN', label: 'China', phone: '+86' },
  { code: 'DE', label: 'Germany', phone: '+49' },
  { code: 'FR', label: 'France', phone: '+33' },
  { code: 'SG', label: 'Singapore', phone: '+65' },
];

const RestaurantRegisterPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<RestaurantRegisterForm>(() => {
    try {
      const saved = localStorage.getItem('pending_registration_form');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved registration form:', e);
    }
    return {
      restaurantName: '',
      slug: '',
      logo: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dialCode: '1',
      password: '',
      confirmPassword: '',
      planId: undefined,
      ein: '',
    };
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successData, setSuccessData] = useState<{ restaurantName: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, ValidationResult>>({});
  const [slugAvailability, setSlugAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  useEffect(() => {
    const slug = form.slug.trim().toLowerCase();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      setSlugAvailability('idle');
      return;
    }

    setSlugAvailability('checking');
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/tenants/check-slug/${encodeURIComponent(slug)}`);
        const data = await res.json();
        setSlugAvailability(data.available ? 'available' : 'taken');
      } catch (err) {
        console.error('Failed to check domain availability', err);
        setSlugAvailability('idle');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [form.slug]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch(`${API_BASE}/superadmin/plans/public`);
        const data = await res.json();

        console.log("[Plans Lookup] Raw fetched plans from backend:", data);
        const finalPlans = (data || []).filter((plan: any) => {
          const nameLower = plan.name?.toLowerCase() || '';
          const intervalLower = plan.interval?.toLowerCase() || '';

          // STRICT EXCLUSION: If it contains 'sms' anywhere, reject it
          if (nameLower.includes('sms') || intervalLower.includes('sms')) return false;

          // STRICT INCLUSION: Only show plans with monthly interval
          const isMatch = intervalLower === 'monthly';
          if (isMatch) {
            console.log(`[Plans Lookup Match] Plan: "${plan.name}" has Interval: "${plan.interval}" (Matched Monthly Interval)`);
          }
          return isMatch;
        });

        console.log("[Plans Lookup] Final filtered plans showing in registration UI:", finalPlans);
        setPlans(finalPlans);
        // We no longer auto-select a plan by default as per user request to make it optional
      } catch (err) {
        console.error('Failed to fetch plans', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  // const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { name, value } = e.target;
  //   setForm({ ...form, [name]: value });
  //   // Clear error when user starts typing
  //   if (errors[name]) {
  //     setErrors(prev => ({ ...prev, [name]: { isValid: true } }));
  //   }
  // };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Special rule for phone input
    if (name === "phone") {
      const numeric = String(value || '').replace(/\D/g, ""); // keep only digits
      const isUS = form.dialCode === '1' || form.dialCode === '+1';
      const final = (isUS && numeric.length > 10) ? numeric.slice(-10) : numeric;
      setForm(prev => ({ ...prev, [name]: final }));

      // Clear error when user types a valid phone number (10 digits)
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: { isValid: true } }));
      }
      return;
    }

    // Auto-format EIN as ##-####### (max 9 digits)
    if (name === "ein") {
      const digits = String(value || '').replace(/\D/g, '').slice(0, 9);
      const formatted = digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
      setForm(prev => ({ ...prev, [name]: formatted }));

      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: { isValid: true } }));
      }
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));

    if (name === 'password') {
      setErrors(prev => ({ ...prev, [name]: validatePassword(value) }));
      if (form.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: { isValid: value === form.confirmPassword, message: value === form.confirmPassword ? '' : 'Passwords do not match' } }));
      }
    } else if (name === 'confirmPassword') {
      setErrors(prev => ({ ...prev, [name]: { isValid: value === form.password, message: value === form.password ? '' : 'Passwords do not match' } }));
    } else if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: { isValid: true } }));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file too large (max 5MB)');
      return;
    }

    setUploadingLogo(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      setForm(prev => ({ ...prev, logo: data.url }));
    } catch (err: any) {
      setError('Failed to upload logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBlur = (field: keyof RestaurantRegisterForm) => {
    const value = form[field] as string;
    let validation: ValidationResult;

    switch (field) {
      case 'restaurantName':
        validation = validateCompanyName(value);
        break;
      case 'slug':
        validation = validateRequired(value, 'Domain');
        if (validation.isValid && !/^[a-z0-9-]+$/.test(value)) {
          validation = { isValid: false, message: 'Domain must be lowercase letters, numbers, and hyphens only' };
        }
        break;
      case 'firstName':
        validation = validateName(value, 'First name');
        break;
      case 'lastName':
        validation = validateName(value, 'Last name');
        break;
      case 'email':
        validation = validateEmail(value);
        break;
      case 'phone':
        validation = validatePhone(value, form.dialCode);
        break;
      case 'password':
        validation = validatePassword(value);
        break;
      case 'confirmPassword':
        validation = { isValid: value === form.password, message: value === form.password ? '' : 'Passwords do not match' };
        break;
      case 'ein':
        validation = validateEin(value);
        break;
      default:
        validation = { isValid: true };
    }

    setErrors(prev => ({ ...prev, [field]: validation }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, ValidationResult> = {
      restaurantName: validateCompanyName(form.restaurantName),
      slug: validateRequired(form.slug, 'Domain'),
      firstName: validateName(form.firstName, 'First name'),
      lastName: validateName(form.lastName, 'Last name'),
      email: validateEmail(form.email),
      phone: validatePhone(form.phone, form.dialCode),
      password: validatePassword(form.password),
      confirmPassword: { isValid: form.password === form.confirmPassword, message: form.password === form.confirmPassword ? '' : 'Passwords do not match' },
      ein: validateEin(form.ein || ''),
    };

    // Additional slug validation
    if (newErrors.slug.isValid && !/^[a-z0-9-]+$/.test(form.slug)) {
      newErrors.slug = { isValid: false, message: 'Domain must be lowercase letters, numbers, and hyphens only' };
    }

    setErrors(newErrors);
    return Object.values(newErrors).every(v => v.isValid);
  };

  const isReadyToRegister = Boolean(
    form.restaurantName.trim() &&
    form.slug.trim() &&
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    form.password.trim() &&
    form.password === form.confirmPassword
  );

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validate all fields before submission
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    if (slugAvailability === 'taken') {
      setError('This domain is already taken — please choose another');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tenants/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: `${form.dialCode.startsWith('+') ? form.dialCode : '+' + form.dialCode}${form.phone}`
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || 'Registration failed');

      // If a paid plan was selected, redirect to Stripe checkout
      if (data.checkoutUrl) {
        localStorage.setItem('pending_registration_form', JSON.stringify(form));
        window.location.href = data.checkoutUrl;
        return;
      }

      // If it's a trial/free registration, show success popup
      localStorage.removeItem('pending_registration_form');
      setSuccessData({ restaurantName: form.restaurantName });
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container component="main" sx={{ height: '100vh' }}>
      <Grid
        item
        xs={false}
        sm={6}
        md={6}
        sx={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1350&q=80)',
          backgroundRepeat: 'no-repeat',
          backgroundColor: (t) =>
            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <Grid item xs={12} sm={6} md={6} component={Paper} elevation={6} square sx={{ height: '100%', overflowY: 'auto' }}>

        <Box
          sx={{
            my: 8,
            mx: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography component="h1" variant="h4" fontWeight="bold" sx={{ color: 'primary.main', letterSpacing: 1 }}>
              NexZen POS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Partner Registration
            </Typography>
          </Box>



          <Box component="form" noValidate onSubmit={onSubmit} sx={{ width: '100%' }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Restaurant Name"
                  name="restaurantName"
                  value={form.restaurantName}
                  onChange={onChange}
                  onBlur={() => handleBlur('restaurantName')}
                  error={hasError(errors.restaurantName)}
                  helperText={getHelperText(errors.restaurantName)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Domain"
                  name="slug"
                  value={form.slug}
                  onChange={onChange}
                  onBlur={() => handleBlur('slug')}
                  error={hasError(errors.slug) || slugAvailability === 'taken'}
                  helperText={
                    getHelperText(errors.slug) ||
                    (slugAvailability === 'taken'
                      ? 'This domain is already taken — please choose another'
                      : slugAvailability === 'checking'
                      ? 'Checking availability...'
                      : slugAvailability === 'available'
                      ? `Available! Your store will be at: ${form.slug.trim().toLowerCase()}.nexzenpos.com`
                      : form.slug.trim()
                      ? `Your store will be at: ${form.slug.trim()?.toLowerCase()}.nexzenpos.com`
                      : "URL identifier — your store address will be yourname.nexzenpos.com")
                  }
                  required
                  placeholder="e.g. my-bistro"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">.nexzenpos.com</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={form.logo}
                    sx={{ width: 56, height: 56, bgcolor: 'primary.light' }}
                  >
                    {!form.logo && <Restaurant />}
                  </Avatar>
                  <Box>
                    <Button
                      component="label"
                      variant="outlined"
                      size="small"
                      disabled={uploadingLogo}
                      sx={{ textTransform: 'none' }}
                      startIcon={uploadingLogo && <CircularProgress size={16} color="inherit" />}
                    >
                      {uploadingLogo ? 'Uploading...' : (form.logo ? 'Change Logo' : 'Upload Logo')}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />
                    </Button>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                      Max 5MB (Optional)
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={form.firstName}
                  onChange={onChange}
                  onBlur={() => handleBlur('firstName')}
                  error={hasError(errors.firstName)}
                  helperText={getHelperText(errors.firstName)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={form.lastName}
                  onChange={onChange}
                  onBlur={() => handleBlur('lastName')}
                  error={hasError(errors.lastName)}
                  helperText={getHelperText(errors.lastName)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  onBlur={() => handleBlur('email')}
                  error={hasError(errors.email)}
                  helperText={getHelperText(errors.email)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <PhoneInput
                  fullWidth
                  label="Phone Number"
                  value={form.phone}
                  onChange={(val) => {
                    const clean = val.replace(/\D/g, '');
                    const isUS = form.dialCode === '1' || form.dialCode === '+1';
                    const final = (isUS && clean.length > 10) ? clean.slice(-10) : clean;
                    setForm({ ...form, phone: final });

                    // Clear error when user types or corrects the number
                    if (errors.phone) {
                      setErrors(prev => ({ ...prev, phone: { isValid: true } }));
                    }
                  }}
                  dialCode={form.dialCode}
                  onDialCodeChange={(code) => setForm({ ...form, dialCode: code })}
                  error={hasError(errors.phone)}
                  helperText={getHelperText(errors.phone) || "10 digits"}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Create Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={onChange}
                  onBlur={() => handleBlur('password')}
                  error={hasError(errors.password)}
                  helperText={getHelperText(errors.password)}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={onChange}
                  onBlur={() => handleBlur('confirmPassword')}
                  error={hasError(errors.confirmPassword)}
                  helperText={getHelperText(errors.confirmPassword)}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="EIN (Employer Identification Number)"
                  name="ein"
                  value={form.ein}
                  onChange={onChange}
                  onBlur={() => handleBlur('ein')}
                  error={hasError(errors.ein)}
                  helperText={getHelperText(errors.ein) || 'Optional — e.g. 12-3456789'}
                  placeholder="12-3456789"
                  inputProps={{ maxLength: 10 }}
                />
              </Grid>
            </Grid>

            {/* Plans Selection UI */}
            {loadingPlans ? (
              <Box sx={{ mt: 5, mb: 2, display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : plans.length > 0 ? (
              <Box sx={{ mt: 5, mb: 2, width: '100%' }}>
                <Typography variant="h6" fontWeight="bold" sx={{ textAlign: 'center', color: 'text.primary' }}>
                  Choose Your Subscription Plan (Optional)
                </Typography>
                <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    overflowX: 'auto',
                    gap: 3,
                    pb: 2,
                    px: 1,
                    scrollSnapType: 'x mandatory',
                    '&::-webkit-scrollbar': { height: 8 },
                    '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 4 },
                  }}
                >
                  {plans.map((plan) => {
                    const planFeatures = [];
                    if (plan.maxUsers) planFeatures.push(`Up to ${plan.maxUsers} Users`);
                    if (plan.maxTables) planFeatures.push(`Manage ${plan.maxTables} Tables`);
                    if (plan.maxOrders) planFeatures.push(`${plan.maxOrders} Orders / month`);
                    if (plan.maxSms) planFeatures.push(`${plan.maxSms} SMS Credits`);
                    if (plan.features && plan.features.length > 0) planFeatures.push(...plan.features);

                    return (
                      <Box key={plan._id} sx={{ scrollSnapAlign: 'start', flexShrink: 0, width: { xs: 280, md: 300 } }}>
                        <Paper
                          elevation={form.planId === plan._id ? 8 : 1}
                          onClick={() => setForm({ ...form, planId: form.planId === plan._id ? undefined : plan._id })}
                          sx={{
                            p: 3,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            cursor: 'pointer',
                            borderRadius: 4,
                            position: 'relative',
                            overflow: 'hidden',
                            border: form.planId === plan._id ? '2px solid' : '2px solid transparent',
                            borderColor: form.planId === plan._id ? 'primary.main' : 'divider',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-6px)',
                              boxShadow: '0 12px 20px -10px rgba(79, 70, 229, 0.28), 0 4px 20px 0 rgba(0, 0, 0, 0.12)',
                              borderColor: 'primary.main',
                            },
                            backgroundColor: form.planId === plan._id ? 'rgba(79, 70, 229, 0.04)' : 'background.paper',
                          }}
                        >
                          <Typography variant="subtitle1" fontWeight="bold" color={form.planId === plan._id ? 'primary.main' : 'text.primary'} sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.85rem', mb: 1, pr: 8 }}>
                            {plan.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                            <Typography variant="h4" fontWeight="bold" color="text.primary">
                              ${Number(plan.price || 0).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 1, textTransform: 'capitalize' }}>
                              / {plan.interval}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                            {plan.description || 'Get started with our basic features to manage your restaurant efficiently.'}
                          </Typography>
                          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1, mb: 3 }}>
                            {planFeatures.slice(0, 6).map((feature, idx) => (
                              <Box component="li" key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                <Box sx={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 20, height: 20, borderRadius: '50%',
                                  backgroundColor: form.planId === plan._id ? 'primary.main' : 'rgba(0,0,0,0.08)',
                                  color: form.planId === plan._id ? 'white' : 'text.secondary',
                                  flexShrink: 0,
                                }}>
                                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>✓</Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>{feature}</Typography>
                              </Box>
                            ))}
                          </Box>
                          <Button
                            variant={form.planId === plan._id ? "contained" : "outlined"}
                            fullWidth
                            sx={{
                              mt: 'auto',
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 'bold',
                              py: 1,
                              pointerEvents: 'none' // Let the paper handle the click
                            }}
                          >
                            {form.planId === plan._id ? 'Selected' : 'Choose Plan'}
                          </Button>
                        </Paper>
                      </Box>
                    )
                  })}
                </Box>
                <Typography variant="body2" sx={{ mt: 3, textAlign: 'center', color: 'text.secondary', fontStyle: 'italic' }}>
                  Choose a plan to unlock all premium features, or skip this step to begin your free trial.
                </Typography>
              </Box>
            ) : null}

            {error && <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>{error}</Alert>}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 4,
                mb: 2,
                height: 48,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: (!loading && isReadyToRegister) ? 'translateY(-2px)' : 'none',
                  boxShadow: (!loading && isReadyToRegister) ? '0 6px 20px rgba(25, 118, 210, 0.4)' : 'none',
                }
              }}
              disabled={loading || !isReadyToRegister}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Start Your Journey'}
            </Button>

            <Grid container justifyContent="center">
              <Grid item>
                <Button onClick={() => navigate('/login')} sx={{ textTransform: 'none' }}>
                  Already have an account? <strong>Sign in</strong>
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Grid>
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: 'column',
          gap: 2,
          backdropFilter: 'blur(4px)',
          backgroundColor: 'rgba(0,0,0,0.7)'
        }}
        open={loading}
      >
        <CircularProgress color="inherit" size={60} thickness={4} />
        <Typography variant="h6" color="inherit" sx={{ fontWeight: 500 }}>
          Creating your restaurant...
        </Typography>
        <Typography variant="body2" color="inherit" sx={{ opacity: 0.8 }}>
          Please wait while we set up your workspace
        </Typography>
      </Backdrop>

      {/* Success Dialog for Free Registration */}
      <Dialog
        open={!!successData}
        onClose={() => setSuccessData(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 2 }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" fontWeight="bold">
            Registration Successful!
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            You have successfully created your restaurant workspace:
          </Typography>
          <Typography variant="h5" color="primary.main" fontWeight="bold" sx={{ mb: 3 }}>
            {successData?.restaurantName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your account is currently under review by the NexZen POS team. You'll get an email once your restaurant gets approved and is ready to use!
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, pt: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              setSuccessData(null);
              navigate('/login');
            }}
            sx={{ px: 6, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
          >
            Go to Login
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default RestaurantRegisterPage;
