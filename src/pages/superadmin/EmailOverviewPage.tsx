import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, alpha, useTheme,
    Button, Stack, Chip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StoreIcon from '@mui/icons-material/Store';
import EmailIcon from '@mui/icons-material/Email';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5006';

const EMAIL_TYPE_LABELS: Record<string, string> = {
    ORDER_CONFIRMATION: 'Order Confirmation',
    ORDER_UPDATE: 'Order Update',
    PAYMENT: 'Payment',
    AUTH: 'Auth / Credentials',
    CATERING: 'Catering',
    PROMO: 'Promo',
    REWARDS: 'Rewards',
    GENERAL: 'General',
};

const EmailOverviewPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [usageData, setUsageData] = useState<any[]>([]);

    const fetchUsage = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('jwt');
            const res = await axios.get(`${API_URL}/api/superadmin/email/overview`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsageData(res.data);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load email usage overview');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsage();
    }, []);

    const totals = usageData.reduce(
        (acc, t) => ({ 
            total: acc.total + t.total, 
            sent: acc.sent + t.sent, 
            failed: acc.failed + t.failed,
            cost: acc.cost + (t.totalCost || 0)
        }),
        { total: 0, sent: 0, failed: 0, cost: 0 },
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <EmailIcon fontSize="large" sx={{ color: '#6366f1' }} /> Email Logs Overview
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    View SMTP email statistics across all restaurant stores.
                </Typography>
            </Box>

            {/* Platform-wide KPI strip */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
                {[
                    { label: 'Total Emails', value: totals.total.toLocaleString(), color: '#6366f1', icon: <EmailIcon /> },
                    { label: 'Delivered', value: totals.sent.toLocaleString(), color: '#22c55e', icon: <MarkEmailReadIcon /> },
                    { label: 'Failed', value: totals.failed.toLocaleString(), color: '#ef4444', icon: <EmailIcon /> },
                    { label: 'Total Charges', value: `$${(Number(totals.cost) || 0).toFixed(2)}`, color: '#f59e0b', icon: <AttachMoneyIcon /> },
                ].map(kpi => (
                    <Paper key={kpi.label} elevation={0} sx={{
                        flex: 1, p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider',
                        borderLeft: `4px solid ${kpi.color}`, display: 'flex', alignItems: 'center', gap: 1.5,
                    }}>
                        <Box sx={{ color: kpi.color }}>{kpi.icon}</Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {kpi.label}
                            </Typography>
                            <Typography variant="h5" fontWeight={800}>{kpi.value}</Typography>
                        </Box>
                    </Paper>
                ))}
            </Stack>

            {/* Per-tenant table */}
            <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Store</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Total</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Delivered</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Failed</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Success %</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Charges</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Email Types</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : usageData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                        <Typography color="text.secondary">No store email data found</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : usageData.map((tenant) => {
                                const rate = tenant.total > 0 ? Math.round((tenant.sent / tenant.total) * 100) : 0;
                                return (
                                    <TableRow key={tenant.tenantId} hover>
                                        <TableCell>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Box sx={{
                                                    p: 1, borderRadius: 1,
                                                    bgcolor: alpha('#6366f1', 0.08),
                                                    color: '#6366f1',
                                                    display: 'flex',
                                                }}>
                                                    <StoreIcon fontSize="small" />
                                                </Box>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight="bold">{tenant.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{tenant.slug}</Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight="bold">{tenant.total}</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip label={tenant.sent} size="small" color="success" sx={{ fontWeight: 'bold' }} />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={tenant.failed}
                                                size="small"
                                                color={tenant.failed > 0 ? 'error' : 'default'}
                                                sx={{ fontWeight: 'bold' }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography
                                                variant="body2"
                                                fontWeight="bold"
                                                color={rate >= 90 ? 'success.main' : rate >= 70 ? 'warning.main' : 'error.main'}
                                            >
                                                {rate}%
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight="bold" color="primary.main">
                                                ${(Number(tenant.totalCost) || 0).toFixed(4)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                                {(tenant.byType || []).slice(0, 4).map((t: any) => (
                                                    <Chip
                                                        key={t._id}
                                                        label={`${EMAIL_TYPE_LABELS[t._id] ?? t._id}: ${t.count}`}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ fontSize: '0.6rem', fontWeight: 600 }}
                                                    />
                                                ))}
                                                {(tenant.byType || []).length > 4 && (
                                                    <Chip label={`+${tenant.byType.length - 4}`} size="small" sx={{ fontSize: '0.6rem' }} />
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button
                                                size="small"
                                                startIcon={<VisibilityIcon />}
                                                onClick={() => navigate(`/superadmin/email-logs/${tenant.tenantId}?name=${encodeURIComponent(tenant.name)}`)}
                                                variant="outlined"
                                                sx={{ borderRadius: 2, borderColor: '#6366f1', color: '#6366f1', '&:hover': { borderColor: '#4f46e5', bgcolor: alpha('#6366f1', 0.06) } }}
                                            >
                                                View Logs
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default EmailOverviewPage;
