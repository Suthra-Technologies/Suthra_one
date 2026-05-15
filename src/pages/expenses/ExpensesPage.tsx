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
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Slider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
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
    History as HistoryIcon,
    CalendarToday as CalendarIcon,
    RestaurantMenuOutlined as RestaurantMenuOutlinedIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { expensesAPI, cateringAPI } from '../../services/api';
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
        minAmount: undefined,
        maxAmount: undefined,
    });
    const [search, setSearch] = useState('');
    const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
    const [showTimeFilterModal, setShowTimeFilterModal] = useState(false);
    const [customAmountRange, setCustomAmountRange] = useState({ min: 0, max: 5000 });
    const [amountRange, setAmountRange] = useState({ min: 0, max: 5000 });
    const [inputValues, setInputValues] = useState({ min: '', max: '' });
    const [customDateRange, setCustomDateRange] = useState({ startDate: null, endDate: null });

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get all expenses for min/max calculation
            const allExpensesRes = await expensesAPI.getAll({ page: 1, limit: 1000 });
            const allExpenses = allExpensesRes.data.data || [];
            const amounts = allExpenses.map(expense => expense.amount);
            const minAmount = amounts.length > 0 ? Math.min(...amounts) : 0;
            const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;
            
            // Update amount range state for slider
            setAmountRange({ min: minAmount, max: maxAmount });
            
            // Initialize custom range if not set
            if (customAmountRange.min === 0 && customAmountRange.max === 5000) {
                setCustomAmountRange({ min: minAmount, max: maxAmount });
            }
            
            // Clean up filters before sending to API
            const cleanFilters = {
                page,
                limit: 10,
                ...Object.fromEntries(
                    Object.entries(filters).filter(([_, value]) => 
                        value !== undefined && value !== null && value !== ''
                    )
                )
            };
            
            console.log('Clean filters being sent to API:', cleanFilters);
            
            // Get filtered data with current filters
            // For commissions, we only send filters it supports (search, status, date range)
            const commissionFilters = {
                page,
                limit: 10,
                search: filters.search,
                status: filters.status,
                startDate: (filters as any).startDate,
                endDate: (filters as any).endDate
            };

            const [listRes, statsRes, commissionsRes] = await Promise.all([
                expensesAPI.getAll(cleanFilters),
                expensesAPI.getStats(),
                cateringAPI.getCommissions(commissionFilters)
            ]);
            
            // Map commissions to expense format
            const commList = commissionsRes.data.commissions || commissionsRes.data.data || [];
            const mappedCommissions = commList.map((c: any) => ({
                ...c,
                _id: c._id,
                expenseNumber: c.commissionNumber,
                createdAt: c.createdAt,
                payee: { 
                    name: c.reference?.name || 'Catering Beneficiary', 
                    type: c.reference?.type === 'internal_team' ? 'person' : 'organization' 
                },
                category: 'Catering Commission',
                type: 'one_time',
                amount: c.commissionAmount || 0,
                status: c.status === 'approved' ? 'paid' : (c.status === 'paid' ? 'paid' : 'pending'),
                isCateringCommission: true
            }));

            const combinedExpenses = [
                ...(listRes.data.data || []),
                ...mappedCommissions
            ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setExpenses(combinedExpenses);
            
            const totalCount = (listRes.data.total || 0) + (commissionsRes.data.total || 0);
            setTotalPages(Math.ceil(totalCount / 10));
            
            // Get ALL commissions for the period to calculate accurate totals for the cards
            const allCommsRes = await cateringAPI.getCommissions({ ...commissionFilters, limit: 1000, page: 1 });
            const allComms = allCommsRes.data.commissions || allCommsRes.data.data || [];
            
            const commStats = allComms.reduce((acc: any, curr: any) => {
                const amount = curr.commissionAmount || 0;
                acc.total += amount;
                acc.count += 1;
                return acc;
            }, { total: 0, count: 0 });

            const updatedStats = {
                ...(statsRes.data.data || {}),
                dailyTotal: (statsRes.data.data?.dailyTotal || 0) + (timeFilter === 'daily' ? commStats.total : 0),
                dailyCount: (statsRes.data.data?.dailyCount || 0) + (timeFilter === 'daily' ? commStats.count : 0),
                weeklyTotal: (statsRes.data.data?.weeklyTotal || 0) + (timeFilter === 'weekly' ? commStats.total : 0),
                weeklyCount: (statsRes.data.data?.weeklyCount || 0) + (timeFilter === 'weekly' ? commStats.count : 0),
                monthlyTotal: (statsRes.data.data?.monthlyTotal || 0) + (timeFilter === 'monthly' ? commStats.total : 0),
                monthlyCount: (statsRes.data.data?.monthlyCount || 0) + (timeFilter === 'monthly' ? commStats.count : 0)
            };
            
            // If it's a custom range or other filter, we still want to show the combined total in the main card
            if (timeFilter === 'custom' || filters.search) {
                 // The main card uses monthlyTotal as a fallback in some UI parts, 
                 // but let's make sure the specific card shown is updated.
            }

            setStats(updatedStats);
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

    const getTimeFilterDates = (filter: 'daily' | 'weekly' | 'monthly') => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        if (filter === 'daily') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        } else if (filter === 'weekly') {
            const dayOfWeek = now.getDay();
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else if (filter === 'monthly') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }

        return { startDate, endDate };
    };

    const handleTimeFilterClick = (filter: 'daily' | 'weekly' | 'monthly' | 'custom') => {
        if (filter === 'custom') {
            // Initialize input values when opening dialog
            setInputValues({
                min: customAmountRange.min.toString(),
                max: customAmountRange.max.toString()
            });
            setShowTimeFilterModal(true);
        } else {
            if (timeFilter === filter) {
                // Clear filter - reset to monthly
                setTimeFilter('monthly');
                setFilters(prev => ({ 
                    ...prev, 
                    startDate: undefined, 
                    endDate: undefined, 
                    minAmount: undefined, 
                    maxAmount: undefined 
                }));
                // Reset custom range to API defaults
                setCustomAmountRange({ min: amountRange.min, max: amountRange.max });
            } else {
                setTimeFilter(filter);
                const dates = getTimeFilterDates(filter);
                setFilters(prev => ({ 
                    ...prev, 
                    startDate: dates.startDate, 
                    endDate: dates.endDate, 
                    minAmount: undefined, 
                    maxAmount: undefined 
                }));
                // Reset custom range to API defaults
                setCustomAmountRange({ min: amountRange.min, max: amountRange.max });
            }
            setPage(1);
        }
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

            {/* Time Period Filter */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} mb={3}>
                <Box>
                    <Typography variant="body2" fontWeight={600} color="text.secondary">
                        Time Period:
                    </Typography>
                </Box>
                <TextField
                    select
                    value={timeFilter}
                    onChange={(e) => handleTimeFilterClick(e.target.value as 'daily' | 'weekly' | 'monthly' | 'custom')}
                    size="small"
                    sx={{ 
                        minWidth: 150,
                        '& .MuiOutlinedInput-root': { 
                            borderRadius: 2,
                            bgcolor: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        },
                        '& .MuiInputLabel-root': { color: 'text.secondary' },
                    }}
                >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                </TextField>
            </Stack>

            {/* Header with Filter and Dynamic Card */}
            <Grid container spacing={3} mb={4}>
                {/* Dynamic Card */}
                <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="flex-start">
                                <Avatar sx={{ 
                                    bgcolor: timeFilter === 'daily' ? alpha('#f59e0b', 0.1) : 
                                             timeFilter === 'weekly' ? alpha('#10b981', 0.1) : 
                                             timeFilter === 'monthly' ? alpha(theme.palette.primary.main, 0.1) : 
                                             alpha('#6366f1', 0.1),
                                    color: timeFilter === 'daily' ? '#f59e0b' : 
                                           timeFilter === 'weekly' ? '#10b981' : 
                                           timeFilter === 'monthly' ? theme.palette.primary.main : 
                                           '#6366f1'
                                }}>
                                    {timeFilter === 'daily' ? <ExpenseIcon /> : 
                                     timeFilter === 'weekly' ? <HistoryIcon /> : 
                                     timeFilter === 'monthly' ? <TrendIcon /> : 
                                     <TrendIcon />}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        {timeFilter === 'daily' ? 'Daily Total' : 
                                         timeFilter === 'weekly' ? 'Weekly Total' : 
                                         timeFilter === 'monthly' ? 'Monthly Total' : 
                                         'Custom Range Total'}
                                    </Typography>
                                    <Typography variant="h6" fontWeight="bold">
                                        {formatCurrency ? 
                                            formatCurrency(
                                                timeFilter === 'daily' ? (stats?.dailyTotal || 0) : 
                                                timeFilter === 'weekly' ? (stats?.weeklyTotal || 0) : 
                                                (stats?.monthlyTotal || 0)
                                            ) : 
                                            `${
                                                timeFilter === 'daily' ? (stats?.dailyTotal || 0) : 
                                                timeFilter === 'weekly' ? (stats?.weeklyTotal || 0) : 
                                                (stats?.monthlyTotal || 0)
                                            }`
                                        }
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {timeFilter === 'daily' ? `${stats?.dailyCount || 0} expenses` : 
                                         timeFilter === 'weekly' ? `${stats?.weeklyCount || 0} expenses` : 
                                         timeFilter === 'monthly' ? `${stats?.monthlyCount || 0} expenses` : 
                                         `${filters.minAmount || amountRange.min} - ${filters.maxAmount || amountRange.max} range`}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Pending Approval Card */}
                <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="flex-start">
                                <Avatar sx={{ bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b' }}>
                                    <WalletIcon />
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">Pending Approval</Typography>
                                    <Typography variant="h6" fontWeight="bold">{formatCurrency ? formatCurrency(stats?.pendingTotal || 0) : `$${(stats?.pendingTotal || 0).toFixed(2)}`}</Typography>
                                    <Typography variant="caption" color="text.secondary">{stats?.pendingCount || 0} expenses</Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Overdue Bills Card */}
                <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="flex-start">
                                <Avatar sx={{ bgcolor: alpha('#ef4444', 0.1), color: '#ef4444' }}>
                                    <AlertIcon />
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">Overdue Bills</Typography>
                                    <Typography variant="h6" fontWeight="bold">{stats?.overdueCount || 0}</Typography>
                                    <Typography variant="caption" color="text.secondary">Require attention</Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Top Category Card */}
                <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="flex-start">
                                <Avatar sx={{ bgcolor: alpha('#6366f1', 0.1), color: '#6366f1' }}>
                                    <NotifyIcon />
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary">Top Category</Typography>
                                    <Typography variant="h6" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                                        {stats?.categoryBreakdown?.[0]?._id || 'N/A'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatCurrency ? formatCurrency(stats?.categoryBreakdown?.[0]?.total || 0) : `$${(stats?.categoryBreakdown?.[0]?.total || 0).toFixed(2)}`}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Time Filter Status */}
            {timeFilter !== 'monthly' && (
                <Paper sx={{ p: 2, mb: 3, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.1), border: `1px solid ${theme.palette.primary.main}` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="body2" fontWeight={600} color="primary.main">
                                {timeFilter === 'daily' && '📅 Daily Expenses'}
                                {timeFilter === 'weekly' && '📅 Weekly Expenses'}
                                {timeFilter === 'monthly' && '📅 Monthly Expenses'}
                                {timeFilter === 'custom' && '💰 Custom Amount Range'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {timeFilter === 'daily' && `Showing expenses from today (${new Date().toLocaleDateString()})`}
                                {timeFilter === 'weekly' && `Showing expenses from this week`}
                                {timeFilter === 'monthly' && `Showing expenses from ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                                {timeFilter === 'custom' && `Showing expenses between $${filters.minAmount || amountRange.min} and $${filters.maxAmount || amountRange.max}`}
                            </Typography>
                        </Box>
                        <Button 
                            size="small" 
                            variant="outlined" 
                            onClick={() => handleTimeFilterClick('monthly')}
                            sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}
                        >
                            Clear Filter
                        </Button>
                    </Stack>
                </Paper>
            )}

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
                                                {exp.isCateringCommission ? <RestaurantMenuOutlinedIcon fontSize="small" color="primary" /> : (exp.payee.type === 'organization' ? <OrgIcon fontSize="small" color="action" /> : <PersonIcon fontSize="small" color="action" />)}
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
                                            {exp.isCateringCommission ? (
                                                <Typography variant="body2" color="text.disabled" sx={{ pr: 2 }}>—</Typography>
                                            ) : (
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <Tooltip title="View Details">
                                                        <IconButton size="small" onClick={() => navigate(`${exp._id}`)}>
                                                            <ViewIcon color="primary" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="View History">
                                                        <IconButton size="small" onClick={() => navigate(`${exp._id}#history`)}><HistoryIcon color="info" /></IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Edit">
                                                        <IconButton size="small" onClick={() => navigate(`edit/${exp._id}`)}><EditIcon color="secondary" /></IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton size="small" onClick={() => handleDelete(exp._id)}>
                                                            <DeleteIcon color="error" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            )}
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

            {/* Custom Amount Filter Dialog */}
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Dialog 
                    open={showTimeFilterModal} 
                    onClose={() => setShowTimeFilterModal(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 4,
                            boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
                        }
                    }}
                >
                <DialogTitle sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight={600}>Custom Amount Filter</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Set your custom amount range to filter expenses
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ py: 3 }}>
                    {/* Date Range Section - FIRST */}
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mt:2, mb: 3 }}>
                            Date Range 
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                            <DatePicker
                                label="From Date"
                                value={customDateRange.startDate}
                                onChange={(newValue) => {
                                    setCustomDateRange(prev => ({ 
                                        ...prev, 
                                        startDate: newValue 
                                    }));
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        size="small"
                                        sx={{ flex: 1 }}
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <CalendarIcon />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                            />
                            <DatePicker
                                label="To Date"
                                value={customDateRange.endDate}
                                onChange={(newValue) => {
                                    setCustomDateRange(prev => ({ 
                                        ...prev, 
                                        endDate: newValue 
                                    }));
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        size="small"
                                        sx={{ flex: 1 }}
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <CalendarIcon />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                            />
                        </Stack>
                    </Box>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    {/* Amount Range Section - SECOND */}
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Amount Range: ${amountRange.min} - ${amountRange.max}
                        </Typography>
                        
                        {/* Input Fields for Direct Entry */}
                        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                            <TextField
                                label="Min Amount"
                                type="number"
                                value={inputValues.min}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setInputValues(prev => ({ ...prev, min: value }));
                                    
                                    // Only update the actual range if it's a valid number
                                    if (value === '' || value === '-') {
                                        setCustomAmountRange(prev => ({ ...prev, min: 0 }));
                                    } else {
                                        const numValue = Number(value);
                                        if (!isNaN(numValue)) {
                                            setCustomAmountRange(prev => ({ 
                                                ...prev, 
                                                min: Math.min(numValue, prev.max) 
                                            }));
                                        }
                                    }
                                }}
                                onBlur={(e) => {
                                    const value = Number(e.target.value);
                                    let finalValue = value;
                                    
                                    if (isNaN(value) || value < amountRange.min) {
                                        finalValue = amountRange.min;
                                    } else if (value > amountRange.max) {
                                        finalValue = amountRange.max;
                                    }
                                    
                                    setCustomAmountRange(prev => ({ ...prev, min: finalValue }));
                                    setInputValues(prev => ({ ...prev, min: finalValue.toString() }));
                                }}
                                onFocus={() => {
                                    // Set input value to current range value when focused
                                    setInputValues(prev => ({ ...prev, min: customAmountRange.min.toString() }));
                                }}
                                InputProps={{
                                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                                }}
                                size="small"
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="Max Amount"
                                type="number"
                                value={inputValues.max}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setInputValues(prev => ({ ...prev, max: value }));
                                    
                                    // Only update the actual range if it's a valid number
                                    if (value === '' || value === '-') {
                                        setCustomAmountRange(prev => ({ ...prev, max: amountRange.max }));
                                    } else {
                                        const numValue = Number(value);
                                        if (!isNaN(numValue)) {
                                            setCustomAmountRange(prev => ({ 
                                                ...prev, 
                                                max: Math.max(numValue, prev.min) 
                                            }));
                                        }
                                    }
                                }}
                                onBlur={(e) => {
                                    const value = Number(e.target.value);
                                    let finalValue = value;
                                    
                                    if (isNaN(value) || value < amountRange.min) {
                                        finalValue = amountRange.max;
                                    } else if (value > amountRange.max) {
                                        finalValue = amountRange.max;
                                    }
                                    
                                    setCustomAmountRange(prev => ({ ...prev, max: finalValue }));
                                    setInputValues(prev => ({ ...prev, max: finalValue.toString() }));
                                }}
                                onFocus={() => {
                                    // Set input value to current range value when focused
                                    setInputValues(prev => ({ ...prev, max: customAmountRange.max.toString() }));
                                }}
                                InputProps={{
                                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                                }}
                                size="small"
                                sx={{ flex: 1 }}
                            />
                        </Stack>
                        
                        <Slider
                            value={[customAmountRange.min, customAmountRange.max]}
                            onChange={(event, newValue) => {
                                if (Array.isArray(newValue)) {
                                    setCustomAmountRange({ min: newValue[0], max: newValue[1] });
                                    // Sync input values when slider changes
                                    setInputValues({ 
                                        min: newValue[0].toString(), 
                                        max: newValue[1].toString() 
                                    });
                                }
                            }}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value) => `$${value}`}
                            min={amountRange.min}
                            max={amountRange.max}
                            sx={{
                                '& .MuiSlider-thumb': {
                                    width: 20,
                                    height: 20,
                                    '&:hover, &.Mui-focusVisible': {
                                        boxShadow: '0 0 0 8px rgba(25, 118, 210, 0.16)',
                                    },
                                },
                                '& .MuiSlider-track': {
                                    height: 6,
                                    borderRadius: 3,
                                },
                                '& .MuiSlider-rail': {
                                    height: 6,
                                    borderRadius: 3,
                                },
                            }}
                        />
                        
                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                                Min: ${customAmountRange.min}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Max: ${customAmountRange.max}
                            </Typography>
                        </Stack>
                    </Box>

                    <Box sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        border: '1px solid',
                        borderColor: alpha(theme.palette.primary.main, 0.2)
                    }}>
                        <Typography variant="body2" fontWeight={500} color="primary.main">
                            Filter Preview
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Amount: $${customAmountRange.min} - $${customAmountRange.max}
                        </Typography>
                        {customDateRange.startDate && customDateRange.endDate && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                Date: {customDateRange.startDate.toLocaleDateString()} - {customDateRange.endDate.toLocaleDateString()}
                            </Typography>
                        )}
                        {(!customDateRange.startDate || !customDateRange.endDate) && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                Date: All dates
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button 
                        onClick={() => {
                            // Reset slider and date range to defaults
                            setCustomAmountRange({ min: amountRange.min, max: amountRange.max });
                            setCustomDateRange({ startDate: null, endDate: null });
                            setInputValues({
                                min: amountRange.min.toString(),
                                max: amountRange.max.toString()
                            });
                        }}
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                    >
                        Reset
                    </Button>
                    <Button 
                        onClick={() => setShowTimeFilterModal(false)}
                        variant="text"
                        sx={{ borderRadius: 2 }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={() => {
                            // Validate amount range before applying
                            const minVal = customAmountRange.min;
                            const maxVal = customAmountRange.max;
                            
                            if (minVal === undefined || maxVal === undefined || minVal > maxVal) {
                                toast.error('Please select a valid amount range');
                                return;
                            }
                            
                            // Validate date range if provided
                            if (customDateRange.startDate && customDateRange.endDate) {
                                if (customDateRange.startDate > customDateRange.endDate) {
                                    toast.error('From date cannot be after To date');
                                    return;
                                }
                            }
                            
                            // Apply custom filter with amount and date range
                            setTimeFilter('custom');
                            setFilters(prev => ({ 
                                ...prev, 
                                startDate: customDateRange.startDate ? customDateRange.startDate.toISOString() : undefined, 
                                endDate: customDateRange.endDate ? customDateRange.endDate.toISOString() : undefined,
                                minAmount: minVal,
                                maxAmount: maxVal
                            }));
                            setPage(1);
                            setShowTimeFilterModal(false);
                            
                            // Show success message with applied filters
                            let message = `Filter applied: $${minVal} - $${maxVal}`;
                            if (customDateRange.startDate && customDateRange.endDate) {
                                message += ` | ${customDateRange.startDate.toLocaleDateString()} - ${customDateRange.endDate.toLocaleDateString()}`;
                            }
                            toast.success(message);
                        }}
                        variant="contained"
                        sx={{ borderRadius: 2, px: 3 }}
                    >
                        Apply Filter
                    </Button>
                </DialogActions>
            </Dialog>
            </LocalizationProvider>
        </Box>
    );
};

export default ExpensesPage;
