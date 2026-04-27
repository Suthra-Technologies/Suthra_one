import {
  Refresh
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import React, { useEffect, useState } from 'react';


import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import { toast } from 'react-hot-toast';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { billingAPI, bookingsAPI, inventoryAPI, purchaseOrdersAPI, reportsAPI } from '../services/api';

// ---------------------------------------------------------------------------
// StatCard – reusable card used throughout the dashboard
// ---------------------------------------------------------------------------
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = 'primary', subtitle }) => {
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

      <CardContent sx={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1, sm: 2 } }}>
            <Box
              sx={{
                p: { xs: 1, sm: 1.5 },
                borderRadius: '16px',
                bgcolor: alpha(themeColor, 0.1),
                color: themeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { fontSize: 'medium' }) : icon}
            </Box>
            {trend !== undefined && (
              <Chip
                label={`${trend >= 0 ? '+' : ''}${trend}%`}
                size="small"
                color={trend >= 0 ? 'success' : 'error'}
                variant="filled"
                sx={{ fontWeight: 700, borderRadius: '8px', height: 24 }}
              />
            )}
          </Box>

          <Typography variant="body2" fontWeight="600" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: { xs: 0.5, sm: 1.2 }, mb: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, lineHeight: 1.2 }}>
            {title}
          </Typography>

          <Typography
            variant="h3"
            fontWeight="800"
            sx={{
              background: `linear-gradient(45deg, ${themeColor}, ${alpha(themeColor, 0.7)})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: { xs: '1.5rem', sm: '2rem', lg: '2.5rem' },
              mb: 1
            }}
          >
            {value}
          </Typography>
        </Box>

        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: { xs: '0.65rem', sm: '0.875rem' }, mt: { xs: 0.5, sm: 0 } }}>
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
    <ResponsiveContainer width="100%" height={isXs ? 240 : isSm ? 280 : 320}>
      <AreaChart
        data={data}
        margin={{ top: 20, right: isXs ? 0 : 40, left: isXs ? -20 : 10, bottom: 10 }}
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
          formatter={(value: number) => [`${value} Orders`, ""]}
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));


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

  const fetchDashboardData = async () => {
    if (timeRange === 'custom' && (!startDate || !endDate)) return;
    setLoading(true);
    try {
      const params: any = { range: timeRange };
      if (timeRange === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const promises: Promise<any>[] = [
        reportsAPI.getDashboard(params),
        billingAPI.status(),
        // New metrics fetching
        inventoryAPI.getAll(),
        purchaseOrdersAPI.getAll({ status: 'Pending' }),
        bookingsAPI.getAll(),
        reportsAPI.getBestSellingItems(params),
        reportsAPI.getOrdersByType(params),
      ];

      const results = await Promise.all(promises);
      const [dashboardRes, billingRes, inventoryRes, poRes, bookingsRes, bestSellingRes, ordersByTypeRes] = results;

      const dashboardDataActual = dashboardRes?.status === 'fulfilled' ? dashboardRes.value?.data : dashboardRes?.data;
      const billingData = billingRes?.status === 'fulfilled' ? billingRes.value?.data : billingRes?.data;
      const bestSellingData = bestSellingRes?.status === 'fulfilled' ? bestSellingRes.value?.data : bestSellingRes?.data;
      const ordersByTypeData = ordersByTypeRes?.status === 'fulfilled' ? ordersByTypeRes.value?.data : ordersByTypeRes?.data;

      setDashboardData({
        ...(dashboardDataActual || {}),
        bestSellingItems: Array.isArray(bestSellingData) ? bestSellingData : [],
        ordersByType: Array.isArray(ordersByTypeData) ? ordersByTypeData : [],
        subscriptionStatus: billingData?.status || 'unknown',
      });

      // Process Inventory for low stock
      const inventoryData = inventoryRes?.status === 'fulfilled' ? inventoryRes.value?.data : inventoryRes?.data;
      const inventoryItems = Array.isArray(inventoryData?.items) ? inventoryData.items : (Array.isArray(inventoryData) ? inventoryData : []);
      setInventoryCount(inventoryItems.length);
      setLowStockItems(inventoryItems.filter((i: any) => i && i.currentStock <= (i.minimumStockLevel || i.minimumStock || 0)).length);

      // Process Pending POs
      const poData = poRes?.status === 'fulfilled' ? poRes.value?.data : poRes?.data;
      setPendingPOs(poData?.total || (Array.isArray(poData) ? poData.length : 0));

      // Process Bookings (Today's active)
      const todayStr = new Date().toISOString().split('T')[0];

      const rawBookings = bookingsRes?.status === 'fulfilled' ? bookingsRes.value?.data : bookingsRes?.data;
      const bookingsData = Array.isArray(rawBookings)
        ? rawBookings
        : (Array.isArray(rawBookings?.items) ? rawBookings.items : []);

      const todaysBookings = bookingsData.filter((b: any) =>
        b && b.bookingDate &&
        b.bookingDate.startsWith(todayStr) &&
        b.status !== 'cancelled'
      );

      setActiveBookings(todaysBookings.length);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);

    const handleRealtimeUpdate = () => {
      fetchDashboardData();
    };

    window.addEventListener('newOrder', handleRealtimeUpdate);
    window.addEventListener('orderStatusUpdate', handleRealtimeUpdate);
    window.addEventListener('bookingUpdate', handleRealtimeUpdate);



    return () => {
      clearInterval(interval);
      window.removeEventListener('newOrder', handleRealtimeUpdate);
      window.removeEventListener('orderStatusUpdate', handleRealtimeUpdate);
      window.removeEventListener('bookingUpdate', handleRealtimeUpdate);
    };
  }, [timeRange, startDate, endDate]);

  // ✅ Create Top 10 Best Selling Items (Sorted by Quantity)
  // const topTenItems =
  //   (dashboardData?.bestSellingItems || [])
  //     .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
  //     .slice(0, 10);






  const currentRevenue = dashboardData?.summary?.totalRevenue || 0;
  const previousRevenue = dashboardData?.summary?.previousRevenue || 0;

  const currentOrders = dashboardData?.summary?.totalOrders || 0;
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


  // ✅ Orders by type from backend
  const normalizedOrders = Array.isArray(dashboardData?.ordersByType)
    ? dashboardData.ordersByType
    : [];

  // ✅ Total orders count for percentage bars
  const totalOrdersAll = normalizedOrders.reduce(
    (sum: number, o: any) => sum + (o?.totalOrders || 0),
    0
  );

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }



  return (
    <Box
      sx={{
        maxWidth: 1600,
        mx: "auto",
        px: { xs: 1.5, sm: 2.5, md: 3, lg: 4 },
        py: { xs: 2, md: 3 }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
          gap: 2
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

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
              fullWidth={false}
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
                  onChange={(e) => setStartDate(e.target.value)}
                  sx={{ width: 140 }}
                />
                <Typography variant="body2">-</Typography>
                <TextField
                  type="date"
                  size="small"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  sx={{ width: 140 }}
                />
              </Box>
            )}
            <IconButton onClick={fetchDashboardData} color="primary" disabled={loading}>
              <Refresh />
            </IconButton>
          </Box>
        </Stack>
      </Box>

      {/* Main Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
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
            subtitle={`${dashboardData?.summary?.totalOrders || 0} orders`}
          />

        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={3} xl={3}>

          <StatCard
            title="Total Orders"
            value={dashboardData?.summary?.totalOrders || 0}
            icon={<ReceiptLongIcon />}
            color="secondary"
            subtitle="Completed orders"
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

      </Grid>

      {/* Orders Charts Area */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{
            p: 3,
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
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Orders Activity (Hourly)
            </Typography>
            <OrdersChart data={dashboardData?.hourlyDistribution || []} />
          </Box>
        </Grid>

      </Grid>
      {/* ================= BOOKINGS SECTION ================= */}

      {!hasBookings ? (

        /* ================= SINGLE CARD ================= */
        <Grid container spacing={3} sx={{ mt: 1 }}>
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
          spacing={3}
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
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5, color: "#f97316" }}>
                Item-wise Sales
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  height: "100%"
                }}
              >

                {/* ================= PIE ================= */}
                <Box sx={{ width: "100%", height: { xs: 240, sm: 260, md: 300, lg: 340, xl: 380 }, minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>

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

              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: "#f97316" }}>
                Order from
              </Typography>

              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: normalizedOrders.length <= 2 ? "center" : "flex-start" }}>
                {normalizedOrders.map((order, index) => {

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


    </Box >
  );
};

export default DashboardPage;