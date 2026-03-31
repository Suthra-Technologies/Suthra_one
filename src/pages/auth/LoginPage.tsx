import React, { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Backdrop,
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Grid,
  useTheme,
  useMediaQuery,
  Avatar,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Restaurant,
  LocalPizza,
  LunchDining,
  LocalCafe,
  Icecream,
  LocalBar
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import logo from '../../assets/images/icons/logo.jpeg';


const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const [rememberMe, setRememberMe] = useState(false);
  const [forgotPasswordView, setForgotPasswordView] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Multi-tenant switching support
  const searchParams = new URLSearchParams(location.search);
  const targetTenant = searchParams.get('targetTenant');
  const prefillEmail = searchParams.get('email');

  // Initialize email and password from URL or local storage if present
  React.useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (prefillEmail) {
      setFormData(prev => ({ ...prev, email: prefillEmail }));
    } else if (savedEmail) {
      setFormData(prev => ({
        ...prev,
        email: savedEmail,
        password: savedPassword || ''
      }));
      setRememberMe(true);
    }
  }, [prefillEmail]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (apiError) {
      setApiError('');
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    setApiError('');
    try {
      // Handle Remember Me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
        localStorage.setItem('rememberedPassword', formData.password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      // Pass tenantSlug if we are switching tenants
      const result = await login({
        ...formData,
        tenantSlug: targetTenant || undefined
      });

      if (result.success) {
        console.log('LoginPage: Login successful, result:', result);
        const userRole = result.user?.role;
        console.log('LoginPage: User role detected:', userRole);

        if (userRole === 'superadmin') {
          console.log('LoginPage: Navigating to /superadmin');
          navigate('/superadmin', { replace: true });
        } else if (result.slug) {
          const from = (location.state as any)?.from;
          if (from) {
            setTimeout(() => navigate(from, { replace: true }), 100);
          } else if (userRole === 'customer') {
            setTimeout(() => navigate(`/${result.slug}/customer/order`, { replace: true }), 100);
          } else {
            setTimeout(() => navigate(`/${result.slug}/dashboard`, { replace: true }), 100);
          }
        } else {
          console.error('LoginPage: No slug and not superadmin');
          setApiError('Login successful but no tenant associated with this account. Please contact support.');
        }
      } else {
        setApiError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setApiError(
        error.response?.data?.message ||
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    setLoading(true);
    setApiError('');
    try {
      const response = await authAPI.forgotPassword(formData.email);
      toast.success(response.data.message);
      setIsSuccess(true);
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'Failed to request reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // const logoUrl = "https://www.divinecurry.us/storage/app/public/logos/njwVBA1lkQToTPB27hDpNcCund3gPSV8rdjp6bgh.webp";
  const logoUrl = logo;

  return (
    <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
      {/* Animation Section (Left Side) */}
      <Grid
        item
        xs={12}
        md={6}
        sx={{
          background: 'linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%)',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative Background Elements */}
        {Array.from({ length: 20 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.1)',
            }}
          />
        ))}

        {/* Rotating Table Animation */}
        <Box
          sx={{
            position: 'relative',
            width: 400,
            height: 400,
            borderRadius: '50%',
            bgcolor: '#3f3f5f',
            boxShadow: '0 0 50px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'rotate-table 20s linear infinite',
            border: '10px solid #555',
            '&::after': { // Table cloth texture/details
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              height: '90%',
              borderRadius: '50%',
              border: '2px dashed rgba(255,255,255,0.1)'
            }
          }}
        >
          {/* Centerpiece */}
          <Box sx={{ width: 60, height: 60, bgcolor: '#222', borderRadius: '50%', boxShadow: 'inset 0 0 10px #000' }} />

          {/* Food Items around the table */}
          {[
            { icon: <LocalPizza sx={{ fontSize: 40, color: '#f44336' }} />, bg: '#fff3e0' },
            { icon: <LunchDining sx={{ fontSize: 40, color: '#ff9800' }} />, bg: '#e8f5e9' },
            { icon: <Restaurant sx={{ fontSize: 40, color: '#2196f3' }} />, bg: '#e3f2fd' },
            { icon: <LocalCafe sx={{ fontSize: 40, color: '#795548' }} />, bg: '#efebe9' },
            { icon: <Icecream sx={{ fontSize: 40, color: '#e91e63' }} />, bg: '#fce4ec' },
            { icon: <LocalBar sx={{ fontSize: 40, color: '#9c27b0' }} />, bg: '#f3e5f5' },
          ].map((item, index) => {
            const angle = (index * 60) * (Math.PI / 180);
            const radius = 140; // distance from center
            // Position adjustments to center the items on their orbital point
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  transform: `translate(${x}px, ${y}px) rotate(${-index * 60}deg)`, // Counter-rotate if we want icons upright, or keep with table
                  // Actually, to keep icons upright relative to screen while table rotates:
                  // animation: 'counter-rotate 20s linear infinite'
                }}
              >
                <Paper
                  elevation={4}
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: item.bg,
                    animation: 'counter-rotate-icons 20s linear infinite' // Keep items upright
                  }}
                >
                  {item.icon}
                </Paper>
              </Box>
            );
          })}
        </Box>

        <Typography variant="h4" sx={{ mt: 5, color: '#fff', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Welcome to a World of Great Taste
        </Typography>
        <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
          Manage your orders with ease
        </Typography>
      </Grid>

      {/* Login Form Section (Right Side) */}
      <Grid item xs={12} md={6} component={Paper} elevation={6} square>
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}
        >
          <Box
            component="img"
            src={logoUrl}
            alt="Restaurant POS"
            sx={{
              height: 150,
              width: "auto",
              objectFit: "contain",
              mb: 2
            }}
          />
          <Typography component="h1" variant="h4" fontWeight="bold">
            {forgotPasswordView ? 'Reset Password' : 'Sign In'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
            {forgotPasswordView
              ? "Enter your email address and we'll send you a link to reset your password."
              : 'Enter your credentials to access your account.'}
          </Typography>

          {/* Error Alert */}
          {apiError && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {apiError}
            </Alert>
          )}

          {forgotPasswordView ? (
            <Box component="form" noValidate onSubmit={handleForgotPasswordSubmit} sx={{ mt: 1, width: '100%', maxWidth: 400 }}>
              {isSuccess ? (
                <Alert severity="success" sx={{ mb: 3 }}>
                  Password reset link has been sent to your email. Please check your inbox.
                </Alert>
              ) : (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || isSuccess}
                sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1.1rem' }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
              </Button>
              <Grid container justifyContent="center">
                <Grid item>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => {
                      setForgotPasswordView(false);
                      setIsSuccess(false);
                    }}
                  >
                    Back to Login
                  </Link>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1, width: '100%', maxWidth: 400 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      value="remember"
                      color="primary"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                  }
                  label="Remember me"
                />
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => setForgotPasswordView(true)}
                  type="button"
                >
                  Forgot password?
                </Link>
              </Box>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1.1rem' }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Log In'}
              </Button>
              <Grid container>
                <Grid item xs>
                  {/* Space for additional links if needed */}
                </Grid>
                <Grid item>
                  <Link 
                    component={RouterLink} 
                    to={targetTenant ? `/${targetTenant}/register` : "/register"} 
                    variant="body2"
                  >
                    {"Don't have an account? Sign Up"}
                  </Link>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      </Grid>
      <style>{`
            @keyframes rotate-table {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            @keyframes counter-rotate-icons {
                from { transform: rotate(0deg); }
                to { transform: rotate(-360deg); }
            }
        `}</style>
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
          {forgotPasswordView ? 'Sending reset link...' : 'Signing you in...'}
        </Typography>
        <Typography variant="body2" color="inherit" sx={{ opacity: 0.8 }}>
          Please wait a moment
        </Typography>
      </Backdrop>
    </Grid>
  );
};

export default LoginPage;