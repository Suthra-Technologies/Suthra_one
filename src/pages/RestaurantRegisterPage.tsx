import React, { useState } from 'react';
import { Backdrop, Box, Paper, TextField, Button, Typography, Alert, CircularProgress, Grid, CssBaseline, Avatar, MenuItem, InputAdornment, Select, IconButton } from '@mui/material';
import { Restaurant, Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { validateEmail, validatePhone, validateName, validatePassword, validateCompanyName, validateRequired, getHelperText, hasError } from '../utils/validation';
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
  const [form, setForm] = useState<RestaurantRegisterForm>({
    restaurantName: '',
    slug: '',
    logo: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dialCode: '1',
    password: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, ValidationResult>>({});

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
      const numeric = value.replace(/\D/g, ""); // keep only digits
      if (numeric.length > 10) return; // stop typing beyond 10 digits
      setForm({ ...form, [name]: numeric });

      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: { isValid: true } }));
      }
      return;
    }

    setForm({ ...form, [name]: value });

    if (errors[name]) {
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
    const value = form[field];
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
        validation = validatePhone(value);
        break;
      case 'password':
        validation = validatePassword(value);
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
      phone: validatePhone(form.phone),
      password: validatePassword(form.password),
    };

    // Additional slug validation
    if (newErrors.slug.isValid && !/^[a-z0-9-]+$/.test(form.slug)) {
      newErrors.slug = { isValid: false, message: 'Domain must be lowercase letters, numbers, and hyphens only' };
    }

    setErrors(newErrors);
    return Object.values(newErrors).every(v => v.isValid);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validate all fields before submission
    if (!validateForm()) {
      setError('Please fix the errors in the form');
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

      // Attempt auto-login
      const loginRes = await login({ email: form.email, password: form.password });
      if (loginRes.success) {
        navigate('/');
      } else {
        navigate('/login');
      }
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
              REST POS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Partner Registration
            </Typography>
          </Box>

          <Typography component="h2" variant="h5" sx={{ mb: 4, fontWeight: 500 }}>
            Join our growing network
          </Typography>

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
                  error={hasError(errors.slug)}
                  helperText={getHelperText(errors.slug) || "URL identifier"}
                  required
                  placeholder="e.g. my-bistro"
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
                    if (clean.length <= 10) {
                      setForm({ ...form, phone: clean });
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
            </Grid>

            {error && <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>{error}</Alert>}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 4, mb: 2, height: 48, borderRadius: 2, textTransform: 'none', fontSize: '1.1rem', fontWeight: 600 }}
              disabled={loading}
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
    </Grid>
  );
};

export default RestaurantRegisterPage;
