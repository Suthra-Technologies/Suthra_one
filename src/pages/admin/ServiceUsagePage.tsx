import React, { useState, useEffect, useCallback } from 'react';
import { alpha } from '@mui/material/styles';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TablePagination, Chip, CircularProgress, useTheme,
    Tabs, Tab, Stack, FormControl, InputLabel, Select, MenuItem, Button,
    TextField, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton, Collapse, Card, CardContent, Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DownloadIcon from '@mui/icons-material/Download';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import SavingsIcon from '@mui/icons-material/Savings';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import MessageIcon from '@mui/icons-material/Message';
import { smsAPI, reportsAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const TYPE_LABELS: Record<string, string> = {
    ORDER_UPDATE: 'Order Update',
    PAYMENT: 'Payment',
    AUTH: 'Auth',
    CATERING: 'Catering',
    REWARDS: 'Rewards',
    GENERAL: 'General',
};

const TYPE_COLORS: Record<string, string> = {
    ORDER_UPDATE: '#6366f1',
    PAYMENT: '#22c55e',
    AUTH: '#f59e0b',
    CATERING: '#ec4899',
    REWARDS: '#06b6d4',
    GENERAL: '#6b7280',
};

function StatusChip({ status }: { status: string }) {
    const map: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'default' }> = {
        DELIVERED: { label: 'Delivered', color: 'success' },
        SENT: { label: 'Sent', color: 'success' },
        FAILED: { label: 'Failed', color: 'error' },
        UNDELIVERED: { label: 'Undelivered', color: 'error' },
        QUEUED: { label: 'Queued', color: 'warning' },
        PENDING: { label: 'Pending', color: 'default' },
    };
    const cfg = map[status?.toUpperCase()] ?? { label: status, color: 'default' };
    return <Chip label={cfg.label} size="small" color={cfg.color} sx={{ fontWeight: 700, fontSize: '0.65rem', minWidth: 72 }} />;
}

function SidCell({ sid }: { sid?: string }) {
    if (!sid) return <Typography variant="caption" color="text.disabled">—</Typography>;
    const short = `${sid.slice(0, 8)}…${sid.slice(-4)}`;
    return (
        <Stack direction="row" alignItems="center" spacing={0.5}>
            <Tooltip title={sid}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{short}</Typography>
            </Tooltip>
            <Tooltip title="Copy SID">
                <IconButton size="small" sx={{ p: 0.25 }} onClick={() => { navigator.clipboard.writeText(sid); toast.success('SID copied'); }}>
                    <ContentCopyIcon sx={{ fontSize: 12 }} />
                </IconButton>
            </Tooltip>
        </Stack>
    );
}

