import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, TextField, Button, Typography, CircularProgress, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { validateEmail, validatePhone, validateName, validatePassword, getHelperText, hasError } from '../utils/validation';
import type { ValidationResult } from '../utils/validation';
import { InputAdornment, Select, MenuItem } from '@mui/material';


const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5006'}/api`;

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  password: string;
}

const COUNTRIES = [
  { code: 'IN', label: 'India', phone: '+91' },
  { code: 'US', label: 'USA', phone: '+1' },
  { code: 'GB', label: 'UK', phone: '+44' },
  { code: 'AU', label: 'Australia', phone: '+61' },
  { code: 'AE', label: 'UAE', phone: '+971' },
];

const CustomerRegisterPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '+1',
    password: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, ValidationResult>>({});

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Special rule for phone input
    if (name === "phone") {
      const numeric = String(value || '').replace(/\D/g, ""); // keep only digits
      let final = numeric;
      if (form.dialCode === '+1' || form.dialCode === '1' || !form.dialCode) {
        const sliced = numeric.slice(0, 10);
        if (sliced.length <= 3) final = sliced ? `(${sliced}` : '';
        else if (sliced.length <= 6) final = `(${sliced.slice(0, 3)}) ${sliced.slice(3)}`;
        else final = `(${sliced.slice(0, 3)}) ${sliced.slice(3, 6)}-${sliced.slice(6)}`;
      } else {
        if (numeric.length > 15) return;
      }
      setForm({ ...form, [name]: final });

      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: { isValid: true } }));
      }
      return;
    }

    setForm({ ...form, [name]: value });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: { isValid: true } }));
    }
  };


  const handleBlur = (field: keyof RegisterForm) => {
    const value = form[field];
    let validation: ValidationResult;

    switch (field) {
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
        validation = validatePhone(value, form.countryCode);
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
      firstName: validateName(form.firstName, 'First name'),
      lastName: validateName(form.lastName, 'Last name'),
      email: validateEmail(form.email),
      phone: validatePhone(form.phone, form.countryCode),
      password: validatePassword(form.password),
    };

    setErrors(newErrors);

    return Object.values(newErrors).every(v => v.isValid);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate all fields before submission
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tenants/${encodeURIComponent(slug || '')}/customers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: `${form.countryCode}${form.phone}`
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Registration failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      window.location.replace('/customer');
    } catch (e: any) {
      toast.error(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper elevation={3} sx={{ width: '100%', maxWidth: 420, p: 3 }}>
        <Typography variant="h5" gutterBottom>Register at {slug}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create your customer account to order online.
        </Typography>

        <Box component="form" onSubmit={onSubmit}>
          <TextField
            name="firstName"
            label="First name"
            fullWidth
            sx={{ mb: 2 }}
            value={form.firstName}
            onChange={onChange}
            onBlur={() => handleBlur('firstName')}
            error={hasError(errors.firstName)}
            helperText={getHelperText(errors.firstName)}
            required
          />
          <TextField
            name="lastName"
            label="Last name"
            fullWidth
            sx={{ mb: 2 }}
            value={form.lastName}
            onChange={onChange}
            onBlur={() => handleBlur('lastName')}
            error={hasError(errors.lastName)}
            helperText={getHelperText(errors.lastName)}
            required
          />
          <TextField
            name="email"
            type="email"
            label="Email"
            fullWidth
            sx={{ mb: 2 }}
            value={form.email}
            onChange={onChange}
            onBlur={() => handleBlur('email')}
            error={hasError(errors.email)}
            helperText={getHelperText(errors.email)}
            required
          />
          <TextField
            name="phone"
            label="Phone"
            fullWidth
            sx={{ mb: 2 }}
            value={form.phone}
            onChange={onChange}
            onBlur={() => handleBlur('phone')}
            error={hasError(errors.phone)}
            helperText={getHelperText(errors.phone) || "Enter 10-digit mobile number"}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Select
                    value={form.countryCode}
                    onChange={(e) => {
                      const newCode = e.target.value as string;
                      // Re-validate and re-format existing phone number if country code changes
                      const numeric = form.phone.replace(/\D/g, '');
                      let final = numeric;
                      if (newCode === '+1') {
                        const sliced = numeric.slice(0, 10);
                        if (sliced.length <= 3) final = sliced ? `(${sliced}` : '';
                        else if (sliced.length <= 6) final = `(${sliced.slice(0, 3)}) ${sliced.slice(3)}`;
                        else final = `(${sliced.slice(0, 3)}) ${sliced.slice(3, 6)}-${sliced.slice(6)}`;
                      } else {
                        final = numeric.slice(0, 15);
                      }
                      setForm({ ...form, countryCode: newCode, phone: final });
                    }}
                    variant="standard"
                    disableUnderline
                    sx={{ mr: 1, minWidth: 60 }}
                  >
                    {COUNTRIES.map((country) => (
                      <MenuItem key={country.code} value={country.phone}>
                        {country.phone}
                      </MenuItem>
                    ))}
                  </Select>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            name="password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            fullWidth
            sx={{ mb: 2 }}
            value={form.password}
            onChange={onChange}
            onBlur={() => handleBlur('password')}
            error={hasError(errors.password)}
            helperText={getHelperText(errors.password) || "Minimum 6 characters"}
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
          <Button type="submit" variant="contained" fullWidth disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default CustomerRegisterPage;
