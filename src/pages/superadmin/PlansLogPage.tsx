import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, alpha, useTheme, Stack, Chip,
    Card, CardContent, Grid, TablePagination,
} from '@mui/material';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import { superAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const PlansLogPage: React.FC = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState<any[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await superAPI.listPlans();
            setPlans(res.data || []);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPlans(); }, []);

    const paginated = plans.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const totals = {
        total: plans.length,
        active: plans.filter(p => p.isActive !== false).length,
        subscription: plans.filter(p => p.type === 'subscription').length,
        topup: plans.filter(p => p.type === 'topup').length,
    };

    return (
        <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, pb: { xs: 2, sm: 3 }, pt: { xs: 1, sm: 2, md: 3 } }}>
            <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' }, mb: 0.5 }}>
                    <CardMembershipIcon sx={{ fontSize: { xs: 24, sm: 30, md: 35 } }} color="success" /> Subscription Plans Log
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Overview of all subscription plans configured on the platform.
                </Typography>
            </Box>

            <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
                {[
                    { label: 'Total Plans', value: totals.total, color: '#6366f1' },
                    { label: 'Active', value: totals.active, color: '#22c55e' },
                    { label: 'Subscription', value: totals.subscription, color: '#3b82f6' },
                    { label: 'Top-Up', value: totals.topup, color: '#f59e0b' },
                ].map((kpi) => (
                    <Grid item xs={6} sm={3} key={kpi.label}>
                        <Paper elevation={0} sx={{
                            p: { xs: 1.5, sm: 2, md: 2.5 },
                            borderRadius: { xs: 2, md: 4 },
                            border: '1px solid', borderColor: 'divider',
                            borderLeft: `4px solid ${kpi.color}`,
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
                {/* Desktop table */}
                <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Table>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Plan Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Interval</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>SMS Limit</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Email Limit</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Updated By</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
                            ) : paginated.length === 0 ? (
                                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No plans found</Typography></TableCell></TableRow>
                            ) : paginated.map((plan) => {
                                const updater = plan.updatedBy;
                                const updaterName = updater
                                    ? `${updater.firstName || ''} ${updater.lastName || ''}`.trim() || updater.email
                                    : null;
                                return (
                                <TableRow key={plan._id} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: alpha(theme.palette.success.main, 0.08), color: 'success.main' }}>
                                                <CardMembershipIcon sx={{ fontSize: 16 }} />
                                            </Box>
                                            <Typography variant="subtitle2" fontWeight="bold">{plan.name}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={plan.type || 'subscription'} size="small" color={plan.type === 'topup' ? 'warning' : 'primary'} variant="outlined" />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold" color="success.main">
                                            ${Number(plan.price || 0).toFixed(2)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell><Typography variant="body2">{plan.interval || '—'}</Typography></TableCell>
                                    <TableCell>
                                        <Chip label={plan.isActive !== false ? 'Active' : 'Inactive'} size="small" color={plan.isActive !== false ? 'success' : 'default'} sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell><Typography variant="body2">{plan.maxSms ?? '—'}</Typography></TableCell>
                                    <TableCell><Typography variant="body2">{plan.maxEmail ?? '—'}</Typography></TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {updaterName
                                            ? <Chip label={updaterName} size="small" variant="outlined" color="secondary" sx={{ fontWeight: 600 }} />
                                            : <Typography variant="body2" color="text.secondary">—</Typography>}
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Mobile cards */}
                <Box sx={{ display: { xs: 'block', md: 'none' }, p: 1 }}>
                    {loading ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
                    ) : paginated.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}><Typography color="text.secondary">No plans found</Typography></Box>
                    ) : paginated.map((plan) => {
                        const updater = plan.updatedBy;
                        const updaterName = updater
                            ? `${updater.firstName || ''} ${updater.lastName || ''}`.trim() || updater.email
                            : null;
                        return (
                        <Card key={plan._id} elevation={0} sx={{ mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                    <Typography fontWeight="bold">{plan.name}</Typography>
                                    <Chip label={plan.isActive !== false ? 'Active' : 'Inactive'} size="small" color={plan.isActive !== false ? 'success' : 'default'} sx={{ fontWeight: 'bold' }} />
                                </Stack>
                                <Stack direction="row" spacing={1} flexWrap="wrap" mb={0.5}>
                                    <Chip label={plan.type || 'subscription'} size="small" color={plan.type === 'topup' ? 'warning' : 'primary'} variant="outlined" />
                                    <Typography variant="body2" fontWeight="bold" color="success.main">${Number(plan.price || 0).toFixed(2)} / {plan.interval}</Typography>
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                    Created: {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : '—'}
                                </Typography>
                                {updaterName && (
                                    <Stack direction="row" spacing={0.5} alignItems="center" mt={1}>
                                        <Typography variant="caption" color="text.secondary">Updated by:</Typography>
                                        <Chip label={updaterName} size="small" variant="outlined" color="secondary" sx={{ fontWeight: 600 }} />
                                    </Stack>
                                )}
                            </CardContent>
                        </Card>
                        );
                    })}
                </Box>

                <TablePagination
                    component="div"
                    count={plans.length}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[25, 50, 100]}
                />
            </Paper>
        </Box>
    );
};

export default PlansLogPage;