function SmsRow({ log }: { log: any }) {
    const [open, setOpen] = useState(false);
    const isFailed = ['FAILED', 'UNDELIVERED'].includes(log.status?.toUpperCase());
    const theme = useTheme();

    return (
        <>
            <TableRow
                hover
                sx={{
                    borderLeft: isFailed ? `3px solid ${theme.palette.error.main}` : '3px solid transparent',
                    bgcolor: isFailed ? alpha(theme.palette.error.main, 0.03) : undefined,
                }}
            >
                <TableCell sx={{ py: 1 }}>
                    <Typography variant="body2" fontWeight={500}>{new Date(log.createdAt).toLocaleDateString()}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                    <Chip
                        label={TYPE_LABELS[log.type] ?? log.type ?? 'General'}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.6rem', borderColor: TYPE_COLORS[log.type] ?? '#6b7280', color: TYPE_COLORS[log.type] ?? '#6b7280', fontWeight: 600 }}
                    />
                </TableCell>
                <TableCell sx={{ py: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.to}</TableCell>
                <TableCell sx={{ py: 1, maxWidth: 180 }}>
                    <Tooltip title={log.body || ''}>
                        <Typography variant="caption" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
                            {log.body}
                        </Typography>
                    </Tooltip>
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <StatusChip status={log.status} />
                        {isFailed && log.error && (
                            <Tooltip title="Show error">
                                <IconButton size="small" sx={{ p: 0.25 }} onClick={() => setOpen(v => !v)}>
                                    {open ? <ExpandLessIcon sx={{ fontSize: 14, color: 'error.main' }} /> : <ExpandMoreIcon sx={{ fontSize: 14, color: 'error.main' }} />}
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </TableCell>
                <TableCell sx={{ py: 1 }}><SidCell sid={log.sid} /></TableCell>
                <TableCell sx={{ py: 1 }} align="right">
                    <Typography variant="body2" fontWeight={700} color={log.cost > 0 ? 'primary.main' : 'text.disabled'}>
                        {log.cost > 0 ? `$${log.cost.toFixed(4)}` : '—'}
                    </Typography>
                </TableCell>
            </TableRow>
            {isFailed && log.error && (
                <TableRow sx={{ bgcolor: alpha(theme.palette.error.main, 0.04) }}>
                    <TableCell colSpan={7} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
                        <Collapse in={open}>
                            <Box sx={{ py: 1, px: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ErrorOutlineIcon sx={{ fontSize: 14, color: 'error.main', flexShrink: 0 }} />
                                <Typography variant="caption" color="error.main" sx={{ fontFamily: 'monospace' }}>
                                    {log.error}
                                </Typography>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

const ServiceUsagePage: React.FC = () => {
    const theme = useTheme();
    const { formatCurrency } = useSettings();
    const [activeTab, setActiveTab] = useState(0);
    const [period, setPeriod] = useState<string>('today');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // SMS
    const [smsLogs, setSmsLogs] = useState<any[]>([]);
    const [smsPage, setSmsPage] = useState(0);
    const [smsRowsPerPage, setSmsRowsPerPage] = useState(10);
    const [smsTotal, setSmsTotal] = useState(0);
    const [smsSummary, setSmsSummary] = useState<any[]>([]);
    const [smsLoading, setSmsLoading] = useState(false);
    const [smsTypeFilter, setSmsTypeFilter] = useState('');
    const [testSmsOpen, setTestSmsOpen] = useState(false);
    const [testSmsTo, setTestSmsTo] = useState('');
    const [testSmsMessage, setTestSmsMessage] = useState('Hello from the POS! Your SMS integration is working correctly.');

    // Delivery
    const [deliveryReport, setDeliveryReport] = useState<any>(null);
    const [deliveryProviderFilter, setDeliveryProviderFilter] = useState<string>('all');
    const [deliveryPage, setDeliveryPage] = useState(0);
    const [deliveryRowsPerPage, setDeliveryRowsPerPage] = useState(10);
    const [deliveryLoading, setDeliveryLoading] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5006';
    const token = localStorage.getItem('jwt');
    const headers = { Authorization: `Bearer ${token}` };

    const buildDateRange = useCallback(() => {
        if (period === 'custom' && startDate && endDate) {
            return { startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString() };
        }
        if (period === 'custom') return {};
        const now = new Date();
        let start = new Date(now); start.setHours(0, 0, 0, 0);
        const end = new Date(now); end.setHours(23, 59, 59, 999);
        if (period === 'last7days') start.setDate(now.getDate() - 7);
        if (period === 'thisMonth') { start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); }
        return { startDate: start.toISOString(), endDate: end.toISOString() };
    }, [period, startDate, endDate]);

    const fetchSmsData = useCallback(async (page: number, limit: number) => {
        setSmsLoading(true);
        try {
            const range = buildDateRange();
            const params: any = { page: page + 1, limit, ...range };
            if (smsTypeFilter) params.type = smsTypeFilter;
            const [logsRes, summaryRes] = await Promise.all([
                smsAPI.getLogs(params),
                smsAPI.getSummary(range),
            ]);
            setSmsLogs(logsRes.data.logs || []);
            setSmsTotal(logsRes.data.total || 0);
            setSmsSummary(summaryRes.data || []);
        } catch {
            toast.error('Failed to load SMS data');
        } finally {
            setSmsLoading(false);
        }
    }, [buildDateRange, smsTypeFilter]);

    const fetchDeliveryData = useCallback(async () => {
        setDeliveryLoading(true);
        try {
            const range = buildDateRange();
            const res = await reportsAPI.getDeliveryReport({ period, provider: deliveryProviderFilter, ...range });
            setDeliveryReport(res.data);
        } catch {
            // silent
        } finally {
            setDeliveryLoading(false);
        }
    }, [buildDateRange, period, deliveryProviderFilter]);

    useEffect(() => {
        if (activeTab === 0) fetchSmsData(smsPage, smsRowsPerPage);
        if (activeTab === 1) fetchDeliveryData();
    }, [activeTab, smsPage, smsRowsPerPage, period, startDate, endDate, smsTypeFilter, deliveryProviderFilter]);

    const handleSendTestSms = async () => {
        if (!testSmsTo) return toast.error('Recipient number is required');
        try {
            await smsAPI.sendTest(testSmsTo, testSmsMessage);
            toast.success('Test SMS sent');
            setTestSmsOpen(false);
            fetchSmsData(smsPage, smsRowsPerPage);
        } catch {
            toast.error('Failed to send test SMS');
        }
    };

    const downloadExcel = async (reportType: string) => {
        try {
            const range = buildDateRange();
            const response = await axios.get(`${API_URL}/api/reports/export/excel`, {
                params: { reportType, period, ...range },
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
            toast.success('Report downloaded');
        } catch {
            toast.error('Failed to download report');
        }
    };

    // ─── Computed SMS totals ──────────────────────────────────────────────────
    const delivered = smsSummary.find(s => ['DELIVERED', 'SENT'].includes(s._id));
    const failed = smsSummary.find(s => ['FAILED', 'UNDELIVERED'].includes(s._id));
    const queued = smsSummary.find(s => s._id === 'QUEUED');
    const totalSent = smsSummary.reduce((acc, s) => acc + (s.count || 0), 0);
    const totalCost = smsSummary.reduce((acc, s) => acc + (s.totalCost || 0), 0);
    const successRate = totalSent > 0 ? Math.round(((delivered?.count || 0) / totalSent) * 100) : 0;

    // ─── SMS Tab ──────────────────────────────────────────────────────────────
    const renderSmsUsage = () => (
        <Box>
            {/* KPI Strip */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    {
                        label: 'Total Sent',
                        value: totalSent,
                        sub: 'this period',
                        icon: <MessageIcon />,
                        color: '#6366f1',
                    },
                    {
                        label: 'Delivered',
                        value: delivered?.count ?? 0,
                        sub: `$${(delivered?.totalCost ?? 0).toFixed(4)} charged`,
                        icon: <CheckCircleOutlineIcon />,
                        color: '#22c55e',
                    },
                    {
                        label: 'Failed',
                        value: failed?.count ?? 0,
                        sub: failed?.count ? 'click rows to see errors' : 'no failures',
                        icon: <ErrorOutlineIcon />,
                        color: failed?.count ? '#ef4444' : '#9ca3af',
                    },
                    {
                        label: 'Total Cost',
                        value: `$${totalCost.toFixed(4)}`,
                        sub: `${successRate}% success rate`,
                        icon: <AttachMoneyIcon />,
                        color: '#f59e0b',
                    },
                ].map((kpi) => (
                    <Grid size={{ xs: 6, sm: 3 }} key={kpi.label}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderLeft: `4px solid ${kpi.color}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                            }}
                        >
                            <Box sx={{ color: kpi.color, display: 'flex', alignItems: 'center' }}>{kpi.icon}</Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>
                                    {kpi.label}
                                </Typography>
                                <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.1, color: typeof kpi.value === 'number' && kpi.value === 0 && kpi.label === 'Failed' ? 'text.disabled' : 'text.primary' }}>
                                    {kpi.value}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">{kpi.sub}</Typography>
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Table toolbar */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Message Type</InputLabel>
                    <Select value={smsTypeFilter} label="Message Type" onChange={e => { setSmsTypeFilter(e.target.value); setSmsPage(0); }}>
                        <MenuItem value="">All Types</MenuItem>
                        {Object.entries(TYPE_LABELS).map(([k, v]) => (
                            <MenuItem key={k} value={k}>{v}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button variant="outlined" startIcon={<SendIcon />} onClick={() => setTestSmsOpen(true)} sx={{ borderRadius: 2 }}>
                    Send Test Message
                </Button>
            </Box>

            {/* Log Table */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, width: 110 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 110 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>To</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Message</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 130 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 140 }}>
                                    <Tooltip title="Twilio Message SID — use this to verify the charge in your Twilio console">
                                        <span>Proof (SID) ⓘ</span>
                                    </Tooltip>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 80 }} align="right">Cost</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {smsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : smsLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                        <Typography color="text.secondary">No messages found for this period</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : smsLogs.map((log: any) => (
                                <SmsRow key={log._id} log={log} />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Divider />
                {/* Cost footer */}
                {smsLogs.length > 0 && (
                    <Box sx={{ px: 2, py: 1, bgcolor: alpha(theme.palette.action.hover, 0.3), display: 'flex', justifyContent: 'flex-end' }}>
                        <Typography variant="caption" color="text.secondary">
                            Page total cost: <strong>${smsLogs.reduce((acc, l) => acc + (l.cost || 0), 0).toFixed(4)}</strong>
                        </Typography>
                    </Box>
                )}
                <TablePagination
                    component="div"
                    count={smsTotal}
                    rowsPerPage={smsRowsPerPage}
                    page={smsPage}
                    onPageChange={(_, p) => setSmsPage(p)}
                    onRowsPerPageChange={e => { setSmsRowsPerPage(parseInt(e.target.value, 10)); setSmsPage(0); }}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            </Paper>
        </Box>
    );

    // ─── Delivery Tab ─────────────────────────────────────────────────────────
    const renderDeliveryReport = () => {
        const summary = deliveryReport?.summary;
        const orders: any[] = deliveryReport?.orders || [];
        const paged = orders.slice(deliveryPage * deliveryRowsPerPage, deliveryPage * deliveryRowsPerPage + deliveryRowsPerPage);

        const providerColor = (p: string) => p === 'doordash' ? '#ef4444' : p === 'ubereats' ? '#22c55e' : '#6b7280';
        const providerLabel = (p: string) => p === 'doordash' ? 'DoorDash' : p === 'ubereats' ? 'Uber Eats' : p;

        return (
            <Box>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    {[
                        { label: 'Total Orders', value: summary?.totalOrders ?? 0, isCurrency: false, icon: <ShoppingCartIcon />, color: '#6366f1' },
                        { label: 'DoorDash', value: summary?.doordashOrders ?? 0, isCurrency: false, icon: <LocalShippingIcon />, color: '#ef4444' },
                        { label: 'Uber Eats', value: summary?.uberEatsOrders ?? 0, isCurrency: false, icon: <TwoWheelerIcon />, color: '#22c55e' },
                        { label: 'Total Revenue', value: summary?.totalRevenue ?? 0, isCurrency: true, icon: <TrendingUpIcon />, color: '#3b82f6' },
                        { label: 'Delivery Charges', value: summary?.totalDeliveryCharges ?? 0, isCurrency: true, icon: <RequestQuoteIcon />, color: '#f59e0b' },
                        { label: 'Total Tips', value: summary?.totalTips ?? 0, isCurrency: true, icon: <SavingsIcon />, color: '#06b6d4' },
                        { label: 'Total Tax', value: summary?.totalTax ?? 0, isCurrency: true, icon: <AccountBalanceIcon />, color: '#8b5cf6' },
                        { label: 'Processing Fees', value: summary?.totalProcessingFee ?? 0, isCurrency: true, icon: <ReceiptIcon />, color: '#ec4899' },
                    ].map((card) => (
                        <Grid size={{ xs: 6, sm: 3, md: 1.5 }} key={card.label}>
                            <Card variant="outlined" sx={{ borderRadius: 3, borderColor: alpha(card.color, 0.25), borderLeft: `4px solid ${card.color}`, height: '100%' }}>
                                <CardContent sx={{ textAlign: 'center', p: '12px !important' }}>
                                    <Box sx={{ color: card.color, mb: 0.5, '& svg': { fontSize: 22 } }}>{card.icon}</Box>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2, mb: 0.5 }}>{card.label}</Typography>
                                    <Typography variant="subtitle1" fontWeight={800} color={card.color} sx={{ lineHeight: 1 }}>
                                        {card.isCurrency ? formatCurrency(card.value) : card.value}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Provider</InputLabel>
                            <Select value={deliveryProviderFilter} label="Provider" onChange={e => setDeliveryProviderFilter(e.target.value)}>
                                <MenuItem value="all">All Providers</MenuItem>
                                <MenuItem value="doordash">DoorDash</MenuItem>
                                <MenuItem value="ubereats">Uber Eats</MenuItem>
                            </Select>
                        </FormControl>
                        <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={() => downloadExcel('delivery-report')}>
                            Export Excel
                        </Button>
                    </Box>
                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Provider</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Subtotal</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Charge</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Tip</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Tax</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Fee</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Payment</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Track</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {deliveryLoading ? (
                                    <TableRow><TableCell colSpan={14} align="center" sx={{ py: 8 }}><CircularProgress size={24} /></TableCell></TableRow>
                                ) : orders.length === 0 ? (
                                    <TableRow><TableCell colSpan={14} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No records found</Typography></TableCell></TableRow>
                                ) : paged.map((order: any) => (
                                    <TableRow key={order.orderNumber} hover>
                                        <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{order.orderNumber}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            {new Date(order.date).toLocaleDateString()}
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={providerLabel(order.provider)} size="small" sx={{ bgcolor: providerColor(order.provider), color: '#fff', fontWeight: 700, fontSize: '0.6rem' }} />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{order.customerName}</Typography>
                                            <Typography variant="caption" color="text.secondary">{order.customerPhone}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title={order.deliveryAddress || ''}>
                                                <Typography variant="caption" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: 150, lineHeight: 1.2 }}>
                                                    {order.deliveryAddress || '—'}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="right">{formatCurrency(order.subtotal)}</TableCell>
                                        <TableCell align="right">{formatCurrency(order.deliveryCharge)}</TableCell>
                                        <TableCell align="right">{formatCurrency(order.tip)}</TableCell>
                                        <TableCell align="right">{formatCurrency(order.tax)}</TableCell>
                                        <TableCell align="right">{formatCurrency(order.processingFee)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(order.totalAmount)}</TableCell>
                                        <TableCell>
                                            <Stack spacing={0.5}>
                                                <Chip label={order.paymentMethod} size="small" variant="outlined" sx={{ fontSize: '0.6rem' }} />
                                                <Chip label={order.paymentStatus} size="small" color={order.paymentStatus === 'paid' ? 'success' : 'default'} sx={{ fontSize: '0.6rem' }} />
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={order.status} size="small" color={order.status === 'delivered' ? 'success' : 'warning'} sx={{ fontSize: '0.65rem' }} />
                                        </TableCell>
                                        <TableCell>
                                            {order.trackingUrl ? <Button size="small" href={order.trackingUrl} target="_blank">Track</Button> : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={orders.length}
                        page={deliveryPage}
                        onPageChange={(_, p) => setDeliveryPage(p)}
                        rowsPerPage={deliveryRowsPerPage}
                        onRowsPerPageChange={e => { setDeliveryRowsPerPage(parseInt(e.target.value, 10)); setDeliveryPage(0); }}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </Paper>
            </Box>
        );
    };

    // ─── Root ────────────────────────────────────────────────────────────────
    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <ReceiptLongIcon fontSize="large" color="primary" /> Service Usage
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Audit third-party charges — Twilio SMS and delivery providers.
                    </Typography>
                </Box>

                {/* Period picker */}
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Period</InputLabel>
                        <Select value={period} label="Period" onChange={e => setPeriod(e.target.value)}>
                            <MenuItem value="today">Today</MenuItem>
                            <MenuItem value="last7days">Last 7 Days</MenuItem>
                            <MenuItem value="thisMonth">This Month</MenuItem>
                            <MenuItem value="custom">Custom Range</MenuItem>
                        </Select>
                    </FormControl>
                    {period === 'custom' && (
                        <Stack direction="row" spacing={1}>
                            <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </Stack>
                    )}
                </Paper>
            </Box>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{
                    mb: 3,
                    '& .MuiTab-root': { fontWeight: 700, borderRadius: 2, minHeight: 44, px: 3 },
                    '& .Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                }}
            >
                <Tab icon={<ReceiptLongIcon />} iconPosition="start" label="Messages" />
                <Tab icon={<LocalShippingIcon />} iconPosition="start" label="Delivery Reports" />
            </Tabs>

            {activeTab === 0 && renderSmsUsage()}
            {activeTab === 1 && renderDeliveryReport()}

            {/* Test SMS Dialog */}
            <Dialog open={testSmsOpen} onClose={() => setTestSmsOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Send Test Message</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Verify your Twilio integration by sending a manual message.
                    </Typography>
                    <TextField fullWidth label="Recipient Number" placeholder="+1234567890" value={testSmsTo} onChange={e => setTestSmsTo(e.target.value)} sx={{ mb: 2 }} />
                    <TextField fullWidth multiline rows={3} label="Message Body" value={testSmsMessage} onChange={e => setTestSmsMessage(e.target.value)} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setTestSmsOpen(false)}>Cancel</Button>
                    <Button variant="contained" startIcon={<SendIcon />} onClick={handleSendTestSms}>Send</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ServiceUsagePage;
