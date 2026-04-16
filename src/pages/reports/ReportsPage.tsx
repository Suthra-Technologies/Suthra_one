
import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Tabs,
    Tab,
    Button,
    Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Chip,
    Stack,
    TextField,
    TablePagination,
    Tooltip as MuiTooltip,
    alpha,
} from '@mui/material';
import { ordersAPI, tablesAPI, bookingsAPI, feedbackAPI } from '../../services/api';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    AreaChart,
    Area,
    ResponsiveContainer,
} from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import MoneyIcon from '@mui/icons-material/AttachMoney';
import StarIcon from '@mui/icons-material/Star';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useTheme, useMediaQuery } from '@mui/material';
import { useSocket } from '../../context/SocketContext';
import { useSettings } from '../../context/SettingsContext';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptIcon from '@mui/icons-material/Receipt';


const COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"];

const ReportsPage: React.FC = () => {
    const { formatCurrency, settings } = useSettings();
    const [activeTab, setActiveTab] = useState(0);
    const [period, setPeriod] = useState<string>('today');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

    // Data states
    const [bestSellingItems, setBestSellingItems] = useState<any[]>([]);
    const [ordersByType, setOrdersByType] = useState<any[]>([]);
    const [waiterPerformance, setWaiterPerformance] = useState<any[]>([]);
    const [materialUsage, setMaterialUsage] = useState<any[]>([]);
    const [salesReport, setSalesReport] = useState<any>(null);
    // New critical reports states
    const [peakHours, setPeakHours] = useState<any>(null);
    const [paymentAnalytics, setPaymentAnalytics] = useState<any[]>([]);
    const [categoryPerformance, setCategoryPerformance] = useState<any[]>([]);
    const [cancellationAnalysis, setCancellationAnalysis] = useState<any>(null);
    const [profitLoss, setProfitLoss] = useState<any>(null);
    const [customerAnalytics, setCustomerAnalytics] = useState<any[]>([]);
    const [inventoryStock, setInventoryStock] = useState<any>(null);
    const [couponAnalytics, setCouponAnalytics] = useState<any[]>([]);
    const [tableStats, setTableStats] = useState<any[]>([]);
    const [feedbackData, setFeedbackData] = useState<any[]>([]);
    const [feedbackView, setFeedbackView] = useState<'summary' | 'item-wise'>('summary');
    const [itemWiseReport, setItemWiseReport] = useState<any[]>([]);
    const [promoSummary, setPromoSummary] = useState<any>(null);
    const [promoRedemptions, setPromoRedemptions] = useState<any[]>([]);
    const [promoCompensation, setPromoCompensation] = useState<any[]>([]);
    const [promoType, setPromoType] = useState('all');
    const [promoSearch, setPromoSearch] = useState('');
    const [bestSellingPage, setBestSellingPage] = useState(0);
    const [bestSellingRowsPerPage, setBestSellingRowsPerPage] = useState(10);
    const [salesPage, setSalesPage] = useState(0);
    const [salesRowsPerPage, setSalesRowsPerPage] = useState(10);
    const [customerPage, setCustomerPage] = useState(0);
    const [customerRowsPerPage, setCustomerRowsPerPage] = useState(10);
    const [inventoryPage, setInventoryPage] = useState(0);
    const [inventoryRowsPerPage, setInventoryRowsPerPage] = useState(10);
    const [couponPage, setCouponPage] = useState(0);
    const [couponRowsPerPage, setCouponRowsPerPage] = useState(10);
    const [tableStatsPage, setTableStatsPage] = useState(0);
    const [tableStatsRowsPerPage, setTableStatsRowsPerPage] = useState(10);
    const [recentOrdersPage, setRecentOrdersPage] = useState(0);
    const [recentOrdersRowsPerPage, setRecentOrdersRowsPerPage] = useState(10);
    const [tipsReportPage, setTipsReportPage] = useState(0);
    const [tipsReportRowsPerPage, setTipsReportRowsPerPage] = useState(10);
    const [peakHoursPage, setPeakHoursPage] = useState(0);
    const [peakHoursRowsPerPage, setPeakHoursRowsPerPage] = useState(10);
    const [cancellationPage, setCancellationPage] = useState(0);
    const [cancellationRowsPerPage, setCancellationRowsPerPage] = useState(10);
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
    const [paymentDetails, setPaymentDetails] = useState<any[]>([]);
    const [paymentDetailsPage, setPaymentDetailsPage] = useState(0);
    const [paymentDetailsRowsPerPage, setPaymentDetailsRowsPerPage] = useState(10);
    const [cancelledOrdersPage, setCancelledOrdersPage] = useState(0);
    const [cancelledOrdersRowsPerPage, setCancelledOrdersRowsPerPage] = useState(10);
    const [topCancelledItemsPage, setTopCancelledItemsPage] = useState(0);
    const [topCancelledItemsRowsPerPage, setTopCancelledItemsRowsPerPage] = useState(10);

    const { socket } = useSocket();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5006';
    const token = localStorage.getItem('jwt');

    const headers = {
        Authorization: `Bearer ${token}`,
    };



    // Reset pagination and other non-filter-related states when main filters change
    useEffect(() => {
        setBestSellingPage(0);
        setSalesPage(0);
        setCustomerPage(0);
        setInventoryPage(0);
        setCouponPage(0);
        setTableStatsPage(0);
        setRecentOrdersPage(0);
        setPeakHoursPage(0);
        setCancellationPage(0);
        setCancelledOrdersPage(0);
        setTopCancelledItemsPage(0);
        setTipsReportPage(0);
    }, [activeTab, period, startDate, endDate]);

    // Reset payment method filter when switching tabs
    useEffect(() => {
        setPaymentMethodFilter('all');
        setPaymentDetailsPage(0);
    }, [activeTab]);

    // Fetch data based on active tab
    useEffect(() => {
        fetchReportData();

        const interval = setInterval(fetchReportData, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, [activeTab, period, startDate, endDate, paymentMethodFilter]);

    useEffect(() => {
        if (activeTab === 15 && feedbackView === 'item-wise') {
            feedbackAPI.getItemWiseReport().then(res => setItemWiseReport(res.data || [])).catch(err => console.error(err));
        }
    }, [activeTab, feedbackView]);

    // Real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            // Debounce or just fetch? Fetching is fine for now.
            fetchReportData();
        };

        socket.on('order_created', handleUpdate);
        socket.on('order_updated', handleUpdate);
        socket.on('order_status_updated', handleUpdate);
        socket.on('payment_updated', handleUpdate); // Assuming this exists

        return () => {
            socket.off('order_created', handleUpdate);
            socket.off('order_updated', handleUpdate);
            socket.off('order_status_updated', handleUpdate);
            socket.off('payment_updated', handleUpdate);
        };
    }, [socket, activeTab, period, startDate, endDate]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const params: any = { period };

            // Calculate precise JS dates for frontend-driven filtering (e.g. for Orders Filter API)
            let resolvedStart: Date | null = null;
            let resolvedEnd: Date | null = null;
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

            if (period === 'today') {
                resolvedStart = todayStart;
                resolvedEnd = todayEnd;
            } else if (period === 'last7days') {
                resolvedStart = new Date(todayStart);
                resolvedStart.setDate(todayStart.getDate() - 7);
                resolvedEnd = todayEnd;
            } else if (period === 'thisMonth') {
                resolvedStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                resolvedEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            } else if (period === 'custom' && startDate && endDate) {
                resolvedStart = new Date(startDate);
                resolvedEnd = new Date(endDate);
            }

            if (resolvedStart && resolvedEnd) {
                params.startDate = resolvedStart.toISOString();
                params.endDate = resolvedEnd.toISOString();
            }

            switch (activeTab) {
                case 0: // Dashboard - Comprehensive
                    await fetchComprehensiveReport(params);
                    break;
                case 1: // Best Selling Items
                    await Promise.all([
                        fetchBestSellingItems(params),
                        fetchOrdersByType(params)   // 👈 THIS FIXES IT
                    ]);
                    break;
                case 2: // Orders by Type
                    await fetchOrdersByType(params);
                    break;
                case 3: // Waiter Performance
                    await fetchWaiterPerformance(params);
                    break;
                case 4: // Material Usage
                    await fetchMaterialUsage(params);
                    break;
                case 5: // Sales Report
                    await fetchSalesReport(params);
                    break;
                case 6: // Peak Hours
                    await fetchPeakHours(params);
                    break;
                case 7: // Payment Analytics
                    await fetchPaymentAnalytics(params);
                    await fetchPaymentDetails(params);
                    break;
                case 8: // Category Performance
                    await fetchCategoryPerformance(params);
                    break;
                case 9: // Cancellation Analysis
                    await fetchCancellationAnalysis(params);
                    break;
                case 10: // Profit & Loss
                    await fetchProfitLoss(params);
                    break;
                case 11: // Customer Analytics
                    await fetchCustomerAnalytics(params);
                    break;
                case 12: // Inventory Stock
                    await fetchInventoryStock(params);
                    break;
                case 13: // Coupon Analytics
                    await fetchCouponAnalytics(params);
                    break;
                case 14: // Table Stats
                    await fetchTableStats(params);
                    break;
                case 15: // Feedback
                    await fetchFeedback(params);
                    break;
                case 16: // Tips Report
                    await Promise.all([
                        fetchSalesReport(params),
                        ordersAPI.filter({ page: 1, limit: 100, ...params }).then(res => setRecentOrders(res.data.orders || []))
                    ]);
                    break;
                case 17: // Promo Summary
                    await fetchPromoSummary(params);
                    break;
                case 18: // Promo Redemptions
                    await fetchPromoRedemptions(params);
                    break;
                case 19: // Promo Compensation
                    await fetchPromoCompensation(params);
                    break;
            }
        } catch (error) {
            console.error('Error fetching report:', error);
            toast.error('Failed to fetch report data');
        } finally {
            setLoading(false);
        }
    };

    const fetchComprehensiveReport = async (params: any) => {
        const [reportResponse, ordersResponse] = await Promise.all([
            axios.get(`${API_URL}/api/reports/comprehensive`, { params, headers }),
            ordersAPI.filter({ page: 1, limit: 100, ...params })
        ]);

        const responseData = reportResponse.data;
        setBestSellingItems(responseData.bestSellingItems.slice(0, 10));
        setOrdersByType(responseData.ordersByType);
        setWaiterPerformance(responseData.waiterPerformance.slice(0, 5));
        setMaterialUsage(responseData.materialUsage.items ? responseData.materialUsage.items.slice(0, 10) : []);
        setSalesReport(responseData.salesReport);
        setPeakHours(responseData.peakHours);
        setPaymentAnalytics(responseData.paymentAnalytics);
        setCategoryPerformance(responseData.categoryPerformance);
        setCancellationAnalysis(responseData.cancellationAnalysis);

        // set Recent Orders
        setRecentOrders(ordersResponse.data.orders || []);
    };

    const fetchBestSellingItems = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/best-selling-items`, { params, headers });
        setBestSellingItems(response.data);
    };

    const fetchOrdersByType = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/orders-by-type`, { params, headers });
        setOrdersByType(response.data);
    };

    const fetchWaiterPerformance = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/waiter-performance`, { params, headers });
        setWaiterPerformance(response.data);
    };

    const fetchMaterialUsage = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/material-usage`, { params, headers });
        setMaterialUsage(response.data.items || []);
    };

    const fetchSalesReport = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/sales-report`, { params, headers });
        setSalesReport(response.data);
    };

    const fetchPeakHours = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/peak-hours`, { params, headers });
        setPeakHours(response.data);
    };

    const fetchPaymentAnalytics = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/payment-analytics`, { params, headers });
        setPaymentAnalytics(response.data);
    };

    const fetchPaymentDetails = async (params: any) => {
        const queryParams = { ...params };
        console.log('Fetching payment details with filter:', paymentMethodFilter);
        if (paymentMethodFilter !== 'all') {
            queryParams.paymentMethod = paymentMethodFilter;
        }
        try {
            const response = await axios.get(`${API_URL}/api/reports/payment-details`, { params: queryParams, headers });
            setPaymentDetails(response.data);
        } catch (error) {
            console.error('Error fetching payment details', error);
        }
    };

    const fetchCategoryPerformance = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/category-performance`, { params, headers });
        setCategoryPerformance(response.data);
    };

    const fetchCancellationAnalysis = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/cancellation-analysis`, { params, headers });
        setCancellationAnalysis(response.data);
    };

    const fetchProfitLoss = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/profit-loss`, { params, headers });
        setProfitLoss(response.data);
    };

    const fetchCustomerAnalytics = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/customer-analytics`, { params, headers });
        setCustomerAnalytics(response.data);
    };

    const fetchInventoryStock = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/inventory-stock`, { params, headers });
        setInventoryStock(response.data);
    };

    const fetchCouponAnalytics = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/coupon-analytics`, { params, headers });
        setCouponAnalytics(response.data);
    };

    const fetchFeedback = async (params: any) => {
        const response = await feedbackAPI.getAll(params);
        setFeedbackData(response.data);
    };

    const fetchPromoSummary = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/promo-summary`, { 
            params: { ...params, promoType, promoCode: promoSearch }, 
            headers 
        });
        setPromoSummary(response.data);
    };

    const fetchPromoRedemptions = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/promo-redemptions`, { 
            params: { ...params, promoType, promoCode: promoSearch }, 
            headers 
        });
        setPromoRedemptions(response.data);
    };

    const fetchPromoCompensation = async (params: any) => {
        const response = await axios.get(`${API_URL}/api/reports/promo-compensation`, { 
            params: { ...params, promoType }, 
            headers 
        });
        setPromoCompensation(response.data);
    };

    const downloadExcel = async (reportType: string, customPaymentMethod?: string) => {
        try {
            const params: any = { reportType, period };
            if (period === 'custom' && startDate && endDate) {
                params.startDate = startDate;
                params.endDate = endDate;
            }

            if (reportType === 'payment-analytics') {
                const method = customPaymentMethod || (paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined);
                if (method) {
                    params.paymentMethod = method;
                }
            }

            const response = await axios.get(`${API_URL}/api/reports/export/excel`, {
                params,
                headers,
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report-${reportType}-${period}-${Date.now()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Excel report downloaded!');
        } catch (error) {
            console.error('Error downloading Excel:', error);
            toast.error('Failed to download Excel report');
        }
    };



    const formatOrderType = (type: string) => {
        if (!type) return '';
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    // Top 10 items for dashboard pie chart
    const bestTopTen =
        (bestSellingItems || [])
            .slice(0, 10)
            .map(item => ({
                itemName: item.itemName,
                totalQuantity: Number(item.totalQuantity) || 0
            }));

    const safeBestTopTen = bestTopTen.filter(i => i.totalQuantity > 0);



    // Dashboard top items
    const topItems =
        (bestSellingItems || [])
            .slice(0, 10)
            .map(item => ({
                itemName: item.itemName,
                totalQuantity: Number(item.totalQuantity) || 0
            }));


    // ---------- REPORTS PIE SAFE CALC ----------
    const pieData = Array.isArray(topItems) ? [...topItems] : [];

    const safePieData = pieData.filter(i => Number(i?.totalQuantity) > 0);

    const totalQuantity = safePieData.reduce(
        (sum, i) => sum + Number(i.totalQuantity || 0),
        0
    );

    const itemCount = safePieData.length;

    const pieRadius =
        isMobile ? 70 :
            isTablet ? 90 :
                110;

    const labelOffset =
        isMobile ? 10 :
            isTablet ? 16 :
                24;

    const hasBookings = safePieData.length > 0;

    const topItem =
        safePieData.length > 0
            ? safePieData.reduce((a, b) =>
                Number(a.totalQuantity) > Number(b.totalQuantity) ? a : b
            )
            : null;

    const totalOrdersAll = ordersByType.reduce(
        (sum, o) => sum + (o.totalOrders || 0),
        0
    );


    // Dashboard Tab
    const renderDashboard = () => (
        <Grid container spacing={3}>
            {/* Summary Cards */}
            <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                    Total Sales
                                </Typography>
                                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                                    {salesReport ? formatCurrency(salesReport.summary.totalSales) : '-'}
                                </Typography>
                            </Box>
                            <CurrencyExchangeIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.25)' }} />


                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                    Total Orders
                                </Typography>
                                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                                    {salesReport ? salesReport.summary.totalOrders : '-'}
                                </Typography>
                            </Box>
                            <ShoppingBagIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.25)' }} />

                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                    Avg Order Value
                                </Typography>
                                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                                    {salesReport ? formatCurrency(salesReport.summary.averageOrderValue) : '-'}
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    width: 70,
                                    height: 70,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <TrendingUpIcon
                                    sx={{
                                        fontSize: 36,
                                        color: '#ffffff'
                                    }}
                                />
                            </Box>

                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                    Top Items Sold
                                </Typography>
                                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                                    {topItems.length}
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    width: 70,
                                    height: 70,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <LeaderboardIcon
                                    sx={{
                                        fontSize: 36,
                                        color: '#ffffff'
                                    }}
                                />
                            </Box>

                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            {/* Total Tips Card */}
            <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                    Total Tips
                                </Typography>
                                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                                    {salesReport ? formatCurrency(salesReport.summary.totalTips || 0) : '-'}
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    width: 70,
                                    height: 70,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <PaymentsIcon
                                    sx={{
                                        fontSize: 36,
                                        color: '#ffffff'
                                    }}
                                />
                            </Box>


                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            {/* Total Tax Collected Card */}
            <Grid item xs={12} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                    Total Tax
                                </Typography>
                                <Box>
                                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                                        {salesReport ? formatCurrency(salesReport.summary.totalTax || 0) : '-'}
                                    </Typography>
                                    {salesReport?.summary?.taxBreakdown && (
                                        <Box mt={0.5}>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'block', lineHeight: 1.1 }}>
                                                Country: {formatCurrency(salesReport.summary.taxBreakdown.country)}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'block', lineHeight: 1.1 }}>
                                                State: {formatCurrency(salesReport.summary.taxBreakdown.state)}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'block', lineHeight: 1.1 }}>
                                                City: {formatCurrency(salesReport.summary.taxBreakdown.city)}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                            <Box
                                sx={{
                                    width: 70,
                                    height: 70,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <ReceiptIcon
                                    sx={{
                                        fontSize: 36,
                                        color: '#ffffff'
                                    }}
                                />
                            </Box>

                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            {/* Charts */}
            {/* Charts Row - Forced to new line */}
            <Grid item xs={12}>
                <Grid container spacing={{ xs: 2, md: 3 }}>

                    {/* LEFT — PIE STYLE CARD */}
                    <Grid item xs={12} md={7}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 2.5, sm: 3, md: 4 },
                                borderRadius: 5,
                                background: "#f5f5f5",
                            }}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    color: "#f4511e",
                                    fontWeight: 600,
                                    mb: { xs: 2, md: 3 },
                                    fontSize: { xs: 16, md: 18 }
                                }}
                            >
                                Item-wise Sales
                            </Typography>

                            {!hasBookings ? (
                                <Box sx={{ minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Typography color="text.secondary">
                                        No sales data available
                                    </Typography>
                                </Box>
                            ) : (

                                <Grid container spacing={2}>

                                    {/* PIE */}
                                    <Grid item xs={12}>
                                        <Box sx={{ width: "100%", height: { xs: 300, md: 340 } }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>

                                                    <Pie
                                                        data={safePieData}
                                                        dataKey="totalQuantity"
                                                        nameKey="itemName"
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={pieRadius}
                                                        stroke="none"
                                                        isAnimationActive={false}
                                                        minAngle={3}
                                                        paddingAngle={2}
                                                        labelLine={itemCount > 1}
                                                        label={({ cx, cy, midAngle, outerRadius, percent }) => {
                                                            if (!percent) return null;

                                                            const value = Math.round(percent * 100);

                                                            // hide ultra tiny slices only
                                                            if (value < 2) return null;

                                                            const RADIAN = Math.PI / 180;

                                                            // start of line (edge of slice)
                                                            const sx = cx + outerRadius * Math.cos(-midAngle * RADIAN);
                                                            const sy = cy + outerRadius * Math.sin(-midAngle * RADIAN);

                                                            // elbow point
                                                            const mx = cx + (outerRadius + 12) * Math.cos(-midAngle * RADIAN);
                                                            const my = cy + (outerRadius + 12) * Math.sin(-midAngle * RADIAN);

                                                            // text position
                                                            const ex = cx + (outerRadius + 28) * Math.cos(-midAngle * RADIAN);
                                                            const ey = cy + (outerRadius + 28) * Math.sin(-midAngle * RADIAN);

                                                            const textAnchor = ex > cx ? "start" : "end";

                                                            return (
                                                                <g>
                                                                    {/* leader line */}
                                                                    <polyline
                                                                        points={`${sx},${sy} ${mx},${my} ${ex},${ey}`}
                                                                        fill="none"
                                                                        stroke="#9ca3af"
                                                                        strokeWidth={1.5}
                                                                    />

                                                                    {/* small circle on slice */}
                                                                    <circle cx={sx} cy={sy} r={2} fill="#9ca3af" />

                                                                    {/* percentage text */}
                                                                    <text
                                                                        x={ex + (ex > cx ? 4 : -4)}
                                                                        y={ey}
                                                                        textAnchor={textAnchor}
                                                                        dominantBaseline="central"
                                                                        fill="#374151"
                                                                        style={{
                                                                            fontSize: isMobile ? 11 : 12,
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        {value}%
                                                                    </text>
                                                                </g>
                                                            );
                                                        }}

                                                    >
                                                        {safePieData.map((_, index) => (
                                                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>

                                                    {/* center label if single item */}
                                                    {itemCount === 1 && totalQuantity > 0 && (
                                                        <>
                                                            <text
                                                                x="50%"
                                                                y="48%"
                                                                textAnchor="middle"
                                                                dominantBaseline="central"
                                                                style={{
                                                                    fontSize: isMobile ? 18 : 22,
                                                                    fontWeight: 800,
                                                                    fill: "#111827"
                                                                }}
                                                            >
                                                                {Math.round((topItem?.totalQuantity || 0) / totalQuantity * 100)}%
                                                            </text>

                                                            <text
                                                                x="50%"
                                                                y="62%"
                                                                textAnchor="middle"
                                                                dominantBaseline="central"
                                                                style={{
                                                                    fontSize: isMobile ? 10 : 12,
                                                                    fill: "#6b7280"
                                                                }}
                                                            >
                                                                Top item share
                                                            </text>
                                                        </>
                                                    )}

                                                    <RechartsTooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </Box>
                                    </Grid>

                                    {/* LEGEND BELOW PIE */}
                                    <Grid item xs={12} sx={{ mt: 1 }}>
                                        <Box
                                            sx={{
                                                mt: 1,
                                                display: "grid",
                                                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                                                gap: 1.2
                                            }}
                                        >
                                            {safePieData.map((item, index) => {
                                                return (
                                                    <Box
                                                        key={index}
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            bgcolor: "#fff",
                                                            px: 1.5,
                                                            py: 1,
                                                            borderRadius: 2,
                                                            boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
                                                        }}
                                                    >
                                                        <Box sx={{ display: "flex", alignItems: "center" }}>
                                                            <Box
                                                                sx={{
                                                                    width: 10,
                                                                    height: 10,
                                                                    borderRadius: "50%",
                                                                    bgcolor: COLORS[index % COLORS.length],
                                                                    mr: 1
                                                                }}
                                                            />
                                                            <Typography variant="body2">
                                                                {item.itemName}
                                                            </Typography>
                                                        </Box>

                                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                            {item.totalQuantity}
                                                        </Typography>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    </Grid>

                                </Grid>
                            )}
                        </Paper>
                    </Grid>

                    {/* RIGHT — ORDER TYPE CARDS */}
                    <Grid item xs={12} md={5}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 2.5, sm: 3, md: 4 },
                                borderRadius: 5,
                                background: "#f5f5f5",
                            }}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    color: "#f4511e",
                                    fontWeight: 600,
                                    mb: { xs: 2, md: 3 },
                                    fontSize: { xs: 16, md: 18 }
                                }}
                            >
                                Order from
                            </Typography>

                            {filteredOrders.map((item, index) => {

                                const totalOrdersAll = ordersByType.reduce(
                                    (sum, o) => sum + (o.totalOrders || 0),
                                    0
                                );

                                const percent = totalOrdersAll
                                    ? (item.totalOrders / totalOrdersAll) * 100
                                    : 0;

                                return (
                                    <Box
                                        key={index}
                                        sx={{
                                            mb: 2.5,
                                            p: { xs: 1.5, sm: 2 },
                                            borderRadius: 3,
                                            background: "#fff",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                fontWeight: 600,
                                                mb: 1,
                                                fontSize: { xs: 13, md: 14 }
                                            }}
                                        >
                                            {item.orderType}
                                        </Typography>

                                        <Box
                                            sx={{
                                                height: 8,
                                                background: "#eee",
                                                borderRadius: 5,
                                                overflow: "hidden",
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: `${percent}%`,
                                                    height: "100%",
                                                    background: "#f4511e",
                                                    borderRadius: 10,
                                                }}
                                            />
                                        </Box>

                                        <Typography
                                            variant="body2"
                                            sx={{
                                                textAlign: "right",
                                                mt: 1,
                                                color: "#f4511e",
                                                fontWeight: 600,
                                                fontSize: { xs: 12, md: 13 }
                                            }}
                                        >
                                            {item.totalOrders}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Paper>
                    </Grid>

                </Grid>
            </Grid>

            {/* Sales Trend */}
            {/* <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Sales Trend
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesReport?.dailySales || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="_id" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Line type="monotone" dataKey="totalSales" stroke="#8884d8" name="Sales" strokeWidth={2} isAnimationActive={false} />
                            <Line type="monotone" dataKey="totalOrders" stroke="#82ca9d" name="Orders" strokeWidth={2} isAnimationActive={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid> */}

            {/* Waiter Performance */}
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Top Performers (Waiters)
                    </Typography>
                    <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Waiter</TableCell>
                                    <TableCell align="right">Orders</TableCell>
                                    <TableCell align="right">Sales</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {waiterPerformance.slice(0, 5).map((waiter, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{waiter.waiterName}</TableCell>
                                        <TableCell align="right">{waiter.totalOrders}</TableCell>
                                        <TableCell align="right">{formatCurrency(waiter.totalSales)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Grid>

            {/* Material Usage */}
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Top Material Usage
                    </Typography>
                    <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Item</TableCell>
                                    <TableCell align="right">Used</TableCell>
                                    <TableCell align="right">Unit</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {materialUsage.slice(0, 5).map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.itemName}</TableCell>
                                        <TableCell align="right">{item.totalUsed}</TableCell>
                                        <TableCell align="right">{item.unit}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Grid>

            {/* Recent Orders Table */}
            <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Recent Orders
                    </Typography>
                    <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Order #</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell align="right">Tip</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {recentOrders
                                    .slice(recentOrdersPage * recentOrdersRowsPerPage, recentOrdersPage * recentOrdersRowsPerPage + recentOrdersRowsPerPage)
                                    .map((order: any) => (
                                        <TableRow key={order._id || order.id}>
                                            <TableCell>{order.orderNumber}</TableCell>
                                            <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Chip label={formatOrderType(order.orderType)} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={order.status}
                                                    size="small"
                                                    color={order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'error' : 'warning'}
                                                />
                                            </TableCell>
                                            <TableCell align="right">{formatCurrency(order.totalAmount)}</TableCell>
                                            <TableCell align="right">{formatCurrency(order.tip || 0)}</TableCell>
                                        </TableRow>
                                    ))}
                                {recentOrders.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">No recent orders found</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        component="div"
                        count={recentOrders.length}
                        rowsPerPage={recentOrdersRowsPerPage}
                        page={recentOrdersPage}
                        onPageChange={(_, newPage) => setRecentOrdersPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setRecentOrdersRowsPerPage(parseInt(e.target.value, 10));
                            setRecentOrdersPage(0);
                        }}
                    />
                </Paper>
            </Grid>
        </Grid>
    );

    const bestPieData = (bestSellingItems || [])
        .slice(0, 10)
        .map(item => ({
            itemName: item.itemName,
            totalQuantity: Number(item.totalQuantity) || 0
        }));

    const safeBestPie = bestPieData.filter(i => i.totalQuantity > 0);

    const bestTotalQty = safeBestPie.reduce(
        (sum, i) => sum + i.totalQuantity,
        0
    );

    const bestItemCount = safeBestPie.length;

    const hasBestData = safeBestPie.length > 0;

    const bestTopItem =
        safeBestPie.length > 0
            ? safeBestPie.reduce((a, b) =>
                a.totalQuantity > b.totalQuantity ? a : b
            )
            : null;
    // ✅ Show only order types that actually have orders
    const filteredOrders = ordersByType.filter(
        o => Number(o.totalOrders) > 0
    );

    // Best Selling Items Tab
    const renderBestSellingItems = () => (
        <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Best Selling Items</Typography>
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadExcel('best-selling')}
                >
                    Export Excel
                </Button>
            </Stack>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Grid container spacing={3} sx={{ alignItems: "stretch" }}>

                        {/* LEFT SIDE */}
                        <Grid item xs={12} md={8}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 4,
                                    borderRadius: 6,
                                    background: "transparent",
                                    height: "100%"
                                }}
                            >
                                <Typography
                                    variant="h6"
                                    sx={{
                                        color: "#f4511e",
                                        fontWeight: 600,
                                        mb: 3,
                                    }}
                                >
                                    Item-wise Sales
                                </Typography>

                                {!hasBestData ? (
                                    <Box sx={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Typography color="text.secondary">
                                            No best selling data available
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Grid container direction="column" sx={{ gap: 3 }}>

                                        {/* Pie */}
                                        <Grid item xs={12}>
                                            <ResponsiveContainer width="100%" height={320}>
                                                <PieChart>
                                                    <Pie
                                                        minAngle={3}
                                                        data={safeBestPie}
                                                        dataKey="totalQuantity"
                                                        nameKey="itemName"
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={isMobile ? 55 : isTablet ? 70 : 85}
                                                        stroke="none"
                                                        paddingAngle={2}
                                                        isAnimationActive={false}
                                                        label={({ cx, cy, midAngle, outerRadius, percent }) => {
                                                            if (!percent) return null;
                                                            const value = Math.round(percent * 100);
                                                            if (value < 2) return null;
                                                            const RADIAN = Math.PI / 180;
                                                            const sx = cx + outerRadius * Math.cos(-midAngle * RADIAN);
                                                            const sy = cy + outerRadius * Math.sin(-midAngle * RADIAN);
                                                            const mx = cx + (outerRadius + 20) * Math.cos(-midAngle * RADIAN);
                                                            const my = cy + (outerRadius + 20) * Math.sin(-midAngle * RADIAN);
                                                            const ex = cx + (outerRadius + 45) * Math.cos(-midAngle * RADIAN);
                                                            const ey = cy + (outerRadius + 45) * Math.sin(-midAngle * RADIAN);
                                                            const textAnchor = ex > cx ? "start" : "end";
                                                            return (
                                                                <g>
                                                                    <polyline
                                                                        points={`${sx},${sy} ${mx},${my} ${ex},${ey}`}
                                                                        fill="none"
                                                                        stroke="#9ca3af"
                                                                        strokeWidth={1.5}
                                                                    />
                                                                    <circle cx={sx} cy={sy} r={2} fill="#9ca3af" />
                                                                    <text
                                                                        x={ex + (ex > cx ? 4 : -4)}
                                                                        y={ey}
                                                                        textAnchor={textAnchor}
                                                                        dominantBaseline="central"
                                                                        fill="#374151"
                                                                        style={{ fontSize: 12, fontWeight: 600 }}
                                                                    >
                                                                        {value}%
                                                                    </text>
                                                                </g>
                                                            );
                                                        }}
                                                        labelLine={false}
                                                    >
                                                        {safeBestPie.map((entry, index) => (
                                                            <Cell
                                                                key={index}
                                                                fill={COLORS[index % COLORS.length]}
                                                            />
                                                        ))}
                                                    </Pie>
                                                    {bestItemCount === 1 && bestTotalQty > 0 && (
                                                        <>
                                                            <text
                                                                x="50%"
                                                                y="48%"
                                                                textAnchor="middle"
                                                                dominantBaseline="central"
                                                                style={{
                                                                    fontSize: isMobile ? 18 : 22,
                                                                    fontWeight: 800,
                                                                    fill: "#111827"
                                                                }}
                                                            >
                                                                {Math.round(((bestTopItem?.totalQuantity || 0) / bestTotalQty) * 100)}%
                                                            </text>
                                                            <text
                                                                x="50%"
                                                                y="62%"
                                                                textAnchor="middle"
                                                                dominantBaseline="central"
                                                                style={{
                                                                    fontSize: isMobile ? 10 : 12,
                                                                    fill: "#6b7280"
                                                                }}
                                                            >
                                                                Top item share
                                                            </text>
                                                        </>
                                                    )}
                                                    <RechartsTooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </Grid>

                                        {/* Custom Legend */}
                                        <Grid item xs={12}>
                                            <Box
                                                sx={{
                                                    display: "grid",
                                                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                                                    gap: 1.2
                                                }}
                                            >
                                                {safeBestPie.map((item, index) => (
                                                    <Box
                                                        key={index}
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            bgcolor: "#fff",
                                                            px: 1.5,
                                                            py: 1,
                                                            borderRadius: 2,
                                                            boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
                                                        }}
                                                    >
                                                        <Box sx={{ display: "flex", alignItems: "center" }}>
                                                            <Box
                                                                sx={{
                                                                    width: 10,
                                                                    height: 10,
                                                                    borderRadius: "50%",
                                                                    bgcolor: COLORS[index % COLORS.length],
                                                                    mr: 1
                                                                }}
                                                            />
                                                            <Typography variant="body2">
                                                                {item.itemName}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                            {item.totalQuantity}
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Grid>

                                    </Grid>
                                )}
                            </Paper>
                        </Grid>

                        {/* RIGHT SIDE */}
                        <Grid item xs={12} md={4}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 4,
                                    borderRadius: 6,
                                    background: "transparent",
                                    height: "100%"
                                }}
                            >
                                <Typography
                                    variant="h6"
                                    sx={{
                                        color: "#f4511e",
                                        fontWeight: 600,
                                        mb: 3,
                                    }}
                                >
                                    Order from
                                </Typography>

                                {filteredOrders.map((item, index) => {
                                    const totalOrdersAll = filteredOrders.reduce(
                                        (sum, o) => sum + (o.totalOrders || 0),
                                        0
                                    );
                                    const orderPercent = totalOrdersAll
                                        ? (item.totalOrders / totalOrdersAll) * 100
                                        : 0;
                                    return (
                                        <Box
                                            key={index}
                                            sx={{
                                                mb: 3,
                                                p: 2.5,
                                                borderRadius: 4,
                                                background: "#f7ebe5",
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                sx={{ fontWeight: 600, mb: 1 }}
                                            >
                                                {item.orderType}
                                            </Typography>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 2,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        flex: 1,
                                                        height: 6,
                                                        background: "#e0e0e0",
                                                        borderRadius: 10,
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: `${orderPercent}%`,
                                                            height: "100%",
                                                            background: "#f4511e",
                                                            borderRadius: 10,
                                                        }}
                                                    />
                                                </Box>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: "#f4511e",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {item.totalOrders}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Paper>
                        </Grid>

                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Rank</TableCell>
                                    <TableCell>Item Name</TableCell>
                                    <TableCell>Category</TableCell>
                                    <TableCell align="right">Quantity Sold</TableCell>
                                    <TableCell align="right">Total Revenue</TableCell>
                                    <TableCell align="right">Order Count</TableCell>
                                    <TableCell align="right">Avg Price</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bestSellingItems
                                    .slice(bestSellingPage * bestSellingRowsPerPage, bestSellingPage * bestSellingRowsPerPage + bestSellingRowsPerPage)
                                    .map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Chip
                                                    label={bestSellingPage * bestSellingRowsPerPage + index + 1}
                                                    size="small"
                                                    color={bestSellingPage * bestSellingRowsPerPage + index < 3 ? 'primary' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell>{item.itemName}</TableCell>
                                            <TableCell>{item.category}</TableCell>
                                            <TableCell align="right">{item.totalQuantity}</TableCell>
                                            <TableCell align="right">{formatCurrency(item.totalRevenue)}</TableCell>
                                            <TableCell align="right">{item.orderCount}</TableCell>
                                            <TableCell align="right">{formatCurrency(item.averagePrice)}</TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={bestSellingItems.length}
                        rowsPerPage={bestSellingRowsPerPage}
                        page={bestSellingPage}
                        onPageChange={(_, newPage) => setBestSellingPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setBestSellingRowsPerPage(parseInt(e.target.value, 10));
                            setBestSellingPage(0);
                        }}
                    />
                </Grid>
            </Grid>
        </Paper >
    );
 
    // Tips Report Tab
    const renderTipsReport = () => (
        <Grid container spacing={3}>
            {/* Header with Export Button */}
            <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h5" sx={{ color: 'black', fontWeight: 'bold' }}>Tips Report</Typography>
                    <Button 
                        variant="contained" 
                        startIcon={<DownloadIcon />}
                        onClick={() => downloadExcel('tips-report')}
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                        Export Tips Excel
                    </Button>
                </Box>
            </Grid>
            {/* Tip Summary Cards */}
            <Grid item xs={12} md={4}>
                <Card sx={{ 
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 4,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 30px 0 rgba(79, 70, 229, 0.12)',
                    }
                }}>
                    <Box sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: 4, 
                        height: '100%', 
                        bgcolor: 'primary.main' 
                    }} />
                    <CardContent sx={{ p: 3 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 56,
                                height: 56,
                                borderRadius: 3,
                                bgcolor: alpha('#4F46E5', 0.1),
                                color: 'primary.main'
                            }}>
                                <PaymentsIcon sx={{ fontSize: 32 }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                                    Total Tips
                                </Typography>
                                <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800 }}>
                                    {salesReport ? formatCurrency(salesReport.summary.totalTips || 0) : '-'}
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} md={4}>
                <Card sx={{ 
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 4,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 30px 0 rgba(236, 72, 153, 0.12)',
                    }
                }}>
                    <Box sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: 4, 
                        height: '100%', 
                        bgcolor: 'secondary.main' 
                    }} />
                    <CardContent sx={{ p: 3 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 56,
                                height: 56,
                                borderRadius: 3,
                                bgcolor: alpha('#EC4899', 0.1),
                                color: 'secondary.main'
                            }}>
                                <TrendingUpIcon sx={{ fontSize: 32 }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                                    Avg Tip Per Order
                                </Typography>
                                <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800 }}>
                                    {salesReport && salesReport.summary.totalOrders > 0
                                        ? formatCurrency(salesReport.summary.totalTips / salesReport.summary.totalOrders)
                                        : formatCurrency(0)}
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} md={4}>
                <Card sx={{ 
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 4,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 30px 0 rgba(16, 185, 129, 0.12)',
                    }
                }}>
                    <Box sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: 4, 
                        height: '100%', 
                        bgcolor: 'success.main' 
                    }} />
                    <CardContent sx={{ p: 3 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 56,
                                height: 56,
                                borderRadius: 3,
                                bgcolor: alpha('#10B981', 0.1),
                                color: 'success.main'
                            }}>
                                <ReceiptIcon sx={{ fontSize: 32 }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                                    Orders with Tips
                                </Typography>
                                <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800 }}>
                                    {salesReport ? salesReport.summary.ordersWithTips || 0 : '-'}
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            {/* Tips Trend Chart */}
            <Grid item xs={12}>
                <Paper sx={{ 
                    p: 3, 
                    borderRadius: 4, 
                    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
                    border: '1px solid',
                    borderColor: 'divider'
                }}>
                    <Typography variant="h6" gutterBottom color="black" fontWeight="800" sx={{ mb: 3 }}>
                        Tips Trend Analysis
                    </Typography>
                    <Box sx={{ width: "100%", height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesReport?.dailySales || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTips" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.2}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha('#000', 0.05)} />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                    style={{ fontSize: 12, fontWeight: 600 }}
                                    tick={{ fill: alpha('#000', 0.5) }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => formatCurrency(val)} 
                                    style={{ fontSize: 12, fontWeight: 600 }}
                                    tick={{ fill: alpha('#000', 0.5) }}
                                    dx={-10}
                                />
                                <RechartsTooltip 
                                    cursor={{ fill: alpha('#000', 0.05), radius: 8 }}
                                    contentStyle={{ 
                                        borderRadius: '12px', 
                                        border: 'none', 
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                        padding: '12px'
                                    }}
                                    itemStyle={{ fontWeight: 700, color: '#4F46E5' }}
                                    labelStyle={{ fontWeight: 600, color: 'rgba(0,0,0,0.5)', marginBottom: '4px' }}
                                    formatter={(value: any) => [formatCurrency(value), 'Total Tips']}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                />
                                <Bar 
                                    dataKey="totalTips" 
                                    fill="url(#colorTips)"
                                    radius={[6, 6, 0, 0]} 
                                    barSize={32}
                                    name="Tips"
                                    animationDuration={1500}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Grid>

            {/* Detailed Tips List */}
            <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" color="black" fontWeight="bold">
                            Orders with Tips
                        </Typography>
                    </Stack>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 700, color: 'black' }}>Order #</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'black' }}>Date/Time</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'black' }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'black' }}>Waiter</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'black' }} align="right">Order Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: 'black' }} align="right">Tip Amount</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {recentOrders
                                    .filter(order => (order.tip || 0) > 0)
                                    .slice(tipsReportPage * tipsReportRowsPerPage, tipsReportPage * tipsReportRowsPerPage + tipsReportRowsPerPage)
                                    .map((order) => (
                                        <TableRow key={order._id}>
                                            <TableCell>{order.orderNumber}</TableCell>
                                            <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Chip label={formatOrderType(order.orderType)} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell>
                                                {order.waiter && typeof order.waiter === 'object' 
                                                    ? `${order.waiter.firstName || ''} ${order.waiter.lastName || ''}`.trim() || order.waiter.email || '-'
                                                    : order.waiterName || '-'}
                                            </TableCell>
                                            <TableCell align="right">{formatCurrency(order.totalAmount)}</TableCell>
                                            <TableCell align="right">
                                                <Typography sx={{ fontWeight: 700, color: 'black' }}>
                                                    {formatCurrency(order.tip || 0)}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                {recentOrders.filter(order => (order.tip || 0) > 0).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">No orders with tips found in the selected period.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={recentOrders.filter(order => (order.tip || 0) > 0).length}
                        rowsPerPage={tipsReportRowsPerPage}
                        page={tipsReportPage}
                        onPageChange={(_, newPage) => setTipsReportPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setTipsReportRowsPerPage(parseInt(e.target.value, 10));
                            setTipsReportPage(0);
                        }}
                    />
                </Paper>
            </Grid>
        </Grid>
    );



    const hasOrdersByTypeData =
        ordersByType &&
        ordersByType.some(o => Number(o.totalOrders) > 0);

    // Orders by Type Tab
    // const renderOrdersByType = () => (
    //     <Paper sx={{ p: 3 }}>
    //         <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
    //             <Typography variant="h6">Orders by Type</Typography>
    //             <Button
    //                 variant="contained"
    //                 startIcon={<DownloadIcon />}
    //                 onClick={() => downloadExcel('orders-by-type')}
    //             >
    //                 Export Excel
    //             </Button>
    //         </Stack>

    //         <Grid container spacing={3}>

    //             {/* ================= TOP SECTION ================= */}
    //             <Grid item xs={12} container spacing={3}>

    //                 {/* LEFT SIDE — PIE CARD */}
    //                 <Grid item xs={12} lg={8}>
    //                     <Paper sx={{ p: 4, borderRadius: 4, height: '100%' }}>

    //                         {!hasOrdersByTypeData ? (
    //                             <Box sx={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
    //                                 <Typography color="text.secondary">
    //                                     No orders data available
    //                                 </Typography>
    //                             </Box>
    //                         ) : (
    //                             <>
    //                                 {/* PIE */}
    //                                 <Box sx={{ width: "100%", height: { xs: 260, sm: 300, md: 340, lg: 360 } }}>
    //                                     <ResponsiveContainer width="100%" height="100%">
    //                                         <PieChart>
    //                                             <Pie
    //                                                 data={ordersByType}
    //                                                 dataKey="totalRevenue"
    //                                                 nameKey="orderType"
    //                                                 cx="50%"
    //                                                 cy="50%"
    //                                                 outerRadius="75%"
    //                                                 paddingAngle={3}
    //                                                 isAnimationActive={false}
    //                                                 label={({ percent }) =>
    //                                                     percent && percent > 0.02
    //                                                         ? `${Math.round(percent * 100)}%`
    //                                                         : ""
    //                                                 }
    //                                             >
    //                                                 {ordersByType.map((entry, index) => (
    //                                                     <Cell key={index} fill={COLORS[index % COLORS.length]} />
    //                                                 ))}
    //                                             </Pie>
    //                                             <RechartsTooltip />
    //                                         </PieChart>
    //                                     </ResponsiveContainer>
    //                                 </Box>

    //                                 {/* LEGEND */}
    //                                 <Box
    //                                     sx={{
    //                                         mt: 3,
    //                                         display: "grid",
    //                                         gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
    //                                         gap: 1.5
    //                                     }}
    //                                 >
    //                                     {ordersByType.map((type, index) => {

    //                                         const totalRevenue = ordersByType.reduce(
    //                                             (sum, t) => sum + t.totalRevenue,
    //                                             0
    //                                         );

    //                                         const percent =
    //                                             totalRevenue > 0
    //                                                 ? (type.totalRevenue / totalRevenue) * 100
    //                                                 : 0;

    //                                         return (
    //                                             <Box
    //                                                 key={index}
    //                                                 sx={{
    //                                                     display: "flex",
    //                                                     alignItems: "center",
    //                                                     justifyContent: "space-between",
    //                                                     bgcolor: "#f9fafb",
    //                                                     px: 1.5,
    //                                                     py: 1,
    //                                                     borderRadius: 2,
    //                                                 }}
    //                                             >
    //                                                 <Box sx={{ display: "flex", alignItems: "center" }}>
    //                                                     <Box
    //                                                         sx={{
    //                                                             width: 10,
    //                                                             height: 10,
    //                                                             borderRadius: "50%",
    //                                                             bgcolor: COLORS[index % COLORS.length],
    //                                                             mr: 1
    //                                                         }}
    //                                                     />
    //                                                     <Typography variant="body2">
    //                                                         {formatOrderType(type.orderType)}
    //                                                     </Typography>
    //                                                 </Box>

    //                                                 <Typography variant="body2" fontWeight={600}>
    //                                                     {percent.toFixed(0)}%
    //                                                 </Typography>
    //                                             </Box>
    //                                         );
    //                                     })}
    //                                 </Box>
    //                             </>
    //                         )}
    //                     </Paper>
    //                 </Grid>

    //                 {/* RIGHT SIDE — ORDER CARDS */}
    //                 <Grid item xs={12} lg={4}>
    //                     <Paper sx={{ p: 3, borderRadius: 4 }}>

    //                         {!hasOrdersByTypeData ? (
    //                             <Box sx={{ py: 6, textAlign: "center" }}>

    //                             </Box>
    //                         ) : (
    //                             <Stack spacing={3}>
    //                                 {ordersByType.map((type, index) => {

    //                                     const total = ordersByType.reduce(
    //                                         (sum, t) => sum + t.totalOrders,
    //                                         0
    //                                     );

    //                                     const percentage =
    //                                         total > 0
    //                                             ? (type.totalOrders / total) * 100
    //                                             : 0;

    //                                     return (
    //                                         <Box key={index} sx={{ p: 2, borderRadius: 3, backgroundColor: '#f8f8f8' }}>
    //                                             <Stack direction="row" justifyContent="space-between" mb={1}>
    //                                                 <Typography fontWeight={500}>
    //                                                     {formatOrderType(type.orderType)}
    //                                                 </Typography>

    //                                                 <Typography fontWeight={600}>
    //                                                     {type.totalOrders}
    //                                                 </Typography>
    //                                             </Stack>

    //                                             <Box sx={{ height: 8, borderRadius: 4, backgroundColor: '#e0e0e0', overflow: 'hidden' }}>
    //                                                 <Box
    //                                                     sx={{
    //                                                         width: `${percentage}%`,
    //                                                         height: '100%',
    //                                                         backgroundColor: COLORS[index % COLORS.length],
    //                                                     }}
    //                                                 />
    //                                             </Box>

    //                                             <Typography variant="caption" color="text.secondary">
    //                                                 {percentage.toFixed(0)}%
    //                                             </Typography>
    //                                         </Box>
    //                                     );
    //                                 })}
    //                             </Stack>
    //                         )}
    //                     </Paper>
    //                 </Grid>

    //             </Grid>

    //             {/* ================= TABLE ================= */}
    //             <Grid item xs={12}>
    //                 <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
    //                     <Table>
    //                         <TableHead>
    //                             <TableRow>
    //                                 <TableCell>Order Type</TableCell>
    //                                 <TableCell align="right">Total Orders</TableCell>
    //                                 <TableCell align="right">Total Revenue</TableCell>
    //                                 <TableCell align="right">Avg Order Value</TableCell>
    //                                 <TableCell align="right">Cancelled</TableCell>
    //                                 <TableCell align="right">Success Rate</TableCell>
    //                             </TableRow>
    //                         </TableHead>

    //                         <TableBody>
    //                             {!hasOrdersByTypeData ? (
    //                                 <TableRow>
    //                                     <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
    //                                         <Typography color="text.secondary">
    //                                             No orders data available
    //                                         </Typography>
    //                                     </TableCell>
    //                                 </TableRow>
    //                             ) : (
    //                                 ordersByType.map((type, index) => (
    //                                     <TableRow key={index}>
    //                                         {/* your cells */}
    //                                     </TableRow>
    //                                 ))
    //                             )}
    //                         </TableBody>
    //                     </Table>
    //                 </TableContainer>
    //             </Grid>

    //         </Grid>
    //     </Paper>
    // );
    const renderOrdersByType = () => (
        <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Orders by Type</Typography>
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadExcel('orders-by-type')}
                >
                    Export Excel
                </Button>
            </Stack>

            <Grid container spacing={3}>
                <Grid container spacing={3}>

                    {/* LEFT SIDE — PIE CARD */}
                    <Grid item xs={12} lg={8}>
                        <Paper
                            sx={{
                                p: 4,
                                borderRadius: 4,
                                height: '100%',
                            }}
                        >
                            {/* <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                mb={3}
                            >
                                <Typography variant="h6" fontWeight={600}>
                                    Orders by Type
                                </Typography>

                                <Button
                                    variant="contained"
                                    startIcon={<DownloadIcon />}
                                    onClick={() => downloadExcel('orders-by-type')}
                                >
                                    Export Excel
                                </Button>
                            </Stack> */}

                            <Grid container direction="column" alignItems="center">

                                {/* PIE */}
                                <Grid item xs={12} sx={{ width: '100%' }}>
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: {
                                                xs: 260,   // mobile
                                                sm: 300,   // tablet
                                                md: 340,   // laptop
                                                lg: 360    // desktop
                                            }
                                        }}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={ordersByType}
                                                    dataKey="totalRevenue"
                                                    nameKey="orderType"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius="75%"
                                                    paddingAngle={3}
                                                    isAnimationActive={false}

                                                    label={({ percent, cx, cy, midAngle, outerRadius }) => {
                                                        if (!percent) return null;

                                                        const value = Math.round(percent * 100);
                                                        if (value < 2) return null;

                                                        const RADIAN = Math.PI / 180;
                                                        const x = cx + (outerRadius + 18) * Math.cos(-midAngle * RADIAN);
                                                        const y = cy + (outerRadius + 18) * Math.sin(-midAngle * RADIAN);

                                                        return (
                                                            <text
                                                                x={x}
                                                                y={y}
                                                                textAnchor={x > cx ? "start" : "end"}
                                                                dominantBaseline="central"
                                                                style={{
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    fill: "#374151"
                                                                }}
                                                            >
                                                                {value}%
                                                            </text>
                                                        );
                                                    }}
                                                >
                                                    {ordersByType.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={COLORS[index % COLORS.length]}
                                                        />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Grid>

                                {/* LEGEND UNDER PIE */}
                                <Grid item xs={12} sx={{ width: '100%', mt: 2 }}>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "1fr 1fr",
                                                md: "1fr 1fr",
                                                lg: "1fr 1fr"
                                            },
                                            gap: 1.5,
                                            px: { xs: 1, sm: 2 }
                                        }}
                                    >
                                        {ordersByType.map((type, index) => {

                                            const totalRevenue = ordersByType.reduce(
                                                (sum, t) => sum + t.totalRevenue,
                                                0
                                            );

                                            const percent =
                                                totalRevenue > 0
                                                    ? (type.totalRevenue / totalRevenue) * 100
                                                    : 0;

                                            return (
                                                <Box
                                                    key={index}
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        bgcolor: "#f9fafb",
                                                        px: 1.5,
                                                        py: 1,
                                                        borderRadius: 2,
                                                    }}
                                                >
                                                    <Box sx={{ display: "flex", alignItems: "center" }}>
                                                        <Box
                                                            sx={{
                                                                width: 10,
                                                                height: 10,
                                                                borderRadius: "50%",
                                                                bgcolor: COLORS[index % COLORS.length],
                                                                mr: 1
                                                            }}
                                                        />
                                                        <Typography variant="body2">
                                                            {formatOrderType(type.orderType)}
                                                        </Typography>
                                                    </Box>

                                                    <Typography variant="body2" fontWeight={600}>
                                                        {percent.toFixed(0)}%
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Grid>

                            </Grid>
                        </Paper>
                    </Grid>

                    {/* RIGHT SIDE — ORDER FROM CARDS */}
                    <Grid item xs={12} lg={4}>
                        <Paper sx={{ p: 3, borderRadius: 4 }}>
                            <Typography variant="h6" fontWeight={600} mb={3}>
                                Order from
                            </Typography>

                            <Stack spacing={3}>
                                {ordersByType.map((type, index) => {
                                    const total = ordersByType.reduce(
                                        (sum, t) => sum + t.totalOrders,
                                        0
                                    );

                                    const percentage =
                                        total > 0
                                            ? (type.totalOrders / total) * 100
                                            : 0;

                                    return (
                                        <Box
                                            key={index}
                                            sx={{
                                                p: 2,
                                                borderRadius: 3,
                                                backgroundColor: '#f8f8f8',
                                            }}
                                        >
                                            <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                                mb={1}
                                            >
                                                <Typography fontWeight={500}>
                                                    {formatOrderType(type.orderType)}
                                                </Typography>

                                                <Typography fontWeight={600}>
                                                    {type.totalOrders}
                                                </Typography>
                                            </Stack>

                                            <Box
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    backgroundColor: '#e0e0e0',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: `${percentage}%`,
                                                        height: '100%',
                                                        backgroundColor:
                                                            COLORS[index % COLORS.length],
                                                    }}
                                                />
                                            </Box>

                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                {percentage.toFixed(0)}%
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Order Type</TableCell>
                                    <TableCell align="right">Total Orders</TableCell>
                                    <TableCell align="right">Total Revenue</TableCell>
                                    <TableCell align="right">Avg Order Value</TableCell>
                                    <TableCell align="right">Cancelled</TableCell>
                                    <TableCell align="right">Success Rate</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ordersByType.map((type, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Chip label={formatOrderType(type.orderType)} color="primary" />
                                        </TableCell>
                                        <TableCell align="right">{type.totalOrders}</TableCell>
                                        <TableCell align="right">{formatCurrency(type.totalRevenue)}</TableCell>
                                        <TableCell align="right">{formatCurrency(type.averageOrderValue)}</TableCell>
                                        <TableCell align="right">{type.cancelledOrders}</TableCell>
                                        <TableCell align="right">
                                            <Chip
                                                label={`${type.successRate?.toFixed(1)}%`}
                                                color={type.successRate > 90 ? 'success' : 'warning'}
                                                size="small"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>
        </Paper>
    );

    // Waiter Performance Tab
    const renderWaiterPerformance = () => (
        <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Waiter Performance Report</Typography>
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadExcel('waiter-performance')}
                >
                    Export Excel
                </Button>
            </Stack>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <ResponsiveContainer width="100%" height={420}>
                        <BarChart
                            data={waiterPerformance}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />

                            <XAxis
                                dataKey="waiterName"
                                angle={-20}
                                textAnchor="end"
                                height={80}
                                tick={{ fontSize: 12 }}
                            />

                            {/* LEFT Y AXIS – ORDERS */}
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                tick={{ fontSize: 12 }}
                            />

                            {/* RIGHT Y AXIS – SALES */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tickFormatter={(value) => formatCurrency(value)}
                                tick={{ fontSize: 12 }}
                            />

                            <RechartsTooltip
                                formatter={(value: any, name: any) => {
                                    if (name === "Sales") {
                                        return [formatCurrency(value), "Total Sales"];
                                    }
                                    return [value, "Total Orders"];
                                }}
                            />

                            <Legend wrapperStyle={{ paddingTop: 10 }} />

                            {/* Orders Bar */}
                            <Bar
                                yAxisId="left"
                                dataKey="totalOrders"
                                name="Orders"
                                fill="#6366f1"
                                radius={[6, 6, 0, 0]}
                                barSize={28}
                                isAnimationActive={false}
                            />

                            {/* Sales Bar */}
                            <Bar
                                yAxisId="right"
                                dataKey="totalSales"
                                name="Sales"
                                fill="#f97316"
                                radius={[6, 6, 0, 0]}
                                barSize={28}
                                isAnimationActive={false}
                            />
                        </BarChart>
                    </ResponsiveContainer>

                </Grid>

                <Grid item xs={12}>
                    <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Rank</TableCell>
                                    <TableCell>Waiter Name</TableCell>
                                    <TableCell align="right">Total Orders</TableCell>
                                    <TableCell align="right">Total Sales</TableCell>
                                    <TableCell align="right">Avg Order Value</TableCell>
                                    <TableCell align="right">Total Tips</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {waiterPerformance.map((waiter, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Chip
                                                label={index + 1}
                                                size="small"
                                                color={index < 3 ? 'primary' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <PeopleIcon />
                                                <Typography>{waiter.waiterName}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="right">{waiter.totalOrders}</TableCell>
                                        <TableCell align="right">{formatCurrency(waiter.totalSales)}</TableCell>
                                        <TableCell align="right">{formatCurrency(waiter.averageOrderValue)}</TableCell>
                                        <TableCell align="right">{formatCurrency(waiter.totalTips)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>
        </Paper>
    );

    // Material Usage Tab
    const renderMaterialUsage = () => (
        <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Material/Inventory Usage Report</Typography>
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadExcel('material-usage')}
                >
                    Export Excel
                </Button>
            </Stack>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <ResponsiveContainer width="100%" height={450}>
                        <BarChart
                            data={materialUsage
                                .slice(0, 10)
                                .sort((a, b) => b.totalUsed - a.totalUsed)}
                            margin={{ top: 20, right: 30, left: 10, bottom: 80 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />

                            <XAxis
                                dataKey="itemName"
                                interval={0}
                                tick={{
                                    fontSize: 12,
                                }}
                                angle={-30}
                                textAnchor="end"
                            />

                            <YAxis tick={{ fontSize: 12 }} />

                            <RechartsTooltip
                                formatter={(value: any, name: any, props: any) => [
                                    `${Number(value).toFixed(3)} ${props.payload.unit}`,
                                    "Total Used"
                                ]}
                                contentStyle={{
                                    borderRadius: 10,
                                    border: "none",
                                    boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
                                }}
                            />

                            <Legend />

                            <Bar
                                dataKey="totalUsed"
                                name="Total Used"
                                fill="#f97316"
                                radius={[6, 6, 0, 0]}
                                barSize={35}
                                isAnimationActive={false}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </Grid>

                <Grid item xs={12}>
                    <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Item Name</TableCell>
                                    <TableCell>Category</TableCell>
                                    <TableCell align="right">Unit</TableCell>
                                    <TableCell align="right">Total Used</TableCell>
                                    <TableCell align="right">Usage Count</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {materialUsage.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.itemName}</TableCell>
                                        <TableCell>
                                            <Chip label={item.category} size="small" />
                                        </TableCell>
                                        <TableCell align="right">{item.unit}</TableCell>
                                        <TableCell align="right">{Number(item.totalUsed).toFixed(3)}</TableCell>
                                        <TableCell align="right">{item.usageCount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>
        </Paper>
    );

    // Sales Report Tab
    const renderSalesReport = () => (
        <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Sales Report</Typography>
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadExcel('sales-report')}
                >
                    Export Excel
                </Button>
            </Stack>

            {salesReport && (
                <Grid container spacing={3}>
                    {/* Summary Cards */}
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Sales
                                </Typography>
                                <Typography variant="h5">{formatCurrency(salesReport.summary.totalSales)}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Orders
                                </Typography>
                                <Typography variant="h5">{salesReport.summary.totalOrders}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                            <CardContent>
                                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)' }} gutterBottom>
                                    Total Tax
                                </Typography>
                                <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                                    {formatCurrency(salesReport.summary.totalTax)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Discount
                                </Typography>
                                <Typography variant="h5">{formatCurrency(salesReport.summary.totalDiscount)}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Tips
                                </Typography>
                                <Typography variant="h5">{formatCurrency(salesReport.summary.totalTips || 0)}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Chart */}
                    <Grid item xs={12}>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={salesReport.dailySales}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => new Date(str).toLocaleDateString()}
                                />
                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                <RechartsTooltip />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="totalSales" stroke="#8884d8" name={`Sales (${settings.restaurant.currency})`} strokeWidth={2} isAnimationActive={false} />
                                <Line yAxisId="right" type="monotone" dataKey="totalOrders" stroke="#82ca9d" name="Orders" strokeWidth={2} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Grid>

                    {/* Tax Breakdown by Order Type */}
                    {salesReport.taxByOrderType && salesReport.taxByOrderType.length > 0 && (
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                                Tax Breakdown by Order Type
                            </Typography>
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Order Type</TableCell>
                                            <TableCell align="right">Count</TableCell>
                                            <TableCell align="right">Total Sales</TableCell>
                                            <TableCell align="right">Total Tax</TableCell>
                                            <TableCell align="right">Country Tax</TableCell>
                                            <TableCell align="right">State Tax</TableCell>
                                            <TableCell align="right">City Tax</TableCell>
                                            <TableCell align="right">County Tax</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {salesReport.taxByOrderType.map((row: any) => (
                                            <TableRow key={row.orderType}>
                                                <TableCell>{formatOrderType(row.orderType)}</TableCell>
                                                <TableCell align="right">{row.count}</TableCell>
                                                <TableCell align="right">{formatCurrency(row.totalSales)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(row.totalTax)}</TableCell>
                                                <TableCell align="right">{formatCurrency(row.countryTax)}</TableCell>
                                                <TableCell align="right">{formatCurrency(row.stateTax)}</TableCell>
                                                <TableCell align="right">{formatCurrency(row.cityTax)}</TableCell>
                                                <TableCell align="right">{formatCurrency(row.countyTax)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>
                    )}

                    {/* Table */}
                    <Grid item xs={12}>
                        <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell align="right">Total Sales</TableCell>
                                        <TableCell align="right">Total Tips</TableCell>
                                        <TableCell align="right">Total Orders</TableCell>
                                        <TableCell align="right">Avg Order Value</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {salesReport.dailySales
                                        .slice(salesPage * salesRowsPerPage, salesPage * salesRowsPerPage + salesRowsPerPage)
                                        .map((day: any, index: number) => (
                                            <TableRow key={index}>
                                                <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                                                <TableCell align="right">{formatCurrency(day.totalSales)}</TableCell>
                                                <TableCell align="right">{formatCurrency(day.totalTips || 0)}</TableCell>
                                                <TableCell align="right">{day.totalOrders}</TableCell>
                                                <TableCell align="right">{formatCurrency(day.averageOrderValue)}</TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            component="div"
                            count={salesReport.dailySales.length}
                            rowsPerPage={salesRowsPerPage}
                            page={salesPage}
                            onPageChange={(_, newPage) => setSalesPage(newPage)}
                            onRowsPerPageChange={(e) => {
                                setSalesRowsPerPage(parseInt(e.target.value, 10));
                                setSalesPage(0);
                            }}
                        />
                    </Grid>
                </Grid>
            )}
        </Paper>
    );

    // Peak Hours Tab
    const renderPeakHours = () => (
        <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Peak Hours Analysis</Typography>
                <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadExcel('peak-hours')}>
                    Export Excel
                </Button>
            </Stack>

            {peakHours && (
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1" gutterBottom>Hourly Traffic</Typography>
                        <ResponsiveContainer width="100%" height={420}>
                            <BarChart
                                data={peakHours.hourlyData}
                                margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />

                                <XAxis
                                    dataKey="hour"
                                    tickFormatter={(hour) => `${hour}:00`}
                                    tick={{ fontSize: 12 }}
                                />

                                <YAxis tick={{ fontSize: 12 }} />

                                <RechartsTooltip
                                    formatter={(value: any) => [`${value} Orders`, "Total Orders"]}
                                    contentStyle={{
                                        borderRadius: 10,
                                        border: "none",
                                        boxShadow: "0 8px 25px rgba(0,0,0,0.1)"
                                    }}
                                />

                                <Bar
                                    dataKey="totalOrders"
                                    name="Orders"
                                    fill="#f97316"
                                    radius={[6, 6, 0, 0]}
                                    barSize={28}
                                    isAnimationActive={false}
                                />
                            </BarChart>
                        </ResponsiveContainer>

                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1" gutterBottom>Day of Week Performance</Typography>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={peakHours.dailyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="dayName" />
                                <YAxis />
                                <RechartsTooltip />
                                <Legend />
                                <Bar dataKey="totalOrders" fill="#82ca9d" name="Orders" isAnimationActive={false} />
                                <Bar dataKey="totalRevenue" fill="#ffc658" name={`Revenue (${settings.restaurant.currency})`} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Grid>

                    <Grid item xs={12}>
                        <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Hour</TableCell>
                                        <TableCell align="right">Total Orders</TableCell>
                                        <TableCell align="right">Total Revenue</TableCell>
                                        <TableCell align="right">Avg Order Value</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {peakHours.hourlyData
                                        .slice(peakHoursPage * peakHoursRowsPerPage, peakHoursPage * peakHoursRowsPerPage + peakHoursRowsPerPage)
                                        .map((hour: any, index: number) => (
                                            <TableRow key={index}>
                                                <TableCell>{hour.hour}:00 - {hour.hour + 1}:00</TableCell>
                                                <TableCell align="right">{hour.totalOrders}</TableCell>
                                                <TableCell align="right">{formatCurrency(hour.totalRevenue)}</TableCell>
                                                <TableCell align="right">{formatCurrency(hour.averageOrderValue)}</TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            component="div"
                            count={peakHours.hourlyData.length}
                            rowsPerPage={peakHoursRowsPerPage}
                            page={peakHoursPage}
                            onPageChange={(_, newPage) => setPeakHoursPage(newPage)}
                            onRowsPerPageChange={(e) => {
                                setPeakHoursRowsPerPage(parseInt(e.target.value, 10));
                                setPeakHoursPage(0);
                            }}
                        />
                    </Grid>
                </Grid>
            )
            }
        </Paper >
    );

    // Payment Analytics Tab
    const renderPaymentAnalytics = () => {
        const rawData = Array.isArray(paymentAnalytics) ? paymentAnalytics : [];

        // Extract unique payment methods
        const uniqueMethods = Array.from(new Set(rawData.map((item) => item.paymentMethod || 'Unknown')));

        // Filter data based on selection
        const data = paymentMethodFilter === 'all'
            ? rawData
            : rawData.filter((item) => (item.paymentMethod || 'Unknown') === paymentMethodFilter);

        return (
            <Paper sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6">Payment Method Analytics</Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel id="payment-method-select-label">Payment Method</InputLabel>
                            <Select
                                labelId="payment-method-select-label"
                                value={paymentMethodFilter}
                                label="Payment Method"
                                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Methods</MenuItem>
                                {uniqueMethods.map((method) => (
                                    <MenuItem key={method} value={method}>
                                        {method}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadExcel('payment-analytics')}>
                            Export Excel
                        </Button>
                    </Stack>
                </Stack>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3, borderRadius: 4 }}>
                            <Typography variant="subtitle1" fontWeight={600} mb={2}>
                                Revenue Distribution
                            </Typography>

                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart>
                                    <Pie
                                        data={data}
                                        dataKey="totalRevenue"
                                        nameKey="paymentMethod"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={120}
                                        label={({ percent }) =>
                                            `${(percent * 100).toFixed(0)}%`
                                        }
                                        isAnimationActive={false}
                                    >
                                        {data.map((entry, index) => (
                                            <Cell
                                                key={index}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>

                                    <RechartsTooltip
                                        formatter={(value: any) =>
                                            formatCurrency(value)
                                        }
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: "none",
                                            boxShadow: "0 8px 25px rgba(0,0,0,0.1)"
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* 🟣 Modern Bar */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3, borderRadius: 4 }}>
                            <Typography variant="subtitle1" fontWeight={600} mb={2}>
                                Orders by Payment Method
                            </Typography>

                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart
                                    data={data}
                                    margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />

                                    <XAxis
                                        dataKey="paymentMethod"
                                        tick={{ fontSize: 12 }}
                                    />

                                    <YAxis tick={{ fontSize: 12 }} />

                                    <RechartsTooltip
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: "none",
                                            boxShadow: "0 8px 25px rgba(0,0,0,0.1)"
                                        }}
                                    />

                                    <Bar
                                        dataKey="totalOrders"
                                        fill="#6366f1"
                                        radius={[8, 8, 0, 0]}
                                        barSize={35}
                                        isAnimationActive={false}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    <Grid item xs={12}>
                        <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Payment Method</TableCell>
                                        <TableCell align="right">Total Orders</TableCell>
                                        <TableCell align="right">Total Revenue</TableCell>
                                        <TableCell align="right">Avg Order Value</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.map((method, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Chip
                                                    label={method.paymentMethod || 'Unknown'}
                                                    color="primary"
                                                    sx={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        const methodValue = method.paymentMethod || 'Unknown';
                                                        setPaymentMethodFilter(methodValue);
                                                        downloadExcel('payment-analytics', methodValue);
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">{method.totalOrders || 0}</TableCell>
                                            <TableCell align="right">{formatCurrency(method.totalRevenue || 0)}</TableCell>
                                            <TableCell align="right">{formatCurrency(method.averageOrderValue || 0)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                            Detailed Transactions ({paymentMethodFilter === 'all' ? 'All Methods' : paymentMethodFilter})
                        </Typography>
                        <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Order Id</TableCell>
                                        <TableCell>Customer Name</TableCell>
                                        <TableCell>Payment Method</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell align="right">Tip</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paymentDetails
                                        .slice(paymentDetailsPage * paymentDetailsRowsPerPage, paymentDetailsPage * paymentDetailsRowsPerPage + paymentDetailsRowsPerPage)
                                        .map((detail: any, index: number) => (
                                            <TableRow key={index}>
                                                <TableCell>{new Date(detail.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>{detail.orderNumber}</TableCell>
                                                <TableCell>{detail.customer?.name || 'Guest'}</TableCell>
                                                <TableCell>
                                                    <Chip label={detail.paymentMethod || 'Unknown'} size="small" />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={formatOrderType(detail.orderType)} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={detail.status}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">{formatCurrency(detail.totalAmount)}</TableCell>
                                                <TableCell align="right">{formatCurrency(detail.tip || 0)}</TableCell>
                                            </TableRow>
                                        ))}
                                    {paymentDetails.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">No transactions found</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            component="div"
                            count={paymentDetails.length}
                            rowsPerPage={paymentDetailsRowsPerPage}
                            page={paymentDetailsPage}
                            onPageChange={(_, newPage) => setPaymentDetailsPage(newPage)}
                            onRowsPerPageChange={(e) => {
                                setPaymentDetailsRowsPerPage(parseInt(e.target.value, 10));
                                setPaymentDetailsPage(0);
                            }}
                        />
                    </Grid>
                </Grid>
            </Paper>
        );
    };

    // Category Performance Tab
    const renderCategoryPerformance = () => {
        const data = Array.isArray(categoryPerformance) ? categoryPerformance : [];

        return (
            <Paper sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6">Category Performance</Typography>
                    <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadExcel('category-performance')}>
                        Export Excel
                    </Button>
                </Stack>

                <Grid container spacing={3}>
                    {/* 📊 Modern Bar Chart */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3, borderRadius: 4 }}>
                            <Typography variant="subtitle1" fontWeight={600} mb={2}>
                                Revenue by Category
                            </Typography>

                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart
                                    data={data}
                                    margin={{ top: 20, right: 20, left: 10, bottom: 40 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />

                                    <XAxis
                                        dataKey="category"
                                        angle={-30}
                                        textAnchor="end"
                                        interval={0}
                                        height={70}
                                        tick={{ fontSize: 12 }}
                                    />

                                    <YAxis tick={{ fontSize: 12 }} />

                                    <RechartsTooltip
                                        formatter={(value: any) =>
                                            formatCurrency(value)
                                        }
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: "none",
                                            boxShadow: "0 8px 25px rgba(0,0,0,0.1)"
                                        }}
                                    />

                                    <Bar
                                        dataKey="totalRevenue"
                                        fill="#6366f1"
                                        radius={[8, 8, 0, 0]}
                                        barSize={35}
                                        isAnimationActive={false}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* 🟠 Modern Donut Chart */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3, borderRadius: 4 }}>
                            <Typography variant="subtitle1" fontWeight={600} mb={2}>
                                Revenue Distribution
                            </Typography>

                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart>
                                    <Pie
                                        data={data}
                                        dataKey="totalRevenue"
                                        nameKey="category"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={120}
                                        label={({ percent }) =>
                                            `${(percent * 100).toFixed(0)}%`
                                        }
                                        isAnimationActive={false}
                                    >
                                        {data.map((entry, index) => (
                                            <Cell
                                                key={index}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>

                                    <RechartsTooltip
                                        formatter={(value: any) =>
                                            formatCurrency(value)
                                        }
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: "none",
                                            boxShadow: "0 8px 25px rgba(0,0,0,0.1)"
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    <Grid item xs={12}>
                        <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Category</TableCell>
                                        <TableCell align="right">Total Quantity</TableCell>
                                        <TableCell align="right">Total Revenue</TableCell>
                                        <TableCell align="right">Item Count</TableCell>
                                        <TableCell align="right">Order Count</TableCell>
                                        <TableCell align="right">Avg Revenue/Order</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.map((cat, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Chip label={cat.category || 'Uncategorized'} color="primary" />
                                            </TableCell>
                                            <TableCell align="right">{cat.totalQuantity || 0}</TableCell>
                                            <TableCell align="right">{formatCurrency(cat.totalRevenue || 0)}</TableCell>
                                            <TableCell align="right">{cat.itemCount || 0}</TableCell>
                                            <TableCell align="right">{cat.orderCount || 0}</TableCell>
                                            <TableCell align="right">{formatCurrency(cat.averageRevenuePerOrder || 0)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
                </Grid>
            </Paper>
        );
    };

    // Cancellation Analysis Tab
    const renderCancellationAnalysis = () => {
        if (!cancellationAnalysis) return null;
        const {
            totalCancelled = 0,
            cancellationRate = 0,
            revenueLoss = 0,
            totalOrders = 0,
            totalItemCancellations = 0,
            byOrderType = [],
            cancelledOrders = [],
            topCancelledItems = []
        } = cancellationAnalysis;

        return (
            <Paper sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6">Cancellation Analysis</Typography>
                    <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadExcel('cancellation-analysis')}>
                        Export Excel
                    </Button>
                </Stack>

                <Grid container spacing={4}>
                    {/* Summary Cards */}
                    <Grid item xs={12} container spacing={2}>
                        <Grid item xs={12} sm={6} md={2.4}>
                            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: 4, height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                        Cancelled Orders
                                    </Typography>
                                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                                        {totalCancelled}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={2.4}>
                            <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: 4, height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                        Item Cancellations
                                    </Typography>
                                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                                        {totalItemCancellations}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={2.4}>
                            <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', borderRadius: 4, height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                        Cancellation Rate
                                    </Typography>
                                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                                        {Number(cancellationRate).toFixed(2)}%
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={2.4}>
                            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 4, height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                        Revenue Loss
                                    </Typography>
                                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                                        {formatCurrency(revenueLoss)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={12} md={2.4}>
                            <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: 4, height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                        Total Orders
                                    </Typography>
                                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                                        {totalOrders}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Left side: Charts and Order Type Table */}
                    <Grid item xs={12} lg={6}>
                        <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
                            <Typography variant="subtitle1" fontWeight={600} mb={3}>
                                Cancellation by Order Type
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={byOrderType}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="orderType" tickFormatter={formatOrderType} />
                                    <YAxis />
                                    <RechartsTooltip
                                        formatter={(value: any, name: any) => [
                                            name === 'revenueLoss' ? formatCurrency(value) : value,
                                            name === 'revenueLoss' ? 'Revenue Loss' : 'Cancelled Count'
                                        ]}
                                    />
                                    <Legend />
                                    <Bar dataKey="cancelledCount" fill="#ff8042" name="Cancelled Orders" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                    <Bar dataKey="revenueLoss" fill="#8884d8" name="Revenue Loss" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>

                        <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden' }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Order Type</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Order Cancels</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Item Cancels</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Revenue Loss</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {byOrderType.map((type: any, index: number) => (
                                        <TableRow key={index} hover>
                                            <TableCell>
                                                <Chip label={formatOrderType(type.orderType)} color="error" size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell align="right">{type.cancelledCount}</TableCell>
                                            <TableCell align="right">{type.itemCancelledCount}</TableCell>
                                            <TableCell align="right">{formatCurrency(type.revenueLoss)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {byOrderType.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                                No cancellation data available
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>

                    {/* Right side: Top Cancelled Items Table */}
                    <Grid item xs={12} lg={6}>
                        <Paper sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                            <Typography variant="subtitle1" fontWeight={600} mb={3}>
                                Most Frequently Cancelled Items
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>Item Name</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>Cancel Count</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>Revenue Loss</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {topCancelledItems
                                            .slice(topCancelledItemsPage * topCancelledItemsRowsPerPage, topCancelledItemsPage * topCancelledItemsRowsPerPage + topCancelledItemsRowsPerPage)
                                            .map((item: any, index: number) => (
                                                <TableRow key={index} hover>
                                                    <TableCell sx={{ fontWeight: 500 }}>{item.itemName}</TableCell>
                                                    <TableCell align="right">
                                                        <Chip label={item.cancelCount} size="small" color="warning" />
                                                    </TableCell>
                                                    <TableCell align="right">{formatCurrency(item.revenueLoss)}</TableCell>
                                                </TableRow>
                                            ))}
                                        {topCancelledItems.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                    No cancelled items found
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25]}
                                component="div"
                                count={topCancelledItems.length}
                                rowsPerPage={topCancelledItemsRowsPerPage}
                                page={topCancelledItemsPage}
                                onPageChange={(_, newPage) => setTopCancelledItemsPage(newPage)}
                                onRowsPerPageChange={(e) => {
                                    setTopCancelledItemsRowsPerPage(parseInt(e.target.value, 10));
                                    setTopCancelledItemsPage(0);
                                }}
                            />
                        </Paper>
                    </Grid>

                    {/* Bottom: Detailed Recent Cancelled Orders */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3, borderRadius: 4 }}>
                            <Typography variant="subtitle1" fontWeight={600} mb={3}>
                                Recent Cancelled Orders Details
                            </Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Order #</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Cancellation Reason</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>Loss Amount</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {cancelledOrders
                                            .slice(cancelledOrdersPage * cancelledOrdersRowsPerPage, cancelledOrdersPage * cancelledOrdersRowsPerPage + cancelledOrdersRowsPerPage)
                                            .map((order: any, index: number) => (
                                                <TableRow key={index} hover>
                                                    <TableCell>
                                                        <Typography variant="body2">{new Date(order.createdAt).toLocaleDateString()}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{new Date(order.createdAt).toLocaleTimeString()}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{order.orderNumber}</Typography>
                                                            <Chip
                                                                label={order.isFullOrder ? 'Full Order' : 'Item(s)'}
                                                                size="small"
                                                                color={order.isFullOrder ? 'error' : 'warning'}
                                                                variant="outlined"
                                                                sx={{ height: 18, fontSize: '0.65rem' }}
                                                            />
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>{order.customer?.name || 'Guest'}</TableCell>
                                                    <TableCell>
                                                        <Chip label={formatOrderType(order.orderType)} size="small" variant="outlined" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <MuiTooltip title={order.cancellationReason} arrow>
                                                            <Typography variant="body2" sx={{
                                                                maxWidth: 250,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                color: 'text.secondary',
                                                                fontStyle: 'italic'
                                                            }}>
                                                                {order.cancellationReason}
                                                            </Typography>
                                                        </MuiTooltip>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>
                                                        {formatCurrency(order.cancellationLoss)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        {cancelledOrders.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                    No cancelled orders found for this period
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TablePagination
                                rowsPerPageOptions={[10, 25, 50]}
                                component="div"
                                count={cancelledOrders.length}
                                rowsPerPage={cancelledOrdersRowsPerPage}
                                page={cancelledOrdersPage}
                                onPageChange={(_, newPage) => setCancelledOrdersPage(newPage)}
                                onRowsPerPageChange={(e) => {
                                    setCancelledOrdersRowsPerPage(parseInt(e.target.value, 10));
                                    setCancelledOrdersPage(0);
                                }}
                            />
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>
        );
    };

    const renderProfitLoss = () => (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Profit & Loss Statement</Typography>
            {profitLoss && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ bgcolor: '#e3f2fd' }}>
                            <CardContent>
                                <Typography variant="subtitle2" color="textSecondary">Total Revenue</Typography>
                                <Typography variant="h4">{formatCurrency(profitLoss.revenue)}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ bgcolor: '#ffebee' }}>
                            <CardContent>
                                <Typography variant="subtitle2" color="textSecondary">Total Expenses (PO)</Typography>
                                <Typography variant="h4">{formatCurrency(profitLoss.cogs)}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ bgcolor: '#e8f5e9' }}>
                            <CardContent>
                                <Typography variant="subtitle2" color="textSecondary">Gross Profit</Typography>
                                <Typography variant="h4">{formatCurrency(profitLoss.grossProfit)}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ bgcolor: '#fff3e0' }}>
                            <CardContent>
                                <Typography variant="subtitle2" color="textSecondary">Gross Margin</Typography>
                                <Typography variant="h4">{profitLoss.margin.toFixed(2)}%</Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Breakdown Table */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                            Expense Breakdown (Purchase Orders)
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>PO Number</TableCell>
                                        <TableCell>Vendor</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {profitLoss.expenses && profitLoss.expenses.length > 0 ? (
                                        profitLoss.expenses.map((item: any, index: number) => (
                                            <TableRow key={index}>
                                                <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                                                <TableCell>{item.poNumber || '-'}</TableCell>
                                                <TableCell>{item.vendor || 'Unknown'}</TableCell>
                                                <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">No expenses recorded for this period</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
                </Grid>
            )}
        </Paper>
    );

    const renderCustomerAnalytics = () => (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Top Customers</Typography>
            <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell align="right">Total Orders</TableCell>
                            <TableCell align="right">Total Spend</TableCell>
                            <TableCell align="right">Avg Order Value</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {customerAnalytics
                            .slice(customerPage * customerRowsPerPage, customerPage * customerRowsPerPage + customerRowsPerPage)
                            .map((customer: any, index: number) => (
                                <TableRow key={index}>
                                    <TableCell>{customer.name || 'Guest'}</TableCell>
                                    <TableCell>{customer.email || '-'}</TableCell>
                                    <TableCell>{customer.phone || '-'}</TableCell>
                                    <TableCell align="right">{customer.totalOrders}</TableCell>
                                    <TableCell align="right">{formatCurrency(customer.totalSpend)}</TableCell>
                                    <TableCell align="right">{formatCurrency(customer.averageOrderValue)}</TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={customerAnalytics.length}
                rowsPerPage={customerRowsPerPage}
                page={customerPage}
                onPageChange={(_, newPage) => setCustomerPage(newPage)}
                onRowsPerPageChange={(e) => {
                    setCustomerRowsPerPage(parseInt(e.target.value, 10));
                    setCustomerPage(0);
                }}
            />
        </Paper>
    );

    const renderInventoryStock = () => (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Inventory Stock Levels</Typography>
            {inventoryStock && (
                <>
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="subtitle2">Total Items</Typography>
                                    <Typography variant="h4">{inventoryStock.totalItems}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="subtitle2" color="error">Low Stock Items</Typography>
                                    <Typography variant="h4" color="error">{inventoryStock.lowStockCount}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="subtitle2">Total Stock Value</Typography>
                                    <Typography variant="h4">{formatCurrency(inventoryStock.totalStockValue)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                    <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Item Name</TableCell>
                                    <TableCell>SKU</TableCell>
                                    <TableCell align="right">Current Stock</TableCell>
                                    <TableCell align="right">Min Stock</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {inventoryStock.items
                                    .slice(inventoryPage * inventoryRowsPerPage, inventoryPage * inventoryRowsPerPage + inventoryRowsPerPage)
                                    .map((item: any, index: number) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.sku}</TableCell>
                                            <TableCell align="right">
                                                {Number(item.currentStock).toFixed(3)} {item.unit}
                                            </TableCell>
                                            <TableCell align="right">
                                                {Number(item.minimumStock).toFixed(3)} {item.unit}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={item.status}
                                                    color={item.status === 'Low Stock' ? 'error' : 'success'}
                                                    size="small"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={inventoryStock.items.length}
                        rowsPerPage={inventoryRowsPerPage}
                        page={inventoryPage}
                        onPageChange={(_, newPage) => setInventoryPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setInventoryRowsPerPage(parseInt(e.target.value, 10));
                            setInventoryPage(0);
                        }}
                    />
                </>
            )}
        </Paper>
    );

    const fetchTableStats = async (params: any) => {
        try {
            const [tablesRes, bookingsRes, ordersRes] = await Promise.all([
                tablesAPI.getAll(),
                bookingsAPI.getAll({ limit: 1000 }),
                ordersAPI.getAll()
            ]);

            const tables = tablesRes.data;
            const bookings = bookingsRes.data.data || [];
            const orders = ordersRes.data.data || ordersRes.data || [];

            let start = new Date(0);
            let end = new Date('2100-01-01');

            if (params.startDate) {
                start = new Date(params.startDate);
            } else {
                const now = new Date();
                if (params.period === 'daily') start = new Date(now.setHours(0, 0, 0, 0));
                else if (params.period === 'weekly') {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    start = d;
                }
                else if (params.period === 'monthly') {
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    start = d;
                }
            }

            if (params.endDate) {
                end = new Date(params.endDate);
                end.setHours(23, 59, 59, 999);
            }

            const stats = tables.map((table: any) => {
                const tableId = table._id;
                const tName = table.tableName || `Table ${table.tableNumber}`;

                const tBookings = bookings.filter((b: any) => {
                    const d = new Date(b.date);
                    return (b.table?._id === tableId || b.table === tableId) && d >= start && d <= end && b.status !== 'cancelled';
                });

                const tOrders = orders.filter((o: any) => {
                    const d = new Date(o.createdAt);
                    const oTableId = o.table?._id || o.table;
                    return oTableId === tableId && d >= start && d <= end && o.status !== 'cancelled';
                });

                const rev = tOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

                return { tableName: tName, totalBookings: tBookings.length, totalOrders: tOrders.length, totalRevenue: rev };
            });

            setTableStats(stats);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch table stats");
        }
    };

    const renderTableStats = () => (
        <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Table Performance</Typography>
                <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadExcel('table-stats')}>Export Excel</Button>
            </Stack>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                            data={tableStats}
                            margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                            barCategoryGap="25%"
                        >
                            {/* Soft horizontal grid only */}
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />

                            {/* X Axis */}
                            <XAxis
                                dataKey="tableName"
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                                axisLine={false}
                                tickLine={false}
                            />

                            {/* Y Axis */}
                            <YAxis
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                                axisLine={false}
                                tickLine={false}
                            />

                            {/* Tooltip styled like your dashboard */}
                            <RechartsTooltip
                                contentStyle={{
                                    borderRadius: 10,
                                    border: "none",
                                    boxShadow: "0 8px 20px rgba(0,0,0,0.12)"
                                }}
                                cursor={{ fill: "rgba(255,107,11,0.08)" }}
                            />

                            {/* Legend */}
                            <Legend wrapperStyle={{ paddingTop: 8 }} />

                            {/* REVENUE — image orange */}
                            <Bar
                                dataKey="totalRevenue"
                                fill="#FF6B0B"
                                name="Revenue"
                                radius={[8, 8, 0, 0]}
                                barSize={28}
                                isAnimationActive={false}
                            />

                            {/* BOOKINGS — soft green */}
                            <Bar
                                dataKey="totalBookings"
                                fill="#7BCFA6"
                                name="Bookings"
                                radius={[8, 8, 0, 0]}
                                barSize={28}
                                isAnimationActive={false}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </Grid>

                <Grid item xs={12}>
                    <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Table Name</TableCell>
                                    <TableCell align="right">Bookings</TableCell>
                                    <TableCell align="right">Orders</TableCell>
                                    <TableCell align="right">Revenue</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tableStats
                                    .slice(tableStatsPage * tableStatsRowsPerPage, tableStatsPage * tableStatsRowsPerPage + tableStatsRowsPerPage)
                                    .map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{row.tableName}</TableCell>
                                            <TableCell align="right">{row.totalBookings}</TableCell>
                                            <TableCell align="right">{row.totalOrders}</TableCell>
                                            <TableCell align="right">{formatCurrency(row.totalRevenue)}</TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={tableStats.length}
                        rowsPerPage={tableStatsRowsPerPage}
                        page={tableStatsPage}
                        onPageChange={(_, newPage) => setTableStatsPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setTableStatsRowsPerPage(parseInt(e.target.value, 10));
                            setTableStatsPage(0);
                        }}
                    />
                </Grid>
            </Grid>
        </Paper>
    );

    const renderCouponAnalytics = () => (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Coupon Performance</Typography>
            <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Coupon Code</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Discount Type</TableCell>
                            <TableCell align="right">Usage Count</TableCell>
                            <TableCell align="right">Total Revenue Generated</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {couponAnalytics
                            .slice(couponPage * couponRowsPerPage, couponPage * couponRowsPerPage + couponRowsPerPage)
                            .map((coupon: any, index: number) => (
                                <TableRow key={index}>
                                    <TableCell>{coupon.code}</TableCell>
                                    <TableCell>{coupon.name}</TableCell>
                                    <TableCell>
                                        {coupon.discountType === 'percentage'
                                            ? `${coupon.discountValue}%`
                                            : formatCurrency(coupon.discountValue)}
                                    </TableCell>
                                    <TableCell align="right">{coupon.usageCount}</TableCell>
                                    <TableCell align="right">{formatCurrency(coupon.totalRevenue)}</TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={couponAnalytics.length}
                rowsPerPage={couponRowsPerPage}
                page={couponPage}
                onPageChange={(_, newPage) => setCouponPage(newPage)}
                onRowsPerPageChange={(e) => {
                    setCouponRowsPerPage(parseInt(e.target.value, 10));
                    setCouponPage(0);
                }}
            />
        </Paper>
    );

    const renderPromoSummary = () => (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Promo Type</InputLabel>
                            <Select value={promoType} onChange={(e) => setPromoType(e.target.value)} label="Promo Type">
                                <MenuItem value="all">All Types</MenuItem>
                                <MenuItem value="campaign">Marketing</MenuItem>
                                <MenuItem value="compensation">Goodwill</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField 
                            size="small" 
                            placeholder="Search code..." 
                            value={promoSearch} 
                            onChange={(e) => setPromoSearch(e.target.value)}
                        />
                        <Button variant="contained" onClick={fetchReportData}>Apply</Button>
                    </Stack>
                </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                    <CardContent>
                        <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Codes Created (Total)</Typography>
                        <Typography variant="h4" fontWeight="bold">{promoSummary?.totalCreated || 0}</Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                    <CardContent>
                        <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Redemptions (Period)</Typography>
                        <Typography variant="h4" fontWeight="bold">{promoSummary?.redemptionCount || 0}</Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                    <CardContent>
                        <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Total Value Saved</Typography>
                        <Typography variant="h4" fontWeight="bold">{formatCurrency(promoSummary?.totalRedeemedValue || 0)}</Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                    <CardContent>
                        <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Avg. Saving per Order</Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {promoSummary?.redemptionCount > 0 
                                ? formatCurrency(promoSummary.totalRedeemedValue / promoSummary.redemptionCount) 
                                : formatCurrency(0)}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>

            {promoSummary?.topPromos?.length > 0 && (
                <Grid item xs={12}>
                    <Paper sx={{ p: 3, borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom>Top Performing Promos</Typography>
                        <Box sx={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={promoSummary.topPromos}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="code" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Bar dataKey="count" fill="#4F46E5" name="Redemptions" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="value" fill="#10B981" name="Value Saved" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
            )}
        </Grid>
    );

    const renderPromoRedemptions = () => (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell>Order #</TableCell>
                        <TableCell>Promo Code</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell align="right">Order Total</TableCell>
                        <TableCell align="right">Discount</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {promoRedemptions.map((row: any) => (
                        <TableRow key={row._id}>
                            <TableCell>{row.orderNumber}</TableCell>
                            <TableCell>
                                <Chip label={row.couponCode} size="small" variant="outlined" color="primary" />
                            </TableCell>
                            <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>{row.customer?.name || 'Guest'}</TableCell>
                            <TableCell align="right">{formatCurrency(row.totalAmount)}</TableCell>
                            <TableCell align="right" sx={{ color: 'error.main' }}>
                                -{formatCurrency(row.discount?.amount || 0)}
                            </TableCell>
                        </TableRow>
                    ))}
                    {promoRedemptions.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} align="center">No redemptions found</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const renderPromoCompensation = () => (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell>Reason</TableCell>
                        <TableCell align="right">Count</TableCell>
                        <TableCell align="right">Total Compensation Value</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {promoCompensation.map((row: any, i: number) => (
                        <TableRow key={i}>
                            <TableCell>{row._id || 'General Support'}</TableCell>
                            <TableCell align="right">{row.count}</TableCell>
                            <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                {formatCurrency(row.totalValue)}
                            </TableCell>
                        </TableRow>
                    ))}
                    {promoCompensation.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} align="center">No compensation data found</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const renderCustomerFeedback = () => {
        // Hooks moved to top level

        const totalReviews = feedbackData.length;
        const avgService = totalReviews > 0
            ? (feedbackData.reduce((sum, item) => sum + (item.serviceRating || 0), 0) / totalReviews).toFixed(1)
            : '0.0';
        const avgAmbiance = totalReviews > 0
            ? (feedbackData.reduce((sum, item) => sum + (item.ambianceRating || 0), 0) / totalReviews).toFixed(1)
            : '0.0';

        return (
            <Paper sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6">Customer Feedback Analysis</Typography>
                    <Box>
                        <Button
                            variant={feedbackView === 'summary' ? "contained" : "outlined"}
                            onClick={() => setFeedbackView('summary')}
                            sx={{ mr: 1 }}
                        >
                            Review Summary
                        </Button>
                        <Button
                            variant={feedbackView === 'item-wise' ? "contained" : "outlined"}
                            onClick={() => setFeedbackView('item-wise')}
                        >
                            Item Risk Analysis
                        </Button>
                    </Box>
                </Stack>

                {/* KPI Cards */}
                <Grid container spacing={3} mb={4}>
                    <Grid item xs={12} md={4}>
                        <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                            <CardContent>
                                <Typography variant="subtitle2">Total Reviews</Typography>
                                <Typography variant="h3">{totalReviews}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
                            <CardContent>
                                <Typography variant="subtitle2">Avg Service Rating</Typography>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <StarIcon />
                                    <Typography variant="h3">{avgService}</Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                            <CardContent>
                                <Typography variant="subtitle2">Avg Ambiance Rating</Typography>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <StarIcon />
                                    <Typography variant="h3">{avgAmbiance}</Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {feedbackView === 'summary' ? (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Order #</TableCell>
                                    <TableCell>Customer</TableCell>
                                    <TableCell align="center">Service</TableCell>
                                    <TableCell align="center">Ambiance</TableCell>
                                    <TableCell>Item Ratings</TableCell>
                                    <TableCell>Suggestions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {feedbackData.map((fb: any) => (
                                    <TableRow key={fb._id}>
                                        <TableCell>{new Date(fb.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell>{fb.orderNumber}</TableCell>
                                        <TableCell>{fb.customerName}</TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={fb.serviceRating}
                                                color={fb.serviceRating >= 4 ? 'success' : fb.serviceRating >= 3 ? 'warning' : 'error'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={fb.ambianceRating}
                                                color={fb.ambianceRating >= 4 ? 'success' : fb.ambianceRating >= 3 ? 'warning' : 'error'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ maxHeight: 100, overflowY: 'auto' }}>
                                                {fb.itemRatings && fb.itemRatings.map((item: any) => (
                                                    <Typography variant="caption" display="block" key={item.menuItem}>
                                                        {item.name}: {item.tasteRating} (Taste), {item.quantityRating} (Qty)
                                                    </Typography>
                                                ))}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ maxWidth: 200, whiteSpace: 'pre-wrap' }}>
                                                {fb.suggestions || '-'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {feedbackData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">No feedback found</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Item Name</TableCell>
                                    <TableCell align="center">Total Orders Rated</TableCell>
                                    <TableCell align="center">Avg Taste Rating</TableCell>
                                    <TableCell align="center">Avg Quantity Rating</TableCell>
                                    <TableCell align="center">Overall Score</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {itemWiseReport.map((item: any) => {
                                    const overallScore = ((item.avgTasteRating + item.avgQuantityRating) / 2).toFixed(1);
                                    return (
                                        <TableRow key={item.menuItem}>
                                            <TableCell sx={{ fontWeight: 'bold' }}>{item.itemName}</TableCell>
                                            <TableCell align="center">{item.totalOrders}</TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                                                    <Typography
                                                        color={item.avgTasteRating >= 4 ? 'success.main' : item.avgTasteRating < 3 ? 'error.main' : 'warning.main'}
                                                        fontWeight="bold"
                                                    >
                                                        {item.avgTasteRating}
                                                    </Typography>
                                                    <StarIcon fontSize="small" sx={{ color: '#faaf00', fontSize: 14 }} />
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                                                    <Typography
                                                        color={item.avgQuantityRating >= 4 ? 'success.main' : item.avgQuantityRating < 3 ? 'error.main' : 'warning.main'}
                                                        fontWeight="bold"
                                                    >
                                                        {item.avgQuantityRating}
                                                    </Typography>
                                                    <StarIcon fontSize="small" sx={{ color: '#faaf00', fontSize: 14 }} />
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={overallScore}
                                                    color={Number(overallScore) >= 4 ? 'success' : Number(overallScore) >= 3 ? 'warning' : 'error'}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {itemWiseReport.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">No item feedback data available</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        );
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                Reports & Analytics
            </Typography>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Time Period</InputLabel>
                            <Select value={period} onChange={(e) => setPeriod(e.target.value as string)} label="Time Period">
                                <MenuItem value="today">Today</MenuItem>
                                <MenuItem value="last7days">Last 7 Days</MenuItem>
                                <MenuItem value="thisMonth">This Month</MenuItem>
                                <MenuItem value="custom">Custom Range</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {period === 'custom' && (
                        <>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="Start Date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="End Date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </>
                    )}

                    <Grid item xs={12} sm={6} md={3}>
                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={() => downloadExcel('comprehensive')}
                        >
                            Download All Reports
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
                    <Tab label="Dashboard" />
                    <Tab label="Best Selling Items" />
                    <Tab label="Orders by Type" />
                    <Tab label="Waiter Performance" />
                    <Tab label="Material Usage" />
                    <Tab label="Sales Report" />
                    <Tab label="Peak Hours" />
                    <Tab label="Payment Analytics" />
                    <Tab label="Category Performance" />
                    <Tab label="Cancellation Analysis" />
                    <Tab label="Profit & Loss" />
                    <Tab label="Customer Analytics" />
                    <Tab label="Inventory Stock" />
                    <Tab label="Coupon Analytics" />
                    <Tab label="Table Performance" />
                    <Tab label="Feedback" />
                    <Tab label="Tips Report" />
                    <Tab label="Promo Summary" />
                    <Tab label="Promo Redemptions" />
                    <Tab label="Promo Compensation" />
                </Tabs>
            </Paper>

            {/* Content */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {activeTab === 0 && renderDashboard()}
                    {activeTab === 1 && renderBestSellingItems()}
                    {activeTab === 2 && renderOrdersByType()}
                    {activeTab === 3 && renderWaiterPerformance()}
                    {activeTab === 4 && renderMaterialUsage()}
                    {activeTab === 5 && renderSalesReport()}
                    {activeTab === 6 && renderPeakHours()}
                    {activeTab === 7 && renderPaymentAnalytics()}
                    {activeTab === 8 && renderCategoryPerformance()}
                    {activeTab === 9 && renderCancellationAnalysis()}
                    {activeTab === 10 && renderProfitLoss()}
                    {activeTab === 11 && renderCustomerAnalytics()}
                    {activeTab === 12 && renderInventoryStock()}
                    {activeTab === 13 && renderCouponAnalytics()}
                    {activeTab === 14 && renderTableStats()}
                    {activeTab === 15 && renderCustomerFeedback()}
                    {activeTab === 16 && renderTipsReport()}
                    {activeTab === 17 && renderPromoSummary()}
                    {activeTab === 18 && renderPromoRedemptions()}
                    {activeTab === 19 && renderPromoCompensation()}
                </>
            )}
        </Container>
    );
};

export default ReportsPage;
