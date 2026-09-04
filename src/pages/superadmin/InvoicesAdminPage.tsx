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
    IconButton,
    Button,
    Tooltip,
    TextField,
    InputAdornment,
    CircularProgress,
    Pagination,
    Stack,
    Checkbox,
    Menu,
    MenuItem,
    FormControl,
    Select,
    Collapse,
    Divider,
} from '@mui/material';
import {
    GetApp as DownloadIcon,
    Email as EmailIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    Add as AddIcon,
    DescriptionOutlined as DocIcon,
    CheckCircleOutline as PaidIcon,
    AccessTimeOutlined as PendingIcon,
    AccountBalanceWalletOutlined as RevenueIcon,
    MoreVert as MoreIcon,
    UnfoldMore as SortIcon,
    Check as CheckIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { invoicesAPI, apiBaseUrl } from '../../services/api';
import { downloadFromUrl } from '../../utils/fileDownload';
import { TableSkeleton } from '../../components/common/PageSkeleton';

const DS = {
    pageBg: '#F8F9FB',
    text: '#0F172A',
    muted: '#6B7280',
    border: '#E5E7EB',
    orange: '#F27A32',
    orangeHover: '#E06518',
    green: '#16A34A',
    greenSoft: '#E6F4EA',
    greenText: '#1E7E34',
    red: '#EF4444',
    blue: '#3B82F6',
    blueSoft: '#EFF6FF',
    purple: '#7C3AED',
    purpleSoft: '#F3E8FF',
    orangeSoft: '#FFF4EC',
    font: "'Inter', 'Plus Jakarta Sans', sans-serif",
    heading: "'Plus Jakarta Sans', 'Inter', sans-serif",
    shadow: '0 1px 2px rgba(15,23,42,0.04), 0 10px 28px rgba(15,23,42,0.05)',
};

type SortKey = 'tenant' | 'invoiceNumber' | 'issueDate' | 'customer' | 'amount' | 'status';

const formatMoney = (amount: number, currency?: string) => {
    const cur = (currency || 'USD').toUpperCase();
    try {
        return new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en-US', {
            style: 'currency',
            currency: cur,
        }).format(Number(amount) || 0);
    } catch {
        return `$${Number(amount || 0).toFixed(2)}`;
    }
};

const formatDate = (value?: string | Date) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
};

const StatCard: React.FC<{
    label: string;
    value: string | number;
    trend: string;
    up?: boolean;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
}> = ({ label, value, trend, up = true, icon, iconBg, iconColor }) => (
    <Paper
        elevation={0}
        sx={{
            p: 2,
            borderRadius: '14px',
            bgcolor: '#fff',
            border: `1px solid ${DS.border}`,
            boxShadow: DS.shadow,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.75,
            height: '100%',
            minHeight: 96,
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
        <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: '12.5px', color: DS.muted, fontWeight: 500, fontFamily: DS.font }}>{label}</Typography>
            <Typography sx={{ fontFamily: DS.heading, fontWeight: 800, fontSize: '24px', color: DS.text, letterSpacing: '-0.03em', lineHeight: 1.15, mt: 0.35 }}>
                {value}
            </Typography>
            <Typography sx={{ mt: 0.6, fontSize: '12px', fontWeight: 600, color: up ? DS.green : DS.red, fontFamily: DS.font }}>
                {trend}
            </Typography>
        </Box>
    </Paper>
);

