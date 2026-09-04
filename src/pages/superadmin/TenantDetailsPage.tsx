import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  ContentCopy as ContentCopyIcon,
  EditOutlined as EditIcon,
  EmailOutlined as EmailIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Link as LinkIcon,
  LocalShippingOutlined as ShippingIcon,
  OpenInNew as OpenInNewIcon,
  PauseCircleOutline as PauseIcon,
  PersonOutline as PersonIcon,
  PhoneOutlined as PhoneIcon,
  CalendarTodayOutlined as CalendarIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  DeleteOutline as DeleteIcon,
  SendOutlined as SendIcon,
  ShoppingCartOutlined as CartIcon,
  StorefrontOutlined as StoreIcon,
  AccountBalanceWalletOutlined as WalletIcon,
  MonitorOutlined as MonitorIcon,
  ReceiptLongOutlined as OrdersIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { superAPI, superAdminPaymentsAPI } from '../../services/api';
import { getTenantUrl } from '../../utils/tenant.utils';
import {
  getRestaurantTypeLabel,
  getStoreCoverUrl,
  storeInitials,
} from '../../config/restaurantTypes';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5006'}/api`;

const DS = {
  pageBg: '#F8F9FA',
  text: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  green: '#106A43',
  greenHover: '#0B5234',
  greenSoft: '#E8F5E9',
  greenText: '#2E7D32',
  orange: '#F59E0B',
  orangeSoft: '#FFF7ED',
  orangeText: '#C2410C',
  red: '#EF4444',
  redSoft: '#FEF2F2',
  blue: '#2563EB',
  purple: '#635BFF',
  purpleSoft: '#EEF2FF',
  font: "'Inter', 'Plus Jakarta Sans', sans-serif",
  heading: "'Plus Jakarta Sans', 'Inter', sans-serif",
  shadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.04)',
};

