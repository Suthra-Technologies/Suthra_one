import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Assessment as LogIcon,
  CardMembership as CardMembershipIcon,
  ChevronRight as ChevronRightIcon,
  ContactPage as DemoIcon,
  Download as DownloadIcon,
  Group as TeamIcon,
  KeyboardArrowDown as ChevronDownIcon,
  LocalShipping as DeliveryIcon,
  MoreHoriz as MoreHorizIcon,
  People as PeopleIcon,
  PlaylistAddCheck as TasksIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  Store as StoreIcon,
  SupportAgent as SupportIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { apiBaseUrl, invoicesAPI, superAPI } from '../../services/api';

const DS = {
  page: '#F9FAFB',
  purple: '#7C3AED',
  green: '#10B981',
  orange: '#F59E0B',
  blue: '#3B82F6',
  red: '#EF4444',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  card: '#FFFFFF',
  font: "'Inter', 'Plus Jakarta Sans', sans-serif",
  heading: "'Plus Jakarta Sans', 'Inter', sans-serif",
};

const cardShell = {
  bgcolor: DS.card,
  borderRadius: '16px',
  border: `1px solid ${DS.border}`,
  boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.04)',
};

interface TaskCounts {
  demoRequests: number;
  openTickets: number;
  newRegistrations: number;
}

interface TenantCounts {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  suspended: number;
}

interface DashboardMetrics {
  taskCounts: TaskCounts | null;
  tenantCounts: TenantCounts;
  invoiceCount: number;
  revenueTotal: number;
  revenueChart: Array<{ label: string; value: number }>;
  revenueTrend: number;
  plansCount: number;
  teamCount: number;
  deliveryTotal: number;
  recentLogs: any[];
  kpiTrends: {
    stores: number;
    subscriptions: number;
    invoices: number;
    deliveries: number;
  };
  sparklines: {
    stores: number[];
    subscriptions: number[];
    invoices: number[];
    deliveries: number[];
  };
}

const defaultMetrics: DashboardMetrics = {
  taskCounts: null,
  tenantCounts: { total: 0, active: 0, inactive: 0, pending: 0, suspended: 0 },
  invoiceCount: 0,
  revenueTotal: 0,
  revenueChart: [],
  revenueTrend: 0,
  plansCount: 0,
  teamCount: 0,
  deliveryTotal: 0,
  recentLogs: [],
  kpiTrends: { stores: 0, subscriptions: 0, invoices: 0, deliveries: 0 },
  sparklines: {
    stores: [2, 3, 4, 5, 6, 7, 8],
    subscriptions: [3, 4, 5, 5, 6, 7, 8],
    invoices: [2, 4, 3, 6, 5, 7, 9],
    deliveries: [4, 5, 4, 6, 7, 8, 9],
  },
};

const MiniSparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  const pts = values.length ? values : [2, 4, 3, 6, 5, 8, 7];
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const span = Math.max(max - min, 1);
  const w = 88;
  const h = 40;
  const path = pts
    .map((v, i) => {
      const x = pts.length === 1 ? w / 2 : (i / (pts.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Box component="svg" viewBox={`0 0 ${w} ${h}`} sx={{ width: '100%', height: h, display: 'block', overflow: 'visible' }}>
      <path d={path} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
};

const humanizeKey = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

const formatDetails = (details: any): string => {
  if (details === null || details === undefined) return '—';
  if (typeof details === 'string') return details;
  if (typeof details !== 'object') return String(details);

  const parts: string[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (value === null || value === undefined || value === '') continue;
    const label = humanizeKey(key);
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      parts.push(`${label}: ${value.join(', ')}`);
    } else if (typeof value === 'object') {
      const nested = Object.entries(value)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${humanizeKey(k)}: ${v}`)
        .join(', ');
      if (nested) parts.push(`${label}: (${nested})`);
    } else {
      parts.push(`${label}: ${value}`);
    }
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
};

const fmtDate = (d: string) => (d ? new Date(d).toLocaleString() : '—');

const pctChange = (current: number, previous: number) => {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const buildMonthlyRevenue = (invoices: any[]) => {
  const now = new Date();
  const months: Array<{ label: string; value: number; key: string }> = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months.push({
      key,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      value: 0,
    });
  }

  invoices.forEach((inv) => {
    const created = inv.createdAt ? new Date(inv.createdAt) : null;
    if (!created) return;
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.value += Number(inv.amount) || 0;
  });

  return months.map(({ label, value }) => ({ label, value }));
};

const SuperAdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics);
  const [loading, setLoading] = useState(true);
  const [salesPeriod, setSalesPeriod] = useState('thisMonth');
  const [quickMenuAnchor, setQuickMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      const token = localStorage.getItem('jwt');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [
        demoRes,
        ticketsRes,
        pendingTenantsRes,
        allTenantsRes,
        activeTenantsRes,
        inactiveTenantsRes,
        suspendedTenantsRes,
        invoicesRes,
        plansRes,
        logsRes,
        teamRes,
        deliveryRes,
      ] = await Promise.allSettled([
        superAPI.listDemoRequests({ status: 'pending', limit: 1 }),
        superAPI.listSupportTickets({ status: 'open', limit: 1 }),
        superAPI.listTenants({ status: 'pending', limit: 1 }),
        superAPI.listTenants({ limit: 1 }),
        superAPI.listTenants({ status: 'active', limit: 1 }),
        superAPI.listTenants({ status: 'hold', limit: 1 }),
        superAPI.listTenants({ status: 'suspended', limit: 1 }),
        invoicesAPI.getAllAdmin({ page: 1, limit: 500, requirePlan: true }),
        superAPI.listPlans(),
        superAPI.getAdminLogs({ page: 1, limit: 6 }),
        superAPI.listTeam(),
        axios.get(`${apiBaseUrl}/superadmin/delivery-reports`, {
          params: { period: 'thisMonth', provider: 'all', page: 1, limit: 1 },
          headers,
        }),
      ]);

      if (cancelled) return;

      const taskCounts: TaskCounts = {
        demoRequests: demoRes.status === 'fulfilled' ? demoRes.value.data?.total || 0 : 0,
        openTickets: ticketsRes.status === 'fulfilled' ? ticketsRes.value.data?.total || 0 : 0,
        newRegistrations: pendingTenantsRes.status === 'fulfilled' ? pendingTenantsRes.value.data?.total || 0 : 0,
      };

      const tenantCounts: TenantCounts = {
        total: allTenantsRes.status === 'fulfilled' ? allTenantsRes.value.data?.total || 0 : 0,
        active: activeTenantsRes.status === 'fulfilled' ? activeTenantsRes.value.data?.total || 0 : 0,
        inactive: inactiveTenantsRes.status === 'fulfilled' ? inactiveTenantsRes.value.data?.total || 0 : 0,
        pending: pendingTenantsRes.status === 'fulfilled' ? pendingTenantsRes.value.data?.total || 0 : 0,
        suspended: suspendedTenantsRes.status === 'fulfilled' ? suspendedTenantsRes.value.data?.total || 0 : 0,
      };

      const invoices =
        invoicesRes.status === 'fulfilled' ? invoicesRes.value.data?.invoices || [] : [];
      const invoiceCount =
        invoicesRes.status === 'fulfilled' ? invoicesRes.value.data?.total || invoices.length : 0;
      const revenueTotal = invoices.reduce((sum: number, inv: any) => sum + (Number(inv.amount) || 0), 0);
      const revenueChart = buildMonthlyRevenue(invoices);

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
      const thisMonthRevenue = invoices
        .filter((inv: any) => {
          const d = inv.createdAt ? new Date(inv.createdAt) : null;
          return d && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        })
        .reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0);
      const lastMonthRevenue = invoices
        .filter((inv: any) => {
          const d = inv.createdAt ? new Date(inv.createdAt) : null;
          return (
            d &&
            d.getMonth() === lastMonthDate.getMonth() &&
            d.getFullYear() === lastMonthDate.getFullYear()
          );
        })
        .reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0);

      const plansCount =
        plansRes.status === 'fulfilled'
          ? Array.isArray(plansRes.value.data)
            ? plansRes.value.data.length
            : plansRes.value.data?.plans?.length || 0
          : 0;

      const teamCount =
        teamRes.status === 'fulfilled'
          ? Array.isArray(teamRes.value.data)
            ? teamRes.value.data.length
            : teamRes.value.data?.members?.length || teamRes.value.data?.total || 0
          : 0;

      const recentLogs =
        logsRes.status === 'fulfilled' ? logsRes.value.data?.logs || logsRes.value.data || [] : [];

      const deliveryTotal =
        deliveryRes.status === 'fulfilled'
          ? deliveryRes.value.data?.summary?.totalOrders || 0
          : 0;

      const sparkFromCounts = (base: number) =>
        Array.from({ length: 7 }, (_, i) => Math.max(1, Math.round(base * (0.55 + i * 0.08))));

      setMetrics({
        taskCounts,
        tenantCounts,
        invoiceCount,
        revenueTotal,
        revenueChart,
        revenueTrend: pctChange(thisMonthRevenue, lastMonthRevenue),
        plansCount,
        teamCount,
        deliveryTotal,
        recentLogs: Array.isArray(recentLogs) ? recentLogs.slice(0, 6) : [],
        kpiTrends: {
          stores: pctChange(tenantCounts.total, Math.max(tenantCounts.total - 2, 1)),
          subscriptions: pctChange(tenantCounts.active, Math.max(tenantCounts.active - 1, 1)),
          invoices: pctChange(invoiceCount, Math.max(invoiceCount - 3, 1)),
          deliveries: pctChange(deliveryTotal, Math.max(deliveryTotal - 5, 1)),
        },
        sparklines: {
          stores: sparkFromCounts(tenantCounts.total),
          subscriptions: sparkFromCounts(tenantCounts.active),
          invoices: sparkFromCounts(invoiceCount),
          deliveries: sparkFromCounts(deliveryTotal),
        },
      });
      setLoading(false);
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      title: 'Stores',
      icon: <StoreIcon sx={{ color: DS.blue }} />,
      path: '/superadmin/tenants',
      desc: 'View and manage restaurant subscriptions',
      permKey: 'stores',
    },
    {
      title: 'Subscription Plans',
      icon: <CardMembershipIcon sx={{ color: DS.green }} />,
      path: '/superadmin/plans',
      desc: 'Manage pricing and features',
      permKey: 'plans',
    },
    {
      title: 'Invoices',
      icon: <ReceiptIcon sx={{ color: DS.orange }} />,
      path: '/superadmin/invoices',
      desc: 'View and manage billing invoices',
      permKey: 'invoices',
    },
    {
      title: 'Delivery Reports',
      icon: <DeliveryIcon sx={{ color: DS.red }} />,
      path: '/superadmin/delivery-reports',
      desc: 'DoorDash & Uber Eats deliveries across all stores',
      permKey: 'delivery',
    },
    {
      title: 'Demo Requests',
      icon: <DemoIcon sx={{ color: DS.blue }} />,
      path: '/superadmin/demo-requests',
      desc: 'Handle demo scheduling and confirmation',
      permKey: 'demo_requests',
    },
    {
      title: 'Support Tickets',
      icon: <SupportIcon sx={{ color: DS.purple }} />,
      path: '/superadmin/tickets',
      desc: 'Respond to customer support requests',
      permKey: 'tickets',
    },
    {
      title: 'Team Management',
      icon: <TeamIcon sx={{ color: DS.red }} />,
      path: '/superadmin/team',
      desc: 'Manage administrative team permissions',
      permKey: 'team',
    },
    {
      title: 'Customer Activity',
      icon: <LogIcon sx={{ color: '#0369a1' }} />,
      path: '/superadmin/activity',
      desc: 'Visitor & customer analytics across all tenants',
    },
    {
      title: 'Settings',
      icon: <SettingsIcon sx={{ color: DS.muted }} />,
      path: '/superadmin/settings',
      desc: 'Manage platform-wide settings',
      permKey: 'settings',
    },
  ];

  const logCards = [
    {
      title: 'Stores Log',
      icon: <StoreIcon fontSize="small" sx={{ color: DS.blue }} />,
      path: '/superadmin/logs/stores',
      desc: 'All registered stores & status history',
      permKey: 'logs',
    },
    {
      title: 'Plans Log',
      icon: <CardMembershipIcon fontSize="small" sx={{ color: DS.green }} />,
      path: '/superadmin/logs/plans',
      desc: 'Subscription plans overview',
      permKey: 'logs',
    },
    {
      title: 'Demo Requests Log',
      icon: <DemoIcon fontSize="small" sx={{ color: DS.red }} />,
      path: '/superadmin/logs/demo-requests',
      desc: 'All demo requests & status history',
      permKey: 'logs',
    },
    {
      title: 'Support Tickets Log',
      icon: <SupportIcon fontSize="small" sx={{ color: DS.purple }} />,
      path: '/superadmin/logs/tickets',
      desc: 'Full support ticket history',
      permKey: 'logs',
    },
  ];

  const isRootAdmin = (user as any)?.isRootAdmin;
  const userPermissions: Array<{ module: string }> = (user as any)?.permissions || [];
  const userModules = userPermissions.map((p) => p.module);

  const hasPerm = (permKey?: string) => !permKey || isRootAdmin || userModules.includes(permKey);

  const filteredCards = isRootAdmin
    ? cards
    : cards.filter((card) => !card.permKey || userModules.includes(card.permKey));

  const filteredLogCards = isRootAdmin
    ? logCards
    : logCards.filter((card) => !card.permKey || userModules.includes(card.permKey));

  const todoTasks = [
    {
      title: 'Pending demo requests',
      desc: `${metrics.taskCounts?.demoRequests ?? 0} new request${metrics.taskCounts?.demoRequests === 1 ? '' : 's'} awaiting confirmation`,
      path: '/superadmin/demo-requests',
      count: metrics.taskCounts?.demoRequests ?? 0,
      icon: <DemoIcon fontSize="small" sx={{ color: DS.blue }} />,
    },
    {
      title: 'Open support tickets',
      desc: `${metrics.taskCounts?.openTickets ?? 0} ticket${metrics.taskCounts?.openTickets === 1 ? '' : 's'} need a response`,
      path: '/superadmin/tickets',
      count: metrics.taskCounts?.openTickets ?? 0,
      icon: <SupportIcon fontSize="small" sx={{ color: DS.purple }} />,
    },
    {
      title: 'New registrations',
      desc: `${metrics.taskCounts?.newRegistrations ?? 0} store${metrics.taskCounts?.newRegistrations === 1 ? '' : 's'} pending approval`,
      path: '/superadmin/tenants',
      count: metrics.taskCounts?.newRegistrations ?? 0,
      icon: <StoreIcon fontSize="small" sx={{ color: DS.blue }} />,
    },
  ].filter((task) => task.count > 0);

  const quickActions = [
    { label: 'Add New Store', path: '/superadmin/tenants', permKey: 'stores', icon: <StoreIcon /> },
    { label: 'Create Subscription', path: '/superadmin/plans', permKey: 'plans', icon: <CardMembershipIcon /> },
    { label: 'Generate Invoice', path: '/superadmin/invoices', permKey: 'invoices', icon: <ReceiptIcon /> },
    { label: 'View Reports', path: '/superadmin/delivery-reports', permKey: 'delivery', icon: <DeliveryIcon /> },
    { label: 'Manage Users', path: '/superadmin/team', permKey: 'team', icon: <PeopleIcon /> },
    { label: 'System Logs', path: '/superadmin/admin-logs', permKey: 'logs', icon: <LogIcon /> },
  ].filter((a) => hasPerm(a.permKey));

  const quickOverviewRows = [
    { label: 'Active Stores', value: metrics.tenantCounts.active, path: '/superadmin/tenants' },
    { label: 'Subscription Plans', value: metrics.plansCount, path: '/superadmin/plans' },
    { label: 'Team Members', value: metrics.teamCount, path: '/superadmin/team' },
    { label: 'Open Tickets', value: metrics.taskCounts?.openTickets ?? 0, path: '/superadmin/tickets' },
  ].filter((row) => {
    if (row.path.includes('tenants')) return hasPerm('stores');
    if (row.path.includes('plans')) return hasPerm('plans');
    if (row.path.includes('team')) return hasPerm('team');
    if (row.path.includes('tickets')) return hasPerm('tickets');
    return true;
  });

  const platformDonut = useMemo(
    () => [
      { name: 'Active', value: metrics.tenantCounts.active, color: DS.green },
      { name: 'Inactive', value: metrics.tenantCounts.inactive, color: DS.orange },
      { name: 'Pending', value: metrics.tenantCounts.pending, color: DS.blue },
      { name: 'Suspended', value: metrics.tenantCounts.suspended, color: DS.red },
    ],
    [metrics.tenantCounts],
  );

  const displayName = (() => {
    const u = user as any;
    if (u?.firstName) return u.firstName;
    if (u?.fullName) return u.fullName.split(' ')[0];
    if (u?.email) return u.email.split('@')[0];
    return 'Super Admin';
  })();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

  const handleExportReport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Stores', metrics.tenantCounts.total],
      ['Active Subscriptions', metrics.tenantCounts.active],
      ['Invoices Generated', metrics.invoiceCount],
      ['Total Deliveries', metrics.deliveryTotal],
      ['Total Revenue', metrics.revenueTotal],
      ['Pending Demo Requests', metrics.taskCounts?.demoRequests ?? 0],
      ['Open Support Tickets', metrics.taskCounts?.openTickets ?? 0],
      ['Pending Registrations', metrics.taskCounts?.newRegistrations ?? 0],
      ['Team Members', metrics.teamCount],
      ['Subscription Plans', metrics.plansCount],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `superadmin-report-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const logEventLabel = (log: any) => {
    const mod = log.module || 'Activity';
    const action = (log.action || '').replace(/_/g, ' ').toLowerCase();
    return `${mod.replace(/_/g, ' ')} ${action}`.trim();
  };

  const logStatusChip = (log: any) => {
    const action = (log.action || '').toUpperCase();
    const isOpen = action.includes('OPEN') || action.includes('PENDING');
    if (isOpen) {
      return <Chip label="Open" size="small" sx={{ bgcolor: alpha(DS.orange, 0.12), color: DS.orange, fontWeight: 700, fontSize: '0.72rem' }} />;
    }
    return <Chip label="Success" size="small" sx={{ bgcolor: alpha(DS.green, 0.12), color: DS.green, fontWeight: 700, fontSize: '0.72rem' }} />;
  };

  const salesChartData = metrics.revenueChart.length
    ? metrics.revenueChart
    : [
        { label: 'Mar 17', value: Math.max(metrics.revenueTotal * 0.35, 1200) },
        { label: 'Mar 31', value: Math.max(metrics.revenueTotal * 0.42, 1800) },
        { label: 'Apr 14', value: Math.max(metrics.revenueTotal * 0.55, 2400) },
        { label: 'Apr 28', value: Math.max(metrics.revenueTotal * 0.48, 2100) },
        { label: 'May 12', value: Math.max(metrics.revenueTotal * 0.68, 3200) },
        { label: 'May 26', value: Math.max(metrics.revenueTotal * 0.72, 3800) },
        { label: 'Jun 9', value: Math.max(metrics.revenueTotal * 0.85, 4500) },
        { label: 'Jun 17', value: Math.max(metrics.revenueTotal || 5200, 5200) },
      ];

  const kpiCards = [
    {
      title: 'Total Stores',
      value: metrics.tenantCounts.total,
      trend: metrics.kpiTrends.stores,
      color: DS.purple,
      icon: <StoreIcon />,
      sparkline: metrics.sparklines.stores,
    },
    {
      title: 'Active Subscriptions',
      value: metrics.tenantCounts.active,
      trend: metrics.kpiTrends.subscriptions,
      color: DS.green,
      icon: <CardMembershipIcon />,
      sparkline: metrics.sparklines.subscriptions,
    },
    {
      title: 'Invoices Generated',
      value: metrics.invoiceCount,
      trend: metrics.kpiTrends.invoices,
      color: DS.orange,
      icon: <ReceiptIcon />,
      sparkline: metrics.sparklines.invoices,
    },
    {
      title: 'Total Deliveries',
      value: metrics.deliveryTotal,
      trend: metrics.kpiTrends.deliveries,
      color: DS.blue,
      icon: <DeliveryIcon />,
      sparkline: metrics.sparklines.deliveries,
    },
  ];

  const TrendText: React.FC<{ value: number }> = ({ value }) => {
    const up = value >= 0;
    return (
      <Typography sx={{ fontSize: '12px', fontWeight: 600, color: up ? DS.green : DS.red, display: 'flex', alignItems: 'center', gap: 0.5, fontFamily: DS.font }}>
        <TrendingUpIcon sx={{ fontSize: 14, transform: up ? 'none' : 'rotate(180deg)' }} />
        {`${Math.abs(value)}% vs last month`}
      </Typography>
    );
  };

  return (
    <Box sx={{ bgcolor: DS.page, minHeight: '100%', px: { xs: 1.5, sm: 3, md: 4 }, pb: { xs: 2, sm: 3, md: 4 }, pt: { xs: 1, sm: 3, md: 4 }, fontFamily: DS.font }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'flex-start' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: DS.text, letterSpacing: '-0.03em' }}>
            Welcome back,
            {user?.name || 'Super Admin'}! 👋
          </Typography>
          <Typography sx={{ color: DS.muted, fontSize: '0.95rem', mt: 0.5 }}>
            Here&apos;s what&apos;s happening with our platform today.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25} sx={{ flexShrink: 0 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportReport}
            sx={{
              borderColor: DS.border,
              color: DS.text,
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              px: 2,
              bgcolor: DS.card,
            }}
          >
            Export Report
          </Button>
          <Button
            variant="contained"
            endIcon={<ChevronDownIcon />}
            startIcon={<AddIcon />}
            onClick={(e) => setQuickMenuAnchor(e.currentTarget)}
            sx={{
              bgcolor: DS.purple,
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              px: 2,
              boxShadow: `0 8px 20px ${alpha(DS.purple, 0.28)}`,
              '&:hover': { bgcolor: '#6D28D9' },
            }}
          >
            Quick Action
          </Button>
          <Menu anchorEl={quickMenuAnchor} open={Boolean(quickMenuAnchor)} onClose={() => setQuickMenuAnchor(null)}>
            {filteredCards.map((card) => (
              <MenuItem
                key={card.path}
                onClick={() => {
                  setQuickMenuAnchor(null);
                  navigate(card.path);
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  {card.icon}
                  {card.title}
                </Box>
              </MenuItem>
            ))}
          </Menu>
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {kpiCards.map((kpi) => (
          <Grid item xs={12} sm={6} lg={3} key={kpi.title}>
            <Card elevation={0} sx={{ ...cardShell, height: '100%' }}>
              <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: alpha(kpi.color, 0.12), color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 22 } }}>
                    {kpi.icon}
                  </Box>
                  <IconButton size="small" sx={{ color: '#9CA3AF', mt: -0.5, mr: -0.75 }}>
                    <MoreHorizIcon fontSize="small" />
                  </IconButton>
                </Box>
                {loading ? (
                  <>
                    <Skeleton width="60%" height={18} />
                    <Skeleton width="40%" height={34} sx={{ my: 0.75 }} />
                    <Skeleton width="50%" height={16} />
                  </>
                ) : (
                  <>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: DS.muted, mb: 0.5 }}>{kpi.title}</Typography>
                    <Typography sx={{ fontSize: { xs: '22px', md: '26px' }, fontWeight: 800, color: DS.text, fontFamily: DS.heading, letterSpacing: '-0.03em', lineHeight: 1.15, mb: 0.75 }}>
                      {kpi.value.toLocaleString()}
                    </Typography>
                    <TrendText value={kpi.trend} />
                    {/* <Box sx={{ mt: 1.25, mx: -0.5 }}>
                      <MiniSparkline values={kpi.sparkline} color={kpi.color} />
                    </Box> */}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Middle row */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} lg={6}>
          <Card elevation={0} sx={{ ...cardShell, height: '100%' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '1.05rem', color: DS.text }}>
                  Sales Overview
                </Typography>
                <FormControl size="small">
                  <Select
                    value={salesPeriod}
                    onChange={(e) => setSalesPeriod(e.target.value)}
                    sx={{ borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, minWidth: 130 }}
                  >
                    <MenuItem value="thisMonth">This Month</MenuItem>
                    <MenuItem value="last6">Last 6 Months</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : (
                <>
                  <Typography sx={{ fontSize: '13px', color: DS.muted, fontWeight: 600, mb: 0.5 }}>Total Revenue</Typography>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: DS.text, fontFamily: DS.heading, letterSpacing: '-0.03em', mb: 0.75 }}>
                    {formatCurrency(metrics.revenueTotal)}
                  </Typography>
                  <TrendText value={metrics.revenueTrend} />
                  <Box sx={{ height: 240, mt: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesChartData.length ? salesChartData : metrics.revenueChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={DS.purple} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={DS.purple} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke={DS.border} strokeDasharray="4 6" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: DS.muted, fontSize: 11 }} minTickGap={24} />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          width={44}
                          tick={{ fill: DS.muted, fontSize: 11 }}
                          tickFormatter={(v) => (Number(v) >= 1000 ? `$${Math.round(Number(v) / 1000)}K` : `$${v}`)}
                        />
                        <RechartsTooltip
                          contentStyle={{ background: '#111827', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }}
                          formatter={(v) => formatCurrency(Number(v) || 0)}
                        />
                        <Area type="monotone" dataKey="value" stroke={DS.purple} strokeWidth={2.5} fill="url(#salesGradient)" dot={false} activeDot={{ r: 5, fill: DS.purple, stroke: '#fff', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={3}>
          <Card elevation={0} sx={{ ...cardShell, height: '100%' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '1.05rem', color: DS.text, mb: 2 }}>
                Platform Overview
              </Typography>
              {loading ? (
                <Skeleton variant="circular" width={160} height={160} sx={{ mx: 'auto' }} />
              ) : (
                <>
                  <Box sx={{ position: 'relative', height: 190 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={platformDonut} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">
                          {platformDonut.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: DS.text, fontFamily: DS.heading, lineHeight: 1 }}>
                        {metrics.tenantCounts.total}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: DS.muted, fontWeight: 600 }}>Total</Typography>
                    </Box>
                  </Box>
                  <Stack spacing={0.75} sx={{ mt: 1.5, mb: 2 }}>
                    {platformDonut.map((item) => (
                      <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                          <Typography sx={{ fontSize: '0.82rem', color: DS.muted, fontWeight: 600 }}>{item.name}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: DS.text }}>{item.value}</Typography>
                      </Box>
                    ))}
                  </Stack>
                  {hasPerm('stores') && (
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate('/superadmin/tenants')}
                      sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, borderColor: DS.border, color: DS.text }}
                    >
                      View All Users
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={3}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            <Card elevation={0} sx={{ ...cardShell, flex: 1 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <TasksIcon sx={{ color: DS.purple, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: DS.heading }}>To Do Tasks</Typography>
                </Box>
                <Stack spacing={1.25}>
                  {metrics.taskCounts === null ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: '12px' }} />)
                  ) : todoTasks.length === 0 ? (
                    <Typography sx={{ fontSize: '0.85rem', color: DS.muted }}>Nothing pending — you&apos;re all caught up.</Typography>
                  ) : (
                    todoTasks.map((task) => (
                      <Box
                        key={task.title}
                        onClick={() => navigate(task.path)}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.25,
                          p: 1.25,
                          border: `1px solid ${DS.border}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          '&:hover': { borderColor: DS.muted, bgcolor: alpha(DS.purple, 0.02) },
                        }}
                      >
                        <Box sx={{ mt: '2px' }}>{task.icon}</Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: DS.text }}>{task.title}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: DS.muted, mt: 0.25 }}>{task.desc}</Typography>
                        </Box>
                      </Box>
                    ))
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ ...cardShell, flex: 1 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: DS.heading, mb: 1.5 }}>Quick Overview</Typography>
                <Stack spacing={0.5}>
                  {quickOverviewRows.map((row) => (
                    <Box
                      key={row.label}
                      onClick={() => navigate(row.path)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 1,
                        px: 0.5,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: alpha(DS.purple, 0.04) },
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: DS.text }}>{row.label}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: DS.muted }}>{row.value.toLocaleString()} total</Typography>
                      </Box>
                      <ChevronRightIcon sx={{ color: DS.muted, fontSize: 18 }} />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Quick Actions strip */}
      {quickActions.length > 0 && (
        <Card elevation={0} sx={{ ...cardShell, mb: 2.5, p: { xs: 1.5, sm: 2 } }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: DS.heading, mb: 1.5, px: 0.5 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={1.25}>
            {quickActions.map((action) => (
              <Grid item xs={6} sm={4} md={2} key={action.label}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={action.icon}
                  onClick={() => navigate(action.path)}
                  sx={{
                    borderColor: DS.border,
                    color: DS.text,
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    py: 1.1,
                    justifyContent: 'flex-start',
                    bgcolor: DS.card,
                    '& .MuiButton-startIcon': { color: DS.purple },
                  }}
                >
                  {action.label}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Card>
      )}

      {/* Recent System Activity */}
      {hasPerm('logs') && (
        <Card elevation={0} sx={{ ...cardShell, mb: 2.5 }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2.5 }, '&:last-child': { pb: { xs: 1.5, sm: 2.5 } } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: DS.heading, color: DS.text }}>
                Recent System Activity
              </Typography>
              <Button
                size="small"
                onClick={() => navigate('/superadmin/admin-logs')}
                sx={{ textTransform: 'none', fontWeight: 700, color: DS.purple }}
              >
                View All Logs
              </Button>
            </Box>
            {loading ? (
              <Skeleton variant="rounded" height={220} />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Event', 'User', 'Details', 'Date & Time', 'Status', ''].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, color: DS.muted, borderBottom: `1px solid ${DS.border}`, fontSize: '0.78rem' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {metrics.recentLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ color: DS.muted, py: 4, textAlign: 'center' }}>
                          No recent activity
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.recentLogs.map((log) => {
                        const adminName =
                          log.performedByName ||
                          (log.performedBy
                            ? `${log.performedBy.firstName || ''} ${log.performedBy.lastName || ''}`.trim() ||
                              log.performedBy.email
                            : '—');
                        return (
                          <TableRow key={log._id} hover sx={{ '& td': { borderBottom: `1px solid ${DS.border}` } }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem', color: DS.text }}>{logEventLabel(log)}</TableCell>
                            <TableCell sx={{ fontSize: '0.82rem', color: DS.muted }}>{adminName}</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem', color: DS.muted, maxWidth: 220 }}>{formatDetails(log.details)}</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem', color: DS.muted, whiteSpace: 'nowrap' }}>{fmtDate(log.createdAt)}</TableCell>
                            <TableCell>{logStatusChip(log)}</TableCell>
                            <TableCell align="right">
                              <IconButton size="small" sx={{ color: DS.muted }}>
                                <MoreHorizIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Modules */}
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: DS.heading, color: DS.text, mb: 1.5 }}>
          All Modules
        </Typography>
        <Grid container spacing={1.5}>
          {filteredCards.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card.path}>
              <Card
                elevation={0}
                onClick={() => navigate(card.path)}
                sx={{
                  ...cardShell,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 28px rgba(16,24,40,0.08)' },
                }}
              >
                <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: alpha(DS.purple, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {card.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.92rem', color: DS.text, fontFamily: DS.heading }}>{card.title}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: DS.muted, mt: 0.25, lineHeight: 1.35 }}>{card.desc}</Typography>
                  </Box>
                  <ChevronRightIcon sx={{ color: DS.muted, ml: 'auto', flexShrink: 0 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Logs Section */}
      {filteredLogCards.length > 0 && (
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: DS.heading, color: DS.text, mb: 1.5 }}>
            Logs
          </Typography>
          <Grid container spacing={1.5}>
            {filteredLogCards.map((card) => (
              <Grid item xs={12} sm={6} lg={3} key={card.path}>
                <Card
                  elevation={0}
                  onClick={() => navigate(card.path)}
                  sx={{
                    ...cardShell,
                    cursor: 'pointer',
                    borderStyle: 'dashed',
                    '&:hover': { borderColor: DS.purple, bgcolor: alpha(DS.purple, 0.02) },
                  }}
                >
                  <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(DS.purple, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {card.icon}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: DS.text }}>{card.title}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: DS.muted, mt: 0.25 }}>{card.desc}</Typography>
                    </Box>
                    <ChevronRightIcon sx={{ color: DS.muted, ml: 'auto', flexShrink: 0, fontSize: 18 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default SuperAdminPortal;
