import {
  Assessment,
  CheckCircle,
  Refresh,
  Add,
  MoreHoriz,
  TrendingUp,
  ChevronRight,
  KeyboardArrowDown,
  PointOfSale,
  TableRestaurant,
  ReceiptLong,
  Inventory2,
  BarChart,
  People,
  WarningAmberRounded,
} from '@mui/icons-material';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Select,
  Tooltip as MuiTooltip,
  Pagination,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardSkeleton } from '../components/common/PageSkeleton';


import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import BadgeIcon from '@mui/icons-material/Badge';
import BuildIcon from '@mui/icons-material/Build';
import DescriptionIcon from '@mui/icons-material/Description';
import DevicesIcon from '@mui/icons-material/Devices';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import RoomServiceOutlinedIcon from '@mui/icons-material/RoomServiceOutlined';

import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import {
  assetsAPI,
  billingAPI,
  bookingsAPI,
  inventoryAPI,
  purchaseOrdersAPI,
  reportsAPI,
  subscriptionAPI
} from '../services/api';
import { useActiveTenant } from '../hooks/useActiveTenant';
import PendingActionsCard from '../components/PendingActionsCard';
import UsageBreakdown from '../components/UsageBreakdown';

const DS = {
  orange: '#FF6B35',
  orangeSoft: '#FFF1EB',
  pink: '#F472B6',
  pinkSoft: '#FDF2F8',
  green: '#10B981',
  greenSoft: '#ECFDF5',
  blue: '#3B82F6',
  blueSoft: '#EFF6FF',
  purple: '#8B5CF6',
  purpleSoft: '#F5F3FF',
  gold: '#F59E0B',
  goldSoft: '#FFFBEB',
  red: '#EF4444',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  page: '#F8F9FB',
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
    <Box component="svg" viewBox={`0 0 ${w} ${h}`} sx={{ width: w, height: h, flexShrink: 0, overflow: 'visible' }}>
      <path d={path} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
};

