import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Grid, Card, CardContent, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TablePagination,
    Chip, Stack, Select, MenuItem, FormControl, InputLabel, TextField,
    Button, alpha,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import SavingsIcon from '@mui/icons-material/Savings';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptIcon from '@mui/icons-material/Receipt';
import StoreIcon from '@mui/icons-material/Store';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { TableSkeleton } from '../../components/common/PageSkeleton';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5006';

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

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

const DeliveryReportsPage: React.FC = () => {
    const token = localStorage.getItem('jwt');
    const headers = { Authorization: `Bearer ${token}` };

    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState('thisMonth');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [provider, setProvider] = useState('all');
    const [data, setData] = useState<any>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const fetchReport = useCallback(async (overrides: any = {}) => {
        setLoading(true);
        try {
            const params: any = {
                period: overrides.period ?? period,
                provider: overrides.provider ?? provider,
                page: overrides.page ?? page + 1,
                limit: overrides.rowsPerPage ?? rowsPerPage,
            };
            if ((overrides.period ?? period) === 'custom') {
                params.startDate = overrides.startDate ?? startDate;
                params.endDate = overrides.endDate ?? endDate;
            }
            const res = await axios.get(`${API_URL}/api/superadmin/delivery-reports`, { params, headers });
            setData(res.data);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load delivery reports');
        } finally {
            setLoading(false);
        }
    }, [period, provider, page, rowsPerPage, startDate, endDate]);

    useEffect(() => { fetchReport(); }, [period, provider, page, rowsPerPage]);

    const handleExport = () => {
        if (!data?.orders?.length) { toast.error('No data to export'); return; }
        const rows = (data?.orders || []).map((o: any) => ({
            'Store': o.storeName,
            'Order #': o.orderNumber,
            'Date': o.date ? new Date(o.date).toLocaleString() : '',
            'Provider': providerLabel(o.provider),
            'Customer': o.customerName,
            'Delivery Address': o.deliveryAddress,
            'Subtotal': o.subtotal,
            'Delivery Charge': o.deliveryCharge,
            'Tip': o.tip,
            'Tax': o.tax,
            'Processing Fee': o.processingFee,
            'Total': o.totalAmount,
            'Payment Method': o.paymentMethod,
            'Payment Status': o.paymentStatus,
            'Order Status': o.status,
            'Tracking URL': o.trackingUrl || '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Delivery Reports');
        XLSX.writeFile(wb, `delivery-reports-${period}-${Date.now()}.xlsx`);
    };

    const summary = data?.summary;
    const orders: any[] = data?.orders || [];

    const summaryCards = [
        { label: 'Total Orders', value: summary?.totalOrders ?? 0, isCurrency: false, icon: <ShoppingCartIcon />, color: '#6366f1' },
        { label: 'DoorDash Orders', value: summary?.doordashOrders ?? 0, isCurrency: false, icon: <LocalShippingIcon />, color: '#ef4444' },
        { label: 'Uber Eats Orders', value: summary?.uberEatsOrders ?? 0, isCurrency: false, icon: <TwoWheelerIcon />, color: '#22c55e' },
        { label: 'Total Revenue', value: summary?.totalRevenue ?? 0, isCurrency: true, icon: <TrendingUpIcon />, color: '#3b82f6' },
        { label: 'Delivery Charges', value: summary?.totalDeliveryCharges ?? 0, isCurrency: true, icon: <RequestQuoteIcon />, color: '#f59e0b' },
        { label: 'Total Tips', value: summary?.totalTips ?? 0, isCurrency: true, icon: <SavingsIcon />, color: '#06b6d4' },
        { label: 'Total Tax', value: summary?.totalTax ?? 0, isCurrency: true, icon: <AccountBalanceIcon />, color: '#8b5cf6' },
        { label: 'Processing Fees', value: summary?.totalProcessingFee ?? 0, isCurrency: true, icon: <ReceiptIcon />, color: '#ec4899' },
    ];

    return (
        <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, pb: { xs: 1.5, sm: 2, md: 3 }, pt: { xs: 0.5, sm: 2, md: 3 }, overflowX: 'hidden' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
                <Box>
                    <Typography
                        variant="h4"
                        fontWeight="bold"
                        sx={{ textAlign: { xs: 'center', sm: 'left' }, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
                    >
                        Delivery Reports
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        All DoorDash & Uber Eats deliveries across all stores
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleExport}
                    sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' }, width: { xs: '100%', sm: 'auto' } }}
                >
                    Export Excel
                </Button>
            </Stack>

            {/* Filters */}
            <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Time Period</InputLabel>
                            <Select value={period} label="Time Period" onChange={(e) => { setPeriod(e.target.value); setPage(0); }}>
                                <MenuItem value="today">Today</MenuItem>
                                <MenuItem value="last7days">Last 7 Days</MenuItem>
                                <MenuItem value="thisMonth">This Month</MenuItem>
                                <MenuItem value="custom">Custom Range</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    {period === 'custom' && (
                        <>
                            <Grid item xs={12} sm={6} md={2}>
                                <TextField fullWidth size="small" label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <TextField fullWidth size="small" label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                            </Grid>
                        </>
                    )}
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Provider</InputLabel>
                            <Select value={provider} label="Provider" onChange={(e) => { setProvider(e.target.value); setPage(0); }}>
                                <MenuItem value="all">All Providers</MenuItem>
                                <MenuItem value="doordash">DoorDash</MenuItem>
                                <MenuItem value="ubereats">Uber Eats</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    {period === 'custom' && (
                        <Grid item xs={12} sm={6} md={2}>
                            <Button fullWidth variant="outlined" onClick={() => fetchReport()}>Apply</Button>
                        </Grid>
                    )}
                </Grid>
            </Paper>

            {/* Summary Cards */}
            <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 3 }}>
                {summaryCards.map((card) => (
                    <Grid item xs={6} sm={4} md={3} key={card.label}>
                        <Card variant="outlined" sx={{ height: { xs: 116, sm: 110 }, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, borderColor: alpha(card.color, 0.3), bgcolor: alpha(card.color, 0.04) }}>
                            <CardContent sx={{ p: '12px !important', textAlign: 'center', width: '100%' }}>
                                <Box sx={{ color: card.color, mb: 0.5, display: 'flex', justifyContent: 'center', '& svg': { fontSize: { xs: 24, sm: 28 } } }}>
                                    {card.icon}
                                </Box>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2, mb: 0.5, fontSize: { xs: '0.68rem', sm: '0.75rem' } }}>
                                    {card.label}
                                </Typography>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: card.color, lineHeight: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    {card.isCurrency ? formatCurrency(card.value) : card.value}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Orders Table */}
            <Paper sx={{ overflowX: 'hidden' }}>
                {loading ? (
                    <TableSkeleton rows={8} columns={15} />
                ) : (
                    <>
                        <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                            <Table size="small" sx={{ minWidth: 1200 }}>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                                        <TableCell><strong>Store</strong></TableCell>
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
                                    {orders.map((order: any, idx: number) => (
                                        <TableRow key={`${order.storeSlug}-${order.orderNumber}-${idx}`} hover>
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                                    <StoreIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                    <Typography variant="body2" fontWeight="medium">{order.storeName}</Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{order.orderNumber}</TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                {order.date ? new Date(order.date).toLocaleDateString() : '-'}
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    {order.date ? new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={providerLabel(order.provider)} size="small" sx={{ bgcolor: providerColor(order.provider), color: '#fff', fontWeight: 'bold' }} />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{order.customerName}</Typography>
                                                {order.customerPhone && <Typography variant="caption" color="text.secondary">{order.customerPhone}</Typography>}
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
                                                    <Chip label={order.paymentStatus} size="small" color={order.paymentStatus === 'paid' || order.paymentStatus === 'completed' ? 'success' : 'default'} />
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={order.status} size="small" color={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : 'warning'} />
                                            </TableCell>
                                            <TableCell>
                                                {order.trackingUrl ? (
                                                    <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>Track</a>
                                                ) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {orders.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={15} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                                No delivery orders found for the selected period
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Box sx={{ display: { xs: 'block', md: 'none' }, p: 1.5 }}>
                            <Stack spacing={1.5}>
                                {orders.map((order: any, idx: number) => (
                                    <Card key={`${order.storeSlug}-${order.orderNumber}-${idx}`} variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardContent sx={{ p: 1.5 }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {order.orderNumber}
                                                </Typography>
                                                <Chip label={providerLabel(order.provider)} size="small" sx={{ bgcolor: providerColor(order.provider), color: '#fff', fontWeight: 'bold' }} />
                                            </Stack>

                                            <Typography variant="body2" fontWeight="medium" sx={{ wordBreak: 'break-word' }}>
                                                {order.storeName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                                {order.date ? new Date(order.date).toLocaleString() : '-'}
                                            </Typography>

                                            <Grid container spacing={1}>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">Customer</Typography>
                                                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                                        {order.customerName || '-'}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">Total</Typography>
                                                    <Typography variant="body2" fontWeight="bold">{formatCurrency(order.totalAmount)}</Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">Payment</Typography>
                                                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                                        {order.paymentMethod || '-'}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">Status</Typography>
                                                    <Box>
                                                        <Chip label={order.status} size="small" color={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : 'warning'} />
                                                    </Box>
                                                </Grid>
                                            </Grid>

                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, wordBreak: 'break-word' }}>
                                                {order.deliveryAddress || '-'}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                ))}
                                {orders.length === 0 && (
                                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
                                        No delivery orders found for the selected period
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                        <TablePagination
                            component="div"
                            count={data?.total || 0}
                            page={page}
                            onPageChange={(_, p) => setPage(p)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            sx={{
                                '& .MuiTablePagination-toolbar': {
                                    px: { xs: 1, sm: 2 },
                                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                                    rowGap: { xs: 1, sm: 0 },
                                    justifyContent: { xs: 'center', sm: 'flex-end' },
                                },
                                '& .MuiTablePagination-spacer': {
                                    display: { xs: 'none', sm: 'block' },
                                },
                                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                    m: 0,
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                },
                            }}
                        />
                    </>
                )}
            </Paper>
        </Box>
    );
};

export default DeliveryReportsPage;
