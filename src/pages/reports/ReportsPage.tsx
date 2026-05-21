
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
    IconButton,
    alpha,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import { ordersAPI, tablesAPI, bookingsAPI, feedbackAPI, reportsAPI, cateringAPI } from '../../services/api';
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
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import SavingsIcon from '@mui/icons-material/Savings';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import PaymentsIcon from '@mui/icons-material/Payments';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import EmailIcon from '@mui/icons-material/Email';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import AssignmentIcon from '@mui/icons-material/Assignment';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { downloadFromUrl } from '../../utils/fileDownload';
import { useTheme, useMediaQuery } from '@mui/material';
import { useSocket } from '../../context/SocketContext';
import { useSettings } from '../../context/SettingsContext';
import ActionHistoryList from '../../components/common/ActionHistoryList';



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
    const [deliveryReport, setDeliveryReport] = useState<any>(null);
    const [deliveryProviderFilter, setDeliveryProviderFilter] = useState<string>('all');
    const [deliveryReportPage, setDeliveryReportPage] = useState(0);
    const [deliveryReportRowsPerPage, setDeliveryReportRowsPerPage] = useState(10);
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
    const [feedbackPage, setFeedbackPage] = useState(0);
    const [feedbackRowsPerPage, setFeedbackRowsPerPage] = useState(10);
    const [itemFeedbackPage, setItemFeedbackPage] = useState(0);
    const [itemFeedbackRowsPerPage, setItemFeedbackRowsPerPage] = useState(10);
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
    const [refundRecordsPage, setRefundRecordsPage] = useState(0);
    const [refundRecordsRowsPerPage, setRefundRecordsRowsPerPage] = useState(10);
    const [cateringData, setCateringData] = useState<any[]>([]);
    const [cateringPage, setCateringPage] = useState(0);
    const [cateringRowsPerPage, setCateringRowsPerPage] = useState(10);
    const [cateringTotalCount, setCateringTotalCount] = useState(0);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewOrderNumber, setPreviewOrderNumber] = useState('');
    const [selectedCateringOrder, setSelectedCateringOrder] = useState<any | null>(null);
    const [cateringTab, setCateringTab] = useState(0);
    const fetchRequestId = React.useRef(0);

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
        setDeliveryReportPage(0);
        setCateringPage(0);
        setFeedbackPage(0);
        setItemFeedbackPage(0);
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
        if (loading && fetchRequestId.current > 0) return;
        const requestId = ++fetchRequestId.current;
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
                case 20: // Delivery Report
                    await fetchDeliveryReport({ ...params, provider: deliveryProviderFilter });
                    break;
                case 21: // Catering Report
                    await fetchCateringReport(params);
                    break;
            }
        } finally {
            if (requestId === fetchRequestId.current) {
                setLoading(false);
            }
        }
    };

    const fetchComprehensiveReport = async (params: any) => {
        if (loading) return;
        setLoading(true);
        try {
            const [reportResponse, ordersResponse] = await Promise.all([
                axios.get(`${API_URL}/api/reports/comprehensive`, { params, headers }),
                ordersAPI.filter({ page: 1, limit: 100, ...params })
            ]);

            // Background fetch for P&L to populate Total Expenses card without blocking
            fetchProfitLoss(params, true); 

            const responseData = reportResponse.data;
            setBestSellingItems(responseData.bestSellingItems || []);
            setOrdersByType(responseData.ordersByType || []);
            setWaiterPerformance(responseData.waiterPerformance || []);
            setMaterialUsage(responseData.materialUsage?.items || (Array.isArray(responseData.materialUsage) ? responseData.materialUsage : []));
            setSalesReport(responseData.salesReport || null);
            setRecentOrders(ordersResponse.data.orders || []);
        } catch (error) {
            console.error('Error fetching comprehensive report:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
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

    const fetchCateringCommissions = async (params: any) => {
        try {
            // Clean params to only include what commission API supports
            const commissionParams = {
                startDate: params.startDate,
                endDate: params.endDate,
                status: params.status,
                search: params.search
            };
            const response = await cateringAPI.getCommissions(commissionParams);
            return response.data.commissions || response.data.data || [];
        } catch (error) {
            console.error('Error fetching catering commissions:', error);
            return [];
        }
    };

    const fetchProfitLoss = async (params: any, isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const [plResponse, commissionData] = await Promise.all([
                axios.get(`${API_URL}/api/reports/profit-loss`, { params, headers }),
                fetchCateringCommissions(params)
            ]);

            const plData = plResponse.data;
            
            // Map commissions to expense format
            const commissionExpenses = commissionData.map((c: any) => {
                const comm = c.commission || c;
                return {
                    date: c.createdAt || c.date || new Date().toISOString(),
                    poNumber: `COMM-${c.cateringOrder?.orderNumber || 'N/A'}`,
                    vendor: comm.reference?.name || 'Commission Beneficiary',
                    amount: comm.amount || comm.commissionAmount || 0,
                    type: 'Catering Commission'
                };
            });

            const totalCommission = commissionExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
            
            // Combine with standard expenses (POs)
            const integratedExpenses = [
                ...(plData.expenses || []).map((e: any) => ({ ...e, type: 'Purchase Order' })),
                ...commissionExpenses
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const updatedPL = {
                ...plData,
                expenses: integratedExpenses,
                cateringCommissionsTotal: totalCommission,
                poExpensesTotal: plData.cogs || 0,
                cogs: (plData.cogs || 0) + totalCommission, // Total COGS
                grossProfit: (plData.revenue || 0) - ((plData.cogs || 0) + totalCommission),
                margin: plData.revenue > 0 
                    ? (((plData.revenue || 0) - ((plData.cogs || 0) + totalCommission)) / (plData.revenue || 0)) * 100 
                    : 0
            };

            setProfitLoss(updatedPL);
        } catch (error) {
            console.error('Error fetching Profit & Loss data:', error);
            if (!isBackground) toast.error('Failed to fetch P&L report');
        } finally {
            if (!isBackground) setLoading(false);
        }
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

    const fetchDeliveryReport = async (params: any) => {
        const response = await reportsAPI.getDeliveryReport(params);
        setDeliveryReport(response.data);
    };

    const fetchCateringReport = async (params: any) => {
        const response = await cateringAPI.getAll({
            page: 1,
            limit: 1000,
            ...params
        });
        setCateringData(response.data.orders || []);
        setCateringTotalCount(response.data.total || 0);
    };

    const downloadExcel = async (reportType: string, customPaymentMethod?: string) => {
        if (loading) return;
        setLoading(true);
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

            if (reportType === 'catering-report') {
                const csvRows = [
                    ['Order #', 'Date', 'Customer', 'Occasion', 'Service', 'Guests', 'Total', 'Payment', 'Status'],
                    ...cateringData.map(o => [
                        o.orderNumber,
                        new Date(o.requiredDate).toLocaleDateString(),
                        o.customerName,
                        o.occasion,
                        o.serviceType,
                        ((o.guests?.adults?.veg || 0) + (o.guests?.adults?.nonVeg || 0) + (o.guests?.kids?.veg || 0) + (o.guests?.kids?.nonVeg || 0)),
                        o.totalAmount,
                        o.paymentStatus,
                        o.status
                    ])
                ];

                const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `catering-report-${period}-${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                toast.success('Catering report exported!');
                return;
            }

            const queryString = new URLSearchParams(params).toString();
            const fullUrl = `${API_URL}/api/reports/export/excel?${queryString}`;
            const fileName = `report-${reportType}-${period}-${Date.now()}.xlsx`;

            await downloadFromUrl(fullUrl, fileName, headers);
            toast.success('Excel report downloaded!');
        } catch (error) {
            console.error('Error downloading Excel:', error);
            toast.error('Failed to download Excel report');
        } finally {
            setLoading(false);
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
            .slice(0, isMobile ? 5 : 10)
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
        <Grid container spacing={isMobile ? 1 : 3}>
            {/* Summary Cards */}
            <Grid item xs={6} md={3}>
                <Card sx={{
                    background: 'linear-gradient(135deg, #3f51b5 0%, #1a237e 100%)',
                    borderRadius: isMobile ? 3 : 4,
                    boxShadow: isMobile ? '0 4px 12px rgba(26, 35, 126, 0.2)' : 3,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                        <Stack spacing={isMobile ? 0.25 : 1}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <CurrencyExchangeIcon sx={{ fontSize: isMobile ? 16 : 28, color: 'rgba(255,255,255,0.9)' }} />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.65rem' : 'inherit', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Total Sales
                                </Typography>
                            </Stack>
                            <Typography variant={isMobile ? "h6" : "h4"} sx={{ color: 'white', fontWeight: 800, fontSize: isMobile ? '1.1rem' : 'inherit' }}>
                                {salesReport ? formatCurrency(salesReport.summary.totalSales).replace('₹', '') : '-'}
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={6} md={3}>
                <Card sx={{
                    background: 'linear-gradient(135deg, #ec407a 0%, #ad1457 100%)',
                    borderRadius: isMobile ? 3 : 4,
                    boxShadow: isMobile ? '0 4px 12px rgba(173, 20, 87, 0.2)' : 3,
                }}>
                    <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                        <Stack spacing={isMobile ? 0.25 : 1}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <ShoppingBagIcon sx={{ fontSize: isMobile ? 16 : 28, color: 'rgba(255,255,255,0.9)' }} />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.65rem' : 'inherit', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Total Orders
                                </Typography>
                            </Stack>
                            <Typography variant={isMobile ? "h6" : "h4"} sx={{ color: 'white', fontWeight: 800, fontSize: isMobile ? '1.1rem' : 'inherit' }}>
                                {salesReport ? salesReport.summary.totalOrders : '-'}
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={6} md={3}>
                <Card sx={{
                    background: 'linear-gradient(135deg, #0288d1 0%, #01579b 100%)',
                    borderRadius: isMobile ? 3 : 4,
                    boxShadow: isMobile ? '0 4px 12px rgba(1, 87, 155, 0.2)' : 3,
                }}>
                    <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                        <Stack spacing={isMobile ? 0.25 : 1}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <TrendingUpIcon sx={{ fontSize: isMobile ? 16 : 28, color: 'rgba(255,255,255,0.9)' }} />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.65rem' : 'inherit', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Avg Order Value
                                </Typography>
                            </Stack>
                            <Typography variant={isMobile ? "h6" : "h4"} sx={{ color: 'white', fontWeight: 800, fontSize: isMobile ? '1.1rem' : 'inherit' }}>
                                {salesReport ? formatCurrency(salesReport.summary.averageOrderValue).replace('₹', '') : '-'}
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={6} md={3}>
                <Card sx={{
                    background: 'linear-gradient(135deg, #ff8f00 0%, #e65100 100%)',
                    borderRadius: isMobile ? 3 : 4,
                    boxShadow: isMobile ? '0 4px 12px rgba(230, 81, 0, 0.2)' : 3,
                }}>
                    <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                        <Stack spacing={isMobile ? 0.25 : 1}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <LeaderboardIcon sx={{ fontSize: isMobile ? 16 : 28, color: 'rgba(255,255,255,0.9)' }} />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.65rem' : 'inherit', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Top Items Sold
                                </Typography>
                            </Stack>
                            <Typography variant={isMobile ? "h6" : "h4"} sx={{ color: 'white', fontWeight: 800, fontSize: isMobile ? '1.1rem' : 'inherit' }}>
                                {topItems.length}
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={6} md={3}>
                <Card sx={{
                    background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                    borderRadius: isMobile ? 3 : 4,
                    boxShadow: isMobile ? '0 4px 12px rgba(27, 94, 32, 0.2)' : 3,
                }}>
                    <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                        <Stack spacing={isMobile ? 0.25 : 1}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <PaymentsIcon sx={{ fontSize: isMobile ? 16 : 28, color: 'rgba(255,255,255,0.9)' }} />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.65rem' : 'inherit', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Total Tips
                                </Typography>
                            </Stack>
                            <Typography variant={isMobile ? "h6" : "h4"} sx={{ color: 'white', fontWeight: 800, fontSize: isMobile ? '1.1rem' : 'inherit' }}>
                                {salesReport ? formatCurrency(salesReport.summary.totalTips || 0).replace('₹', '') : '-'}
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={6} md={3}>
                <Card sx={{
                    background: 'linear-gradient(135deg, #455a64 0%, #263238 100%)',
                    borderRadius: isMobile ? 3 : 4,
                    boxShadow: isMobile ? '0 4px 12px rgba(38, 50, 56, 0.2)' : 3,
                }}>
                    <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                        <Stack spacing={isMobile ? 0.25 : 1}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <ReceiptIcon sx={{ fontSize: isMobile ? 16 : 28, color: 'rgba(255,255,255,0.9)' }} />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.65rem' : 'inherit', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Total Tax
                                </Typography>
                            </Stack>
                            <Typography variant={isMobile ? "h6" : "h4"} sx={{ color: 'white', fontWeight: 800, fontSize: isMobile ? '1.1rem' : 'inherit' }}>
                                {salesReport ? formatCurrency(salesReport.summary.totalTax || 0).replace('₹', '') : '-'}
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>
            {/* Charts Row */}
            <Grid item xs={12}>
                <Grid container spacing={{ xs: 2, md: 3 }}>

                    {/* LEFT — PIE STYLE CARD */}
                    <Grid item xs={12} md={7}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: isMobile ? 2 : 4,
                                borderRadius: isMobile ? 3 : 5,
                                background: isMobile ? "#ffffff" : "#f5f5f5",
                                boxShadow: isMobile ? "0 2px 10px rgba(0,0,0,0.05)" : "none"
                            }}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    color: "#374151",
                                    fontWeight: 700,
                                    mb: 2,
                                    fontSize: { xs: 15, md: 18 }
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
                                background: isMobile ? "#f8f9fa" : "#f5f5f5",
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
                                            p: { xs: 1.75, md: 1.5 },
                                            borderRadius: { xs: 12, md: 3 },
                                            background: "#fff",
                                            boxShadow: { xs: "0 8px 30px rgba(0,0,0,0.06)", md: "0 4px 12px rgba(0,0,0,0.04)" },
                                            border: { xs: "1px solid rgba(0,0,0,0.04)", md: "none" },
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                fontWeight: 700,
                                                mb: { xs: 1, md: 1.5 },
                                                color: { xs: "#111827", md: "inherit" },
                                                fontSize: { xs: 14, md: 14 }
                                            }}
                                        >
                                            {item.orderType}
                                        </Typography>

                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Box
                                                sx={{
                                                    flexGrow: 1,
                                                    height: 8,
                                                    background: { xs: "#f1f2f6", md: "#eee" },
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
                                                    color: "#f4511e",
                                                    fontWeight: 900,
                                                    fontSize: { xs: 16, md: 13 },
                                                    minWidth: { xs: 28, md: 30 },
                                                    textAlign: 'right'
                                                }}
                                            >
                                                {item.totalOrders}
                                            </Typography>
                                        </Stack>
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
                                {Array.isArray(materialUsage) && materialUsage.slice(0, 5).map((item, index) => (
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
                    {/* Mobile Cards */}
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                        {recentOrders.length === 0 ? (
                            <Typography align="center" color="text.secondary" sx={{ py: 3 }}>No recent orders found</Typography>
                        ) : (
                            recentOrders
                                .slice(recentOrdersPage * recentOrdersRowsPerPage, recentOrdersPage * recentOrdersRowsPerPage + recentOrdersRowsPerPage)
                                .map((order: any) => (
                                    <Paper key={order._id || order.id} elevation={1} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="subtitle2" fontWeight={600}>#{order.orderNumber}</Typography>
                                            <Chip
                                                label={order.status}
                                                size="small"
                                                color={order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'error' : 'warning'}
                                            />
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                            {new Date(order.createdAt).toLocaleString()}
                                        </Typography>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                            <Chip label={formatOrderType(order.orderType)} size="small" variant="outlined" />
                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                <Typography variant="body2">Amount: <strong>{formatCurrency(order.totalAmount)}</strong></Typography>
                                                <Typography variant="body2">Tip: <strong>{formatCurrency(order.tip || 0)}</strong></Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                ))
                        )}
                    </Box>

                    {/* Desktop Table */}
                    <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' } }}>
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
        .slice(0, isMobile ? 5 : 10)
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
        <Box sx={{ py: 0 }}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: isMobile ? 1.5 : 3,
                gap: 1
            }}>
                <Typography variant={isMobile ? "body2" : "h5"} sx={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isMobile ? 'Best Selling' : 'Best Selling Items'}
                </Typography>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<DownloadIcon sx={{ fontSize: isMobile ? '14px !important' : 'inherit' }} />}
                    onClick={() => downloadExcel('best-selling')}
                    sx={{
                        borderRadius: 2,
                        fontSize: isMobile ? '0.65rem' : 'inherit',
                        px: isMobile ? 1 : 2,
                        minWidth: 'auto',
                        whiteSpace: 'nowrap',
                        height: isMobile ? 28 : 'auto',
                        textTransform: 'none'
                    }}
                >
                    {isMobile ? 'Export' : 'Export Excel'}
                </Button>
            </Box>

            <Grid container spacing={isMobile ? 1.5 : 3}>
                <Grid item xs={12}>
                    <Grid container spacing={isMobile ? 1.5 : 3} sx={{ alignItems: "stretch" }}>

                        {/* LEFT SIDE */}
                        <Grid item xs={12} md={8}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: isMobile ? 1.5 : 4,
                                    borderRadius: isMobile ? 3 : 6,
                                    background: isMobile ? "#ffffff" : "transparent",
                                    boxShadow: isMobile ? "0 2px 10px rgba(0,0,0,0.05)" : "none",
                                    height: "100%"
                                }}
                            >
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        color: "#374151",
                                        fontWeight: 700,
                                        mb: isMobile ? 1 : 3,
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

                                        <Grid item xs={12}>
                                            <Box sx={{ width: "100%", height: isMobile ? 220 : 320 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={safeBestPie}
                                                            dataKey="totalQuantity"
                                                            nameKey="itemName"
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={0}
                                                            outerRadius={isMobile ? 80 : 110}
                                                            stroke="none"
                                                            paddingAngle={0}
                                                            isAnimationActive={false}
                                                            labelLine={true}
                                                            label={({ cx, cy, midAngle, outerRadius, percent }) => {
                                                                if (!percent) return null;
                                                                const value = Math.round(percent * 100);
                                                                if (value < 2) return null;

                                                                const RADIAN = Math.PI / 180;
                                                                const sx = cx + (outerRadius - 5) * Math.cos(-midAngle * RADIAN);
                                                                const sy = cy + (outerRadius - 5) * Math.sin(-midAngle * RADIAN);
                                                                const mx = cx + (outerRadius + 20) * Math.cos(-midAngle * RADIAN);
                                                                const my = cy + (outerRadius + 20) * Math.sin(-midAngle * RADIAN);
                                                                const ex = mx + (mx > cx ? 20 : -20);
                                                                const ey = my;
                                                                const textAnchor = ex > cx ? "start" : "end";

                                                                return (
                                                                    <g>
                                                                        <path d={`M${sx},${sy}L${mx},${my}`} stroke="#9ca3af" fill="none" strokeWidth={1} />
                                                                        <text
                                                                            x={ex}
                                                                            y={ey}
                                                                            textAnchor={textAnchor}
                                                                            dominantBaseline="central"
                                                                            fill="#374151"
                                                                            style={{ fontSize: 11, fontWeight: 500 }}
                                                                        >
                                                                            {value}%
                                                                        </text>
                                                                    </g>
                                                                );
                                                            }}
                                                        >
                                                            {safeBestPie.map((entry, index) => (
                                                                <Cell
                                                                    key={index}
                                                                    fill={COLORS[index % COLORS.length]}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </Box>
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
                                                            bgcolor: "#f9fafb",
                                                            px: 2,
                                                            py: 1.25,
                                                            borderRadius: 2,
                                                            transition: 'all 0.2s',
                                                            '&:hover': { bgcolor: '#f3f4f6' }
                                                        }}
                                                    >
                                                        <Box sx={{ display: "flex", alignItems: "center" }}>
                                                            <Box
                                                                sx={{
                                                                    width: 10,
                                                                    height: 10,
                                                                    borderRadius: "50%",
                                                                    bgcolor: COLORS[index % COLORS.length],
                                                                    mr: 1.5
                                                                }}
                                                            />
                                                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                                                                {item.itemName}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#111827' }}>
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

                        {/* RIGHT SIDE — ORDER TYPE CARDS (Matches Dashboard UI) */}
                        <Grid item xs={12} md={4}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 2.5, sm: 3, md: 4 },
                                    borderRadius: 5,
                                    background: isMobile ? "#f8f9fa" : "transparent",
                                    height: "100%"
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
                                        (sum, o) => sum + (Number(o.totalOrders) || 0),
                                        0
                                    );

                                    const percent = totalOrdersAll
                                        ? (Number(item.totalOrders) / totalOrdersAll) * 100
                                        : 0;

                                    return (
                                        <Box
                                            key={index}
                                            sx={{
                                                mb: 2.5,
                                                p: { xs: 1.75, md: 1.5 },
                                                borderRadius: { xs: 12, md: 3 },
                                                background: "#fff",
                                                boxShadow: { xs: "0 8px 30px rgba(0,0,0,0.06)", md: "0 4px 12px rgba(0,0,0,0.04)" },
                                                border: { xs: "1px solid rgba(0,0,0,0.04)", md: "none" },
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: 700,
                                                    mb: { xs: 1, md: 1.5 },
                                                    color: { xs: "#111827", md: "inherit" },
                                                    fontSize: { xs: 14, md: 14 }
                                                }}
                                            >
                                                {item.orderType}
                                            </Typography>

                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Box
                                                    sx={{
                                                        flexGrow: 1,
                                                        height: 8,
                                                        background: { xs: "#f1f2f6", md: "#eee" },
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
                                                            transition: 'width 1s ease-in-out'
                                                        }}
                                                    />
                                                </Box>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: "#f4511e",
                                                        fontWeight: 900,
                                                        fontSize: { xs: 16, md: 13 },
                                                        minWidth: { xs: 28, md: 30 },
                                                        textAlign: 'right'
                                                    }}
                                                >
                                                    {item.totalOrders}
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    );
                                })}
                            </Paper>
                        </Grid>

                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: isMobile ? 2 : 3,
                            borderRadius: isMobile ? 3 : 4,
                            background: isMobile ? "#ffffff" : "#f9fafb",
                            boxShadow: isMobile ? "0 2px 10px rgba(0,0,0,0.05)" : "none",
                            border: isMobile ? "none" : "1px solid #edf2f7"
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: isMobile ? '1.1rem' : 'inherit' }}>Detailed Report</Typography>
                        {/* Mobile Cards */}
                        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                            {bestSellingItems
                                .slice(bestSellingPage * bestSellingRowsPerPage, bestSellingPage * bestSellingRowsPerPage + bestSellingRowsPerPage)
                                .map((item, index) => {
                                    const rank = bestSellingPage * bestSellingRowsPerPage + index + 1;
                                    return (
                                        <Paper key={index} elevation={1} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Chip label={rank} size="small" color={rank <= 3 ? 'primary' : 'default'} />
                                                    <Typography variant="subtitle2" fontWeight={600}>{item.itemName}</Typography>
                                                </Box>
                                                <Typography variant="caption" color="text.secondary">{item.category}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">Qty Sold</Typography>
                                                    <Typography variant="body2" fontWeight={600}>{item.totalQuantity}</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">Revenue</Typography>
                                                    <Typography variant="body2" fontWeight={600}>{formatCurrency(item.totalRevenue)}</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">Order Count</Typography>
                                                    <Typography variant="body2" fontWeight={600}>{item.orderCount}</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">Avg Price</Typography>
                                                    <Typography variant="body2" fontWeight={600}>{formatCurrency(item.averagePrice)}</Typography>
                                                </Box>
                                            </Box>
                                        </Paper>
                                    );
                                })}
                        </Box>

                        {/* Desktop Table */}
                        <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' } }}>
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
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );

    // Tips Report Tab
    const renderTipsReport = () => (
        <Grid container spacing={isMobile ? 1 : 3}>
            {/* Header with Export Button */}
            <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant={isMobile ? "subtitle2" : "h5"} sx={{ color: 'black', fontWeight: 'bold' }}>Tips Report</Typography>
                    <Button
                        variant="contained"
                        size={isMobile ? "small" : "medium"}
                        startIcon={<DownloadIcon sx={{ fontSize: isMobile ? '14px !important' : 'inherit' }} />}
                        onClick={() => downloadExcel('tips-report')}
                        sx={{ borderRadius: 2, textTransform: 'none', px: isMobile ? 1 : 2, height: isMobile ? 28 : 36, fontSize: isMobile ? '0.65rem' : 'inherit' }}
                    >
                        {isMobile ? 'Export' : 'Export Tips Excel'}
                    </Button>
                </Box>
            </Grid>
            {/* Tip Summary Cards */}
            <Grid item xs={4} md={4}>
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
                    <CardContent sx={{ p: isMobile ? 1 : 3 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={isMobile ? 1 : 2} alignItems="center" textAlign={{ xs: 'center', sm: 'left' }}>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: isMobile ? 32 : 56,
                                height: isMobile ? 32 : 56,
                                borderRadius: 3,
                                bgcolor: alpha('#4F46E5', 0.1),
                                color: 'primary.main'
                            }}>
                                <PaymentsIcon sx={{ fontSize: isMobile ? 20 : 32 }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, fontSize: isMobile ? '0.65rem' : undefined, whiteSpace: isMobile ? 'normal' : 'nowrap', lineHeight: 1.1 }}>
                                    Total Tips
                                </Typography>
                                <Typography variant={isMobile ? "body1" : "h4"} sx={{ color: 'text.primary', fontWeight: 800 }}>
                                    {salesReport ? formatCurrency(salesReport.summary.totalTips || 0) : '-'}
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={4} md={4}>
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
                    <CardContent sx={{ p: isMobile ? 1 : 3 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={isMobile ? 1 : 2} alignItems="center" textAlign={{ xs: 'center', sm: 'left' }}>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: isMobile ? 32 : 56,
                                height: isMobile ? 32 : 56,
                                borderRadius: 3,
                                bgcolor: alpha('#EC4899', 0.1),
                                color: 'secondary.main'
                            }}>
                                <TrendingUpIcon sx={{ fontSize: isMobile ? 20 : 32 }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, fontSize: isMobile ? '0.65rem' : undefined, whiteSpace: isMobile ? 'normal' : 'nowrap', lineHeight: 1.1 }}>
                                    Avg Tip/Order
                                </Typography>
                                <Typography variant={isMobile ? "body1" : "h4"} sx={{ color: 'text.primary', fontWeight: 800 }}>
                                    {salesReport && salesReport.summary.totalOrders > 0
                                        ? formatCurrency(salesReport.summary.totalTips / salesReport.summary.totalOrders)
                                        : formatCurrency(0)}
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={4} md={4}>
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
                    <CardContent sx={{ p: isMobile ? 1 : 3 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={isMobile ? 1 : 2} alignItems="center" textAlign={{ xs: 'center', sm: 'left' }}>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: isMobile ? 32 : 56,
                                height: isMobile ? 32 : 56,
                                borderRadius: 3,
                                bgcolor: alpha('#10B981', 0.1),
                                color: 'success.main'
                            }}>
                                <ReceiptIcon sx={{ fontSize: isMobile ? 20 : 32 }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, fontSize: isMobile ? '0.65rem' : undefined, whiteSpace: isMobile ? 'normal' : 'nowrap', lineHeight: 1.1 }}>
                                    With Tips
                                </Typography>
                                <Typography variant={isMobile ? "body1" : "h4"} sx={{ color: 'text.primary', fontWeight: 800 }}>
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
                    <Typography variant={isMobile ? "subtitle2" : "h6"} gutterBottom color="black" fontWeight="800" sx={{ mb: isMobile ? 1.5 : 3 }}>
                        Tips Trend Analysis
                    </Typography>
                    <Box sx={{ width: "100%", height: isMobile ? 220 : 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={isMobile ? salesReport?.dailySales.slice(0, 5) : (salesReport?.dailySales || [])} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTips" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.2} />
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
                    <Box>
                        {/* Mobile Card View */}
                        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                            {recentOrders.filter(order => (order.tip || 0) > 0).length > 0 ? (
                                recentOrders
                                    .filter(order => (order.tip || 0) > 0)
                                    .slice(tipsReportPage * tipsReportRowsPerPage, tipsReportPage * tipsReportRowsPerPage + tipsReportRowsPerPage)
                                    .map((order) => (
                                        <Paper key={order._id} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'flex-start' }}>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">{order.orderNumber}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(order.createdAt).toLocaleString()}
                                                    </Typography>
                                                </Box>
                                                <Chip label={formatOrderType(order.orderType)} size="small" variant="outlined" />
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" color="text.secondary">Waiter:</Typography>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {order.waiter && typeof order.waiter === 'object'
                                                        ? `${order.waiter.firstName || ''} ${order.waiter.lastName || ''}`.trim() || order.waiter.email || '-'
                                                        : order.waiterName || '-'}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" color="text.secondary">Order Amount:</Typography>
                                                <Typography variant="body2" fontWeight={600}>{formatCurrency(order.totalAmount)}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #f0f0f0' }}>
                                                <Typography variant="body2" color="text.secondary">Tip Amount:</Typography>
                                                <Typography variant="body2" fontWeight={700} color="black">
                                                    {formatCurrency(order.tip || 0)}
                                                </Typography>
                                            </Box>
                                        </Paper>
                                    ))
                            ) : (
                                <Paper sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">No orders with tips found in the selected period.</Typography>
                                </Paper>
                            )}
                        </Box>

                        {/* Desktop Table View */}
                        <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
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
                    </Box>
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
        <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: isMobile ? 1.5 : 3,
                gap: 1
            }}>
                <Typography variant={isMobile ? "body2" : "h6"} sx={{ fontWeight: 800 }}>Orders by Type</Typography>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<DownloadIcon sx={{ fontSize: isMobile ? '14px !important' : 'inherit' }} />}
                    onClick={() => downloadExcel('orders-by-type')}
                    sx={{
                        borderRadius: 2,
                        fontSize: isMobile ? '0.65rem' : 'inherit',
                        px: isMobile ? 1 : 2,
                        minWidth: 'auto',
                        whiteSpace: 'nowrap',
                        height: isMobile ? 28 : 'auto',
                        textTransform: 'none'
                    }}
                >
                    {isMobile ? 'Export' : 'Export Excel'}
                </Button>
            </Box>

            <Grid container spacing={isMobile ? 1.5 : 3}>
                <Grid container spacing={isMobile ? 1.5 : 3}>

                    {/* LEFT SIDE — PIE CARD */}
                    <Grid item xs={12} lg={8}>
                        <Paper
                            sx={{
                                p: isMobile ? 1.5 : 4,
                                borderRadius: isMobile ? 3 : 4,
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
                                            height: isMobile ? 220 : 360
                                        }}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={isMobile ? ordersByType.slice(0, 5) : ordersByType}
                                                    dataKey="totalRevenue"
                                                    nameKey="orderType"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={isMobile ? 45 : 0}
                                                    outerRadius={isMobile ? 75 : "75%"}
                                                    paddingAngle={3}
                                                    isAnimationActive={false}

                                                    label={isMobile ? false : ({ percent, cx, cy, midAngle, outerRadius }) => {
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
                                                    {(isMobile ? ordersByType.slice(0, 5) : ordersByType).map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={COLORS[index % COLORS.length]}
                                                        />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip 
                                                    formatter={(value: any, name: any) => [formatCurrency(Number(value)), formatOrderType(String(name))]}
                                                />
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
                                                xs: "1fr 1fr",
                                                sm: "1fr 1fr",
                                                md: "1fr 1fr",
                                                lg: "1fr 1fr"
                                            },
                                            gap: isMobile ? 1 : 1.5,
                                            px: { xs: 0, sm: 2 }
                                        }}
                                    >
                                        {(isMobile ? ordersByType.slice(0, 5) : ordersByType).map((type, index) => {

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
                    {/* Mobile Cards */}
                    <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                        {ordersByType.map((type, index) => (
                            <Paper key={index} elevation={0} sx={{
                                p: 1.5,
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)"
                            }}>
                                <Box sx={{ mb: 1 }}>
                                    <Chip
                                        label={formatOrderType(type.orderType)}
                                        size="small"
                                        sx={{
                                            maxWidth: '100%',
                                            height: 20,
                                            fontSize: '0.65rem',
                                            fontWeight: 700
                                        }}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Total Revenue</Typography>
                                    <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: '0.8rem' }}>{formatCurrency(type.totalRevenue)}</Typography>
                                </Box>
                                <Box sx={{ mt: 1, pt: 1, borderTop: "1px dashed #e5e7eb", display: 'flex', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Orders</Typography>
                                        <Typography variant="caption" fontWeight={700} sx={{ display: 'block' }}>{type.totalOrders}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Rate</Typography>
                                        <Typography variant="caption" fontWeight={700} sx={{ display: 'block', color: type.successRate > 90 ? 'success.main' : 'warning.main' }}>
                                            {type.successRate?.toFixed(0)}%
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        ))}
                    </Box>

                    {/* Desktop Table */}
                    <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' } }}>
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
        <Paper sx={{ p: { xs: 0, sm: 3 } }}>
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
                    <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                        {waiterPerformance.map((waiter, index) => (
                            <Card key={index} sx={{
                                borderRadius: 3,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)"
                            }}>
                                <CardContent sx={{ p: 1.5 }}>
                                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                        <Chip
                                            label={index + 1}
                                            size="small"
                                            sx={{ width: 20, height: 20, fontSize: '0.6rem', p: 0 }}
                                            color={index < 3 ? 'primary' : 'default'}
                                        />
                                        <Typography variant="caption" fontWeight={800} noWrap sx={{ maxWidth: 80 }}>
                                            {waiter.waiterName}
                                        </Typography>
                                    </Stack>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                        <Box>
                                            <Typography variant="caption" sx={{ fontSize: '0.6rem' }} color="text.secondary">Sales</Typography>
                                            <Typography variant="caption" fontWeight={700} sx={{ display: 'block', fontSize: '0.7rem' }}>
                                                {formatCurrency(waiter.totalSales)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="caption" sx={{ fontSize: '0.6rem' }} color="text.secondary">Orders</Typography>
                                            <Typography variant="caption" fontWeight={700} sx={{ display: 'block' }}>
                                                {waiter.totalOrders}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>

                    <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' } }}>                        <Table>
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
                                        <Chip label={index + 1} size="small" color={index < 3 ? 'primary' : 'default'} />
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
        <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: isMobile ? 1.5 : 3,
                gap: 1
            }}>
                <Typography variant={isMobile ? "body2" : "h6"} sx={{ fontWeight: 800 }}>Material Usage</Typography>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<DownloadIcon sx={{ fontSize: isMobile ? '14px !important' : 'inherit' }} />}
                    onClick={() => downloadExcel('material-usage')}
                    sx={{ borderRadius: 2, height: 28, px: 1, textTransform: 'none', fontSize: isMobile ? '0.65rem' : 'inherit' }}
                >
                    {isMobile ? 'Export' : 'Export Excel'}
                </Button>
            </Box>

            <Grid container spacing={isMobile ? 1.5 : 3}>
                <Grid item xs={12}>
                    <ResponsiveContainer width="100%" height={isMobile ? 220 : 450}>
                        <BarChart
                            data={materialUsage
                                .slice(0, isMobile ? 5 : 10)
                                .sort((a, b) => b.totalUsed - a.totalUsed)}
                            margin={{ top: 20, right: isMobile ? 10 : 30, left: 10, bottom: isMobile ? 0 : 80 }}
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
                    <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                        {materialUsage.map((item, index) => (
                            <Paper key={index} elevation={0} sx={{
                                p: 1.5,
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)"
                            }}>
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="caption" fontWeight={800} sx={{ display: 'block' }} noWrap>{item.itemName}</Typography>
                                    <Chip label={item.category} size="small" sx={{ height: 16, fontSize: '0.6rem', mt: 0.5 }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>Used</Typography>
                                    <Typography variant="caption" fontWeight={800} color="primary.main">{Number(item.totalUsed).toFixed(1)} {item.unit}</Typography>
                                </Box>
                                <Box sx={{ mt: 1, pt: 0.5, borderTop: "1px dashed #e5e7eb" }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Count: <b>{item.usageCount}</b></Typography>
                                </Box>
                            </Paper>
                        ))}
                    </Box>

                    <TableContainer component={Paper} sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: '100%', overflowX: 'auto' }}>                        <Table sx={{ minWidth: { xs: 'unset', sm: 650 } }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, px: { xs: 0.2, sm: 2 }, py: { xs: 1, sm: 2 }, whiteSpace: 'nowrap' }}>Item Name</TableCell>
                                <TableCell sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, px: { xs: 0.2, sm: 2 }, py: { xs: 1, sm: 2 }, whiteSpace: 'nowrap' }}>Category</TableCell>
                                <TableCell align="right" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, px: { xs: 0.2, sm: 2 }, py: { xs: 1, sm: 2 }, whiteSpace: 'nowrap' }}>Unit</TableCell>
                                <TableCell align="right" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, px: { xs: 0.2, sm: 2 }, py: { xs: 1, sm: 2 }, whiteSpace: 'nowrap' }}>Total Used</TableCell>
                                <TableCell align="right" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, px: { xs: 0.2, sm: 2 }, py: { xs: 1, sm: 2 }, whiteSpace: 'nowrap' }}>Usage Count</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {materialUsage.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, px: { xs: 0.2, sm: 2 } }}>{item.itemName}</TableCell>
                                    <TableCell sx={{ px: { xs: 0.2, sm: 2 } }}>
                                        <Chip label={item.category} size="small" />
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, px: { xs: 0.2, sm: 2 } }}>{item.unit}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, px: { xs: 0.2, sm: 2 } }}>{Number(item.totalUsed).toFixed(3)}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, px: { xs: 0.2, sm: 2 } }}>{item.usageCount}</TableCell>
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
                    <Grid item xs={12}>
                        <Grid container spacing={isMobile ? 1 : 3}>
                            <Grid item xs={6} md={3}>
                                <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#fff" }}>
                                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem' }} gutterBottom>Total Sales</Typography>
                                        <Typography variant={isMobile ? "subtitle2" : "h5"} fontWeight={800}>{formatCurrency(salesReport.summary.totalSales)}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Card sx={{ borderRadius: 3 }}>
                                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                        <Typography color="textSecondary" sx={{ fontSize: '0.7rem' }} gutterBottom>Total Orders</Typography>
                                        <Typography variant={isMobile ? "subtitle2" : "h5"} fontWeight={800}>{salesReport.summary.totalOrders}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: "#fff" }}>
                                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem' }} gutterBottom>Total Tax</Typography>
                                        <Typography variant={isMobile ? "subtitle2" : "h5"} fontWeight={800}>{formatCurrency(salesReport.summary.totalTax)}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Card sx={{ borderRadius: 3 }}>
                                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                        <Typography color="textSecondary" sx={{ fontSize: '0.7rem' }} gutterBottom>Total Discount</Typography>
                                        <Typography variant={isMobile ? "subtitle2" : "h5"} fontWeight={800}>{formatCurrency(salesReport.summary.totalDiscount)}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
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
                                <YAxis 
                                    yAxisId="left" 
                                    orientation="left" 
                                    stroke="#8884d8" 
                                    tickFormatter={(val) => typeof val === 'number' ? formatCurrency(val) : val}
                                />
                                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                <RechartsTooltip
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: "none",
                                        boxShadow: "0 8px 25px rgba(0,0,0,0.1)"
                                    }}
                                    formatter={(value: any, name: any) => {
                                        if (typeof value === 'number' && name.includes('Sales')) {
                                            return [formatCurrency(value), name];
                                        }
                                        return [value, name];
                                    }}
                                />
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
                            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                                {salesReport.taxByOrderType.map((row: any) => (
                                    <Paper key={row.orderType} sx={{ mb: 1.5, p: 1.5, borderRadius: 2 }}>
                                        <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 0.5 }}>{formatOrderType(row.orderType)}</Typography>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Count: <b>{row.count}</b></Typography>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Total Sales: <b>{formatCurrency(row.totalSales)}</b></Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Total Tax: <b>{formatCurrency(row.totalTax)}</b></Typography>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Country Tax: <b>{formatCurrency(row.countryTax)}</b></Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>State Tax: <b>{formatCurrency(row.stateTax)}</b></Typography>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>City Tax: <b>{formatCurrency(row.cityTax)}</b></Typography>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>County Tax: <b>{formatCurrency(row.countyTax)}</b></Typography>
                                        </Box>
                                    </Paper>
                                ))}
                            </Box>



                            <TableContainer component={Paper} sx={{ display: { xs: 'none', sm: 'block' }, overflowX: 'hidden' }}>                                <Table size="small">
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
                        <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                            {salesReport.dailySales
                                .slice(salesPage * salesRowsPerPage, salesPage * salesRowsPerPage + salesRowsPerPage)
                                .map((day: any, index: number) => (
                                    <Paper key={index} sx={{ mb: 1.5, p: 1.5, borderRadius: 2 }}>
                                        <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 0.5 }}>{new Date(day.date).toLocaleDateString()}</Typography>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Total Sales: <b>{formatCurrency(day.totalSales)}</b></Typography>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Total Tips: <b>{formatCurrency(day.totalTips || 0)}</b></Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Total Orders: <b>{day.totalOrders}</b></Typography>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Avg Order Value: <b>{formatCurrency(day.averageOrderValue)}</b></Typography>
                                        </Box>
                                    </Paper>
                                ))}
                        </Box>

                        <TableContainer component={Paper} sx={{ display: { xs: 'none', sm: 'block' }, overflowX: 'hidden' }}>
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
        <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: isMobile ? 1.5 : 3,
                gap: 1
            }}>
                <Typography variant={isMobile ? "body2" : "h6"} sx={{ fontWeight: 800 }}>Peak Hours Analysis</Typography>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<DownloadIcon sx={{ fontSize: isMobile ? '14px !important' : 'inherit' }} />}
                    onClick={() => downloadExcel('peak-hours')}
                    sx={{ borderRadius: 2, height: 28, px: 1, textTransform: 'none', fontSize: isMobile ? '0.65rem' : 'inherit' }}
                >
                    {isMobile ? 'Export' : 'Export Excel'}
                </Button>
            </Box>

            {peakHours && (
                <Grid container spacing={isMobile ? 1.5 : 3}>
                    <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: isMobile ? 1.5 : 3, borderRadius: 3 }}>
                            <Typography variant="subtitle2" fontWeight={800} gutterBottom>Hourly Traffic</Typography>
                            <ResponsiveContainer width="100%" height={isMobile ? 220 : 420}>
                                <BarChart
                                    data={isMobile ? peakHours.hourlyData.slice(0, 5) : peakHours.hourlyData}
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
                        </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: isMobile ? 1.5 : 3, borderRadius: 3 }}>
                            <Typography variant="subtitle2" fontWeight={800} gutterBottom>Day of Week Performance</Typography>
                            <ResponsiveContainer width="100%" height={isMobile ? 220 : 400}>
                                <BarChart data={isMobile ? peakHours.dailyData.slice(0, 5) : peakHours.dailyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="dayName" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Bar dataKey="totalOrders" fill="#82ca9d" name="Orders" isAnimationActive={false} />
                                    <Bar dataKey="totalRevenue" fill="#ffc658" name={`Revenue (${settings.restaurant.currency})`} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    <Grid item xs={12}>
                        <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                            {peakHours.hourlyData
                                .slice(peakHoursPage * peakHoursRowsPerPage, peakHoursPage * peakHoursRowsPerPage + peakHoursRowsPerPage)
                                .map((hour: any, index: number) => (
                                    <Paper key={index} elevation={0} sx={{
                                        p: 1.5,
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)"
                                    }}>
                                        <Box sx={{ mb: 1 }}>
                                            <Typography variant="caption" fontWeight={800} sx={{ display: 'block' }}>{hour.hour}:00 - {hour.hour + 1}:00</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>Revenue | Orders</Typography>
                                            <Typography variant="caption" fontWeight={800} color="primary.main">{formatCurrency(hour.totalRevenue)} | {hour.totalOrders}</Typography>
                                        </Box>
                                        <Box sx={{ mt: 1, pt: 0.5, borderTop: "1px dashed #e5e7eb" }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Avg Order: <b>{formatCurrency(hour.averageOrderValue)}</b></Typography>
                                        </Box>
                                    </Paper>
                                ))}
                        </Box>
                        <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, maxWidth: '100%', overflowX: 'auto' }}>
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
            <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
                <Box sx={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    mb: isMobile ? 1.5 : 3,
                    gap: 1.5
                }}>
                    <Typography variant={isMobile ? "body2" : "h6"} sx={{ fontWeight: 800 }}>Payment Method Analytics</Typography>
                    <Box sx={{ display: 'flex', gap: 1, width: isMobile ? '100%' : 'auto' }}>
                        <FormControl size="small" sx={{ flex: 1, minWidth: isMobile ? 0 : 200 }}>
                            <InputLabel id="payment-method-select-label">Method</InputLabel>
                            <Select
                                labelId="payment-method-select-label"
                                value={paymentMethodFilter}
                                label="Method"
                                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                sx={{ borderRadius: 2 }}
                            >
                                <MenuItem value="all">All Methods</MenuItem>
                                {uniqueMethods.map((method) => (
                                    <MenuItem key={method} value={method}>{method}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<DownloadIcon sx={{ fontSize: isMobile ? '14px !important' : 'inherit' }} />}
                            onClick={() => downloadExcel('payment-analytics')}
                            sx={{ borderRadius: 2, height: 40, px: 2, textTransform: 'none' }}
                        >
                            {isMobile ? 'Export' : 'Export Excel'}
                        </Button>
                    </Box>
                </Box>

                <Grid container spacing={isMobile ? 1.5 : 3}>
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: isMobile ? 1.5 : 3, borderRadius: isMobile ? 3 : 4 }}>
                            <Typography variant={isMobile ? "subtitle2" : "subtitle1"} fontWeight={isMobile ? 800 : 600} mb={isMobile ? 1 : 2}>
                                Revenue Distribution
                            </Typography>

                            <ResponsiveContainer width="100%" height={isMobile ? 220 : 350}>
                                <PieChart>
                                    <Pie
                                        data={isMobile ? data.slice(0, 5) : data}
                                        dataKey="totalRevenue"
                                        nameKey="paymentMethod"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={isMobile ? 45 : 0}
                                        outerRadius={isMobile ? 75 : 120}
                                        stroke="none"
                                        label={isMobile ? false : ({ percent }) =>
                                            `${(percent * 100).toFixed(0)}%`
                                        }
                                        isAnimationActive={false}
                                    >
                                        {(isMobile ? data.slice(0, 5) : data).map((entry, index) => (
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
                        <Paper sx={{ p: isMobile ? 1.5 : 3, borderRadius: isMobile ? 3 : 4 }}>
                            <Typography variant="subtitle2" fontWeight={800} mb={isMobile ? 1 : 2}>
                                Orders by Method
                            </Typography>

                            <ResponsiveContainer width="100%" height={isMobile ? 220 : 350}>
                                <BarChart
                                    data={isMobile ? data.slice(0, 5) : data}
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
                        {/* Mobile summary cards */}
                        <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                            {data.map((method, index) => (
                                <Paper key={index} elevation={0} sx={{
                                    p: 2, borderRadius: 3, border: '1px solid',
                                    borderColor: 'divider',
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Chip label={method.paymentMethod || 'Unknown'} size="small" color="primary"
                                            sx={{ mb: 0.5, fontWeight: 700, borderRadius: 1.5 }}
                                            onClick={() => { setPaymentMethodFilter(method.paymentMethod || 'Unknown'); downloadExcel('payment-analytics', method.paymentMethod || 'Unknown'); }}
                                        />
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Orders: <b>{method.totalOrders || 0}</b></Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Revenue</Typography>
                                        <Typography variant="subtitle2" fontWeight={800} color="primary.main">{formatCurrency(method.totalRevenue || 0)}</Typography>
                                        <Typography variant="caption" color="text.secondary">Avg: {formatCurrency(method.averageOrderValue || 0)}</Typography>
                                    </Box>
                                </Paper>
                            ))}
                            {data.length === 0 && <Typography sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>No data</Typography>}
                        </Box>
                        {/* Desktop table */}
                        <TableContainer component={Paper} sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: '100%', overflowX: 'auto' }}>
                            <Table sx={{ '& .MuiTableCell-root': { padding: { xs: '8px 4px', sm: '16px' } } }}>
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
                        <Typography variant={isMobile ? "subtitle2" : "h6"} fontWeight={800} sx={{ mt: isMobile ? 1.5 : 3, mb: isMobile ? 1 : 2 }}>
                            Detailed Transactions ({paymentMethodFilter === 'all' ? 'All Methods' : paymentMethodFilter})
                        </Typography>
                        <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                            {paymentDetails.slice(paymentDetailsPage * paymentDetailsRowsPerPage, paymentDetailsPage * paymentDetailsRowsPerPage + paymentDetailsRowsPerPage)
                                .map((detail: any, index: number) => (
                                    <Paper key={index} sx={{ mb: 1.5, p: 1.5, borderRadius: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                            <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{detail.orderNumber}</Typography>
                                            <Chip label={detail.status} size="small" variant="outlined" />
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Date: <b>{new Date(detail.createdAt).toLocaleDateString()}</b></Typography>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Customer: <b>{detail.customer?.name || 'Guest'}</b></Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                            <Chip label={detail.paymentMethod || 'Unknown'} size="small" />
                                            <Chip label={formatOrderType(detail.orderType)} size="small" variant="outlined" />
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Amount: <b>{formatCurrency(detail.totalAmount)}</b></Typography>
                                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Tip: <b>{formatCurrency(detail.tip || 0)}</b></Typography>
                                        </Box>
                                    </Paper>
                                ))}
                            {paymentDetails.length === 0 && (
                                <Typography sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>No transactions found</Typography>
                            )}
                        </Box>

                        <TableContainer component={Paper} sx={{ display: { xs: 'none', sm: 'block' }, overflowX: 'hidden' }}>
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
            <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: isMobile ? 1.5 : 3,
                    gap: 1
                }}>
                    <Typography variant={isMobile ? "body2" : "h6"} sx={{ fontWeight: 800 }}>Category Performance</Typography>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<DownloadIcon sx={{ fontSize: isMobile ? '14px !important' : 'inherit' }} />}
                        onClick={() => downloadExcel('category-performance')}
                        sx={{ borderRadius: 2, height: 28, px: 1, textTransform: 'none', fontSize: isMobile ? '0.65rem' : 'inherit' }}
                    >
                        {isMobile ? 'Export' : 'Export Excel'}
                    </Button>
                </Box>

                <Grid container spacing={isMobile ? 1.5 : 3}>
                    {/* 📊 Modern Bar Chart */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: isMobile ? 1.5 : 3, borderRadius: isMobile ? 3 : 4 }}>
                            <Typography variant="subtitle2" fontWeight={800} mb={isMobile ? 1 : 2}>
                                Revenue by Category
                            </Typography>

                            <ResponsiveContainer width="100%" height={isMobile ? 220 : 350}>
                                <BarChart
                                    data={isMobile ? data.slice(0, 5) : data}
                                    margin={{ top: 20, right: 20, left: 10, bottom: 40 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />

                                    <XAxis
                                        dataKey="category"
                                        angle={-30}
                                        textAnchor="end"
                                        interval={0}
                                        height={isMobile ? 45 : 70}
                                        tick={{ fontSize: isMobile ? 10 : 12 }}
                                    />

                                    <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 35 : 60} />

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
                                        barSize={isMobile ? 25 : 35}
                                        isAnimationActive={false}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* 🟠 Modern Donut Chart */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: isMobile ? 1.5 : 3, borderRadius: isMobile ? 3 : 4 }}>
                            <Typography variant={isMobile ? "subtitle2" : "subtitle1"} fontWeight={isMobile ? 800 : 600} mb={isMobile ? 1 : 2}>
                                Revenue Distribution
                            </Typography>

                            <ResponsiveContainer width="100%" height={isMobile ? 220 : 350}>
                                <PieChart>
                                    <Pie
                                        data={isMobile ? data.slice(0, 5) : data}
                                        dataKey="totalRevenue"
                                        nameKey="category"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={isMobile ? 45 : 70}
                                        outerRadius={isMobile ? 75 : 120}
                                        stroke="none"
                                        label={isMobile ? false : ({ percent }) =>
                                            `${(percent * 100).toFixed(0)}%`
                                        }
                                        isAnimationActive={false}
                                    >
                                        {(isMobile ? data.slice(0, 5) : data).map((entry, index) => (
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
                        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                            {data.length === 0 ? (
                                <Typography sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>No data available</Typography>
                            ) : data.map((cat, index) => (
                                <Paper key={index} elevation={0} sx={{
                                    p: 2,
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <Box sx={{ flex: 1, pr: 2 }}>
                                        <Typography variant="body2" fontWeight={800} sx={{ wordBreak: 'break-word', lineHeight: 1.3, mb: 0.5 }}>
                                            {cat.category || 'Uncategorized'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                            Items: <b>{cat.itemCount || 0}</b>
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>Revenue</Typography>
                                        <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                                            {formatCurrency(cat.totalRevenue || 0)}
                                        </Typography>
                                    </Box>
                                </Paper>
                            ))}
                        </Box>

                        <TableContainer component={Paper} sx={{ display: { xs: 'none', sm: 'block' }, overflowX: 'hidden' }}>
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
            cancelledItemsLoss = 0,
            byOrderType = [],
            cancelledOrders = [],
            topCancelledItems = [],
            totalRefunds = 0,
            totalRefundAmount = 0,
            refundRecords = [],
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
                    <Grid item xs={12}>
                        <Grid container spacing={isMobile ? 1 : 2}>
                            <Grid item xs={6} md={2.4}>
                                <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: 3, height: '100%' }}>
                                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem' }}>Cancels</Typography>
                                        <Typography variant={isMobile ? "subtitle2" : "h4"} sx={{ color: 'white', fontWeight: 800, mt: 0.5 }}>{totalCancelled}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} md={2.4}>
                                <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: 3, height: '100%' }}>
                                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem' }}>Items Cancelled</Typography>
                                        <Typography variant={isMobile ? "subtitle2" : "h4"} sx={{ color: 'white', fontWeight: 800, mt: 0.5 }}>{totalItemCancellations}</Typography>
                                        {cancelledItemsLoss > 0 && <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.65rem' }}>Loss: {formatCurrency(cancelledItemsLoss)}</Typography>}
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} md={2.4}>
                                <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', borderRadius: 3, height: '100%' }}>
                                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem' }}>Rate</Typography>
                                        <Typography variant={isMobile ? "subtitle2" : "h4"} sx={{ color: 'white', fontWeight: 800, mt: 0.5 }}>{Number(cancellationRate).toFixed(1)}%</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} md={2.4}>
                                <Card sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: 3, height: '100%' }}>
                                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem' }}>Loss</Typography>
                                        <Typography variant={isMobile ? "subtitle2" : "h4"} sx={{ color: 'white', fontWeight: 800, mt: 0.5 }}>{formatCurrency(revenueLoss)}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} md={2.4}>
                                <Card sx={{ background: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', borderRadius: 3, height: '100%' }}>
                                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem' }}>Refunds</Typography>
                                        <Typography variant={isMobile ? "subtitle2" : "h4"} sx={{ color: 'white', fontWeight: 800, mt: 0.5 }}>{totalRefunds}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} md={2.4}>
                                <Card sx={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', borderRadius: 3, height: '100%' }}>
                                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem' }}>Refunded</Typography>
                                        <Typography variant={isMobile ? "subtitle2" : "h4"} sx={{ color: 'white', fontWeight: 800, mt: 0.5 }}>{formatCurrency(totalRefundAmount)}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Left side: Charts and Order Type Table */}
                    <Grid item xs={12} lg={6}>
                        <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
                            <Typography variant="subtitle1" fontWeight={600} mb={3}>
                                Cancellation by Order Type
                            </Typography>
                            <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
                                <BarChart data={isMobile ? byOrderType.slice(0, 5) : byOrderType}>
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

                        <Box>
                            {/* Mobile Card View */}
                            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                                {byOrderType.map((type: any, index: number) => (
                                    <Paper key={index} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                                        <Box sx={{ mb: 1.5 }}>
                                            <Chip label={formatOrderType(type.orderType)} color="error" size="small" variant="outlined" />
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2" color="text.secondary">Order Cancels:</Typography>
                                            <Typography variant="body2" fontWeight={600}>{type.cancelledCount}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2" color="text.secondary">Item Cancels:</Typography>
                                            <Typography variant="body2" fontWeight={600}>{type.itemCancelledCount}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" color="text.secondary">Revenue Loss:</Typography>
                                            <Typography variant="body2" fontWeight={600}>{formatCurrency(type.revenueLoss)}</Typography>
                                        </Box>
                                    </Paper>
                                ))}
                                {byOrderType.length === 0 && (
                                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">No cancellation data available</Typography>
                                    </Paper>
                                )}
                            </Box>

                            {/* Desktop Table View */}
                            <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', display: { xs: 'none', md: 'block' } }}>
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
                        </Box>
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
                            <Box>
                                {/* Mobile Card View */}
                                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                                    {cancelledOrders
                                        .slice(cancelledOrdersPage * cancelledOrdersRowsPerPage, cancelledOrdersPage * cancelledOrdersRowsPerPage + cancelledOrdersRowsPerPage)
                                        .map((order: any, index: number) => (
                                            <Paper key={index} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'flex-start' }}>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="bold">{order.orderNumber}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{new Date(order.createdAt).toLocaleDateString()}</Typography>
                                                    </Box>
                                                    <Chip
                                                        label={order.isFullOrder ? 'Full Order' : 'Item(s)'}
                                                        size="small"
                                                        color={order.isFullOrder ? 'error' : 'warning'}
                                                        variant="outlined"
                                                    />
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2" color="text.secondary">Customer:</Typography>
                                                    <Typography variant="body2" fontWeight={600}>{order.customer?.name || 'Guest'}</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2" color="text.secondary">Type:</Typography>
                                                    <Chip label={formatOrderType(order.orderType)} size="small" variant="outlined" />
                                                </Box>
                                                <Box sx={{ mb: 1 }}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Reason:</Typography>
                                                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                                        {order.cancellationReason}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #f0f0f0' }}>
                                                    <Typography variant="body2" color="text.secondary">Loss Amount:</Typography>
                                                    <Typography variant="body2" fontWeight={600} color="error.main">
                                                        {formatCurrency(order.cancellationLoss)}
                                                    </Typography>
                                                </Box>
                                            </Paper>
                                        ))}
                                    {cancelledOrders.length === 0 && (
                                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                                            <Typography variant="body2" color="text.secondary">No cancelled orders found for this period</Typography>
                                        </Paper>
                                    )}
                                </Box>

                                {/* Desktop Table View */}
                                <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
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
                            </Box>
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
                    {/* Refund Records */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3, borderRadius: 4 }}>
                            <Typography variant="subtitle1" fontWeight={600} mb={3}>
                                Refund Records
                            </Typography>
                            <Box>
                                {/* Mobile Card View */}
                                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                                    {refundRecords
                                        .slice(refundRecordsPage * refundRecordsRowsPerPage, refundRecordsPage * refundRecordsRowsPerPage + refundRecordsRowsPerPage)
                                        .map((r: any, index: number) => (
                                            <Paper key={index} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                                    <Typography variant="body2" fontWeight="bold">{r.orderNumber}</Typography>
                                                    <Chip label={r.refundMethod === 'cash' ? 'Cash' : 'Original'} size="small" color={r.refundMethod === 'cash' ? 'warning' : 'info'} variant="outlined" />
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2" color="text.secondary">Item:</Typography>
                                                    <Typography variant="body2" fontWeight={600}>{r.itemName}</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2" color="text.secondary">Item Price:</Typography>
                                                    <Typography variant="body2">{formatCurrency(r.itemSubtotal)}</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2" color="text.secondary">Tax:</Typography>
                                                    <Typography variant="body2">{formatCurrency(r.taxAmount)}</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, pt: 1, borderTop: '1px solid #f0f0f0' }}>
                                                    <Typography variant="body2" color="text.secondary">Total Refund:</Typography>
                                                    <Typography variant="body2" fontWeight={700} color="success.main">{formatCurrency(r.totalRefundAmount)}</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2" color="text.secondary">By:</Typography>
                                                    <Typography variant="body2">{r.refundedByName || '—'}</Typography>
                                                </Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(r.refundedAt).toLocaleString()}
                                                </Typography>
                                            </Paper>
                                        ))}
                                    {refundRecords.length === 0 && (
                                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                                            <Typography variant="body2" color="text.secondary">No refunds found for this period</Typography>
                                        </Paper>
                                    )}
                                </Box>

                                {/* Desktop Table View */}
                                <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                                    <Table>
                                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Order #</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Order Type</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>Item Price</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>Tax</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>Total Refund</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Processed By</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {refundRecords
                                                .slice(refundRecordsPage * refundRecordsRowsPerPage, refundRecordsPage * refundRecordsRowsPerPage + refundRecordsRowsPerPage)
                                                .map((r: any, index: number) => (
                                                    <TableRow key={index} hover>
                                                        <TableCell>
                                                            <Typography variant="body2">{new Date(r.refundedAt).toLocaleDateString()}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{new Date(r.refundedAt).toLocaleTimeString()}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight="bold">{r.orderNumber}</Typography>
                                                        </TableCell>
                                                        <TableCell>{r.itemName}</TableCell>
                                                        <TableCell>
                                                            <Chip label={formatOrderType(r.orderType)} size="small" variant="outlined" />
                                                        </TableCell>
                                                        <TableCell align="right">{formatCurrency(r.itemSubtotal)}</TableCell>
                                                        <TableCell align="right">{formatCurrency(r.taxAmount)}</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                                                            {formatCurrency(r.totalRefundAmount)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={r.refundMethod === 'cash' ? 'Cash' : 'Original'}
                                                                size="small"
                                                                color={r.refundMethod === 'cash' ? 'warning' : 'info'}
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell>{r.refundedByName || '—'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            {refundRecords.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                        No refunds found for this period
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                            <TablePagination
                                rowsPerPageOptions={[10, 25, 50]}
                                component="div"
                                count={refundRecords.length}
                                rowsPerPage={refundRecordsRowsPerPage}
                                page={refundRecordsPage}
                                onPageChange={(_, newPage) => setRefundRecordsPage(newPage)}
                                onRowsPerPageChange={(e) => {
                                    setRefundRecordsRowsPerPage(parseInt(e.target.value, 10));
                                    setRefundRecordsPage(0);
                                }}
                            />
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>
        );
    };

    const renderProfitLoss = () => (
        <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
            <Typography variant={isMobile ? "subtitle2" : "h6"} sx={{ fontWeight: 800, mb: isMobile ? 1.5 : 3 }}>Profit & Loss Statement</Typography>
            {profitLoss && (
                <Grid container spacing={isMobile ? 1 : 3}>
                    <Grid item xs={6} md={3}>
                        <Card sx={{ bgcolor: '#e3f2fd', borderRadius: 3 }}>
                            <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>Total Revenue</Typography>
                                <Typography variant={isMobile ? "subtitle2" : "h4"} fontWeight={800}>{formatCurrency(profitLoss.revenue)}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Card sx={{ bgcolor: '#ffebee', borderRadius: 3 }}>
                            <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>Expenses (PO)</Typography>
                                <Typography variant={isMobile ? "subtitle2" : "h4"} fontWeight={800}>{formatCurrency(profitLoss.cogs)}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Card sx={{ bgcolor: '#e8f5e9', borderRadius: 3 }}>
                            <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>Gross Profit</Typography>
                                <Typography variant={isMobile ? "subtitle2" : "h4"} fontWeight={800}>{formatCurrency(profitLoss.grossProfit)}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Card sx={{ bgcolor: '#fff3e0', borderRadius: 3 }}>
                            <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>Gross Margin</Typography>
                                <Typography variant={isMobile ? "subtitle2" : "h4"} fontWeight={800}>{profitLoss.margin.toFixed(1)}%</Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Breakdown Table */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                            Expense Breakdown (Purchase Orders)
                        </Typography>
                        <Box>
                            {/* Mobile Card View */}
                            <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                                {profitLoss.expenses && profitLoss.expenses.length > 0 ? (
                                    profitLoss.expenses.map((item: any, index: number) => (
                                        <Paper key={index} sx={{
                                            p: 1.5,
                                            borderRadius: 3,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)"
                                        }}>
                                            <Box sx={{ mb: 1 }}>
                                                <Typography variant="caption" fontWeight={800} noWrap sx={{ display: 'block' }}>{item.poNumber || 'N/A'}</Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{new Date(item.date).toLocaleDateString()}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>Amount</Typography>
                                                <Typography variant="caption" fontWeight={800} color="primary.main">{formatCurrency(item.amount)}</Typography>
                                            </Box>
                                            <Box sx={{ mt: 1, pt: 0.5, borderTop: "1px dashed #e5e7eb" }}>
                                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.6rem' }}>Vendor: {item.vendor || 'N/A'}</Typography>
                                            </Box>
                                        </Paper>
                                    ))
                                ) : (
                                    <Paper sx={{ p: 3, textAlign: 'center', gridColumn: "1 / span 2" }}>
                                        <Typography variant="caption" color="text.secondary">No expenses found</Typography>
                                    </Paper>
                                )}
                            </Box>

                            {/* Desktop Table View */}
                            <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: '100%', overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
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
                        </Box>
                    </Grid>
                </Grid>
            )}
        </Paper>
    );

    const renderCustomerAnalytics = () => (
        <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
            <Typography variant={isMobile ? "subtitle2" : "h6"} sx={{ fontWeight: 800, mb: isMobile ? 1.5 : 3 }}>Top Customers</Typography>
            <Box>
                {/* Mobile Card View */}
                <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                    {customerAnalytics
                        .slice(customerPage * customerRowsPerPage, customerPage * customerRowsPerPage + customerRowsPerPage)
                        .map((customer: any, index: number) => (
                            <Paper key={index} elevation={0} sx={{
                                p: 1.5,
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)"
                            }}>
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="caption" fontWeight={800} noWrap sx={{ display: 'block' }}>{customer.name || 'Guest'}</Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{customer.phone || 'No Phone'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>Total Spend</Typography>
                                    <Typography variant="caption" fontWeight={800} color="primary.main">{formatCurrency(customer.totalSpend)}</Typography>
                                </Box>
                                <Box sx={{ mt: 1, pt: 0.5, borderTop: "1px dashed #e5e7eb", display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Orders: <b>{customer.totalOrders}</b></Typography>
                                </Box>
                            </Paper>
                        ))}
                </Box>

                {/* Desktop Table View */}
                <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
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
            </Box>
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
        <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
            <Typography variant={isMobile ? "subtitle2" : "h6"} sx={{ fontWeight: 800, mb: isMobile ? 1.5 : 3 }}>Inventory Stock Levels</Typography>
            {inventoryStock && (
                <>
                    <Grid container spacing={isMobile ? 1 : 3} sx={{ mb: isMobile ? 2 : 3 }}>
                        <Grid item xs={6} md={4}>
                            <Card sx={{ borderRadius: 3 }}>
                                <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                    <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>Total Items</Typography>
                                    <Typography variant={isMobile ? "subtitle2" : "h4"} fontWeight={800}>{inventoryStock.totalItems}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={4}>
                            <Card sx={{ borderRadius: 3 }}>
                                <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                    <Typography sx={{ color: 'error.main', fontSize: '0.7rem' }}>Low Stock</Typography>
                                    <Typography variant={isMobile ? "subtitle2" : "h4"} fontWeight={800} color="error.main">{inventoryStock.lowStockCount}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", color: "#fff" }}>
                                <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem' }}>Total Stock Value</Typography>
                                    <Typography variant={isMobile ? "subtitle2" : "h4"} fontWeight={800}>{formatCurrency(inventoryStock.totalStockValue)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                    <Box>
                        {/* Mobile Card View */}
                        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                            {inventoryStock.items
                                .slice(inventoryPage * inventoryRowsPerPage, inventoryPage * inventoryRowsPerPage + inventoryRowsPerPage)
                                .map((item: any, index: number) => (
                                    <Paper key={index} elevation={0} sx={{
                                        p: 2,
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: item.status === 'Low Stock' ? 'error.light' : 'divider',
                                        background: item.status === 'Low Stock' ? "#fff5f5" : "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <Box sx={{ flex: 1, pr: 2 }}>
                                            <Typography variant="body2" fontWeight={800} sx={{ wordBreak: 'break-word', lineHeight: 1.3 }}>
                                                {item.name}
                                            </Typography>
                                            <Chip
                                                label={item.status}
                                                size="small"
                                                color={item.status === 'Low Stock' ? 'error' : 'success'}
                                                sx={{ height: 20, fontSize: '0.65rem', mt: 0.75, fontWeight: 600, borderRadius: 1.5 }}
                                            />
                                        </Box>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Stock</Typography>
                                            <Typography variant="subtitle2" fontWeight={800} color={item.status === 'Low Stock' ? 'error.main' : 'text.primary'}>
                                                {Number(item.currentStock).toFixed(1)} {item.unit}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                ))}
                        </Box>

                        {/* Desktop Table View */}
                        <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
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
                    </Box>
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
        <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
            <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: isMobile ? 1.5 : 3,
                gap: 1
            }}>
                <Typography variant={isMobile ? "body2" : "h6"} sx={{ fontWeight: 800 }}>Table Performance</Typography>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<DownloadIcon sx={{ fontSize: isMobile ? '14px !important' : 'inherit' }} />}
                    onClick={() => downloadExcel('table-stats')}
                    sx={{ borderRadius: 2, height: 28, px: 1, textTransform: 'none', fontSize: isMobile ? '0.65rem' : 'inherit' }}
                >
                    {isMobile ? 'Export' : 'Export Excel'}
                </Button>
            </Box>
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
                                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                            />

                            {/* Tooltip styled like your dashboard */}
                            <RechartsTooltip
                                contentStyle={{
                                    borderRadius: 10,
                                    border: "none",
                                    boxShadow: "0 8px 20px rgba(0,0,0,0.12)"
                                }}
                                cursor={{ fill: "rgba(255,107,11,0.08)" }}
                                formatter={(value: any, name: any) => {
                                    if (name === "Revenue") return [formatCurrency(value), "Total Revenue"];
                                    return [value, "Total Bookings"];
                                }}
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
                    <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                        {tableStats
                            .slice(tableStatsPage * tableStatsRowsPerPage, tableStatsPage * tableStatsRowsPerPage + tableStatsRowsPerPage)
                            .map((row, i) => (
                                <Paper key={i} elevation={0} sx={{
                                    p: 1.5,
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)"
                                }}>
                                    <Box sx={{ mb: 1 }}>
                                        <Typography variant="caption" fontWeight={800} sx={{ display: 'block' }}>{row.tableName}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>Revenue</Typography>
                                        <Typography variant="caption" fontWeight={800}>{formatCurrency(row.totalRevenue)}</Typography>
                                    </Box>
                                    <Box sx={{ mt: 1, pt: 0.5, borderTop: "1px dashed #e5e7eb", display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Bookings: <b>{row.totalBookings}</b></Typography>
                                    </Box>
                                </Paper>
                            ))}
                    </Box>
                    <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, maxWidth: '100%', overflowX: 'auto' }}>
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
        <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
            <Typography variant={isMobile ? "subtitle2" : "h6"} sx={{ fontWeight: 800, mb: isMobile ? 1.5 : 3 }}>Coupon Performance</Typography>
            <Box>
                {/* Mobile Card View */}
                <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                    {couponAnalytics
                        .slice(couponPage * couponRowsPerPage, couponPage * couponRowsPerPage + couponRowsPerPage)
                        .map((coupon: any, index: number) => (
                            <Paper key={index} elevation={0} sx={{
                                p: 1.5,
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)"
                            }}>
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="caption" fontWeight={800} noWrap sx={{ display: 'block' }}>{coupon.code}</Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{coupon.name}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Saved</Typography>
                                    <Typography variant="caption" fontWeight={800} color="success.main">{formatCurrency(coupon.totalRevenue)}</Typography>
                                </Box>
                                <Box sx={{ mt: 1, pt: 0.5, borderTop: "1px dashed #e5e7eb" }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Used: <b>{coupon.usageCount}</b></Typography>
                                </Box>
                            </Paper>
                        ))}
                </Box>

                {/* Desktop Table View */}
                <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
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
            </Box>
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
        <Grid container spacing={isMobile ? 1 : 3}>
            <Grid item xs={12}>
                <Paper sx={{ p: isMobile ? 1.5 : 2, mb: isMobile ? 1 : 2 }}>
                    <Stack direction={isMobile ? "column" : "row"} spacing={1.5} alignItems={isMobile ? "stretch" : "center"}>
                        <FormControl size="small" sx={{ minWidth: isMobile ? 0 : 150 }}>
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
                        <Button variant="contained" size={isMobile ? "small" : "medium"} onClick={fetchReportData}>Apply</Button>
                    </Stack>
                </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: 3 }}>
                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                        <Typography sx={{ opacity: 0.8, fontSize: '0.7rem' }}>Total Created</Typography>
                        <Typography variant={isMobile ? "subtitle2" : "h4"} fontWeight={800}>{promoSummary?.totalCreated || 0}</Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: 'secondary.main', color: 'white', borderRadius: 3 }}>
                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                        <Typography sx={{ opacity: 0.8, fontSize: '0.7rem' }}>Redemptions</Typography>
                        <Typography variant={isMobile ? "subtitle2" : "h4"} fontWeight={800}>{promoSummary?.redemptionCount || 0}</Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: 'success.main', color: 'white', borderRadius: 3 }}>
                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                        <Typography sx={{ opacity: 0.8, fontSize: '0.7rem' }}>Value Saved</Typography>
                        <Typography variant={isMobile ? "subtitle2" : "h4"} fontWeight={800}>{formatCurrency(promoSummary?.totalRedeemedValue || 0)}</Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: 'warning.main', color: 'white', borderRadius: 3 }}>
                    <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                        <Typography sx={{ opacity: 0.8, fontSize: '0.7rem' }}>Avg. Saving</Typography>
                        <Typography variant={isMobile ? "subtitle2" : "h4"} fontWeight={800}>
                            {promoSummary?.redemptionCount > 0
                                ? formatCurrency(promoSummary.totalRedeemedValue / promoSummary.redemptionCount)
                                : formatCurrency(0)}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>

            {promoSummary?.topPromos?.length > 0 && (
                <Grid item xs={12}>
                    <Paper sx={{ p: isMobile ? 1.5 : 3, borderRadius: 3 }}>
                        <Typography variant="subtitle2" fontWeight={800} mb={isMobile ? 1.5 : 2}>Top Performing Promos</Typography>
                        <Box sx={{ height: isMobile ? 220 : 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={isMobile ? promoSummary.topPromos.slice(0, 5) : promoSummary.topPromos}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="code" />
                                    <YAxis />
                                    <RechartsTooltip
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: "none",
                                            boxShadow: "0 8px 25px rgba(0,0,0,0.1)"
                                        }}
                                        formatter={(value: any, name: any) => {
                                            if (name === "Value Saved") return [formatCurrency(value), "Value Saved"];
                                            return [value, "Redemptions"];
                                        }}
                                    />
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
        <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
            <Typography variant={isMobile ? "subtitle2" : "h6"} sx={{ fontWeight: 800, mb: isMobile ? 1.5 : 3 }}>Promo Redemptions</Typography>
            <Box>
                {/* Mobile Card View */}
                <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                    {promoRedemptions.map((row: any) => (
                        <Paper key={row._id} elevation={0} sx={{
                            p: 2,
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Box sx={{ flex: 1, pr: 1 }}>
                                    <Typography variant="body2" fontWeight={800} sx={{ display: 'block', wordBreak: 'break-all' }}>
                                        ORD#{row.orderNumber}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                        {row.customer?.name || 'Guest'}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={row.couponCode}
                                    size="small"
                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'primary.50', color: 'primary.700', borderRadius: 1.5 }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1, borderTop: "1px dashed #e5e7eb" }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>Discount Applied</Typography>
                                <Typography variant="body2" fontWeight={800} color="error.main">
                                    -{formatCurrency(row.discount?.amount || 0)}
                                </Typography>
                            </Box>
                        </Paper>
                    ))}
                    {promoRedemptions.length === 0 && (
                        <Typography sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>No redemptions found</Typography>
                    )}
                </Box>
                <TableContainer component={Paper} elevation={0} sx={{ display: { xs: 'none', md: 'block' } }}>
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
            </Box>
        </Paper>
    );

    const renderPromoCompensation = () => (
        <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
            <Typography variant={isMobile ? "subtitle2" : "h6"} sx={{ fontWeight: 800, mb: isMobile ? 1.5 : 3 }}>Compensation Analysis</Typography>
            <Box>
                {/* Mobile Card View */}
                <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                    {promoCompensation.map((row: any, i: number) => (
                        <Paper key={i} elevation={0} sx={{
                            p: 2,
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Box sx={{ flex: 1, pr: 2 }}>
                                <Typography variant="body2" fontWeight={800} sx={{ wordBreak: 'break-word', lineHeight: 1.3 }}>
                                    {row._id || 'General Support'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    Count: <b>{row.count}</b>
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Total Value</Typography>
                                <Typography variant="subtitle2" fontWeight={800} color="error.main">
                                    {formatCurrency(row.totalValue)}
                                </Typography>
                            </Box>
                        </Paper>
                    ))}
                    {promoCompensation.length === 0 && (
                        <Typography sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>No compensation data</Typography>
                    )}
                </Box>
                <TableContainer component={Paper} elevation={0} sx={{ display: { xs: 'none', md: 'block' } }}>
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
            </Box>
        </Paper>
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
            <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
                <Box sx={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    mb: isMobile ? 1.5 : 3,
                    gap: 1.5
                }}>
                    <Typography variant={isMobile ? "subtitle2" : "h6"} sx={{ fontWeight: 800 }}>Feedback Analysis</Typography>
                    <Box sx={{ display: 'flex', width: isMobile ? '100%' : 'auto', gap: 1 }}>
                        <Button
                            variant={feedbackView === 'summary' ? "contained" : "outlined"}
                            onClick={() => setFeedbackView('summary')}
                            size="small"
                            sx={{ flex: 1, borderRadius: 2, textTransform: 'none' }}
                        >
                            Summary
                        </Button>
                        <Button
                            variant={feedbackView === 'item-wise' ? "contained" : "outlined"}
                            onClick={() => setFeedbackView('item-wise')}
                            size="small"
                            sx={{ flex: 1, borderRadius: 2, textTransform: 'none' }}
                        >
                            Items
                        </Button>
                    </Box>
                </Box>

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
                    <Box>
                        {/* Mobile Card View */}
                        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                            {feedbackData.length > 0 ? (
                                feedbackData
                                    .slice(feedbackPage * feedbackRowsPerPage, feedbackPage * feedbackRowsPerPage + feedbackRowsPerPage)
                                    .map((fb: any) => (
                                        <Paper key={fb._id} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'flex-start' }}>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#374151', fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1rem' } }}>
                                                        {fb.orderNumber}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                                                        {new Date(fb.createdAt).toLocaleDateString()}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" color="text.secondary">Customer:</Typography>
                                                <Typography variant="body2" fontWeight={600}>{fb.customerName}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" color="text.secondary">Service:</Typography>
                                                <Chip
                                                    label={fb.serviceRating}
                                                    color={fb.serviceRating >= 4 ? 'success' : fb.serviceRating >= 3 ? 'warning' : 'error'}
                                                    size="small"
                                                />
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" color="text.secondary">Ambiance:</Typography>
                                                <Chip
                                                    label={fb.ambianceRating}
                                                    color={fb.ambianceRating >= 4 ? 'success' : fb.ambianceRating >= 3 ? 'warning' : 'error'}
                                                    size="small"
                                                />
                                            </Box>
                                            {fb.itemRatings && fb.itemRatings.length > 0 && (
                                                <Box sx={{ mb: 1 }}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Item Ratings:</Typography>
                                                    <Box sx={{ pl: 1 }}>
                                                        {fb.itemRatings.map((item: any) => (
                                                            <Typography variant="caption" display="block" key={item.menuItem} color="text.secondary">
                                                                {item.name}: {item.tasteRating} (Taste), {item.quantityRating} (Qty)
                                                            </Typography>
                                                        ))}
                                                    </Box>
                                                </Box>
                                            )}
                                            {fb.suggestions && (
                                                <Box sx={{ pt: 1, borderTop: '1px solid #f0f0f0' }}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Suggestions:</Typography>
                                                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                                        {fb.suggestions}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Paper>
                                    ))
                            ) : (
                                <Paper sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">No feedback found</Typography>
                                </Paper>
                            )}
                        </Box>

                        {/* Desktop Table View */}
                        <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' } }}>
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
                                    {feedbackData
                                        .slice(feedbackPage * feedbackRowsPerPage, feedbackPage * feedbackRowsPerPage + feedbackRowsPerPage)
                                        .map((fb: any) => (
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
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            component="div"
                            count={feedbackData.length}
                            rowsPerPage={feedbackRowsPerPage}
                            page={feedbackPage}
                            onPageChange={(_, newPage) => setFeedbackPage(newPage)}
                            onRowsPerPageChange={(e) => {
                                setFeedbackRowsPerPage(parseInt(e.target.value, 10));
                                setFeedbackPage(0);
                            }}
                        />
                    </Box>
                ) : (
                    <>
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
                                    {itemWiseReport
                                        .slice(itemFeedbackPage * itemFeedbackRowsPerPage, itemFeedbackPage * itemFeedbackRowsPerPage + itemFeedbackRowsPerPage)
                                        .map((item: any) => {
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
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            component="div"
                            count={itemWiseReport.length}
                            rowsPerPage={itemFeedbackRowsPerPage}
                            page={itemFeedbackPage}
                            onPageChange={(_, newPage) => setItemFeedbackPage(newPage)}
                            onRowsPerPageChange={(e) => {
                                setItemFeedbackRowsPerPage(parseInt(e.target.value, 10));
                                setItemFeedbackPage(0);
                            }}
                        />
                    </>
                )}
            </Paper>
        );
    };

    const renderDeliveryReport = () => {
        const summary = deliveryReport?.summary;
        const orders: any[] = deliveryReport?.orders || [];
        const paged = orders.slice(
            deliveryReportPage * deliveryReportRowsPerPage,
            deliveryReportPage * deliveryReportRowsPerPage + deliveryReportRowsPerPage,
        );

        const providerColor = (p: string) => {
            if (p === 'doordash') return '#ef4444';
            if (p === 'ubereats') return '#22c55e';
            return '#6b7280';
        };

        const providerLabel = (p: string) => {
            if (p === 'doordash') return 'DoorDash';
            if (p === 'ubereats') return 'Uber Eats';
            return p;
        };

        return (
            <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: isMobile ? 1.5 : 3 }}>
                    <Typography variant={isMobile ? "body2" : "h6"} fontWeight="bold">Delivery Reports</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: isMobile ? 0 : 150, display: isMobile ? 'none' : 'block' }}>
                            <InputLabel>Provider</InputLabel>
                            <Select
                                value={deliveryProviderFilter}
                                label="Provider"
                                onChange={(e) => {
                                    setDeliveryProviderFilter(e.target.value);
                                    fetchDeliveryReport({ period, startDate, endDate, provider: e.target.value });
                                }}
                            >
                                <MenuItem value="all">All Providers</MenuItem>
                                <MenuItem value="doordash">DoorDash</MenuItem>
                                <MenuItem value="ubereats">Uber Eats</MenuItem>
                            </Select>
                        </FormControl>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DownloadIcon sx={{ fontSize: isMobile ? '14px !important' : 'inherit' }} />}
                            onClick={() => downloadExcel('delivery-report')}
                            sx={{ borderRadius: 2, height: 28, px: 1, textTransform: 'none', fontSize: isMobile ? '0.65rem' : 'inherit' }}
                        >
                            {isMobile ? 'Export' : 'Export'}
                        </Button>
                    </Stack>
                </Stack>

                {/* Summary Cards */}
                <Grid container spacing={isMobile ? 1 : 2} sx={{ mb: isMobile ? 1.5 : 3 }}>
                    {[
                        { label: 'Total Orders', value: summary?.totalOrders ?? 0, isCurrency: false, icon: <ShoppingCartIcon />, color: '#6366f1' },
                        { label: 'DoorDash Orders', value: summary?.doordashOrders ?? 0, isCurrency: false, icon: <LocalShippingIcon />, color: '#ef4444' },
                        { label: 'Uber Eats Orders', value: summary?.uberEatsOrders ?? 0, isCurrency: false, icon: <TwoWheelerIcon />, color: '#22c55e' },
                        { label: 'Total Revenue', value: summary?.totalRevenue ?? 0, isCurrency: true, icon: <TrendingUpIcon />, color: '#3b82f6' },
                        { label: 'Delivery Charges', value: summary?.totalDeliveryCharges ?? 0, isCurrency: true, icon: <RequestQuoteIcon />, color: '#f59e0b' },
                        { label: 'Total Tips', value: summary?.totalTips ?? 0, isCurrency: true, icon: <SavingsIcon />, color: '#06b6d4' },
                        { label: 'Total Tax', value: summary?.totalTax ?? 0, isCurrency: true, icon: <AccountBalanceIcon />, color: '#8b5cf6' },
                        { label: 'Processing Fees', value: summary?.totalProcessingFee ?? 0, isCurrency: true, icon: <ReceiptIcon />, color: '#ec4899' },
                    ].map((card) => (
                        <Grid item xs={6} sm={3} md={3} lg={3} key={card.label}>
                            <Card variant="outlined" sx={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, borderColor: alpha(card.color, 0.3), bgcolor: alpha(card.color, 0.04) }}>
                                <CardContent sx={{ p: '12px !important', textAlign: 'center', width: '100%' }}>
                                    <Box sx={{ color: card.color, mb: 0.5, display: 'flex', justifyContent: 'center', '& svg': { fontSize: 28 } }}>
                                        {card.icon}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2, mb: 0.5 }}>
                                        {card.label}
                                    </Typography>
                                    <Typography variant="h6" fontWeight="bold" sx={{ color: card.color, lineHeight: 1 }}>
                                        {card.isCurrency ? formatCurrency(card.value) : card.value}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* Orders Table */}
                <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                    {paged.map((order: any, idx: number) => (
                        <Paper key={order.orderNumber || idx} elevation={0} sx={{
                            p: 1.5,
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)"
                        }}>
                            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography variant="caption" fontWeight={800} sx={{ display: 'block' }}>ORD#{order.orderNumber}</Typography>
                                <Chip label={providerLabel(order.provider)} size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: providerColor(order.provider), color: '#fff', fontWeight: 'bold' }} />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>{order.customerName || 'Guest'}</Typography>
                                <Typography variant="caption" fontWeight={800} color="primary.main">{formatCurrency(order.totalAmount)}</Typography>
                            </Box>
                            <Box sx={{ mt: 1, pt: 0.5, borderTop: "1px dashed #e5e7eb", display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>Status:
                                    <span style={{ color: order.status === 'delivered' ? 'green' : 'inherit', marginLeft: 4 }}>
                                        {order.status}
                                    </span>
                                </Typography>
                            </Box>
                        </Paper>
                    ))}
                    {orders.length === 0 && (
                        <Typography sx={{ textAlign: 'center', py: 2, color: 'text.secondary', gridColumn: "1 / span 2" }}>No orders found</Typography>
                    )}
                </Box>
                <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell><strong>Order #</strong></TableCell>
                                <TableCell><strong>Date</strong></TableCell>
                                <TableCell><strong>Provider</strong></TableCell>
                                <TableCell><strong>Customer</strong></TableCell>
                                <TableCell><strong>Delivery Address</strong></TableCell>
                                <TableCell align="right"><strong>Subtotal</strong></TableCell>
                                <TableCell align="right"><strong>Delivery Charge</strong></TableCell>
                                <TableCell align="right"><strong>Tip</strong></TableCell>
                                <TableCell align="right"><strong>Tax</strong></TableCell>
                                <TableCell align="right"><strong>Processing Fee</strong></TableCell>
                                <TableCell align="right"><strong>Total</strong></TableCell>
                                <TableCell><strong>Payment</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell><strong>Tracking</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paged.map((order: any, idx: number) => (
                                <TableRow key={order.orderNumber || idx} hover>
                                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                        {order.orderNumber}
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {order.date ? new Date(order.date).toLocaleDateString() : '-'}
                                        <Typography variant="caption" display="block" color="text.secondary">
                                            {order.date ? new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={providerLabel(order.provider)}
                                            size="small"
                                            sx={{ bgcolor: providerColor(order.provider), color: '#fff', fontWeight: 'bold' }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{order.customerName}</Typography>
                                        {order.customerPhone && (
                                            <Typography variant="caption" color="text.secondary">{order.customerPhone}</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 160 }}>
                                        <Typography variant="caption">{order.deliveryAddress || '-'}</Typography>
                                    </TableCell>
                                    <TableCell align="right">{formatCurrency(order.subtotal)}</TableCell>
                                    <TableCell align="right">{formatCurrency(order.deliveryCharge)}</TableCell>
                                    <TableCell align="right">{formatCurrency(order.tip)}</TableCell>
                                    <TableCell align="right">{formatCurrency(order.tax)}</TableCell>
                                    <TableCell align="right">{formatCurrency(order.processingFee)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(order.totalAmount)}</TableCell>
                                    <TableCell>
                                        <Stack spacing={0.5}>
                                            <Chip label={order.paymentMethod} size="small" variant="outlined" />
                                            <Chip
                                                label={order.paymentStatus}
                                                size="small"
                                                color={order.paymentStatus === 'paid' || order.paymentStatus === 'completed' ? 'success' : 'default'}
                                            />
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={order.status}
                                            size="small"
                                            color={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : 'warning'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {(order.trackingUrl) ? (
                                            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                                                Track
                                            </a>
                                        ) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {orders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={13} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No delivery orders found for the selected period
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={orders.length}
                    page={deliveryReportPage}
                    onPageChange={(_, p) => setDeliveryReportPage(p)}
                    rowsPerPage={deliveryReportRowsPerPage}
                    onRowsPerPageChange={(e) => { setDeliveryReportRowsPerPage(parseInt(e.target.value, 10)); setDeliveryReportPage(0); }}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            </Paper>
        );
    };

    const renderCateringReport = () => {
        return (
            <Paper sx={{ p: isMobile ? 1.5 : 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: isMobile ? 1.5 : 3 }}>
                    <Typography variant={isMobile ? "body2" : "h6"} fontWeight="bold">Catering Reports</Typography>
                </Stack>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell><strong>Order #</strong></TableCell>
                                <TableCell><strong>Required Date</strong></TableCell>
                                <TableCell><strong>Customer</strong></TableCell>
                                <TableCell><strong>Occasion</strong></TableCell>
                                <TableCell><strong>Service</strong></TableCell>
                                <TableCell align="right"><strong>Guests</strong></TableCell>
                                <TableCell align="right"><strong>Total Amount</strong></TableCell>
                                <TableCell><strong>Payment</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell align="center"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {cateringData
                                .slice(cateringPage * cateringRowsPerPage, cateringPage * cateringRowsPerPage + cateringRowsPerPage)
                                .map((order: any) => (
                                    <TableRow key={order._id} hover>
                                        <TableCell sx={{ fontWeight: 'bold' }}>{order.orderNumber}</TableCell>
                                        <TableCell>
                                            {new Date(order.requiredDate).toLocaleDateString()}
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                {new Date(order.requiredDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{order.customerName}</Typography>
                                            <Typography variant="caption" color="text.secondary">{order.customerPhone}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{order.occasion}</Typography>
                                            {order.occasionPersonName && (
                                                <Typography variant="caption" color="text.secondary">For: {order.occasionPersonName}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={order.serviceType?.replace('_', ' ')} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell align="right">
                                            {((order.guests?.adults?.veg || 0) + (order.guests?.adults?.nonVeg || 0) + (order.guests?.kids?.veg || 0) + (order.guests?.kids?.nonVeg || 0)) || '-'}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(order.totalAmount)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={order.paymentStatus || 'pending'}
                                                size="small"
                                                color={order.paymentStatus === 'paid' ? 'success' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={order.status}
                                                size="small"
                                                color={order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'error' : 'warning'}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                <MuiTooltip title="Preview Invoice">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                            setSelectedCateringOrder(order);
                                                            setCateringTab(0);
                                                            setPreviewOpen(true);
                                                        }}
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </MuiTooltip>
                                                <MuiTooltip title="Download Invoice">
                                                    <IconButton
                                                        size="small"
                                                        onClick={async () => {
                                                            try {
                                                                const res = await cateringAPI.downloadPDF(order._id);
                                                                const url = window.URL.createObjectURL(new Blob([res.data]));
                                                                const link = document.createElement('a');
                                                                link.href = url;
                                                                link.setAttribute('download', `invoice-${order.orderNumber}.pdf`);
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                link.remove();
                                                            } catch (err) {
                                                                toast.error('Failed to download invoice');
                                                            }
                                                        }}
                                                    >
                                                        <DownloadIcon fontSize="small" />
                                                    </IconButton>
                                                </MuiTooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            {cateringData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No catering orders found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={cateringTotalCount}
                    page={cateringPage}
                    onPageChange={(_, p) => setCateringPage(p)}
                    rowsPerPage={cateringRowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setCateringRowsPerPage(parseInt(e.target.value, 10));
                        setCateringPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            </Paper>
        );
    };

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 1.5, sm: 3, md: 4 }, px: { xs: 1.5, sm: 2, md: 3 } }}>
            <Typography variant={isMobile ? "h5" : "h4"} gutterBottom sx={{
                textAlign: { xs: 'center', sm: 'left' },
                fontWeight: 900,
                mt: { xs: 1, sm: 0 },
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                letterSpacing: '-0.04em'
            }}>
                Reports & Analytics
            </Typography>

            {/* Filters — sticky just below the fixed AppBar */}
            <Paper sx={{
                p: { xs: 1.5, sm: 2 },
                mb: { xs: 1.5, sm: 2 },
                position: 'sticky',
                top: isMobile ? 0 : 64,
                zIndex: 100,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                borderRadius: { xs: 0, sm: 2 },
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.05)
            }}>
                <Grid container spacing={isMobile ? 1 : 2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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
                                    size={isMobile ? "small" : "medium"}
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
                                    size={isMobile ? "small" : "medium"}
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
                            size={isMobile ? "small" : "medium"}
                            startIcon={<DownloadIcon />}
                            onClick={() => downloadExcel('comprehensive')}
                            sx={{ borderRadius: 2 }}
                        >
                            Export All
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabs — sticky below filter bar */}
            <Paper sx={{
                mb: { xs: 2, sm: 3 },
                position: 'sticky',
                top: isMobile ? 48 : 136,
                zIndex: 99,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                borderRadius: { xs: 0, sm: 2 },
                overflow: 'hidden',
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.05)
            }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ minHeight: isMobile ? 40 : 48 }}
                >
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
                    {/* <Tab label="Customer Analytics" /> */}
                    <Tab label="Customer Analytics" disabled sx={{ display: 'none' }} />
                    <Tab label="Inventory Stock" />
                    <Tab label="Coupon Analytics" />
                    <Tab label="Table Performance" />
                    <Tab label="Feedback" />
                    <Tab label="Tips Report" />
                    <Tab label="Promo Summary" />
                    <Tab label="Promo Redemptions" />
                    <Tab label="Promo Compensation" />
                    <Tab label="Delivery Report" />
                    <Tab label="Catering Reports" />
                </Tabs>
            </Paper>

            {/* Content — minHeight prevents layout shift when switching tabs */}
            <Box sx={{ minHeight: 600 }}>
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
                        {/* {activeTab === 11 && renderCustomerAnalytics()} */}
                        {activeTab === 12 && renderInventoryStock()}
                        {activeTab === 13 && renderCouponAnalytics()}
                        {activeTab === 14 && renderTableStats()}
                        {activeTab === 15 && renderCustomerFeedback()}
                        {activeTab === 16 && renderTipsReport()}
                        {activeTab === 17 && renderPromoSummary()}
                        {activeTab === 18 && renderPromoRedemptions()}
                        {activeTab === 19 && renderPromoCompensation()}
                        {activeTab === 20 && renderDeliveryReport()}
                        {activeTab === 21 && renderCateringReport()}
                    </>
                )}
            </Box>

            <Dialog
                open={previewOpen}
                onClose={() => {
                    setPreviewOpen(false);
                    setSelectedCateringOrder(null);
                }}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3, overflow: 'hidden' }
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: 'background.paper',
                    px: 3,
                    py: 2
                }}>
                    <Typography variant="h6" fontWeight="800">Order Details</Typography>
                    <IconButton
                        onClick={() => { setPreviewOpen(false); setSelectedCateringOrder(null); }}
                        size="small"
                        sx={{
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            color: 'error.main',
                            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) }
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    {selectedCateringOrder && (
                        <Box sx={{ width: '100%' }}>
                            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
                                <Tabs
                                    value={cateringTab}
                                    onChange={(e, v) => setCateringTab(v)}
                                    sx={{
                                        '& .MuiTab-root': {
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            minHeight: 48,
                                            fontSize: '0.9rem'
                                        }
                                    }}
                                >
                                    <Tab label="Order Details" />
                                    <Tab label="Action History" />
                                </Tabs>
                            </Box>

                            <Box sx={{ p: 3 }}>
                                {cateringTab === 0 ? (
                                    <Box>
                                        <Grid container spacing={4}>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight="700" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>Customer Info</Typography>
                                                <Typography variant="body1" fontWeight="600">{selectedCateringOrder.customerName}</Typography>
                                                <Typography variant="body2" color="text.secondary">{selectedCateringOrder.customerPhone}</Typography>
                                                <Typography variant="body2" color="text.secondary">{selectedCateringOrder.customerEmail || 'No email provided'}</Typography>
                                                {selectedCateringOrder.occasionDate && (
                                                    <Box sx={{ mt: 1.5 }}>
                                                        <Typography variant="caption" color="text.secondary" display="block">Occasion Date</Typography>
                                                        <Typography variant="body2" fontWeight="600">{new Date(selectedCateringOrder.occasionDate).toLocaleDateString()}</Typography>
                                                    </Box>
                                                )}
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="700" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>Order Info</Typography>
                                                <Stack spacing={1}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography variant="body2" color="text.secondary">Order #:</Typography>
                                                        <Typography variant="body2" fontWeight="600">{selectedCateringOrder.orderNumber}</Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography variant="body2" color="text.secondary">Service:</Typography>
                                                        <Typography variant="body2" fontWeight="600">{selectedCateringOrder.serviceType?.replace('_', ' ')}</Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography variant="body2" color="text.secondary">Occasion:</Typography>
                                                        <Typography variant="body2" fontWeight="600">{selectedCateringOrder.occasion || 'N/A'}</Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography variant="body2" color="text.secondary">Date:</Typography>
                                                        <Typography variant="body2" fontWeight="600">{new Date(selectedCateringOrder.requiredDate).toLocaleString()}</Typography>
                                                    </Box>
                                                    <Box sx={{ mt: 1 }}>
                                                        <Chip
                                                            label={selectedCateringOrder.status?.toUpperCase()}
                                                            size="small"
                                                            color={selectedCateringOrder.status === 'completed' ? 'success' : 'warning'}
                                                            sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                                                        />
                                                    </Box>
                                                </Stack>
                                            </Grid>

                                            <Grid item xs={12}>
                                                <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="700" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem', mt: 1 }}>Guest Requirements</Typography>
                                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.01) }}>
                                                    <Table size="small">
                                                        <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                                            <TableRow>
                                                                <TableCell sx={{ fontWeight: 'bold' }}>Guests</TableCell>
                                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Veg</TableCell>
                                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Non-Veg</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            <TableRow>
                                                                <TableCell>Adults</TableCell>
                                                                <TableCell align="center">{selectedCateringOrder.guests?.adults?.veg || 0}</TableCell>
                                                                <TableCell align="center">{selectedCateringOrder.guests?.adults?.nonVeg || 0}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell>Kids</TableCell>
                                                                <TableCell align="center">{selectedCateringOrder.guests?.kids?.veg || 0}</TableCell>
                                                                <TableCell align="center">{selectedCateringOrder.guests?.kids?.nonVeg || 0}</TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Grid>

                                            <Grid item xs={12}>
                                                <Typography variant="h6" fontWeight="800" sx={{ mt: 2, mb: 1 }}>Items</Typography>
                                                <List sx={{ p: 0, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                                                    {selectedCateringOrder.items?.map((item: any, i: number) => (
                                                        <ListItem
                                                            key={i}
                                                            divider={i < selectedCateringOrder.items.length - 1}
                                                            sx={{ py: 1.5, px: 2 }}
                                                        >
                                                            <ListItemText
                                                                primary={<Typography variant="body2" fontWeight="700">{item.name}</Typography>}
                                                                secondary={
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {formatCurrency(item.unitPrice)} x {item.quantity}
                                                                    </Typography>
                                                                }
                                                            />
                                                            <Typography variant="body2" fontWeight="800">{formatCurrency(item.total)}</Typography>
                                                        </ListItem>
                                                    ))}
                                                </List>
                                            </Grid>

                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight="700">Payment Details</Typography>
                                                {selectedCateringOrder.payments && selectedCateringOrder.payments.length > 0 ? (
                                                    <Stack spacing={1}>
                                                        {selectedCateringOrder.payments.map((p: any, idx: number) => (
                                                            <Typography key={idx} variant="body2">
                                                                <strong>{formatCurrency(p.amount)}</strong> via {p.method?.toUpperCase()}
                                                            </Typography>
                                                        ))}
                                                    </Stack>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">No payments recorded</Typography>
                                                )}

                                                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }} fontWeight="700">Additional Services</Typography>
                                                <Typography variant="body2">{selectedCateringOrder.additionalServices || 'None'}</Typography>

                                                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }} fontWeight="700">Processing Person</Typography>
                                                <Typography variant="body2">{selectedCateringOrder.processingPerson || 'N/A'}</Typography>
                                            </Grid>

                                            <Grid item xs={12} sm={6}>
                                                <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02), p: 2, borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.05) }}>
                                                    <Stack spacing={1}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                                                            <Typography variant="body2">{formatCurrency(selectedCateringOrder.subtotal || 0)}</Typography>
                                                        </Box>
                                                        {selectedCateringOrder.discount?.value > 0 && (
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                                                                <Typography variant="body2">Discount ({selectedCateringOrder.discount.type === 'percentage' ? `${selectedCateringOrder.discount.value}%` : 'Fixed'}):</Typography>
                                                                <Typography variant="body2">-{formatCurrency(selectedCateringOrder.discount.type === 'percentage' ? (selectedCateringOrder.subtotal * selectedCateringOrder.discount.value / 100) : selectedCateringOrder.discount.value)}</Typography>
                                                            </Box>
                                                        )}
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Typography variant="body2" color="text.secondary">Tax ({selectedCateringOrder.tax?.rate || 0}%):</Typography>
                                                            <Typography variant="body2">{formatCurrency(selectedCateringOrder.tax?.amount || 0)}</Typography>
                                                        </Box>
                                                        <Divider sx={{ my: 1 }} />
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Typography variant="subtitle1" fontWeight="800">Total:</Typography>
                                                            <Typography variant="subtitle1" fontWeight="800">{formatCurrency(selectedCateringOrder.totalAmount)}</Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                                                            <Typography variant="body2" fontWeight="600">Advance Paid:</Typography>
                                                            <Typography variant="body2" fontWeight="600">{formatCurrency(selectedCateringOrder.advanceReceived || 0)}</Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main', mt: 1 }}>
                                                            <Typography variant="h6" fontWeight="900">Balance Due:</Typography>
                                                            <Typography variant="h6" fontWeight="900">{formatCurrency(Math.max(0, selectedCateringOrder.totalAmount - (selectedCateringOrder.advanceReceived || 0)))}</Typography>
                                                        </Box>
                                                    </Stack>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                ) : (
                                    <Box sx={{ py: 2 }}>
                                        <ActionHistoryList
                                            history={selectedCateringOrder.actionHistory || []}
                                            emptyMessage="No action history recorded for this catering order."
                                        />
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5, bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                size="small"
                                onClick={async () => {
                                    try {
                                        const res = await cateringAPI.downloadPDF(selectedCateringOrder._id);
                                        const url = window.URL.createObjectURL(new Blob([res.data]));
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.setAttribute('download', `invoice-${selectedCateringOrder.orderNumber}.pdf`);
                                        document.body.appendChild(link);
                                        link.click();
                                        link.remove();
                                    } catch (err) {
                                        toast.error('Failed to download invoice');
                                    }
                                }}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                            >
                                Download Invoice
                            </Button>
                            <Button
                                variant="outlined"
                                color="secondary"
                                startIcon={<EmailIcon />}
                                size="small"
                                onClick={async () => {
                                    try {
                                        await cateringAPI.sendEmail(selectedCateringOrder._id);
                                        toast.success('Email sent successfully');
                                    } catch (err) {
                                        toast.error('Failed to send email');
                                    }
                                }}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                            >
                                Email Receipt
                            </Button>
                        </Box>
                        <Button
                            variant="contained"
                            onClick={() => { setPreviewOpen(false); setSelectedCateringOrder(null); }}
                            sx={{ borderRadius: 2, px: 4, bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
                        >
                            Close
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default ReportsPage;
