import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  TablePagination,
  Stack,
  Menu,
  Tooltip,
  InputAdornment,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  Edit as EditIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  StorefrontOutlined,
  WavesOutlined,
  PendingActionsOutlined,
  CampaignOutlined,
  AccessTimeOutlined,
  PersonOutline,
  EmailOutlined,
  PhoneOutlined,
  RefreshOutlined,
  CalendarMonthOutlined,
  GridViewRounded,
  ViewListRounded,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import { superAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { CardGridSkeleton } from '../../components/common/PageSkeleton';
import {
  RESTAURANT_TYPES,
  getRestaurantTypeLabel,
  getStoreCoverUrl,
  storeInitials,
} from '../../config/restaurantTypes';

const DS = {
  pageBg: '#F8F9FA',
  text: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  green: '#063D2B',
  greenHover: '#042819',
  font: "'Inter', 'Plus Jakarta Sans', sans-serif",
  heading: "'Plus Jakarta Sans', 'Inter', sans-serif",
  cardShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.04)',
};

const ACCOUNT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending Approval' },
  { value: 'active', label: 'Active / Approved' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'hold', label: 'On Hold' },
];

const statusBadgeSx = (status?: string) => {
  const s = (status || 'pending').toLowerCase();
  if (s === 'active') return { bg: '#E8F5E9', color: '#2E7D32', label: 'Active' };
  if (s === 'pending') return { bg: '#FFF3E0', color: '#EF6C00', label: 'Pending' };
  if (s === 'suspended' || s === 'hold') return { bg: '#FFEBEE', color: '#C62828', label: s === 'hold' ? 'On Hold' : 'Suspended' };
  return { bg: '#F3F4F6', color: '#4B5563', label: s };
};

const subBadgeSx = (status?: string) => {
  const s = (status || 'trial').toLowerCase();
  if (s === 'active') return { bg: '#E8F5E9', color: '#2E7D32' };
  if (s === 'expired' || s === 'cancelled') return { bg: '#FFEBEE', color: '#C62828' };
  return { bg: '#FFF3E0', color: '#EF6C00' };
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const KpiCard: React.FC<{
  value: number | string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}> = ({ value, label, icon, iconBg, iconColor }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      borderRadius: '14px',
      bgcolor: '#fff',
      border: `1px solid ${DS.border}`,
      boxShadow: DS.cardShadow,
      display: 'flex',
      alignItems: 'center',
      gap: 1.75,
      height: '100%',
      minHeight: 88,
    }}
  >
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: '12px',
        bgcolor: iconBg,
        color: iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '22px', color: DS.text, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
        {value}
      </Typography>
      <Typography sx={{ fontFamily: DS.font, fontSize: '12.5px', color: DS.muted, fontWeight: 500, mt: 0.35 }} noWrap>
        {label}
      </Typography>
    </Box>
  </Paper>
);

const filterSelectSx = {
  height: 42,
  borderRadius: '10px',
  bgcolor: '#fff',
  fontFamily: DS.font,
  fontSize: '13.5px',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: DS.border },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D1D5DB' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: DS.green, borderWidth: '1.5px' },
};

