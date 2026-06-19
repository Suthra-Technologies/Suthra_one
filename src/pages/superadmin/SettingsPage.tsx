import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  CircularProgress,
  Breadcrumbs,
  Link,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Settings as SettingsIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface GoogleMeetSettings {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<GoogleMeetSettings>({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/superadmin/settings/google_meet');
      if (response.data) {
        setSettings({
          clientId: response.data.clientId || '',
          clientSecret: response.data.clientSecret || '',
          refreshToken: response.data.refreshToken || '',
        });
      }
    } catch (error) {
      console.error('Failed to load system settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoogleMeet = async () => {
    try {
      setSaving(true);
      await api.patch('/superadmin/settings/google_meet', settings);
      toast.success('Google Meet settings updated successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress size={50} sx={{ color: '#6366F1' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 750, margin: '0 auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
          <Link underline="hover" color="inherit" href="/superadmin">
            Superadmin
          </Link>
          <Typography color="text.primary">Settings</Typography>
        </Breadcrumbs>
        <Typography variant="h4" fontWeight="bold" sx={{ color: '#1E1B4B', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon sx={{ fontSize: 32, color: '#6366F1' }} />
          Google Meet Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure OAuth 2.0 credentials for automated calendar and meeting creation.
        </Typography>
      </Box>

      {/* Setting Panel */}
      <Card
        elevation={0}
        sx={{
          borderRadius: '20px',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          background: '#ffffff',
          boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box>
            <Box sx={{ mb: 3.5 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ color: '#1E1B4B', mb: 0.5 }}>
                Google Meet Integration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Update your OAuth 2.0 parameters. The backend service will dynamically load these values to schedule meeting rooms.
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 4, opacity: 0.6 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
              <TextField
                fullWidth
                label="OAuth Client ID"
                variant="outlined"
                value={settings.clientId}
                onChange={(e) => setSettings({ ...settings, clientId: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />

              <TextField
                fullWidth
                label="OAuth Client Secret"
                variant="outlined"
                type={showSecret ? "text" : "password"}
                value={settings.clientSecret}
                onChange={(e) => setSettings({ ...settings, clientSecret: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowSecret(!showSecret)} edge="end">
                        {showSecret ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="OAuth Refresh Token"
                variant="outlined"
                type={showToken ? "text" : "password"}
                value={settings.refreshToken}
                onChange={(e) => setSettings({ ...settings, refreshToken: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowToken(!showToken)} edge="end">
                        {showToken ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  disabled={saving}
                  onClick={handleSaveGoogleMeet}
                  sx={{
                    bgcolor: '#6366F1',
                    color: '#fff',
                    borderRadius: '12px',
                    px: 4,
                    py: 1.5,
                    fontWeight: 'bold',
                    textTransform: 'none',
                    boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.3)',
                    '&:hover': {
                      bgcolor: '#4F46E5',
                    },
                  }}
                >
                  {saving ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Save Settings'}
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
