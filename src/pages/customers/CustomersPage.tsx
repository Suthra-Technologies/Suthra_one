import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    InputAdornment,
    Chip,
    TablePagination,
    alpha,
    useTheme,
    useMediaQuery,
    Tooltip,
    Card,
    CardContent,
    Stack
} from '@mui/material';
import {
    Search as SearchIcon,
    Person as PersonIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    Receipt as ReceiptIcon,
    AttachMoney as MoneyIcon,
    Event as DateIcon,
    Restaurant as DineIcon,
    ShoppingBag as TakeawayIcon,
    DeliveryDining as DeliveryIcon,
    Devices as OnlineIcon
} from '@mui/icons-material';
import { customersAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { useSettings } from '../../context/SettingsContext';

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
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTabletOrBelow = useMediaQuery(theme.breakpoints.down('lg'));
    const isTablet = isTabletOrBelow && !isMobile;


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
            setCustomers(response.data.customers);
            setTotalCustomers(response.data.total);
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
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PersonIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                    <Typography variant="h4" fontWeight="bold">
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

         
            {isTablet ? (
                <Stack spacing={2}>
                    <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Contact</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Stats</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Last Visit</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Order Types</TableCell>
                                    </TableRow>
                                </TableHead>
                            </Table>
                        </TableContainer>
                    </Paper>
                    {loading ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>Loading...</Box>
                    ) : customers.length === 0 ? (
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
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>Loading...</TableCell>
                                </TableRow>
                            ) : customers.length === 0 ? (
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
        </Box>
    );
};

export default CustomersPage;