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
    Divider
} from '@mui/material';
import {
    Add as AddIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as ApproveIcon,
    Inventory as ReceiveIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    Receipt as BillIcon,
    LocalShipping as ShippingIcon,
    Group as SalaryIcon,
    Business as RentIcon,
    FlashOn as UtilityIcon,
    Build as FixIcon,
    MoreHoriz as OtherIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { purchaseOrdersAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';

const PurchaseOrdersPage: React.FC = () => {
    const navigate = useNavigate();
    const { formatCurrency } = useSettings();
    const theme = useTheme();
    const [pos, setPOs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        status: '',
        category: '',
        paymentStatus: '',
        search: '',
    });

    const fetchPOs = async () => {
        setLoading(true);
        try {
            const response = await purchaseOrdersAPI.getAll({
                page,
                limit: 10,
                ...filters,
            });
            setPOs(response.data.data || []);
            setTotalPages(Math.ceil(response.data.total / 10));
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
            toast.error('Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPOs();
    }, [page, filters]);

    const handleApprove = async (id: string) => {
        try {
            await purchaseOrdersAPI.updateStatus(id, 'approved');
            toast.success('Purchase order approved');
            fetchPOs();
        } catch (error) {
            toast.error('Failed to approve');
        }
    };

    const handleReceive = async (id: string) => {
        try {
            await purchaseOrdersAPI.receive(id);
            toast.success('Items received & stock updated');
            fetchPOs();
        } catch (error) {
            toast.error('Failed to receive items');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this draft?')) return;
        try {
            await purchaseOrdersAPI.delete(id);
            toast.success('Record deleted');
            fetchPOs();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const getCategoryStyles = (category: string) => {
        const styles: Record<string, { icon: any, color: string }> = {
            raw_materials: { icon: <ShippingIcon />, color: '#3b82f6' },
            salaries: { icon: <SalaryIcon />, color: '#10b981' },
            rent: { icon: <RentIcon />, color: '#f59e0b' },
            utilities: { icon: <UtilityIcon />, color: '#6366f1' },
            maintenance: { icon: <FixIcon />, color: '#ec4899' },
            supplies: { icon: <BillIcon />, color: '#8b5cf6' },
            other: { icon: <OtherIcon />, color: '#64748b' },
        };
        return styles[category] || styles.other;
    };

    const getStatusStyles = (status: string) => {
        const styles: Record<string, { label: string, color: string, bg: string }> = {
            draft: { label: 'Draft', color: '#64748b', bg: '#f1f5f9' },
            pending: { label: 'Awaiting Approval', color: '#f59e0b', bg: '#fef3c7' },
            approved: { label: 'Confirmed', color: '#3b82f6', bg: '#dbeafe' },
            received: { label: 'Completed', color: '#10b981', bg: '#dcfce7' },
            cancelled: { label: 'Void', color: '#ef4444', bg: '#fee2e2' },
        };
        return styles[status] || { label: status, color: '#000', bg: '#fff' };
    };

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1600, mx: 'auto' }}>
            {/* Header Section */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={3}
                mb={5}
            >
                <Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5, fontSize: { xs: '1.75rem', md: '2.125rem' } }}>
                        Financial Ledger
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Comprehensive tracking of procurement, salaries, and operational costs.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('create')}
                    sx={{
                        borderRadius: 3,
                        px: 4,
                        py: { xs: 1.5, md: 1.8 },
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                        textTransform: 'none',
                        width: { xs: '100%', sm: 'auto' }
                    }}
                >
                    Create New Entry
                </Button>
            </Stack>

            <Paper sx={{
                p: { xs: 2, md: 1 },
                mb: 4,
                borderRadius: 4,
                bgcolor: '#111827',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'center' },
                gap: 1,
                flexWrap: 'wrap',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
                <TextField
                    placeholder="Search Number or Vendor..."
                    size="small"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    sx={{
                        minWidth: { xs: '100%', md: 280 },
                        '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { border: 'none' } },
                        bgcolor: alpha('#fff', 0.05), borderRadius: 3, m: 0.5
                    }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: alpha('#fff', 0.5) }} /></InputAdornment> }}
                />

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', p: 0.5, justifyContent: { xs: 'space-between', md: 'flex-start' } }}>
                    {[
                        { label: 'Category', key: 'category', options: ['raw_materials', 'salaries', 'rent', 'utilities', 'maintenance', 'supplies', 'other'] },
                        { label: 'Status', key: 'status', options: ['draft', 'pending', 'approved', 'received', 'cancelled'] },
                        { label: 'Payment', key: 'paymentStatus', options: ['unpaid', 'partial', 'paid'] }
                    ].map((f) => (
                        <TextField
                            key={f.key}
                            select
                            size="small"
                            label={f.label}
                            value={(filters as any)[f.key]}
                            onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
                            sx={{
                                minWidth: { xs: 'calc(50% - 8px)', sm: 150 },
                                flexGrow: { xs: 1, md: 0 },
                                '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: alpha('#fff', 0.1) } },
                                '& .MuiInputLabel-root': { color: alpha('#fff', 0.5) },
                                '& .MuiSvgIcon-root': { color: 'white' }
                            }}
                        >
                            <MenuItem value="">All {f.label}</MenuItem>
                            {f.options.map((opt) => (
                                <MenuItem key={opt} value={opt}>{opt.replace('_', ' ').toUpperCase()}</MenuItem>
                            ))}
                        </TextField>
                    ))}
                </Box>
            </Paper>

            {/* Transaction List */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={60} thickness={2} /></Box>
            ) : pos.length === 0 ? (
                <Paper sx={{ p: 10, textAlign: 'center', borderRadius: 4, border: '2px dashed', borderColor: 'divider', bgcolor: 'transparent' }}>
                    <BillIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h5" color="text.secondary">No transactions found matching your criteria</Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {pos.map((po) => {
                        const catStyle = getCategoryStyles(po.category);
                        const statusStyle = getStatusStyles(po.status);
                        return (
                            <Grid item xs={12} key={po._id}>
                                <Paper
                                    sx={{
                                        p: { xs: 2, md: 3 },
                                        borderRadius: 4,
                                        transition: '0.3s',
                                        '&:hover': { transform: { md: 'translateY(-2px)' }, boxShadow: '0 12px 30px rgba(0,0,0,0.08)' },
                                        display: 'flex',
                                        flexDirection: { xs: 'column', md: 'row' },
                                        alignItems: { xs: 'stretch', md: 'center' },
                                        gap: { xs: 2, md: 3 },
                                        position: 'relative'
                                    }}
                                >
                                    <Box sx={{ display: { xs: 'flex', md: 'contents' }, alignItems: 'center', gap: 2 }}>
                                        <Avatar sx={{ bgcolor: alpha(catStyle.color, 0.1), color: catStyle.color, width: { xs: 50, md: 60 }, height: { xs: 50, md: 60 } }}>
                                            {catStyle.icon}
                                        </Avatar>

                                        <Box sx={{ flexGrow: 1 }}>
                                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                                <Typography variant="h6" fontWeight="bold">#{po.poNumber}</Typography>
                                                <Chip
                                                    label={statusStyle.label}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: statusStyle.bg,
                                                        color: statusStyle.color,
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                            </Stack>
                                            <Typography variant="body1" fontWeight="500">{po.vendor.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {po.category.replace('_', ' ').toUpperCase()} • {new Date(po.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, mx: 2 }} />

                                    <Box sx={{ display: { xs: 'flex', md: 'contents' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ textAlign: { xs: 'left', md: 'center' }, minWidth: { md: 120 } }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Payment Status</Typography>
                                            <Chip
                                                label={po.paymentStatus.toUpperCase()}
                                                size="small"
                                                variant="outlined"
                                                color={po.paymentStatus === 'paid' ? 'success' : po.paymentStatus === 'partial' ? 'warning' : 'error'}
                                                sx={{ fontWeight: 'bold' }}
                                            />
                                        </Box>

                                        <Box sx={{ textAlign: 'right', minWidth: { md: 150 } }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Grand Net</Typography>
                                            <Typography variant="h5" fontWeight="900" color="primary.main">
                                                {formatCurrency(po.totalAmount)}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Divider sx={{ display: { xs: 'block', md: 'none' } }} />

                                    <Stack direction="row" spacing={1} sx={{ justifyContent: { xs: 'flex-end', md: 'flex-start' }, ml: { md: 2 } }}>
                                        <Tooltip title="View Details">
                                            <IconButton onClick={() => navigate(`${po._id}`)} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}><ViewIcon color="primary" /></IconButton>
                                        </Tooltip>
                                        {po.status === 'pending' && (
                                            <Tooltip title="Approve">
                                                <IconButton onClick={() => handleApprove(po._id)} sx={{ bgcolor: alpha(theme.palette.info.main, 0.05) }}><ApproveIcon color="info" /></IconButton>
                                            </Tooltip>
                                        )}
                                        {po.status === 'approved' && po.type !== 'expense' && (
                                            <Tooltip title="Receive Items">
                                                <IconButton onClick={() => handleReceive(po._id)} sx={{ bgcolor: alpha(theme.palette.success.main, 0.05) }}><ReceiveIcon color="success" /></IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Delete">
                                            <IconButton onClick={() => po.status === 'draft' && handleDelete(po._id)} sx={{ bgcolor: alpha(theme.palette.error.main, 0.05), opacity: po.status === 'draft' ? 1 : 0.3 }}><DeleteIcon color="error" /></IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Paper>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Pagination Sidebar */}
            <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                    color="primary"
                    size="large"
                    sx={{ '& .MuiPaginationItem-root': { borderRadius: 2, fontWeight: 'bold' } }}
                />
            </Box>
        </Box>
    );
};

export default PurchaseOrdersPage;