// ---------------------------------------------------------------------------
// StatCard – KPI card matching dashboard mockup
// ---------------------------------------------------------------------------
interface StatCardProps {
  title: string;
  value?: string | number;
  icon: React.ReactNode;
  trend?: number | string;
  trendLabel?: string;
  color?: string;
  subtitle?: string;
  sparkline?: number[];
  alertSubtitle?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendLabel = 'vs yesterday',
  color = DS.orange,
  subtitle,
  sparkline,
  alertSubtitle,
}) => {
  const trendNum = typeof trend === 'string' ? parseFloat(trend) : trend;
  const trendUp = trendNum === undefined || Number.isNaN(Number(trendNum)) ? true : Number(trendNum) >= 0;

  return (
    <Card elevation={0} sx={{ ...cardShell, height: '100%', position: 'relative', overflow: 'hidden' }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              bgcolor: alpha(color, 0.12),
              color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '& svg': { fontSize: 22 },
            }}
          >
            {icon}
          </Box>
          <IconButton size="small" sx={{ color: '#9CA3AF', mt: -0.5, mr: -0.75 }}>
            <MoreHoriz fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: DS.muted, fontFamily: DS.font, mb: 0.5 }}>
              {title}
            </Typography>
            <Typography sx={{ fontSize: { xs: '22px', md: '26px' }, fontWeight: 800, color: DS.text, fontFamily: DS.heading, letterSpacing: '-0.03em', lineHeight: 1.15, mb: 0.75 }}>
              {value}
            </Typography>
            {trend !== undefined && trend !== null && String(trend) !== '' && !Number.isNaN(Number(trendNum)) ? (
              <Typography
                sx={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: trendUp ? DS.green : DS.red,
                  fontFamily: DS.font,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.35,
                }}
              >
                <TrendingUp sx={{ fontSize: 14, transform: trendUp ? 'none' : 'rotate(180deg)' }} />
                {`${trendUp ? '' : ''}${Math.abs(Number(trendNum))}% ${trendLabel}`}
              </Typography>
            ) : subtitle ? (
              <Typography
                sx={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: alertSubtitle ? DS.red : DS.muted,
                  fontFamily: DS.font,
                }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {sparkline && <MiniSparkline values={sparkline} color={color} />}
        </Box>
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// OrdersChart – Business Overview area chart
// ---------------------------------------------------------------------------
interface OrdersChartProps {
  data: { hour: number; count: number }[];
  formatValue?: (v: number) => string;
}

const formatHourLabel = (hour: number) => {
  const h = Number(hour) % 24;
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
};

const OrdersChart: React.FC<OrdersChartProps> = ({ data, formatValue }) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const chartData = (data || []).map((d) => ({
    ...d,
    label: formatHourLabel(d.hour),
  }));

  return (
    <ResponsiveContainer width="100%" height={isXs ? 220 : 280}>
      <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="bizOverviewGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={DS.orange} stopOpacity={0.35} />
            <stop offset="100%" stopColor={DS.orange} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={DS.border} strokeDasharray="4 6" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          tick={{ fill: DS.muted, fontSize: 11, fontFamily: DS.font }}
          minTickGap={28}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={44}
          tick={{ fill: DS.muted, fontSize: 11, fontFamily: DS.font }}
          tickFormatter={(v) => (formatValue ? formatValue(Number(v)) : String(v))}
        />
        <Tooltip
          cursor={{ stroke: DS.border, strokeWidth: 1 }}
          contentStyle={{
            background: '#111827',
            borderRadius: 10,
            border: 'none',
            color: '#fff',
            fontSize: 12,
            padding: '8px 12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            fontFamily: DS.font,
          }}
          labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}
          formatter={(value: any) => [formatValue ? formatValue(Number(value)) : `${value} Orders`, '']}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={DS.orange}
          strokeWidth={3}
          fill="url(#bizOverviewGradient)"
          dot={false}
          activeDot={{ r: 6, fill: DS.orange, stroke: '#fff', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};









// ---------------------------------------------------------------------------
// DashboardPage – main page component
// ---------------------------------------------------------------------------
const DashboardPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { formatCurrency } = useSettings();
  const theme = useTheme();
  const navigate = useNavigate();
  const { getRelativePath } = useActiveTenant();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // "My Usage" dialog — this month's consumption against the plan's limits.
  const [usageOpen, setUsageOpen] = useState(false);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<any>(null);

  const [inventoryCount, setInventoryCount] = useState<number>(0);
  const [pendingPOs, setPendingPOs] = useState<number>(0);
  const [activeBookings, setActiveBookings] = useState<number>(0);
  const [lowStockItems, setLowStockItems] = useState<number>(0);
  // Items standing below their reorder level. Drives the persistent warning
  // banner, which stays up until the stock is actually refilled.
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [stockAlertsExpanded, setStockAlertsExpanded] = useState(false);
  // Only the roles that can act on a shortage see the warning. The endpoint
  // enforces this too, so this check just avoids a pointless 403 on every load.
  const canSeeStockAlerts = hasRole(['admin', 'manager']);
  const criticalStockCount = stockAlerts.filter(
    (item: any) => item?.lowStockAlert?.level === 'critical',
  ).length;
  const [assetInsights, setAssetInsights] = useState<any>(null);
  const [assetAlertsExpanded, setAssetAlertsExpanded] = useState(false);
  const fetchRequestId = React.useRef(0);
  const [assetTabValue, setAssetTabValue] = useState(0);
  const [assetTabData, setAssetTabData] = useState<any>({ data: [], total: 0, page: 1, loading: false });
  const [completionDialog, setCompletionDialog] = useState({
    open: false,
    type: 'service' as 'service' | 'renewal',
    assetId: '',
    assetName: '',
    date: new Date().toISOString().split('T')[0],
    cost: 0
  });
  const [overviewMetric, setOverviewMetric] = useState<'sales' | 'orders'>('sales');

  const fetchDashboardData = async (isSilent = false) => {
    if (timeRange === 'custom' && (!startDate || !endDate)) return;
    if (loading && fetchRequestId.current > 0) return; // Basic entry guard
    
    const requestId = ++fetchRequestId.current;
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const params: any = { range: timeRange };
      if (timeRange === 'custom') {
        if (!startDate || !endDate) return;
        const [sY, sM, sD] = startDate.split('-').map(Number);
        const [eY, eM, eD] = endDate.split('-').map(Number);
        params.startDate = new Date(sY, sM - 1, sD, 0, 0, 0, 0).toISOString();
        params.endDate = new Date(eY, eM - 1, eD, 23, 59, 59, 999).toISOString();
      }

      const promises: Promise<any>[] = [
        reportsAPI.getDashboard(params),
        billingAPI.status().catch((e) => { console.warn('[Dashboard] Billing check:', e?.message); return null; }),
        inventoryAPI.getAll().catch((e) => { console.warn('[Dashboard] Inventory fetch:', e?.message); return null; }),
        canSeeStockAlerts ? purchaseOrdersAPI.getAll({ status: 'Pending' }).catch((e) => { console.warn('[Dashboard] PO fetch:', e?.message); return null; }) : Promise.resolve(null),
        bookingsAPI.getAll().catch((e) => { console.warn('[Dashboard] Bookings fetch:', e?.message); return null; }),
        reportsAPI.getBestSellingItems(params).catch((e) => { console.warn('[Dashboard] Best selling fetch:', e?.message); return null; }),
        reportsAPI.getOrdersByType(params).catch((e) => { console.warn('[Dashboard] Orders by type fetch:', e?.message); return null; }),
        canSeeStockAlerts ? assetsAPI.getInsights().catch((e) => { console.warn('[Dashboard] Assets fetch:', e?.message); return null; }) : Promise.resolve(null),
        canSeeStockAlerts ? inventoryAPI.getLowStockAlerts().catch((e) => { console.warn('[Dashboard] Stock alerts fetch:', e?.message); return null; }) : Promise.resolve(null),
      ];

      const results = await Promise.allSettled(promises);
      if (requestId !== fetchRequestId.current) return; // Ignore stale request

      const [dashboardRes, billingRes, inventoryRes, poRes, bookingsRes, bestSellingRes, ordersByTypeRes, assetsRes, stockAlertsRes] = results;

      const unwrapData = (res: any) => {
        if (!res) return null;
        if (res.status === 'fulfilled') return res.value?.data ?? res.value;
        if (res.status === 'rejected') {
          console.warn('[Dashboard] Partial metric rejected:', res.reason?.message || res.reason);
          return null;
        }
        return res?.data ?? res;
      };

      const dashboardDataActual = unwrapData(dashboardRes);
      const billingData = unwrapData(billingRes);
      const bestSellingData = unwrapData(bestSellingRes);
      const ordersByTypeData = unwrapData(ordersByTypeRes);
      const assetsData = unwrapData(assetsRes);

      setDashboardData({
        ...(dashboardDataActual || {}),
        bestSellingItems: Array.isArray(bestSellingData) ? bestSellingData : (Array.isArray(bestSellingData?.items) ? bestSellingData.items : []),
        ordersByType: Array.isArray(ordersByTypeData) ? ordersByTypeData : (Array.isArray(ordersByTypeData?.items) ? ordersByTypeData.items : []),
        subscriptionStatus: billingData?.status || 'active',
      });

      setAssetInsights(assetsData);

      // Process Inventory for low stock
      const inventoryData = unwrapData(inventoryRes);
      const inventoryItems = Array.isArray(inventoryData?.items) ? inventoryData.items : (Array.isArray(inventoryData) ? inventoryData : []);
      setInventoryCount(inventoryItems.length);

      // Prefer the server's persisted alert state — it applies the same reorder
      // threshold the notifications were raised against. The client-side count
      // is only a fallback for when that call failed.
      const alertsData = unwrapData(stockAlertsRes);
      const alertItems = Array.isArray(alertsData?.items) ? alertsData.items : null;

      if (alertItems) {
        setStockAlerts(alertItems);
        setLowStockItems(alertsData?.counts?.total ?? alertItems.length);
      } else {
        setStockAlerts([]);
        setLowStockItems(inventoryItems.filter((i: any) => i && i.currentStock <= (i.minimumStockLevel || i.minimumStock || 0)).length);
      }

      // Process Pending POs
      const poData = unwrapData(poRes);
      setPendingPOs(poData?.total || (Array.isArray(poData) ? poData.length : 0));

      // Process Bookings (Today's active)
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const rawBookings = unwrapData(bookingsRes);
      const bookingsData = Array.isArray(rawBookings)
        ? rawBookings
        : (Array.isArray(rawBookings?.items) ? rawBookings.items : []);

      const todaysBookings = bookingsData.filter((b: any) => {
        if (!b || !b.bookingDate) return false;
        const bDate = new Date(b.bookingDate);
        const bDateUTC = bDate.toISOString().split('T')[0];
        const bDateLocal = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}-${String(bDate.getDate()).padStart(2, '0')}`;
        return (bDateUTC === todayStr || bDateLocal === todayStr) && b.status !== 'cancelled';
      });

      setActiveBookings(todaysBookings.length);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      if (requestId === fetchRequestId.current) {
        if (!isSilent) {
          setLoading(false);
        }
      }
    }
  };

  // Pulls this month's usage vs. the tenant's plan limits for the "My Usage"
  // dialog. Fetched on open rather than with the dashboard so we don't pay for
  // it on every refresh.
  const fetchUsage = async () => {
    setUsageLoading(true);
    setUsageError(null);
    try {
      const res = await subscriptionAPI.getUsage();
      setUsageData(res.data);
    } catch (error: any) {
      console.error('Error fetching subscription usage:', error);
      setUsageError(error?.response?.data?.message || 'Unable to load usage details');
    } finally {
      setUsageLoading(false);
    }
  };

  const handleOpenUsage = () => {
    setUsageOpen(true);
    fetchUsage();
  };

  const fetchAssetTabData = async (status: string, page: number) => {
    setAssetTabData((prev: any) => ({ ...prev, loading: true }));
    try {
      const res = await assetsAPI.getAll({ status, page, limit: 5 });
      setAssetTabData({
        data: res.data.data,
        total: res.data.total,
        page: res.data.page,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching asset tab data:', error);
      setAssetTabData((prev: any) => ({ ...prev, loading: false }));
    }
  };

  const handleCompleteAction = async () => {
    try {
      if (completionDialog.type === 'service') {
        await assetsAPI.completeService(completionDialog.assetId, { date: completionDialog.date, cost: completionDialog.cost });
      } else {
        await assetsAPI.completeRenewal(completionDialog.assetId, { date: completionDialog.date, cost: completionDialog.cost });
      }
      toast.success(`${completionDialog.type === 'service' ? 'Service' : 'Renewal'} recorded successfully`);
      setCompletionDialog({ ...completionDialog, open: false });

      // Refresh both insights and current tab data
      fetchDashboardData(true);
      const statuses = ['expired', 'expiring', 'service_due', 'upcoming_service', 'renewal_due'];
      fetchAssetTabData(statuses[assetTabValue], assetTabData.page);
    } catch (error) {
      toast.error('Failed to record completion');
    }
  };

  // Kept up to date every render so the mount-only effect below always calls
  // the latest closure (current timeRange/startDate/endDate) without having to
  // tear down and re-register the interval/listeners on every filter change.
  const fetchDashboardDataRef = useRef(fetchDashboardData);
  fetchDashboardDataRef.current = fetchDashboardData;

  // Refetch whenever the selected range changes.
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, startDate, endDate]);

  // Poll + realtime listeners: registered once on mount, not on every filter change.
  useEffect(() => {
    const interval = setInterval(() => fetchDashboardDataRef.current(true), 30000);

    const handleRealtimeUpdate = () => {
      fetchDashboardDataRef.current(true);
    };

    window.addEventListener('newOrder', handleRealtimeUpdate);
    window.addEventListener('orderStatusUpdate', handleRealtimeUpdate);
    window.addEventListener('bookingUpdate', handleRealtimeUpdate);
    window.addEventListener('dashboardRefetch', handleRealtimeUpdate);
    // Raise the banner as soon as a shortage is announced, rather than waiting
    // for the next poll.
    window.addEventListener('inventoryStockAlert', handleRealtimeUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('newOrder', handleRealtimeUpdate);
      window.removeEventListener('orderStatusUpdate', handleRealtimeUpdate);
      window.removeEventListener('bookingUpdate', handleRealtimeUpdate);
      window.removeEventListener('dashboardRefetch', handleRealtimeUpdate);
      window.removeEventListener('inventoryStockAlert', handleRealtimeUpdate);
    };
  }, []);

  useEffect(() => {
    const statuses = ['expired', 'expiring', 'service_due', 'upcoming_service', 'renewal_due'];
    fetchAssetTabData(statuses[assetTabValue], 1);
  }, [assetTabValue]);

  const getAssetIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'vehicle': return <DirectionsCarIcon />;
      case 'document': return <DescriptionIcon />;
      case 'license': return <BadgeIcon />;
      case 'gadget': return <DevicesIcon />;
      case 'equipment': return <BuildIcon />;
      default: return <Inventory2OutlinedIcon />;
    }
  };

  const navTo = (path: string) => {
    navigate(getRelativePath(path));
  };

  // ✅ Create Top 10 Best Selling Items (Sorted by Quantity)
  // const topTenItems =
  //   (dashboardData?.bestSellingItems || [])
  //     .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
  //     .slice(0, 10);






  // ✅ Orders by type from backend
  const normalizedOrders = Array.isArray(dashboardData?.ordersByType)
    ? dashboardData.ordersByType
    : [];

  // ✅ Total orders count for percentage bars
  const totalOrdersAll = normalizedOrders.reduce(
    (sum: number, o: any) => sum + (o?.totalOrders || 0),
    0
  );

  const currentRevenue = dashboardData?.summary?.totalRevenue || 0;
  const previousRevenue = dashboardData?.summary?.previousRevenue || 0;

  const currentOrders = totalOrdersAll || 0;
  const previousOrders = dashboardData?.summary?.previousOrders || 0;

  const revenueTrend = previousRevenue
    ? (((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1)
    : 0;

  const ordersTrend = previousOrders
    ? (((currentOrders - previousOrders) / previousOrders) * 100).toFixed(1)
    : 0;

  // const pieDataRaw = topTenItems.slice(0, 10);


  // const pieData =
  //   pieDataRaw.length === 1
  //     ? [
  //       pieDataRaw[0],
  //       { itemName: "__dummy__", totalQuantity: 0.0001 }
  //     ]
  //     : pieDataRaw;
  // const hasBookings = pieData.length > 0 && pieData.some(i => i.totalQuantity > 0);

  // const ORDER_TYPES = [
  //   "dine_in",
  //   "takeaway",
  //   "delivery",
  //   "global_dinein",
  //   "global_delivery"
  // ];

  // const ordersByTypeMap = Object.fromEntries(
  //   (dashboardData?.ordersByType || []).map((o: any) => [o.orderType, o.totalOrders])
  // );

  // const normalizedOrders = ORDER_TYPES
  //   .map(type => ({
  //     orderType: type,
  //     totalOrders: ordersByTypeMap[type] || 0
  //   }))
  //   .filter(o => o.totalOrders > 0);   // ⭐ removes empty ones

  // const totalOrdersAll = normalizedOrders.reduce(
  //   (sum, o) => sum + o.totalOrders,
  //   0
  // );

  // ✅ Backend-driven chart data
  // ✅ Get Top 10 Best Selling Items
  const pieData =
    Array.isArray(dashboardData?.bestSellingItems)
      ? [...dashboardData.bestSellingItems]
        .sort((a: any, b: any) => (b.totalQuantity || 0) - (a.totalQuantity || 0))
        .slice(0, 10)
      : [];

  const safePieData = pieData.filter(
    (i: any) => Number(i?.totalQuantity) > 0
  );
  const hasBookings = safePieData.length > 0;

  const displayName =
    (user as any)?.firstName ||
    (typeof (user as any)?.name === 'string' ? String((user as any).name).split(' ')[0] : '') ||
    (typeof (user as any)?.email === 'string' ? String((user as any).email).split('@')[0] : '') ||
    'there';
  const hourNow = new Date().getHours();
  const greeting = hourNow < 12 ? 'Good morning' : hourNow < 17 ? 'Good afternoon' : 'Good evening';
  const sparkValues = (dashboardData?.hourlyDistribution || []).map((d: any) => Number(d.count || 0));
  const occupiedTables = dashboardData?.tables?.occupied || 0;
  const totalTables = dashboardData?.tables?.total || 0;
  const occupancyPct = totalTables ? Math.round((occupiedTables / totalTables) * 100) : 0;
  const cateringOrders =
    normalizedOrders.find((o: any) => String(o.orderType || o.label || '').toLowerCase().includes('catering'))?.totalOrders ||
    dashboardData?.summary?.ordersByType?.find((o: any) => o.orderType === 'catering')?.totalOrders ||
    0;
  const avgOrderValue = currentOrders > 0 ? currentRevenue / currentOrders : 0;
  const overviewChartData = (dashboardData?.hourlyDistribution || []).map((d: any) => ({
    hour: d.hour,
    count: overviewMetric === 'sales' ? Number(d.count || 0) * avgOrderValue : Number(d.count || 0),
  }));
  const bestSellerMax = Math.max(...safePieData.map((i: any) => Number(i.totalQuantity || 0)), 1);

  const recentAlertItems = useMemo(() => {
    const items: Array<{ id: string; title: string; desc: string; time: string; tone: string; onClick: () => void }> = [];
    (stockAlerts || []).slice(0, 3).forEach((item: any, idx: number) => {
      items.push({
        id: `stock-${item._id || idx}`,
        title: item?.lowStockAlert?.level === 'critical' ? 'Critical Stock' : 'Low Stock',
        desc: `${item.name} — ${item.currentStock} ${item.unit || ''} left`.trim(),
        time: 'Now',
        tone: item?.lowStockAlert?.level === 'critical' ? DS.red : DS.orange,
        onClick: () => navTo('/inventory'),
      });
    });
    const expiredList = Array.isArray(assetInsights?.expired) ? assetInsights.expired : [];
    const renewalList = Array.isArray(assetInsights?.renewalDue) ? assetInsights.renewalDue : [];
    expiredList.slice(0, 2).forEach((a: any, idx: number) => {
      items.push({
        id: `exp-${a._id || idx}`,
        title: 'Document Expired',
        desc: a.name || 'Asset expired',
        time: 'Today',
        tone: DS.red,
        onClick: () => navTo('/assets'),
      });
    });
    renewalList.slice(0, 2).forEach((a: any, idx: number) => {
      items.push({
        id: `ren-${a._id || idx}`,
        title: 'Renewal Due',
        desc: a.name || 'Renewal overdue',
        time: 'Soon',
        tone: DS.gold,
        onClick: () => navTo('/assets'),
      });
    });
    if ((assetInsights?.summary?.expiringSoon || 0) > 0 && items.length < 4) {
      items.push({
        id: 'expiring-soon',
        title: 'Expiring Soon',
        desc: `${assetInsights.summary.expiringSoon} asset(s) need attention`,
        time: 'Soon',
        tone: DS.blue,
        onClick: () => navTo('/assets'),
      });
    }
    return items.slice(0, 4);
  }, [stockAlerts, assetInsights]);

  if (loading && !dashboardData) {
    return <DashboardSkeleton />;
  }



  return (
    <Box
      sx={{
        position: 'relative',
        maxWidth: 1440,
        mx: 'auto',
        px: { xs: 1.5, sm: 2.5, md: 3 },
        py: { xs: 2, md: 3 },
        bgcolor: DS.page,
        minHeight: '100%',
        fontFamily: DS.font,
      }}
    >
      {loading && dashboardData && (
        <LinearProgress
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            bgcolor: 'transparent',
            zIndex: 10,
            '& .MuiLinearProgress-bar': { bgcolor: DS.orange },
          }}
        />
      )}

      <PendingActionsCard />

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: DS.heading,
              fontWeight: 800,
              fontSize: { xs: '24px', md: '28px' },
              color: DS.text,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
            }}
          >
            {greeting}, {displayName}!
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: '14px', color: DS.muted, fontFamily: DS.font }}>
            Here&apos;s what&apos;s happening with your business today.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DonutLargeIcon sx={{ fontSize: 18 }} />}
            onClick={handleOpenUsage}
            sx={{
              textTransform: 'none',
              borderRadius: '10px',
              borderColor: DS.border,
              color: DS.text,
              fontWeight: 600,
              fontFamily: DS.font,
              bgcolor: '#fff',
              px: 1.5,
              '&:hover': { borderColor: '#D1D5DB', bgcolor: '#F9FAFB' },
            }}
          >
            My Usage
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={
              <Refresh
                sx={{
                  fontSize: 18,
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
            }
            onClick={() => fetchDashboardData()}
            disabled={loading}
            sx={{
              textTransform: 'none',
              borderRadius: '10px',
              borderColor: DS.border,
              color: DS.text,
              fontWeight: 600,
              fontFamily: DS.font,
              bgcolor: '#fff',
              px: 1.75,
              '&:hover': { borderColor: '#D1D5DB', bgcolor: '#F9FAFB' },
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add sx={{ fontSize: 18 }} />}
            onClick={() => navTo('/pos')}
            sx={{
              textTransform: 'none',
              borderRadius: '10px',
              bgcolor: DS.orange,
              fontWeight: 700,
              fontFamily: DS.font,
              px: 2,
              boxShadow: '0 8px 18px rgba(255,107,53,0.28)',
              '&:hover': { bgcolor: '#E85A24' },
            }}
          >
            New Order
          </Button>
        </Stack>
      </Box>

      {/* Filters row — keep existing range controls */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.25,
          mb: 2.5,
        }}
      >
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(_, v) => {
            if (v) {
              setTimeRange(v);
              if (v === 'custom' && (!startDate || !endDate)) {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const formatDateInput = (d: Date) => {
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${y}-${m}-${day}`;
                };
                setStartDate(formatDateInput(firstDay));
                setEndDate(formatDateInput(now));
              }
            }
          }}
          size="small"
          sx={{
            bgcolor: '#fff',
            borderRadius: '10px',
            border: `1px solid ${DS.border}`,
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13px',
              fontFamily: DS.font,
              px: 1.5,
              border: 0,
              color: DS.muted,
              '&.Mui-selected': {
                bgcolor: alpha(DS.orange, 0.12),
                color: DS.orange,
                '&:hover': { bgcolor: alpha(DS.orange, 0.18) },
              },
            },
          }}
        >
          <ToggleButton value="today">Today</ToggleButton>
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
          <ToggleButton value="custom">Custom</ToggleButton>
        </ToggleButtonGroup>

        {timeRange === 'custom' && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              type="date"
              size="small"
              value={startDate}
              onChange={(e) => {
                const nextStart = e.target.value;
                setStartDate(nextStart);
                if (endDate && nextStart > endDate) setEndDate(nextStart);
              }}
              inputProps={{ max: endDate || undefined }}
              sx={{ width: 150, bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <Typography variant="body2" color="text.secondary">-</Typography>
            <TextField
              type="date"
              size="small"
              value={endDate}
              onChange={(e) => {
                const nextEnd = e.target.value;
                setEndDate(nextEnd);
                if (startDate && nextEnd < startDate) setStartDate(nextEnd);
              }}
              inputProps={{ min: startDate || undefined }}
              sx={{ width: 150, bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </Box>
        )}
      </Box>

      {/* Order type + status chips (existing flow) */}
      <Box sx={{ mb: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {(() => {
          const aggregatedCounts: Record<string, {
            label: string,
            count: number,
            color: string,
            statuses: { [key: string]: number }
          }> = {};

          normalizedOrders.forEach((o: any) => {
            if (!o.orderType) return;
            const key = o.orderType.toLowerCase().replace(/_/g, ' ');
            if (!aggregatedCounts[key]) {
              let label = key.replace(/\b\w/g, (c: string) => c.toUpperCase());
              let color = 'info';
              if (key === 'dine in') { label = 'Dine In'; color = 'info'; }
              else if (key === 'takeaway') { label = 'Takeaway'; color = 'info'; }
              else if (key === 'delivery') { label = 'Delivery'; color = 'success'; }
              else if (key === 'pre order') { label = 'Pre Order'; color = 'warning'; }
              else if (key === 'catering') { label = 'Catering'; color = 'error'; }
              else if (key.includes('delivery')) { color = 'success'; }
              else if (key.includes('pre')) { color = 'warning'; }
              aggregatedCounts[key] = {
                label,
                count: 0,
                color,
                statuses: {
                  pending: 0, confirmed: 0, preparing: 0, inProgress: 0, ready: 0, approved: 0,
                  served: 0, completed: 0, readyToTakeaway: 0, readyToPickup: 0, onTheWay: 0, delivered: 0,
                },
              };
            }
            aggregatedCounts[key].count += (o.totalOrders || 0);
            if (o.pendingOrders) aggregatedCounts[key].statuses.pending += o.pendingOrders;
            if (o.confirmedOrders) aggregatedCounts[key].statuses.confirmed += o.confirmedOrders;
            if (o.preparingOrders) aggregatedCounts[key].statuses.preparing += o.preparingOrders;
            if (o.inProgressOrders) aggregatedCounts[key].statuses.inProgress += o.inProgressOrders;
            if (o.readyOrders) aggregatedCounts[key].statuses.ready += o.readyOrders;
            if (o.approvedOrders) aggregatedCounts[key].statuses.approved += o.approvedOrders;
            if (o.servedOrders) aggregatedCounts[key].statuses.served += o.servedOrders;
            if (o.completedOrders) aggregatedCounts[key].statuses.completed += o.completedOrders;
            if (o.readyToTakeawayOrders) aggregatedCounts[key].statuses.readyToTakeaway += o.readyToTakeawayOrders;
            if (o.readyToPickupOrders) aggregatedCounts[key].statuses.readyToPickup += o.readyToPickupOrders;
            if (o.onTheWayOrders) aggregatedCounts[key].statuses.onTheWay += o.onTheWayOrders;
            if (o.deliveredOrders) aggregatedCounts[key].statuses.delivered += o.deliveredOrders;
          });

          return Object.values(aggregatedCounts)
            .filter((type) => type.count > 0)
            .sort((a, b) => b.count - a.count)
            .map((type, i) => {
              const s = type.statuses;
              const statusData = [
                { count: s.pending, label: 'Pending', color: theme.palette.warning.main },
                { count: s.confirmed, label: 'Confirmed', color: theme.palette.info.main },
                { count: s.approved, label: 'Approved', color: theme.palette.info.main },
                { count: s.preparing, label: 'Preparing', color: theme.palette.secondary.main },
                { count: s.inProgress, label: 'In Progress', color: theme.palette.secondary.main },
                { count: s.ready, label: 'Ready', color: theme.palette.primary.main },
                { count: s.served, label: 'Served', color: theme.palette.success.main },
                { count: s.readyToTakeaway, label: 'Ready to Takeaway', color: theme.palette.primary.main },
                { count: s.readyToPickup, label: 'Ready to Pickup', color: theme.palette.primary.main },
                { count: s.onTheWay, label: 'On the Way', color: theme.palette.warning.main },
                { count: s.delivered, label: 'Delivered', color: theme.palette.success.main },
                { count: s.completed, label: 'Completed', color: theme.palette.success.main },
              ].filter((st) => st.count > 0);

              const tooltipContent = statusData.length > 0 ? (
                <Box sx={{ p: 0.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {statusData.map((st, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: st.color }} />
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                        {st.count} {st.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ fontSize: '0.75rem', p: 0.5 }}>No active status details</Typography>
              );

              return (
                <MuiTooltip key={i} title={tooltipContent} arrow placement="top">
                  <Chip
                    label={`${type.label}: ${type.count}`}
                    size="small"
                    sx={{
                      bgcolor: alpha((theme.palette as any)[type.color]?.main || theme.palette.info.main, 0.1),
                      color: (theme.palette as any)[type.color]?.dark || theme.palette.info.dark,
                      fontWeight: 600,
                      borderRadius: '8px',
                      cursor: 'help',
                    }}
                  />
                </MuiTooltip>
              );
            });
        })()}
      </Box>

      <Box sx={{ mb: 2.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {(() => {
          const s = dashboardData?.summary || {};
          const globalStatusData = [
            { count: s.pendingOrders || 0, label: 'Pending', color: theme.palette.warning.main },
            { count: s.confirmedOrders || 0, label: 'Confirmed', color: theme.palette.info.main },
            { count: s.approvedOrders || 0, label: 'Approved', color: theme.palette.info.main },
            { count: s.preparingOrders || 0, label: 'Preparing', color: theme.palette.secondary.main },
            { count: s.inProgressOrders || 0, label: 'In Progress', color: theme.palette.secondary.main },
            { count: s.readyOrders || 0, label: 'Ready', color: theme.palette.primary.main },
            { count: s.servedOrders || 0, label: 'Served', color: theme.palette.success.main },
            { count: s.readyToTakeawayOrders || 0, label: 'Ready to Takeaway', color: theme.palette.primary.main },
            { count: s.readyToPickupOrders || 0, label: 'Ready to Pickup', color: theme.palette.primary.main },
            { count: s.onTheWayOrders || 0, label: 'On the Way', color: theme.palette.warning.main },
            { count: s.deliveredOrders || 0, label: 'Delivered', color: theme.palette.success.main },
            { count: s.completedOrders || 0, label: 'Completed', color: theme.palette.success.main },
          ].filter((st) => st.count > 0);

          if (globalStatusData.length === 0) return null;

          return globalStatusData.map((st, i) => (
            <Chip
              key={i}
              icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: st.color, ml: 1 }} />}
              label={`${st.label}: ${st.count}`}
              size="small"
              sx={{
                bgcolor: alpha(st.color, 0.1),
                color: st.color,
                fontWeight: 700,
                borderRadius: '8px',
                border: `1px solid ${alpha(st.color, 0.2)}`,
                '& .MuiChip-label': { px: 1.5 },
              }}
            />
          ));
        })()}
      </Box>

      {/* Asset expiry banner — mockup style */}
      {canSeeStockAlerts && ((assetInsights?.summary?.expired || 0) + (assetInsights?.summary?.renewalDue || 0)) > 0 && (
        <Box
          sx={{
            mb: 2.5,
            px: 2,
            py: 1.5,
            borderRadius: '14px',
            bgcolor: '#FFF5F5',
            border: '1px solid #FECACA',
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <WarningAmberRounded sx={{ color: DS.red, fontSize: 22, mt: { xs: 0.25, sm: 0 } }} />
          <Box
            sx={{ flex: 1, minWidth: 200, cursor: 'pointer' }}
            onClick={() => setAssetAlertsExpanded((prev) => !prev)}
          >
            <Typography sx={{ fontWeight: 700, fontSize: '14px', color: DS.text, fontFamily: DS.heading }}>
              {(assetInsights?.summary?.expired || 0) > 0
                ? `${assetInsights.summary.expired} document${assetInsights.summary.expired === 1 ? '' : 's'}/asset${assetInsights.summary.expired === 1 ? '' : 's'} expired`
                : `${assetInsights?.summary?.renewalDue || 0} renewal${(assetInsights?.summary?.renewalDue || 0) === 1 ? '' : 's'} overdue`}
            </Typography>
            <Typography sx={{ fontSize: '12.5px', color: DS.muted, mt: 0.25 }}>
              {(assetInsights?.summary?.renewalDue || 0) > 0 && (assetInsights?.summary?.expired || 0) > 0
                ? `Also ${assetInsights.summary.renewalDue} renewal overdue. `
                : ''}
              This warning stays until the item is renewed or its expiry is updated.
            </Typography>
          </Box>
          <Button
            size="small"
            endIcon={assetAlertsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setAssetAlertsExpanded((prev) => !prev)}
            sx={{ textTransform: 'none', fontWeight: 700, color: DS.red, fontFamily: DS.font }}
          >
            Review
          </Button>
          <Button
            size="small"
            onClick={() => navTo('/assets')}
            sx={{ textTransform: 'none', fontWeight: 600, color: DS.muted }}
          >
            Open Assets
          </Button>
          <Collapse in={assetAlertsExpanded} sx={{ width: '100%' }}>
            <Typography sx={{ fontSize: '12.5px', color: DS.muted, mt: 1, pl: 4.5 }}>
              See the full list in Asset Lifecycle Management below, or open the Asset Module.
            </Typography>
          </Collapse>
        </Box>
      )}

      {/* Low stock banner */}
      {canSeeStockAlerts && stockAlerts.length > 0 && (
        <Alert
          severity={criticalStockCount > 0 ? 'error' : 'warning'}
          icon={<ReportProblemOutlinedIcon />}
          sx={{
            mb: 2.5,
            borderRadius: '14px',
            alignItems: 'flex-start',
            '& .MuiAlert-message': { flex: 1, minWidth: 0 },
          }}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <Button size="small" color="inherit" onClick={() => navTo('/inventory')} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                Restock
              </Button>
              <IconButton
                size="small"
                color="inherit"
                onClick={() => setStockAlertsExpanded((prev) => !prev)}
                aria-label={stockAlertsExpanded ? 'Hide affected items' : 'Show affected items'}
              >
                {stockAlertsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Stack>
          }
        >
          <Box
            role="button"
            tabIndex={0}
            aria-expanded={stockAlertsExpanded}
            onClick={() => setStockAlertsExpanded((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStockAlertsExpanded((prev) => !prev);
              }
            }}
            sx={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <AlertTitle sx={{ fontWeight: 700, mb: 0.5 }}>
              {criticalStockCount > 0
                ? `${criticalStockCount} item${criticalStockCount === 1 ? '' : 's'} at critical stock`
                : `${stockAlerts.length} item${stockAlerts.length === 1 ? '' : 's'} running low`}
            </AlertTitle>
            <Typography variant="body2" sx={{ mb: stockAlertsExpanded ? 1 : 0 }}>
              {criticalStockCount > 0 && stockAlerts.length > criticalStockCount
                ? `Also ${stockAlerts.length - criticalStockCount} more running low. `
                : ''}
              This warning stays until the stock is refilled.
            </Typography>
          </Box>
          <Collapse in={stockAlertsExpanded}>
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {stockAlerts.map((item: any) => {
                const isCritical = item?.lowStockAlert?.level === 'critical';
                return (
                  <Box key={item._id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.name}
                      {item.sku ? (
                        <Typography component="span" variant="caption" sx={{ ml: 1, opacity: 0.75 }}>{item.sku}</Typography>
                      ) : null}
                    </Typography>
                    <Chip
                      size="small"
                      color={isCritical ? 'error' : 'warning'}
                      variant={isCritical ? 'filled' : 'outlined'}
                      label={`${isCritical ? 'Critical' : 'Low'} · ${item.currentStock} ${item.unit || ''} left · reorder at ${item.reorderLevel || item.minimumStock || 0}`}
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Collapse>
        </Alert>
      )}

      {/* KPI row — 4 cards matching mockup */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title={timeRange === 'today' ? "Today's Sales" : timeRange === 'week' ? "This Week's Sales" : "This Month's Sales"}
            value={formatCurrency(currentRevenue)}
            icon={<BarChart />}
            color={DS.orange}
            trend={Number(revenueTrend)}
            sparkline={sparkValues}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Total Orders"
            value={totalOrdersAll || 0}
            icon={<ReceiptLongIcon />}
            color={DS.pink}
            trend={Number(ordersTrend)}
            sparkline={sparkValues}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Table Occupancy"
            value={`${occupancyPct}%`}
            icon={<EventSeatIcon />}
            color={DS.green}
            subtitle={`${occupiedTables} / ${totalTables} tables`}
            sparkline={sparkValues}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Inventory Items"
            value={inventoryCount}
            icon={<Inventory2OutlinedIcon />}
            color={DS.blue}
            subtitle={`${lowStockItems} Low Stock Alerts`}
            alertSubtitle={lowStockItems > 0}
            sparkline={sparkValues}
          />
        </Grid>
      </Grid>

      {/* Middle row: Business Overview | Today's Summary | Recent Alerts */}
      <Grid container spacing={2} sx={{ mb: 2.5 }} alignItems="stretch">
        <Grid item xs={12} lg={6}>
          <Card elevation={0} sx={{ ...cardShell, height: '100%' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px', color: DS.text }}>
                  Business Overview
                </Typography>
                <Select
                  size="small"
                  value={overviewMetric}
                  onChange={(e) => setOverviewMetric(e.target.value as 'sales' | 'orders')}
                  IconComponent={KeyboardArrowDown}
                  sx={{
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: DS.font,
                    borderRadius: '10px',
                    bgcolor: '#F9FAFB',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: DS.border },
                    height: 34,
                    minWidth: 96,
                  }}
                >
                  <MenuItem value="sales">Sales</MenuItem>
                  <MenuItem value="orders">Orders</MenuItem>
                </Select>
              </Box>
              <OrdersChart
                data={overviewChartData}
                formatValue={overviewMetric === 'sales' ? (v) => formatCurrency(v) : (v) => String(Math.round(v))}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card elevation={0} sx={{ ...cardShell, height: '100%' }}>
            <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
              <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px', color: DS.text, mb: 1.75 }}>
                Today&apos;s Summary
              </Typography>
              <Stack spacing={1.1}>
                {[
                  {
                    title: 'Pending POS',
                    sub: 'Requires Approval',
                    value: pendingPOs,
                    icon: <AssignmentLateOutlinedIcon sx={{ fontSize: 18 }} />,
                    color: DS.red,
                    soft: '#FEF2F2',
                    path: '/purchase-orders',
                  },
                  {
                    title: "Today's Bookings",
                    sub: 'Reserved Tables',
                    value: activeBookings,
                    icon: <EventAvailableOutlinedIcon sx={{ fontSize: 18 }} />,
                    color: DS.green,
                    soft: DS.greenSoft,
                    path: '/bookings',
                  },
                  {
                    title: 'Kitchen Orders',
                    sub: 'Pending Preparation',
                    value: dashboardData?.kitchenOrders || 0,
                    icon: <RestaurantMenuOutlinedIcon sx={{ fontSize: 18 }} />,
                    color: DS.blue,
                    soft: DS.blueSoft,
                    path: '/kitchen',
                  },
                  {
                    title: 'Catering Orders',
                    sub: 'Total Catering',
                    value: cateringOrders,
                    icon: <RoomServiceOutlinedIcon sx={{ fontSize: 18 }} />,
                    color: DS.pink,
                    soft: DS.pinkSoft,
                    path: '/orders',
                  },
                ].map((row) => (
                  <Box
                    key={row.title}
                    onClick={() => navTo(row.path)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      px: 1.1,
                      py: 1,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      '&:hover': { bgcolor: '#F9FAFB' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        bgcolor: row.soft,
                        color: row.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {row.icon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '13px', fontWeight: 700, color: DS.text, fontFamily: DS.font, lineHeight: 1.2 }}>
                        {row.title}
                      </Typography>
                      <Typography sx={{ fontSize: '11.5px', color: DS.muted }}>{row.sub}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: '15px', fontWeight: 800, color: DS.text, fontFamily: DS.heading, mr: 0.25 }}>
                      {row.value}
                    </Typography>
                    <ChevronRight sx={{ fontSize: 18, color: '#9CA3AF' }} />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card elevation={0} sx={{ ...cardShell, height: '100%' }}>
            <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.75 }}>
                <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px', color: DS.text }}>
                  Recent Alerts
                </Typography>
                <Button
                  size="small"
                  onClick={() => navTo(canSeeStockAlerts ? '/assets' : '/inventory')}
                  sx={{ textTransform: 'none', fontWeight: 700, color: DS.blue, fontSize: '12.5px', minWidth: 0 }}
                >
                  View All
                </Button>
              </Box>

              {recentAlertItems.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <CheckCircle sx={{ color: DS.green, mb: 1 }} />
                  <Typography sx={{ fontSize: '13px', color: DS.muted }}>No alerts right now</Typography>
                </Box>
              ) : (
                <Stack spacing={1.25}>
                  {recentAlertItems.map((alert) => (
                    <Box
                      key={alert.id}
                      onClick={alert.onClick}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.15,
                        cursor: 'pointer',
                        borderRadius: '10px',
                        px: 0.5,
                        py: 0.5,
                        '&:hover': { bgcolor: '#F9FAFB' },
                      }}
                    >
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: '10px',
                          bgcolor: alpha(alert.tone, 0.12),
                          color: alert.tone,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          mt: 0.15,
                        }}
                      >
                        <ReportProblemOutlinedIcon sx={{ fontSize: 18 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: DS.text, lineHeight: 1.25 }}>
                          {alert.title}
                        </Typography>
                        <Typography sx={{ fontSize: '11.5px', color: DS.muted, mt: 0.2 }} noWrap>
                          {alert.desc}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography sx={{ fontSize: '11px', color: DS.muted, mb: 0.5 }}>{alert.time}</Typography>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: alert.tone, ml: 'auto' }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom: Quick Access | Best Sellers */}
      <Grid container spacing={2} sx={{ mb: 2.5 }} alignItems="stretch">
        <Grid item xs={12} lg={7}>
          <Card elevation={0} sx={{ ...cardShell, height: '100%' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px', color: DS.text, mb: 2 }}>
                Quick Access
              </Typography>
              <Grid container spacing={1.5}>
                {[
                  { label: 'New Order', path: '/pos', icon: <PointOfSale />, color: DS.orange, soft: DS.orangeSoft },
                  { label: 'Table Layout', path: '/tables', icon: <TableRestaurant />, color: DS.green, soft: DS.greenSoft },
                  { label: 'KOT', path: '/kot', icon: <ReceiptLong />, color: DS.purple, soft: DS.purpleSoft },
                  { label: 'Inventory', path: '/inventory', icon: <Inventory2 />, color: DS.blue, soft: DS.blueSoft },
                  { label: 'Reports', path: '/reports', icon: <BarChart />, color: DS.gold, soft: DS.goldSoft },
                  { label: 'Customers', path: '/customers', icon: <People />, color: DS.pink, soft: DS.pinkSoft },
                ].map((item) => (
                  <Grid item xs={4} sm={4} md={2} key={item.label}>
                    <Box
                      onClick={() => navTo(item.path)}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        py: 2,
                        px: 1,
                        borderRadius: '14px',
                        bgcolor: item.soft,
                        cursor: 'pointer',
                        border: `1px solid ${alpha(item.color, 0.12)}`,
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: `0 8px 18px ${alpha(item.color, 0.18)}`,
                        },
                      }}
                    >
                      <Box sx={{ color: item.color, display: 'flex', '& svg': { fontSize: 28 } }}>{item.icon}</Box>
                      <Typography sx={{ fontSize: '12px', fontWeight: 700, color: DS.text, textAlign: 'center', fontFamily: DS.font }}>
                        {item.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card elevation={0} sx={{ ...cardShell, height: '100%' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px', color: DS.text }}>
                  Best Sellers
                </Typography>
                <Button
                  size="small"
                  onClick={() => navTo('/reports')}
                  sx={{ textTransform: 'none', fontWeight: 700, color: DS.blue, fontSize: '12.5px', minWidth: 0 }}
                >
                  View All
                </Button>
              </Box>

              {!hasBookings ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography sx={{ fontWeight: 700, color: DS.orange, mb: 0.75 }}>No sales yet</Typography>
                  <Typography sx={{ fontSize: '13px', color: DS.muted }}>
                    Once customers place orders, bestsellers will appear here.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.75}>
                  {safePieData.slice(0, 5).map((item: any, index: number) => {
                    const qty = Number(item.totalQuantity || 0);
                    const revenue = Number(item.totalRevenue || item.revenue || qty * avgOrderValue || 0);
                    const pct = Math.max(8, Math.round((qty / bestSellerMax) * 100));
                    return (
                      <Box key={item.itemName || item._id || index} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Typography sx={{ width: 18, fontSize: '13px', fontWeight: 700, color: DS.muted }}>
                          {index + 1}
                        </Typography>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: alpha(DS.orange, 0.12),
                            color: DS.orange,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                            backgroundImage: item.image || item.itemImage ? `url(${item.image || item.itemImage})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        >
                          {!(item.image || item.itemImage) && <RestaurantMenuOutlinedIcon sx={{ fontSize: 20 }} />}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: DS.text }} noWrap>
                            {item.itemName || item.name || 'Item'}
                          </Typography>
                          <Typography sx={{ fontSize: '11.5px', color: DS.muted, mb: 0.6 }}>
                            {qty} orders
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 6,
                              borderRadius: 99,
                              bgcolor: '#E5E7EB',
                              '& .MuiLinearProgress-bar': { bgcolor: DS.green, borderRadius: 99 },
                            }}
                          />
                        </Box>
                        <Typography sx={{ fontSize: '13.5px', fontWeight: 800, color: DS.text, fontFamily: DS.heading, ml: 1 }}>
                          {formatCurrency(revenue)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Order from breakdown — keep existing analytics */}
      {normalizedOrders.length > 0 && (
        <Card elevation={0} sx={{ ...cardShell, mb: 2.5 }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '16px', color: DS.text, mb: 2 }}>
              Orders by Type
            </Typography>
            <Grid container spacing={2}>
              {normalizedOrders.map((order: any, index: number) => {
                const percentage = totalOrdersAll
                  ? ((order.totalOrders / totalOrdersAll) * 100).toFixed(0)
                  : 0;
                return (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#FFF7F3', border: `1px solid ${alpha(DS.orange, 0.15)}` }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '13.5px', mb: 1, color: DS.text }}>
                        {order.label || order.orderType}
                      </Typography>
                      <Box sx={{ height: 6, borderRadius: 99, bgcolor: '#E5E7EB', overflow: 'hidden', mb: 1 }}>
                        <Box sx={{ width: `${percentage}%`, height: '100%', bgcolor: DS.orange }} />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: '12px', color: DS.muted }}>{percentage}%</Typography>
                        <Typography sx={{ fontSize: '13px', fontWeight: 800 }}>{order.totalOrders}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Asset Lifecycle Management Section */}
      <Box sx={{ mt: 1, mb: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={{ xs: 1.5, sm: 0 }} mb={2.5}>
          <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '18px', color: DS.text }}>
            Asset Lifecycle Management
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navTo('/assets')}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 600,
              borderColor: DS.border,
              color: DS.text,
              bgcolor: '#fff',
            }}
          >
            Go to Asset Module
          </Button>
        </Stack>

        {/* Asset Stat Cards */}
        <Grid container spacing={{ xs: 1.5, sm: 2 }} mb={3}>
          <Grid item xs={6} sm={3}>
            <Card
              onClick={() => setAssetTabValue(0)}
              sx={{
                cursor: 'pointer',
                p: { xs: 1.25, sm: 2 },
                borderRadius: { xs: 6, sm: 3 },
                bgcolor: alpha(theme.palette.error.main, 0.05),
                border: assetTabValue === 0 ? `2px solid ${theme.palette.error.main}` : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: theme.shadows[2] }
              }}
            >
              <Typography variant="caption" color="error" fontWeight="700" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, lineHeight: 1.2, mb: 0.5 }}>EXPIRED</Typography>
              <Typography variant="h4" fontWeight="800" color="error" sx={{ fontSize: { xs: '1.4rem', sm: '2.125rem' } }}>{assetInsights?.summary?.expired || 0}</Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card
              onClick={() => setAssetTabValue(1)}
              sx={{
                cursor: 'pointer',
                p: { xs: 1.25, sm: 2 },
                borderRadius: { xs: 6, sm: 3 },
                bgcolor: alpha(theme.palette.warning.main, 0.05),
                border: assetTabValue === 1 ? `2px solid ${theme.palette.warning.main}` : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: theme.shadows[2] }
              }}
            >
              <Typography variant="caption" color="warning.main" fontWeight="700" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, lineHeight: 1.2, mb: 0.5 }}>EXPIRING SOON</Typography>
              <Typography variant="h4" fontWeight="800" color="warning.main" sx={{ fontSize: { xs: '1.4rem', sm: '2.125rem' } }}>{assetInsights?.summary?.expiringSoon || 0}</Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card
              onClick={() => setAssetTabValue(2)}
              sx={{
                cursor: 'pointer',
                p: { xs: 1.25, sm: 2 },
                borderRadius: { xs: 6, sm: 3 },
                bgcolor: alpha(theme.palette.info.main, 0.05),
                border: assetTabValue === 2 ? `2px solid ${theme.palette.info.main}` : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: theme.shadows[2] }
              }}
            >
              <Typography variant="caption" color="info.main" fontWeight="700" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, lineHeight: 1.2, mb: 0.5 }}>SERVICE DUE</Typography>
              <Typography variant="h4" fontWeight="800" color="info.main" sx={{ fontSize: { xs: '1.4rem', sm: '2.125rem' } }}>{assetInsights?.summary?.maintenanceDue || 0}</Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card
              onClick={() => setAssetTabValue(3)}
              sx={{
                cursor: 'pointer',
                p: { xs: 1.25, sm: 2 },
                borderRadius: { xs: 6, sm: 3 },
                bgcolor: alpha(theme.palette.success.main, 0.05),
                border: assetTabValue === 3 ? `2px solid ${theme.palette.success.main}` : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: theme.shadows[2] }
              }}
            >
              <Typography variant="caption" color="success.main" fontWeight="700" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' }, lineHeight: 1.2, mb: 0.5 }}>UPCOMING SERVICES</Typography>
              <Typography variant="h4" fontWeight="800" color="success.main" sx={{ fontSize: { xs: '1.4rem', sm: '2.125rem' } }}>{assetInsights?.summary?.upcomingServices || 0}</Typography>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card
              onClick={() => setAssetTabValue(4)}
              sx={{
                cursor: 'pointer',
                p: { xs: 1.25, sm: 2 },
                borderRadius: { xs: 6, sm: 3 },
                bgcolor: alpha(theme.palette.warning.main, 0.05),
                border: assetTabValue === 4 ? `2px solid ${theme.palette.warning.main}` : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: theme.shadows[2] }
              }}
            >
              <Typography variant="caption" color="warning.main" fontWeight="700" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, lineHeight: 1.2, mb: 0.5 }}>RENEWAL DUE</Typography>
              <Typography variant="h4" fontWeight="800" color="warning.main" sx={{ fontSize: { xs: '1.4rem', sm: '2.125rem' } }}>{assetInsights?.summary?.renewalDue || 0}</Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Asset Table */}
        <Card elevation={0} sx={{ ...cardShell, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: `1px solid ${DS.border}`, bgcolor: '#FAFBFC' }}>
            <Tabs
              value={assetTabValue}
              onChange={(_, newValue) => setAssetTabValue(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                px: { xs: 0, sm: 2 },
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontFamily: DS.font, fontSize: '13px' },
                '& .Mui-selected': { color: `${DS.orange} !important` },
                '& .MuiTabs-indicator': { bgcolor: DS.orange },
              }}
            >
              <Tab label={`Expired (${assetInsights?.summary?.expired || 0})`} />
              <Tab label={`Expiring Soon (${assetInsights?.summary?.expiringSoon || 0})`} />
              <Tab label={`Service Due (${assetInsights?.summary?.maintenanceDue || 0})`} />
              <Tab label={`Upcoming Services (${assetInsights?.summary?.upcomingServices || 0})`} />
              <Tab label={`Renewal Due (${assetInsights?.summary?.renewalDue || 0})`} />
            </Tabs>
          </Box>
          <CardContent sx={{ p: 0 }}>
            {assetTabData.loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <>
                {!isMobile ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Asset Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Relevant Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(assetTabData?.data || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">No assets found in this category</Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          (assetTabData?.data || []).map((asset: any) => (
                            <TableRow key={asset._id} hover>
                              <TableCell>
                                <Typography variant="subtitle2" fontWeight="700">{asset.name}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={getAssetIcon(asset.type)}
                                  label={asset.type}
                                  size="small"
                                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}
                                />
                              </TableCell>
                              <TableCell>
                                {assetTabValue < 2 ? (
                                  asset.lifecycle?.expiryDate ? new Date(asset.lifecycle.expiryDate).toLocaleDateString() : 'N/A'
                                ) : assetTabValue === 4 ? (
                                  asset.lifecycle?.nextRenewalDate ? new Date(asset.lifecycle.nextRenewalDate).toLocaleDateString() : 'N/A'
                                ) : (
                                  asset.lifecycle?.nextServiceDate ? new Date(asset.lifecycle.nextServiceDate).toLocaleDateString() : 'N/A'
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={assetTabValue === 0 ? 'Expired' : assetTabValue === 2 ? 'Overdue' : assetTabValue === 4 ? 'Renewal Overdue' : 'Due Soon'}
                                  size="small"
                                  color={assetTabValue === 0 || assetTabValue === 2 ? 'error' : 'warning'}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                  {asset.lifecycle?.serviceRequired && (
                                    <MuiTooltip title="Record Service">
                                      <IconButton
                                        size="small"
                                        color="info"
                                        onClick={() => setCompletionDialog({
                                          open: true,
                                          type: 'service',
                                          assetId: asset._id,
                                          assetName: asset.name,
                                          date: new Date().toISOString().split('T')[0],
                                          cost: 0
                                        })}
                                      >
                                        <BuildIcon fontSize="small" />
                                      </IconButton>
                                    </MuiTooltip>
                                  )}
                                  {(asset.type === 'Document' || asset.type === 'License') && asset.lifecycle?.renewalRequired && (
                                    <MuiTooltip title="Record Renewal">
                                      <IconButton
                                        size="small"
                                        color="warning"
                                        onClick={() => setCompletionDialog({
                                          open: true,
                                          type: 'renewal',
                                          assetId: asset._id,
                                          assetName: asset.name,
                                          date: new Date().toISOString().split('T')[0],
                                          cost: 0
                                        })}
                                      >
                                        <CheckCircle fontSize="small" />
                                      </IconButton>
                                    </MuiTooltip>
                                  )}
                                  <MuiTooltip title="View/Edit">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => navTo(`/assets/${asset._id}/edit`)}
                                    >
                                      <Assessment fontSize="small" />
                                    </IconButton>
                                  </MuiTooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(assetTabData?.data || []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                        No assets found in this category
                      </Typography>
                    ) : (
                      (assetTabData?.data || []).map((asset: any) => (
                        <Card key={asset._id} variant="outlined" sx={{ borderRadius: 2, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                          <CardContent sx={{ p: 2, pb: "16px !important" }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                              <Box>
                                <Typography variant="subtitle2" fontWeight="700">{asset.name}</Typography>
                                <Chip
                                  icon={getAssetIcon(asset.type)}
                                  label={asset.type}
                                  size="small"
                                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, mt: 0.5 }}
                                />
                              </Box>
                              <Chip
                                label={assetTabValue === 0 ? 'Expired' : assetTabValue === 2 ? 'Overdue' : assetTabValue === 4 ? 'Renewal Overdue' : 'Due Soon'}
                                size="small"
                                color={assetTabValue === 0 || assetTabValue === 2 ? 'error' : 'warning'}
                                variant="outlined"
                              />
                            </Stack>
                            <Divider sx={{ my: 1.5 }} />
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Box>
                                <Typography variant="caption" color="text.secondary">Relevant Date</Typography>
                                <Typography variant="body2" fontWeight="600">
                                  {assetTabValue < 2 ? (
                                    asset.lifecycle?.expiryDate ? new Date(asset.lifecycle.expiryDate).toLocaleDateString() : 'N/A'
                                  ) : assetTabValue === 4 ? (
                                    asset.lifecycle?.nextRenewalDate ? new Date(asset.lifecycle.nextRenewalDate).toLocaleDateString() : 'N/A'
                                  ) : (
                                    asset.lifecycle?.nextServiceDate ? new Date(asset.lifecycle.nextServiceDate).toLocaleDateString() : 'N/A'
                                  )}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1}>
                                {asset.lifecycle?.serviceRequired && (
                                  <IconButton
                                    size="small"
                                    color="info"
                                    onClick={() => setCompletionDialog({
                                      open: true,
                                      type: 'service',
                                      assetId: asset._id,
                                      assetName: asset.name,
                                      date: new Date().toISOString().split('T')[0],
                                      cost: 0
                                    })}
                                    sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}
                                  >
                                    <BuildIcon fontSize="small" />
                                  </IconButton>
                                )}
                                {(asset.type === 'Document' || asset.type === 'License') && asset.lifecycle?.renewalRequired && (
                                  <IconButton
                                    size="small"
                                    color="warning"
                                    onClick={() => setCompletionDialog({
                                      open: true,
                                      type: 'renewal',
                                      assetId: asset._id,
                                      assetName: asset.name,
                                      date: new Date().toISOString().split('T')[0],
                                      cost: 0
                                    })}
                                    sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}
                                  >
                                    <CheckCircle fontSize="small" />
                                  </IconButton>
                                )}
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => navTo(`/assets/${asset._id}/edit`)}
                                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                                >
                                  <Assessment fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </Box>
                )}
                {assetTabData.total > 5 && (
                  <Box sx={{ p: 1, display: 'flex', justifyContent: 'center', borderTop: 1, borderColor: 'divider' }}>
                    <Pagination
                      count={Math.ceil(assetTabData.total / 5)}
                      page={assetTabData.page}
                      onChange={(_, page) => {
                        const statuses = ['expired', 'expiring', 'service_due', 'upcoming_service', 'renewal_due'];
                        fetchAssetTabData(statuses[assetTabValue], page);
                      }}
                      color="primary"
                      size="small"
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Completion Dialog */}
      <Dialog open={completionDialog.open} onClose={() => setCompletionDialog({ ...completionDialog, open: false })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textTransform: 'capitalize' }}>
          Record {completionDialog.type}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" mb={2}>
              Recording completion for <strong>{completionDialog.assetName}</strong>.
              The next {completionDialog.type} date will be automatically calculated.
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Completion Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={completionDialog.date}
                onChange={(e) => setCompletionDialog({ ...completionDialog, date: e.target.value })}
              />
              <TextField
                fullWidth
                label="Total Cost"
                type="number"
                value={completionDialog.cost}
                onChange={(e) => setCompletionDialog({ ...completionDialog, cost: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{formatCurrency(0).replace(/[0-9.]/g, '')}</InputAdornment>,
                }}
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setCompletionDialog({ ...completionDialog, open: false })}>Cancel</Button>
          <Button variant="contained" onClick={handleCompleteAction}>Record & Schedule Next</Button>
        </DialogActions>
      </Dialog>

      {/* My Usage — this month's consumption against the current plan's limits */}
      <Dialog
        open={usageOpen}
        onClose={() => setUsageOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <DonutLargeIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                My Usage
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </Typography>
            </Box>
            {usageData?.plan && (
              <Chip
                size="small"
                label={usageData.plan}
                color="primary"
                variant="outlined"
                sx={{ ml: 'auto !important', textTransform: 'capitalize' }}
              />
            )}
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {usageLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : usageError ? (
            <Alert severity="error">{usageError}</Alert>
          ) : usageData ? (
            <UsageBreakdown usageData={usageData} />
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={fetchUsage} disabled={usageLoading} startIcon={<Refresh />}>
            Refresh
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setUsageOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default DashboardPage;