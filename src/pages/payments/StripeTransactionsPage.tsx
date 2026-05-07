import {
    CheckCircle as CheckCircleIcon,
    CloudDownload as SyncIcon,
    Error as ErrorIcon,
    FilterList as FilterIcon,
    HourglassEmpty as PendingIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Storage as StorageIcon,
    WarningAmber as WarningIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    InputAdornment,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { paymentsAPI } from '../../services/api';

interface StripeTransaction {
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: string;
    description: string | null;
    receiptEmail: string | null;
    paymentMethod: string;
    chargeId: string | null;
    customerName: string | null;
    customerEmail: string | null;
    metadata: Record<string, string>;
}

const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default'; icon: React.ReactElement }> = {
    succeeded: { label: 'Succeeded', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
    processing: { label: 'Processing', color: 'warning', icon: <PendingIcon fontSize="small" /> },
    requires_payment_method: { label: 'Failed', color: 'error', icon: <ErrorIcon fontSize="small" /> },
    requires_action: { label: 'Requires Action', color: 'warning', icon: <PendingIcon fontSize="small" /> },
    canceled: { label: 'Canceled', color: 'default', icon: <ErrorIcon fontSize="small" /> },
};

const StripeTransactionsPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [transactions, setTransactions] = useState<StripeTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [dbStatus, setDbStatus] = useState<Record<string, boolean>>({});
    const [hasMore, setHasMore] = useState(false);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [lastId, setLastId] = useState<string | undefined>(undefined);

    const totalAmount = transactions
        .filter(t => t.status === 'succeeded')
        .reduce((sum, t) => sum + t.amount, 0);

    const verifyAll = async (ids: string[]) => {
        if (ids.length === 0) return;
        setVerifying(true);
        try {
            const res = await paymentsAPI.verifyTransactionsInDb(ids);
            setDbStatus(prev => ({ ...prev, ...res.data }));
        } catch {
            toast.error('Could not verify DB status');
        } finally {
            setVerifying(false);
        }
    };

    const fetchTransactions = async (reset = true) => {
        if (reset) {
            setLoading(true);
            setLastId(undefined);
        } else {
            setLoadingMore(true);
        }

        try {
            const params: Record<string, any> = { limit: 50 };
            if (!reset && lastId) params.startingAfter = lastId;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const res = await paymentsAPI.getTransactions(params);
            const { data, hasMore: more } = res.data;

            const merged = reset ? data : [...transactions, ...data];
            setTransactions(merged);
            setHasMore(more);
            if (data.length > 0) setLastId(data[data.length - 1].id);

            // Auto-verify newly loaded transactions
            const newIds = data.map((t: StripeTransaction) => t.id);
            await verifyAll(newIds);
        } catch {
            toast.error('Failed to load Stripe transactions');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await paymentsAPI.syncTransactions();
            const { synced, skipped, total } = res.data;
            toast.success(`Sync complete — ${synced} saved, ${skipped} already existed (${total} total from Stripe)`);
            fetchTransactions(true);
        } catch {
            toast.error('Sync failed. Please try again.');
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchTransactions(true);
    }, []);

    const filtered = transactions.filter(t => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            t.id.toLowerCase().includes(q) ||
            (t.customerName?.toLowerCase().includes(q) ?? false) ||
            (t.customerEmail?.toLowerCase().includes(q) ?? false) ||
            (t.receiptEmail?.toLowerCase().includes(q) ?? false) ||
            (t.chargeId?.toLowerCase().includes(q) ?? false)
        );
    });

    const succeeded = transactions.filter(t => t.status === 'succeeded').length;
    const failed = transactions.filter(t => ['requires_payment_method', 'canceled'].includes(t.status)).length;
    const pending = transactions.filter(t => ['processing', 'requires_action'].includes(t.status)).length;

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={1}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Stripe Transactions</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Verify all payments processed through Stripe
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => fetchTransactions(true)}
                        disabled={loading || syncing}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="outlined"
                        color="info"
                        startIcon={verifying ? <CircularProgress size={16} color="inherit" /> : <StorageIcon />}
                        onClick={() => verifyAll(transactions.map(t => t.id))}
                        disabled={verifying || loading || transactions.length === 0}
                    >
                        {verifying ? 'Verifying...' : 'Re-verify DB'}
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                        onClick={handleSync}
                        disabled={syncing || loading}
                    >
                        {syncing ? 'Syncing...' : 'Sync to Database'}
                    </Button>
                </Stack>
            </Stack>

            {/* Summary cards */}
            <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
                <Card variant="outlined" sx={{ flex: '1 1 140px' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" color="text.secondary">Total Collected</Typography>
                        <Typography variant="h6" fontWeight={700} color="success.main">
                            ${totalAmount.toFixed(2)}
                        </Typography>
                    </CardContent>
                </Card>
                <Card variant="outlined" sx={{ flex: '1 1 140px' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" color="text.secondary">Transactions</Typography>
                        <Typography variant="h6" fontWeight={700}>{transactions.length}</Typography>
                    </CardContent>
                </Card>
                <Card variant="outlined" sx={{ flex: '1 1 140px' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" color="text.secondary">Succeeded</Typography>
                        <Typography variant="h6" fontWeight={700} color="success.main">{succeeded}</Typography>
                    </CardContent>
                </Card>
                <Card variant="outlined" sx={{ flex: '1 1 140px' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" color="text.secondary">Failed / Pending</Typography>
                        <Typography variant="h6" fontWeight={700} color="error.main">{failed + pending}</Typography>
                    </CardContent>
                </Card>
                <Card variant="outlined" sx={{ flex: '1 1 140px', borderColor: 'success.light' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" color="text.secondary">Saved in DB</Typography>
                        <Typography variant="h6" fontWeight={700} color="success.main">
                            {Object.values(dbStatus).filter(Boolean).length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card variant="outlined" sx={{ flex: '1 1 140px', borderColor: 'warning.light' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" color="text.secondary">Not in DB</Typography>
                        <Typography variant="h6" fontWeight={700} color="warning.main">
                            {Object.values(dbStatus).filter(v => !v).length}
                        </Typography>
                    </CardContent>
                </Card>
            </Stack>

            {/* Filters */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
                    <TextField
                        size="small"
                        placeholder="Search by ID, customer, email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{ flexGrow: 1 }}
                    />
                    <TextField
                        size="small"
                        label="From date"
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                        size="small"
                        label="To date"
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<FilterIcon />}
                        onClick={() => fetchTransactions(true)}
                        disabled={loading}
                    >
                        Apply
                    </Button>
                </Stack>
            </Paper>

            {/* Table */}
            {loading ? (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress />
                </Box>
            ) : filtered.length === 0 ? (
                <Paper variant="outlined" sx={{ py: 8, textAlign: 'center' }}>
                    <Typography color="text.secondary">No transactions found</Typography>
                </Paper>
            ) : isMobile ? (
                <Stack spacing={1.5}>
                    {filtered.map(t => {
                        const cfg = statusConfig[t.status] ?? { label: t.status, color: 'default' as const, icon: null };
                        return (
                            <Paper key={t.id} variant="outlined" sx={{ p: 2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            ${t.amount.toFixed(2)} {t.currency}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                                            {t.id}
                                        </Typography>
                                    </Box>
                                    <Chip size="small" label={cfg.label} color={cfg.color} icon={cfg.icon ?? undefined} />
                                </Stack>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="caption" display="block" color="text.secondary">
                                    {t.customerName || t.receiptEmail || 'Guest'} • {new Date(t.created).toLocaleString()}
                                </Typography>
                            </Paper>
                        );
                    })}
                </Stack>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                <TableCell><strong>Payment ID</strong></TableCell>
                                <TableCell><strong>Date</strong></TableCell>
                                <TableCell><strong>Customer</strong></TableCell>
                                <TableCell><strong>Amount</strong></TableCell>
                                <TableCell><strong>Method</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell><strong>DB Status</strong></TableCell>
                                <TableCell><strong>Charge ID</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map(t => {
                                const cfg = statusConfig[t.status] ?? { label: t.status, color: 'default' as const, icon: null };
                                return (
                                    <TableRow key={t.id} hover>
                                        <TableCell>
                                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                {t.id}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption">
                                                {new Date(t.created).toLocaleString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {t.customerName || '—'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {t.customerEmail || t.receiptEmail || 'Guest'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                ${t.amount.toFixed(2)} {t.currency}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                                                {t.paymentMethod}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={cfg.label}
                                                color={cfg.color}
                                                icon={cfg.icon ?? undefined}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {!(t.id in dbStatus) ? (
                                                <Chip size="small" label="Checking..." variant="outlined" />
                                            ) : dbStatus[t.id] ? (
                                                <Chip size="small" label="In DB" color="success" icon={<CheckCircleIcon fontSize="small" />} />
                                            ) : (
                                                <Chip size="small" label="Not in DB" color="warning" icon={<WarningIcon fontSize="small" />} />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                {t.chargeId || '—'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Load more */}
            {hasMore && !loading && (
                <Box display="flex" justifyContent="center" mt={2}>
                    <Button
                        variant="outlined"
                        onClick={() => fetchTransactions(false)}
                        disabled={loadingMore}
                        startIcon={loadingMore ? <CircularProgress size={16} /> : undefined}
                    >
                        {loadingMore ? 'Loading...' : 'Load more'}
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default StripeTransactionsPage;
