import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, IconButton, Divider,
  TextField, Button, Alert, Chip, CircularProgress, Stack, Tooltip, Switch,
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
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import LinkIcon from '@mui/icons-material/Link';
import SaveIcon from '@mui/icons-material/Save';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
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

  // Global delivery platforms (read-only here â€” actual credentials are managed
  // once, globally, from the superadmin's own Profile page, not per-tenant).
  const [globalDeliverySettings, setGlobalDeliverySettings] = useState<any>(null);
  const [globalDeliveryLoading, setGlobalDeliveryLoading] = useState(false);

  useEffect(() => {
    setGlobalDeliveryLoading(true);
    superAPI.getGlobalDeliverySettings()
      .then(res => setGlobalDeliverySettings(res.data || {}))
      .catch(() => {})
      .finally(() => setGlobalDeliveryLoading(false));
  }, []);

  // Per-tenant allowed delivery services — which platforms this restaurant may use.
  // The tenant admin can then enable all or a subset of these from their Settings page.
  const [allowedServices, setAllowedServices] = useState<Record<string, boolean> | null>(null);
  const [allowedLoading, setAllowedLoading] = useState(false);
  const [allowedSaving, setAllowedSaving] = useState<string | null>(null);
  const [allowedError, setAllowedError] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    setAllowedLoading(true);
    superAPI.getTenantDeliveryServices(tenantId)
      .then(res => setAllowedServices(res.data?.allowedDeliveryServices || null))
      .catch(() => setAllowedError('Failed to load delivery services for this restaurant'))
      .finally(() => setAllowedLoading(false));
  }, [tenantId]);

  const handleToggleAllowedService = async (key: string, value: boolean) => {
    if (!tenantId || !allowedServices) return;
    const previous = allowedServices;
    setAllowedServices({ ...allowedServices, [key]: value });
    setAllowedSaving(key);
    setAllowedError('');
    try {
      const res = await superAPI.updateTenantDeliveryServices(tenantId, { [key]: value });
      setAllowedServices(res.data?.allowedDeliveryServices || { ...previous, [key]: value });
    } catch (err: any) {
      setAllowedServices(previous);
      setAllowedError(err?.response?.data?.message || 'Failed to update delivery service');
    } finally {
      setAllowedSaving(null);
    }
  };

  // Platform processing fee (superadmin-managed) state.
  // Slab model: `processingFee` ($) charged per `processingFeeOrderValue` ($)
  // of order subtotal, rounded up â€” e.g. $1 per $50 â†’ $150 order pays $3.
  const [processingFee, setProcessingFee] = useState<string>('');
  const [feeOrderValue, setFeeOrderValue] = useState<string>('');
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeError, setFeeError] = useState('');
  const [feeInfo, setFeeInfo] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    setFeeLoading(true);
    superAPI.getTenantProcessingFee(tenantId)
      .then(res => {
        setProcessingFee(String(res.data?.processingFee ?? ''));
        const slab = Number(res.data?.processingFeeOrderValue ?? 0);
        setFeeOrderValue(slab > 0 ? String(slab) : '');
      })
      .catch(() => {})
      .finally(() => setFeeLoading(false));
  }, [tenantId]);

  const handleSaveProcessingFee = async () => {
    if (!tenantId) return;
    const fee = parseFloat(processingFee);
    if (isNaN(fee) || fee < 0) {
      setFeeError('Enter a valid non-negative fee');
      setFeeInfo('');
      return;
    }
    const slab = feeOrderValue.trim() === '' ? 0 : parseFloat(feeOrderValue);
    if (isNaN(slab) || slab < 0) {
      setFeeError('Enter a valid non-negative order value per slab');
      setFeeInfo('');
      return;
    }
    setFeeSaving(true);
    setFeeError('');
    setFeeInfo('');
    try {
      await superAPI.updateTenantProcessingFee(tenantId, fee, slab);
      setFeeInfo('Processing fee updated.');
    } catch (err: any) {
      setFeeError(err?.response?.data?.message || 'Failed to update processing fee');
    } finally {
      setFeeSaving(false);
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
          Processing fee charged on this store's orders, per slab of order value â€”
          e.g. fee $1 per $50: orders up to $50 pay $1, up to $100 pay $2, up to $150 pay $3.
          Leave "Per Order Value" empty to charge the fee as a percent instead.
          Only superadmins can change it.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
          <TextField
            label="Processing Fee ($ per slab)"
            type="number"
            size="small"
            value={processingFee}
            onChange={(e) => { setProcessingFee(e.target.value); setFeeError(''); setFeeInfo(''); }}
            disabled={feeLoading}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ minWidth: 220 }}
          />
          <TextField
            label="Per Order Value ($)"
            type="number"
            size="small"
            value={feeOrderValue}
            onChange={(e) => { setFeeOrderValue(e.target.value); setFeeError(''); setFeeInfo(''); }}
            disabled={feeLoading}
            inputProps={{ min: 0, step: 1 }}
            helperText="e.g. 50 â€” fee is charged per $50 of order value"
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
              helperText="Stripe Dashboard â†’ Connect â†’ Accounts"
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

      {/* Delivery Services — per-tenant availability. The superadmin decides which
          platform delivery services this restaurant may use; the restaurant admin then
          enables all or a subset of them from their own Settings → Delivery tab.
          Credentials remain managed globally from the superadmin Profile page. */}
      <Card elevation={2} sx={{ borderRadius: 3, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <LocalShippingIcon sx={{ color: '#ed6c02', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Delivery Services</Typography>
          {(globalDeliveryLoading || allowedLoading) && <CircularProgress size={18} />}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Choose which delivery services this restaurant is allowed to use. The restaurant
          admin can then turn on all of them, or only the ones they want, from their Settings
          page. Platform credentials are managed globally in{' '}
          <Button
            variant="text"
            size="small"
            onClick={() => navigate('/superadmin/profile')}
            sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline', textTransform: 'none' }}
          >
            Profile
          </Button>
        </Typography>

        <Grid container spacing={2}>
          {([
            { key: 'doordash', label: 'DoorDash', globalKey: 'doordash' },
            { key: 'ubereats', label: 'Uber Direct', globalKey: 'ubereats' },
            { key: 'ubereatsMarketplace', label: 'Uber Eats Marketplace', globalKey: null },
            { key: 'grubhub', label: 'Grubhub', globalKey: 'grubhub' },
          ] as const).map(({ key, label, globalKey }) => {
            const allowed = !!allowedServices?.[key];
            const globallyConfigured = globalKey ? !!globalDeliverySettings?.[globalKey]?.enabled : null;
            return (
              <Grid xs={12} sm={6} key={key}>
                <Box
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    border: '1px solid', borderColor: allowed ? 'success.main' : 'divider',
                    borderRadius: 2, p: 2, height: '100%',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">{label}</Typography>
                    {globallyConfigured !== null && (
                      <Chip
                        size="small"
                        sx={{ mt: 0.5 }}
                        icon={globallyConfigured ? <CheckCircleIcon /> : <CancelIcon />}
                        label={globallyConfigured ? 'Platform credentials ready' : 'No platform credentials'}
                        color={globallyConfigured ? 'success' : 'default'}
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {allowedSaving === key && <CircularProgress size={16} />}
                    <Switch
                      checked={allowed}
                      onChange={(e) => handleToggleAllowedService(key, e.target.checked)}
                      disabled={allowedLoading || !allowedServices || allowedSaving !== null}
                      color="success"
                    />
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {allowedError && <Alert severity="error" sx={{ mt: 2 }}>{allowedError}</Alert>}
      </Card>
    </Box>
  );
};

export default TenantDetailsPage;
