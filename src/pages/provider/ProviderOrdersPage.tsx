import SearchIcon from '@mui/icons-material/Search';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { providerPortalAPI } from '../../services/api';

const ACCENT = '#00695c';

/** Keeps the scroll behaviour but hides the bar, matching the rest of the app. */
const HIDE_SCROLLBAR = {
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
    '&::-webkit-scrollbar': { width: 0, height: 0, display: 'none' },
    WebkitOverflowScrolling: 'touch' as const,
};

const HIDE_BELOW_MD = { display: { xs: 'none', md: 'table-cell' } };
const HIDE_BELOW_LG = { display: { xs: 'none', lg: 'table-cell' } };

const STATUS_COLOR: Record<string, 'warning' | 'success' | 'default' | 'info' | 'primary'> = {
    placed: 'warning',
    confirmed: 'info',
    sent: 'primary',
    received: 'success',
    cancelled: 'default',
};

/**
 * What the provider can do next, by current status.
 *
 * Mirrors PROVIDER_TRANSITIONS on the server — the server is the authority, so
 * this only decides which button to offer, never whether it is permitted.
 * 'received' is deliberately absent: only the restaurant can mark delivery,
 * because that step creates a Purchase Order and adds stock.
 */
const NEXT_ACTION: Record<string, { status: string; label: string } | undefined> = {
    placed: { status: 'confirmed', label: 'Confirm Order' },
    confirmed: { status: 'sent', label: 'Mark as Sent' },
};

const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString() : '—');
const fmtDateTime = (v?: string) => (v ? new Date(v).toLocaleString() : '—');

/** Compact one-line summary of an order's items, e.g. "Tomatoes ×5 lb, Onions ×2 boxes". */
const itemsSummary = (items: any[] = []) =>
    items.map((it) => `${it.name}${it.quantity ? ` ×${it.quantity}` : ''}${it.unit ? ` ${it.unit}` : ''}`).join(', ');

/**
 * Orders placed to this provider by restaurants.
 *
 * Orders live in each restaurant's own database; the backend fans out across
 * them and returns a merged, sorted list, so this page just paginates what it
 * is given rather than querying per restaurant.
 */
const ProviderOrdersPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [rows, setRows] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [loading, setLoading] = useState(true);
    // The dashboard tiles link here with ?status=placed etc., so the filter is
    // seeded from the URL.
    const [searchParams, setSearchParams] = useSearchParams();
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [detail, setDetail] = useState<any | null>(null);

    const load = useCallback(async (p: number, rpp: number, s: string, st: string) => {
        setLoading(true);
        try {
            const res = await providerPortalAPI.listOrders({
                page: p + 1,
                limit: rpp,
                search: s || undefined,
                status: st || undefined,
            });
            setRows(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(page, rowsPerPage, search, status); }, [page, rowsPerPage, search, status, load]);

    // Note captured alongside a status change (courier, ETA, partial shipment).
    const [statusNote, setStatusNote] = useState('');
    const [updating, setUpdating] = useState(false);

    const advanceStatus = async (order: any, next: { status: string; label: string }) => {
        setUpdating(true);
        try {
            const res = await providerPortalAPI.updateOrderStatus(order.tenantSlug, order._id, {
                status: next.status,
                ...(statusNote.trim() ? { providerNote: statusNote.trim() } : {}),
            });
            toast.success(next.status === 'confirmed' ? 'Order confirmed' : 'Order marked as sent');

            // Patch the row in place so the table and the open dialog agree
            // without a full reload.
            const patch = { ...res.data };
            setRows(prev => prev.map(r =>
                r._id === order._id && r.tenantSlug === order.tenantSlug ? { ...r, ...patch } : r,
            ));
            setDetail((prev: any) => (prev ? { ...prev, ...patch } : prev));
            setStatusNote('');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to update the order');
            // The server rejected the move, so our view of the status may be
            // stale — reload rather than leaving the wrong buttons on screen.
            load(page, rowsPerPage, search, status);
        } finally {
            setUpdating(false);
        }
    };

    const openDetail = async (row: any) => {
        // Show what the list already has straight away, then fill in the rest.
        setDetail(row);
        setStatusNote('');
        try {
            const res = await providerPortalAPI.getOrder(row.tenantSlug, row._id);
            setDetail(res.data);
        } catch {
            // The summary from the list is still on screen; nothing more to do.
        }
    };

    return (
        <Box sx={{ pb: 4 }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
                Orders
            </Typography>

            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 1, sm: 2 }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                sx={{ mb: 2 }}
            >
                <TextField
                    size="small"
                    placeholder="Search restaurant or item…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); setSearch(searchInput); } }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                        endAdornment: searchInput ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => { setSearchInput(''); setSearch(''); setPage(0); }}>✕</IconButton>
                            </InputAdornment>
                        ) : null,
                    }}
                    sx={{ width: { xs: '100%', sm: 320 } }}
                />
                <TextField
                    select
                    size="small"
                    label="Status"
                    value={status}
                    onChange={(e) => {
                        setStatus(e.target.value);
                        setPage(0);
                        // Keep the URL in step so the filter survives a reload/back.
                        setSearchParams(e.target.value ? { status: e.target.value } : {}, { replace: true });
                    }}
                    sx={{ width: { xs: '100%', sm: 180 } }}
                >
                    <MenuItem value="">All statuses</MenuItem>
                    <MenuItem value="placed">Placed</MenuItem>
                    <MenuItem value="confirmed">Confirmed</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="received">Received</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                </TextField>
            </Stack>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                <TableContainer sx={{ ...HIDE_SCROLLBAR, overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Restaurant</TableCell>
                                <TableCell sx={{ fontWeight: 700, ...HIDE_BELOW_MD }}>Items</TableCell>
                                <TableCell sx={{ fontWeight: 700, ...HIDE_BELOW_LG }}>Need by</TableCell>
                                <TableCell sx={{ fontWeight: 700, ...HIDE_BELOW_LG }}>Placed</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                        <CircularProgress size={26} sx={{ color: ACCENT }} />
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                        <Typography color="text.secondary">
                                            {search || status ? 'No orders match your filters.' : 'No orders yet.'}
                                        </Typography>
                                        {!search && !status && (
                                            <Typography variant="caption" color="text.secondary">
                                                Orders placed by restaurants will appear here.
                                            </Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : rows.map((row) => (
                                <TableRow
                                    key={`${row.tenantSlug}-${row._id}`}
                                    hover
                                    onClick={() => openDetail(row)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Avatar
                                                src={row.restaurantLogo || undefined}
                                                sx={{ width: 28, height: 28, bgcolor: ACCENT, fontSize: '0.75rem' }}
                                            >
                                                {row.restaurantName?.charAt(0)?.toUpperCase()}
                                            </Avatar>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={600} noWrap>
                                                    {row.restaurantName}
                                                </Typography>
                                                {/* On small screens the Items and date columns are hidden,
                                                    so their essentials ride along here instead. */}
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    noWrap
                                                    sx={{ display: { xs: 'block', md: 'none' } }}
                                                >
                                                    {itemsSummary(row.items) || row.orderText || '—'}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    noWrap
                                                    sx={{ display: { xs: 'block', lg: 'none' } }}
                                                >
                                                    Placed {fmtDate(row.createdAt)}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{ ...HIDE_BELOW_MD, maxWidth: 320 }}>
                                        <Tooltip title={itemsSummary(row.items) || row.orderText || ''}>
                                            <Typography variant="body2" noWrap>
                                                {itemsSummary(row.items) || row.orderText || '—'}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell sx={HIDE_BELOW_LG}>{fmtDate(row.needByDate)}</TableCell>
                                    <TableCell sx={HIDE_BELOW_LG}>{fmtDate(row.createdAt)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={row.status}
                                            size="small"
                                            color={STATUS_COLOR[row.status] || 'default'}
                                            sx={{ textTransform: 'capitalize' }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[10, 20, 50]}
                />
            </Paper>

            {/* ---- Order detail ---- */}
            <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth fullScreen={isMobile}>
                <DialogTitle>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar src={detail?.restaurantLogo || undefined} sx={{ bgcolor: ACCENT }}>
                            {detail?.restaurantName?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>{detail?.restaurantName}</Typography>
                            <Chip
                                label={detail?.status}
                                size="small"
                                color={STATUS_COLOR[detail?.status] || 'default'}
                                sx={{ textTransform: 'capitalize', mt: 0.5 }}
                            />
                        </Box>
                    </Stack>
                </DialogTitle>
                <DialogContent sx={HIDE_SCROLLBAR}>
                    {detail && (
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>ITEMS</Typography>
                                {(detail.items || []).length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                        {detail.orderText || 'No itemised list provided.'}
                                    </Typography>
                                ) : (
                                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                        {detail.items.map((it: any, i: number) => (
                                            <Stack key={i} direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                                                <Typography variant="body2">{it.name}</Typography>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {it.quantity}{it.unit ? ` ${it.unit}` : ''}
                                                </Typography>
                                            </Stack>
                                        ))}
                                    </Stack>
                                )}
                            </Box>

                            {detail.orderText && (detail.items || []).length > 0 && (
                                <>
                                    <Divider />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>NOTES</Typography>
                                        <Typography variant="body2">{detail.orderText}</Typography>
                                    </Box>
                                </>
                            )}

                            <Divider />
                            <Stack spacing={1}>
                                {([
                                    ['Need by', fmtDate(detail.needByDate)],
                                    ['Placed on', fmtDateTime(detail.createdAt)],
                                    ...(detail.confirmedAt ? [['Confirmed on', fmtDateTime(detail.confirmedAt)]] : []),
                                    ...(detail.sentAt ? [['Sent on', fmtDateTime(detail.sentAt)]] : []),
                                    ...(detail.receivedAt ? [['Received on', fmtDateTime(detail.receivedAt)]] : []),
                                    ...(detail.poNumber ? [['PO number', detail.poNumber]] : []),
                                ] as Array<[string, string]>).map(([label, value]) => (
                                    <Stack key={label} direction="row" justifyContent="space-between" spacing={2}>
                                        <Typography variant="body2" color="text.secondary">{label}</Typography>
                                        <Typography variant="body2" fontWeight={600}>{value}</Typography>
                                    </Stack>
                                ))}
                            </Stack>
                            {detail.providerNote && (
                                <>
                                    <Divider />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>YOUR NOTE</Typography>
                                        <Typography variant="body2">{detail.providerNote}</Typography>
                                    </Box>
                                </>
                            )}

                            {NEXT_ACTION[detail.status] ? (
                                <>
                                    <Divider />
                                    <TextField
                                        label="Note for the restaurant (optional)"
                                        placeholder="e.g. dispatched via courier, arriving tomorrow"
                                        value={statusNote}
                                        onChange={(e) => setStatusNote(e.target.value)}
                                        size="small"
                                        fullWidth
                                        multiline
                                        rows={2}
                                        inputProps={{ maxLength: 500 }}
                                    />
                                    <Button
                                        variant="contained"
                                        disabled={updating}
                                        onClick={() => advanceStatus(detail, NEXT_ACTION[detail.status]!)}
                                        sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#004d40' } }}
                                    >
                                        {updating
                                            ? <CircularProgress size={20} sx={{ color: '#fff' }} />
                                            : NEXT_ACTION[detail.status]!.label}
                                    </Button>
                                </>
                            ) : detail.status === 'sent' ? (
                                <Alert severity="info">
                                    Waiting for {detail.restaurantName} to confirm delivery.
                                </Alert>
                            ) : null}
                        </Stack>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default ProviderOrdersPage;
