import {
    Event as DateIcon,
    DeliveryDining as DeliveryIcon,
    Restaurant as DineIcon,
    AttachMoney as MoneyIcon,
    Devices as OnlineIcon,
    Person as PersonIcon,
    Phone as PhoneIcon,
    Receipt as ReceiptIcon,
    Search as SearchIcon,
    ShoppingBag as TakeawayIcon,
    Close as CloseIcon,
    Add as AddIcon,
    History as HistoryIcon,
    Star as StarIcon,
    TrendingUp as EarnedIcon,
    TrendingDown as RedeemedIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Chip,
    InputAdornment,
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
    alpha,
    useMediaQuery,
    useTheme,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Tab,
    Tabs,
    Divider,
    IconButton,
    Grid,
    Avatar,
    List,
    ListItem,
    ListItemText,
    CircularProgress
} from '@mui/material';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';
import { customersAPI } from '../../services/api';

interface Customer {
    name?: string;
    phone: string;
    email?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
    };
    totalOrders: number;
    totalSpent: number;
    lastVisit: string;
    orderTypes: string[];
    sources: string[];
    rewardPoints?: number;
    _id?: string;
}

const CustomersPage: React.FC = () => {
    const theme = useTheme();
    const { settings } = useSettings();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
    const isTabletOrBelow = useMediaQuery(theme.breakpoints.down('lg'));
    const isTablet = isTabletOrBelow && !isMobile;

    // Rewards States
    const [rewardsDialogOpen, setRewardsDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [rewardDetails, setRewardDetails] = useState<any>(null);
    const [loadingRewards, setLoadingRewards] = useState(false);
    const [rewardTab, setRewardTab] = useState(0);
    const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [isAdjusting, setIsAdjusting] = useState(false);


    useEffect(() => {
        fetchCustomers();
    }, [page, rowsPerPage, searchTerm]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await customersAPI.getAll({
                page: page + 1,
                limit: rowsPerPage,
                search: searchTerm,
            });
            const fetchedCustomers = Array.isArray(response.data.customers) ? response.data.customers : [];
            setCustomers(fetchedCustomers);
            setTotalCustomers(response.data.total || fetchedCustomers.length);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
            toast.error('Failed to fetch customers');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleViewRewards = async (customer: Customer) => {
        if (!customer._id) return;
        setSelectedCustomer(customer);
        setRewardsDialogOpen(true);
        setRewardTab(0);
        
        try {
            setLoadingRewards(true);
            const res = await customersAPI.getRewardDetails(customer._id);
            setRewardDetails(res.data);
        } catch (error) {
            console.error('Failed to fetch reward details:', error);
            toast.error('Failed to load reward history');
        } finally {
            setLoadingRewards(false);
        }
    };

    const handleAdjustPoints = async () => {
        if (!selectedCustomer?._id || !adjustAmount || isAdjusting) return;
        
        const points = parseInt(adjustAmount);
        if (isNaN(points)) {
            toast.error('Please enter a valid number');
            return;
        }

        try {
            setIsAdjusting(true);
            await customersAPI.adjustRewards(selectedCustomer._id, points, adjustReason);
            toast.success('Reward points adjusted successfully');
            setAdjustDialogOpen(false);
            setAdjustAmount('');
            setAdjustReason('');
            
            // Refresh details
            const res = await customersAPI.getRewardDetails(selectedCustomer._id);
            setRewardDetails(res.data);
            
            // Update in main list
            setCustomers(prev => prev.map(c => 
                c._id === selectedCustomer._id 
                ? { ...c, rewardPoints: res.data.points } 
                : c
            ));
        } catch (error) {
            console.error('Failed to adjust points:', error);
            toast.error('Failed to adjust reward points');
        } finally {
            setIsAdjusting(false);
        }
    };

    const getOrderTypeIcon = (type: string) => {
        switch (type) {
            case 'dine_in': return <DineIcon fontSize="small" />;
            case 'takeaway': return <TakeawayIcon fontSize="small" />;
            case 'delivery': return <DeliveryIcon fontSize="small" />;
            case 'online_takeaway': return <OnlineIcon fontSize="small" />;
            default: return <ReceiptIcon fontSize="small" />;
        }
    };

    const getOrderTypeLabel = (type: string) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };



    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: settings.restaurant.currency || 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PersonIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                    <Typography variant={{ xs: 'h5', sm: 'h4' } as any} fontWeight="bold">

                        Customers
                    </Typography>
                </Box>
            </Box>

            {/* Search */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <TextField
                    fullWidth
                    placeholder="Search by name, phone, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                    size="small"
                />
            </Paper>

            {/* Customers Table */}


            {isMobile ? (
                <Stack spacing={2}>

                    {loading ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>Loading...</Box>
                    ) : (!Array.isArray(customers) || customers.length === 0) ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">No customers found</Typography>
                        </Box>
                    ) : customers.map((customer) => (
                        <Card key={customer.phone}>
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography fontWeight="bold">{customer.name || 'Guest'}</Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {customer.orderTypes?.map((type) => (
                                            <Chip key={type} icon={getOrderTypeIcon(type)} label={getOrderTypeLabel(type)} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                                        ))}
                                    </Box>
                                </Stack>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <PhoneIcon fontSize="inherit" color="action" />
                                    <Typography variant="body2">{customer.phone}</Typography>
                                </Box>
                                <Stack direction="row" spacing={3} mt={1}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <ReceiptIcon fontSize="small" color="primary" />
                                        <Typography variant="body2" fontWeight="medium">{customer.totalOrders}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <MoneyIcon fontSize="small" color="success" />
                                        <Typography variant="body2" fontWeight="medium">{formatCurrency(customer.totalSpent)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <DateIcon fontSize="inherit" color="action" />
                                        <Typography variant="body2">{customer.lastVisit ? format(new Date(customer.lastVisit), 'MMM dd, yyyy') : '-'}</Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        component="div"
                        count={totalCustomers}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </Stack>
            ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Contact</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Stats</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Last Visit</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Order Types</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Rewards</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>Loading...</TableCell>
                                </TableRow>
                            ) : (!Array.isArray(customers) || customers.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">No customers found</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customers.map((customer) => (
                                    <TableRow key={customer.phone} hover>
                                        <TableCell>
                                            <Typography fontWeight="medium">{customer.name || 'Guest'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <PhoneIcon fontSize="inherit" color="action" />
                                                    <Typography variant="body2">{customer.phone}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                <Tooltip title="Total Orders">
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <ReceiptIcon fontSize="small" color="primary" />
                                                        <Typography variant="body2" fontWeight="medium">{customer.totalOrders}</Typography>
                                                    </Box>
                                                </Tooltip>
                                                <Tooltip title="Total Spent">
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <MoneyIcon fontSize="small" color="success" />
                                                        <Typography variant="body2" fontWeight="medium">{formatCurrency(customer.totalSpent)}</Typography>
                                                    </Box>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DateIcon fontSize="inherit" color="action" />
                                                <Typography variant="body2">
                                                    {customer.lastVisit ? format(new Date(customer.lastVisit), 'MMM dd, yyyy') : '-'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {customer.orderTypes?.map((type) => (
                                                    <Chip key={type} icon={getOrderTypeIcon(type)} label={getOrderTypeLabel(type)} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                                                ))}
                                                {(!customer.orderTypes || customer.orderTypes.length === 0) && '-'}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={`${customer.rewardPoints || 0} pts`} 
                                                size="small" 
                                                color="primary" 
                                                variant="outlined" 
                                                icon={<MoneyIcon fontSize="small" />}
                                                onClick={() => handleViewRewards(customer)}
                                                sx={{ 
                                                    cursor: 'pointer', 
                                                    fontWeight: 'bold',
                                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) } 
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        component="div"
                        count={totalCustomers}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </TableContainer>
            )}

            {/* Reward Points Details Dialog */}
            <Dialog open={rewardsDialogOpen} onClose={() => setRewardsDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                            <StarIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h6">{selectedCustomer?.name || 'Customer Rewards'}</Typography>
                            <Typography variant="caption" color="text.secondary">{selectedCustomer?.phone}</Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={() => setRewardsDialogOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <Tabs value={rewardTab} onChange={(_, v) => setRewardTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Tab label="Summary" icon={<StarIcon fontSize="small" />} iconPosition="start" />
                        <Tab label="Transaction History" icon={<HistoryIcon fontSize="small" />} iconPosition="start" />
                    </Tabs>

                    {loadingRewards ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <CircularProgress size={32} />
                            <Typography variant="body2" sx={{ mt: 1 }}>Loading reward details...</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ p: 3 }}>
                            {rewardTab === 0 ? (
                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={4}>
                                        <Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03), borderColor: alpha(theme.palette.primary.main, 0.2) }}>
                                            <CardContent sx={{ textAlign: 'center' }}>
                                                <Typography color="text.secondary" variant="overline">Available Points</Typography>
                                                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>{rewardDetails?.points || 0}</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.success.main, 0.03), borderColor: alpha(theme.palette.success.main, 0.2) }}>
                                            <CardContent sx={{ textAlign: 'center' }}>
                                                <Typography color="text.secondary" variant="overline">Lifetime Earned</Typography>
                                                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                                    <EarnedIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                                                    {rewardDetails?.totalEarned || 0}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.error.main, 0.03), borderColor: alpha(theme.palette.error.main, 0.2) }}>
                                            <CardContent sx={{ textAlign: 'center' }}>
                                                <Typography color="text.secondary" variant="overline">Lifetime Redeemed</Typography>
                                                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                                                    <RedeemedIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                                                    {rewardDetails?.totalRedeemed || 0}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    
                                    <Grid item xs={12}>
                                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                                            <Button 
                                                variant="contained" 
                                                startIcon={<EditIcon />} 
                                                onClick={() => setAdjustDialogOpen(true)}
                                            >
                                                Adjust Points Balance
                                            </Button>
                                        </Box>
                                    </Grid>
                                </Grid>
                            ) : (
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Source</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Amount</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Balance</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rewardDetails?.history?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>No history found</TableCell>
                                                </TableRow>
                                            ) : (
                                                rewardDetails?.history?.map((entry: any, i: number) => (
                                                    <TableRow key={i}>
                                                        <TableCell variant="body2">{format(new Date(entry.date), 'MMM dd, yyyy HH:mm')}</TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">{entry.description}</Typography>
                                                            {entry.orderId && <Typography variant="caption" color="text.secondary">Order: #{entry.orderId.slice(-6)}</Typography>}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={entry.source || 'ONLINE'} size="small" sx={{ fontSize: '0.65rem', height: 18 }} color={entry.source === 'POS' ? 'secondary' : (entry.source === 'ADMIN' ? 'primary' : 'default')} />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" color={entry.points >= 0 ? 'success.main' : 'error.main'} sx={{ fontWeight: 'bold' }}>
                                                                {entry.points >= 0 ? '+' : ''}{entry.points}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">{entry.balance}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button onClick={() => setRewardsDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Adjust Points Dialog */}
            <Dialog open={adjustDialogOpen} onClose={() => setAdjustDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Adjust Reward Points</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Customer: <strong>{selectedCustomer?.name}</strong><br />
                            Current Balance: <strong>{rewardDetails?.points || 0} pts</strong>
                        </Typography>
                        <TextField
                            label="Adjustment Amount"
                            placeholder="e.g. 50 or -50"
                            fullWidth
                            type="number"
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(e.target.value)}
                            helperText="Use negative numbers to deduct points"
                        />
                        <TextField
                            label="Reason"
                            placeholder="e.g. Loyalty Correction"
                            fullWidth
                            multiline
                            rows={2}
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAdjustDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleAdjustPoints} 
                        variant="contained" 
                        disabled={!adjustAmount || !adjustReason || isAdjusting}
                        startIcon={isAdjusting && <CircularProgress size={16} color="inherit" />}
                    >
                        Apply Adjustment
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CustomersPage;