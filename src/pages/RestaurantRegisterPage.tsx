import React, { useState, useEffect } from 'react';
import {
  Backdrop,
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Avatar,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  StorefrontOutlined,
  CloudUploadOutlined,
  PersonOutline,
  EmailOutlined,
  LockOutlined,
  BadgeOutlined,
  HeadsetMicOutlined,
  RocketLaunchOutlined,
  LockOutlined as LockIcon,
  Inventory2Outlined,
  ShieldOutlined,
  TrendingUpOutlined,
  SupportAgentOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { validateEmail, validatePhone, validateName, validatePassword, validateCompanyName, validateRequired, validateEin, getHelperText, hasError } from '../utils/validation';
import type { ValidationResult } from '../utils/validation';
import { sanitizeName } from '../utils/inputSanitizers';
import PhoneInput from '../components/PhoneInput';
import { splitPlanFeatures, planFeatureLabel } from '../utils/planFeatures';
import brandMark from '../assets/images/Images/Register/suthra-one-hex-mark.png';
import posLifestyle from '../assets/images/Images/Register/register-pos-lifestyle.png';
import restaurantInterior from '../assets/images/Images/Register/register-restaurant-interior.png';

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
  baseplanId?: string | null;
}

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5006'}/api`;

const DS = {
  purple: '#8B5CF6',
  purpleDeep: '#7C3AED',
  orange: '#F97316',
  text: '#111827',
  muted: '#6B7280',
  label: '#1F2937',
  border: '#E5E7EB',
  link: '#3B82F6',
  font: "'Inter', 'Plus Jakarta Sans', sans-serif",
  heading: "'Plus Jakarta Sans', 'Inter', sans-serif",
};

const FEATURES = [
  { title: 'All-in-One Solution', desc: 'POS, Inventory, Billing & more', icon: Inventory2Outlined, color: '#8B5CF6' },
  { title: 'Secure & Reliable', desc: 'Bank-level security for your data', icon: ShieldOutlined, color: '#F97316' },
  { title: 'Grow Your Business', desc: 'Powerful insights to scale fast', icon: TrendingUpOutlined, color: '#22C55E' },
  { title: '24/7 Support', desc: "We're here whenever you need us", icon: SupportAgentOutlined, color: '#3B82F6' },
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
    borderRadius: '10px',
    bgcolor: '#fff',
    fontFamily: DS.font,
    fontSize: '14px',
    height: 48,
    '& fieldset': { borderColor: '#E8E8EE' },
    '&:hover fieldset': { borderColor: '#D1D5DB' },
    '&.Mui-focused fieldset': { borderColor: DS.purple, borderWidth: '1.5px' },
  },
  '& .MuiInputBase-input': {
    py: 0,
    height: 48,
    boxSizing: 'border-box',
    fontFamily: DS.font,
    fontSize: '14px',
    '&::placeholder': { color: '#9CA3AF', opacity: 1 },
  },
  '& .MuiFormHelperText-root': {
    mx: 0,
    mt: 0.6,
    fontSize: '12px',
    fontFamily: DS.font,
  },
};

const FieldLabel: React.FC<{ htmlFor?: string; required?: boolean; optional?: boolean; children: React.ReactNode }> = ({
  htmlFor,
  required,
  optional,
  children,
}) => (
  <Typography
    component="label"
    htmlFor={htmlFor}
    sx={{ display: 'block', mb: 0.75, fontSize: '13px', fontWeight: 600, color: DS.label, fontFamily: DS.font, letterSpacing: '-0.01em' }}
  >
    {children}
    {required && <Box component="span" sx={{ color: '#EF4444', ml: 0.35 }}>*</Box>}
    {optional && (
      <Box component="span" sx={{ color: DS.muted, fontWeight: 500, ml: 0.5, fontSize: '12px' }}>(Optional)</Box>
    )}
  </Typography>
);

