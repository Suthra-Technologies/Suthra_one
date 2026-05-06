import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, alpha, useTheme,
    Button, Stack, Chip, TablePagination, Tooltip,
    FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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

const EmailLogsDetailPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { tenantId } = useParams();
    const [searchParams] = useSearchParams();
    const storeName = searchParams.get('name') || 'Store';

    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [total, setTotal] = useState(0);
    const [typeFilter, setTypeFilter] = useState('');

    const fetchLogs = async (p: number, r: number) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('jwt');
            const params: any = { page: p + 1, limit: r };
            if (typeFilter) params.type = typeFilter;
            const res = await axios.get(`${API_URL}/api/superadmin/email/logs/${tenantId}`, {
                params,
                headers: { Authorization: `Bearer ${token}` },
            });
            setLogs(res.data.logs);
            setTotal(res.data.total);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load email logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(page, rowsPerPage);
    }, [page, rowsPerPage, tenantId, typeFilter]);

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ mb: 4 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(`/superadmin/tenants/${tenantId}`)}
                    sx={{ mb: 2 }}
                >
                    Back to Details
                </Button>
                <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <EmailIcon sx={{ color: '#6366f1' }} /> Email Logs: {storeName}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Detailed email communication history for this store.
                </Typography>
            </Box>

            {/* Toolbar */}
            <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Email Type</InputLabel>
                    <Select
                        value={typeFilter}
                        label="Email Type"
                        onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
                    >
                        <MenuItem value="">All Types</MenuItem>
                        {Object.entries(EMAIL_TYPE_LABELS).map(([k, v]) => (
                            <MenuItem key={k} value={k}>{v}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>To</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Provider</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                        <Typography color="text.secondary">No email logs found</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : logs.map((log) => {
                                const isFailed = log.status === 'FAILED';
                                return (
                                    <TableRow
                                        key={log._id}
                                        hover
                                        sx={{
                                            borderLeft: isFailed ? `3px solid ${theme.palette.error.main}` : '3px solid transparent',
                                            bgcolor: isFailed ? alpha(theme.palette.error.main, 0.03) : undefined,
                                        }}
                                    >
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            <Typography variant="body2" fontWeight={500}>
                                                {new Date(log.createdAt).toLocaleDateString()}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(log.createdAt).toLocaleTimeString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={EMAIL_TYPE_LABELS[log.type] ?? log.type ?? 'General'}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', maxWidth: 180 }}>
                                            <Tooltip title={log.to}>
                                                <Typography variant="caption" noWrap>{log.to}</Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 250 }}>
                                            <Tooltip title={log.subject || ''}>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        lineHeight: 1.3,
                                                    }}
                                                >
                                                    {log.subject}
                                                </Typography>
                                            </Tooltip>
                                            {isFailed && log.error && (
                                                <Typography
                                                    variant="caption"
                                                    color="error.main"
                                                    sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.62rem', mt: 0.25 }}
                                                >
                                                    ↳ {log.error}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <Chip
                                                    label={log.status}
                                                    size="small"
                                                    color={isFailed ? 'error' : 'success'}
                                                    sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                                                />
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                                                {log.provider ?? 'smtp'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={total}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[25, 50, 100]}
                />
            </Paper>
        </Box>
    );
};

export default EmailLogsDetailPage;
