import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, IconButton, CircularProgress, alpha, useTheme,
    Button, Stack, Chip, Grid
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StoreIcon from '@mui/icons-material/Store';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5006';

const SmsOverviewPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [usageData, setUsageData] = useState<any[]>([]);

    const fetchUsage = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('jwt');
            const res = await axios.get(`${API_URL}/api/superadmin/sms/overview`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsageData(res.data);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load SMS usage overview');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsage();
    }, []);

    const totals = usageData.reduce((acc, tenant) => {
        acc.total += (tenant.total || 0);
        acc.delivered += (tenant.delivered || 0);
        acc.failed += (tenant.failed || 0);
        acc.cost += (tenant.totalCost || 0);
        return acc;
    }, { total: 0, delivered: 0, failed: 0, cost: 0 });

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ReceiptIcon fontSize="large" color="error" /> SMS Logs Overview
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    View SMS statistics across all restaurant stores.
                </Typography>
            </Box>

            <Grid container spacing={2} sx={{ mb: 4 }}>
                {[
                    { label: 'Total Messages', value: totals.total, color: '#6366f1' },
                    { label: 'Delivered', value: totals.delivered, color: '#22c55e' },
                    { label: 'Failed', value: totals.failed, color: '#ef4444' },
                    { label: 'Total Charges', value: `$${totals.cost.toFixed(2)}`, color: '#f59e0b' },
                ].map((kpi) => (
                    <Grid size={{ xs: 6, sm: 3 }} key={kpi.label}>
                        <Paper elevation={0} sx={{ 
                            p: 2.5, borderRadius: 4, border: '1px solid', borderColor: 'divider',
                            borderLeft: `4px solid ${kpi.color}`
                        }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
                                {kpi.label}
                            </Typography>
                            <Typography variant="h5" fontWeight={800}>{kpi.value}</Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Store Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Total Messages</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Delivered</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Failed</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Total Cost</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : usageData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                        <Typography color="text.secondary">No store usage found</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : usageData.map((tenant) => (
                                <TableRow key={tenant.tenantId} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Box sx={{ 
                                                p: 1, 
                                                borderRadius: 1, 
                                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                color: 'primary.main'
                                            }}>
                                                <StoreIcon size="small" />
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
                                        <Chip label={tenant.delivered} size="small" color="success" sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip label={tenant.failed} size="small" color="error" sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight="bold" color="primary.main">
                                            ${tenant.totalCost.toFixed(4)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Button
                                            size="small"
                                            startIcon={<VisibilityIcon />}
                                            onClick={() => navigate(`/superadmin/sms-logs/${tenant.tenantId}?name=${encodeURIComponent(tenant.name)}`)}
                                            variant="outlined"
                                            sx={{ borderRadius: 2 }}
                                        >
                                            View Logs
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default SmsOverviewPage;