const InvoicesAdminPage: React.FC = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [resending, setResending] = useState<string | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [sortKey, setSortKey] = useState<SortKey>('issueDate');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [menuInvoice, setMenuInvoice] = useState<any | null>(null);
    const [stats, setStats] = useState({
        total: 0,
        paid: 0,
        pending: 0,
        revenue: 0,
        trendTotal: 12,
        trendPaid: 18,
        trendPending: -8,
        trendRevenue: 20,
    });

    useEffect(() => {
        const t = window.setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 350);
        return () => window.clearTimeout(t);
    }, [searchInput]);

    const fetchStats = useCallback(async () => {
        try {
            const [allRes, paidRes, pendingRes, paidListRes] = await Promise.all([
                invoicesAPI.getAllAdmin({ page: 1, limit: 1, requirePlan: true }),
                invoicesAPI.getAllAdmin({ page: 1, limit: 1, requirePlan: true, status: 'paid' }),
                invoicesAPI.getAllAdmin({ page: 1, limit: 1, requirePlan: true, status: 'pending' }),
                invoicesAPI.getAllAdmin({ page: 1, limit: 500, requirePlan: true, status: 'paid' }),
            ]);
            const paidInvoices = paidListRes.data?.invoices || [];
            const revenue = paidInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.amount) || 0), 0);
            setStats((prev) => ({
                ...prev,
                total: allRes.data?.total || 0,
                paid: paidRes.data?.total || 0,
                pending: pendingRes.data?.total || 0,
                revenue,
            }));
        } catch {
            /* non-blocking */
        }
    }, []);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const response = await invoicesAPI.getAllAdmin({
                page,
                limit: rowsPerPage,
                search: search || undefined,
                status: statusFilter || undefined,
                requirePlan: true,
            });
            setInvoices(response.data.invoices || []);
            setTotal(response.data.total || 0);
            setSelected([]);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, search, statusFilter]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

    const sortedInvoices = useMemo(() => {
        const list = [...invoices];
        list.sort((a, b) => {
            let av: any;
            let bv: any;
            switch (sortKey) {
                case 'tenant':
                    av = (a.tenant?.name || '').toLowerCase();
                    bv = (b.tenant?.name || '').toLowerCase();
                    break;
                case 'invoiceNumber':
                    av = a.invoiceNumber || '';
                    bv = b.invoiceNumber || '';
                    break;
                case 'issueDate':
                    av = new Date(a.issueDate || 0).getTime();
                    bv = new Date(b.issueDate || 0).getTime();
                    break;
                case 'customer':
                    av = (a.customerName || '').toLowerCase();
                    bv = (b.customerName || '').toLowerCase();
                    break;
                case 'amount':
                    av = Number(a.amount) || 0;
                    bv = Number(b.amount) || 0;
                    break;
                case 'status':
                    av = a.status || '';
                    bv = b.status || '';
                    break;
                default:
                    return 0;
            }
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return list;
    }, [invoices, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const handleDownload = async (id: string, invoiceNumber: string) => {
        try {
            const token = localStorage.getItem('jwt');
            const fullUrl = `${apiBaseUrl}/invoices/${id}/pdf`;
            await downloadFromUrl(fullUrl, `Invoice-${invoiceNumber}.pdf`, {
                Authorization: `Bearer ${token}`,
            });
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download invoice');
        }
    };

    const handleResend = async (id: string) => {
        setResending(id);
        try {
            await invoicesAPI.resend(id);
            toast.success('Invoice sent successfully');
        } catch (error) {
            console.error('Error resending invoice:', error);
            toast.error('Failed to resend invoice');
        } finally {
            setResending(null);
        }
    };

    const toggleSelectAll = () => {
        if (selected.length === sortedInvoices.length) setSelected([]);
        else setSelected(sortedInvoices.map((i) => i._id));
    };

    const toggleSelect = (id: string) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const statusBadge = (status?: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'paid') {
            return {
                bg: DS.greenSoft,
                color: DS.greenText,
                icon: <CheckIcon sx={{ fontSize: 14, color: DS.greenText }} />,
                label: 'PAID',
            };
        }
        if (s === 'pending') {
            return { bg: DS.orangeSoft, color: DS.orange, icon: null, label: 'PENDING' };
        }
        if (s === 'failed' || s === 'refunded') {
            return { bg: '#FEF2F2', color: DS.red, icon: null, label: s.toUpperCase() };
        }
        return { bg: '#F3F4F6', color: DS.muted, icon: null, label: (status || 'UNKNOWN').toUpperCase() };
    };

    const showingFrom = total === 0 ? 0 : (page - 1) * rowsPerPage + 1;
    const showingTo = Math.min(page * rowsPerPage, total);

    const actionBtnSx = {
        width: 34,
        height: 34,
        borderRadius: '8px',
        border: `1px solid ${DS.border}`,
        color: DS.muted,
        bgcolor: '#fff',
        '&:hover': { bgcolor: '#F9FAFB', color: DS.text },
    };

    const headerCell = (label: string, key?: SortKey) => (
        <TableCell
            onClick={key ? () => handleSort(key) : undefined}
            sx={{
                py: 1.5,
                px: 1.5,
                fontSize: '11.5px',
                fontWeight: 700,
                color: DS.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderBottom: `1px solid ${DS.border}`,
                cursor: key ? 'pointer' : 'default',
                whiteSpace: 'nowrap',
                fontFamily: DS.font,
                userSelect: 'none',
            }}
        >
            <Stack direction="row" spacing={0.5} alignItems="center">
                <span>{label}</span>
                {key && <SortIcon sx={{ fontSize: 14, color: sortKey === key ? DS.orange : '#CBD5E1' }} />}
            </Stack>
        </TableCell>
    );

    return (
        <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 4, pt: { xs: 1, sm: 2.5 }, bgcolor: DS.pageBg, minHeight: '100%', fontFamily: DS.font }}>
            {/* Breadcrumb */}
            <Typography sx={{ fontSize: '12.5px', color: DS.muted, mb: 1, fontFamily: DS.font }}>
                <Box component="span" onClick={() => navigate('/superadmin')} sx={{ cursor: 'pointer', '&:hover': { color: DS.orange } }}>
                    Home
                </Box>
                {' > '}
                <Box component="span" sx={{ color: DS.text, fontWeight: 600 }}>Invoices</Box>
            </Typography>

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
                        Subscription Invoices
                    </Typography>
                    <Typography sx={{ mt: 0.6, color: DS.muted, fontSize: '13.5px', maxWidth: 560 }}>
                        View and manage all subscription invoices across your tenants.
                    </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                    <Button
                        startIcon={<FilterIcon />}
                        onClick={() => setFiltersOpen((v) => !v)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '13.5px',
                            borderRadius: '10px',
                            border: `1.5px solid ${DS.orange}`,
                            color: DS.orange,
                            bgcolor: '#fff',
                            px: 2,
                            '&:hover': { bgcolor: DS.orangeSoft, borderColor: DS.orangeHover },
                        }}
                    >
                        Filters
                    </Button>
                    <Button
                        startIcon={<AddIcon />}
                        onClick={() =>
                            toast('Invoices are created automatically when tenants subscribe or complete payment.', {
                                icon: 'ℹ️',
                            })
                        }
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '13.5px',
                            borderRadius: '10px',
                            bgcolor: DS.orange,
                            color: '#fff',
                            px: 2,
                            '&:hover': { bgcolor: DS.orangeHover },
                        }}
                    >
                        + Create Invoice
                    </Button>
                </Stack>
            </Box>

            {/* Filters panel */}
            <Collapse in={filtersOpen}>
                <Paper
                    elevation={0}
                    sx={{
                        mb: 2.5,
                        p: 2,
                        borderRadius: '14px',
                        border: `1px solid ${DS.border}`,
                        bgcolor: '#fff',
                        boxShadow: DS.shadow,
                    }}
                >
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                        <TextField
                            size="small"
                            placeholder="Search by invoice #, customer name or email..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            sx={{
                                flex: 1,
                                minWidth: 240,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    fontFamily: DS.font,
                                    fontSize: '13.5px',
                                    height: 42,
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
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <Select
                                displayEmpty
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                sx={{ borderRadius: '10px', height: 42, fontFamily: DS.font, fontSize: '13.5px' }}
                            >
                                <MenuItem value="">All Status</MenuItem>
                                <MenuItem value="paid">Paid</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="failed">Failed</MenuItem>
                                <MenuItem value="refunded">Refunded</MenuItem>
                            </Select>
                        </FormControl>
                        <Button
                            onClick={() => {
                                setSearchInput('');
                                setSearch('');
                                setStatusFilter('');
                                setPage(1);
                            }}
                            sx={{ textTransform: 'none', fontWeight: 600, color: DS.muted }}
                        >
                            Clear
                        </Button>
                    </Stack>
                </Paper>
            </Collapse>

            {/* KPI cards */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
                    gap: 1.75,
                    mb: 2.75,
                }}
            >
                <StatCard
                    label="Total Invoices"
                    value={stats.total.toLocaleString()}
                    trend={`↑ ${stats.trendTotal}% this month`}
                    icon={<DocIcon />}
                    iconBg={DS.blueSoft}
                    iconColor={DS.blue}
                />
                <StatCard
                    label="Paid"
                    value={stats.paid.toLocaleString()}
                    trend={`↑ ${stats.trendPaid}% this month`}
                    icon={<PaidIcon />}
                    iconBg={DS.greenSoft}
                    iconColor={DS.green}
                />
                <StatCard
                    label="Pending"
                    value={stats.pending.toLocaleString()}
                    trend={`↓ ${Math.abs(stats.trendPending)}% this month`}
                    up={false}
                    icon={<PendingIcon />}
                    iconBg={DS.orangeSoft}
                    iconColor={DS.orange}
                />
                <StatCard
                    label="Total Revenue"
                    value={formatMoney(stats.revenue, 'USD')}
                    trend={`↑ ${stats.trendRevenue}% this month`}
                    icon={<RevenueIcon />}
                    iconBg={DS.purpleSoft}
                    iconColor={DS.purple}
                />
            </Box>

            {/* Table */}
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
                {loading ? (
                    <Box sx={{ p: 2 }}>
                        <TableSkeleton rows={8} columns={8} />
                    </Box>
                ) : (
                    <>
                        <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox" sx={{ borderBottom: `1px solid ${DS.border}`, pl: 1.5 }}>
                                            <Checkbox
                                                size="small"
                                                checked={sortedInvoices.length > 0 && selected.length === sortedInvoices.length}
                                                indeterminate={selected.length > 0 && selected.length < sortedInvoices.length}
                                                onChange={toggleSelectAll}
                                                sx={{ color: DS.muted, '&.Mui-checked': { color: DS.orange } }}
                                            />
                                        </TableCell>
                                        {headerCell('Tenant', 'tenant')}
                                        {headerCell('Invoice #', 'invoiceNumber')}
                                        {headerCell('Date', 'issueDate')}
                                        {headerCell('Customer', 'customer')}
                                        {headerCell('Amount', 'amount')}
                                        {headerCell('Status', 'status')}
                                        {headerCell('Actions')}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sortedInvoices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                                <Typography sx={{ color: DS.muted }}>No invoices found</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sortedInvoices.map((invoice: any) => {
                                            const badge = statusBadge(invoice.status);
                                            return (
                                                <TableRow
                                                    key={invoice._id}
                                                    hover
                                                    sx={{
                                                        '&:hover': { bgcolor: '#FAFBFC' },
                                                        '& td': { borderBottom: `1px solid ${DS.border}`, py: 1.6, px: 1.5 },
                                                    }}
                                                >
                                                    <TableCell padding="checkbox" sx={{ pl: 1.5 }}>
                                                        <Checkbox
                                                            size="small"
                                                            checked={selected.includes(invoice._id)}
                                                            onChange={() => toggleSelect(invoice._id)}
                                                            sx={{ color: DS.muted, '&.Mui-checked': { color: DS.orange } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: DS.text, fontFamily: DS.font }}>
                                                            {invoice.tenant?.name || 'Unknown Tenant'}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '12px', color: DS.muted }}>{invoice.tenant?.slug || '—'}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography sx={{ fontSize: '13.5px', color: DS.text, fontFamily: DS.font }}>
                                                            {invoice.invoiceNumber}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography sx={{ fontSize: '13.5px', color: DS.text }}>{formatDate(invoice.issueDate)}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: DS.text }}>
                                                            {invoice.customerName || '—'}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '12px', color: DS.muted }}>{invoice.customerEmail || '—'}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography sx={{ fontSize: '13.5px', color: DS.text, fontWeight: 600 }}>
                                                            {formatMoney(invoice.amount, invoice.currency)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            icon={badge.icon || undefined}
                                                            label={badge.label}
                                                            size="small"
                                                            sx={{
                                                                height: 26,
                                                                fontWeight: 800,
                                                                fontSize: '11px',
                                                                bgcolor: badge.bg,
                                                                color: badge.color,
                                                                borderRadius: '999px',
                                                                '& .MuiChip-icon': { ml: 0.75 },
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Stack direction="row" spacing={0.75}>
                                                            <Tooltip title="Download PDF">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleDownload(invoice._id, invoice.invoiceNumber)}
                                                                    sx={actionBtnSx}
                                                                >
                                                                    <DownloadIcon sx={{ fontSize: 18 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Resend Email">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleResend(invoice._id)}
                                                                    disabled={resending === invoice._id}
                                                                    sx={actionBtnSx}
                                                                >
                                                                    {resending === invoice._id ? (
                                                                        <CircularProgress size={16} />
                                                                    ) : (
                                                                        <EmailIcon sx={{ fontSize: 18 }} />
                                                                    )}
                                                                </IconButton>
                                                            </Tooltip>
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => {
                                                                    setMenuAnchor(e.currentTarget);
                                                                    setMenuInvoice(invoice);
                                                                }}
                                                                sx={actionBtnSx}
                                                            >
                                                                <MoreIcon sx={{ fontSize: 18 }} />
                                                            </IconButton>
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Mobile cards */}
                        <Box sx={{ display: { xs: 'block', md: 'none' }, p: 1.5 }}>
                            {sortedInvoices.length === 0 ? (
                                <Typography sx={{ color: DS.muted, textAlign: 'center', py: 4 }}>No invoices found</Typography>
                            ) : (
                                <Stack spacing={1.5}>
                                    {sortedInvoices.map((invoice: any) => {
                                        const badge = statusBadge(invoice.status);
                                        return (
                                            <Paper
                                                key={invoice._id}
                                                elevation={0}
                                                sx={{ p: 1.75, borderRadius: '12px', border: `1px solid ${DS.border}` }}
                                            >
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 800, fontSize: '14px' }}>{invoice.tenant?.name || 'Unknown'}</Typography>
                                                        <Typography sx={{ fontSize: '12px', color: DS.muted }}>{invoice.invoiceNumber}</Typography>
                                                    </Box>
                                                    <Chip
                                                        label={badge.label}
                                                        size="small"
                                                        sx={{ height: 24, fontWeight: 800, fontSize: '11px', bgcolor: badge.bg, color: badge.color }}
                                                    />
                                                </Stack>
                                                <Divider sx={{ my: 1 }} />
                                                <Typography sx={{ fontSize: '13px', fontWeight: 700 }}>{invoice.customerName}</Typography>
                                                <Typography sx={{ fontSize: '12px', color: DS.muted, mb: 1 }}>{invoice.customerEmail}</Typography>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Typography sx={{ fontWeight: 800 }}>{formatMoney(invoice.amount, invoice.currency)}</Typography>
                                                    <Stack direction="row" spacing={0.75}>
                                                        <IconButton size="small" onClick={() => handleDownload(invoice._id, invoice.invoiceNumber)} sx={actionBtnSx}>
                                                            <DownloadIcon sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                        <IconButton size="small" onClick={() => handleResend(invoice._id)} disabled={resending === invoice._id} sx={actionBtnSx}>
                                                            {resending === invoice._id ? <CircularProgress size={16} /> : <EmailIcon sx={{ fontSize: 18 }} />}
                                                        </IconButton>
                                                    </Stack>
                                                </Stack>
                                            </Paper>
                                        );
                                    })}
                                </Stack>
                            )}
                        </Box>

                        {/* Footer pagination */}
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
                            <Typography sx={{ fontSize: '12.5px', color: DS.muted, fontFamily: DS.font }}>
                                Showing {showingFrom}-{showingTo} of {total.toLocaleString()} invoices
                            </Typography>

                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, p) => setPage(p)}
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
                                            setPage(1);
                                        }}
                                        sx={{
                                            height: 32,
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontFamily: DS.font,
                                            '& .MuiSelect-select': { py: 0.5, pr: 3 },
                                        }}
                                    >
                                        {[10, 20, 50].map((n) => (
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
                onClose={() => { setMenuAnchor(null); setMenuInvoice(null); }}
            >
                <MenuItem
                    onClick={() => {
                        if (menuInvoice) handleDownload(menuInvoice._id, menuInvoice.invoiceNumber);
                        setMenuAnchor(null);
                    }}
                >
                    Download PDF
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (menuInvoice) handleResend(menuInvoice._id);
                        setMenuAnchor(null);
                    }}
                >
                    Resend Email
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (menuInvoice?.invoiceNumber) {
                            navigator.clipboard.writeText(menuInvoice.invoiceNumber);
                            toast.success('Invoice number copied');
                        }
                        setMenuAnchor(null);
                    }}
                >
                    Copy Invoice #
                </MenuItem>
            </Menu>
        </Box>
    );
};

export default InvoicesAdminPage;
