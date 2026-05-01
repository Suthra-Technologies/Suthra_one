import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, IconButton, CircularProgress, alpha, useTheme,
    Button, Stack, Chip, Card, CardContent, Grid, TablePagination
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
    const [mobilePage, setMobilePage] = useState(0);
    const [mobileRowsPerPage, setMobileRowsPerPage] = useState(10);

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
    
    const paginatedMobileData = usageData.slice(
        mobilePage * mobileRowsPerPage,
        mobilePage * mobileRowsPerPage + mobileRowsPerPage
    );

    const totals = usageData.reduce((acc, tenant) => {
        acc.total += (tenant.total || 0);
        acc.delivered += (tenant.delivered || 0);
        acc.failed += (tenant.failed || 0);
        acc.cost += (tenant.totalCost || 0);
        return acc;
    }, { total: 0, delivered: 0, failed: 0, cost: 0 });

    return (
        <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, pb: { xs: 2, sm: 3 }, pt: { xs: 1, sm: 2, md: 3 }, overflowX: 'hidden' }}>
            <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                <Typography
                    variant="h4"
                    fontWeight="bold"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: { xs: 'flex-start', sm: 'flex-start' },
                        gap: 1.5,
                        textAlign: 'left',
                        fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' },
                        mb: 0.5
                    }}
                >
                    <ReceiptIcon sx={{ fontSize: { xs: 24, sm: 30, md: 35 } }} color="error" /> SMS Logs Overview
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'left', fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' } }}>
                    View SMS statistics across all restaurant stores.
                </Typography>
            </Box>

            <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
                {[
                    { label: 'Total Messages', value: totals.total, color: '#6366f1' },
                    { label: 'Delivered', value: totals.delivered, color: '#22c55e' },
                    { label: 'Failed', value: totals.failed, color: '#ef4444' },
                    { label: 'Total Charges', value: `$${totals.cost.toFixed(2)}`, color: '#f59e0b' },
                ].map((kpi) => (
                    <Grid item xs={6} sm={3} key={kpi.label}>
                        <Paper elevation={0} sx={{ 
                            p: { xs: 1.5, sm: 2, md: 2.5 }, 
                            borderRadius: { xs: 2, md: 4 }, 
                            border: '1px solid', borderColor: 'divider',
                            borderLeft: `4px solid ${kpi.color}`,
                            height: '100%'
                        }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', mb: 0.5, display: 'block', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                                {kpi.label}
                            </Typography>
                            <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' } }}>{kpi.value}</Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Paper elevation={0} sx={{ borderRadius: { xs: 2, md: 4 }, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
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
                                                <StoreIcon sx={{ fontSize: 18 }} />
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

                <Box sx={{ display: { xs: 'block', md: 'none' }, p: { xs: 1, sm: 2 } }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={30} />
                        </Box>
                    ) : usageData.length === 0 ? (
                        <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>
                            No store usage found
                        </Typography>
                    ) : (
                        <Stack spacing={1}>
                            {paginatedMobileData.map((tenant) => (
                                <Card key={tenant.tenantId} variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
                                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                                            <Box
                                                sx={{
                                                    p: 0.75,
                                                    borderRadius: 1,
                                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                    color: 'primary.main',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <StoreIcon sx={{ fontSize: 16 }} />
                                            </Box>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ wordBreak: 'break-word', fontSize: '0.85rem', lineHeight: 1.2 }}>
                                                    {tenant.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word', fontSize: '0.7rem' }}>
                                                    {tenant.slug}
                                                </Typography>
                                            </Box>
                                            <IconButton 
                                                size="small" 
                                                color="primary"
                                                onClick={() => navigate(`/superadmin/sms-logs/${tenant.tenantId}?name=${encodeURIComponent(tenant.name)}`)}
                                                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}
                                            >
                                                <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>

                                        <Box sx={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(2, 1fr)', 
                                            gap: 1.5,
                                            p: 1.25,
                                            borderRadius: 1,
                                            bgcolor: alpha(theme.palette.action.hover, 0.3)
                                        }}>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>Total Msgs</Typography>
                                                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{tenant.total}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>Cost</Typography>
                                                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'primary.main' }}>
                                                    ${tenant.totalCost.toFixed(4)}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', mb: 0.25 }}>Delivered</Typography>
                                                <Chip label={tenant.delivered} size="small" color="success" sx={{ fontWeight: 800, height: 20, fontSize: '0.7rem' }} />
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', mb: 0.25 }}>Failed</Typography>
                                                <Chip label={tenant.failed} size="small" color="error" sx={{ fontWeight: 800, height: 20, fontSize: '0.7rem' }} />
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    )}
                    {!loading && usageData.length > 0 && (
                        <TablePagination
                            component="div"
                            count={usageData.length}
                            page={mobilePage}
                            onPageChange={(_, page) => setMobilePage(page)}
                            rowsPerPage={mobileRowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setMobileRowsPerPage(parseInt(e.target.value, 10));
                                setMobilePage(0);
                            }}
                            rowsPerPageOptions={[5, 10, 25]}
                            sx={{
                                mt: 0.5,
                                '& .MuiTablePagination-toolbar': {
                                    px: 0,
                                    minHeight: 48,
                                    flexWrap: 'nowrap',
                                    justifyContent: 'center',
                                },
                                '& .MuiTablePagination-spacer': {
                                    display: { xs: 'none', sm: 'block' },
                                },
                                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                    m: 0,
                                    fontSize: '0.75rem',
                                },
                                '& .MuiTablePagination-actions': {
                                    ml: 0.5
                                }
                            }}
                        />
                    )}
                </Box>
            </Paper>
        </Box>
    );
};

export default SmsOverviewPage;
