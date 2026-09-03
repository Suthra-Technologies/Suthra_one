import React, { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Backdrop,
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Checkbox,
  FormControlLabel,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  EmailOutlined,
  LockOutlined,
  Restaurant,
  ArrowForward,
  Language as LanguageIcon,
  ExpandMore,
  AssignmentOutlined,
  Inventory2Outlined,
  GroupOutlined,
  BarChartOutlined,
  ShieldOutlined,
  CloudOutlined,
  HeadsetMicOutlined,
  BoltOutlined,
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';
import { authAPI, tenantAPI } from '../../services/api';
import { useActiveTenant } from '../../hooks/useActiveTenant';
import { toast } from 'react-hot-toast';
import posHardware from '../../assets/images/Images/Login/login-pos-hardware.png';
import brandMark from '../../assets/images/Images/Login/suthra-one-mark.png';
import { getTenantSlugFromHostname, redirectToTenant } from '../../utils/tenant.utils';
import { planFeaturesOf, resolveLandingPath } from '../../utils/landingPath';

const DS = {
  orange: '#FF7A00',
  dark: '#07070F',
  purple: '#6366F1',
  purpleDeep: '#4F46E5',
  blue: '#3B82F6',
  text: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  font: "'Inter', 'Plus Jakarta Sans', sans-serif",
  heading: "'Plus Jakarta Sans', 'Inter', sans-serif",
};

const FEATURE_ORBS = [
  { label: 'Orders', icon: AssignmentOutlined, color: '#8B7CFF', top: '6%', left: '2%' },
  { label: 'Inventory', icon: Inventory2Outlined, color: '#FF7A00', bottom: '18%', left: '0%' },
  { label: 'Customers', icon: GroupOutlined, color: '#F472B6', top: '8%', right: '2%' },
  { label: 'Reports', icon: BarChartOutlined, color: '#60A5FA', bottom: '16%', right: '0%' },
];

const TRUST = [
  { title: 'Bank-Level', sub: 'Security', icon: ShieldOutlined, color: '#A78BFA' },
  { title: '99.9%', sub: 'Uptime', icon: CloudOutlined, color: '#60A5FA' },
  { title: '24/7', sub: 'Support', icon: HeadsetMicOutlined, color: '#818CF8' },
  { title: 'Blazing Fast', sub: 'Performance', icon: BoltOutlined, color: '#FF7A00' },
];

const GoogleGIcon = () => (
  <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18, mr: 1.25, flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </Box>
);

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: '#fff',
    fontFamily: DS.font,
    fontSize: '15px',
    height: 52,
    '& fieldset': { borderColor: '#E8E8EE' },
    '&:hover fieldset': { borderColor: '#D4D4DC' },
    '&.Mui-focused fieldset': { borderColor: DS.purple, borderWidth: '1.5px' },
  },
  '& .MuiInputBase-input': {
    py: 0,
    fontFamily: DS.font,
    fontSize: '15px',
    '&::placeholder': { color: '#9CA3AF', opacity: 1 },
  },
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { isSubdomain } = useActiveTenant();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotPasswordView, setForgotPasswordView] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [companyChoices, setCompanyChoices] = useState<Array<{ slug: string; name: string }> | null>(null);
  const [pendingLogin, setPendingLogin] = useState<{ slug?: string; token?: string; user?: any } | null>(null);
  const [switching, setSwitching] = useState(false);
  const [activeTenant, setActiveTenant] = useState<{ slug: string; name: string; logo?: string } | null>(null);
  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);

  const searchParams = new URLSearchParams(location.search);
  const targetTenant = searchParams.get('targetTenant');
  const prefillEmail = searchParams.get('email');

  React.useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (prefillEmail) {
      setFormData((prev) => ({ ...prev, email: prefillEmail }));
    } else if (savedEmail) {
      setFormData((prev) => ({ ...prev, email: savedEmail, password: savedPassword || '' }));
      setRememberMe(true);
    }
  }, [prefillEmail]);

  React.useEffect(() => {
    const fetchTenantBranding = async () => {
      const slug = getTenantSlugFromHostname();
      if (slug) {
        try {
          const response = await tenantAPI.getRestaurantStatus(slug);
          if (response.data) {
            setActiveTenant({
              slug: response.data.slug,
              name: response.data.name,
              logo: response.data.logo,
            });
          }
        } catch (error) {
          console.error('[LoginPage] Failed to fetch tenant branding:', error);
        }
      }
    };
    fetchTenantBranding();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setApiError('');
    try {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
        localStorage.setItem('rememberedPassword', formData.password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      const slugToUse = activeTenant?.slug || targetTenant || undefined;
      const result = await login(
        { ...formData, tenantSlug: slugToUse },
        { deferCommit: !isSubdomain && !slugToUse && !(location.state as any)?.from },
      );

      if (result.success) {
        const userRole = result.user?.role;
        const targetSlug = result.slug;

        if (result.deferred) {
          setPendingLogin({ slug: targetSlug, token: result.token, user: result.user });
          setCompanyChoices(result.availableTenants || []);
          setLoading(false);
          return;
        }

        if (userRole === 'superadmin') {
          navigate('/superadmin', { replace: true });
        } else if (userRole === 'material_provider') {
          navigate('/provider', { replace: true });
        } else if (targetSlug) {
          const from = (location.state as any)?.from;
          const tenant = result.user?.tenant;
          const isSettingsIncomplete = tenant ? tenant.isProfileComplete === false && !tenant.name : false;
          const forceSettings = userRole === 'admin' && result.user?.isFirstLogin && isSettingsIncomplete;

          if (forceSettings) {
            if (isSubdomain) setTimeout(() => navigate('/settings', { replace: true }), 100);
            else await redirectToTenant(targetSlug, '/settings', result.token);
          } else if (from) {
            setTimeout(() => navigate(from, { replace: true }), 100);
          } else if (userRole === 'customer') {
            if (isSubdomain) setTimeout(() => navigate('/customer/order', { replace: true }), 100);
            else await redirectToTenant(targetSlug, '/customer/order', result.token);
          } else {
            const landingPath = resolveLandingPath(userRole, planFeaturesOf(result.user));
            if (isSubdomain) setTimeout(() => navigate(landingPath, { replace: true }), 100);
            else await redirectToTenant(targetSlug, landingPath, result.token);
          }
        } else {
          setApiError('Login successful but no tenant associated with this account. Please contact support.');
        }
      } else {
        setApiError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = async (slug: string) => {
    setSwitching(true);
    setApiError('');
    try {
      let tokenForCompany = pendingLogin?.token;
      let userForCompany = pendingLogin?.user;
      if (!pendingLogin?.slug || slug !== pendingLogin.slug) {
        const res = await authAPI.switchTenant(
          { targetTenantSlug: slug },
          { headers: { Authorization: `Bearer ${pendingLogin?.token}` } },
        );
        tokenForCompany = res.data?.token || tokenForCompany;
        userForCompany = res.data?.user || userForCompany;
      }
      const landingPath = resolveLandingPath(
        userForCompany?.role || userForCompany?.roles?.[0],
        planFeaturesOf(userForCompany),
      );
      await redirectToTenant(slug, landingPath, tokenForCompany);
    } catch (error: any) {
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

  const displayName = activeTenant?.name || 'Suthra One';
  const registerPath = getTenantSlugFromHostname()
    ? '/register'
    : targetTenant
      ? `/${targetTenant}/register`
      : '/register';

  const formTitle = companyChoices
    ? 'Choose a Restaurant'
    : forgotPasswordView
      ? 'Reset Password'
      : 'Welcome Back!';

  const formSubtitle = companyChoices
    ? 'You have access to multiple restaurants. Select one to continue.'
    : forgotPasswordView
      ? "Enter your email address and we'll send you a link to reset your password."
      : null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        height: { md: '100vh' },
        bgcolor: DS.dark,
        display: 'flex',
        fontFamily: DS.font,
        overflow: { xs: 'auto', md: 'hidden' },
      }}
    >
      <style>{`
        @keyframes suthraFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      {/* LEFT — branding */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          width: { md: '56%', lg: '55%' },
          height: '100vh',
          position: 'relative',
          overflow: 'hidden',
          px: { md: 4.5, lg: 6.5 },
          pt: 3.5,
          pb: 3,
          background: `
            radial-gradient(ellipse 80% 50% at 20% 0%, rgba(124,58,237,0.38) 0%, transparent 55%),
            radial-gradient(ellipse 70% 45% at 90% 80%, rgba(255,122,0,0.16) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 50% 100%, rgba(99,102,241,0.28) 0%, transparent 60%),
            ${DS.dark}
          `,
        }}
      >
        {/* glow arcs */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `
              radial-gradient(ellipse 40% 18% at 70% 8%, rgba(167,139,250,0.22) 0%, transparent 70%),
              conic-gradient(from 200deg at 50% 60%, transparent 0%, rgba(124,58,237,0.12) 20%, transparent 40%)
            `,
          }}
        />

        {/* Logo */}
        <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 1.4, mb: 2 }}>
          <Box
            component="img"
            src={activeTenant?.logo || brandMark}
            alt={displayName}
            sx={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              objectFit: 'cover',
              boxShadow: '0 0 0 2px rgba(255,122,0,0.35)',
            }}
          />
          <Box>
            <Typography
              sx={{
                fontFamily: DS.heading,
                fontWeight: 800,
                fontSize: '1.2rem',
                color: '#fff',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              {activeTenant ? displayName : (
                <>
                  Suthra <Box component="span" sx={{ color: DS.orange }}>One</Box>
                </>
              )}
            </Typography>
            <Typography
              sx={{
                mt: 0.35,
                color: 'rgba(255,255,255,0.55)',
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontFamily: DS.font,
              }}
            >
              All-in-One POS System
            </Typography>
          </Box>
        </Box>

        {/* Headline */}
        <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', mt: { md: 1, lg: 2 }, mb: 1 }}>
          <Typography
            sx={{
              fontFamily: DS.heading,
              fontWeight: 800,
              fontSize: { md: '2.35rem', lg: '2.85rem' },
              lineHeight: 1.12,
              letterSpacing: '-0.035em',
            }}
          >
            <Box component="span" sx={{ color: DS.orange }}>One System. </Box>
            <Box component="span" sx={{ color: '#fff' }}>Every Restaurant Need.</Box>
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              mx: 'auto',
              maxWidth: 460,
              color: 'rgba(255,255,255,0.62)',
              fontSize: { md: '13.5px', lg: '15px' },
              lineHeight: 1.65,
              fontFamily: DS.font,
            }}
          >
            Streamline orders, manage inventory, delight customers, and grow your business effortlessly.
          </Typography>
        </Box>

        {/* POS + orbs */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            flex: 1,
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            src={posHardware}
            alt="Suthra One POS"
            sx={{
              width: '92%',
              maxWidth: 620,
              maxHeight: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 28px 50px rgba(99,102,241,0.35))',
            }}
          />
          {FEATURE_ORBS.map((orb, i) => (
            <Box
              key={orb.label}
              sx={{
                position: 'absolute',
                top: (orb as any).top,
                bottom: (orb as any).bottom,
                left: (orb as any).left,
                right: (orb as any).right,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
                animation: `suthraFloat 5s ease-in-out ${i * 0.4}s infinite`,
              }}
            >
              <Box
                sx={{
                  width: { md: 52, lg: 58 },
                  height: { md: 52, lg: 58 },
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 30% 30%, ${orb.color}, ${orb.color}cc 70%)`,
                  boxShadow: `0 8px 24px ${orb.color}66, inset 0 1px 0 rgba(255,255,255,0.35)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.18)',
                }}
              >
                <orb.icon sx={{ color: '#fff', fontSize: 22 }} />
              </Box>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: DS.font,
                  textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                }}
              >
                {orb.label}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Trust bar */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            mt: 1.5,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            px: 1.5,
            py: 1.4,
            borderRadius: '18px',
            bgcolor: 'rgba(18,16,32,0.72)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {TRUST.map((item, i) => (
            <Box
              key={item.title}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '10px',
                  bgcolor: `${item.color}18`,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 0 12px ${item.color}33`,
                }}
              >
                <item.icon sx={{ fontSize: 18 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: '#fff', fontSize: '12px', fontWeight: 700, fontFamily: DS.heading, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                  {item.title}
                </Typography>
                <Typography sx={{ color: 'rgba(200,200,230,0.7)', fontSize: '11px', fontFamily: DS.font, lineHeight: 1.3 }}>
                  {item.sub}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* RIGHT — form */}
      <Box
        sx={{
          width: { xs: '100%', md: '44%', lg: '45%' },
          minHeight: { xs: '100vh', md: '100vh' },
          bgcolor: '#fff',
          borderRadius: { xs: 0, md: '40px 0 0 40px' },
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: { md: '-28px 0 80px rgba(0,0,0,0.45)' },
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: 280,
            height: 240,
            background: 'radial-gradient(ellipse at bottom left, rgba(255,122,0,0.13) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: { xs: 3, md: 4.5 }, pt: 3, position: 'relative', zIndex: 1 }}>
          <Button
            onClick={(e) => setLangAnchor(e.currentTarget)}
            startIcon={<LanguageIcon sx={{ fontSize: 18, color: DS.muted }} />}
            endIcon={<ExpandMore sx={{ fontSize: 18, color: DS.muted }} />}
            sx={{
              textTransform: 'none',
              color: DS.text,
              fontFamily: DS.font,
              fontWeight: 500,
              fontSize: '14px',
              border: `1px solid ${DS.border}`,
              borderRadius: '999px',
              px: 1.75,
              py: 0.6,
              minWidth: 0,
              bgcolor: '#fff',
              '&:hover': { bgcolor: '#F9FAFB' },
            }}
          >
            English
          </Button>
          <Menu
            anchorEl={langAnchor}
            open={Boolean(langAnchor)}
            onClose={() => setLangAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem selected onClick={() => setLangAnchor(null)}>English</MenuItem>
          </Menu>
        </Box>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: '100%',
            maxWidth: 400,
            mx: 'auto',
            px: { xs: 3.5, md: 2 },
            py: 2,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {isMobile && (
            <Box sx={{ mb: 3.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box component="img" src={activeTenant?.logo || brandMark} alt={displayName} sx={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
              <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '1.2rem', color: DS.text }}>
                {activeTenant ? displayName : <>Suthra <Box component="span" sx={{ color: DS.orange }}>One</Box></>}
              </Typography>
            </Box>
          )}

          <Typography
            component="h1"
            sx={{
              fontFamily: DS.heading,
              fontWeight: 800,
              fontSize: { xs: '28px', md: '32px' },
              color: DS.text,
              letterSpacing: '-0.03em',
              mb: 1,
            }}
          >
            {formTitle}
          </Typography>

          {!companyChoices && !forgotPasswordView ? (
            <Typography sx={{ color: DS.muted, fontSize: '15px', fontFamily: DS.font, mb: 3.5 }}>
              Sign in to your{' '}
              <Box component="span" sx={{ color: DS.orange, fontWeight: 600 }}>Suthra One</Box>
              {' '}account
            </Typography>
          ) : (
            <Typography sx={{ color: DS.muted, fontSize: '15px', fontFamily: DS.font, mb: 3.5, lineHeight: 1.6 }}>
              {formSubtitle}
            </Typography>
          )}

          {apiError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{apiError}</Alert>
          )}

          {companyChoices ? (
            <Box>
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
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontSize: '16px',
                    fontWeight: 700,
                    fontFamily: DS.font,
                    borderColor: DS.border,
                    color: DS.text,
                  }}
                >
                  {c.name}
                </Button>
              ))}
              {switching && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <CircularProgress size={24} sx={{ color: DS.purple }} />
                </Box>
              )}
            </Box>
          ) : forgotPasswordView ? (
            <Box component="form" noValidate onSubmit={handleForgotPasswordSubmit}>
              {isSuccess ? (
                <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
                  Password reset link has been sent to your email. Please check your inbox.
                </Alert>
              ) : (
                <Box sx={{ mb: 2.5 }}>
                  <Typography component="label" htmlFor="email" sx={{ display: 'block', mb: 1, fontSize: '13px', fontWeight: 600, color: '#374151', fontFamily: DS.font }}>
                    Email Address
                  </Typography>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                    autoFocus
                    value={formData.email}
                    onChange={handleChange}
                    error={!!errors.email}
                    helperText={errors.email}
                    sx={fieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlined sx={{ color: '#9CA3AF', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || isSuccess}
                endIcon={!loading && !isSuccess ? <ArrowForward /> : undefined}
                sx={{
                  mt: 0.5,
                  mb: 2,
                  height: 52,
                  fontSize: '16px',
                  fontWeight: 700,
                  fontFamily: DS.font,
                  textTransform: 'none',
                  borderRadius: '12px',
                  background: `linear-gradient(90deg, ${DS.purple} 0%, ${DS.blue} 100%)`,
                  boxShadow: '0 10px 24px rgba(99,102,241,0.35)',
                  '&:hover': { background: `linear-gradient(90deg, ${DS.purpleDeep} 0%, #2563EB 100%)` },
                }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <Box sx={{ textAlign: 'center' }}>
                <Link
                  component="button"
                  type="button"
                  onClick={() => { setForgotPasswordView(false); setIsSuccess(false); }}
                  sx={{ fontSize: '14px', fontFamily: DS.font, fontWeight: 600, color: DS.blue, textDecoration: 'none', cursor: 'pointer' }}
                >
                  Back to Login
                </Link>
              </Box>
            </Box>
          ) : (
            <Box component="form" noValidate onSubmit={handleSubmit}>
              <Box sx={{ mb: 2.25 }}>
                <Typography component="label" htmlFor="email" sx={{ display: 'block', mb: 1, fontSize: '13px', fontWeight: 600, color: '#374151', fontFamily: DS.font }}>
                  Email Address
                </Typography>
                <TextField
                  required
                  fullWidth
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  autoFocus
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlined sx={{ color: '#9CA3AF', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Box sx={{ mb: 1.25 }}>
                <Typography component="label" htmlFor="password" sx={{ display: 'block', mb: 1, fontSize: '13px', fontWeight: 600, color: '#374151', fontFamily: DS.font }}>
                  Password
                </Typography>
                <TextField
                  required
                  fullWidth
                  name="password"
                  placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined sx={{ color: '#9CA3AF', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#9CA3AF' }}>
                          {showPassword ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, mt: 0.5 }}>
                <FormControlLabel
                  sx={{ ml: -0.5, '& .MuiFormControlLabel-label': { fontSize: '14px', fontFamily: DS.font, color: '#374151', fontWeight: 500 } }}
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      sx={{ color: DS.border, '&.Mui-checked': { color: DS.purple }, '& .MuiSvgIcon-root': { fontSize: 22 } }}
                    />
                  }
                  label="Remember me"
                />
                <Link
                  component="button"
                  type="button"
                  onClick={() => setForgotPasswordView(true)}
                  sx={{ fontSize: '14px', fontFamily: DS.font, fontWeight: 600, color: DS.blue, textDecoration: 'none', cursor: 'pointer' }}
                >
                  Forgot password?
                </Link>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                endIcon={!loading ? <ArrowForward sx={{ fontSize: 18 }} /> : undefined}
                sx={{
                  height: 52,
                  fontSize: '16px',
                  fontWeight: 700,
                  fontFamily: DS.font,
                  textTransform: 'none',
                  borderRadius: '12px',
                  background: `linear-gradient(90deg, ${DS.purple} 0%, ${DS.blue} 100%)`,
                  boxShadow: '0 10px 24px rgba(99,102,241,0.35)',
                  '&:hover': { background: `linear-gradient(90deg, ${DS.purpleDeep} 0%, #2563EB 100%)` },
                  '&.Mui-disabled': { background: `linear-gradient(90deg, ${DS.purple} 0%, ${DS.blue} 100%)`, color: '#fff', opacity: 0.7 },
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <Divider sx={{ my: 3, '&::before, &::after': { borderColor: '#EDEDF2' }, '& .MuiDivider-wrapper': { px: 2, color: DS.muted, fontSize: '13px', fontWeight: 500, fontFamily: DS.font } }}>
                OR
              </Divider>

              <Button
                fullWidth
                variant="outlined"
                type="button"
                onClick={() =>
                  toast('Google sign-in for staff accounts is not enabled yet. Please use email and password.', { icon: 'ℹ️' })
                }
                sx={{
                  height: 52,
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontFamily: DS.font,
                  fontWeight: 600,
                  fontSize: '15px',
                  color: DS.text,
                  borderColor: '#E5E7EB',
                  bgcolor: '#fff',
                  boxShadow: 'none',
                  '&:hover': { borderColor: '#D1D5DB', bgcolor: '#F9FAFB', boxShadow: 'none' },
                }}
              >
                <GoogleGIcon />
                Continue with Google
              </Button>

              <Typography sx={{ mt: 3.5, textAlign: 'center', fontSize: '14px', color: DS.muted, fontFamily: DS.font }}>
                Don&apos;t have an account?{' '}
                <Link component={RouterLink} to={registerPath} sx={{ color: DS.blue, fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Create Account
                </Link>
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (t) => t.zIndex.drawer + 1,
          flexDirection: 'column',
          gap: 2,
          backdropFilter: 'blur(4px)',
          backgroundColor: 'rgba(0,0,0,0.7)',
        }}
        open={loading}
      >
        <CircularProgress color="inherit" size={60} thickness={4} />
        <Typography sx={{ fontWeight: 600, fontSize: '18px', fontFamily: DS.heading }}>
          {forgotPasswordView ? 'Sending reset link...' : 'Signing you in...'}
        </Typography>
        <Typography sx={{ opacity: 0.8, fontSize: '14px', fontFamily: DS.font }}>Please wait a moment</Typography>
      </Backdrop>
    </Box>
  );
};

export default LoginPage;
