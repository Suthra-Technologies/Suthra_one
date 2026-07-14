import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, alpha, useTheme, Stack, Chip,
    Card, CardContent, Grid, TablePagination, TextField, InputAdornment,
    FormControl, Select, MenuItem, InputLabel, IconButton,
} from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { superAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';

const statusColor = (status: string) => {
    switch (status) {
        case 'open': return 'error';
        case 'in_progress': return 'warning';
        case 'resolved': return 'success';
        case 'closed': return 'default';
        default: return 'default';
    }
};

const priorityColor = (priority: string) => {
    switch (priority) {
        case 'high': return 'error';
        case 'medium': return 'warning';
        case 'low': return 'success';
        default: return 'default';
    }
};

const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c?.toUpperCase());

const TicketsLogPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tenantId = searchParams.get('tenantId');
    const storeName = searchParams.get('name') || '';
    const isSingleStore = Boolean(tenantId);

    const [loading, setLoading] = useState(false);
    const [tickets, setTickets] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await superAPI.listSupportTickets({ limit: 500 });
            const all: any[] = res.data.tickets || res.data || [];
            setTickets(isSingleStore ? all.filter(t => t.tenant?._id === tenantId || t.tenant === tenantId) : all);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTickets(); }, [tenantId]);

    const filtered = tickets.filter(t => {
        const matchSearch = !search ||
            t.subject?.toLowerCase().includes(search?.toLowerCase()) ||
            t.tenant?.name?.toLowerCase().includes(search?.toLowerCase());
        const matchStatus = statusFilter === 'all' || t.status === statusFilter;
        return matchSearch && matchStatus;
    });
    const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const totals = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
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
                    <SupportAgentIcon sx={{ fontSize: { xs: 24, sm: 30, md: 35 } }} color="secondary" />
                    {isSingleStore ? `${storeName} — Tickets Log` : 'Support Tickets Log'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {isSingleStore ? `All support tickets submitted by ${storeName}.` : 'Full history of all support tickets submitted across all stores.'}
                </Typography>
            </Box>

            <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
                {[
                    { label: 'Total Tickets', value: totals.total, color: '#6366f1' },
                    { label: 'Open', value: totals.open, color: '#ef4444' },
                    { label: 'In Progress', value: totals.inProgress, color: '#f59e0b' },
                    { label: 'Resolved', value: totals.resolved, color: '#22c55e' },
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
                        placeholder="Search by subject or store…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                        sx={{ width: { xs: '100%', sm: 260 } }}
                    />
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={statusFilter} label="Status" onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="open">Open</MenuItem>
                            <MenuItem value="in_progress">In Progress</MenuItem>
                            <MenuItem value="resolved">Resolved</MenuItem>
                            <MenuItem value="closed">Closed</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>

                {/* Desktop table */}
                <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Table>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                                {!isSingleStore && <TableCell sx={{ fontWeight: 700 }}>Store</TableCell>}
                                <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Last Updated</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Updated By</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={isSingleStore ? 7 : 8} align="center" sx={{ py: 8 }}><CircularProgress /></TableCell></TableRow>
                            ) : paginated.length === 0 ? (
                                <TableRow><TableCell colSpan={isSingleStore ? 7 : 8} align="center" sx={{ py: 8 }}><Typography color="text.secondary">No tickets found</Typography></TableCell></TableRow>
                            ) : paginated.map((ticket) => {
                                const updater = ticket.updatedBy;
                                const updaterName = updater
                                    ? `${updater.firstName || ''} ${updater.lastName || ''}`.trim() || updater.email
                                    : null;
                                return (
                                <TableRow key={ticket._id} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: alpha(theme.palette.secondary.main, 0.08), color: 'secondary.main' }}>
                                                <SupportAgentIcon sx={{ fontSize: 16 }} />
                                            </Box>
                                            <Typography variant="subtitle2" fontWeight="bold" sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {ticket.subject}
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                    {!isSingleStore && <TableCell><Typography variant="body2">{ticket.tenant?.name || '—'}</Typography></TableCell>}
                                    <TableCell><Typography variant="body2">{ticket.createdBy?.firstName ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName || ''}`.trim() : ticket.createdBy?.email || '—'}</Typography></TableCell>
                                    <TableCell>
                                        <Chip label={ticket.priority || 'medium'} size="small" color={priorityColor(ticket.priority) as any} sx={{ fontWeight: 'bold', textTransform: 'capitalize' }} />
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={statusLabel(ticket.status)} size="small" color={statusColor(ticket.status) as any} sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : '—'}</Typography>
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
                        <Box sx={{ py: 6, textAlign: 'center' }}><Typography color="text.secondary">No tickets found</Typography></Box>
                    ) : paginated.map((ticket) => {
                        const updater = ticket.updatedBy;
                        const updaterName = updater
                            ? `${updater.firstName || ''} ${updater.lastName || ''}`.trim() || updater.email
                            : null;
                        return (
                        <Card key={ticket._id} elevation={0} sx={{ mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                    <Typography fontWeight="bold" sx={{ flex: 1, mr: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</Typography>
                                    <Chip label={statusLabel(ticket.status)} size="small" color={statusColor(ticket.status) as any} sx={{ fontWeight: 'bold' }} />
                                </Stack>
                                {!isSingleStore && <Typography variant="caption" color="text.secondary" display="block">{ticket.tenant?.name || '—'}</Typography>}
                                <Stack direction="row" spacing={1} mt={1}>
                                    <Chip label={ticket.priority || 'medium'} size="small" color={priorityColor(ticket.priority) as any} sx={{ fontWeight: 'bold', textTransform: 'capitalize' }} />
                                    <Typography variant="caption" color="text.secondary">
                                        {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '—'}
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

export default TicketsLogPage;
