import {
    Block,
    CheckCircle,
    Close,
    Delete as DeleteIcon,
    Edit,
    Info,
    Payments,
    Search
} from '@mui/icons-material';
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid,
    IconButton,
    InputAdornment,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TableSortLabel,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../../context/SettingsContext';
import { cateringAPI, commissionAPI, customersAPI, usersAPI } from '../../../services/api';

const CateringCommissionsPage = () => {
    const { formatCurrency } = useSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const headingFontSize = { xs: '1.12rem', sm: '1.4rem', md: '2.125rem' };
    const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };
    const [commissions, setCommissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState<string>('date');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [searchName, setSearchName] = useState('');
    const [debouncedSearchName, setDebouncedSearchName] = useState('');

    // Edit/Action State
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedCommission, setSelectedCommission] = useState<any>(null);
    const [editForm, setEditForm] = useState<any>({
        commissionType: 'fixed',
        commissionAmount: 0,
        commissionPercentage: 0,
        reference: {
            type: 'external_customer',
            name: '',
            contact: '',
            email: '',
            userId: null,
            customerId: null,
            notes: ''
        },
        notes: '',
        status: 'pending'
    });
    const [users, setUsers] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [actionLoading, setActionLoading] = useState(false);

    // Defensive aliases
    const safeCustomers = Array.isArray(customers) ? customers : [];
    const safeUsers = Array.isArray(users) ? users : [];

    // Payment State
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [payForm, setPayForm] = useState({
        paymentMethod: 'bank_transfer',
        paymentReference: '',
        paymentDate: new Date().toISOString().split('T')[0]
    });

    // Approve Dialog State
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [approveId, setApproveId] = useState<string | null>(null);

    // Cancel Dialog State
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelId, setCancelId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    // Delete Dialog State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            const res = await usersAPI.getUsers();
            const rawData = res.data.data || res.data.users || res.data;
            setUsers(Array.isArray(rawData) ? rawData : []);
        } catch (error) {
            console.error(error);
            setUsers([]);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await customersAPI.getAll({ page: 1, limit: 1000 });
            const rawData = res.data.customers || res.data.data || res.data;
            setCustomers(Array.isArray(rawData) ? rawData : []);
        } catch (error) {
            console.error(error);
            setCustomers([]);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchCustomers();
    }, []);

    const handleRequestSort = (property: string) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const fetchCommissions = async () => {
        setLoading(true);
        try {
            let sortBy = 'date_desc';
            if (orderBy === 'date') {
                sortBy = order === 'asc' ? 'date_asc' : 'date_desc';
            } else if (orderBy === 'name') {
                sortBy = order === 'asc' ? 'name_asc' : 'name_desc';
            }

            const response = await cateringAPI.getCommissions({
                page: page + 1,
                limit: rowsPerPage,
                sortBy,
                search: debouncedSearchName || undefined
            });
            const commData = response.data.commissions || response.data.data || response.data;
            setCommissions(Array.isArray(commData) ? commData : []);
            setTotal(response.data.total || (Array.isArray(commData) ? commData.length : 0));
        } catch (error) {
            console.error("Failed to fetch commissions", error);
            toast.error("Failed to fetch commissions");
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (commission: any) => {
        const comm = commission.commission || commission;
        setSelectedCommission(commission);
        setEditForm({
            commissionType: comm.commissionType || comm.type || 'fixed',
            commissionAmount: comm.commissionAmount || comm.amount || 0,
            commissionPercentage: comm.commissionPercentage || comm.percentage || 0,
            reference: {
                type: comm.reference?.type || 'external_customer',
                name: comm.reference?.name || '',
                contact: comm.reference?.contact || '',
                email: comm.reference?.email || '',
                userId: comm.reference?.userId || null,
                customerId: comm.reference?.customerId || null,
                notes: comm.reference?.notes || ''
            },
            notes: comm.notes || '',
            status: comm.status || 'pending'
        });
        setEditDialogOpen(true);
    };

    const handleUpdateCommission = async () => {
        if (!selectedCommission) return;
        setActionLoading(true);
        try {
            const id = selectedCommission._id;
            await commissionAPI.update(id, editForm);
            toast.success("Commission updated successfully");
            setEditDialogOpen(false);
            fetchCommissions();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update commission");
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = (id: string) => {
        setApproveId(id);
        setApproveDialogOpen(true);
    };

    const confirmApprove = async () => {
        if (!approveId) return;
        setActionLoading(true);
        try {
            await commissionAPI.approve(approveId);
            toast.success("Commission approved");
            fetchCommissions();
            setApproveDialogOpen(false);
            setApproveId(null);
        } catch (error) {
            toast.error("Failed to approve");
        } finally {
            setActionLoading(false);
        }
    };

    const handlePayClick = (commission: any) => {
        setSelectedCommission(commission);
        setPayForm({
            paymentMethod: 'bank_transfer',
            paymentReference: '',
            paymentDate: new Date().toISOString().split('T')[0]
        });
        setPayDialogOpen(true);
    };

    const handleMarkAsPaid = async () => {
        if (!selectedCommission) return;
        setActionLoading(true);
        try {
            await commissionAPI.markPaid(selectedCommission._id, payForm);
            toast.success("Commission marked as paid");
            setPayDialogOpen(false);
            fetchCommissions();
        } catch (error) {
            console.error(error);
            toast.error("Failed to mark as paid");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = (id: string) => {
        setCancelId(id);
        setCancelReason('');
        setCancelDialogOpen(true);
    };

    const confirmCancel = async () => {
        if (!cancelId) return;
        setActionLoading(true);
        try {
            await commissionAPI.cancel(cancelId, cancelReason || "No reason provided");
            toast.success("Commission cancelled");
            fetchCommissions();
            setCancelDialogOpen(false);
            setCancelId(null);
        } catch (error) {
            toast.error("Failed to cancel");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setActionLoading(true);
        try {
            await commissionAPI.delete(deleteId);
            toast.success("Commission deleted");
            fetchCommissions();
            setDeleteDialogOpen(false);
            setDeleteId(null);
        } catch (error) {
            toast.error("Failed to delete");
        } finally {
            setActionLoading(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchName(searchName);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchName]);

    useEffect(() => {
        fetchCommissions();
    }, [page, rowsPerPage, orderBy, order, debouncedSearchName]);

    return (
        <Box sx={{ p: { xs: 1.2, sm: 3 } }}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={{ xs: 1.25, sm: 0 }} mb={{ xs: 2, sm: 3 }}>
                <Typography
                    variant="h4"
                    fontWeight="bold"
                    sx={{
                        fontSize: headingFontSize,
                        color: { xs: '#000', sm: 'text.primary' },
                        textAlign: { xs: 'center', sm: 'left' },
                        width: { xs: '100%', sm: 'auto' }
                    }}
                >
                    Catering Commissions
                </Typography>

                <TextField
                    placeholder="Search Referrer Name..."
                    variant="outlined"
                    size="small"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        width: { xs: '100%', sm: 250, md: 300 },
                        bgcolor: 'background.paper',
                        '& .MuiInputBase-input': { fontSize: bodyFontSize }
                    }}
                />
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            ) : commissions.length === 0 ? (
                <Box textAlign="center" p={{ xs: 2, sm: 4 }}>
                    <Typography color="textSecondary" sx={{ fontSize: bodyFontSize }}>No commissions found.</Typography>
                </Box>
           ) : (
                <Box>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell><strong>Order #</strong></TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === 'date'}
                                        direction={orderBy === 'date' ? order : 'asc'}
                                        onClick={() => handleRequestSort('date')}
                                        sx={{
                                            '& .MuiTableSortLabel-icon': {
                                                opacity: orderBy === 'date' ? 1 : 0.4,
                                            },
                                            '&:hover .MuiTableSortLabel-icon': {
                                                opacity: 1,
                                            },
                                        }}
                                    >
                                        <strong>Date</strong>
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell><strong>Reference Type</strong></TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === 'name'}
                                        direction={orderBy === 'name' ? order : 'asc'}
                                        onClick={() => handleRequestSort('name')}
                                        sx={{
                                            '& .MuiTableSortLabel-icon': {
                                                opacity: orderBy === 'name' ? 1 : 0.4,
                                            },
                                            '&:hover .MuiTableSortLabel-icon': {
                                                opacity: 1,
                                            },
                                        }}
                                    >
                                        <strong>Referrer/Beneficiary</strong>
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell><strong>Type</strong></TableCell>
                                <TableCell><strong>Value</strong></TableCell>
                                <TableCell><strong>Notes</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell align="right"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {commissions.map((item, index) => {
                                // if (!item) return null;
                                // Fallback: Handle if the item itself is the commission or if it's nested in 'commission'
                                const comm = item.commission || item;
                                const orderNumber = item.cateringOrder?.orderNumber || item.orderNumber || '-';
                                const createdAt = item.createdAt || item.date || new Date().toISOString();

                                // console.log(`Row ${index}:`, item); 

                                if (!comm) return null;

                                return (
                                    <TableRow key={item._id || index} hover>
                                        <TableCell>{orderNumber}</TableCell>
                                        <TableCell>{new Date(createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={comm.reference?.type === 'internal_team' ? 'Internal' : 'External'}
                                                color={comm.reference?.type === 'internal_team' ? 'primary' : 'secondary'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {comm.reference?.name || '-'}
                                            {comm.reference?.contact ? ` (${comm.reference.contact})` : ''}
                                        </TableCell>
                                        <TableCell>{comm.type === 'fixed' || comm.commissionType === 'fixed' ? 'Fixed Amount' : 'Percentage'}</TableCell>
                                        <TableCell>
                                            {(comm.type === 'fixed' || comm.commissionType === 'fixed')
                                                ? formatCurrency(comm.amount || comm.commissionAmount || 0)
                                                : `${comm.percentage || comm.commissionPercentage || 0}%`
                                            }
                                        </TableCell>
                                        <TableCell>{comm.notes || item.notes || '-'}</TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Chip
                                                    label={comm.status?.toUpperCase() || 'PENDING'}
                                                    color={
                                                        comm.status === 'paid' ? 'success' :
                                                            comm.status === 'approved' ? 'info' :
                                                                comm.status === 'cancelled' ? 'error' : 'warning'
                                                    }
                                                    size="small"
                                                />
                                                {/* {comm.status === 'paid' && comm.paymentMethod && (
                                                    <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                                                        {comm.paymentMethod.replace('_', ' ')}
                                                    </Typography>
                                                )} */}
                                                {(comm.status === 'paid' || comm.status === 'cancelled') && (
                                                    <Tooltip
                                                        title={
                                                            comm.status === 'cancelled' ?
                                                                `Reason: ${(Array.isArray(comm.actionHistory) ? comm.actionHistory : []).slice().reverse().find((h: any) => h.action === 'CANCELLED')?.details || 'No reason specified'}` :
                                                                `Paid on ${comm.paymentDate ? new Date(comm.paymentDate).toLocaleDateString() : 'N/A'} via ${comm.paymentMethod?.replace('_', ' ') || 'N/A'}${comm.paymentReference ? ` (Ref: ${comm.paymentReference})` : ''}`
                                                        }
                                                        arrow
                                                    >
                                                        <IconButton size="small" color="inherit" sx={{ opacity: 0.7 }}>
                                                            <Info sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>

                                        <TableCell align="right">
                                            <Box display="flex" justifyContent="flex-end">
                                                <Tooltip title="Edit">
                                                    <IconButton size="small" onClick={() => handleEditClick(item)} disabled={comm.status === 'paid'}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                {comm.status === 'pending' && (
                                                    <Tooltip title="Approve">
                                                        <IconButton size="small" color="primary" onClick={() => handleApprove(item._id)}>
                                                            <CheckCircle fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {comm.status === 'approved' && (
                                                    <Tooltip title="Mark as Paid">
                                                        <IconButton size="small" color="success" onClick={() => handlePayClick(item)}>
                                                            <Payments fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {comm.status !== 'cancelled' && comm.status !== 'paid' && (
                                                    <Tooltip title="Cancel">
                                                        <IconButton size="small" color="error" onClick={() => handleCancel(item._id)}>
                                                            <Block fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {comm.status !== 'paid' && (
                                                    <Tooltip title="Delete">
                                                        <IconButton size="small" color="error" onClick={() => handleDelete(item._id)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
            </TableContainer>
                </Box>

                {/* Mobile Cards */}
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                    {commissions.map((item, index) => {
                        const comm = item.commission || item;
                        const orderNumber = item.cateringOrder?.orderNumber || item.orderNumber || '-';
                        const createdAt = item.createdAt || item.date || new Date().toISOString();
                        if (!comm) return null;
                        return (
                            <Paper key={item._id || index} variant="outlined" sx={{ p: 1.35, mb: 1, borderRadius: 2 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: { xs: '0.86rem', sm: '0.9rem' } }}>Order #{orderNumber}</Typography>
                                    <Chip
                                        label={comm.status?.toUpperCase() || 'PENDING'}
                                        color={
                                            comm.status === 'paid' ? 'success' :
                                            comm.status === 'approved' ? 'info' :
                                            comm.status === 'cancelled' ? 'error' : 'warning'
                                        }
                                        size="small"
                                    />
                                </Box>
                                <Box display="flex" gap={0.75} alignItems="center" mb={0.75}>
                                    <Chip
                                        label={comm.reference?.type === 'internal_team' ? 'Internal' : 'External'}
                                        color={comm.reference?.type === 'internal_team' ? 'primary' : 'secondary'}
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.68rem', sm: '0.75rem' } }}>
                                        {new Date(createdAt).toLocaleDateString()}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ fontSize: bodyFontSize }}><strong>Referrer:</strong> {comm.reference?.name || '-'}{comm.reference?.contact ? ` (${comm.reference.contact})` : ''}</Typography>
                                <Typography variant="body2" sx={{ fontSize: bodyFontSize }}><strong>Type:</strong> {comm.type === 'fixed' || comm.commissionType === 'fixed' ? 'Fixed Amount' : 'Percentage'}</Typography>
                                <Typography variant="body2" sx={{ fontSize: bodyFontSize }}>
                                    <strong>Value:</strong> {(comm.type === 'fixed' || comm.commissionType === 'fixed')
                                        ? formatCurrency(comm.amount || comm.commissionAmount || 0)
                                        : `${comm.percentage || comm.commissionPercentage || 0}%`}
                                </Typography>
                                {(comm.notes || item.notes) && (
                                    <Typography variant="body2" sx={{ fontSize: bodyFontSize }}><strong>Notes:</strong> {comm.notes || item.notes}</Typography>
                                )}
                                {(comm.status === 'paid' || comm.status === 'cancelled') && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.68rem', sm: '0.75rem' } }}>
                                        {comm.status === 'cancelled'
                                            ? `Reason: ${comm.actionHistory?.slice().reverse().find((h: any) => h.action === 'CANCELLED')?.details || 'No reason specified'}`
                                            : `Paid on ${comm.paymentDate ? new Date(comm.paymentDate).toLocaleDateString() : 'N/A'} via ${comm.paymentMethod?.replace('_', ' ') || 'N/A'}${comm.paymentReference ? ` (Ref: ${comm.paymentReference})` : ''}`
                                        }
                                    </Typography>
                                )}
                                <Box display="flex" justifyContent="flex-end" gap={0.25} mt={0.75}>
                                    <Tooltip title="Edit">
                                        <IconButton size="small" onClick={() => handleEditClick(item)} disabled={comm.status === 'paid'}>
                                            <Edit fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    {comm.status === 'pending' && (
                                        <Tooltip title="Approve">
                                            <IconButton size="small" color="primary" onClick={() => handleApprove(item._id)}>
                                                <CheckCircle fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {comm.status === 'approved' && (
                                        <Tooltip title="Mark as Paid">
                                            <IconButton size="small" color="success" onClick={() => handlePayClick(item)}>
                                                <Payments fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {comm.status !== 'cancelled' && comm.status !== 'paid' && (
                                        <Tooltip title="Cancel">
                                            <IconButton size="small" color="error" onClick={() => handleCancel(item._id)}>
                                                <Block fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {comm.status !== 'paid' && (
                                        <Tooltip title="Delete">
                                            <IconButton size="small" color="error" onClick={() => handleDelete(item._id)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Box>
                            </Paper>
                        );
                    })}
                </Box>
                </Box>
            )}

            <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                }}
                sx={{
                    '& .MuiTablePagination-toolbar': { px: { xs: 0.5, sm: 2 }, minHeight: { xs: 44, sm: 52 } },
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: bodyFontSize, m: 0 }
                }}
            />

            {/* Edit Commission Dialog */}
            <Dialog open={editDialogOpen} onClose={() => !actionLoading && setEditDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Edit Commission Details
                    <IconButton
                        onClick={() => !actionLoading && setEditDialogOpen(false)}
                        disabled={actionLoading}
                        size="small"
                        sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            width: 24,
                            height: 24,
                            '&:hover': {
                                bgcolor: 'error.dark',
                            }
                        }}
                    >
                        <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        {/* Commission Type */}
                        <Grid item xs={12}>
                            <FormControl component="fieldset">
                                <FormLabel component="legend">Commission Type</FormLabel>
                                <RadioGroup
                                    row
                                    value={editForm.commissionType}
                                    onChange={(e) => setEditForm({ ...editForm, commissionType: e.target.value })}
                                >
                                    <FormControlLabel value="fixed" control={<Radio size="small" />} label="Fixed Amount" />
                                    <FormControlLabel value="percentage" control={<Radio size="small" />} label="Percentage" />
                                </RadioGroup>
                            </FormControl>
                        </Grid>

                        {/* Amount / Percentage Input */}
                        <Grid item xs={12}>
                            {editForm.commissionType === 'fixed' ? (
                                <TextField
                                    label="Commission Amount"
                                    type="number"
                                    fullWidth
                                    size="small"
                                    InputProps={{ startAdornment: <Box component="span" mr={1}>$</Box> }}
                                    value={editForm.commissionAmount}
                                    onChange={(e) => setEditForm({ ...editForm, commissionAmount: parseFloat(e.target.value) || 0 })}
                                />
                            ) : (
                                <TextField
                                    label="Commission Percentage"
                                    type="number"
                                    fullWidth
                                    size="small"
                                    InputProps={{ endAdornment: <Box component="span" ml={1}>%</Box> }}
                                    value={editForm.commissionPercentage}
                                    onChange={(e) => setEditForm({ ...editForm, commissionPercentage: parseFloat(e.target.value) || 0 })}
                                />
                            )}
                        </Grid>

                        <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

                        {/* Reference Type */}
                        <Grid item xs={12}>
                            <FormControl component="fieldset">
                                <FormLabel component="legend">Reference / Beneficiary Type</FormLabel>
                                <RadioGroup
                                    row
                                    value={editForm.reference.type}
                                    onChange={(e) => setEditForm({
                                        ...editForm,
                                        reference: { ...editForm.reference, type: e.target.value, userId: null, customerId: null }
                                    })}
                                >
                                    <FormControlLabel value="external_customer" control={<Radio size="small" />} label="External" />
                                    <FormControlLabel value="internal_team" control={<Radio size="small" />} label="Internal Team" />
                                </RadioGroup>
                            </FormControl>
                        </Grid>

                        {/* Reference Details Search */}
                        <Grid item xs={12}>
                            {editForm.reference.type === 'internal_team' ? (
                                <Autocomplete
                                    options={safeUsers}
                                    getOptionLabel={(option) => `${option.firstName || ''} ${option.lastName || ''} (${option.roles?.[0] || 'User'})`}
                                    value={safeUsers.find(u => u._id === (editForm.reference.userId?._id || editForm.reference.userId)) || null}
                                    onChange={(_, newValue) => setEditForm({
                                        ...editForm,
                                        reference: {
                                            ...editForm.reference,
                                            userId: newValue?._id || null,
                                            name: newValue ? `${newValue.firstName} ${newValue.lastName}` : '',
                                            email: newValue?.email || '',
                                            contact: newValue?.phone || ''
                                        }
                                    })}
                                    renderInput={(params) => <TextField {...params} label="Select Team Member" size="small" />}
                                />
                            ) : (
                                <Autocomplete
                                    options={safeCustomers}
                                    getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name || ''} ${option.phone ? `(${option.phone})` : ''}`}
                                    freeSolo
                                    value={safeCustomers.find(c => c._id === (editForm.reference.customerId?._id || editForm.reference.customerId)) || editForm.reference.name || ''}
                                    onChange={(_, newValue) => {
                                        if (typeof newValue === 'string') {
                                            setEditForm({
                                                ...editForm,
                                                reference: { ...editForm.reference, name: newValue, customerId: null }
                                            });
                                        } else if (newValue) {
                                            setEditForm({
                                                ...editForm,
                                                reference: {
                                                    ...editForm.reference,
                                                    customerId: newValue._id,
                                                    name: newValue.name || '',
                                                    contact: newValue.phone || '',
                                                    email: newValue.email || ''
                                                }
                                            });
                                        }
                                    }}
                                    renderInput={(params) => <TextField {...params} label="Search or Enter Name" size="small" />}
                                />
                            )}
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Contact Number"
                                fullWidth
                                size="small"
                                value={editForm.reference.contact}
                                onChange={(e) => setEditForm({
                                    ...editForm,
                                    reference: { ...editForm.reference, contact: e.target.value }
                                })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Email"
                                fullWidth
                                size="small"
                                value={editForm.reference.email}
                                onChange={(e) => setEditForm({
                                    ...editForm,
                                    reference: { ...editForm.reference, email: e.target.value }
                                })}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                label="Commission Notes"
                                multiline
                                rows={2}
                                fullWidth
                                size="small"
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleUpdateCommission}
                        disabled={actionLoading}
                        startIcon={actionLoading && <CircularProgress size={16} />}
                    >
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Mark as Paid Dialog */}
            <Dialog open={payDialogOpen} onClose={() => !actionLoading && setPayDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Mark Commission as Paid
                    <IconButton
                        onClick={() => !actionLoading && setPayDialogOpen(false)}
                        disabled={actionLoading}
                        size="small"
                        sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            width: 20,
                            height: 20,
                            '&:hover': {
                                bgcolor: 'error.dark',
                            }
                        }}
                    >
                        <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                            Enter the payment details below to mark this commission as paid.
                        </Typography>

                        <FormControl fullWidth size="small">
                            <FormLabel sx={{ mb: 1 }}>Payment Method</FormLabel>
                            <RadioGroup
                                value={payForm.paymentMethod}
                                onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                            >
                                <Grid container>
                                    <Grid item xs={6}><FormControlLabel value="bank_transfer" control={<Radio size="small" />} label="Bank Transfer" /></Grid>
                                    <Grid item xs={6}><FormControlLabel value="cash" control={<Radio size="small" />} label="Cash" /></Grid>
                                    <Grid item xs={6}><FormControlLabel value="upi" control={<Radio size="small" />} label="UPI" /></Grid>
                                    <Grid item xs={6}><FormControlLabel value="cheque" control={<Radio size="small" />} label="Cheque" /></Grid>
                                </Grid>
                            </RadioGroup>
                        </FormControl>

                        <TextField
                            label="Payment Date"
                            type="date"
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={payForm.paymentDate}
                            onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
                        />

                        <TextField
                            label="Reference / Transaction ID"
                            fullWidth
                            size="small"
                            placeholder="Optional"
                            value={payForm.paymentReference}
                            onChange={(e) => setPayForm({ ...payForm, paymentReference: e.target.value })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPayDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleMarkAsPaid}
                        disabled={actionLoading}
                        startIcon={actionLoading ? <CircularProgress size={16} /> : <Payments />}
                    >
                        Mark as Paid
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Approve Confirmation Dialog */}
            <Dialog
                open={approveDialogOpen}
                onClose={() => !actionLoading && setApproveDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Confirm Approval</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to approve this commission? This action will mark the commission as approved and ready for payment.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setApproveDialogOpen(false)}
                        disabled={actionLoading}
                        color="inherit"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmApprove}
                        variant="contained"
                        color="primary"
                        disabled={actionLoading}
                        startIcon={actionLoading && <CircularProgress size={16} />}
                    >
                        Approve
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cancel Confirmation Dialog */}
            <Dialog
                open={cancelDialogOpen}
                onClose={() => !actionLoading && setCancelDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Confirm Cancellation
                    <IconButton
                        onClick={() => !actionLoading && setCancelDialogOpen(false)}
                        disabled={actionLoading}
                        size="small"
                        sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            width: 20,
                            height: 20,
                            '&:hover': {
                                bgcolor: 'error.dark',
                            }
                        }}
                    >
                        <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        Are you sure you want to cancel this commission?
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Reason for Cancellation"
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Optional"
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setCancelDialogOpen(false)}
                        disabled={actionLoading}
                        color="inherit"
                    >
                        Back
                    </Button>
                    <Button
                        onClick={confirmCancel}
                        variant="contained"
                        color="error"
                        disabled={actionLoading}
                        startIcon={actionLoading && <CircularProgress size={16} />}
                    >
                        Confirm Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => !actionLoading && setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Confirm Deletion
                    <IconButton
                        onClick={() => !actionLoading && setDeleteDialogOpen(false)}
                        disabled={actionLoading}
                        size="small"
                        sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            width: 20,
                            height: 20,
                            '&:hover': {
                                bgcolor: 'error.dark',
                            }
                        }}
                    >
                        <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this commission? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={actionLoading}
                        color="inherit"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmDelete}
                        variant="contained"
                        color="error"
                        disabled={actionLoading}
                        startIcon={actionLoading && <CircularProgress size={16} />}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CateringCommissionsPage;
