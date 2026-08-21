import {
  Assessment,
  CheckCircle,
  Refresh
} from '@mui/icons-material';
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
import React, { useEffect, useRef, useState } from 'react';
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
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import {
  assetsAPI,
  billingAPI,
  bookingsAPI,
  inventoryAPI,
  purchaseOrdersAPI,
  reportsAPI
} from '../services/api';
import { useActiveTenant } from '../hooks/useActiveTenant';
import PendingActionsCard from '../components/PendingActionsCard';

// ---------------------------------------------------------------------------
// StatCard – reusable card used throughout the dashboard
// ---------------------------------------------------------------------------
interface StatCardProps {
  title: string;
  value?: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = 'primary', subtitle, children }) => {
  const theme = useTheme();
  const themeColor = (theme.palette as any)[color]?.main || theme.palette.primary.main;

  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isMd = useMediaQuery(theme.breakpoints.between("md", "lg"));
  const isLg = useMediaQuery(theme.breakpoints.up("lg"));


  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        border: 'none',
        background: `linear-gradient(135deg, ${alpha(themeColor, 0.05)} 0%, ${alpha(themeColor, 0.02)} 100%)`,
        backdropFilter: 'blur(20px)',
        boxShadow: `0 8px 32px 0 ${alpha(themeColor, 0.1)}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: `0 20px 40px -10px ${alpha(themeColor, 0.2)}`,
          '& .icon-bg': {
            transform: 'scale(1.2) rotate(15deg)',
            opacity: 0.15
          }
        },
      }}
    >
      {/* Decorative Background Icon */}
      <Box
        className="icon-bg"
        sx={{
          position: 'absolute',
          right: -20,
          bottom: -20,
          opacity: 0.05,
          transform: 'rotate(0deg)',
          transition: 'all 0.5s ease',
          zIndex: 0,
          color: themeColor,
          '& svg': { fontSize: 180 }
        }}
      >
        {icon}
      </Box>

      <CardContent sx={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: { xs: 0.75, sm: 2 }, '&:last-child': { pb: { xs: 0.75, sm: 2 } } }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 0.25, sm: 2 } }}>
            <Box
              sx={{
                p: { xs: 0.25, sm: 1.5 },
                borderRadius: '16px',
                bgcolor: alpha(themeColor, 0.1),
                color: themeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { fontSize: isXs ? 'small' : 'medium' }) : icon}
            </Box>
            {trend !== undefined && (
              <Chip
                label={`${trend >= 0 ? '+' : ''}${trend}%`}
                size="small"
                color={trend >= 0 ? 'success' : 'error'}
                variant="filled"
                sx={{ fontWeight: 700, borderRadius: '8px', height: { xs: 16, sm: 24 }, fontSize: { xs: '0.55rem', sm: '0.8125rem' } }}
              />
            )}
          </Box>

          <Typography variant="body2" fontWeight="600" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: { xs: 0.1, sm: 1.2 }, mb: { xs: 0.1, sm: 1 }, fontSize: { xs: '0.5rem', sm: '0.875rem' }, lineHeight: 1.2 }}>
            {title}
          </Typography>

          {value !== undefined && (
            <Typography
              variant="h3"
              fontWeight="800"
              sx={{
                background: `linear-gradient(45deg, ${themeColor}, ${alpha(themeColor, 0.7)})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: { xs: '1rem', sm: '2rem', lg: '2.5rem' },
                mb: { xs: 0.25, sm: 1 }
              }}
            >
              {value}
            </Typography>
          )}
          
          {children}
        </Box>

        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: { xs: '0.5rem', sm: '0.875rem' }, mt: { xs: 0.25, sm: 0 } }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// OrdersChart – shows number of orders per hour