const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [totalTenants, setTotalTenants] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, suspended: 0, expired: 0 });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    subscriptionStatus: '',
    trialEndsAt: '',
    subscriptionEndsAt: '',
    autoRenew: true,
    currentPlan: '',
    status: '',
    notes: '',
  });
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [statusMenuTenant, setStatusMenuTenant] = useState<any | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteTenant, setNoteTenant] = useState<any | null>(null);
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const getDefaultStatusNote = (tenantName: string, fromStatus: string, toStatus: string): string => {
    const from = fromStatus || 'pending';
    if (toStatus === 'active') {
      return from === 'pending'
        ? `Approved "${tenantName}" after review — account activated.`
        : `Reactivated "${tenantName}" — account set back to active.`;
    }
    if (toStatus === 'suspended') return `Suspended "${tenantName}" account.`;
    if (toStatus === 'hold') return `Placed "${tenantName}" account on hold pending further review.`;
    if (toStatus === 'pending') return `Reverted "${tenantName}" account to pending approval.`;
    return `Changed "${tenantName}" status from ${from} to ${toStatus}.`;
  };

  const registrationRange = useMemo(() => {
    if (!datePreset) return { registeredFrom: undefined as string | undefined, registeredTo: undefined as string | undefined };
    const now = new Date();
    const end = now.toISOString();
    if (datePreset === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { registeredFrom: start.toISOString(), registeredTo: end };
    }
    if (datePreset === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { registeredFrom: start.toISOString(), registeredTo: end };
    }
    if (datePreset === 'month') {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return { registeredFrom: start.toISOString(), registeredTo: end };
    }
    if (datePreset === 'year') {
      const start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      return { registeredFrom: start.toISOString(), registeredTo: end };
    }
    return { registeredFrom: undefined, registeredTo: undefined };
  }, [datePreset]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const fetchStats = useCallback(async () => {
    try {
      const [totalRes, activeRes, pendingRes, suspendedRes, expiredRes] = await Promise.all([
        superAPI.listTenants({ limit: 1 }),
        superAPI.listTenants({ status: 'active', limit: 1 }),
        superAPI.listTenants({ status: 'pending', limit: 1 }),
        superAPI.listTenants({ status: 'suspended', limit: 1 }),
        superAPI.listTenants({ status: 'expired', limit: 1 }),
      ]);
      setStats({
        total: totalRes.data.total || 0,
        active: activeRes.data.total || 0,
        pending: pendingRes.data.total || 0,
        suspended: suspendedRes.data.total || 0,
        expired: expiredRes.data.total || 0,
      });
    } catch {
      /* non-blocking */
    }
  }, []);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
        status: statusFilter || undefined,
        planId: planFilter || undefined,
        restaurantType: typeFilter || undefined,
        registeredFrom: registrationRange.registeredFrom,
        registeredTo: registrationRange.registeredTo,
      };
      const [tenantsRes, plansRes] = await Promise.all([
        superAPI.listTenants(params),
        plans.length ? Promise.resolve({ data: plans }) : superAPI.listPlansPublic(),
      ]);
      setTenants(tenantsRes.data.tenants || []);
      setTotalTenants(tenantsRes.data.total || 0);
      if (!plans.length) setPlans(plansRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, planFilter, typeFilter, registrationRange, plans.length]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setPlanFilter('');
    setTypeFilter('');
    setDatePreset('');
    setPage(0);
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEditClick = (tenant: any) => {
    setSelectedTenant(tenant);
    setEditForm({
      subscriptionStatus: tenant.subscriptionStatus,
      trialEndsAt: tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toISOString().split('T')[0] : '',
      subscriptionEndsAt: tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt).toISOString().split('T')[0] : '',
      autoRenew: tenant.autoRenew,
      currentPlan: tenant.currentPlan?._id || '',
      status: tenant.status || 'pending',
      notes: '',
    });
    setEditDialogOpen(true);
  };

  const handleStatusChipClick = (e: React.MouseEvent<HTMLElement>, tenant: any) => {
    e.stopPropagation();
    setStatusMenuTenant(tenant);
    setStatusMenuAnchor(e.currentTarget);
  };

  const handleStatusMenuClose = () => {
    setStatusMenuAnchor(null);
    setStatusMenuTenant(null);
  };

  const handleStatusSelect = (newStatus: string) => {
    const tenant = statusMenuTenant;
    handleStatusMenuClose();
    if (!tenant || newStatus === (tenant.status || 'pending')) return;
    setNoteTenant(tenant);
    setPendingStatus(newStatus);
    setStatusNote(getDefaultStatusNote(tenant.name, tenant.status, newStatus));
    setNoteDialogOpen(true);
  };

  const closeNoteDialog = () => {
    setNoteDialogOpen(false);
    setNoteTenant(null);
    setPendingStatus('');
    setStatusNote('');
  };

  const confirmStatusUpdate = async () => {
    if (!noteTenant || !statusNote.trim()) return;
    const tenant = noteTenant;
    try {
      setUpdatingStatusId(tenant._id);
      await superAPI.updateTenantSubscription(tenant._id, { status: pendingStatus, statusNote: statusNote.trim() });
      toast.success(`Account status updated to "${pendingStatus}"`);
      closeNoteDialog();
      fetchTenants();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update account status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTenant) return;
    if (!editForm.notes.trim()) {
      toast.error('Please add a note explaining this subscription change');
      return;
    }
    try {
      await superAPI.updateTenantSubscription(selectedTenant._id, editForm);
      toast.success('Tenant updated successfully');
      setEditDialogOpen(false);
      fetchTenants();
      fetchStats();
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Failed to update tenant');
    }
  };

  const ownerName = (tenant: any) => {
    if (!tenant.ownerUser) return 'No Owner';
    return `${tenant.ownerUser.firstName || ''} ${tenant.ownerUser.lastName || ''}`.trim() || 'Owner';
  };

  const typeLabel = (tenant: any) =>
    tenant.restaurantTypeLabel || getRestaurantTypeLabel(tenant.restaurantType) || 'Restaurant';

  const renderStoreCard = (tenant: any) => {
    const badge = statusBadgeSx(tenant.status);
    const sub = subBadgeSx(tenant.subscriptionStatus);
    const cover = getStoreCoverUrl(tenant.restaurantType);
    const initials = storeInitials(tenant.name);

    return (
      <Paper
        key={tenant._id}
        elevation={0}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          bgcolor: '#fff',
          border: `1px solid ${DS.border}`,
          boxShadow: DS.cardShadow,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 12px 32px rgba(15,23,42,0.08)',
          },
        }}
      >
        <Box sx={{ position: 'relative', height: 128, flexShrink: 0 }}>
          <Box
            component="img"
            src={cover}
            alt={typeLabel(tenant)}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <Chip
            label={badge.label}
            size="small"
            clickable
            disabled={updatingStatusId === tenant._id}
            onClick={(e) => handleStatusChipClick(e, tenant)}
            onDelete={(e) => handleStatusChipClick(e as any, tenant)}
            deleteIcon={<ArrowDropDownIcon sx={{ color: `${badge.color} !important`, fontSize: '18px !important' }} />}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              height: 24,
              fontWeight: 700,
              fontSize: '11px',
              bgcolor: badge.bg,
              color: badge.color,
              borderRadius: '999px',
              fontFamily: DS.font,
              '& .MuiChip-label': { px: 1 },
            }}
          />
          <Avatar
            src={tenant.logo || undefined}
            sx={{
              position: 'absolute',
              left: 16,
              bottom: -22,
              width: 52,
              height: 52,
              border: '3px solid #fff',
              bgcolor: DS.green,
              fontFamily: DS.heading,
              fontWeight: 800,
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(15,23,42,0.12)',
            }}
          >
            {initials}
          </Avatar>
        </Box>

        <Box sx={{ px: 2, pt: 3.5, pb: 1.25, flexGrow: 1 }}>
          <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '15.5px', color: DS.text, lineHeight: 1.25 }} noWrap title={tenant.name}>
            {tenant.name}
          </Typography>
          <Typography sx={{ fontFamily: DS.font, fontSize: '12.5px', color: DS.muted, mt: 0.2 }} noWrap>
            {typeLabel(tenant)}
          </Typography>
          <Tooltip title="Click to copy store ID">
            <Typography
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(tenant._id);
                toast.success('Store ID copied');
              }}
              sx={{
                mt: 0.35,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '10.5px',
                color: '#9CA3AF',
                cursor: 'pointer',
                '&:hover': { color: DS.green, textDecoration: 'underline' },
              }}
              noWrap
            >
              ID: {tenant._id}
            </Typography>
          </Tooltip>

          <Stack spacing={0.7} sx={{ mt: 1.5, mb: 1.75 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <PersonOutline sx={{ fontSize: 15, color: '#9CA3AF' }} />
              <Typography sx={{ fontSize: '12.5px', color: DS.text, fontFamily: DS.font, fontWeight: 500 }} noWrap>
                {ownerName(tenant)}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <EmailOutlined sx={{ fontSize: 15, color: '#9CA3AF' }} />
              <Typography sx={{ fontSize: '12.5px', color: DS.muted, fontFamily: DS.font }} noWrap title={tenant.ownerUser?.email || tenant.contactEmail}>
                {tenant.ownerUser?.email || tenant.contactEmail || '—'}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <PhoneOutlined sx={{ fontSize: 15, color: '#9CA3AF' }} />
              <Typography sx={{ fontSize: '12.5px', color: DS.muted, fontFamily: DS.font }} noWrap>
                {tenant.ownerUser?.phone || tenant.contactPhone || '—'}
              </Typography>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1.25,
              py: 1.25,
              borderTop: `1px solid ${DS.border}`,
              borderBottom: `1px solid ${DS.border}`,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '10.5px', color: DS.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Plan</Typography>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: DS.text, fontFamily: DS.font, mt: 0.25 }} noWrap>
                {tenant.currentPlan?.name || 'No Plan'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '10.5px', color: DS.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subscription</Typography>
              <Chip
                label={tenant.subscriptionStatus || 'trial'}
                size="small"
                sx={{
                  mt: 0.35,
                  height: 22,
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  bgcolor: sub.bg,
                  color: sub.color,
                  borderRadius: '999px',
                }}
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '10.5px', color: DS.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Registered</Typography>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: DS.text, fontFamily: DS.font, mt: 0.25 }}>
                {formatDate(tenant.createdAt)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '10.5px', color: DS.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {tenant.subscriptionEndsAt ? 'Expires' : 'Activated'}
              </Typography>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: DS.text, fontFamily: DS.font, mt: 0.25 }}>
                {tenant.subscriptionEndsAt
                  ? formatDate(tenant.subscriptionEndsAt)
                  : tenant.activatedAt
                  ? formatDate(tenant.activatedAt)
                  : tenant.status === 'active'
                  ? 'Active'
                  : 'Not yet'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ px: 2, pb: 2, pt: 1.5, display: 'flex', gap: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            onClick={() => navigate(`/superadmin/tenants/${tenant._id}`, { state: { tenant } })}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '13px',
              borderRadius: '10px',
              borderColor: '#D1D5DB',
              color: DS.text,
              fontFamily: DS.font,
              py: 0.85,
              '&:hover': { borderColor: '#9CA3AF', bgcolor: '#F9FAFB' },
            }}
          >
            View Details
          </Button>
          <Button
            fullWidth
            variant="contained"
            size="small"
            startIcon={<EditIcon sx={{ fontSize: '15px !important' }} />}
            onClick={() => handleEditClick(tenant)}
            disableElevation
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '13px',
              borderRadius: '10px',
              bgcolor: DS.green,
              fontFamily: DS.font,
              py: 0.85,
              '&:hover': { bgcolor: DS.greenHover },
            }}
          >
            Manage
          </Button>
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: { xs: 2, sm: 3 }, pt: { xs: 1, sm: 2.5 }, bgcolor: DS.pageBg, minHeight: '100%', fontFamily: DS.font }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          gap: 2,
          mb: 2.75,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: DS.heading,
              fontWeight: 800,
              fontSize: { xs: '24px', sm: '28px' },
              color: DS.text,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
            }}
          >
            Stores Management
          </Typography>
          <Typography sx={{ mt: 0.6, color: DS.muted, fontSize: '13.5px', fontFamily: DS.font, maxWidth: 520 }}>
            View and manage all restaurant stores, their subscriptions, and status.
          </Typography>
        </Box>
        <Button
          startIcon={<AddIcon />}
          onClick={() => window.open('/register', '_blank')}
          sx={{
            alignSelf: { xs: 'stretch', sm: 'flex-start' },
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '13.5px',
            borderRadius: '999px',
            bgcolor: DS.green,
            color: '#fff',
            px: 2.25,
            py: 1.1,
            fontFamily: DS.font,
            boxShadow: 'none',
            whiteSpace: 'nowrap',
            '&:hover': { bgcolor: DS.greenHover, boxShadow: 'none' },
          }}
        >
          + Add New Store
        </Button>
      </Box>

      {/* KPI row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: 'repeat(5, minmax(0, 1fr))',
          },
          gap: 1.75,
          mb: 2.5,
        }}
      >
        <KpiCard value={stats.total} label="Total Stores" icon={<StorefrontOutlined />} iconBg="#E8F5E9" iconColor="#2E7D32" />
        <KpiCard value={stats.active} label="Active Stores" icon={<WavesOutlined />} iconBg="#E0F7FA" iconColor="#00838F" />
        <KpiCard value={stats.pending} label="Pending Approval" icon={<PendingActionsOutlined />} iconBg="#FFF3E0" iconColor="#EF6C00" />
        <KpiCard value={stats.suspended} label="Suspended" icon={<CampaignOutlined />} iconBg="#FFEBEE" iconColor="#C62828" />
        <KpiCard value={stats.expired} label="Expired" icon={<AccessTimeOutlined />} iconBg="#F3E5F5" iconColor="#7B1FA2" />
      </Box>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 2.5,
          borderRadius: '14px',
          bgcolor: '#fff',
          border: `1px solid ${DS.border}`,
          boxShadow: DS.cardShadow,
        }}
      >
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.25}
          alignItems={{ xs: 'stretch', lg: 'center' }}
          flexWrap="wrap"
          useFlexGap
        >
          <TextField
            size="small"
            placeholder="Search by store name, owner, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{
              flex: { lg: '1 1 260px' },
              minWidth: { xs: '100%', lg: 240 },
              '& .MuiOutlinedInput-root': {
                height: 42,
                borderRadius: '10px',
                fontFamily: DS.font,
                fontSize: '13.5px',
                bgcolor: '#fff',
                '& fieldset': { borderColor: DS.border },
                '&:hover fieldset': { borderColor: '#D1D5DB' },
                '&.Mui-focused fieldset': { borderColor: DS.green, borderWidth: '1.5px' },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9CA3AF', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
            <Select displayEmpty value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} sx={filterSelectSx}>
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
              <MenuItem value="hold">On Hold</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
            <Select displayEmpty value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(0); }} sx={filterSelectSx}>
              <MenuItem value="">All Plans</MenuItem>
              {plans.map((plan) => (
                <MenuItem key={plan._id} value={plan._id}>{plan.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 180 } }}>
            <Select
              displayEmpty
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
              sx={filterSelectSx}
              renderValue={(v) => (v ? getRestaurantTypeLabel(String(v)) : 'All Types')}
            >
              <MenuItem value="">All Types</MenuItem>
              {RESTAURANT_TYPES.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 170 } }}>
            <Select
              displayEmpty
              value={datePreset}
              onChange={(e) => { setDatePreset(e.target.value); setPage(0); }}
              sx={filterSelectSx}
              startAdornment={
                <InputAdornment position="start" sx={{ ml: 0.5 }}>
                  <CalendarMonthOutlined sx={{ fontSize: 18, color: '#9CA3AF' }} />
                </InputAdornment>
              }
            >
              <MenuItem value="">Registration Date</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">Last 7 days</MenuItem>
              <MenuItem value="month">Last 30 days</MenuItem>
              <MenuItem value="year">Last 12 months</MenuItem>
            </Select>
          </FormControl>

          <Button
            startIcon={<RefreshOutlined />}
            onClick={clearFilters}
            sx={{
              textTransform: 'none',
              color: DS.muted,
              fontWeight: 600,
              fontSize: '13px',
              fontFamily: DS.font,
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#F3F4F6', color: DS.text },
            }}
          >
            Clear Filters
          </Button>

          <Box sx={{ flexGrow: 1 }} />

          <ToggleButtonGroup
            exclusive
            size="small"
            value={viewMode}
            onChange={(_, v) => v && setViewMode(v)}
            sx={{
              bgcolor: '#F3F4F6',
              borderRadius: '10px',
              p: 0.35,
              '& .MuiToggleButton-root': {
                border: 0,
                borderRadius: '8px !important',
                px: 1.1,
                py: 0.6,
                color: DS.muted,
                '&.Mui-selected': { bgcolor: DS.green, color: '#fff', '&:hover': { bgcolor: DS.greenHover } },
              },
            }}
          >
            <ToggleButton value="grid" aria-label="Grid view">
              <GridViewRounded sx={{ fontSize: 18 }} />
            </ToggleButton>
            <ToggleButton value="list" aria-label="List view">
              <ViewListRounded sx={{ fontSize: 18 }} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {loading ? (
        <CardGridSkeleton count={8} cardHeight={360} />
      ) : tenants.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            py: 8,
            textAlign: 'center',
            borderRadius: '16px',
            border: `1px dashed ${DS.border}`,
            bgcolor: '#fff',
          }}
        >
          <StorefrontOutlined sx={{ fontSize: 40, color: '#D1D5DB', mb: 1 }} />
          <Typography sx={{ fontFamily: DS.heading, fontWeight: 700, color: DS.text }}>No stores found</Typography>
          <Typography sx={{ color: DS.muted, fontSize: '13.5px', mt: 0.5 }}>Try adjusting filters or add a new store.</Typography>
        </Paper>
      ) : viewMode === 'grid' ? (
        <Grid container spacing={2.25}>
          {tenants.map((tenant) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={tenant._id}>
              {renderStoreCard(tenant)}
            </Grid>
          ))}
        </Grid>
      ) : (
        <Stack spacing={1.5}>
          {tenants.map((tenant) => {
            const badge = statusBadgeSx(tenant.status);
            return (
              <Paper
                key={tenant._id}
                elevation={0}
                sx={{
                  p: 1.75,
                  borderRadius: '14px',
                  border: `1px solid ${DS.border}`,
                  bgcolor: '#fff',
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 2,
                  alignItems: { md: 'center' },
                }}
              >
                <Box
                  component="img"
                  src={getStoreCoverUrl(tenant.restaurantType)}
                  alt=""
                  sx={{ width: { xs: '100%', md: 120 }, height: 72, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '15px', color: DS.text }} noWrap>
                      {tenant.name}
                    </Typography>
                    <Chip label={badge.label} size="small" sx={{ height: 22, bgcolor: badge.bg, color: badge.color, fontWeight: 700, fontSize: '11px' }} />
                  </Stack>
                  <Typography sx={{ fontSize: '12.5px', color: DS.muted }} noWrap>
                    {typeLabel(tenant)} · {ownerName(tenant)} · {tenant.ownerUser?.email || tenant.contactEmail || '—'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityIcon fontSize="small" />}
                    onClick={() => navigate(`/superadmin/tenants/${tenant._id}`, { state: { tenant } })}
                    sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700, borderColor: '#D1D5DB', color: DS.text }}
                  >
                    View Details
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<EditIcon fontSize="small" />}
                    onClick={() => handleEditClick(tenant)}
                    disableElevation
                    sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700, bgcolor: DS.green, '&:hover': { bgcolor: DS.greenHover } }}
                  >
                    Manage
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {!loading && totalTenants > 0 && (
        <Box display="flex" justifyContent="center" mt={3.5} mb={1}>
          <Paper elevation={0} sx={{ borderRadius: '12px', border: `1px solid ${DS.border}` }}>
            <TablePagination
              rowsPerPageOptions={[6, 12, 24, 48]}
              component="div"
              count={totalTenants}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ fontFamily: DS.font, '& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel': { fontFamily: DS.font } }}
            />
          </Paper>
        </Box>
      )}

      <Menu anchorEl={statusMenuAnchor} open={Boolean(statusMenuAnchor)} onClose={handleStatusMenuClose}>
        {ACCOUNT_STATUS_OPTIONS.map((opt) => (
          <MenuItem
            key={opt.value}
            selected={(statusMenuTenant?.status || 'pending') === opt.value}
            onClick={() => handleStatusSelect(opt.value)}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={noteDialogOpen} onClose={closeNoteDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pb: 1, fontFamily: DS.heading, fontWeight: 800 }}>Update Account Status</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: DS.font }}>
            Changing <strong>{noteTenant?.name}</strong> status from{' '}
            <Box component="span" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{noteTenant?.status || 'pending'}</Box>{' '}
            to{' '}
            <Box component="span" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{pendingStatus}</Box>.
            Please add a note explaining this change — it will be recorded in the activity log.
          </Typography>
          <TextField
            label="Note"
            placeholder="Reason for this status change..."
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            autoFocus
            required
            error={noteDialogOpen && statusNote.length > 0 && !statusNote.trim()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeNoteDialog} disabled={updatingStatusId === noteTenant?._id}>Cancel</Button>
          <Button
            onClick={confirmStatusUpdate}
            variant="contained"
            disabled={!statusNote.trim() || updatingStatusId === noteTenant?._id}
            startIcon={updatingStatusId === noteTenant?._id ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ bgcolor: DS.green, '&:hover': { bgcolor: DS.greenHover } }}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle sx={{ m: 0, p: 2, pr: 6, position: 'relative', fontFamily: DS.heading, fontWeight: 800 }}>
          Edit Subscription: {selectedTenant?.name}
          <IconButton
            aria-label="close"
            onClick={() => setEditDialogOpen(false)}
            size="small"
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
              bgcolor: 'error.main',
              '&:hover': { bgcolor: 'error.dark' },
              width: 24,
              height: 24,
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: { xs: '100%', sm: 300 } }}>
            <FormControl fullWidth>
              <Typography sx={{ mb: 0.75, fontSize: '13px', fontWeight: 600 }}>Current Plan</Typography>
              <Select
                value={editForm.currentPlan}
                onChange={(e) => setEditForm({ ...editForm, currentPlan: e.target.value })}
              >
                <MenuItem value="">No Plan</MenuItem>
                {plans.map((plan) => (
                  <MenuItem key={plan._id} value={plan._id}>
                    {plan.name} (${Number(plan.price || 0).toFixed(2)}/{plan.interval})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <Typography sx={{ mb: 0.75, fontSize: '13px', fontWeight: 600 }}>Subscription Status</Typography>
              <Select
                value={editForm.subscriptionStatus}
                onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
              >
                <MenuItem value="trial">Trial</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Trial Ends At"
              type="date"
              value={editForm.trialEndsAt}
              onChange={(e) => setEditForm({ ...editForm, trialEndsAt: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Subscription Ends At"
              type="date"
              value={editForm.subscriptionEndsAt}
              onChange={(e) => setEditForm({ ...editForm, subscriptionEndsAt: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <Typography sx={{ mb: 0.75, fontSize: '13px', fontWeight: 600 }}>Auto Renew</Typography>
              <Select
                value={editForm.autoRenew ? 'true' : 'false'}
                onChange={(e) => setEditForm({ ...editForm, autoRenew: e.target.value === 'true' })}
              >
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Notes (required)"
              placeholder="Why is this subscription being changed?"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              multiline
              minRows={2}
              required
              error={editForm.notes.length > 0 && !editForm.notes.trim()}
              helperText="Recorded in the admin activity log."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            disabled={!editForm.notes.trim()}
            sx={{ bgcolor: DS.green, '&:hover': { bgcolor: DS.greenHover } }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantsPage;
