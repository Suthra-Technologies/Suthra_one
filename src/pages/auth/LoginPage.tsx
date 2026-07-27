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
import { authAPI, tenantAPI } from '../../services/api';
import { useActiveTenant } from '../../hooks/useActiveTenant';
import { toast } from 'react-hot-toast';
import logo from '../../assets/images/icons/logo.jpeg';
import { getTenantSlugFromHostname, redirectToTenant } from '../../utils/tenant.utils';


const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { isSubdomain } = useActiveTenant();
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

  // Company picker: shown after login when an admin belongs to >1 company.
  const [companyChoices, setCompanyChoices] = useState<Array<{ slug: string; name: string }> | null>(null);
  const [pendingLogin, setPendingLogin] = useState<{ slug?: string; token?: string } | null>(null);
  const [switching, setSwitching] = useState(false);
  
  // Dynamic Tenant Branding
  const [activeTenant, setActiveTenant] = useState<{
    slug: string;
    name: string;
    logo?: string;
  } | null>(null);
  const [tenantLoading, setTenantLoading] = useState(false);
  const headingFontSize = { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' };
  const bodyFontSize = { xs: '0.95rem', sm: '0.95rem', md: '0.95rem' };

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

  // Load dynamic tenant branding
  React.useEffect(() => {
    const fetchTenantBranding = async () => {
      const slug = getTenantSlugFromHostname();
      if (slug) {
        setTenantLoading(true);
        try {
          const response = await tenantAPI.getRestaurantStatus(slug);
          if (response.data) {
            setActiveTenant({
              slug: response.data.slug,
              name: response.data.name,
              logo: response.data.logo
            });
          }
        } catch (error) {
          console.error('[LoginPage] Failed to fetch tenant branding:', error);
        } finally {
          setTenantLoading(false);
        }
      }
    };

    fetchTenantBranding();
  }, []);

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

      // Use detected slug if present, otherwise fallback to URL param
      const slugToUse = activeTenant?.slug || targetTenant || undefined;

      // Pass tenantSlug if we are switching tenants or on dynamic subdomain.
      // deferCommit lets a multi-company admin see the picker without the session
      // committing (which would otherwise redirect away from /login instantly).
      const result = await login(
        { ...formData, tenantSlug: slugToUse },
        { deferCommit: !isSubdomain && !slugToUse && !(location.state as any)?.from },
      );

      if (result.success) {
        console.log('LoginPage: Login successful. User:', result.user);
        const userRole = result.user?.role;
        const targetSlug = result.slug;
        console.log('LoginPage: User role:', userRole, 'Tenant Slug:', targetSlug);

        // If an admin belongs to more than one company, let them choose which to
        // enter — unless they logged in on a specific tenant subdomain or via a
        // targeted link (which already implies the company).
        // If login deferred the session (multi-company admin on the root domain),
        // show the company picker instead of redirecting.
        if (result.deferred) {
          const choices = result.availableTenants || [];
          console.log('LoginPage: Admin has multiple companies, showing picker', choices);
          setPendingLogin({ slug: targetSlug, token: result.token });
          setCompanyChoices(choices);
          setLoading(false);
          return;
        }

        if (userRole === 'superadmin') {
          console.log('LoginPage: Superadmin detected, navigating to /superadmin');
          navigate('/superadmin', { replace: true });
        } else if (targetSlug) {
          const from = (location.state as any)?.from;
          console.log('LoginPage: Redirecting. "from" state:', from);
          
          const tenant = result.user?.tenant;
          const isSettingsIncomplete = tenant 
            ? (tenant.isProfileComplete === false || (tenant.isProfileComplete === undefined && !tenant.logo))
            : false;
          
          const forceSettings = userRole === 'admin' && (result.user?.isFirstLogin || isSettingsIncomplete);
          
          if (forceSettings) {
            console.log('LoginPage: Forcing newly registered/incomplete admin to /settings');
            if (isSubdomain) {
              setTimeout(() => navigate('/settings', { replace: true }), 100);
            } else {
              await redirectToTenant(targetSlug, '/settings', result.token);
            }
          } else if (from) {
            console.log('LoginPage: Navigating to "from":', from);
            setTimeout(() => navigate(from, { replace: true }), 100);
          } else if (userRole === 'customer') {
            console.log('LoginPage: Customer detected. isSubdomain:', isSubdomain);
            if (isSubdomain) {
              console.log('LoginPage: Navigating to /customer/order');
              setTimeout(() => navigate('/customer/order', { replace: true }), 100);
            } else {
              await redirectToTenant(targetSlug, '/customer/order', result.token);
            }
          } else {
            console.log('LoginPage: Staff/Admin detected. isSubdomain:', isSubdomain);
            
            if (isSubdomain) {
              console.log(`LoginPage: Navigating to /dashboard`);
              setTimeout(() => navigate('/dashboard', { replace: true }), 100);
            } else {
              await redirectToTenant(targetSlug, '/dashboard', result.token);
            }
          }
        } else {
          console.error('LoginPage: No slug and not superadmin. Result:', result);
          setApiError('Login successful but no tenant associated with this account. Please contact support.');
        }
      } else {
        console.warn('LoginPage: Login failed:', result.error);
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

  // Admin picked a restaurant from the post-login picker. The session was NOT
  // committed at login (deferred), so we obtain a token scoped to the chosen
  // restaurant and hand off to its subdomain via a one-time code (no token in URL).
  const handleSelectCompany = async (slug: string) => {
    setSwitching(true);
    setApiError('');
    try {
      let tokenForCompany = pendingLogin?.token;

      // If they picked a restaurant other than the login-default, re-scope the token.
      if (!pendingLogin?.slug || slug !== pendingLogin.slug) {
        const res = await authAPI.switchTenant(
          { targetTenantSlug: slug },
          { headers: { Authorization: `Bearer ${pendingLogin?.token}` } },
        );
        tokenForCompany = res.data?.token || tokenForCompany;
      }

      await redirectToTenant(slug, '/dashboard', tokenForCompany);
    } catch (error: any) {
      console.error('Restaurant select error:', error);
      setApiError(error?.response?.data?.message || 'Failed to open the selected restaurant. Please try again.');
      setSwitching(false);
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

  // Branding resolution
  const displayLogo = activeTenant?.logo || logo;
  const displayName = activeTenant?.name || "Restaurant POS";

  return (
    <Grid container component="main" sx={{ minHeight: '100vh', height: { xs: 'auto', sm: '100vh' }, overflow: { xs: 'auto', sm: 'hidden' } }}>
      {/* Animation Section (Left Side) */}
      <Grid
        item
        xs={12}
        sm={5}
        md={6}
        sx={{
          background: 'linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%)',
          display: { xs: 'none', sm: 'flex', md: 'flex' },
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
            width: { md: 280, lg: 400 },
            height: { md: 280, lg: 400 },
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
            { icon: <LocalPizza sx={{ fontSize: { sm: 22, md: 28, lg: 40 }, color: '#f44336' }} />, bg: '#fff3e0' },
            { icon: <LunchDining sx={{ fontSize: { sm: 22, md: 28, lg: 40 }, color: '#ff9800' }} />, bg: '#e8f5e9' },
            { icon: <Restaurant sx={{ fontSize: { sm: 22, md: 28, lg: 40 }, color: '#2196f3' }} />, bg: '#e3f2fd' },
            { icon: <LocalCafe sx={{ fontSize: { sm: 22, md: 28, lg: 40 }, color: '#795548' }} />, bg: '#efebe9' },
            { icon: <Icecream sx={{ fontSize: { sm: 22, md: 28, lg: 40 }, color: '#e91e63' }} />, bg: '#fce4ec' },
            { icon: <LocalBar sx={{ fontSize: { sm: 22, md: 28, lg: 40 }, color: '#9c27b0' }} />, bg: '#f3e5f5' },
          ].map((item, index) => {
            const angle = (index * 60) * (Math.PI / 180);
            const radius = window.innerWidth < 1280 ? 100 : 140;

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  transform: `translate(${x}px, ${y}px) rotate(${-index * 60}deg)`,

                }}
              >
                <Paper
                  elevation={4}
                  sx={{
                    width: { sm: 46, md: 55, lg: 70 },
                    height: { sm: 46, md: 55, lg: 70 },
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: item.bg,
                    animation: 'counter-rotate-icons 20s linear infinite'
                  }}
                >
                  {item.icon}
                </Paper>
              </Box>
            );
          })}
        </Box>

        <Typography variant="h4" sx={{ mt: { sm: 3, md: 5 }, color: '#fff', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)', fontSize: headingFontSize, textAlign: 'center', px: 2 }}>
          {activeTenant ? `Welcome to ${displayName}` : 'Welcome to a World of Great Taste'}
        </Typography>
        <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1, fontSize: bodyFontSize, textAlign: 'center', px: 2 }}>
          {activeTenant ? 'Log in to manage your kitchen and orders' : 'Manage your orders with ease'}
        </Typography>
      </Grid>

      {/* Login Form Section (Right Side) */}
      <Grid 
        item 
        xs={12} 
        sm={7} 
        md={6} 
        component={Paper} 
        elevation={0} 
        square 
        sx={{ 
          overflowY: 'auto', 
          maxHeight: { xs: 'none', sm: '100vh' },
          bgcolor: { xs: '#f8f9fa', sm: '#fff' }, // Light grey on mobile for card contrast
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box
          sx={{
            my: { xs: 4, sm: 3, md: 4 },
            mx: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 450,
            p: { xs: 3, sm: 0 },
            bgcolor: { xs: '#fff', sm: 'transparent' },
            borderRadius: { xs: 4, sm: 0 },
            boxShadow: { xs: '0 8px 32px rgba(0,0,0,0.05)', sm: 'none' }
          }}
        >
          <Box
            component="img"
            src={displayLogo}
            alt={displayName}
            sx={{ 
              height: { xs: 80, sm: 110, md: 150 }, 
              width: "auto", 
              maxWidth: "100%", 
              objectFit: "contain", 
              mb: 2, 
              borderRadius: activeTenant ? '12px' : '0' 
            }}
          />
          <Typography 
            component="h1" 
            variant="h4" 
            fontWeight="900" 
            sx={{ 
              fontSize: headingFontSize,
              color: '#1a1a1a',
              letterSpacing: '-0.5px'
            }}
          >
            {companyChoices ? 'Choose a Restaurant' : forgotPasswordView ? 'Reset Password' : 'Sign In'}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 4, textAlign: 'center', px: 2, fontSize: bodyFontSize }}
          >
            {companyChoices
              ? 'You have access to multiple restaurants. Select one to continue.'
              : forgotPasswordView
                ? "Enter your email address and we'll send you a link to reset your password."
                : ''}
          </Typography>

          {/* Error Alert */}
          {apiError && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {apiError}
            </Alert>
          )}

          {companyChoices ? (
            <Box sx={{ mt: 1, width: '100%', maxWidth: 400 }}>
              {companyChoices.map((c) => (
                <Button
                  key={c.slug}
                  fullWidth
                  variant="outlined"
                  disabled={switching}
                  onClick={() => handleSelectCompany(c.slug)}
                  startIcon={<Restaurant />}
                  sx={{
                    mb: 1.5,
                    py: 1.5,
                    justifyContent: 'flex-start',
                    borderRadius: 3,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 700,
                  }}
                >
                  {c.name}
                </Button>
              ))}
              {switching && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
            </Box>
          ) : forgotPasswordView ? (
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
                  sx={{ 
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                    }
                  }}
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
                  sx={{ fontSize: bodyFontSize }}
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
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                  }
                }}
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
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                  }
                }}
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
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: bodyFontSize } }}
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
                  sx={{ fontSize: bodyFontSize }}
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
                sx={{ 
                  mt: 3, 
                  mb: 2, 
                  py: { xs: 1.8, sm: 1.5 }, 
                  fontSize: '1.1rem',
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
                }}
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
                    to={getTenantSlugFromHostname() ? "/register" : (targetTenant ? `/${targetTenant}/register` : "/register")}
                    variant="body2"
                    sx={{ fontSize: bodyFontSize }}
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
        <Typography variant="h6" color="inherit" sx={{ fontWeight: 500, fontSize: headingFontSize }}>
          {forgotPasswordView ? 'Sending reset link...' : 'Signing you in...'}
        </Typography>
        <Typography variant="body2" color="inherit" sx={{ opacity: 0.8, fontSize: bodyFontSize }}>
          Please wait a moment
        </Typography>
      </Backdrop>
    </Grid>
  );
};

export default LoginPage;