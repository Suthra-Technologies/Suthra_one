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
    Button,
    Tooltip,
    TextField,
    InputAdornment,
    CircularProgress,
    Pagination,
    Card,
    CardContent,
    Stack,
    Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
    Visibility as VisibilityIcon,
    GetApp as DownloadIcon,
    Email as EmailIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { invoicesAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const InvoicesAdminPage = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [resending, setResending] = useState<string | null>(null);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await invoicesAPI.getAllAdmin({ page, limit: 10, search, requirePlan: true });
            setInvoices(response.data.invoices);
            setTotalPages(Math.ceil(response.data.total / 10));
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

    return (
        <Box p={{ xs: 1.5, sm: 3 }}>
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                mt: { xs: -1, sm: 0 },
                gap: 2
            }}>
                <Typography
                    variant="h4"
                    fontWeight="bold"
                    sx={{
                        textAlign: { xs: 'center', sm: 'left' },
                        width: { xs: '100%', sm: 'auto' },
                        fontSize: { xs: '1.5rem', sm: '2.125rem' },
                        whiteSpace: 'nowrap'
                    }}
                >
                    Subscription Invoices
                </Typography>
                <TextField
                    placeholder="Search invoices..."
                    size="small"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {/* Desktop View */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell><strong>Tenant</strong></TableCell>
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
                                    <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                                        <Typography color="textSecondary">No invoices found</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((invoice: any) => (
                                    <TableRow key={invoice._id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">
                                                {invoice.tenant?.name || 'Unknown Tenant'}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {invoice.tenant?.slug}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{invoice.invoiceNumber}</TableCell>
                                        <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">{invoice.customerName}</Typography>
                                            <Typography variant="caption" color="textSecondary">{invoice.customerEmail}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(invoice.amount)}
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
            </Box>

            {/* Mobile View */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : invoices.length === 0 ? (
                    <Box textAlign="center" p={4}>
                        <Typography color="textSecondary">No invoices found</Typography>
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {invoices.map((invoice: any) => (
                            <Card key={invoice._id} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {invoice.tenant?.name || 'Unknown Tenant'}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {invoice.tenant?.slug}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={invoice.status.toUpperCase()}
                                            color={getStatusColor(invoice.status) as any}
                                            size="small"
                                            sx={{ fontWeight: 'bold' }}
                                        />
                                    </Box>

                                    <Divider sx={{ mb: 2 }} />

                                    <Grid container spacing={2} mb={2}>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="textSecondary">Invoice #</Typography>
                                            <Typography variant="body2">{invoice.invoiceNumber}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="textSecondary">Date</Typography>
                                            <Typography variant="body2">{new Date(invoice.issueDate).toLocaleDateString()}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="textSecondary">Customer</Typography>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">{invoice.customerName}</Typography>
                                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>{invoice.customerEmail}</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="textSecondary">Amount</Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(invoice.amount)}
                                            </Typography>
                                        </Grid>
                                    </Grid>

                                    <Divider sx={{ mb: 2 }} />

                                    <Box display="flex" justifyContent="flex-end" gap={1}>
                                        <Button
                                            startIcon={<DownloadIcon />}
                                            onClick={() => handleDownload(invoice._id, invoice.invoiceNumber)}
                                            color="secondary"
                                            size="small"
                                            variant="outlined"
                                        >
                                            Download
                                        </Button>
                                        <Button
                                            startIcon={resending === invoice._id ? <CircularProgress size={16} /> : <EmailIcon />}
                                            onClick={() => handleResend(invoice._id)}
                                            disabled={resending === invoice._id}
                                            size="small"
                                            variant="outlined"
                                        >
                                            Resend
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                )}
            </Box>

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

export default InvoicesAdminPage;
