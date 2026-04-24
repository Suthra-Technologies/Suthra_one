import React, { useState, useEffect } from 'react';
import { alpha } from '@mui/material/styles';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    CircularProgress,
    useTheme,
    Tabs,
    Tab,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Card,
    CardContent,
    TextField,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
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
import { smsAPI, reportsAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const ServiceUsagePage: React.FC = () => {
    const theme = useTheme();
    const { formatCurrency } = useSettings();
    const [activeTab, setActiveTab] = useState(0);
    const [period, setPeriod] = useState<string>('today');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // SMS States
    const [smsLogs, setSmsLogs] = useState<any[]>([]);
    const [smsPage, setSmsPage] = useState(0);
    const [smsRowsPerPage, setSmsRowsPerPage] = useState(10);
    const [smsTotal, setSmsTotal] = useState(0);
    const [smsSummary, setSmsSummary] = useState<any[]>([]);
    const [smsLoading, setSmsLoading] = useState(false);
    const [testSmsOpen, setTestSmsOpen] = useState(false);
    const [testSmsTo, setTestSmsTo] = useState('');
    const [testSmsMessage, setTestSmsMessage] = useState('Hello from Suthra POS! Your Twilio SMS integration is working correctly.');

    // Delivery States
    const [deliveryReport, setDeliveryReport] = useState<any>(null);
    const [deliveryProviderFilter, setDeliveryProviderFilter] = useState<string>('all');
    const [deliveryPage, setDeliveryPage] = useState(0);
    const [deliveryRowsPerPage, setDeliveryRowsPerPage] = useState(10);
    const [deliveryLoading, setDeliveryLoading] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5006';
    const token = localStorage.getItem('jwt');
    const headers = { Authorization: `Bearer ${token}` };

    const fetchSmsData = async (page: number, limit: number) => {
        try {
            setSmsLoading(true);
            const [logsRes, summaryRes] = await Promise.all([
                smsAPI.getLogs({ page: page + 1, limit }),
                smsAPI.getSummary()
            ]);
            setSmsLogs(logsRes.data.logs || []);
            setSmsTotal(logsRes.data.total || 0);
            setSmsSummary(summaryRes.data || []);
        } catch (error) {
            console.error('Error fetching SMS data:', error);
        } finally {
            setSmsLoading(false);
        }
    };

    const fetchDeliveryData = async () => {
        try {
            setDeliveryLoading(true);
            const params: any = { period, provider: deliveryProviderFilter };
            if (period === 'custom' && startDate && endDate) {
                params.startDate = new Date(startDate).toISOString();
                params.endDate = new Date(endDate).toISOString();
            }
            const res = await reportsAPI.getDeliveryReport(params);
            setDeliveryReport(res.data);
        } catch (error) {
            console.error('Error fetching delivery report:', error);
        } finally {
            setDeliveryLoading(false);
        }
    };

    const handleSendTestSms = async () => {
        if (!testSmsTo) return toast.error('Recipient number is required');
        try {
            await smsAPI.sendTest(testSmsTo, testSmsMessage);
            toast.success('Test SMS sent successfully');
            setTestSmsOpen(false);
            fetchSmsData(smsPage, smsRowsPerPage);
        } catch (error) {
            toast.error('Failed to send test SMS');
        }
    };

    const downloadExcel = async (reportType: string) => {
        try {
            const params: any = { reportType, period };
            if (period === 'custom' && startDate && endDate) {
                params.startDate = startDate;
                params.endDate = endDate;
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
            toast.success('Report downloaded!');
        } catch (error) {
            toast.error('Failed to download report');
        }
    };

    useEffect(() => {
        if (activeTab === 0) fetchSmsData(smsPage, smsRowsPerPage);
        if (activeTab === 1) fetchDeliveryData();
    }, [activeTab, smsPage, smsRowsPerPage, period, startDate, endDate, deliveryProviderFilter]);

    const renderSmsUsage = () => (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                    variant="contained" 
                    startIcon={<SendIcon />} 
                    onClick={() => setTestSmsOpen(true)}
                    sx={{ borderRadius: 2 }}
                >
                    Send Test Message
                </Button>
            </Box>
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {smsSummary.map((stat: any) => (
                    <Grid item xs={12} sm={4} key={stat._id}>
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                p: 3, 
                                borderRadius: 4, 
                                border: '1px solid', 
                                borderColor: 'divider',
                                bgcolor: alpha(stat._id === 'FAILED' ? '#ef4444' : '#4f46e5', 0.03),
                                textAlign: 'center' 
                            }}
                        >
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>
                                {stat._id} Messages
                            </Typography>
                            <Typography variant="h3" fontWeight={800} sx={{ my: 1, color: stat._id === 'FAILED' ? 'error.main' : 'primary.main' }}>
                                {stat.count}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                                Total Cost: ${stat.totalCost?.toFixed(4) || '0.0000'}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Recipient</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Cost</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Message</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {smsLoading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8 }}><CircularProgress size={24} /></TableCell></TableRow>
                            ) : smsLogs.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No records found</Typography></TableCell></TableRow>
                            ) : smsLogs.map((log: any) => (
                                <TableRow key={log._id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>{new Date(log.createdAt).toLocaleDateString()}</Typography>
                                        <Typography variant="caption" color="text.secondary">{new Date(log.createdAt).toLocaleTimeString()}</Typography>
                                    </TableCell>
                                    <TableCell><Chip label={log.type} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} /></TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{log.to}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={log.status}
                                            size="small"
                                            color={log.status === 'DELIVERED' || log.status === 'SENT' ? 'success' : 'error'}
                                            sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                                        />
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                        ${log.cost?.toFixed(4) || '0.0000'}
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 200 }}>
                                        <Tooltip title={log.body || ''}>
                                            <Typography variant="caption" sx={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {log.body}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={smsTotal}
                    rowsPerPage={smsRowsPerPage}
                    page={smsPage}
                    onPageChange={(_: any, p: number) => setSmsPage(p)}
                    onRowsPerPageChange={(e: any) => { setSmsRowsPerPage(parseInt(e.target.value, 10)); setSmsPage(0); }}
                />
            </Paper>
        </Box>
    );

    const renderDeliveryReport = () => {
        const summary = deliveryReport?.summary;
        const orders: any[] = deliveryReport?.orders || [];
        const paged = orders.slice(deliveryPage * deliveryRowsPerPage, deliveryPage * deliveryRowsPerPage + deliveryRowsPerPage);

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
            <Box>
                <Grid container spacing={2} sx={{ mb: 4 }}>
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
                        <Grid item xs={6} sm={3} md={1.5} key={card.label}>
                            <Card variant="outlined" sx={{ borderRadius: 3, borderColor: alpha(card.color, 0.2), bgcolor: alpha(card.color, 0.02), height: '100%' }}>
                                <CardContent sx={{ textAlign: 'center', p: '12px !important' }}>
                                    <Box sx={{ color: card.color, mb: 0.5, '& svg': { fontSize: 24 } }}>{card.icon}</Box>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.1, mb: 0.5 }}>{card.label}</Typography>
                                    <Typography variant="subtitle1" fontWeight={800} color={card.color} sx={{ lineHeight: 1 }}>
                                        {card.isCurrency ? formatCurrency(card.value) : card.value}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Provider</InputLabel>
                            <Select value={deliveryProviderFilter} label="Provider" onChange={(e) => setDeliveryProviderFilter(e.target.value)}>
                                <MenuItem value="all">All Providers</MenuItem>
                                <MenuItem value="doordash">DoorDash</MenuItem>
                                <MenuItem value="ubereats">Uber Eats</MenuItem>
                            </Select>
                        </FormControl>
                        <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={() => downloadExcel('delivery-report')}>Export Excel</Button>
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
                                                    {order.deliveryAddress || '-'}
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
                                            {order.trackingUrl ? <Button size="small" href={order.trackingUrl} target="_blank">Track</Button> : '-'}
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
                        onPageChange={(_: any, p: number) => setDeliveryPage(p)}
                        rowsPerPage={deliveryRowsPerPage}
                        onRowsPerPageChange={(e: any) => { setDeliveryRowsPerPage(parseInt(e.target.value, 10)); setDeliveryPage(0); }}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </Paper>
            </Box>
        );
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ mb: 4, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <ReceiptLongIcon fontSize="large" color="primary" /> Service Usage
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Audit third-party service costs (Twilio, Uber, DoorDash).
                    </Typography>
                </Box>
                
                <Paper variant="outlined" sx={{ p: 1, borderRadius: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Period</InputLabel>
                        <Select value={period} label="Period" onChange={(e) => setPeriod(e.target.value)}>
                            <MenuItem value="today">Today</MenuItem>
                            <MenuItem value="last7days">Last 7 Days</MenuItem>
                            <MenuItem value="thisMonth">This Month</MenuItem>
                            <MenuItem value="custom">Custom Range</MenuItem>
                        </Select>
                    </FormControl>
                    {period === 'custom' && (
                        <Stack direction="row" spacing={1}>
                            <TextField size="small" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            <TextField size="small" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </Stack>
                    )}
                </Paper>
            </Box>

            <Tabs 
                value={activeTab} 
                onChange={(_, v) => setActiveTab(v)} 
                sx={{ 
                    mb: 4,
                    '& .MuiTab-root': { fontWeight: 700, borderRadius: 2, minHeight: 48, px: 3 },
                    '& .Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
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
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Verify your Twilio integration by sending a manual message.
                    </Typography>
                    <TextField
                        fullWidth
                        label="Recipient Number"
                        placeholder="+1234567890"
                        value={testSmsTo}
                        onChange={(e) => setTestSmsTo(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Message Body"
                        value={testSmsMessage}
                        onChange={(e) => setTestSmsMessage(e.target.value)}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setTestSmsOpen(false)}>Cancel</Button>
                    <Button variant="contained" startIcon={<SendIcon />} onClick={handleSendTestSms}>Send Message</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ServiceUsagePage;
