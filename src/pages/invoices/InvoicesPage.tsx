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
    Chip,
    IconButton,
    Tooltip,
    Button,
    TextField,
    InputAdornment,
    CircularProgress,
    Pagination,
    useTheme,
    useMediaQuery,
    Stack,
    Card,
    CardContent,
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    GetApp as DownloadIcon,
    Email as EmailIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { invoicesAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-hot-toast';

const InvoicesPage = () => {
    const navigate = useNavigate();
    const { formatCurrency } = useSettings();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [resending, setResending] = useState<string | null>(null);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await invoicesAPI.getAll({ page, limit: 10, search, requirePlan: true });
            const fetchedInvoices = Array.isArray(response.data.invoices) ? response.data.invoices : [];
            setInvoices(fetchedInvoices);
            setTotalPages(Math.ceil((response.data.total || fetchedInvoices.length) / 10));
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [page, search]);

    const handleDownload = async (id: string, invoiceNumber: string) => {
        try {
            const response = await invoicesAPI.downloadPDF(id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice-${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download invoice');
        }
    };

    const handleResend = async (id: string) => {
        setResending(id);
        try {
            await invoicesAPI.resend(id);
            toast.success('Invoice sent successfully');
        } catch (error) {
            console.error('Error resending invoice:', error);
            toast.error('Failed to resend invoice');
        } finally {
            setResending(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'success';
            case 'pending': return 'warning';
            case 'failed': return 'error';
            default: return 'default';
        }
    };

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Box p={isMobile ? 2 : 3}>
            <Box 
                display="flex" 
                flexDirection={isMobile ? 'column' : 'row'} 
                justifyContent="space-between" 
                alignItems={isMobile ? 'center' : 'center'} 
                mb={{ xs: 1.5, sm: 3 }} 
                gap={{ xs: 1.5, md: 2 }}
            >
                <Typography 
                    variant="h4" 
                    fontWeight="bold"
                    sx={{ 
                        fontSize: { xs: '1.45rem', sm: '2.125rem' },
                        color: { xs: '#000', sm: 'inherit' },
                        textAlign: { xs: 'center', sm: 'left' },
                        width: { xs: '100%', sm: 'auto' },
                        whiteSpace: { xs: 'nowrap', sm: 'normal' }
                    }}
                >
                    Subscription Invoices
                </Typography>
                <TextField
                    placeholder="Search invoices..."
                    size="small"
                    fullWidth={isMobile}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {isMobile ? (
                <Box>
                    {loading ? (
                        <Box display="flex" justifyContent="center" p={3}>
                            <CircularProgress />
                        </Box>
                    ) : (!Array.isArray(invoices) || invoices.length === 0) ? (
                        <Typography align="center" color="textSecondary">No invoices found</Typography>
                    ) : (
                        <Stack spacing={1.5}>
                            {invoices.map((invoice: any) => (
                                <Card key={invoice._id} elevation={1} sx={{ borderRadius: 3 }}>
                                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '0.9rem' }}>#{invoice.invoiceNumber}</Typography>
                                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>{new Date(invoice.issueDate).toLocaleDateString()}</Typography>
                                            </Box>
                                            <Chip
                                                label={invoice.status.toUpperCase()}
                                                color={getStatusColor(invoice.status) as any}
                                                size="small"
                                                sx={{ fontWeight: 'bold', height: 20, fontSize: '0.65rem' }}
                                            />
                                        </Box>

                                        <Box mb={1}>
                                            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>{invoice.customerName}</Typography>
                                            <Typography variant="caption" color="textSecondary" display="block" sx={{ fontSize: '0.7rem' }}>{invoice.customerEmail}</Typography>
                                        </Box>

                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>Amount</Typography>
                                            <Typography variant="h6" color="primary" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{formatCurrency(invoice.amount)}</Typography>
                                        </Box>

                                        <Box display="flex" justifyContent="flex-end" gap={0.5} pt={1} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                                            <IconButton onClick={() => navigate(`${invoice._id}`)} color="primary" size="small">
                                                <VisibilityIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                            <IconButton onClick={() => handleDownload(invoice._id, invoice.invoiceNumber)} color="secondary" size="small">
                                                <DownloadIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                            <IconButton
                                                onClick={() => handleResend(invoice._id)}
                                                disabled={resending === invoice._id}
                                                size="small"
                                            >
                                                {resending === invoice._id ? <CircularProgress size={14} /> : <EmailIcon sx={{ fontSize: 18 }} />}
                                            </IconButton>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    )}
                </Box>
            ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
                    <Table sx={{ minWidth: 800 }}>
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell><strong>Invoice #</strong></TableCell>
                                <TableCell><strong>Date</strong></TableCell>
                                <TableCell><strong>Customer</strong></TableCell>
                                <TableCell><strong>Amount</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell align="right"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : (!Array.isArray(invoices) || invoices.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                                        <Typography color="textSecondary">No invoices found</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((invoice: any) => (
                                    <TableRow key={invoice._id} hover>
                                        <TableCell>{invoice.invoiceNumber}</TableCell>
                                        <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">{invoice.customerName}</Typography>
                                            <Typography variant="caption" color="textSecondary">{invoice.customerEmail}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {formatCurrency(invoice.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={invoice.status.toUpperCase()}
                                                color={getStatusColor(invoice.status) as any}
                                                size="small"
                                                sx={{ fontWeight: 'bold' }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="View Details">
                                                <IconButton onClick={() => navigate(`${invoice._id}`)} color="primary">
                                                    <VisibilityIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Download PDF">
                                                <IconButton onClick={() => handleDownload(invoice._id, invoice.invoiceNumber)} color="secondary">
                                                    <DownloadIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Resend Email">
                                                <IconButton
                                                    onClick={() => handleResend(invoice._id)}
                                                    disabled={resending === invoice._id}
                                                >
                                                    {resending === invoice._id ? <CircularProgress size={20} /> : <EmailIcon />}
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                    color="primary"
                />
            </Box>
        </Box>
    );
};

export default InvoicesPage;
