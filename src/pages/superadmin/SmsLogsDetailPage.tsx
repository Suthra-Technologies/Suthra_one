import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, IconButton, CircularProgress, alpha, useTheme,
    Button, Stack, Chip, TablePagination, Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { TableSkeleton } from '../../components/common/PageSkeleton';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5006';

const SmsLogsDetailPage: React.FC = () => {
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

    const fetchLogs = async (p: number, r: number) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('jwt');
            const res = await axios.get(`${API_URL}/api/superadmin/sms/logs/${tenantId}`, {
                params: { page: p + 1, limit: r },
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(res.data.logs);
            setTotal(res.data.total);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load SMS logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(page, rowsPerPage);
    }, [page, rowsPerPage, tenantId]);

    const handleCopySid = (sid: string) => {
        navigator.clipboard.writeText(sid);
        toast.success('SID copied to clipboard');
    };

    if (loading && logs.length === 0) {
        return <TableSkeleton rows={8} columns={7} />;
    }

    return (
        <Box sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 }, pt: { xs: 0.75, md: 3 } }}>
            <Box sx={{ mb: 4 }}>
                <Button 
                    startIcon={<ArrowBackIcon />} 
                    onClick={() => navigate(`/superadmin/tenants/${tenantId}`)}
                    sx={{ mb: 2 }}
                >
                    Back to Details
                </Button>
                <Typography variant="h4" fontWeight="bold">
                    SMS Logs: {storeName}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Detailed communication history for this store.
                </Typography>
            </Box>

            <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Recipient</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Cost</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Message Body</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                        <Typography color="text.secondary">No logs found</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : logs.map((log) => (
                                <TableRow key={log._id} hover>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        <Typography variant="body2" fontWeight={500}>{new Date(log.createdAt).toLocaleDateString()}</Typography>
                                        <Typography variant="caption" color="text.secondary">{new Date(log.createdAt).toLocaleTimeString()}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={log.type} 
                                            size="small" 
                                            variant="outlined" 
                                            sx={{ fontSize: '0.65rem', fontWeight: 'bold' }} 
                                        />
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{log.to}</TableCell>
                                    <TableCell>
                                        {log.metadata?.orderNumber ? (
                                            <Typography variant="body2" fontWeight="bold">
                                                #{log.metadata.orderNumber}
                                            </Typography>
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">-</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Chip
                                                label={log.status}
                                                size="small"
                                                color={log.status === 'DELIVERED' || log.status === 'SENT' ? 'success' : 'error'}
                                                sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                                            />
                                            {log.sid && (
                                                <Tooltip title="Copy SID">
                                                    <IconButton size="small" onClick={() => handleCopySid(log.sid)}>
                                                        <ContentCopyIcon sx={{ fontSize: 12 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                        ${(Number(log.cost) || 0).toFixed(4)}
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 250 }}>
                                        <Tooltip title={log.body || ''}>
                                            <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    lineHeight: 1.2
                                                }}
                                            >
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

export default SmsLogsDetailPage;