const getPasswordStrength = (password: string) => {
  if (!password) return { label: '', color: '#E5E7EB', filled: 0, meetsLength: false };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  if (score <= 1) return { label: 'Weak', color: '#EF4444', filled: 1, meetsLength: password.length >= 8 };
  if (score === 2) return { label: 'Fair', color: '#F59E0B', filled: 2, meetsLength: password.length >= 8 };
  if (score === 3) return { label: 'Good', color: '#22C55E', filled: 3, meetsLength: true };
  return { label: 'Strong', color: '#16A34A', filled: 4, meetsLength: true };
};

const RestaurantRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<RestaurantRegisterForm>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPlanId = params.get('planId') || undefined;

    try {
      const saved = localStorage.getItem('pending_registration_form');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (urlPlanId) {
          parsed.planId = urlPlanId;
        }
        return parsed;
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
      planId: urlPlanId,
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

          if (nameLower.includes('sms') || intervalLower.includes('sms')) return false;

          const isMatch = intervalLower === 'monthly';
          if (isMatch) {
            console.log(`[Plans Lookup Match] Plan: "${plan.name}" has Interval: "${plan.interval}" (Matched Monthly Interval)`);
          }
          return isMatch;
        });

        console.log("[Plans Lookup] Final filtered plans showing in registration UI:", finalPlans);
        setPlans(finalPlans);
      } catch (err) {
        console.error('Failed to fetch plans', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const numeric = String(value || '').replace(/\D/g, "");
      const isUS = form.dialCode === '1' || form.dialCode === '+1';
      const final = (isUS && numeric.length > 10) ? numeric.slice(-10) : numeric;
      setForm(prev => ({ ...prev, [name]: final }));
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: { isValid: true } }));
      }
      return;
    }

    if (name === "ein") {
      const digits = String(value || '').replace(/\D/g, '').slice(0, 9);
      const formatted = digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
      setForm(prev => ({ ...prev, [name]: formatted }));
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: { isValid: true } }));
      }
      return;
    }

    if (name === "firstName" || name === "lastName") {
      const cleaned = sanitizeName(value).slice(0, 50);
      setForm(prev => ({ ...prev, [name]: cleaned }));
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
      const res = await fetch(`${API_BASE}/upload/image?module=branding`, {
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

      if (data.checkoutUrl) {
        localStorage.setItem('pending_registration_form', JSON.stringify(form));
        window.location.href = data.checkoutUrl;
        return;
      }

      localStorage.removeItem('pending_registration_form');
      setSuccessData({ restaurantName: form.restaurantName });
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(form.password);

  const slugHint =
    getHelperText(errors.slug) ||
    (slugAvailability === 'taken'
      ? 'This domain is already taken — please choose another'
      : slugAvailability === 'checking'
      ? 'Checking availability...'
      : slugAvailability === 'available'
      ? 'This domain is available'
      : 'This will be your unique store URL');

  return (
    <Box
      sx={{
        minHeight: '100vh',
        height: { md: '100vh' },
        display: 'flex',
        bgcolor: '#EEF0F6',
        fontFamily: DS.font,
        overflow: { xs: 'auto', md: 'hidden' },
      }}
    >
      {/* LEFT — branding */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: { md: '38%', lg: '36.5%' },
          height: '100vh',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          px: { md: 3.25, lg: 4.25 },
          pt: 3.25,
          pb: 2.5,
        }}
      >
        <Box
          component="img"
          src={restaurantInterior}
          alt=""
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'blur(1.5px) saturate(0.85)',
            transform: 'scale(1.04)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(247,246,250,0.88) 0%, rgba(255,255,255,0.82) 42%, rgba(244,243,248,0.9) 100%)',
            pointerEvents: 'none',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 1.15, mb: 3.25 }}>
          <Box
            component="img"
            src={brandMark}
            alt="Suthra One"
            sx={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }}
          />
          <Box>
            <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '17px', color: DS.text, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              Suthra One
            </Typography>
            <Typography sx={{ mt: 0.35, fontSize: '8.5px', fontWeight: 600, letterSpacing: '0.16em', color: '#9CA3AF', textTransform: 'uppercase', fontFamily: DS.font }}>
              All-in-One POS System
            </Typography>
          </Box>
        </Box>

        <Typography
          sx={{
            position: 'relative',
            zIndex: 1,
            fontFamily: DS.heading,
            fontWeight: 800,
            fontSize: { md: '30px', lg: '34px' },
            lineHeight: 1.15,
            color: DS.text,
            letterSpacing: '-0.035em',
            mb: 1.25,
          }}
        >
          Let&apos;s Build Something{' '}
          <Box component="span" sx={{ color: DS.orange }}>Amazing</Box>
          {' '}Together
        </Typography>
        <Typography sx={{ position: 'relative', zIndex: 1, color: DS.muted, fontSize: '13.5px', lineHeight: 1.6, mb: 2.5, maxWidth: 340, fontFamily: DS.font }}>
          Join thousands of restaurant partners growing their business with Suthra One.
        </Typography>

        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 1.1, mb: 2.25 }}>
          {FEATURES.map((item) => (
            <Box
              key={item.title}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.35,
                px: 1.5,
                py: 1.15,
                bgcolor: 'rgba(255,255,255,0.92)',
                border: '1px solid #E8E8EE',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
              }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '9px',
                  bgcolor: `${item.color}16`,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <item.icon sx={{ fontSize: 18 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: DS.text, fontFamily: DS.heading, lineHeight: 1.2 }}>
                  {item.title}
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: DS.muted, mt: 0.2, fontFamily: DS.font }}>
                  {item.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Box
          component="img"
          src={posLifestyle}
          alt="Suthra One POS"
          sx={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            flex: 1,
            minHeight: 140,
            maxHeight: 420,
            objectFit: 'cover',
            objectPosition: 'center',
            borderRadius: '16px',
            boxShadow: '0 10px 28px rgba(15,23,42,0.12)',
            mb: 1.75,
          }}
        />

        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            mt: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 1.1,
            px: 1.6,
            py: 1.15,
            borderRadius: '12px',
            bgcolor: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(229,231,235,0.95)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <LockIcon sx={{ fontSize: 16, color: DS.purple }} />
          <Typography sx={{ fontSize: '11.5px', color: DS.muted, fontWeight: 500, fontFamily: DS.font, lineHeight: 1.4 }}>
            Your data is 100% secure. We never share your information.
          </Typography>
        </Box>
      </Box>

      {/* RIGHT — form sheet */}
      <Box
        sx={{
          flex: 1,
          minHeight: { xs: '100vh', md: '100vh' },
          height: { md: '100vh' },
          overflowY: 'auto',
          bgcolor: '#fff',
          borderRadius: { xs: 0, md: '32px 0 0 32px' },
          boxShadow: { md: '-18px 0 48px rgba(15,23,42,0.08)' },
          display: 'flex',
          justifyContent: 'center',
          px: { xs: 2.5, sm: 4, md: 4.5, lg: 6 },
          py: { xs: 2.5, md: 3 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 640, position: 'relative' }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.25 }}>
            <Button
              startIcon={<HeadsetMicOutlined sx={{ fontSize: 17 }} />}
              href="tel:+19083138909"
              sx={{
                textTransform: 'none',
                color: DS.purple,
                bgcolor: 'rgba(139,92,246,0.1)',
                borderRadius: '999px',
                px: 1.7,
                py: 0.55,
                minWidth: 0,
                fontWeight: 600,
                fontSize: '13px',
                fontFamily: DS.font,
                boxShadow: 'none',
                '&:hover': { bgcolor: 'rgba(139,92,246,0.16)', boxShadow: 'none' },
              }}
            >
              Need help?
            </Button>
          </Box>

          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.1, mb: 2.5 }}>
            <Box component="img" src={brandMark} alt="Suthra One" sx={{ width: 36, height: 36, objectFit: 'contain' }} />
            <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px', color: DS.text }}>Suthra One</Typography>
          </Box>

          <Box sx={{ textAlign: 'center', mb: 3.25 }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                bgcolor: 'rgba(139,92,246,0.12)',
                color: DS.purple,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.35,
              }}
            >
              <StorefrontOutlined sx={{ fontSize: 22 }} />
            </Box>
            <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: { xs: '24px', md: '28px' }, color: DS.text, letterSpacing: '-0.035em', lineHeight: 1.15 }}>
              Partner Registration
            </Typography>
            <Typography sx={{ mt: 0.65, color: DS.muted, fontSize: '13.5px', fontFamily: DS.font }}>
              Fill in the details below to create your partner account
            </Typography>
          </Box>

          <Box component="form" noValidate onSubmit={onSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FieldLabel htmlFor="restaurantName" required>Restaurant Name</FieldLabel>
                <TextField
                  fullWidth
                  id="restaurantName"
                  name="restaurantName"
                  placeholder="Enter your restaurant name"
                  value={form.restaurantName}
                  onChange={onChange}
                  onBlur={() => handleBlur('restaurantName')}
                  error={hasError(errors.restaurantName)}
                  helperText={getHelperText(errors.restaurantName)}
                  required
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <StorefrontOutlined sx={{ color: '#9CA3AF', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={7}>
                <FieldLabel htmlFor="slug" required>Domain / Store URL</FieldLabel>
                <TextField
                  fullWidth
                  id="slug"
                  name="slug"
                  placeholder="yourstore"
                  value={form.slug}
                  onChange={onChange}
                  onBlur={() => handleBlur('slug')}
                  error={hasError(errors.slug) || slugAvailability === 'taken'}
                  helperText={slugHint}
                  required
                  sx={{
                    ...fieldSx,
                    '& .MuiFormHelperText-root': {
                      mx: 0,
                      mt: 0.6,
                      fontSize: '12px',
                      fontFamily: DS.font,
                      color: hasError(errors.slug) || slugAvailability === 'taken'
                        ? '#EF4444'
                        : slugAvailability === 'available'
                        ? '#16A34A'
                        : DS.muted,
                    },
                    '& .MuiOutlinedInput-root': {
                      ...fieldSx['& .MuiOutlinedInput-root'],
                      pr: 0,
                      overflow: 'hidden',
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end" sx={{ maxHeight: 'none', height: '100%', ml: 0 }}>
                        <Box
                          sx={{
                            bgcolor: '#F3F4F6',
                            color: '#6B7280',
                            fontSize: '13px',
                            fontWeight: 600,
                            px: 1.6,
                            height: 48,
                            display: 'flex',
                            alignItems: 'center',
                            borderLeft: '1px solid #E8E8EE',
                            fontFamily: DS.font,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          .suthraone.com
                        </Box>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={5}>
                <FieldLabel optional>Upload Logo</FieldLabel>
                <Box
                  component="label"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 72,
                    border: '1.5px dashed #C4B5FD',
                    borderRadius: '10px',
                    cursor: uploadingLogo ? 'wait' : 'pointer',
                    bgcolor: '#FAFAFF',
                    px: 1,
                    py: 0.75,
                    textAlign: 'center',
                    '&:hover': { borderColor: DS.purple, bgcolor: 'rgba(139,92,246,0.06)' },
                  }}
                >
                  {form.logo ? (
                    <Avatar src={form.logo} sx={{ width: 28, height: 28, mb: 0.35 }} />
                  ) : (
                    <CloudUploadOutlined sx={{ color: DS.orange, fontSize: 22, mb: 0.25 }} />
                  )}
                  <Typography sx={{ fontSize: '12px', color: DS.orange, fontWeight: 700, lineHeight: 1.2 }}>
                    {uploadingLogo ? 'Uploading...' : form.logo ? 'Change logo' : 'Click to upload'}
                  </Typography>
                  <Typography sx={{ fontSize: '10.5px', color: DS.muted, lineHeight: 1.25 }}>PNG, JPG (Max 5MB)</Typography>
                  <input type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FieldLabel htmlFor="firstName" required>First Name</FieldLabel>
                <TextField
                  fullWidth
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={form.firstName}
                  onChange={onChange}
                  onBlur={() => handleBlur('firstName')}
                  error={hasError(errors.firstName)}
                  helperText={getHelperText(errors.firstName)}
                  required
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline sx={{ color: '#9CA3AF', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FieldLabel htmlFor="lastName" required>Last Name</FieldLabel>
                <TextField
                  fullWidth
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={onChange}
                  onBlur={() => handleBlur('lastName')}
                  error={hasError(errors.lastName)}
                  helperText={getHelperText(errors.lastName)}
                  required
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutline sx={{ color: '#9CA3AF', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <FieldLabel htmlFor="email" required>Email Address</FieldLabel>
                <TextField
                  fullWidth
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@business.com"
                  value={form.email}
                  onChange={onChange}
                  onBlur={() => handleBlur('email')}
                  error={hasError(errors.email)}
                  helperText={getHelperText(errors.email)}
                  required
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlined sx={{ color: '#9CA3AF', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FieldLabel required>Phone Number</FieldLabel>
                <Box sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    fontFamily: DS.font,
                    height: 48,
                    '& fieldset': { borderColor: '#E8E8EE' },
                    '&:hover fieldset': { borderColor: '#D1D5DB' },
                    '&.Mui-focused fieldset': { borderColor: DS.orange, borderWidth: '1.5px' },
                  },
                  '& .MuiInputBase-input': { py: 0, fontSize: '14px', fontFamily: DS.font },
                  '& .MuiFormHelperText-root': { mx: 0, mt: 0.6, fontSize: '12px', fontFamily: DS.font },
                }}>
                  <PhoneInput
                    fullWidth
                    placeholder="(555) 000-0000"
                    value={form.phone}
                    onChange={(val) => {
                      const clean = val.replace(/\D/g, '');
                      const isUS = form.dialCode === '1' || form.dialCode === '+1';
                      const final = (isUS && clean.length > 10) ? clean.slice(-10) : clean;
                      setForm({ ...form, phone: final });
                      if (errors.phone) {
                        setErrors(prev => ({ ...prev, phone: { isValid: true } }));
                      }
                    }}
                    dialCode={form.dialCode}
                    onDialCodeChange={(code) => setForm({ ...form, dialCode: code })}
                    error={hasError(errors.phone)}
                    helperText={getHelperText(errors.phone)}
                    required
                    onBlur={() => handleBlur('phone')}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FieldLabel htmlFor="ein">EIN (Employer Identification Number)</FieldLabel>
                <TextField
                  fullWidth
                  id="ein"
                  name="ein"
                  value={form.ein}
                  onChange={onChange}
                  onBlur={() => handleBlur('ein')}
                  error={hasError(errors.ein)}
                  helperText={getHelperText(errors.ein) || 'Optional'}
                  placeholder="e.g. 12-3456789"
                  inputProps={{ maxLength: 10 }}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeOutlined sx={{ color: '#9CA3AF', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FieldLabel htmlFor="password" required>Create Password</FieldLabel>
                <TextField
                  fullWidth
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={onChange}
                  onBlur={() => handleBlur('password')}
                  error={hasError(errors.password)}
                  helperText={hasError(errors.password) ? getHelperText(errors.password) : undefined}
                  required
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
                {form.password && (
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', gap: 0.6, mb: 0.75 }}>
                      {[0, 1, 2, 3].map((i) => (
                        <Box
                          key={i}
                          sx={{
                            flex: 1,
                            height: 4,
                            borderRadius: 99,
                            bgcolor: i < strength.filled ? strength.color : '#E5E7EB',
                          }}
                        />
                      ))}
                    </Box>
                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: strength.color, mb: 0.5 }}>
                      Password strength: {strength.label}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <CheckCircle sx={{ fontSize: 14, color: strength.meetsLength ? '#22C55E' : '#D1D5DB' }} />
                      <Typography sx={{ fontSize: '11.5px', color: strength.meetsLength ? '#16A34A' : DS.muted }}>
                        Use 8+ characters with a mix of letters, numbers & symbols
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12} sm={6}>
                <FieldLabel htmlFor="confirmPassword" required>Confirm Password</FieldLabel>
                <TextField
                  fullWidth
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={onChange}
                  onBlur={() => handleBlur('confirmPassword')}
                  error={hasError(errors.confirmPassword)}
                  helperText={getHelperText(errors.confirmPassword)}
                  required
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined sx={{ color: '#9CA3AF', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" sx={{ color: '#9CA3AF' }}>
                          {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            {/* {loadingPlans ? (
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress sx={{ color: DS.orange }} />
              </Box>
            ) : plans.length > 0 ? (
              <Box sx={{ mt: 4 }}>
                <Typography sx={{ fontFamily: DS.heading, fontWeight: 700, fontSize: '13px', color: DS.label, textAlign: 'left' }}>
                  Choose a plan <Box component="span" sx={{ color: DS.muted, fontWeight: 500 }}>(Optional)</Box>
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    overflowX: 'auto',
                    gap: 2,
                    mt: 2,
                    pb: 1,
                    '&::-webkit-scrollbar': { height: 8 },
                    '&::-webkit-scrollbar-thumb': { backgroundColor: DS.border, borderRadius: 4 },
                  }}
                >
                  {plans.map((plan) => {
                    const { basePlan, extra } = splitPlanFeatures(plan, plans);
                    const limitItems = [
                      plan.maxUsers ? `Up to ${plan.maxUsers} Users` : null,
                      plan.maxTables ? `Manage ${plan.maxTables} Tables` : null,
                      plan.maxOrders ? `${plan.maxOrders} Orders / month` : null,
                      plan.maxSms ? `${plan.maxSms} SMS Credits` : null,
                    ].filter(Boolean) as string[];
                    const featureItems = extra.map(planFeatureLabel);
                    const selected = form.planId === plan._id;

                    return (
                      <Paper
                        key={plan._id}
                        elevation={0}
                        onClick={() => setForm({ ...form, planId: selected ? undefined : plan._id })}
                        sx={{
                          p: 2.25,
                          width: 260,
                          flexShrink: 0,
                          cursor: 'pointer',
                          borderRadius: '14px',
                          border: selected ? `2px solid ${DS.orange}` : `1px solid ${DS.border}`,
                          bgcolor: selected ? 'rgba(139,92,246,0.04)' : '#fff',
                        }}
                      >
                        <Typography sx={{ fontWeight: 800, fontSize: '13px', color: selected ? DS.orange : DS.text, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                          {plan.name}
                        </Typography>
                        <Typography sx={{ fontSize: '22px', fontWeight: 800, mt: 0.5, color: DS.text }}>
                          ${Number(plan.price || 0).toFixed(2)}
                          <Box component="span" sx={{ fontSize: '13px', fontWeight: 500, color: DS.muted }}> / {plan.interval}</Box>
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: DS.muted, mt: 1, minHeight: 36 }}>{plan.description || 'Get started with our basic features.'}</Typography>
                        {[...limitItems, ...featureItems].slice(0, 5).map((feature) => (
                          <Box key={feature} sx={{ display: 'flex', gap: 1, mt: 0.75 }}>
                            <CheckCircle sx={{ fontSize: 14, color: selected ? DS.orange : '#D1D5DB', mt: '2px' }} />
                            <Typography sx={{ fontSize: '12px', color: DS.muted }}>{feature}</Typography>
                          </Box>
                        ))}
                        {basePlan && (
                          <Typography sx={{ fontSize: '11px', fontStyle: 'italic', color: DS.muted, mt: 1 }}>
                            Everything in {basePlan.name}, plus extras
                          </Typography>
                        )}
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
            ) : null} */}

            {error && <Alert severity="error" sx={{ mt: 3, borderRadius: '12px' }}>{error}</Alert>}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !isReadyToRegister}
              startIcon={!loading ? <RocketLaunchOutlined /> : undefined}
              sx={{
                mt: 3.5,
                height: 52,
                borderRadius: '12px',
                textTransform: 'none',
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: DS.font,
                background: `linear-gradient(90deg, ${DS.orange} 0%, ${DS.orange} 100%)`,
                boxShadow: '0 10px 24px rgba(139,92,246,0.28)',
                '&:hover': { background: `linear-gradient(90deg, ${DS.orangeDeep} 0%, #EA580C 100%)` },
                '&.Mui-disabled': {
                  background: `linear-gradient(90deg, ${DS.orange} 0%, ${DS.orange} 100%)`,
                  color: '#fff',
                  opacity: 0.55,
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Start Your Journey'}
            </Button>

            <Divider sx={{ my: 2.5, '&::before, &::after': { borderColor: DS.border }, '& .MuiDivider-wrapper': { px: 1.5, color: DS.muted, fontSize: '13px' } }}>
              or
            </Divider>

            <Button
              fullWidth
              variant="outlined"
              type="button"
              onClick={() => setError('Google sign-up for partner accounts is not enabled yet. Please complete the form above.')}
              sx={{
                height: 50,
                borderRadius: '12px',
                textTransform: 'none',
                fontFamily: DS.font,
                fontWeight: 600,
                fontSize: '14.5px',
                color: DS.text,
                borderColor: DS.border,
                '&:hover': { borderColor: '#D1D5DB', bgcolor: '#F9FAFB' },
              }}
            >
              <GoogleGIcon />
              Sign up with Google
            </Button>

            <Typography sx={{ mt: 2.75, textAlign: 'center', fontSize: '14px', color: DS.muted }}>
              Already have an account?{' '}
              <Box
                component="button"
                type="button"
                onClick={() => navigate('/login')}
                sx={{
                  border: 0,
                  background: 'none',
                  p: 0,
                  color: DS.link,
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: DS.font,
                }}
              >
                Sign in
              </Box>
            </Typography>
          </Box>
        </Box>
      </Box>

      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: 'column',
          gap: 2,
          backdropFilter: 'blur(4px)',
          backgroundColor: 'rgba(0,0,0,0.7)',
        }}
        open={loading}
      >
        <CircularProgress color="inherit" size={60} thickness={4} />
        <Typography sx={{ fontWeight: 600, fontSize: '18px', fontFamily: DS.heading }}>
          Creating your restaurant...
        </Typography>
        <Typography sx={{ opacity: 0.8, fontSize: '14px' }}>
          Please wait while we set up your workspace
        </Typography>
      </Backdrop>

      <Dialog
        open={!!successData}
        onClose={() => setSuccessData(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 2 } }}
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
          <Typography variant="h5" sx={{ color: DS.orange, fontWeight: 'bold', mb: 3 }}>
            {successData?.restaurantName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your account is currently under review by the Suthra One team. You&apos;ll get an email once your restaurant gets approved and is ready to use!
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, pt: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              setSuccessData(null);
              navigate('/login');
            }}
            sx={{
              px: 6,
              py: 1.5,
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 'bold',
              background: `linear-gradient(90deg, ${DS.orange} 0%, ${DS.orange} 100%)`,
            }}
          >
            Go to Login
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RestaurantRegisterPage;