// ---------------------------------------------------------------------------
interface OrdersChartProps {
  data: { hour: number; count: number }[];
}
const OrdersChart: React.FC<OrdersChartProps> = ({ data }) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"));

  return (
    <ResponsiveContainer width="100%" height={isXs ? 180 : isSm ? 280 : 320}>
      <AreaChart
        data={data}
        margin={{ top: isXs ? 0 : 20, right: isXs ? 0 : 40, left: isXs ? -20 : 10, bottom: 10 }}
      >
        {/* Gradient Fill */}
        <defs>
          <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
          </linearGradient>
        </defs>

        {/* Softer Grid */}
        <CartesianGrid
          vertical={false}
          stroke={theme.palette.divider}
          strokeDasharray="3 6"
          opacity={0.5}
        />

        {/* X Axis */}
        <XAxis
          dataKey="hour"
          axisLine={false}
          tickLine={false}
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
        />

        {/* RIGHT Y Axis like screenshot */}
        <YAxis
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          width={isXs ? 30 : 40}
        />

        {/* Tooltip */}
        <Tooltip
          cursor={{ stroke: theme.palette.divider, strokeWidth: 1 }}
          contentStyle={{
            background: theme.palette.mode === 'dark' ? theme.palette.background.paper : "#111827",
            borderRadius: 8,
            border: "none",
            color: theme.palette.mode === 'dark' ? theme.palette.text.primary : "#fff",
            fontSize: 12,
            padding: "8px 10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)"
          }}
          formatter={(value: any) => [`${value} Orders`, ""]}
        />

        {/* Smooth Area Line */}
        <Area
          type="monotone"
          dataKey="count"
          stroke="#f97316"
          strokeWidth={4}
          fill="url(#ordersGradient)"
          dot={false}
          activeDot={{
            r: 6,
            fill: "#f97316",
            stroke: "#fff",
            strokeWidth: 2
          }}
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
  const headingFontSize = { xs: '1.12rem', sm: '1.4rem', md: '2.125rem' };
  const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };


  // ---------- Responsive Pie Settings ----------
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isMd = useMediaQuery(theme.breakpoints.between("md", "lg"));
  const isLg = useMediaQuery(theme.breakpoints.up("lg"));



  const pieHeight =
    isXs ? 320 :
      isSm ? 360 :
        420;

  const labelOffset =
    isXs ? 12 :
      isSm ? 18 :
        28;

  const chartMargin = isXs
    ? { top: 10, right: 20, left: 20, bottom: 10 }
    : { top: 20, right: 50, left: 50, bottom: 20 };


  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const fetchDashboardData = async (isSilent = false) => {
    if (timeRange === 'custom' && (!startDate || !endDate)) return;
    if (loading && fetchRequestId.current > 0) return; // Basic entry guard
    
    const requestId = ++fetchRequestId.current;
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const params: any = { range: timeRange };
      if (timeRange === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
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
      const statuses = ['expired', 'expiring', 'service_due', 'upcoming_service'];
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
    const statuses = ['expired', 'expiring', 'service_due', 'upcoming_service'];
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

  // ✅ Check if only one item exists
  const isSingleItem = pieData.length === 1;

  // ✅ Used to show empty state


  // ---------- PIE CALCULATIONS ----------
  const itemCount = pieData.length;

  const safePieData = pieData.filter(
    (i: any) => Number(i?.totalQuantity) > 0
  );
  const hasBookings = safePieData.length > 0;

  const totalQuantity = safePieData.reduce(
    (sum: number, i: any) => sum + Number(i.totalQuantity || 0),
    0
  );



  const pieRadius =
    isXs ? 75 :
      isSm ? 95 :
        isMd ? 120 :
          isLg ? 150 :
            140;

  // ⭐ FIX: always detect real top item
  const topItem =
    safePieData.length > 0
      ? safePieData.reduce((a, b) =>
        Number(a.totalQuantity) > Number(b.totalQuantity) ? a : b
      )
      : null;

  if (loading && !dashboardData) {
    return <DashboardSkeleton />;
  }



  return (
    <Box
      sx={{
        position: 'relative',
        maxWidth: 1600,
        mx: "auto",
        px: { xs: 1.5, sm: 2.5, md: 3, lg: 4 },
        py: { xs: 1.6, md: 3 }
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
            '& .MuiLinearProgress-bar': {
              bgcolor: 'primary.main'
            }
          }} 
        />
      )}

      {/* Pending actions (e.g. Stripe payout onboarding) — admins only */}
      <PendingActionsCard />

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: { xs: 2, sm: 3 },
          gap: { xs: 1.25, sm: 2 }
        }}
      >
        <Box sx={{ width: { xs: '100%', sm: 'auto' }, textAlign: { xs: 'center', sm: 'left' } }}>
        </Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: { xs: 2, sm: 1 },
            justifyContent: { xs: 'center', sm: 'flex-start' },
            width: '100%'
          }}>

            <Box sx={{ display: 'flex', alignItems: 'center', width: { xs: '100%', sm: 'auto' }, gap: 1 }}>
              <ToggleButtonGroup
                value={timeRange}
                exclusive
                onChange={(_, v) => {
                  if (v) {
                    setTimeRange(v);
                    if (v === 'custom') {
                      const today = new Date().toISOString().split('T')[0];
                      setStartDate(today);
                      setEndDate(today);
                    }
                  }
                }}
                size="small"
                fullWidth={isMobile}
                sx={{ flex: 1 }}
              >
                <ToggleButton value="today">Today</ToggleButton>
                <ToggleButton value="week">Week</ToggleButton>
                <ToggleButton value="month">Month</ToggleButton>
                <ToggleButton value="custom">Custom</ToggleButton>
              </ToggleButtonGroup>

              <IconButton
                onClick={() => fetchDashboardData()}
                color="primary"
                disabled={loading}
              >
                <Refresh
                  sx={{
                    animation: loading ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }}
                />
              </IconButton>
            </Box>

            {timeRange === 'custom' && (
              <Box sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                width: { xs: '100%', sm: 'auto' },
                justifyContent: 'center'
              }}>
                <TextField
                  type="date"
                  size="small"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  inputProps={{ max: endDate || undefined }}
                  sx={{ flex: { xs: 1, sm: 'none' }, width: { sm: 140 } }}
                />
                <Typography variant="body2">-</Typography>
                <TextField
                  type="date"
                  size="small"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  inputProps={{ min: startDate || undefined }}
                  sx={{ flex: { xs: 1, sm: 'none' }, width: { sm: 140 } }}
                />
              </Box>
            )}
          </Box>
        </Stack>
      </Box>

      {/* Order Type Breakdown Bar */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', pb: 0.5 }}>
        {(() => {
          const aggregatedCounts: Record<string, { 
             label: string, 
             count: number, 
             color: string, 
             statuses: { [key: string]: number }
          }> = {};

          normalizedOrders.forEach((o: any) => {
             if (!o.orderType) return;
             
             // Normalize key
             const key = o.orderType.toLowerCase().replace(/_/g, ' ');
             
             if (!aggregatedCounts[key]) {
                let label = key.replace(/\b\w/g, (c: string) => c.toUpperCase());
                let color = 'info';
                
                // standard overwrites
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
                      pending: 0,
                      confirmed: 0,
                      preparing: 0,
                      inProgress: 0,
                      ready: 0,
                      approved: 0,
                      served: 0,
                      completed: 0,
                      readyToTakeaway: 0,
                      readyToPickup: 0,
                      onTheWay: 0,
                      delivered: 0
                   }
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
            .filter(type => type.count > 0)
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
               ].filter(st => st.count > 0);
               
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
                 <Typography variant="body2" sx={{ fontSize: '0.75rem', p: 0.5 }}>
                   No active status details
                 </Typography>
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
                       cursor: 'help'
                     }} 
                   />
                 </MuiTooltip>
               );
            });
        })()}
      </Box>

      {/* Global Status Overview Bar */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', pb: 0.5 }}>
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
          ].filter(st => st.count > 0);

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
                '& .MuiChip-label': { px: 1.5 }
              }} 
            />
          ));
        })()}
      </Box>

      {/* Standing low-stock warning.
          Rendered from the alert state the backend persists on each item, so it
          stays visible on every dashboard load until the stock is refilled —
          unlike the one-time toast/push that announced the shortage. */}
      {canSeeStockAlerts && stockAlerts.length > 0 && (
        <Alert
          severity={criticalStockCount > 0 ? 'error' : 'warning'}
          icon={<ReportProblemOutlinedIcon />}
          sx={{
            mb: { xs: 2, sm: 3 },
            borderRadius: 2,
            alignItems: 'flex-start',
            // Let the message column fill the row so the clickable header
            // spans the full width rather than only the text it wraps.
            '& .MuiAlert-message': { flex: 1, minWidth: 0 },
          }}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                color="inherit"
                onClick={() => navigate('/inventory')}
                sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
              >
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
          {/* The whole header is the toggle, so tapping anywhere on the title or
              summary opens the list — not just the chevron. It stays out of the
              Alert root because the Restock button sits in the `action` slot,
              which would otherwise toggle the list as well as navigate. */}
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
                  <Box
                    key={item._id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.name}
                      {item.sku ? (
                        <Typography component="span" variant="caption" sx={{ ml: 1, opacity: 0.75 }}>
                          {item.sku}
                        </Typography>
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

      {/* Main Stats Grid */}
      <Grid container spacing={{ xs: 1.2, sm: 3 }} sx={{ mb: { xs: 2.2, sm: 4 } }}>
        <Grid item xs={6} sm={6} md={4} lg={3} xl={3}>
          {/* Today's / Week / Month Sales */}
          <StatCard
            title={
              timeRange === 'today'
                ? "Today's Sales"
                : timeRange === 'week'
                  ? "This Week's Sales"
                  : "This Month's Sales"
            }
            value={formatCurrency(dashboardData?.summary?.totalRevenue || 0)}
            icon={<TrendingUpIcon />}
            color="primary"
            subtitle={`${totalOrdersAll || 0} orders`}
          />

        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3} xl={3}>

          <StatCard
            title="Total Orders"
            value={totalOrdersAll || 0}
            icon={<ReceiptLongIcon />}
            color="secondary"
          
          />

        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3} xl={3}>
          <StatCard
            title="Table Occupancy"
            value={`${dashboardData?.tables?.occupied || 0}/${dashboardData?.tables?.total || 0}`}
            icon={<EventSeatIcon />}
            color="success"
            subtitle="Current status"
          />
        </Grid>
        {/* The two grids have been merged to allow seamless wrapping */}

        {/* Inventory Status */}
        <Grid item xs={6} sm={6} md={3} lg={3} xl={2.4}>
          <StatCard
            title="Inventory Items"
            value={inventoryCount}
            icon={<Inventory2OutlinedIcon />}
            color="info"
            subtitle={`${lowStockItems} Low Stock Alerts`}
          />
        </Grid>



        {/* Purchase Orders */}
        <Grid item xs={6} sm={6} md={3} sx={{ display: { xs: 'none', sm: 'block' } }}>
          <StatCard
            title="Pending POs"
            value={pendingPOs}
            icon={<AssignmentLateOutlinedIcon />}
            color="warning"
            subtitle="Requires Approval"
          />
        </Grid>

        {/* Bookings */}
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Today's Bookings"
            value={activeBookings}
            icon={<EventAvailableOutlinedIcon />}
            color="primary"
            subtitle="Reserved Tables"
          />
        </Grid>

        {/* Kitchen Orders */}
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Kitchen Orders"
            value={dashboardData?.kitchenOrders || 0}
            icon={<RestaurantMenuOutlinedIcon />}
            color="error"
            subtitle="Pending Preparation"
          />
        </Grid>

        {/* Catering Orders */}
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Catering Orders"
            value={dashboardData?.summary?.ordersByType?.find((o: any) => o.orderType === 'catering')?.totalOrders || 0}
            icon={<RoomServiceOutlinedIcon />}
            color="secondary"
            subtitle="Total Catering"
          />
        </Grid>

      </Grid>

      {/* Orders Charts Area */}
      <Grid container spacing={{ xs: 1.5, sm: 3 }}>
        <Grid item xs={12}>
          <Box sx={{
            p: { xs: 1.5, sm: 3 },
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
            backdropFilter: 'blur(10px)',
            boxShadow: `0 4px 20px 0 ${alpha(theme.palette.common.black, 0.05)}`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            height: '100%',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: `0 12px 30px 0 ${alpha(theme.palette.primary.main, 0.1)}`,
            }
          }}>
            <Typography variant="h6" sx={{ mb: { xs: 0, sm: 1.5 }, fontWeight: 600, fontSize: headingFontSize, color: { xs: '#000', sm: 'text.primary' }, textAlign: { xs: 'center', sm: 'left' } }}>
              Orders Activity (Hourly)
            </Typography>
            <OrdersChart data={dashboardData?.hourlyDistribution || []} />
          </Box>
        </Grid>

      </Grid>

      {/* ================= BOOKINGS SECTION ================= */}

      {!hasBookings ? (

        /* ================= SINGLE CARD ================= */
        <Grid container spacing={{ xs: 1.5, sm: 3 }} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Box
              sx={{
                p: { xs: 4, md: 5 },
                borderRadius: 4,
                bgcolor: "#f9fafb",
                boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
                textAlign: "center",
                minHeight: 260,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center"
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "#f97316" }}>
                No bookings yet
              </Typography>

              <Typography variant="body2" sx={{ color: "#6b7280", maxWidth: 420 }}>
                Once customers place orders, sales insights and analytics will appear here.
              </Typography>
            </Box>
          </Grid>
        </Grid>

      ) : (

        /* ================= NORMAL TWO CARDS ================= */
        <Grid
          container
          spacing={{ xs: 1.5, sm: 3 }}
          sx={{ mt: 1 }}
          alignItems="stretch"
        >

          {/* ================= LEFT CARD ================= */}
          <Grid
            item
            xs={12}
            md={12}
            lg={8}
            xl={8}
            sx={{
              display: "flex",
              alignItems: "stretch"
            }}
          >
            <Box
              sx={{
                p: { xs: 1.5, md: 4 },
                borderRadius: 5,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : "#f3f4f6",
                boxShadow: theme.palette.mode === 'dark' ? "none" : "0 10px 40px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                height: "100%"
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: { xs: 0, md: 2.5 }, color: "#f97316" }}>
                Item-wise Sales
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: { xs: 0, md: 1 },
                  height: "100%"
                }}
              >

                {/* ================= PIE ================= */}
                <Box sx={{ width: "100%", height: { xs: 220, sm: 260, md: 300, lg: 340, xl: 380 }, minHeight: { xs: 220, sm: 240 }, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                    <PieChart margin={{ top: isXs ? 0 : 10, right: 10, bottom: isXs ? 0 : 10, left: 10 }}>

                      {/* Arrow marker */}
                      <defs>
                        <marker
                          id="arrowHead"
                          markerWidth="6"
                          markerHeight="6"
                          refX="5"
                          refY="3"
                          orient="auto"
                        >
                          <path d="M0,0 L6,3 L0,6 Z" fill="#9ca3af" />
                        </marker>
                      </defs>
                      <Pie
                        data={safePieData}
                        dataKey="totalQuantity"
                        nameKey="itemName"
                        cx="50%"
                        cy="50%"
                        outerRadius={pieRadius}
                        innerRadius={0}
                        paddingAngle={0}
                        minAngle={0}
                        stroke="none"
                        isAnimationActive={false}
                        labelLine={itemCount > 1}
                        label={(props: any) => {
                          if (itemCount === 1) return null;

                          const { cx, cy, midAngle, outerRadius } = props;
                          const value = Number(props.payload?.totalQuantity || 0);
                          const realPercent = totalQuantity
                            ? Math.round((value / totalQuantity) * 100)
                            : 0;

                          const RADIAN = Math.PI / 180;

                          const sx = cx + outerRadius * Math.cos(-midAngle * RADIAN);
                          const sy = cy + outerRadius * Math.sin(-midAngle * RADIAN);

                          const ex = cx + (outerRadius + labelOffset) * Math.cos(-midAngle * RADIAN);
                          const ey = cy + (outerRadius + labelOffset) * Math.sin(-midAngle * RADIAN);

                          const textAnchor = ex > cx ? "start" : "end";

                          return (
                            <g>
                              <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#9ca3af" strokeWidth={1.4} />
                              <text
                                x={ex + (ex > cx ? 5 : -5)}
                                y={ey}
                                textAnchor={textAnchor}
                                dominantBaseline="central"
                                fill="#6b7280"
                                style={{ fontSize: 12, fontWeight: 600 }}
                              >
                                {realPercent}%
                              </text>
                            </g>
                          );
                        }}
                      >
                        {safePieData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={[
                              "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6",
                              "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"
                            ][index % 10]}
                            stroke="none"
                          />
                        ))}
                      </Pie>

                      {itemCount === 1 && totalQuantity > 0 && (
                        <>
                          <text
                            x="50%"
                            y="48%"
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{
                              fontSize: isXs ? 18 : 22,
                              fontWeight: 800,
                              fill: "#111827"
                            }}
                          >
                            {Math.round(
                              (topItem?.totalQuantity || 0) / totalQuantity * 100
                            )}%
                          </text>

                          <text
                            x="50%"
                            y="62%"
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{
                              fontSize: isXs ? 10 : 12,
                              fill: "#6b7280"
                            }}
                          >
                            Top item share
                          </text>
                        </>
                      )}

                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>

                <Grid
                  container
                  spacing={1.5}
                  sx={{
                    mt: 1,
                    overflow: "visible"
                  }}
                >
                  {safePieData.map((item: any, index: number) => (
                    <Grid item xs={12} sm={6} md={6} key={index}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          // bgcolor: "#f5ebe6",
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : "#f5ebe6",
                          px: 1.5,
                          py: 1,
                          borderRadius: 3,
                          boxShadow: theme.palette.mode === 'dark' ? "none" : "0 4px 14px rgba(0,0,0,0.04)",
                          transition: "all 0.2s ease",
                          '&:hover': {
                            transform: "translateY(-1px)",
                            boxShadow: "0 8px 20px rgba(0,0,0,0.06)"
                          }
                        }}
                      >

                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              mr: 1,
                              bgcolor: [
                                "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6",
                                "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"
                              ][index % 10],
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{ fontSize: { xs: 12, sm: 13 } }}
                          >
                            {item.itemName}
                          </Typography>
                        </Box>

                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, fontSize: { xs: 12, sm: 13 } }}
                        >
                          {item.totalQuantity}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

              </Box>
            </Box>
          </Grid>


          {/* ================= RIGHT CARD ================= */}
          <Grid
            item
            xs={12}
            md={12}
            lg={4}
            xl={4}
            sx={{
              display: "flex",
              alignItems: "stretch"
            }}
          >
            <Box
              sx={{
                p: { xs: 2.5, md: 4 },
                borderRadius: 5,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : "#f3f4f6",
                boxShadow: theme.palette.mode === 'dark' ? "none" : "0 10px 40px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                height: "100%"
              }}
            >

              <Typography variant="h6" sx={{ fontWeight: 700, mb: { xs: 1.5, md: 3 }, color: "#f97316" }}>
                Order from
              </Typography>

              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: normalizedOrders.length <= 2 ? "center" : "flex-start" }}>
                {normalizedOrders.map((order: any, index: number) => {

                  const percentage = totalOrdersAll
                    ? ((order.totalOrders / totalOrdersAll) * 100).toFixed(0)
                    : 0;

                  return (
                    <Box key={index} sx={{ mb: 3, p: 2.5, borderRadius: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : "#f5ebe6" }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                        {order.label || order.orderType}
                      </Typography>

                      <Box sx={{ height: 6, borderRadius: 5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : "#e5e7eb", overflow: "hidden" }}>
                        <Box sx={{ width: `${percentage}%`, height: "100%", bgcolor: "#f97316" }} />
                      </Box>

                      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                        <Typography variant="body2">{percentage}%</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {order.totalOrders}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

            </Box>
          </Grid>

        </Grid>

      )}


      {/* Asset Lifecycle Management Section - MOVED TO BOTTOM */}
      <Box sx={{ mt: 6, mb: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={{ xs: 1.5, sm: 0 }} mb={3}>
          <Typography variant="h5" fontWeight="700">
            Asset Lifecycle Management
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navTo('/assets')}
            sx={{ borderRadius: 2 }}
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
        </Grid>

        {/* Asset Table */}
        <Card sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
            <Tabs
              value={assetTabValue}
              onChange={(_, newValue) => setAssetTabValue(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{ px: { xs: 0, sm: 2 } }}
            >
              <Tab label={`Expired (${assetInsights?.summary?.expired || 0})`} />
              <Tab label={`Expiring Soon (${assetInsights?.summary?.expiringSoon || 0})`} />
              <Tab label={`Service Due (${assetInsights?.summary?.maintenanceDue || 0})`} />
              <Tab label={`Upcoming Services (${assetInsights?.summary?.upcomingServices || 0})`} />
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
                                ) : (
                                  asset.lifecycle?.nextServiceDate ? new Date(asset.lifecycle.nextServiceDate).toLocaleDateString() : 'N/A'
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={assetTabValue === 0 ? 'Expired' : assetTabValue === 2 ? 'Overdue' : 'Due Soon'}
                                  size="small"
                                  color={assetTabValue % 2 === 0 ? 'error' : 'warning'}
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
                                label={assetTabValue === 0 ? 'Expired' : assetTabValue === 2 ? 'Overdue' : 'Due Soon'}
                                size="small"
                                color={assetTabValue % 2 === 0 ? 'error' : 'warning'}
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
                        const statuses = ['expired', 'expiring', 'service_due', 'upcoming_service'];
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
    </Box >
  );
};

export default DashboardPage;