import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, alpha, useTheme, Stack, Chip,
    Card, CardContent, Grid, TablePagination, TextField, InputAdornment, IconButton,
} from '@mui/material';
import StoreIcon from '@mui/icons-material/Store';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { superAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';

const statusColor = (active: boolean) => active ? 'success' : 'default';

const StoresLogPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tenantId = searchParams.get('tenantId');
    const storeName = searchParams.get('name') || '';
    const isSingleStore = Boolean(tenantId);

    const [loading, setLoading] = useState(false);
    const [stores, setStores] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const fetchStores = async () => {
        setLoading(true);
        try {
            const res = await superAPI.listTenants({ limit: 500 });
            const all: any[] = res.data.tenants || res.data || [];
            setStores(isSingleStore ? all.filter(s => s._id === tenantId) : all);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load stores');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStores(); }, [tenantId]);

    const filtered = stores.filter(s =>
        !search || s.name?.toLowerCase().includes(search?.toLowerCase()) || s.slug?.toLowerCase().includes(search?.toLowerCase())
    );
    const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const totals = {
        total: stores.length,
        active: stores.filter(s => s.isActive !== false).length,
        inactive: stores.filter(s => s.isActive === false).length,
    };

    return (
        <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, pb: { xs: 2, sm: 3 }, pt: { xs: 1, sm: 2, md: 3 } }}>
            <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                {isSingleStore && (
                    <IconButton onClick={() => navigate(`/superadmin/tenants/${tenantId}`)} sx={{ mr: 1, mb: 0.5 }}>
                        <ArrowBackIcon />
                    </IconButton>
                )}
                <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' }, mb: 0.5 }}>
                    <StoreIcon sx={{ fontSize: { xs: 24, sm: 30, md: 35 } }} color="primary" />
                    {isSingleStore ? `${storeName} — Store Log` : 'Stores Log'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {isSingleStore ? `Store details and registration info for ${storeName}.` : 'Activity log of all registered restaurant stores.'}
                </Typography>
            </Box>

            <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
                {[
                    { label: 'Total Stores', value: totals.total, color: '#6366f1' },
                    { label: 'Active', value: totals.active, color: '#22c55e' },
                    { label: 'Inactive', value: totals.inactive, color: '#ef4444' },
                ].map((kpi) => (
                    <Grid item xs={6} sm={4} key={kpi.label}>
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
                {!isSingleStore && (
                    <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <TextField
                            size="small"
                            placeholder="Search stores…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(0); }}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                            sx={{ width: { xs: '100%', sm: 280 } }}
                        />
                    </Box>
                )}

                {/* Desktop table */}
                <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Table>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Store Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Slug</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Owner Email</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Plan</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Registered</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Subscription Expiry</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Updated By</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Updated At</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
                            ) : paginated.length === 0 ? (
                                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No stores found</Typography></TableCell></TableRow>
                            ) : paginated.map((store) => {
                                const updater = store.subscriptionUpdatedBy;
                                const updaterName = updater
                                    ? `${updater.firstName || ''} ${updater.lastName || ''}`.trim() || updater.email
                                    : null;
                                return (
                                <TableRow key={store._id} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }}>
                                                <StoreIcon sx={{ fontSize: 16 }} />
                                            </Box>
                                            <Typography variant="subtitle2" fontWeight="bold">{store.name}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell><Typography variant="body2" color="text.secondary">{store.slug}</Typography></TableCell>
                                    <TableCell><Typography variant="body2">{store.contactEmail || '—'}</Typography></TableCell>
                                    <TableCell>
                                        {store.subscription?.planName
                                            ? <Chip label={store.subscription.planName} size="small" color="primary" variant="outlined" />
                                            : <Typography variant="body2" color="text.secondary">—</Typography>}
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={store.isActive !== false ? 'Active' : 'Inactive'} size="small" color={statusColor(store.isActive !== false) as any} sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{store.createdAt ? new Date(store.createdAt).toLocaleDateString() : '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{store.subscription?.endDate ? new Date(store.subscription.endDate).toLocaleDateString() : '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {updaterName
                                            ? <Chip label={updaterName} size="small" variant="outlined" color="secondary" sx={{ fontWeight: 600 }} />
                                            : <Typography variant="body2" color="text.secondary">—</Typography>}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{store.subscriptionUpdatedAt ? new Date(store.subscriptionUpdatedAt).toLocaleDateString() : '—'}</Typography>
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
                        <Box sx={{ py: 6, textAlign: 'center' }}><Typography color="text.secondary">No stores found</Typography></Box>
                    ) : paginated.map((store) => {
                        const updater = store.subscriptionUpdatedBy;
                        const updaterName = updater
                            ? `${updater.firstName || ''} ${updater.lastName || ''}`.trim() || updater.email
                            : null;
                        return (
                        <Card key={store._id} elevation={0} sx={{ mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                    <Typography fontWeight="bold">{store.name}</Typography>
                                    <Chip label={store.isActive !== false ? 'Active' : 'Inactive'} size="small" color={statusColor(store.isActive !== false) as any} sx={{ fontWeight: 'bold' }} />
                                </Stack>
                                <Typography variant="caption" color="text.secondary" display="block">{store.slug}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block">{store.contactEmail}</Typography>
                                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                                    {store.subscription?.planName && <Chip label={store.subscription.planName} size="small" color="primary" variant="outlined" />}
                                    <Typography variant="caption" color="text.secondary">
                                        Registered: {store.createdAt ? new Date(store.createdAt).toLocaleDateString() : '—'}
                                    </Typography>
                                </Stack>
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
                    count={filtered.length}
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

export default StoresLogPage;
