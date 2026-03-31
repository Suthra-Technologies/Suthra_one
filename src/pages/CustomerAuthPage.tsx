import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Divider,
  IconButton,
  Tabs,
  Tab,
  Grid,
  Paper
} from '@mui/material';
import {
  Google as GoogleIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Apple as AppleIcon,
  Visibility,
  VisibilityOff,
  RestaurantMenu,
  AccountCircle
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { login, initGoogleAuth, initFacebookAuth, initAppleAuth } from '../../services/authService';
import CustomerRegistration from '../../components/auth/CustomerRegistration';
import { toast } from 'react-hot-toast';

const CustomerAuthPage: React.FC = () => {
  const { login: contextLogin } = useAuth();
  const [tabValue, setTabValue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginForm, setLoginForm] = useState<{ email: string; password: string }>({ email: '', password: '' });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await login(loginForm);
      if (response.data) {
        await contextLogin(response.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setLoading(true);
    try {
      let userData = null;
      switch (provider) {
        case 'google':
          userData = await initGoogleAuth();
          break;
        case 'facebook':
          userData = await initFacebookAuth();
          break;
        case 'apple':
          userData = await initAppleAuth();
          break;
        default:
          throw new Error('Invalid social provider');
      }
      if (userData) {
        await contextLogin(userData);
      }
    } catch (err: any) {
      toast.error(`${provider} login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationSuccess = async (userData: any) => {
    try {
      await contextLogin(userData);
    } catch (err) {
      toast.error('Registration successful but login failed. Please try logging in manually.');
    }
  };

  const renderSocialButtons = () => (
    <Box sx={{ my: 3 }}>
      <Typography variant="body2" align="center" gutterBottom>
        {tabValue === 0 ? 'Quick Sign In With' : 'Quick Sign Up With'}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<GoogleIcon />}
          onClick={() => handleSocialLogin('google')}
          disabled={loading}
          sx={{ minWidth: 120, borderColor: '#db4437', color: '#db4437', '&:hover': { borderColor: '#db4437', backgroundColor: 'rgba(219, 68, 55, 0.04)' } }}
        >
          Google
        </Button>
        <Button
          variant="outlined"
          startIcon={<FacebookIcon />}
          onClick={() => handleSocialLogin('facebook')}
          disabled={loading}
          sx={{ minWidth: 120, borderColor: '#3b5998', color: '#3b5998', '&:hover': { borderColor: '#3b5998', backgroundColor: 'rgba(59, 89, 152, 0.04)' } }}
        >
          Facebook
        </Button>
        <Button
          variant="outlined"
          startIcon={<TwitterIcon />}
          onClick={() => handleSocialLogin('twitter')}
          disabled={loading}
          sx={{ minWidth: 120, borderColor: '#1da1f2', color: '#1da1f2', '&:hover': { borderColor: '#1da1f2', backgroundColor: 'rgba(29, 161, 242, 0.04)' } }}
        >
          Twitter
        </Button>
        <Button
          variant="outlined"
          startIcon={<AppleIcon />}
          onClick={() => handleSocialLogin('apple')}
          disabled={loading}
          sx={{ minWidth: 120, borderColor: '#000000', color: '#000000', '&:hover': { borderColor: '#000000', backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
        >
          Apple
        </Button>
      </Box>
    </Box>
  );

  const renderLoginForm = () => (
    <Card sx={{ maxWidth: 500, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <RestaurantMenu sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" gutterBottom>
            Welcome Back!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to your account to continue ordering
          </Typography>
        </Box>
        {renderSocialButtons()}
        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            OR
          </Typography>
        </Divider>

        <form onSubmit={handleLogin}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                required
                variant="outlined"
                autoComplete="email"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={loginForm.password}
                onChange={handleLoginChange}
                required
                variant="outlined"
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Grid>
          </Grid>
        </form>
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Button
              variant="text"
              onClick={() => setTabValue(1)}
              sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
            >
              Create Account
            </Button>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', py: 4, px: 2 }}>
      <Paper sx={{ maxWidth: 800, mx: 'auto', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="Customer auth tabs" sx={{ px: 2 }}>
            <Tab icon={<AccountCircle />} label="Sign In" iconPosition="start" sx={{ minHeight: 64 }} />
            <Tab icon={<RestaurantMenu />} label="Join Us" iconPosition="start" sx={{ minHeight: 64 }} />
          </Tabs>
        </Box>
        <Box sx={{ p: 2 }}>
          {tabValue === 0 && renderLoginForm()}
          {tabValue === 1 && (
            <CustomerRegistration onClose={() => setTabValue(0)} onSuccess={handleRegistrationSuccess} />
          )}
        </Box>
      </Paper>
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mt: 4, p: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
          <Typography variant="caption" color="white">
            <strong>Development Note:</strong> To enable social logins, add the respective SDKs to your index.html:
            <br />• Google: Add Google Identity Services script
            <br />• Facebook: Add Facebook SDK for JavaScript
            <br />• Apple: Add Apple ID SDK
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CustomerAuthPage;
