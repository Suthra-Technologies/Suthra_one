import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Stack,
    Select,
    MenuItem,
    FormControl,
    TextField,
    Button,
    IconButton,
    Checkbox,
    InputAdornment,
    Pagination,
    Menu,
    Collapse,
    Avatar,
} from '@mui/material';
import {
    Download as DownloadIcon,
    ShoppingCart as ShoppingCartIcon,
    LocalShipping as LocalShippingIcon,
    TwoWheeler as TwoWheelerIcon,
    TrendingUp as TrendingUpIcon,
    RequestQuote as RequestQuoteIcon,
    Savings as SavingsIcon,
    AccountBalance as AccountBalanceIcon,
    Receipt as ReceiptIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    MoreVert as MoreIcon,
    KeyboardArrowDown as ArrowDownIcon,
    CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { TableSkeleton } from '../../components/common/PageSkeleton';
import { superAPI } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5006';

const DS = {
    pageBg: '#F8F9FA',
    text: '#0F172A',
    muted: '#6B7280',
    border: '#E5E7EB',
    orange: '#F97316',
    orangeHover: '#EA580C',
    green: '#16A34A',
    greenSoft: '#DCFCE7',
    greenText: '#15803D',
    red: '#EF4444',
    redSoft: '#FEE2E2',
    redText: '#B91C1C',
    orangeSoft: '#FFEDD5',
    orangeText: '#C2410C',
    font: "'Inter', 'Plus Jakarta Sans', sans-serif",
    heading: "'Plus Jakarta Sans', 'Inter', sans-serif",
    shadow: '0 1px 2px rgba(15,23,42,0.04), 0 10px 28px rgba(15,23,42,0.05)',
};

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

const providerColor = (p: string) => {
    if (p === 'doordash') return '#EF4444';
    if (p === 'ubereats') return '#22C55E';
    return '#6B7280';
};

const providerLabel = (p: string) => {
    if (p === 'doordash') return 'DoorDash';
    if (p === 'ubereats') return 'Uber Eats';
    return p || 'Unknown';
};

const MiniSpark: React.FC<{ color: string; values?: number[] }> = ({
    color,
    values = [3, 5, 4, 7, 6, 8, 7],
}) => {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = Math.max(max - min, 1);
    const w = 64;
    const h = 28;
    const d = values
        .map((v, i) => {
            const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * w;
            const y = h - ((v - min) / span) * (h - 4) - 2;
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ');
    return (
        <Box component="svg" viewBox={`0 0 ${w} ${h}`} sx={{ width: 64, height: 28, display: 'block', flexShrink: 0 }}>
            <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Box>
    );
};

const statusStyle = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered' || s === 'completed') return { bg: DS.greenSoft, color: DS.greenText };
    if (s === 'cancelled' || s === 'canceled' || s === 'failed') return { bg: DS.redSoft, color: DS.redText };
    return { bg: DS.orangeSoft, color: DS.orangeText };
};

const storeInitials = (name?: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const DeliveryReportsPage: React.FC = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('jwt');
    const headers = { Authorization: `Bearer ${token}` };

    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState('thisMonth');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [provider, setProvider] = useState('all');
    const [storeSlug, setStoreSlug] = useState('');
    const [stores, setStores] = useState<{ slug: string; name: string }[]>([]);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [data, setData] = useState<any>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selected, setSelected] = useState<string[]>([]);
    const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [menuOrder, setMenuOrder] = useState<any | null>(null);

    useEffect(() => {
        const t = window.setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(0);
        }, 350);
        return () => window.clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        superAPI
            .listTenants({ status: 'active', limit: 500 })
            .then((res) => {
                const list = (res.data?.tenants || []).map((t: any) => ({
                    slug: t.slug,
                    name: t.name,
                }));
                setStores(list);
            })
            .catch(() => {});
    }, []);

    const fetchReport = useCallback(
        async (overrides: any = {}) => {
            setLoading(true);
            try {
                const params: any = {
                    period: overrides.period ?? period,
                    provider: overrides.provider ?? provider,
                    page: overrides.page ?? page + 1,
                    limit: overrides.rowsPerPage ?? rowsPerPage,
                };
                const slug = overrides.storeSlug ?? storeSlug;
                const q = overrides.search ?? search;
                if (slug) params.storeSlug = slug;
                if (q) params.search = q;
                if ((overrides.period ?? period) === 'custom') {
                    params.startDate = overrides.startDate ?? startDate;
                    params.endDate = overrides.endDate ?? endDate;
                }
                const res = await axios.get(`${API_URL}/api/superadmin/delivery-reports`, { params, headers });
                setData(res.data);
                setSelected([]);
                if (Array.isArray(res.data?.stores) && res.data.stores.length && !stores.length) {
                    setStores(res.data.stores);
                }
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Failed to load delivery reports');
            } finally {
                setLoading(false);
            }
        },
        [period, provider, page, rowsPerPage, startDate, endDate, storeSlug, search, stores.length],
    );

    useEffect(() => {
        fetchReport();
    }, [period, provider, page, rowsPerPage, storeSlug, search]);

    const handleExport = () => {
        if (!data?.orders?.length) {
            toast.error('No data to export');
            return;
        }
        const rows = (data?.orders || []).map((o: any) => ({
            Store: o.storeName,
            'Order #': o.orderNumber,
            Date: o.date ? new Date(o.date).toLocaleString() : '',
            Provider: providerLabel(o.provider),
            Customer: o.customerName,
            'Delivery Address': o.deliveryAddress,
            Subtotal: o.subtotal,
            'Delivery Charge': o.deliveryCharge,
            Tip: o.tip,
            Tax: o.tax,
            'Processing Fee': o.processingFee,
            Total: o.totalAmount,
            'Payment Method': o.paymentMethod,
            'Payment Status': o.paymentStatus,
            'Order Status': o.status,
            'Tracking URL': o.trackingUrl || '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Delivery Reports');
        XLSX.writeFile(wb, `delivery-reports-${period}-${Date.now()}.xlsx`);
        setExportAnchor(null);
        toast.success('Excel exported');
    };

    const handleReset = () => {
        setPeriod('thisMonth');
        setProvider('all');
        setStoreSlug('');
        setSearchInput('');
        setSearch('');
        setStartDate('');
        setEndDate('');
        setPage(0);
        setFiltersOpen(false);
    };

    const summary = data?.summary;
    const orders: any[] = data?.orders || [];
    const total = data?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
    const showingFrom = total === 0 ? 0 : page * rowsPerPage + 1;
    const showingTo = Math.min((page + 1) * rowsPerPage, total);

    const summaryCards = useMemo(
        () => [
            {
                label: 'Total Orders',
                value: summary?.totalOrders ?? 0,
                isCurrency: false,
                icon: <ShoppingCartIcon />,
                color: '#7C3AED',
                soft: '#F3E8FF',
                trend: 12,
                spark: [2, 4, 3, 6, 5, 8, 7],
            },
            {
                label: 'DoorDash Orders',
                value: summary?.doordashOrders ?? 0,
                isCurrency: false,
                icon: <LocalShippingIcon />,
                color: '#EF4444',
                soft: '#FEE2E2',
                trend: 8,
                spark: [3, 5, 4, 6, 5, 7, 8],
            },
            {
                label: 'Uber Eats Orders',
                value: summary?.uberEatsOrders ?? 0,
                isCurrency: false,
                icon: <TwoWheelerIcon />,
                color: '#22C55E',
                soft: '#DCFCE7',
                trend: 18,
                spark: [2, 3, 5, 4, 7, 6, 9],
            },
            {
                label: 'Total Revenue',
                value: summary?.totalRevenue ?? 0,
                isCurrency: true,
                icon: <TrendingUpIcon />,
                color: '#3B82F6',
                soft: '#DBEAFE',
                trend: 20,
                spark: [4, 5, 4, 7, 6, 8, 9],
            },
            {
                label: 'Delivery Charges',
                value: summary?.totalDeliveryCharges ?? 0,
                isCurrency: true,
                icon: <RequestQuoteIcon />,
                color: '#F59E0B',
                soft: '#FEF3C7',
                trend: 10,
                spark: [3, 4, 5, 4, 6, 5, 7],
            },
            {
                label: 'Total Tips',
                value: summary?.totalTips ?? 0,
                isCurrency: true,
                icon: <SavingsIcon />,
                color: '#06B6D4',
                soft: '#CFFAFE',
                trend: 6,
                spark: [2, 3, 3, 4, 5, 4, 6],
            },
            {
                label: 'Total Tax',
                value: summary?.totalTax ?? 0,
                isCurrency: true,
                icon: <AccountBalanceIcon />,
                color: '#6366F1',
                soft: '#E0E7FF',
                trend: 5,
                spark: [3, 3, 4, 4, 5, 5, 6],
            },
            {
                label: 'Processing Fees',
                value: summary?.totalProcessingFee ?? 0,
                isCurrency: true,
                icon: <ReceiptIcon />,
                color: '#EC4899',
                soft: '#FCE7F3',
                trend: 7,
                spark: [2, 4, 3, 5, 4, 6, 5],
            },
        ],
        [summary],
    );

    const tabs = [
        { key: 'all', label: 'All Orders', count: summary?.totalOrders ?? total },
        { key: 'doordash', label: 'DoorDash', count: summary?.doordashOrders ?? 0 },
        { key: 'ubereats', label: 'Uber Eats', count: summary?.uberEatsOrders ?? 0 },
    ];

    const orderKey = (o: any, idx: number) => `${o.storeSlug}-${o.orderNumber}-${idx}`;

    const toggleSelectAll = () => {
        if (selected.length === orders.length) setSelected([]);
        else setSelected(orders.map((o, i) => orderKey(o, i)));
    };

    const selectSx = {
        height: 42,
        borderRadius: '10px',
        bgcolor: '#fff',
        fontFamily: DS.font,
        fontSize: '13.5px',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: DS.border },
    };

    return (
        <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 4, pt: { xs: 1, sm: 2.5 }, bgcolor: DS.pageBg, minHeight: '100%', fontFamily: DS.font }}>
            {/* Breadcrumb */}
            <Typography sx={{ fontSize: '12.5px', color: DS.muted, mb: 1 }}>
                <Box component="span" onClick={() => navigate('/superadmin')} sx={{ cursor: 'pointer', '&:hover': { color: DS.orange } }}>
                    Home
                </Box>
                {' > '}
                <Box component="span" sx={{ color: DS.text, fontWeight: 600 }}>Delivery Reports</Box>
            </Typography>

            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'stretch', sm: 'flex-start' },
                    gap: 2,
                    mb: 2.5,
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
                        Delivery Reports
                    </Typography>
                    <Typography sx={{ mt: 0.6, color: DS.muted, fontSize: '13.5px' }}>
                        All DoorDash & Uber Eats deliveries across all stores
                    </Typography>
                </Box>
                <Button
                    endIcon={<ArrowDownIcon />}
                    startIcon={<DownloadIcon />}
                    onClick={(e) => setExportAnchor(e.currentTarget)}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '13.5px',
                        borderRadius: '10px',
                        border: `1px solid ${DS.border}`,
                        color: DS.text,
                        bgcolor: '#fff',
                        px: 2,
                        '&:hover': { bgcolor: '#F9FAFB' },
                    }}
                >
                    Export Excel
                </Button>
                <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
                    <MenuItem onClick={handleExport}>Download current page (.xlsx)</MenuItem>
                </Menu>
            </Box>

            {/* Global filters */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 2.5,
                    borderRadius: '14px',
                    bgcolor: '#F3F4F6',
                    border: `1px solid ${DS.border}`,
                }}
            >
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: '1fr 1fr',
                            md: period === 'custom' ? '1.2fr 1fr 1fr 1fr 1fr auto' : '1.2fr 1fr 1fr auto',
                        },
                        gap: 1.5,
                        alignItems: 'end',
                    }}
                >
                    <Box>
                        <Typography sx={{ fontSize: '11.5px', color: DS.muted, fontWeight: 600, mb: 0.6 }}>Time Period</Typography>
                        <FormControl fullWidth size="small">
                            <Select
                                value={period}
                                onChange={(e) => {
                                    setPeriod(e.target.value);
                                    setPage(0);
                                }}
                                sx={selectSx}
                                startAdornment={
                                    <InputAdornment position="start">
                                        <CalendarIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />
                                    </InputAdornment>
                                }
                            >
                                <MenuItem value="today">Today</MenuItem>
                                <MenuItem value="last7days">Last 7 Days</MenuItem>
                                <MenuItem value="thisMonth">This Month</MenuItem>
                                <MenuItem value="custom">Custom Range</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {period === 'custom' && (
                        <>
                            <Box>
                                <Typography sx={{ fontSize: '11.5px', color: DS.muted, fontWeight: 600, mb: 0.6 }}>Start Date</Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ '& .MuiOutlinedInput-root': { ...selectSx, height: 42 } }}
                                />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: '11.5px', color: DS.muted, fontWeight: 600, mb: 0.6 }}>End Date</Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ '& .MuiOutlinedInput-root': { ...selectSx, height: 42 } }}
                                />
                            </Box>
                        </>
                    )}

                    <Box>
                        <Typography sx={{ fontSize: '11.5px', color: DS.muted, fontWeight: 600, mb: 0.6 }}>Provider</Typography>
                        <FormControl fullWidth size="small">
                            <Select
                                value={provider}
                                onChange={(e) => {
                                    setProvider(e.target.value);
                                    setPage(0);
                                }}
                                sx={selectSx}
                            >
                                <MenuItem value="all">All Providers</MenuItem>
                                <MenuItem value="doordash">DoorDash</MenuItem>
                                <MenuItem value="ubereats">Uber Eats</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Box>
                        <Typography sx={{ fontSize: '11.5px', color: DS.muted, fontWeight: 600, mb: 0.6 }}>Store</Typography>
                        <FormControl fullWidth size="small">
                            <Select
                                displayEmpty
                                value={storeSlug}
                                onChange={(e) => {
                                    setStoreSlug(e.target.value);
                                    setPage(0);
                                }}
                                sx={selectSx}
                            >
                                <MenuItem value="">All Stores</MenuItem>
                                {stores.map((s) => (
                                    <MenuItem key={s.slug} value={s.slug}>{s.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <Stack direction="row" spacing={1}>
                        {period === 'custom' && (
                            <Button
                                variant="contained"
                                onClick={() => fetchReport()}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    bgcolor: DS.orange,
                                    height: 42,
                                    '&:hover': { bgcolor: DS.orangeHover },
                                }}
                            >
                                Apply
                            </Button>
                        )}
                        <Button
                            startIcon={<RefreshIcon />}
                            onClick={handleReset}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: '10px',
                                border: `1px solid ${DS.border}`,
                                color: DS.text,
                                bgcolor: '#fff',
                                height: 42,
                                px: 2,
                                '&:hover': { bgcolor: '#F9FAFB' },
                            }}
                        >
                            Reset
                        </Button>
                    </Stack>
                </Box>
            </Paper>

            {/* KPI cards */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                    gap: 1.75,
                    mb: 2.75,
                }}
            >
                {summaryCards.map((card) => (
                    <Paper
                        key={card.label}
                        elevation={0}
                        sx={{
                            p: 2,
                            borderRadius: '14px',
                            bgcolor: card.soft,
                            border: `1px solid ${DS.border}`,
                            boxShadow: DS.shadow,
                            minHeight: 110,
                        }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                            <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '11px',
                                        bgcolor: '#fff',
                                        color: card.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                                    }}
                                >
                                    {card.icon}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: '12px', color: DS.muted, fontWeight: 500 }}>{card.label}</Typography>
                                    <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '22px', color: DS.text, letterSpacing: '-0.03em', lineHeight: 1.15, mt: 0.25 }}>
                                        {card.isCurrency ? formatCurrency(Number(card.value)) : Number(card.value).toLocaleString()}
                                    </Typography>
                                </Box>
                            </Stack>
                            <MiniSpark color={card.color} values={card.spark} />
                        </Stack>
                        <Typography sx={{ mt: 1.1, fontSize: '12px', fontWeight: 600, color: DS.green }}>
                            ↑ {card.trend}% vs last month
                        </Typography>
                    </Paper>
                ))}
            </Box>

            {/* Table section */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: '16px',
                    border: `1px solid ${DS.border}`,
                    bgcolor: '#fff',
                    boxShadow: DS.shadow,
                    overflow: 'hidden',
                }}
            >
                {/* Tabs + search */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', lg: 'row' },
                        alignItems: { lg: 'center' },
                        justifyContent: 'space-between',
                        gap: 1.5,
                        px: 2,
                        pt: 1,
                        borderBottom: `1px solid ${DS.border}`,
                    }}
                >
                    <Stack direction="row" spacing={{ xs: 1.5, sm: 2.5 }} sx={{ overflowX: 'auto' }}>
                        {tabs.map((t) => {
                            const active = provider === t.key || (t.key === 'all' && provider === 'all');
                            return (
                                <Box
                                    key={t.key}
                                    component="button"
                                    onClick={() => {
                                        setProvider(t.key);
                                        setPage(0);
                                    }}
                                    sx={{
                                        border: 0,
                                        bgcolor: 'transparent',
                                        cursor: 'pointer',
                                        px: 0.25,
                                        py: 1.5,
                                        whiteSpace: 'nowrap',
                                        fontFamily: DS.font,
                                        fontSize: '13.5px',
                                        fontWeight: active ? 700 : 500,
                                        color: active ? DS.orange : DS.muted,
                                        borderBottom: active ? `3px solid ${DS.orange}` : '3px solid transparent',
                                        '&:hover': { color: DS.orange },
                                    }}
                                >
                                    {t.label} ({Number(t.count || 0).toLocaleString()})
                                </Box>
                            );
                        })}
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ pb: 1.25, width: { xs: '100%', lg: 'auto' } }}>
                        <TextField
                            size="small"
                            placeholder="Search orders, customer, address..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            sx={{
                                minWidth: { sm: 280 },
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                    height: 40,
                                    borderRadius: '10px',
                                    fontFamily: DS.font,
                                    fontSize: '13.5px',
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
                        <Button
                            startIcon={<FilterIcon />}
                            onClick={() => setFiltersOpen((v) => !v)}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: '10px',
                                border: `1.5px solid ${DS.orange}`,
                                color: DS.orange,
                                height: 40,
                                px: 1.75,
                                '&:hover': { bgcolor: '#FFF7ED' },
                            }}
                        >
                            Filters
                        </Button>
                    </Stack>
                </Box>

                <Collapse in={filtersOpen}>
                    <Box sx={{ px: 2, py: 1.5, bgcolor: '#FAFBFC', borderBottom: `1px solid ${DS.border}` }}>
                        <Typography sx={{ fontSize: '12.5px', color: DS.muted }}>
                            Use the global filters above for time period, provider, and store. Search matches order #, customer, phone, address, and store.
                        </Typography>
                    </Box>
                </Collapse>

                {loading ? (
                    <Box sx={{ p: 2 }}>
                        <TableSkeleton rows={8} columns={12} />
                    </Box>
                ) : (
                    <>
                        <TableContainer sx={{ display: { xs: 'none', lg: 'block' }, maxWidth: '100%', overflowX: 'auto' }}>
                            <Table size="small" sx={{ minWidth: 1400 }}>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                                        <TableCell padding="checkbox" sx={{ pl: 1.5 }}>
                                            <Checkbox
                                                size="small"
                                                checked={orders.length > 0 && selected.length === orders.length}
                                                indeterminate={selected.length > 0 && selected.length < orders.length}
                                                onChange={toggleSelectAll}
                                                sx={{ color: DS.muted, '&.Mui-checked': { color: DS.orange } }}
                                            />
                                        </TableCell>
                                        {['Store', 'Order #', 'Date & Time', 'Provider', 'Customer', 'Delivery Address', 'Subtotal', 'Delivery Charge', 'Tip', 'Tax', 'Processing Fee', 'Total', 'Payment', 'Status', 'Actions'].map((h) => (
                                            <TableCell
                                                key={h}
                                                align={['Subtotal', 'Delivery Charge', 'Tip', 'Tax', 'Processing Fee', 'Total'].includes(h) ? 'right' : 'left'}
                                                sx={{
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    color: DS.muted,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.03em',
                                                    whiteSpace: 'nowrap',
                                                    py: 1.4,
                                                    borderBottom: `1px solid ${DS.border}`,
                                                }}
                                            >
                                                {h}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {orders.map((order: any, idx: number) => {
                                        const key = orderKey(order, idx);
                                        const st = statusStyle(order.status);
                                        const paid = ['paid', 'completed'].includes(String(order.paymentStatus || '').toLowerCase());
                                        return (
                                            <TableRow
                                                key={key}
                                                hover
                                                sx={{
                                                    bgcolor: idx % 2 ? '#FAFBFC' : '#fff',
                                                    '& td': { borderBottom: `1px solid ${DS.border}`, py: 1.35, px: 1.25, verticalAlign: 'top' },
                                                }}
                                            >
                                                <TableCell padding="checkbox" sx={{ pl: 1.5 }}>
                                                    <Checkbox
                                                        size="small"
                                                        checked={selected.includes(key)}
                                                        onChange={() =>
                                                            setSelected((prev) =>
                                                                prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
                                                            )
                                                        }
                                                        sx={{ color: DS.muted, '&.Mui-checked': { color: DS.orange } }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Avatar sx={{ width: 28, height: 28, bgcolor: '#EEF2FF', color: '#4F46E5', fontSize: '11px', fontWeight: 800 }}>
                                                            {storeInitials(order.storeName)}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: DS.text }}>{order.storeName}</Typography>
                                                            <Typography sx={{ fontSize: '11.5px', color: DS.muted }}>{order.storeSlug}</Typography>
                                                        </Box>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 800, color: DS.text, whiteSpace: 'nowrap' }}>
                                                        {order.orderNumber}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                    <Typography sx={{ fontSize: '13px', color: DS.text }}>
                                                        {order.date ? new Date(order.date).toLocaleDateString() : '—'}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '11.5px', color: DS.muted }}>
                                                        {order.date
                                                            ? new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                            : ''}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={providerLabel(order.provider)}
                                                        size="small"
                                                        sx={{
                                                            height: 24,
                                                            fontWeight: 800,
                                                            fontSize: '11px',
                                                            bgcolor: providerColor(order.provider),
                                                            color: '#fff',
                                                            borderRadius: '999px',
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: DS.text, textTransform: 'uppercase' }}>
                                                        {order.customerName}
                                                    </Typography>
                                                    {order.customerPhone && (
                                                        <Typography sx={{ fontSize: '11.5px', color: DS.muted }}>{order.customerPhone}</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 180 }}>
                                                    <Typography sx={{ fontSize: '12.5px', color: DS.text, lineHeight: 1.35 }}>
                                                        {order.deliveryAddress || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontSize: '13px' }}>{formatCurrency(order.subtotal)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '13px' }}>{formatCurrency(order.deliveryCharge)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '13px' }}>{formatCurrency(order.tip)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '13px' }}>{formatCurrency(order.tax)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '13px' }}>{formatCurrency(order.processingFee)}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '13px', fontWeight: 800 }}>{formatCurrency(order.totalAmount)}</TableCell>
                                                <TableCell>
                                                    <Stack spacing={0.5} alignItems="flex-start">
                                                        <Chip
                                                            label={order.paymentMethod || 'N/A'}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ height: 22, fontSize: '11px', fontWeight: 600, borderColor: DS.border, color: DS.text }}
                                                        />
                                                        <Chip
                                                            label={order.paymentStatus || 'N/A'}
                                                            size="small"
                                                            sx={{
                                                                height: 22,
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                bgcolor: paid ? DS.green : '#E5E7EB',
                                                                color: paid ? '#fff' : DS.muted,
                                                                textTransform: 'lowercase',
                                                            }}
                                                        />
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={order.status || '—'}
                                                        size="small"
                                                        sx={{
                                                            height: 24,
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            bgcolor: st.bg,
                                                            color: st.color,
                                                            textTransform: 'lowercase',
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            setMenuAnchor(e.currentTarget);
                                                            setMenuOrder(order);
                                                        }}
                                                        sx={{
                                                            width: 32,
                                                            height: 32,
                                                            border: `1px solid ${DS.border}`,
                                                            borderRadius: '8px',
                                                            color: DS.muted,
                                                        }}
                                                    >
                                                        <MoreIcon sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {orders.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={16} align="center" sx={{ py: 6, color: DS.muted }}>
                                                No delivery orders found for the selected filters
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Mobile cards */}
                        <Box sx={{ display: { xs: 'block', lg: 'none' }, p: 1.5 }}>
                            <Stack spacing={1.5}>
                                {orders.map((order: any, idx: number) => {
                                    const st = statusStyle(order.status);
                                    return (
                                        <Paper key={orderKey(order, idx)} elevation={0} sx={{ p: 1.75, borderRadius: '12px', border: `1px solid ${DS.border}` }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Typography sx={{ fontWeight: 800 }}>{order.orderNumber}</Typography>
                                                <Chip
                                                    label={providerLabel(order.provider)}
                                                    size="small"
                                                    sx={{ bgcolor: providerColor(order.provider), color: '#fff', fontWeight: 800, height: 22 }}
                                                />
                                            </Stack>
                                            <Typography sx={{ fontWeight: 700, fontSize: '13.5px' }}>{order.storeName}</Typography>
                                            <Typography sx={{ fontSize: '12px', color: DS.muted, mb: 1 }}>
                                                {order.date ? new Date(order.date).toLocaleString() : '—'}
                                            </Typography>
                                            <Typography sx={{ fontSize: '13px', fontWeight: 700 }}>{order.customerName}</Typography>
                                            <Typography sx={{ fontSize: '12px', color: DS.muted, mb: 1 }}>{order.deliveryAddress || '—'}</Typography>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography sx={{ fontWeight: 800 }}>{formatCurrency(order.totalAmount)}</Typography>
                                                <Chip label={order.status} size="small" sx={{ bgcolor: st.bg, color: st.color, fontWeight: 700, height: 22 }} />
                                            </Stack>
                                        </Paper>
                                    );
                                })}
                                {orders.length === 0 && (
                                    <Typography sx={{ color: DS.muted, textAlign: 'center', py: 3 }}>
                                        No delivery orders found for the selected filters
                                    </Typography>
                                )}
                            </Stack>
                        </Box>

                        {/* Footer */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', md: 'row' },
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1.5,
                                px: 2,
                                py: 1.75,
                                borderTop: `1px solid ${DS.border}`,
                            }}
                        >
                            <Typography sx={{ fontSize: '12.5px', color: DS.muted }}>
                                Showing {showingFrom}-{showingTo} of {total.toLocaleString()} orders
                            </Typography>
                            <Pagination
                                count={totalPages}
                                page={page + 1}
                                onChange={(_, p) => setPage(p - 1)}
                                siblingCount={1}
                                boundaryCount={1}
                                sx={{
                                    '& .MuiPaginationItem-root': {
                                        fontFamily: DS.font,
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        color: DS.muted,
                                        borderRadius: '50%',
                                        minWidth: 32,
                                        height: 32,
                                    },
                                    '& .Mui-selected': {
                                        bgcolor: `${DS.orange} !important`,
                                        color: '#fff !important',
                                    },
                                }}
                            />
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography sx={{ fontSize: '12.5px', color: DS.muted }}>Rows per page</Typography>
                                <FormControl size="small">
                                    <Select
                                        value={rowsPerPage}
                                        onChange={(e) => {
                                            setRowsPerPage(Number(e.target.value));
                                            setPage(0);
                                        }}
                                        sx={{ height: 32, borderRadius: '8px', fontSize: '13px' }}
                                    >
                                        {[10, 25, 50, 100].map((n) => (
                                            <MenuItem key={n} value={n}>{n}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>
                        </Box>
                    </>
                )}
            </Paper>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => {
                    setMenuAnchor(null);
                    setMenuOrder(null);
                }}
            >
                {menuOrder?.trackingUrl && (
                    <MenuItem
                        onClick={() => {
                            window.open(menuOrder.trackingUrl, '_blank', 'noopener');
                            setMenuAnchor(null);
                        }}
                    >
                        Open Tracking
                    </MenuItem>
                )}
                <MenuItem
                    onClick={() => {
                        if (menuOrder?.orderNumber) {
                            navigator.clipboard.writeText(String(menuOrder.orderNumber));
                            toast.success('Order number copied');
                        }
                        setMenuAnchor(null);
                    }}
                >
                    Copy Order #
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (menuOrder?.storeSlug) {
                            navigator.clipboard.writeText(String(menuOrder.storeSlug));
                            toast.success('Store slug copied');
                        }
                        setMenuAnchor(null);
                    }}
                >
                    Copy Store Slug
                </MenuItem>
            </Menu>
        </Box>
    );
};

export default DeliveryReportsPage;
