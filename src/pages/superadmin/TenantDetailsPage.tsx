import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, IconButton, Divider,
  TextField, Button, Alert, Chip, CircularProgress, Stack, Tooltip,
  Switch, FormControlLabel, InputAdornment
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SmsIcon from '@mui/icons-material/Sms';
import EmailIcon from '@mui/icons-material/Email';
import ReceiptIcon from '@mui/icons-material/Receipt';
import StoreIcon from '@mui/icons-material/Store';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PaymentIcon from '@mui/icons-material/Payment';
import PercentIcon from '@mui/icons-material/Percent';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import LinkIcon from '@mui/icons-material/Link';
import SaveIcon from '@mui/icons-material/Save';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { superAPI } from '../../services/api';

const statusColor = (s?: string) => {
  if (s === 'active') return 'success';
  if (s === 'restricted') return 'warning';
  if (s === 'pending') return 'default';
  return 'error';
};

const TenantDetailsPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const tenant = location.state?.tenant;
  const storeName = tenant?.name ? encodeURIComponent(tenant.name) : '';

  // Connect account state
  const [connectAccountId, setConnectAccountId] = useState<string>(tenant?.stripeConnectAccountId || '');
  const [connectStatus, setConnectStatus] = useState<string>(tenant?.stripeConnectStatus || '');
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);

  // Loading states
  const [onboarding, setOnboarding] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [gettingLink, setGettingLink] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Feedback
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const clearFeedback = () => { setError(''); setInfo(''); };

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

  const handleStartOnboarding = async () => {
    if (!tenantId) return;
    clearFeedback();
    setOnboarding(true);
    try {
      const currentUrl = window.location.href;
      const res = await superAPI.onboardConnectAccount(tenantId, currentUrl, currentUrl);
      const { accountId, onboardingUrl } = res.data;
      setConnectAccountId(accountId);
      setConnectStatus('pending');
      window.open(onboardingUrl, '_blank', 'noopener');
      setInfo('Onboarding link opened in a new tab. After the restaurant completes setup, click "Check Status" to confirm.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to start onboarding');
    } finally {
      setOnboarding(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!tenantId) return;
    clearFeedback();
    setCheckingStatus(true);
    try {
      const res = await superAPI.getConnectAccountStatus(tenantId);
      const { status, payoutsEnabled } = res.data;
      setConnectStatus(status);
      setInfo(
        status === 'active'
          ? 'Account is fully active. Delivery payments will route to this account.'
          : status === 'restricted'
          ? `Charges enabled but payouts ${payoutsEnabled ? 'enabled' : 'not yet enabled'}. Restaurant may need to complete additional verification.`
          : 'Account is pending. The restaurant has not completed onboarding yet.',
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleOpenDashboard = async () => {
    if (!tenantId) return;
    clearFeedback();
    setGettingLink(true);
    try {
      const res = await superAPI.getConnectLoginLink(tenantId);
      window.open(res.data.url, '_blank', 'noopener');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate dashboard link');
    } finally {
      setGettingLink(false);
    }
  };

  const handleDisconnect = async () => {
    if (!tenantId) return;
    if (!window.confirm('This will clear the stale Connect account from the database so you can re-onboard. Continue?')) return;
    clearFeedback();
    setDisconnecting(true);
    try {
      await superAPI.clearConnectAccount(tenantId);
      setConnectAccountId('');
      setConnectStatus('');
      setInfo('Connect account cleared. Click "Start Onboarding" to create a new Express account.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to disconnect account');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveManual = async () => {
    if (!tenantId || !manualInput.trim()) return;
    if (!manualInput.startsWith('acct_')) {
      setError('Connect account ID must start with "acct_"');
      return;
    }
    clearFeedback();
    setSavingManual(true);
    try {
      await superAPI.updateTenantConnectAccount(tenantId, {
        stripeConnectAccountId: manualInput.trim(),
        stripeConnectStatus: 'active',
      });
      setConnectAccountId(manualInput.trim());
      setConnectStatus('active');
      setShowManual(false);
      setManualInput('');
      setInfo('Connect account saved manually.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSavingManual(false);
    }
  };

  const isConnected = !!connectAccountId;

  // Delivery settings state
  const [deliverySettings, setDeliverySettings] = useState<any>({
    ubereats: { enabled: false, clientId: '', clientSecret: '', customerId: '', storeId: '', isSandbox: true },
    doordash: { enabled: false, developerId: '', keyId: '', signingSecret: '', isSandbox: true },
  });
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState('');
  const [showUberSecret, setShowUberSecret] = useState(false);
  const [showDoorSecret, setShowDoorSecret] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    setDeliveryLoading(true);
    superAPI.getTenantDeliverySettings(tenantId)
      .then(res => {
        const s = res.data || {};
        setDeliverySettings({
          ubereats: { enabled: false, clientId: '', clientSecret: '', customerId: '', storeId: '', isSandbox: true, ...s.ubereats },
          doordash: { enabled: false, developerId: '', keyId: '', signingSecret: '', isSandbox: true, ...s.doordash },
        });
      })
      .catch(() => {})
      .finally(() => setDeliveryLoading(false));
  }, [tenantId]);

  // Platform processing fee (superadmin-managed) state
  const [processingFee, setProcessingFee] = useState<string>('');
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeError, setFeeError] = useState('');
  const [feeInfo, setFeeInfo] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    setFeeLoading(true);
    superAPI.getTenantProcessingFee(tenantId)
      .then(res => setProcessingFee(String(res.data?.processingFee ?? '')))
      .catch(() => {})
      .finally(() => setFeeLoading(false));
  }, [tenantId]);

  const handleSaveProcessingFee = async () => {
    if (!tenantId) return;
    const fee = parseFloat(processingFee);
    if (isNaN(fee) || fee < 0) {
      setFeeError('Enter a valid non-negative number');
      setFeeInfo('');
      return;
    }
    setFeeSaving(true);
    setFeeError('');
    setFeeInfo('');
    try {
      await superAPI.updateTenantProcessingFee(tenantId, fee);
      setFeeInfo('Processing fee updated.');
    } catch (err: any) {
      setFeeError(err?.response?.data?.message || 'Failed to update processing fee');
    } finally {
      setFeeSaving(false);
    }
  };

  const setUber = (field: string, value: any) =>
    setDeliverySettings((p: any) => ({ ...p, ubereats: { ...p.ubereats, [field]: value } }));

  const setDoor = (field: string, value: any) =>
    setDeliverySettings((p: any) => ({ ...p, doordash: { ...p.doordash, [field]: value } }));

  const handleSaveDelivery = async () => {
    if (!tenantId) return;
    setDeliverySaving(true);
    setDeliveryError('');
    setDeliveryInfo('');
    try {
      await superAPI.updateTenantDeliverySettings(tenantId, deliverySettings);
      setDeliveryInfo('Delivery settings saved.');
    } catch (err: any) {
      setDeliveryError(err?.response?.data?.message || 'Failed to save delivery settings');
    } finally {
      setDeliverySaving(false);
    }
  };

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
          <Grid xs={12} sm={6} md={4} key={index}>
            <Card
              elevation={2}
              onClick={() => navigate(tile.path, { state: { tenant } })}
              sx={{
                cursor: 'pointer',
                borderRadius: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
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
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{tile.title}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Platform Fee Section (superadmin-managed) */}
      <Card elevation={2} sx={{ borderRadius: 3, p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <PercentIcon sx={{ color: '#7c3aed', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Platform Fee</Typography>
          {feeLoading && <CircularProgress size={18} />}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Processing fee charged on this store's orders. Only superadmins can change it.
          The store admin can see this value in their settings but cannot edit it.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
          <TextField
            label="Processing Fee (%)"
            type="number"
            size="small"
            value={processingFee}
            onChange={(e) => { setProcessingFee(e.target.value); setFeeError(''); setFeeInfo(''); }}
            disabled={feeLoading}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ minWidth: 220 }}
          />
          <Button
            variant="contained"
            startIcon={feeSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveProcessingFee}
            disabled={feeSaving || feeLoading}
          >
            {feeSaving ? 'Saving...' : 'Save Fee'}
          </Button>
        </Stack>
        {feeError && <Alert severity="error" sx={{ mt: 2 }}>{feeError}</Alert>}
        {feeInfo && <Alert severity="success" sx={{ mt: 2 }}>{feeInfo}</Alert>}
      </Card>

      {/* Stripe Connect Section */}
      <Card elevation={2} sx={{ borderRadius: 3, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <AccountBalanceIcon sx={{ color: '#635bff', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Stripe Connect</Typography>
          {isConnected && (
            <Chip
              label={connectStatus || 'connected'}
              size="small"
              color={statusColor(connectStatus) as any}
              sx={{ textTransform: 'capitalize' }}
            />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Delivery payments for this restaurant will be routed to their Stripe Express account.
          The restaurant name will appear on the customer's card statement and they handle their own disputes.
        </Typography>

        {/* Account ID display */}
        {isConnected && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">Connected Account</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{connectAccountId}</Typography>
          </Box>
        )}

        {/* Action buttons */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {!isConnected ? (
            <Button
              variant="contained"
              onClick={handleStartOnboarding}
              disabled={onboarding}
              startIcon={onboarding ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}
              sx={{ bgcolor: '#635bff', '&:hover': { bgcolor: '#5147e0' } }}
            >
              {onboarding ? 'Creating...' : 'Start Onboarding'}
            </Button>
          ) : (
            <>
              {connectStatus !== 'active' && (
                <Button
                  variant="contained"
                  onClick={handleStartOnboarding}
                  disabled={onboarding}
                  startIcon={onboarding ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}
                  sx={{ bgcolor: '#635bff', '&:hover': { bgcolor: '#5147e0' } }}
                >
                  {onboarding ? 'Generating...' : 'Continue Onboarding'}
                </Button>
              )}
              <Tooltip title="Fetch live status from Stripe">
                <Button
                  variant="outlined"
                  onClick={handleCheckStatus}
                  disabled={checkingStatus}
                  startIcon={checkingStatus ? <CircularProgress size={16} /> : <RefreshIcon />}
                >
                  {checkingStatus ? 'Checking...' : 'Check Status'}
                </Button>
              </Tooltip>
              <Tooltip title="Open restaurant's Stripe Express dashboard">
                <Button
                  variant="outlined"
                  onClick={handleOpenDashboard}
                  disabled={gettingLink}
                  startIcon={gettingLink ? <CircularProgress size={16} /> : <OpenInNewIcon />}
                >
                  {gettingLink ? 'Loading...' : 'Restaurant Dashboard'}
                </Button>
              </Tooltip>
              <Tooltip title="Clear this account from the database so you can re-onboard">
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  startIcon={disconnecting ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </Tooltip>
            </>
          )}

          <Button
            variant="text"
            size="small"
            color="inherit"
            sx={{ color: 'text.secondary' }}
            onClick={() => { setShowManual(v => !v); clearFeedback(); }}
          >
            {showManual ? 'Cancel' : 'Enter ID manually'}
          </Button>
        </Stack>

        {/* Manual input fallback */}
        {showManual && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap', mb: 2 }}>
            <TextField
              label="Stripe Connect Account ID"
              placeholder="acct_xxxxxxxxxxxx"
              value={manualInput}
              onChange={(e) => { setManualInput(e.target.value); clearFeedback(); }}
              size="small"
              sx={{ minWidth: 300 }}
              helperText="Stripe Dashboard → Connect → Accounts"
            />
            <Button
              variant="contained"
              onClick={handleSaveManual}
              disabled={savingManual || !manualInput.trim()}
              sx={{ bgcolor: '#635bff', '&:hover': { bgcolor: '#5147e0' }, mt: 0.5 }}
            >
              {savingManual ? <CircularProgress size={20} color="inherit" /> : 'Save'}
            </Button>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        {info && <Alert severity="info" sx={{ mt: 1 }}>{info}</Alert>}
      </Card>

      <Divider sx={{ my: 4 }} />

      {/* Delivery Settings Section */}
      <Card elevation={2} sx={{ borderRadius: 3, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <DeliveryDiningIcon sx={{ color: '#ed6c02', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Delivery Credentials</Typography>
          {deliveryLoading && <CircularProgress size={18} />}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          These credentials are managed by superadmin only. The restaurant just enables/disables delivery from their settings page.
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {/* Uber Direct */}
          <Box flex={1} sx={{ border: '1px solid', borderColor: deliverySettings.ubereats?.enabled ? 'primary.main' : 'divider', borderRadius: 2, p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">Uber Direct</Typography>
              <FormControlLabel
                control={<Switch checked={!!deliverySettings.ubereats?.enabled} onChange={e => setUber('enabled', e.target.checked)} />}
                label={deliverySettings.ubereats?.enabled ? 'Enabled' : 'Disabled'}
              />
            </Stack>
            <Stack spacing={2}>
              <TextField size="small" fullWidth label="Client ID" value={deliverySettings.ubereats?.clientId || ''} onChange={e => setUber('clientId', e.target.value)} />
              <TextField size="small" fullWidth type={showUberSecret ? 'text' : 'password'} label="Client Secret" value={deliverySettings.ubereats?.clientSecret || ''} onChange={e => setUber('clientSecret', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowUberSecret(!showUberSecret)} size="small">{showUberSecret ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}</IconButton></InputAdornment> }} />
              <TextField size="small" fullWidth label="Customer ID" value={deliverySettings.ubereats?.customerId || ''} onChange={e => setUber('customerId', e.target.value)} />
              <TextField size="small" fullWidth label="Store ID" value={deliverySettings.ubereats?.storeId || ''} onChange={e => setUber('storeId', e.target.value)} />
              <FormControlLabel
                control={<Switch size="small" checked={!!deliverySettings.ubereats?.isSandbox} onChange={e => setUber('isSandbox', e.target.checked)} />}
                label="Sandbox Mode"
              />
            </Stack>
          </Box>

          {/* DoorDash */}
          <Box flex={1} sx={{ border: '1px solid', borderColor: deliverySettings.doordash?.enabled ? 'primary.main' : 'divider', borderRadius: 2, p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">DoorDash Drive</Typography>
              <FormControlLabel
                control={<Switch checked={!!deliverySettings.doordash?.enabled} onChange={e => setDoor('enabled', e.target.checked)} />}
                label={deliverySettings.doordash?.enabled ? 'Enabled' : 'Disabled'}
              />
            </Stack>
            <Stack spacing={2}>
              <TextField size="small" fullWidth label="Developer ID" value={deliverySettings.doordash?.developerId || ''} onChange={e => setDoor('developerId', e.target.value)} />
              <TextField size="small" fullWidth label="Key ID" value={deliverySettings.doordash?.keyId || ''} onChange={e => setDoor('keyId', e.target.value)} />
              <TextField size="small" fullWidth type={showDoorSecret ? 'text' : 'password'} label="Signing Secret" value={deliverySettings.doordash?.signingSecret || ''} onChange={e => setDoor('signingSecret', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowDoorSecret(!showDoorSecret)} size="small">{showDoorSecret ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}</IconButton></InputAdornment> }} />
              <FormControlLabel
                control={<Switch size="small" checked={!!deliverySettings.doordash?.isSandbox} onChange={e => setDoor('isSandbox', e.target.checked)} />}
                label="Sandbox Mode"
              />
            </Stack>
          </Box>
        </Stack>

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button
            variant="contained"
            startIcon={deliverySaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveDelivery}
            disabled={deliverySaving || deliveryLoading}
          >
            {deliverySaving ? 'Saving...' : 'Save Delivery Settings'}
          </Button>
        </Stack>

        {deliveryError && <Alert severity="error" sx={{ mt: 2 }}>{deliveryError}</Alert>}
        {deliveryInfo && <Alert severity="success" sx={{ mt: 2 }}>{deliveryInfo}</Alert>}
      </Card>
    </Box>
  );
};

export default TenantDetailsPage;
