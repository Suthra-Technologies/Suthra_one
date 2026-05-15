import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, IconButton, Divider,
  TextField, Button, Alert, Chip, CircularProgress,
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SmsIcon from '@mui/icons-material/Sms';
import EmailIcon from '@mui/icons-material/Email';
import ReceiptIcon from '@mui/icons-material/Receipt';
import StoreIcon from '@mui/icons-material/Store';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PaymentIcon from '@mui/icons-material/Payment';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { superAPI } from '../../services/api';

const TenantDetailsPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const tenant = location.state?.tenant;
  const storeName = tenant?.name ? encodeURIComponent(tenant.name) : '';

  const [connectAccountId, setConnectAccountId] = useState<string>(
    tenant?.stripeConnectAccountId || ''
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const tiles = [
    {
      title: 'SMS Usage',
      icon: <SmsIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
      path: `/superadmin/sms-logs/${tenantId}`,
      color: '#e3f2fd',
    },
    {
      title: 'Email Usage',
      icon: <EmailIcon sx={{ fontSize: 40, color: '#2e7d32' }} />,
      path: `/superadmin/email-logs/${tenantId}`,
      color: '#e8f5e9',
    },
    {
      title: 'Orders',
      icon: <ReceiptIcon sx={{ fontSize: 40, color: '#ed6c02' }} />,
      path: `/superadmin/tenants/${tenantId}/orders`,
      color: '#fff3e0',
    },
    {
      title: 'Store Log',
      icon: <StoreIcon sx={{ fontSize: 40, color: '#7c3aed' }} />,
      path: `/superadmin/logs/stores?tenantId=${tenantId}&name=${storeName}`,
      color: '#f3e8ff',
    },
    {
      title: 'Tickets Log',
      icon: <SupportAgentIcon sx={{ fontSize: 40, color: '#0891b2' }} />,
      path: `/superadmin/logs/tickets?tenantId=${tenantId}&name=${storeName}`,
      color: '#e0f2fe',
    },
    {
      title: 'Platform Payments',
      icon: <PaymentIcon sx={{ fontSize: 40, color: '#1565c0' }} />,
      path: `/superadmin/tenants/${tenantId}/platform-payments`,
      color: '#e3f2fd',
    },
  ];

  const handleSaveConnectAccount = async () => {
    if (!tenantId || !connectAccountId.trim()) return;
    if (!connectAccountId.startsWith('acct_')) {
      setSaveError('Connect account ID must start with "acct_"');
      return;
    }
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    try {
      await superAPI.updateTenantConnectAccount(tenantId, {
        stripeConnectAccountId: connectAccountId.trim(),
        stripeConnectStatus: 'active',
      });
      setSaveSuccess(true);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const isConnected = connectAccountId.startsWith('acct_') && connectAccountId.trim().length > 10;

  return (
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: { xs: 1.5, sm: 3 }, pt: { xs: 0.5, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/superadmin/tenants')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {tenant ? `${tenant.name} - Details` : 'Store Details'}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {tiles.map((tile, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              elevation={2}
              onClick={() => navigate(tile.path, { state: { tenant } })}
              sx={{
                cursor: 'pointer',
                borderRadius: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
                bgcolor: tile.color,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                height: '100%',
              }}
            >
              <Box sx={{ mb: 2 }}>{tile.icon}</Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {tile.title}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Stripe Connect Section */}
      <Card elevation={2} sx={{ borderRadius: 3, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <AccountBalanceIcon sx={{ color: '#635bff', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Stripe Connect
          </Typography>
          {isConnected && (
            <Chip label="Connected" size="small" color="success" />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Enter the connected account ID from your Stripe dashboard (starts with <code>acct_</code>).
          Delivery payments for this store will be routed to this account.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            label="Stripe Connect Account ID"
            placeholder="acct_xxxxxxxxxxxx"
            value={connectAccountId}
            onChange={(e) => {
              setConnectAccountId(e.target.value);
              setSaveSuccess(false);
              setSaveError('');
            }}
            size="small"
            sx={{ minWidth: 320 }}
            helperText='Find this in Stripe Dashboard → Connect → Accounts'
          />
          <Button
            variant="contained"
            onClick={handleSaveConnectAccount}
            disabled={saving || !connectAccountId.trim()}
            sx={{ bgcolor: '#635bff', '&:hover': { bgcolor: '#5147e0' }, mt: 0.5 }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
          </Button>
        </Box>

        {saveSuccess && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Stripe Connect account saved. Delivery payments will now route to <strong>{connectAccountId}</strong>.
          </Alert>
        )}
        {saveError && (
          <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>
        )}
      </Card>
    </Box>
  );
};

export default TenantDetailsPage;
