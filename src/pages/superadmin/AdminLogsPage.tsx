import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, alpha, useTheme, Stack, Chip,
    Card, CardContent, Grid, TablePagination, TextField, InputAdornment,
    FormControl, Select, MenuItem, InputLabel, useMediaQuery,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import { superAPI } from '../../services/api';
import { TableSkeleton } from '../../components/common/PageSkeleton';
import { toast } from 'react-hot-toast';

const moduleColor = (mod: string) => {
    switch (mod) {
        case 'STORE': return 'primary';
        case 'PLAN': return 'secondary';
        case 'TICKET': return 'warning';
        case 'DEMO_REQUEST': return 'info';
        default: return 'default';
    }
};

const actionColor = (action: string) => {
    switch (action) {
        case 'CREATED': return 'success';
        case 'DELETED': return 'error';
        case 'UPDATED': return 'warning';
        case 'STATUS_CHANGED': return 'info';
        case 'REPLIED': return 'primary';
        default: return 'default';
    }
};

const fmt = (d: string) => d ? new Date(d).toLocaleString() : '—';

// Humanizes a camelCase/snake_case key into "Title Case With Spaces".
const humanizeKey = (key: string) => key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, c => c.toUpperCase());

// Turns an arbitrary details object (shape varies per module/action) into a
// readable "Key: value, Key: value" summary instead of raw JSON, skipping
// empty/null fields. Nested objects are flattened one level (e.g. for the
// doordash/ubereats settings blob) using "Parent Key: {..}" grouping.
const formatDetails = (details: any): string => {
    if (details === null || details === undefined) return '—';
    if (typeof details === 'string') return details;
    if (typeof details !== 'object') return String(details);

    const parts: string[] = [];
    for (const [key, value] of Object.entries(details)) {
        if (value === null || value === undefined || value === '') continue;
        const label = humanizeKey(key);
        if (Array.isArray(value)) {
            if (value.length === 0) continue;
            parts.push(`${label}: ${value.join(', ')}`);
        } else if (typeof value === 'object') {
            const nested = Object.entries(value)
                .filter(([, v]) => v !== null && v !== undefined && v !== '')
                .map(([k, v]) => `${humanizeKey(k)}: ${v}`)
                .join(', ');
            if (nested) parts.push(`${label}: (${nested})`);
        } else {
            parts.push(`${label}: ${value}`);
        }
    }
    return parts.length > 0 ? parts.join(' · ') : '—';
};

const MODULES = ['all', 'STORE', 'PLAN', 'TICKET', 'DEMO_REQUEST'];

const AdminLogsPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [moduleFilter, setModuleFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page: page + 1, limit: rowsPerPage };
            if (moduleFilter !== 'all') params.module = moduleFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            const res = await superAPI.getAdminLogs(params);
            const data = res.data;
            setLogs(data.logs || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } catch {
            toast.error('Failed to load admin logs');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, moduleFilter, startDate, endDate]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const kpis = [
        { label: 'Total Actions', value: total, color: '#6366f1' },
        { label: 'Store Actions', value: logs.filter(l => l.module === 'STORE').length, color: '#3b82f6' },
        { label: 'Plan Actions', value: logs.filter(l => l.module === 'PLAN').length, color: '#8b5cf6' },
        { label: 'Ticket Actions', value: logs.filter(l => l.module === 'TICKET').length, color: '#f59e0b' },
    ];

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                <Box sx={{
                    width: 44, height: 44, borderRadius: 2,
                    background: `linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <HistoryIcon sx={{ color: '#fff', fontSize: 24 }} />
                </Box>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Admin Activity Logs</Typography>
                    <Typography variant="body2" color="text.secondary">
                        All superadmin actions across stores, plans, tickets, and demo requests
                    </Typography>
                </Box>
            </Stack>

            {/* KPI Cards */}
            <Grid container spacing={2} mb={3}>
                {kpis.map((k) => (
                    <Grid item xs={6} md={3} key={k.label}>
                        <Card sx={{ borderRadius: 2, border: `1px solid ${alpha(k.color, 0.15)}`, background: alpha(k.color, 0.04) }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Typography variant="h4" fontWeight={800} sx={{ color: k.color }}>{k.value}</Typography>
                                <Typography variant="body2" color="text.secondary">{k.label}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 160, width: { xs: '100%', sm: 'auto' } }}>
                        <InputLabel>Module</InputLabel>
                        <Select value={moduleFilter} label="Module" onChange={e => { setModuleFilter(e.target.value); setPage(0); }}>
                            {MODULES.map(m => <MenuItem key={m} value={m}>{m === 'all' ? 'All Modules' : m.replace('_', ' ')}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField
                        size="small" label="From Date" type="date"
                        value={startDate} onChange={e => { setStartDate(e.target.value); setPage(0); }}
                        InputLabelProps={{ shrink: true }} sx={{ minWidth: 160, width: { xs: '100%', sm: 'auto' } }}
                    />
                    <TextField
                        size="small" label="To Date" type="date"
                        value={endDate} onChange={e => { setEndDate(e.target.value); setPage(0); }}
                        InputLabelProps={{ shrink: true }} sx={{ minWidth: 160, width: { xs: '100%', sm: 'auto' } }}
                    />
                </Stack>
            </Paper>

            {/* Table / Mobile Cards */}
            <Paper sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                {loading ? (
                    <TableSkeleton rows={8} columns={6} />
                ) : isMobile ? (
                    /* ── Mobile Layout: Responsive Activity Log Cards (Zero Horizontal Scroll) ── */
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {logs.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                                <Typography variant="body2" fontWeight={600}>No activity logs found</Typography>
                            </Box>
                        ) : (
                            logs.map((log) => {
                                const adminName = log.performedByName || (log.performedBy
                                    ? `${log.performedBy.firstName || ''} ${log.performedBy.lastName || ''}`.trim() || log.performedBy.email
                                    : '—');
                                const adminEmail = log.performedByEmail || log.performedBy?.email || '';
                                const detailsText = formatDetails(log.details);

                                return (
                                    <Card
                                        key={log._id}
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 2.5,
                                            borderColor: alpha(theme.palette.divider, 0.7),
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                            bgcolor: 'background.paper',
                                        }}
                                    >
                                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            {/* Top Header: Module + Action + Date */}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                    <Chip
                                                        label={log.module}
                                                        color={moduleColor(log.module) as any}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                                                    />
                                                    <Chip
                                                        label={log.action}
                                                        color={actionColor(log.action) as any}
                                                        size="small"
                                                        sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                                                    />
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                                                    {fmt(log.createdAt)}
                                                </Typography>
                                            </Box>

                                            {/* Performed By Row */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <Box sx={{
                                                    width: 28, height: 28, borderRadius: '50%',
                                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                    color: theme.palette.primary.main,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.75rem', fontWeight: 800
                                                }}>
                                                    {adminName.charAt(0).toUpperCase()}
                                                </Box>
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.84rem', lineHeight: 1.2 }}>
                                                        {adminName}
                                                    </Typography>
                                                    {adminEmail && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', display: 'block' }}>
                                                            {adminEmail}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>

                                            {/* Target Row (if present) */}
                                            {log.targetName && (
                                                <Box sx={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: 0.75, 
                                                    mb: 1, 
                                                    p: 0.75, 
                                                    px: 1,
                                                    borderRadius: 1.5, 
                                                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                                                    border: `1px dashed ${alpha(theme.palette.primary.main, 0.25)}`
                                                }}>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.7rem' }}>
                                                        Target:
                                                    </Typography>
                                                    <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ fontSize: '0.75rem' }}>
                                                        {log.targetName}
                                                    </Typography>
                                                </Box>
                                            )}

                                            {/* Details Summary (if present) */}
                                            {detailsText && detailsText !== '—' && (
                                                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.action.selected, 0.04), border: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', lineHeight: 1.4, display: 'block' }}>
                                                        {detailsText}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                        <TablePagination
                            component="div"
                            count={total}
                            page={page}
                            onPageChange={(_, p) => setPage(p)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
                            rowsPerPageOptions={[25, 50, 100]}
                            sx={{
                                '& .MuiTablePagination-toolbar': { px: 0.5, minHeight: 44, justifyContent: 'center' },
                                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.72rem' },
                            }}
                        />
                    </Box>
                ) : (
                    /* ── Desktop / Laptop / Tablet / iPad Layout: 100% Locked Table ── */
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ background: alpha(theme.palette.primary.main, 0.05) }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Performed By</TableCell>
                                    <TableCell sx={{ fontWeight: 700, maxWidth: 200 }}>Target</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                            No activity logs found
                                        </TableCell>
                                    </TableRow>
                                ) : logs.map((log) => {
                                    const adminName = log.performedByName || (log.performedBy
                                        ? `${log.performedBy.firstName || ''} ${log.performedBy.lastName || ''}`.trim() || log.performedBy.email
                                        : '—');
                                    const adminEmail = log.performedByEmail || log.performedBy?.email || '';
                                    return (
                                        <TableRow key={log._id} hover sx={{ '&:hover': { background: alpha(theme.palette.primary.main, 0.03) } }}>
                                            <TableCell>
                                                <Chip label={log.module} color={moduleColor(log.module) as any} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={log.action} color={actionColor(log.action) as any} size="small" />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>{adminName}</Typography>
                                                {adminEmail && <Typography variant="caption" color="text.secondary">{adminEmail}</Typography>}
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 200 }}>
                                                {log.targetName ? (
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                        title={log.targetName}
                                                    >
                                                        {log.targetName}
                                                    </Typography>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 260 }}>
                                                {log.details ? (
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        title={formatDetails(log.details)}
                                                        sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                    >
                                                        {formatDetails(log.details)}
                                                    </Typography>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">{fmt(log.createdAt)}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <TablePagination
                            component="div"
                            count={total}
                            page={page}
                            onPageChange={(_, p) => setPage(p)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
                            rowsPerPageOptions={[25, 50, 100]}
                        />
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
};

export default AdminLogsPage;
