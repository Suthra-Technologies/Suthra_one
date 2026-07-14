import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, alpha, useTheme, Stack, Chip,
    Card, CardContent, Grid, TablePagination, TextField, InputAdornment, FormControl, Select, MenuItem, InputLabel,
} from '@mui/material';
import ContactPageIcon from '@mui/icons-material/ContactPage';
import SearchIcon from '@mui/icons-material/Search';
import { superAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const statusColor = (status: string) => {
    switch (status) {
        case 'pending': return 'warning';
        case 'contacted': return 'info';
        case 'demo_scheduled': return 'primary';
        case 'completed': return 'success';
        case 'cancelled': return 'error';
        default: return 'default';
    }
};

const statusLabel = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, c => c?.toUpperCase());

const DemoRequestsLogPage: React.FC = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await superAPI.listDemoRequests({ limit: 500 });
            setRequests(res.data.requests || res.data || []);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load demo requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, []);

    const filtered = requests.filter(r => {
        const matchSearch = !search ||
            r.businessName?.toLowerCase().includes(search?.toLowerCase()) ||
            r.email?.toLowerCase().includes(search?.toLowerCase());
        const matchStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchSearch && matchStatus;
    });
    const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const totals = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        scheduled: requests.filter(r => r.status === 'demo_scheduled').length,
        completed: requests.filter(r => r.status === 'completed').length,
    };

    return (
        <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, pb: { xs: 2, sm: 3 }, pt: { xs: 1, sm: 2, md: 3 } }}>
            <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' }, mb: 0.5 }}>
                    <ContactPageIcon sx={{ fontSize: { xs: 24, sm: 30, md: 35 } }} color="error" /> Demo Requests Log
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Full history of demo requests submitted on the platform.
                </Typography>
            </Box>

            <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
                {[
                    { label: 'Total Requests', value: totals.total, color: '#6366f1' },
                    { label: 'Pending', value: totals.pending, color: '#f59e0b' },
                    { label: 'Scheduled', value: totals.scheduled, color: '#3b82f6' },
                    { label: 'Completed', value: totals.completed, color: '#22c55e' },
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
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <TextField
                        size="small"
                        placeholder="Search by business or email…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                        sx={{ width: { xs: '100%', sm: 260 } }}
                    />
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={statusFilter} label="Status" onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="contacted">Contacted</MenuItem>
                            <MenuItem value="demo_scheduled">Demo Scheduled</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>

                {/* Desktop table */}
                <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Table>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Business Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Requested Time</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Last Updated</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Updated By</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
                            ) : paginated.length === 0 ? (
                                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No demo requests found</Typography></TableCell></TableRow>
                            ) : paginated.map((req) => {
                                const updater = req.updatedBy;
                                const updaterName = updater
                                    ? `${updater.firstName || ''} ${updater.lastName || ''}`.trim() || updater.email
                                    : null;
                                return (
                                <TableRow key={req._id} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: alpha(theme.palette.error.main, 0.08), color: 'error.main' }}>
                                                <ContactPageIcon sx={{ fontSize: 16 }} />
                                            </Box>
                                            <Typography variant="subtitle2" fontWeight="bold">{req.businessName || '—'}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell><Typography variant="body2">{req.email}</Typography></TableCell>
                                    <TableCell><Typography variant="body2">{req.phone || '—'}</Typography></TableCell>
                                    <TableCell>
                                        <Chip label={statusLabel(req.status)} size="small" color={statusColor(req.status) as any} sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{req.preferredDate ? new Date(req.preferredDate).toLocaleString() : '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{req.updatedAt ? new Date(req.updatedAt).toLocaleDateString() : '—'}</Typography>
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
                        <Box sx={{ py: 6, textAlign: 'center' }}><Typography color="text.secondary">No demo requests found</Typography></Box>
                    ) : paginated.map((req) => {
                        const updater = req.updatedBy;
                        const updaterName = updater
                            ? `${updater.firstName || ''} ${updater.lastName || ''}`.trim() || updater.email
                            : null;
                        return (
                        <Card key={req._id} elevation={0} sx={{ mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                    <Typography fontWeight="bold">{req.businessName || '—'}</Typography>
                                    <Chip label={statusLabel(req.status)} size="small" color={statusColor(req.status) as any} sx={{ fontWeight: 'bold' }} />
                                </Stack>
                                <Typography variant="caption" color="text.secondary" display="block">{req.email}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block">{req.phone}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                                    Submitted: {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
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

export default DemoRequestsLogPage;
