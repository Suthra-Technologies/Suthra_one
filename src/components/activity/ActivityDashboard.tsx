import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Close as CloseIcon, People as PeopleIcon, Public as PublicIcon, TouchApp as TouchAppIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { activityAPI, superActivityAPI } from '../../services/api';
import 'jsvectormap/dist/jsvectormap.min.css';

type SourceKey = 'customer' | 'website';
const SOURCE_LABELS: Record<SourceKey, string> = { customer: 'Restaurant Customers', website: 'Website Visitors' };

interface Props {
    /** 'admin' = current tenant; 'superadmin' = cross-tenant overview. */
    mode: 'admin' | 'superadmin';
}

const todayKey = () => new Date().toISOString().slice(0, 10);
const daysAgoKey = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const ActivityDashboard: React.FC<Props> = ({ mode }) => {
    const theme = useTheme();

    // Editable vs applied filters (so charts don't refetch on every keystroke).
    const [startDate, setStartDate] = useState(daysAgoKey(29));
    const [endDate, setEndDate] = useState(todayKey());
    const [applied, setApplied] = useState({ startDate: daysAgoKey(29), endDate: todayKey() });

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    // user table modal
    const [tableOpen, setTableOpen] = useState(false);
    const [tableSource, setTableSource] = useState<SourceKey>('customer');
    const [tableRows, setTableRows] = useState<any[]>([]);
    const [tableTotal, setTableTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [tableLoading, setTableLoading] = useState(false);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const res = mode === 'superadmin'
                ? await superActivityAPI.getOverview(applied)
                : await activityAPI.getAnalytics(applied);
            setData(res.data);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [mode, applied]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const fetchTable = useCallback(async () => {
        if (mode !== 'admin') return;
        setTableLoading(true);
        try {
            const res = await activityAPI.getUniqueUsers({
                source: tableSource, ...applied, page: page + 1, limit: rowsPerPage,
            });
            setTableRows(res.data.items || []);
            setTableTotal(res.data.total || 0);
        } catch {
            setTableRows([]);
            setTableTotal(0);
        } finally {
            setTableLoading(false);
        }
    }, [mode, tableSource, applied, page, rowsPerPage]);

    useEffect(() => { if (tableOpen) fetchTable(); }, [tableOpen, fetchTable]);

    // ── world map (lazy) ──────────────────────────────────────────────────────
    const mapRef = React.useRef<HTMLDivElement | null>(null);
    const mapInstance = React.useRef<any>(null);

    // Country rows with a valid ISO-2 code (geoip can't resolve localhost/LAN IPs,
    // which come back with an empty country and are skipped here).
    const geoCountries = [
        ...((data?.countries?.customer as any[]) || []),
        ...((data?.countries?.website as any[]) || []),
    ].filter((r) => /^[A-Z]{2}$/.test(r.country));
    const hasGeo = mode === 'admin' && geoCountries.length > 0;

    useEffect(() => {
        let cancelled = false;
        if (!hasGeo || !mapRef.current) return;

        (async () => {
            const { default: jsVectorMap } = await import('jsvectormap');
            await import('jsvectormap/dist/maps/world.js');
            if (cancelled || !mapRef.current) return;

            const values: Record<string, number> = {};
            geoCountries.forEach((r: any) => { values[r.country] = (values[r.country] || 0) + r.users; });

            if (mapInstance.current) { try { mapInstance.current.destroy(); } catch { /* noop */ } }
            mapInstance.current = new jsVectorMap({
                selector: mapRef.current,
                map: 'world',
                zoomButtons: true,
                regionStyle: { initial: { fill: theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0' } },
                series: { regions: [{ attribute: 'fill', values, scale: ['#dbeafe', '#0369a1'], normalizeFunction: 'polynomial' }] },
                onRegionTooltipShow: (_e: any, tooltip: any, code: string) =>
                    tooltip.text(`${tooltip.text()} — ${values[code] || 0} users`),
            });
        })();

        return () => {
            cancelled = true;
            if (mapInstance.current) { try { mapInstance.current.destroy(); } catch { /* noop */ } mapInstance.current = null; }
        };
    }, [hasGeo, geoCountries, theme.palette.mode]);

    const apply = () => { setApplied({ startDate, endDate }); setPage(0); };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
    }

    const sources: SourceKey[] = ['customer', 'website'];
    const totals = data?.totals || {};
    const trends = data?.trends || {};

    const totalUnique = sources.reduce((a, s) => a + (totals[s]?.uniqueUsers ?? totals[s]?.uniqueUsersSumByDay ?? 0), 0);
    const totalEvents = sources.reduce((a, s) => a + (totals[s]?.apiCalls ?? 0), 0);
    const totalDailySum = sources.reduce((a, s) => a + (totals[s]?.uniqueUsersSumByDay ?? 0), 0);

    // Daily bar chart: merge sources by date.
    const barDates = (trends.customer || trends.website || []).map((d: any) => d.date);
    const barData = barDates.map((date: string, i: number) => ({
        date,
        customer: trends.customer?.[i]?.uniqueUsers ?? 0,
        website: trends.website?.[i]?.uniqueUsers ?? 0,
    }));

    return (
        <Box>
            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField type="date" label="From" size="small" InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <TextField type="date" label="To" size="small" InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                <Button variant="contained" onClick={apply}>Apply</Button>
            </Paper>

            {/* Summary cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <SummaryCard icon={<PeopleIcon />} label="Total Unique Users" value={totalUnique} color="#0369a1" />
                <SummaryCard icon={<TouchAppIcon />} label="Total Activity Events" value={totalEvents} color="#7c3aed" />
                <SummaryCard icon={<PublicIcon />} label="Daily-Unique Sum" value={totalDailySum} color="#059669" />
            </Grid>

            {/* Trend charts per source */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {sources.map((source) => (
                    <Grid size={{ xs: 12, md: 6 }} key={source}>
                        <Card>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={700} gutterBottom>{SOURCE_LABELS[source]}</Typography>
                                <Box sx={{ height: 260 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trends[source] || []}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="uniqueUsers" name="Unique Users" stroke="#0369a1" dot={false} />
                                            <Line type="monotone" dataKey="apiCalls" name="Activity Events" stroke="#7c3aed" dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </Box>
                                {mode === 'admin' && (
                                    <Button size="small" sx={{ mt: 1 }} onClick={() => { setTableSource(source); setPage(0); setTableOpen(true); }}>
                                        View users
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Daily unique-users bar chart */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>Daily Unique Users</Typography>
                    <Box sx={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="customer" name="Customers" fill="#0369a1" />
                                <Bar dataKey="website" name="Website" fill="#059669" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </CardContent>
            </Card>

            {/* Admin-only: world map + per-tenant table for superadmin */}
            {mode === 'admin' && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Users by Country</Typography>
                        {hasGeo ? (
                            <>
                                <Box ref={mapRef} sx={{ height: 380, width: '100%' }} />
                                <CountryListFallback data={data} />
                            </>
                        ) : (
                            <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                                <PublicIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                                <Typography variant="body2">
                                    No location data yet for this period.
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    Local / private-network visits (e.g. localhost) can’t be geo-located, so they don’t appear on the map.
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            {mode === 'superadmin' && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Activity by Tenant</Typography>
                        <PerTenantTable rows={data?.perTenant || []} />
                    </CardContent>
                </Card>
            )}

            {/* Per-user table modal (admin) */}
            <Dialog open={tableOpen} onClose={() => setTableOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {SOURCE_LABELS[tableSource]} — Users
                    <IconButton onClick={() => setTableOpen(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {tableLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Country</TableCell>
                                        <TableCell>City</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell align="right">Events</TableCell>
                                        <TableCell>Last seen</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tableRows.map((r, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{r.country || '—'}</TableCell>
                                            <TableCell>{r.city || '—'}</TableCell>
                                            <TableCell>{r.clientType}</TableCell>
                                            <TableCell>{r.userEmail || '—'}</TableCell>
                                            <TableCell align="right">{r.events}</TableCell>
                                            <TableCell>{r.lastSeen ? new Date(r.lastSeen).toLocaleString() : '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                    {tableRows.length === 0 && (
                                        <TableRow><TableCell colSpan={6} align="center">No data</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    <TablePagination
                        component="div"
                        count={tableTotal}
                        page={page}
                        onPageChange={(_e, p) => setPage(p)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </DialogContent>
            </Dialog>
        </Box>
    );
};

const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({ icon, label, value, color }) => (
    <Grid size={{ xs: 12, sm: 4 }}>
        <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ bgcolor: color, color: '#fff', borderRadius: 2, p: 1.25, display: 'flex' }}>{icon}</Box>
                <Box>
                    <Typography variant="h5" fontWeight={800}>{value.toLocaleString()}</Typography>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                </Box>
            </CardContent>
        </Card>
    </Grid>
);

const CountryListFallback: React.FC<{ data: any }> = ({ data }) => {
    const merged: Record<string, number> = {};
    [...(data?.countries?.customer || []), ...(data?.countries?.website || [])].forEach((r: any) => {
        if (r.country) merged[r.country] = (merged[r.country] || 0) + r.users;
    });
    const rows = Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (rows.length === 0) return null;
    return (
        <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="caption" color="text.secondary">Top countries</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                {rows.map(([c, n]) => (
                    <Paper key={c} variant="outlined" sx={{ px: 1, py: 0.25, fontSize: 13 }}>{c}: {n}</Paper>
                ))}
            </Box>
        </Box>
    );
};

const PerTenantTable: React.FC<{ rows: any[] }> = ({ rows }) => (
    <TableContainer>
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>Tenant</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell align="right">Unique Users</TableCell>
                    <TableCell align="right">Events</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {rows.map((r, i) => (
                    <TableRow key={i}>
                        <TableCell>{r.tenantSlug}</TableCell>
                        <TableCell>{SOURCE_LABELS[r.source as SourceKey] || r.source}</TableCell>
                        <TableCell align="right">{(r.uniqueUsers ?? 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{(r.apiCalls ?? 0).toLocaleString()}</TableCell>
                    </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={4} align="center">No data</TableCell></TableRow>}
            </TableBody>
        </Table>
    </TableContainer>
);

export default ActivityDashboard;
