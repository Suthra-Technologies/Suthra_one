import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    TextField,
    MenuItem,
    CircularProgress,
    Pagination,
    Stack,
    Tooltip,
    useTheme,
    alpha,
    Grid,
    Avatar,
    InputAdornment,
    Divider,
    useMediaQuery,
    Card,
    CardContent
} from '@mui/material';
import {
    Add as AddIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Receipt as ExpenseIcon,
    Event as OneTimeIcon,
    Repeat as RecurringIcon,
    Business as OrgIcon,
    Person as PersonIcon,
    Notifications as NotifyIcon,
    TrendingUp as TrendIcon,
    AccountBalanceWallet as WalletIcon,
    Warning as AlertIcon,
    History as HistoryIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { expensesAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';

const ExpensesPage: React.FC = () => {
    const navigate = useNavigate();
    const { formatCurrency } = useSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    
    const [expenses, setExpenses] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        status: '',
        type: '',
        category: '',
        search: '',
    });
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [listRes, statsRes] = await Promise.all([
                expensesAPI.getAll({ page, limit: 10, ...filters }),
                expensesAPI.getStats()
            ]);
            setExpenses(listRes.data.data || []);
            setTotalPages(Math.ceil((listRes.data.total || 0) / 10));
            setStats(statsRes.data.data);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast.error('Failed to load expense data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            setFilters(prev => ({ ...prev, search }));
            setPage(1); // Reset to first page on new search
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    useEffect(() => {
        fetchData();
    }, [page, filters]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        try {
            await expensesAPI.delete(id);
            toast.success('Expense deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const getStatusStyles = (status: string) => {
        const styles: Record<string, { label: string, color: string, bg: string }> = {
            pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7' },
            paid: { label: 'Settled', color: '#10b981', bg: '#dcfce7' },
            overdue: { label: 'Overdue', color: '#ef4444', bg: '#fee2e2' },
            cancelled: { label: 'Cancelled', color: '#64748b', bg: '#f1f5f9' },
        };
        return styles[status] || { label: status, color: '#000', bg: '#fff' };
    };

    const getTypeIcon = (type: string) => {
        return type === 'recurring' ? <RecurringIcon fontSize="small" /> : <OneTimeIcon fontSize="small" />;
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1600, mx: 'auto' }}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight={900}>Expense Management</Typography>
                    <Typography variant="body2" color="text.secondary">Track and manage your operational expenditures</Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('create')}
                    sx={{ borderRadius: 3, px: 4, py: 1.5, fontWeight: 'bold' }}
                >
                    Record Expense
                </Button>
            </Stack>

            {/* Stats Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                                    <TrendIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Monthly Total</Typography>
                                    <Typography variant="h6" fontWeight="bold">{formatCurrency ? formatCurrency(stats?.monthlyTotal || 0) : `$${(stats?.monthlyTotal || 0).toFixed(2)}`}</Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b' }}>
                                    <WalletIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Pending Approval</Typography>
                                    <Typography variant="h6" fontWeight="bold">{formatCurrency ? formatCurrency(stats?.pendingTotal || 0) : `$${(stats?.pendingTotal || 0).toFixed(2)}`}</Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: alpha('#ef4444', 0.1), color: '#ef4444' }}>
                                    <AlertIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Overdue Bills</Typography>
                                    <Typography variant="h6" fontWeight="bold">{stats?.overdueCount || 0}</Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: alpha('#6366f1', 0.1), color: '#6366f1' }}>
                                    <NotifyIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Top Category</Typography>
                                    <Typography variant="h6" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                                        {stats?.categoryBreakdown?.[0]?._id || 'N/A'}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 4, borderRadius: 4, bgcolor: '#111827', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                    placeholder="Search payee, notes..."
                    size="small"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{
                        minWidth: 280,
                        '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { border: 'none' } },
                        bgcolor: alpha('#fff', 0.05), borderRadius: 3
                    }}
                    InputProps={{ startAdornment: <SearchIcon sx={{ color: alpha('#fff', 0.5), mr: 1 }} /> }}
                />
                <TextField
                    select
                    size="small"
                    label="Type"
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: alpha('#fff', 0.5) } }}
                >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="one_time">One-Time</MenuItem>
                    <MenuItem value="recurring">Recurring</MenuItem>
                </TextField>
                <TextField
                    select
                    size="small"
                    label="Status"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { color: 'white' }, '& .MuiInputLabel-root': { color: alpha('#fff', 0.5) } }}
                >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                </TextField>
            </Paper>

            {/* List */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
            ) : expenses.length === 0 ? (
                <Paper sx={{ p: 10, textAlign: 'center', borderRadius: 4 }}>
                    <ExpenseIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No expenses found</Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 4 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Expense #</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Payee</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {expenses.map((exp) => {
                                const statusStyle = getStatusStyles(exp.status);
                                return (
                                    <TableRow key={exp._id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">#{exp.expenseNumber}</Typography>
                                            <Typography variant="caption" color="text.secondary">{new Date(exp.createdAt).toLocaleDateString()}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                {exp.payee.type === 'organization' ? <OrgIcon fontSize="small" color="action" /> : <PersonIcon fontSize="small" color="action" />}
                                                <Typography variant="body2">{exp.payee.name}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>{exp.category}</TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={getTypeIcon(exp.type)}
                                                label={exp.type.replace('_', ' ').toUpperCase()}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontWeight: 'bold' }}
                                            />
                                            {exp.type === 'recurring' && <Typography variant="caption" display="block" color="text.secondary">{exp.frequency}</Typography>}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold" color="primary.main">
                                                {formatCurrency ? formatCurrency(exp.amount) : `$${exp.amount.toFixed(2)}`}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={statusStyle.label} size="small" sx={{ bgcolor: statusStyle.bg, color: statusStyle.color, fontWeight: 'bold' }} />
                                            {exp.status === 'pending' && exp.dueDate && (
                                                <Typography variant="caption" display="block" color="error">
                                                    Due: {new Date(exp.dueDate).toLocaleDateString()}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Tooltip title="View Details">
                                                    <IconButton size="small" onClick={() => navigate(`${exp._id}`)}><ViewIcon color="primary" /></IconButton>
                                                </Tooltip>
                                                <Tooltip title="View History">
                                                    <IconButton size="small" onClick={() => navigate(`${exp._id}#history`)}><HistoryIcon color="info" /></IconButton>
                                                </Tooltip>
                                                <Tooltip title="Edit">
                                                    <IconButton size="small" onClick={() => navigate(`edit/${exp._id}`)}><EditIcon color="secondary" /></IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton size="small" onClick={() => handleDelete(exp._id)}><DeleteIcon color="error" /></IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
            </Box>
        </Box>
    );
};

export default ExpensesPage;
