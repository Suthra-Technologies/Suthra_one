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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
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
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const headingFontSize = { xs: '1.12rem', sm: '1.4rem', md: '2.125rem' };
    const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };
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
    const [deleteDialog, setDeleteDialog] = useState({ open: false, orderId: '', orderNumber: '' });
    const [deleting, setDeleting] = useState(false);

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

    const handleDeleteClick = (id: string, poNumber: string) => {
        setDeleteDialog({ open: true, orderId: id, orderNumber: poNumber });
    };

    const handleConfirmDelete = async () => {
        setDeleting(true);
        try {
            await purchaseOrdersAPI.delete(deleteDialog.orderId);
            toast.success('Record deleted');
            setDeleteDialog({ open: false, orderId: '', orderNumber: '' });
            fetchPOs();
        } catch (error) {
            toast.error('Failed to delete');
        } finally {
            setDeleting(false);
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
        <Box sx={{ p: { xs: 1.2, md: 4 }, maxWidth: 1600, mx: 'auto' }}>
            {/* Header Section */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'center', sm: 'center' }}
                spacing={{ xs: 1.5, sm: 3 }}
                mb={{ xs: 2, md: 5 }}
            >
                <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, width: { xs: '100%', sm: 'auto' } }}>
                    <Typography
                        variant="h4"
                        fontWeight={800}
                        sx={{
                            mb: 0.5,
                            fontSize: headingFontSize,
                            color: { xs: '#000', sm: 'text.primary' },
                            textAlign: { xs: 'center', sm: 'left' },
                        }}
                    >
                        Financial Ledger
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, fontSize: bodyFontSize }}>
                        Comprehensive tracking of procurement, salaries, and operational costs.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    size={isMobile ? "medium" : "large"}
                    startIcon={<AddIcon />}
                    onClick={() => navigate('create')}
                    sx={{
                        borderRadius: { xs: 2, md: 3 },
                        px: { xs: 2.5, md: 4 },
                        py: { xs: 1, md: 1.8 },
                        fontWeight: 'bold',
                        fontSize: bodyFontSize,
                        boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                        textTransform: 'none',
                        width: { xs: '100%', sm: 'auto' }
                    }}
                >
                    Create New Entry
                </Button>
            </Stack>

            <Paper sx={{
                p: { xs: 0.8, md: 1 },
                mb: { xs: 2, md: 4 },
                borderRadius: { xs: 3, md: 4 },
                bgcolor: '#111827',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'center' },
                gap: 1,
                flexWrap: 'wrap',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
                <TextField
                    placeholder="Search Order or Vendor..."
                    size="small"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    sx={{
                        minWidth: { xs: '100%', md: 280 },
                        '& .MuiOutlinedInput-root': { 
                            color: 'white', 
                            '& fieldset': { border: 'none' },
                            height: { xs: 40, md: 'auto' }
                        },
                        bgcolor: alpha('#fff', 0.05), borderRadius: { xs: 2, md: 3 }, m: 0.5
                    }}
                    InputProps={{ 
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: alpha('#fff', 0.5), fontSize: { xs: 20, md: 24 } }} /></InputAdornment>,
                        sx: { fontSize: { xs: '0.875rem', md: '1rem' } }
                    }}
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
                                minWidth: { xs: 'calc(33.33% - 6px)', sm: 150 },
                                flexGrow: 1,
                                '& .MuiOutlinedInput-root': { 
                                    color: 'white', 
                                    '& fieldset': { borderColor: alpha('#fff', 0.1) },
                                    height: { xs: 36, md: 'auto' },
                                    borderRadius: 2
                                },
                                '& .MuiInputLabel-root': { color: alpha('#fff', 0.5), fontSize: { xs: '0.75rem', md: '0.875rem' } },
                                '& .MuiSvgIcon-root': { color: 'white', fontSize: { xs: 18, md: 20 } },
                                m: 0.2
                            }}
                            SelectProps={{
                                sx: { fontSize: { xs: '0.75rem', md: '0.875rem' } }
                            }}
                        >
                            <MenuItem value="" sx={{ fontSize: '0.875rem' }}>All {f.label}</MenuItem>
                            {f.options.map((opt) => (
                                <MenuItem key={opt} value={opt} sx={{ fontSize: '0.875rem' }}>{opt.replace('_', ' ').toUpperCase()}</MenuItem>
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
            ) : isMobile ? (
                <Grid container spacing={isMobile ? 0.75 : 2} justifyContent="center" sx={{ width: '100%', m: 0, px: 0.4 }}>
                    {pos.map((po) => {
                        const catStyle = getCategoryStyles(po.category);
                        const statusStyle = getStatusStyles(po.status);
                        return (
                            <Grid item xs={12} key={po._id} sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Paper
                                    sx={{
                                        width: '100%',
                                        maxWidth: 500,
                                        mx: 'auto',
                                        p: 1.1,
                                        borderRadius: 3,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 0.9,
                                        position: 'relative',
                                        border: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar sx={{ bgcolor: alpha(catStyle.color, 0.1), color: catStyle.color, width: 40, height: 40 }}>
                                            {catStyle.icon}
                                        </Avatar>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Stack direction="row" spacing={0.7} alignItems="center" mb={0.1}>
                                                <Typography variant="body2" fontWeight={800} sx={{ fontSize: '0.82rem' }}>#{po.poNumber}</Typography>
                                                <Chip
                                                    label={statusStyle.label}
                                                    size="small"
                                                    sx={{ bgcolor: statusStyle.bg, color: statusStyle.color, fontSize: '0.625rem', height: 20, fontWeight: 800 }}
                                                />
                                            </Stack>
                                            <Typography variant="body2" fontWeight="600" sx={{ mb: 0.1, fontSize: '0.74rem' }}>{po.vendor?.name || 'Manual Entry'}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>
                                                {po.category?.replace('_', ' ').toUpperCase() || 'OTHER'} • {po.createdAt ? new Date(po.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Divider sx={{ my: 0.35, borderStyle: 'dashed', opacity: 0.5 }} />

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.1, fontSize: '0.62rem' }}>Payment</Typography>
                                            <Chip
                                                label={po.paymentStatus.toUpperCase()}
                                                size="small"
                                                variant="outlined"
                                                color={po.paymentStatus === 'paid' ? 'success' : po.paymentStatus === 'partial' ? 'warning' : 'error'}
                                                sx={{ fontWeight: 800, fontSize: '0.6rem', height: 18 }}
                                            />
                                        </Box>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.1, fontSize: '0.62rem' }}>Grand Total</Typography>
                                            <Typography variant="h6" fontWeight={900} color="primary.main" sx={{ fontSize: '1rem' }}>
                                                {formatCurrency ? formatCurrency(po.totalAmount || 0) : `$${(po.totalAmount || 0).toFixed(2)}`}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Divider sx={{ my: 0.35, opacity: 0.3 }} />

                                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                                        <Tooltip title="View Details">
                                            <IconButton size="small" onClick={() => navigate(`${po._id}`)} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}><ViewIcon color="primary" fontSize="small" /></IconButton>
                                        </Tooltip>
                                        {po.status === 'pending' && (
                                            <Tooltip title="Approve">
                                                <IconButton size="small" onClick={() => handleApprove(po._id)} sx={{ bgcolor: alpha(theme.palette.info.main, 0.05) }}><ApproveIcon color="info" fontSize="small" /></IconButton>
                                            </Tooltip>
                                        )}
                                        {po.status === 'approved' && po.type !== 'expense' && (
                                            <Tooltip title="Receive Items">
                                                <IconButton size="small" onClick={() => handleReceive(po._id)} sx={{ bgcolor: alpha(theme.palette.success.main, 0.05) }}><ReceiveIcon color="success" fontSize="small" /></IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Delete">
                                            <IconButton size="small" onClick={() => handleDeleteClick(po._id, po.poNumber)} sx={{ bgcolor: alpha(theme.palette.error.main, 0.05) }}><DeleteIcon color="error" fontSize="small" /></IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Paper>
                            </Grid>
                        );
                    })}
                </Grid>
            ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Order Details</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Vendor / Entity</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Payment</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pos.map((po) => {
                                const catStyle = getCategoryStyles(po.category);
                                const statusStyle = getStatusStyles(po.status);
                                return (
                                    <TableRow key={po._id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">#{po.poNumber}</Typography>
                                            <Typography variant="caption" color="text.secondary">{new Date(po.createdAt).toLocaleDateString()}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{po.vendor?.name || 'Manual Entry'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={catStyle.icon}
                                                label={po.category.replace('_', ' ').toUpperCase()}
                                                size="small"
                                                sx={{ bgcolor: alpha(catStyle.color, 0.1), color: catStyle.color, fontWeight: 'bold' }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold" color="primary.main">
                                                {formatCurrency ? formatCurrency(po.totalAmount || 0) : `$${(po.totalAmount || 0).toFixed(2)}`}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={statusStyle.label} size="small" sx={{ bgcolor: statusStyle.bg, color: statusStyle.color, fontWeight: 'bold' }} />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={po.paymentStatus.toUpperCase()}
                                                size="small"
                                                color={po.paymentStatus === 'paid' ? 'success' : po.paymentStatus === 'partial' ? 'warning' : 'error'}
                                                variant="outlined"
                                                sx={{ fontWeight: 'bold' }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Tooltip title="View Details">
                                                    <IconButton size="small" onClick={() => navigate(`${po._id}`)}><ViewIcon color="primary" /></IconButton>
                                                </Tooltip>
                                                {po.status === 'pending' && (
                                                    <Tooltip title="Approve">
                                                        <IconButton size="small" onClick={() => handleApprove(po._id)}><ApproveIcon color="info" /></IconButton>
                                                    </Tooltip>
                                                )}
                                                {po.status === 'approved' && po.type !== 'expense' && (
                                                    <Tooltip title="Receive Items">
                                                        <IconButton size="small" onClick={() => handleReceive(po._id)}><ReceiveIcon color="success" /></IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Delete">
                                                    <IconButton size="small" onClick={() => handleDeleteClick(po._id, po.poNumber)}><DeleteIcon color="error" /></IconButton>
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

            {/* Pagination Sidebar */}
            <Box sx={{ mt: { xs: 2.5, sm: 6 }, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                    color="primary"
                    size="large"
                    sx={{ '& .MuiPaginationItem-root': { borderRadius: 2, fontWeight: 'bold' } }}
                />
            </Box>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialog.open}
                onClose={() => !deleting && setDeleteDialog({ open: false, orderId: '', orderNumber: '' })}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>Delete Purchase Order</DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        Are you sure you want to delete purchase order <strong>#{deleteDialog.orderNumber}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                        This action cannot be undone. All history and data associated with this order will be permanently removed.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setDeleteDialog({ open: false, orderId: '', orderNumber: '' })} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDelete}
                        disabled={deleting}
                        startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PurchaseOrdersPage;
