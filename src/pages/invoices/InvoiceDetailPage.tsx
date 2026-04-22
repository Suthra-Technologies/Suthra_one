import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Divider,
    Button,
    CircularProgress,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    GetApp as DownloadIcon,
    Email as EmailIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { invoicesAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { downloadFile } from '../../utils/fileDownload';

const InvoiceDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const response = await invoicesAPI.getById(id!);
                setInvoice(response.data);
            } catch (error) {
                console.error('Error fetching invoice:', error);
                toast.error('Failed to load invoice details');
                navigate('/invoices');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchInvoice();
        }
    }, [id, navigate]);

    const handleDownload = async () => {
        try {
            const response = await invoicesAPI.downloadPDF(id!);
            await downloadFile(response.data, `Invoice-${invoice.invoiceNumber}.pdf`, 'application/pdf');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download invoice');
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await invoicesAPI.resend(id!);
            toast.success('Invoice sent successfully');
        } catch (error) {
            console.error('Error resending invoice:', error);
            toast.error('Failed to resend invoice');
        } finally {
            setResending(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (!invoice) return null;

    return (
        <Box p={3}>
            {/* <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/invoices')}
                sx={{ mb: 3 }}
            >
                Back to Invoices
            </Button> */}

            <Paper elevation={0} sx={{ p: 4, border: '1px solid #e0e0e0' }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4} flexDirection={{ xs: 'column', sm: 'row' }}>
                    <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                            INVOICE
                        </Typography>
                        <Typography variant="subtitle1" color="textSecondary">
                            #{invoice.invoiceNumber}
                        </Typography>
                        <Chip
                            label={invoice.status.toUpperCase()}
                            color={invoice.status === 'paid' ? 'success' : 'warning'}
                            sx={{ mt: 1, fontWeight: 'bold' }}
                        />

                        {/* Mobile-only buttons - displayed after status chip */}
                        <Box
                            sx={{
                                display: { xs: 'flex', sm: 'none' },
                                flexDirection: 'column',
                                gap: 1.5,
                                mt: 2,
                                width: '100%'
                            }}
                        >
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownload}
                                fullWidth
                            >
                                Download PDF
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={resending ? <CircularProgress size={20} color="inherit" /> : <EmailIcon />}
                                onClick={handleResend}
                                disabled={resending}
                                fullWidth
                            >
                                Resend Email
                            </Button>
                        </Box>
                    </Box>

                    {/* Desktop/Tablet buttons - displayed on the right */}
                    <Box textAlign="right" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleDownload}
                            sx={{ mr: 2 }}
                        >
                            Download PDF
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={resending ? <CircularProgress size={20} color="inherit" /> : <EmailIcon />}
                            onClick={handleResend}
                            disabled={resending}
                        >
                            Resend Email
                        </Button>
                    </Box>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Grid container spacing={4}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>Bill To:</Typography>
                        <Typography variant="body1" fontWeight="bold">{invoice.customerName}</Typography>
                        <Typography variant="body2" color="textSecondary">{invoice.customerEmail}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6} textAlign={{ xs: 'left', md: 'right' }}>
                        <Typography variant="h6" gutterBottom>Payment Details:</Typography>
                        <Typography variant="body2">
                            <strong>Issue Date:</strong> {new Date(invoice.issueDate).toLocaleDateString()}
                        </Typography>
                        {invoice.paidDate && (
                            <Typography variant="body2">
                                <strong>Paid Date:</strong> {new Date(invoice.paidDate).toLocaleDateString()}
                            </Typography>
                        )}
                        <Typography variant="body2">
                            <strong>Payment Method:</strong> Stripe
                        </Typography>
                    </Grid>
                </Grid>

                <TableContainer sx={{ mt: 4 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell><strong>Description</strong></TableCell>
                                <TableCell align="right"><strong>Quantity</strong></TableCell>
                                <TableCell align="right"><strong>Unit Price</strong></TableCell>
                                <TableCell align="right"><strong>Total</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {invoice.items.map((item: any, index: number) => (
                                <TableRow key={index}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell align="right">{item.quantity}</TableCell>
                                    <TableCell align="right">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(item.unitPrice)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(item.total)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box display="flex" justifyContent="flex-end" mt={4}>
                    <Box width={{ xs: '100%', md: '300px' }}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography>Subtotal:</Typography>
                            <Typography fontWeight="bold">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(invoice.subtotal)}
                            </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography>Tax:</Typography>
                            <Typography fontWeight="bold">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(invoice.tax)}
                            </Typography>
                        </Box>
                        <Divider sx={{ my: 2 }} />
                        <Box display="flex" justifyContent="space-between">
                            <Typography variant="h6">Total:</Typography>
                            <Typography variant="h6" color="primary" fontWeight="bold">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(invoice.total)}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default InvoiceDetailPage;