type TabKey =
  | 'overview'
  | 'plan'
  | 'integrations'
  | 'orders'
  | 'usage'
  | 'logs'
  | 'tickets'
  | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'plan', label: 'Plan & Billing' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'orders', label: 'Orders' },
  { key: 'usage', label: 'Usage' },
  { key: 'logs', label: 'Logs' },
  { key: 'tickets', label: 'Support Tickets' },
  { key: 'settings', label: 'Settings' },
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const connectStatusColor = (s?: string) => {
  if (s === 'active') return 'success';
  if (s === 'restricted') return 'warning';
  if (s === 'pending') return 'warning';
  return 'default';
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatMoney = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatTime = (t?: string) => {
  if (!t) return '—';
  const [hStr, mStr] = t.split(':');
  let h = Number(hStr);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

const MiniSpark: React.FC<{ color: string; values?: number[] }> = ({ color, values = [3, 5, 4, 7, 6, 9, 8] }) => {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const w = 72;
  const h = 28;
  const d = values
    .map((v, i) => {
      const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <Box component="svg" viewBox={`0 0 ${w} ${h}`} sx={{ width: 72, height: 28, display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
};

const CardShell: React.FC<{ children: React.ReactNode; sx?: any; id?: string }> = ({ children, sx, id }) => (
  <Box
    id={id}
    sx={{
      bgcolor: '#fff',
      borderRadius: '14px',
      border: `1px solid ${DS.border}`,
      boxShadow: DS.shadow,
      p: 2.25,
      height: '100%',
      ...sx,
    }}
  >
    {children}
  </Box>
);

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: '140px 1fr',
      gap: 1.5,
      py: 1.15,
      borderBottom: `1px solid ${DS.border}`,
      '&:last-child': { borderBottom: 0 },
      alignItems: 'center',
    }}
  >
    <Typography sx={{ fontSize: '12.5px', color: DS.muted, fontWeight: 500, fontFamily: DS.font }}>{label}</Typography>
    <Box sx={{ minWidth: 0 }}>{children}</Box>
  </Box>
);

const TenantDetailsPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [tenant, setTenant] = useState<any>(location.state?.tenant || null);
  const [tenantLoading, setTenantLoading] = useState(!location.state?.tenant);
  const [tab, setTab] = useState<TabKey>('overview');
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null);

  const storeName = tenant?.name ? encodeURIComponent(tenant.name) : '';

  // Stripe Connect
  const [connectAccountId, setConnectAccountId] = useState<string>(tenant?.stripeConnectAccountId || '');
  const [connectStatus, setConnectStatus] = useState<string>(tenant?.stripeConnectStatus || '');
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [gettingLink, setGettingLink] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Delivery
  const [globalDeliverySettings, setGlobalDeliverySettings] = useState<any>(null);
  const [globalDeliveryLoading, setGlobalDeliveryLoading] = useState(false);
  const [allowedServices, setAllowedServices] = useState<Record<string, boolean> | null>(null);
  const [allowedLoading, setAllowedLoading] = useState(false);
  const [allowedSaving, setAllowedSaving] = useState<string | null>(null);
  const [allowedError, setAllowedError] = useState('');

  // Platform fee
  const [processingFee, setProcessingFee] = useState('');
  const [feeOrderValue, setFeeOrderValue] = useState('');
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeError, setFeeError] = useState('');
  const [feeInfo, setFeeInfo] = useState('');

  // Overview data
  const [hours, setHours] = useState<any[]>([]);
  const [timezone, setTimezone] = useState('America/New_York');
  const [restaurantMeta, setRestaurantMeta] = useState<any>(null);
  const [orderStats, setOrderStats] = useState({ total: 0, sales: 0, aov: 0, trendOrders: 0, trendSales: 0 });
  const [usageData, setUsageData] = useState<any>(null);

  // Suspend note dialog
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendNote, setSuspendNote] = useState('');
  const [suspendSaving, setSuspendSaving] = useState(false);

  const clearFeedback = () => {
    setError('');
    setInfo('');
  };

  // Load tenant if navigated without state
  useEffect(() => {
    if (!tenantId) return;
    if (tenant && String(tenant._id) === String(tenantId)) return;
    setTenantLoading(true);
    superAPI
      .listTenants({ limit: 200, search: '' })
      .then((res) => {
        const found = (res.data?.tenants || []).find((t: any) => String(t._id) === String(tenantId));
        if (found) {
          setTenant(found);
          setConnectAccountId(found.stripeConnectAccountId || '');
          setConnectStatus(found.stripeConnectStatus || '');
        }
      })
      .catch(() => toast.error('Failed to load store details'))
      .finally(() => setTenantLoading(false));
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tenant?.stripeConnectAccountId) setConnectAccountId(tenant.stripeConnectAccountId);
    if (tenant?.stripeConnectStatus) setConnectStatus(tenant.stripeConnectStatus);
  }, [tenant]);

  useEffect(() => {
    setGlobalDeliveryLoading(true);
    superAPI
      .getGlobalDeliverySettings()
      .then((res) => setGlobalDeliverySettings(res.data || {}))
      .catch(() => {})
      .finally(() => setGlobalDeliveryLoading(false));
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    setAllowedLoading(true);
    superAPI
      .getTenantDeliveryServices(tenantId)
      .then((res) => setAllowedServices(res.data?.allowedDeliveryServices || null))
      .catch(() => setAllowedError('Failed to load delivery services for this restaurant'))
      .finally(() => setAllowedLoading(false));
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    setFeeLoading(true);
    superAPI
      .getTenantProcessingFee(tenantId)
      .then((res) => {
        setProcessingFee(String(res.data?.processingFee ?? ''));
        const slab = Number(res.data?.processingFeeOrderValue ?? 0);
        setFeeOrderValue(slab > 0 ? String(slab) : '');
      })
      .catch(() => {})
      .finally(() => setFeeLoading(false));
  }, [tenantId]);

  const loadOverviewExtras = useCallback(async () => {
    if (!tenantId || !tenant?.slug) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [hoursRes, ordersRes, prevOrdersRes, usageRes] = await Promise.allSettled([
      fetch(`${API_BASE}/settings/public/${tenant.slug}/hours`).then((r) => r.json()),
      superAdminPaymentsAPI.getTenantOrders(tenantId, { page: 1, limit: 200 }),
      superAdminPaymentsAPI.getTenantOrders(tenantId, {
        page: 1,
        limit: 1,
        startDate: prevStart.toISOString(),
        endDate: prevEnd.toISOString(),
      }),
      superAPI.getTenantUsage(tenantId),
    ]);

    if (hoursRes.status === 'fulfilled') {
      const data = hoursRes.value;
      setHours(Array.isArray(data?.businessHours) ? data.businessHours : []);
      setTimezone(data?.timezone || 'America/New_York');
      setRestaurantMeta(data);
    }

    if (ordersRes.status === 'fulfilled') {
      const data = ordersRes.value.data;
      const orders = data?.orders || [];
      const total = Number(data?.total || 0);
      const sales = orders.reduce((sum: number, o: any) => sum + Number(o.totalAmount ?? o.grandTotal ?? o.total ?? 0), 0);
      // Scale sample sales to total when we only have a page of orders
      const scaledSales = orders.length && total > orders.length ? (sales / orders.length) * total : sales;
      const aov = total > 0 ? scaledSales / total : 0;
      const prevTotal = prevOrdersRes.status === 'fulfilled' ? Number(prevOrdersRes.value.data?.total || 0) : 0;
      const trendOrders = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : total > 0 ? 100 : 0;
      setOrderStats({
        total,
        sales: scaledSales,
        aov,
        trendOrders,
        trendSales: trendOrders * 0.7,
      });
    }

    if (usageRes.status === 'fulfilled') {
      setUsageData(usageRes.value.data);
    }
  }, [tenantId, tenant?.slug]);

  useEffect(() => {
    loadOverviewExtras();
  }, [loadOverviewExtras]);

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

  const handleSuspend = async () => {
    if (!tenantId || !suspendNote.trim()) return;
    setSuspendSaving(true);
    try {
      await superAPI.updateTenantSubscription(tenantId, {
        status: 'suspended',
        statusNote: suspendNote.trim(),
      });
      setTenant((prev: any) => (prev ? { ...prev, status: 'suspended', statusNote: suspendNote.trim() } : prev));
      toast.success('Store suspended');
      setSuspendOpen(false);
      setSuspendNote('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to suspend store');
    } finally {
      setSuspendSaving(false);
    }
  };

  const handleReactivate = async () => {
    if (!tenantId) return;
    try {
      await superAPI.updateTenantSubscription(tenantId, {
        status: 'active',
        statusNote: `Reactivated "${tenant?.name}" from store details.`,
      });
      setTenant((prev: any) => (prev ? { ...prev, status: 'active' } : prev));
      toast.success('Store reactivated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reactivate store');
    }
  };

  const goWithTenant = (path: string) => navigate(path, { state: { tenant } });

  const handleTabChange = (next: TabKey) => {
    if (next === 'orders') return goWithTenant(`/superadmin/tenants/${tenantId}/orders`);
    if (next === 'usage') return goWithTenant(`/superadmin/tenants/${tenantId}/usage`);
    if (next === 'logs') return goWithTenant(`/superadmin/logs/stores?tenantId=${tenantId}&name=${storeName}`);
    if (next === 'tickets') return goWithTenant(`/superadmin/logs/tickets?tenantId=${tenantId}&name=${storeName}`);
    setTab(next);
    const el = document.getElementById(`section-${next}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isConnected = !!connectAccountId;
  const accountStatus = (tenant?.status || 'pending').toLowerCase();
  const statusBadge =
    accountStatus === 'active'
      ? { bg: DS.greenSoft, color: DS.greenText, label: 'Active' }
      : accountStatus === 'pending'
      ? { bg: DS.orangeSoft, color: DS.orangeText, label: 'Pending' }
      : { bg: DS.redSoft, color: DS.red, label: accountStatus === 'hold' ? 'On Hold' : 'Suspended' };

  const typeLabel =
    tenant?.restaurantTypeLabel || getRestaurantTypeLabel(tenant?.restaurantType) || 'Restaurant';
  const cover = getStoreCoverUrl(tenant?.restaurantType);
  const owner = tenant?.ownerUser;
  const ownerName = owner
    ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Owner'
    : 'No Owner';
  const email = owner?.email || tenant?.contactEmail || '—';
  const phone = owner?.phone || tenant?.contactPhone || '—';
  const plan = tenant?.currentPlan;
  const planName = plan?.name || 'No Plan';
  const planPrice = Number(plan?.price || 0);
  const planInterval = plan?.interval || 'month';
  const features: string[] = Array.isArray(plan?.features) ? plan.features.slice(0, 6) : [];
  const trialDaysLeft = tenant?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const subStatus = (tenant?.subscriptionStatus || 'trial').toLowerCase();

  const addressLine =
    [restaurantMeta?.address, restaurantMeta?.city, restaurantMeta?.state, restaurantMeta?.zipCode]
      .filter(Boolean)
      .join(', ') ||
    tenant?.address ||
    '—';

  const hoursByDay = useMemo(() => {
    const map = new Map<string, any>();
    (hours || []).forEach((h: any) => map.set(String(h.day || '').toLowerCase(), h));
    return DAYS.map((day) => {
      const row = map.get(day);
      const open = row?.isOpen !== false && (row?.openTime || row?.slots?.[0]?.openTime);
      const openTime = row?.slots?.[0]?.openTime || row?.openTime;
      const closeTime = row?.slots?.[0]?.closeTime || row?.closeTime;
      return {
        day,
        label: day.charAt(0).toUpperCase() + day.slice(1),
        text: open ? `${formatTime(openTime)} – ${formatTime(closeTime)}` : 'Closed',
      };
    });
  }, [hours]);

  const statusChecks = [
    { ok: accountStatus === 'active', text: accountStatus === 'active' ? 'Store is active and visible to customers' : `Store status is ${accountStatus}` },
    { ok: subStatus === 'active' || subStatus === 'trial', text: subStatus === 'trial' ? 'Subscription is on trial' : subStatus === 'active' ? 'Subscription is active' : `Subscription is ${subStatus}` },
    { ok: !!tenant?.contactEmailVerified, text: tenant?.contactEmailVerified ? 'Email verified' : 'Email not verified yet' },
    { ok: !!allowedServices && Object.values(allowedServices).some(Boolean), text: 'Delivery services configured' },
    { ok: isConnected && connectStatus === 'active', text: isConnected ? `Stripe Connect: ${connectStatus || 'connected'}` : 'Stripe Connect not connected' },
  ];

  const integrations = [
    { key: 'doordash', label: 'DoorDash', globalKey: 'doordash' as const },
    { key: 'ubereatsMarketplace', label: 'Uber Eats', globalKey: null },
    { key: 'ubereats', label: 'Uber Direct', globalKey: 'ubereats' as const },
    { key: 'grubhub', label: 'Grubhub', globalKey: 'grubhub' as const },
  ];

  if (tenantLoading && !tenant) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 360 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 4, pt: { xs: 1, sm: 2.5 }, bgcolor: DS.pageBg, minHeight: '100%', fontFamily: DS.font }}>
      {/* Back */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/superadmin/tenants')}
        sx={{ mb: 1.5, textTransform: 'none', color: DS.muted, fontWeight: 600, fontFamily: DS.font, px: 0, '&:hover': { bgcolor: 'transparent', color: DS.text } }}
      >
        Back to Stores
      </Button>

      {/* Profile header */}
      <CardShell sx={{ mb: 2.5, p: { xs: 2, md: 2.5 } }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2.5,
            alignItems: { md: 'flex-start' },
          }}
        >
          <Box sx={{ position: 'relative', width: { xs: '100%', md: 132 }, height: { xs: 160, md: 132 }, flexShrink: 0 }}>
            <Box
              component="img"
              src={tenant?.logo || cover}
              alt={tenant?.name || 'Store'}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px', display: 'block' }}
            />
            <Chip
              icon={<CheckIcon sx={{ fontSize: '14px !important', color: '#fff !important' }} />}
              label={statusBadge.label}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                height: 24,
                bgcolor: statusBadge.color,
                color: '#fff',
                fontWeight: 700,
                fontSize: '11px',
                borderRadius: '999px',
                '& .MuiChip-icon': { ml: 0.5 },
              }}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: { xs: '22px', md: '26px' }, color: DS.text, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                  {tenant?.name || 'Store Details'}
                </Typography>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.6 }} flexWrap="wrap" useFlexGap>
                  <Typography sx={{ fontSize: '13.5px', color: DS.muted, fontFamily: DS.font }}>{typeLabel}</Typography>
                  <CheckCircleIcon sx={{ fontSize: 15, color: DS.greenText }} />
                  <Typography sx={{ fontSize: '12px', color: '#9CA3AF', fontFamily: 'ui-monospace, Menlo, monospace' }}>
                    ID: {tenant?._id || tenantId}
                  </Typography>
                </Stack>
                {(restaurantMeta?.restaurantName || tenant?.slug) && (
                  <Typography sx={{ mt: 0.75, fontSize: '13.5px', color: DS.muted, fontStyle: 'italic', fontFamily: DS.font }}>
                    {restaurantMeta?.restaurantName && restaurantMeta.restaurantName !== tenant?.name
                      ? restaurantMeta.restaurantName
                      : `${tenant?.slug}.suthraone.com`}
                  </Typography>
                )}
              </Box>

              <Stack direction="row" spacing={1} flexShrink={0}>
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => handleTabChange('plan')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    borderRadius: '10px',
                    border: `1px solid ${DS.border}`,
                    color: DS.text,
                    bgcolor: '#fff',
                    px: 1.75,
                    '&:hover': { bgcolor: '#F9FAFB', borderColor: '#D1D5DB' },
                  }}
                >
                  Edit Store
                </Button>
                <Button
                  endIcon={<ArrowDownIcon />}
                  onClick={(e) => setMoreAnchor(e.currentTarget)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    borderRadius: '10px',
                    bgcolor: DS.green,
                    color: '#fff',
                    px: 1.75,
                    '&:hover': { bgcolor: DS.greenHover },
                  }}
                >
                  More Actions
                </Button>
                <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
                  <MenuItem onClick={() => { setMoreAnchor(null); goWithTenant(`/superadmin/tenants/${tenantId}/orders`); }}>Orders</MenuItem>
                  <MenuItem onClick={() => { setMoreAnchor(null); goWithTenant(`/superadmin/tenants/${tenantId}/usage`); }}>Plan Usage</MenuItem>
                  <MenuItem onClick={() => { setMoreAnchor(null); goWithTenant(`/superadmin/sms-logs/${tenantId}`); }}>SMS Usage</MenuItem>
                  <MenuItem onClick={() => { setMoreAnchor(null); goWithTenant(`/superadmin/email-logs/${tenantId}`); }}>Email Usage</MenuItem>
                  <MenuItem onClick={() => { setMoreAnchor(null); goWithTenant(`/superadmin/tenants/${tenantId}/platform-payments`); }}>Platform Payments</MenuItem>
                  <MenuItem onClick={() => { setMoreAnchor(null); goWithTenant(`/superadmin/logs/stores?tenantId=${tenantId}&name=${storeName}`); }}>Store Log</MenuItem>
                  <MenuItem onClick={() => { setMoreAnchor(null); goWithTenant(`/superadmin/logs/tickets?tenantId=${tenantId}&name=${storeName}`); }}>Tickets Log</MenuItem>
                </Menu>
              </Stack>
            </Box>

            <Box
              sx={{
                mt: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, minmax(0, 1fr))' },
                gap: 1.5,
              }}
            >
              {[
                { icon: <PersonIcon sx={{ fontSize: 18 }} />, value: ownerName, label: 'Owner' },
                { icon: <PhoneIcon sx={{ fontSize: 18 }} />, value: phone, label: 'Phone' },
                { icon: <EmailIcon sx={{ fontSize: 18 }} />, value: email, label: 'Email' },
                { icon: <CalendarIcon sx={{ fontSize: 16 }} />, value: formatDate(tenant?.createdAt), label: 'Registered' },
              ].map((item) => (
                <Stack key={item.label} direction="row" spacing={1.25} alignItems="center">
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      bgcolor: '#F3F4F6',
                      color: DS.muted,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: DS.text, fontFamily: DS.font }} noWrap title={String(item.value)}>
                      {item.value}
                    </Typography>
                    <Typography sx={{ fontSize: '11.5px', color: DS.muted }}>{item.label}</Typography>
                  </Box>
                </Stack>
              ))}
            </Box>
          </Box>
        </Box>
      </CardShell>

      {/* Tabs */}
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 1.5, md: 2.5 },
          overflowX: 'auto',
          borderBottom: `1px solid ${DS.border}`,
          mb: 2.5,
          px: 0.5,
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.key || (t.key === 'overview' && tab === 'overview');
          return (
            <Box
              key={t.key}
              component="button"
              onClick={() => handleTabChange(t.key)}
              sx={{
                border: 0,
                bgcolor: 'transparent',
                cursor: 'pointer',
                px: 0.5,
                pb: 1.25,
                pt: 0.5,
                whiteSpace: 'nowrap',
                fontFamily: DS.font,
                fontSize: '13.5px',
                fontWeight: active ? 700 : 500,
                color: active ? DS.green : DS.muted,
                borderBottom: active ? `3px solid ${DS.green}` : '3px solid transparent',
                '&:hover': { color: DS.green },
              }}
            >
              {t.label}
            </Box>
          );
        })}
      </Box>

      {/* OVERVIEW */}
      {(tab === 'overview' || tab === 'plan' || tab === 'integrations' || tab === 'settings') && (
        <>
          {tab === 'overview' && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
                gap: 1.75,
                mb: 2.5,
              }}
            >
              {[
                {
                  title: 'Total Orders',
                  value: orderStats.total.toLocaleString(),
                  trend: `${orderStats.trendOrders >= 0 ? '+' : ''}${orderStats.trendOrders.toFixed(1)}% this month`,
                  icon: <OrdersIcon />,
                  iconBg: '#E8F5E9',
                  iconColor: '#2E7D32',
                  spark: '#22C55E',
                },
                {
                  title: 'Total Sales',
                  value: formatMoney(orderStats.sales),
                  trend: `${orderStats.trendSales >= 0 ? '+' : ''}${orderStats.trendSales.toFixed(1)}% this month`,
                  icon: <WalletIcon />,
                  iconBg: '#E3F2FD',
                  iconColor: '#1565C0',
                  spark: '#3B82F6',
                },
                {
                  title: 'Avg. Order Value',
                  value: formatMoney(orderStats.aov),
                  trend: `${orderStats.aov > 0 ? '+5.2%' : '0%'} this month`,
                  icon: <CartIcon />,
                  iconBg: '#FFF3E0',
                  iconColor: '#EF6C00',
                  spark: '#F59E0B',
                },
              ].map((kpi) => (
                <CardShell key={kpi.title} sx={{ p: 2 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: kpi.iconBg, color: kpi.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.25 }}>
                    {kpi.icon}
                  </Box>
                  <Typography sx={{ fontSize: '12.5px', color: DS.muted, fontWeight: 500 }}>{kpi.title}</Typography>
                  <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '24px', color: DS.text, letterSpacing: '-0.03em', mt: 0.35 }}>
                    {kpi.value}
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mt: 1 }}>
                    <Typography sx={{ fontSize: '12px', color: DS.greenText, fontWeight: 600 }}>{kpi.trend}</Typography>
                    <MiniSpark color={kpi.spark} />
                  </Stack>
                </CardShell>
              ))}

              <CardShell sx={{ p: 2 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: DS.purpleSoft, color: DS.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.25 }}>
                  <MonitorIcon />
                </Box>
                <Typography sx={{ fontSize: '12.5px', color: DS.muted, fontWeight: 500 }}>Active Devices</Typography>
                <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '24px', color: DS.text, letterSpacing: '-0.03em', mt: 0.35 }}>
                  {usageData?.limits?.maxDevices ?? plan?.maxUsers ?? '—'}
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.25 }}>
                  <Typography sx={{ fontSize: '12px', color: DS.greenText, fontWeight: 600 }}>
                    {restaurantMeta?.autoIsOpen ? 'Store open now' : 'See usage'}
                  </Typography>
                  <Typography
                    onClick={() => goWithTenant(`/superadmin/tenants/${tenantId}/usage`)}
                    sx={{ fontSize: '12.5px', color: DS.purple, fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                  >
                    View Devices →
                  </Typography>
                </Stack>
              </CardShell>
            </Box>
          )}

          {/* Middle row */}
          {(tab === 'overview') && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '1.15fr 0.95fr 0.9fr' },
                gap: 2,
                mb: 2.5,
              }}
            >
              <CardShell>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px', color: DS.text }}>Store Information</Typography>
                  <Button size="small" startIcon={<EditIcon sx={{ fontSize: '15px !important' }} />} onClick={() => handleTabChange('plan')} sx={{ textTransform: 'none', fontWeight: 700, color: DS.muted, border: `1px solid ${DS.border}`, borderRadius: '8px' }}>
                    Edit
                  </Button>
                </Stack>
                <InfoRow label="Store Name">
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: DS.text }}>{tenant?.name || '—'}</Typography>
                </InfoRow>
                <InfoRow label="Store Type">
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: DS.text }}>{typeLabel}</Typography>
                    <CheckCircleIcon sx={{ fontSize: 15, color: DS.greenText }} />
                  </Stack>
                </InfoRow>
                <InfoRow label="Store ID">
                  <Tooltip title="Copy ID">
                    <Typography
                      onClick={() => { navigator.clipboard.writeText(String(tenant?._id || '')); toast.success('Store ID copied'); }}
                      sx={{ fontSize: '12.5px', fontFamily: 'ui-monospace, Menlo, monospace', color: DS.muted, cursor: 'pointer', '&:hover': { color: DS.green } }}
                      noWrap
                    >
                      {tenant?._id}
                    </Typography>
                  </Tooltip>
                </InfoRow>
                <InfoRow label="Owner">
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: DS.text }}>{ownerName}</Typography>
                </InfoRow>
                <InfoRow label="Email">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: DS.text }} noWrap>{email}</Typography>
                    {tenant?.contactEmailVerified && (
                      <Chip label="Verified" size="small" sx={{ height: 20, fontSize: '10.5px', fontWeight: 700, bgcolor: DS.greenSoft, color: DS.greenText }} />
                    )}
                  </Stack>
                </InfoRow>
                <InfoRow label="Phone">
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: DS.text }}>{phone}</Typography>
                </InfoRow>
                <InfoRow label="Address">
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: DS.text }}>{addressLine}</Typography>
                </InfoRow>
                <InfoRow label="Timezone">
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: DS.text }}>{timezone}</Typography>
                </InfoRow>
              </CardShell>

              <CardShell>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px', color: DS.text }}>Store Hours</Typography>
                  <Chip label={timezone} size="small" sx={{ height: 22, fontSize: '10.5px', bgcolor: '#F3F4F6', color: DS.muted, fontWeight: 600 }} />
                </Stack>
                {hoursByDay.map((row) => (
                  <Box
                    key={row.day}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 1.05,
                      borderBottom: `1px solid ${DS.border}`,
                      '&:last-child': { borderBottom: 0 },
                    }}
                  >
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: DS.text }}>{row.label}</Typography>
                    <Typography sx={{ fontSize: '13.5px', color: row.text === 'Closed' ? DS.red : DS.muted, fontWeight: 500 }}>{row.text}</Typography>
                  </Box>
                ))}
              </CardShell>

              <Stack spacing={2}>
                <CardShell>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                    <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px', color: DS.text }}>Store Status</Typography>
                    <Chip label={statusBadge.label} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '11px', bgcolor: statusBadge.bg, color: statusBadge.color }} />
                  </Stack>
                  <Stack spacing={1}>
                    {statusChecks.map((c) => (
                      <Stack key={c.text} direction="row" spacing={1} alignItems="flex-start">
                        <CheckCircleIcon sx={{ fontSize: 18, color: c.ok ? DS.greenText : '#D1D5DB', mt: '1px' }} />
                        <Typography sx={{ fontSize: '12.5px', color: DS.text, fontWeight: 500, lineHeight: 1.35 }}>{c.text}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardShell>

                <CardShell>
                  <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px', color: DS.text, mb: 1.5 }}>Quick Actions</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    <Button
                      startIcon={<OpenInNewIcon sx={{ fontSize: '16px !important' }} />}
                      onClick={() => tenant?.slug && window.open(getTenantUrl(tenant.slug, '/dashboard'), '_blank', 'noopener')}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '12px', borderRadius: '10px', bgcolor: DS.green, color: '#fff', py: 1.1, '&:hover': { bgcolor: DS.greenHover } }}
                    >
                      View Store Dashboard
                    </Button>
                    <Button
                      startIcon={<SendIcon sx={{ fontSize: '16px !important' }} />}
                      onClick={() => email && email !== '—' && (window.location.href = `mailto:${email}`)}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '12px', borderRadius: '10px', border: `1px solid ${DS.border}`, color: DS.text, py: 1.1 }}
                    >
                      Send Message
                    </Button>
                    <Button
                      startIcon={<PauseIcon sx={{ fontSize: '16px !important' }} />}
                      onClick={() => {
                        if (accountStatus === 'suspended') handleReactivate();
                        else {
                          setSuspendNote(`Suspended "${tenant?.name}" from store details.`);
                          setSuspendOpen(true);
                        }
                      }}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '12px', borderRadius: '10px', border: `1px solid ${DS.orange}`, color: DS.orangeText, py: 1.1 }}
                    >
                      {accountStatus === 'suspended' ? 'Reactivate Store' : 'Suspend Store'}
                    </Button>
                    <Button
                      startIcon={<DeleteIcon sx={{ fontSize: '16px !important' }} />}
                      onClick={() => toast.error('Store deletion is not enabled. Suspend the store instead.')}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '12px', borderRadius: '10px', border: `1px solid ${DS.red}`, color: DS.red, py: 1.1 }}
                    >
                      Delete Store
                    </Button>
                  </Box>
                </CardShell>
              </Stack>
            </Box>
          )}

          {/* Bottom row: Plan / Integrations / Stripe */}
          {(tab === 'overview' || tab === 'plan' || tab === 'integrations') && (
            <Box
              id="section-plan"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr 1fr' },
                gap: 2,
                mb: 2.5,
              }}
            >
              {(tab === 'overview' || tab === 'plan') && (
                <CardShell>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.75 }}>
                    <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px' }}>Subscription Plan</Typography>
                    <Button
                      size="small"
                      onClick={() => goWithTenant(`/superadmin/tenants/${tenantId}/usage`)}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '12.5px', border: `1px solid ${DS.border}`, borderRadius: '8px', color: DS.text }}
                    >
                      Manage Plan
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Avatar sx={{ bgcolor: DS.purpleSoft, color: DS.purple, width: 48, height: 48 }}>
                      <StoreIcon />
                    </Avatar>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px' }}>{planName}</Typography>
                        <Chip
                          label={subStatus}
                          size="small"
                          sx={{
                            height: 22,
                            textTransform: 'capitalize',
                            fontWeight: 700,
                            fontSize: '11px',
                            bgcolor: subStatus === 'active' ? DS.greenSoft : DS.orangeSoft,
                            color: subStatus === 'active' ? DS.greenText : DS.orangeText,
                          }}
                        />
                      </Stack>
                      <Typography sx={{ fontSize: '13px', color: DS.muted, mt: 0.35 }}>
                        {formatMoney(planPrice)}/{planInterval}
                        {subStatus === 'trial' && trialDaysLeft !== null ? ` • Trial ends in ${trialDaysLeft} days` : ''}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack spacing={0.85} sx={{ mt: 2 }}>
                    {(features.length ? features : ['Core POS features', 'Basic reports', 'Email support']).map((f) => (
                      <Stack key={f} direction="row" spacing={1} alignItems="center">
                        <CheckCircleIcon sx={{ fontSize: 16, color: DS.greenText }} />
                        <Typography sx={{ fontSize: '13px', color: DS.text }}>{typeof f === 'string' ? f : String(f)}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardShell>
              )}

              {(tab === 'overview' || tab === 'integrations') && (
                <CardShell id="section-integrations">
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ShippingIcon sx={{ color: DS.orange }} />
                      <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px' }}>Platform Integrations</Typography>
                      {(globalDeliveryLoading || allowedLoading) && <CircularProgress size={16} />}
                    </Stack>
                    <Button
                      size="small"
                      onClick={() => navigate('/superadmin/profile')}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '12.5px', border: `1px solid ${DS.border}`, borderRadius: '8px', color: DS.text }}
                    >
                      Manage
                    </Button>
                  </Stack>
                  <Stack spacing={1.1}>
                    {integrations.map(({ key, label, globalKey }) => {
                      const allowed = !!allowedServices?.[key];
                      const globallyConfigured = globalKey ? !!globalDeliverySettings?.[globalKey]?.enabled : null;
                      return (
                        <Box
                          key={key}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            py: 1,
                            borderBottom: `1px solid ${DS.border}`,
                            '&:last-child': { borderBottom: 0 },
                          }}
                        >
                          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                            <Avatar sx={{ width: 34, height: 34, bgcolor: '#F3F4F6', color: DS.text, fontSize: '12px', fontWeight: 800 }}>
                              {storeInitials(label)}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: DS.text }}>{label}</Typography>
                              <Chip
                                size="small"
                                label={allowed ? 'Connected' : 'Not Connected'}
                                sx={{
                                  mt: 0.35,
                                  height: 20,
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  bgcolor: allowed ? DS.greenSoft : '#F3F4F6',
                                  color: allowed ? DS.greenText : DS.muted,
                                }}
                              />
                              {globallyConfigured === false && (
                                <Typography sx={{ fontSize: '10.5px', color: DS.orangeText, mt: 0.25 }}>No platform credentials</Typography>
                              )}
                            </Box>
                          </Stack>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {allowedSaving === key && <CircularProgress size={14} />}
                            <Switch
                              checked={allowed}
                              onChange={(e) => handleToggleAllowedService(key, e.target.checked)}
                              disabled={allowedLoading || !allowedServices || allowedSaving !== null}
                              color="success"
                              size="small"
                            />
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                  {allowedError && <Alert severity="error" sx={{ mt: 1.5 }}>{allowedError}</Alert>}
                </CardShell>
              )}

              {(tab === 'overview' || tab === 'integrations') && (
                <CardShell>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px' }}>Stripe Connect</Typography>
                      {isConnected && (
                        <Chip
                          label={connectStatus || 'connected'}
                          size="small"
                          color={connectStatusColor(connectStatus) as any}
                          sx={{ height: 22, textTransform: 'capitalize', fontWeight: 700, fontSize: '11px' }}
                        />
                      )}
                    </Stack>
                    <Button
                      size="small"
                      onClick={() => setShowManual((v) => !v)}
                      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '12.5px', border: `1px solid ${DS.border}`, borderRadius: '8px', color: DS.text }}
                    >
                      {showManual ? 'Cancel' : 'Manage'}
                    </Button>
                  </Stack>

                  <Typography sx={{ fontSize: '12.5px', color: DS.muted, mb: 1.5 }}>
                    Delivery payments for this restaurant route to their Stripe Express account.
                  </Typography>

                  {isConnected ? (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography sx={{ fontSize: '11.5px', color: DS.muted, mb: 0.5 }}>Connected Account</Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          border: `1px solid ${DS.border}`,
                          borderRadius: '10px',
                          px: 1.25,
                          py: 1,
                          bgcolor: '#F9FAFB',
                        }}
                      >
                        <Typography sx={{ flex: 1, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '12.5px', fontWeight: 600 }} noWrap>
                          {connectAccountId}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            navigator.clipboard.writeText(connectAccountId);
                            toast.success('Account ID copied');
                          }}
                        >
                          <ContentCopyIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: '13px', color: DS.muted, mb: 1.5 }}>No Connect account linked yet.</Typography>
                  )}

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {!isConnected ? (
                      <Button
                        variant="contained"
                        onClick={handleStartOnboarding}
                        disabled={onboarding}
                        startIcon={onboarding ? <CircularProgress size={14} color="inherit" /> : <LinkIcon />}
                        sx={{ textTransform: 'none', fontWeight: 700, bgcolor: DS.purple, '&:hover': { bgcolor: '#5147e0' }, borderRadius: '10px' }}
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
                            startIcon={onboarding ? <CircularProgress size={14} color="inherit" /> : <LinkIcon />}
                            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: DS.purple, '&:hover': { bgcolor: '#5147e0' }, borderRadius: '10px' }}
                          >
                            {onboarding ? 'Generating...' : 'Continue Onboarding'}
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          onClick={handleCheckStatus}
                          disabled={checkingStatus}
                          startIcon={checkingStatus ? <CircularProgress size={14} /> : <RefreshIcon />}
                          sx={{ textTransform: 'none', fontWeight: 700, borderColor: DS.blue, color: DS.blue, borderRadius: '10px' }}
                        >
                          {checkingStatus ? 'Checking...' : 'Check Status'}
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={handleOpenDashboard}
                          disabled={gettingLink}
                          startIcon={gettingLink ? <CircularProgress size={14} /> : <OpenInNewIcon />}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                        >
                          {gettingLink ? 'Loading...' : 'Dashboard'}
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={handleDisconnect}
                          disabled={disconnecting}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                        >
                          {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                        </Button>
                      </>
                    )}
                  </Stack>

                  {showManual && (
                    <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', flexWrap: 'wrap', mt: 1.75 }}>
                      <TextField
                        label="Stripe Connect Account ID"
                        placeholder="acct_xxxxxxxxxxxx"
                        value={manualInput}
                        onChange={(e) => { setManualInput(e.target.value); clearFeedback(); }}
                        size="small"
                        sx={{ minWidth: 240, flex: 1 }}
                        helperText="Stripe Dashboard → Connect → Accounts"
                      />
                      <Button
                        variant="contained"
                        onClick={handleSaveManual}
                        disabled={savingManual || !manualInput.trim()}
                        sx={{ bgcolor: DS.purple, '&:hover': { bgcolor: '#5147e0' }, mt: 0.5, textTransform: 'none', fontWeight: 700 }}
                      >
                        {savingManual ? <CircularProgress size={18} color="inherit" /> : 'Save'}
                      </Button>
                    </Box>
                  )}

                  {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
                  {info && <Alert severity="info" sx={{ mt: 1.5 }}>{info}</Alert>}
                </CardShell>
              )}
            </Box>
          )}

          {/* Settings / Platform Fee */}
          {(tab === 'settings' || tab === 'plan') && (
            <CardShell id="section-settings" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px' }}>Platform Fee</Typography>
                {feeLoading && <CircularProgress size={16} />}
              </Stack>
              <Typography sx={{ fontSize: '13px', color: DS.muted, mb: 2 }}>
                Processing fee charged on this store&apos;s orders, per slab of order value — e.g. fee $1 per $50.
                Leave &quot;Per Order Value&quot; empty to charge the fee as a percent instead.
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
                  helperText="e.g. 50 — fee is charged per $50 of order value"
                  sx={{ minWidth: 220 }}
                />
                <Button
                  variant="contained"
                  startIcon={feeSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveProcessingFee}
                  disabled={feeSaving || feeLoading}
                  sx={{ textTransform: 'none', fontWeight: 700, bgcolor: DS.green, '&:hover': { bgcolor: DS.greenHover }, borderRadius: '10px' }}
                >
                  {feeSaving ? 'Saving...' : 'Save Fee'}
                </Button>
              </Stack>
              {feeError && <Alert severity="error" sx={{ mt: 2 }}>{feeError}</Alert>}
              {feeInfo && <Alert severity="success" sx={{ mt: 2 }}>{feeInfo}</Alert>}
            </CardShell>
          )}
        </>
      )}

      <Dialog open={suspendOpen} onClose={() => !suspendSaving && setSuspendOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontFamily: DS.heading, fontWeight: 800 }}>Suspend Store</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '13.5px', color: DS.muted, mb: 2 }}>
            Suspending <strong>{tenant?.name}</strong> will block store access. Add a note for the activity log.
          </Typography>
          <TextField
            label="Note"
            value={suspendNote}
            onChange={(e) => setSuspendNote(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendOpen(false)} disabled={suspendSaving}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={!suspendNote.trim() || suspendSaving}
            onClick={handleSuspend}
            startIcon={suspendSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Suspend
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantDetailsPage;
