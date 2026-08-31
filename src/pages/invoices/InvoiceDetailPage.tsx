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
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    GetApp as DownloadIcon,
    Email as EmailIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { invoicesAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { downloadFromUrl } from '../../utils/fileDownload';
import { apiBaseUrl } from '../../services/api';
import { TableSkeleton } from '../../components/common/PageSkeleton';

const InvoiceDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const headingFontSize = { xs: '1.12rem', sm: '1.4rem', md: '2rem' };
    const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [resending, setResending] = useState(false);

    // Invoices created before the plan name was baked into the line item stored a
    // generic description; prefix the plan so older invoices name it too.
    const describeItem = (description: string) => {
        const planName = invoice?.plan?.name;
        if (!planName || !description) return description;
        return description.toLowerCase().includes(String(planName).toLowerCase())
            ? description
            : `${planName} - ${description}`;
    };

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
            const token = localStorage.getItem('jwt');
            const fullUrl = `${apiBaseUrl}/invoices/${id}/pdf`;
            await downloadFromUrl(fullUrl, `Invoice-${invoice.invoiceNumber}.pdf`, {
                Authorization: `Bearer ${token}`,
            });
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
        return <TableSkeleton rows={5} columns={4} />;
    }

    if (!invoice) return null;

    const formatMoney = (value: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(value);

    return (
        <Box sx={{ p: { xs: 1.2, sm: 3 } }}>
            {/* <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/invoices')}
                sx={{ mb: 3 }}
            >
                Back to Invoices
            </Button> */}

            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 4 }, border: '1px solid #e0e0e0' }}>
                <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-start' }} mb={{ xs: 2, sm: 4 }} flexDirection={{ xs: 'column', sm: 'row' }}>
                    <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        <Typography
                            variant="h4"
                            fontWeight="bold"
                            gutterBottom
                            sx={{
                                fontSize: headingFontSize,
                                color: { xs: '#000', sm: 'text.primary' },
                                textAlign: { xs: 'center', sm: 'left' }
                            }}
                        >
                            INVOICE
                        </Typography>
                        <Typography variant="subtitle1" color="textSecondary" sx={{ fontSize: bodyFontSize, textAlign: { xs: 'center', sm: 'left' } }}>
                            #{invoice.invoiceNumber}
                        </Typography>
                        <Chip
                            label={invoice.status?.toUpperCase()}
                            color={invoice.status === 'paid' ? 'success' : 'warning'}
                            sx={{ mt: 1, fontWeight: 'bold', display: 'flex', mx: { xs: 'auto', sm: 0 }, width: 'fit-content' }}
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

                <Divider sx={{ my: { xs: 2, sm: 4 } }} />

                <Grid container spacing={{ xs: 1.5, sm: 4 }}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' }, color: { xs: '#000', sm: 'text.primary' }, textAlign: { xs: 'center', sm: 'left' } }}>Bill To:</Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ fontSize: bodyFontSize, textAlign: { xs: 'center', sm: 'left' } }}>{invoice.customerName}</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: bodyFontSize, textAlign: { xs: 'center', sm: 'left' } }}>{invoice.customerEmail}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6} textAlign={{ xs: 'left', md: 'right' }}>
                        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' }, color: { xs: '#000', sm: 'text.primary' }, textAlign: { xs: 'center', md: 'right' } }}>Payment Details:</Typography>
                        {invoice.plan?.name && (
                            <Typography variant="body2" sx={{ fontSize: bodyFontSize, textAlign: { xs: 'center', md: 'right' } }}>
                                <strong>Plan:</strong> {invoice.plan.name}
                            </Typography>
                        )}
                        <Typography variant="body2" sx={{ fontSize: bodyFontSize, textAlign: { xs: 'center', md: 'right' } }}>
                            <strong>Issue Date:</strong> {new Date(invoice.issueDate).toLocaleDateString()}
                        </Typography>
                        {invoice.paidDate && (
                            <Typography variant="body2" sx={{ fontSize: bodyFontSize, textAlign: { xs: 'center', md: 'right' } }}>
                                <strong>Paid Date:</strong> {new Date(invoice.paidDate).toLocaleDateString()}
                            </Typography>
                        )}
                        <Typography variant="body2" sx={{ fontSize: bodyFontSize, textAlign: { xs: 'center', md: 'right' } }}>
                            <strong>Payment Method:</strong> Stripe
                        </Typography>
                    </Grid>
                </Grid>

                {/* Mobile Items */}
                <Paper sx={{ display: { xs: 'block', sm: 'none' }, mt: 2, p: 1.1 }}>
                    {(invoice?.items || []).map((item: any, index: number) => (
                        <Paper key={index} variant="outlined" sx={{ p: 1.1, borderRadius: 2, mb: 1 }}>
                            <Typography sx={{ fontSize: bodyFontSize, fontWeight: 700 }}>{describeItem(item.description)}</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                <Typography sx={{ fontSize: bodyFontSize }}>Qty: {item.quantity}</Typography>
                                <Typography sx={{ fontSize: bodyFontSize }}>{formatMoney(item.unitPrice)}</Typography>
                            </Box>
                            <Typography sx={{ fontSize: bodyFontSize, mt: 0.4, fontWeight: 700 }}>
                                Total: {formatMoney(item.total)}
                            </Typography>
                        </Paper>
                    ))}
                </Paper>

                <TableContainer sx={{ mt: 4, display: { xs: 'none', sm: 'block' } }}>
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
                            {(invoice?.items || []).map((item: any, index: number) => (
                                <TableRow key={index}>
                                    <TableCell>{describeItem(item.description)}</TableCell>
                                    <TableCell align="right">{item.quantity}</TableCell>
                                    <TableCell align="right">
                                        {formatMoney(item.unitPrice)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {formatMoney(item.total)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box display="flex" justifyContent="flex-end" mt={{ xs: 2, sm: 4 }}>
                    <Box width={{ xs: '100%', md: '300px' }}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography sx={{ fontSize: bodyFontSize }}>Subtotal:</Typography>
                            <Typography fontWeight="bold" sx={{ fontSize: bodyFontSize }}>
                                {formatMoney(invoice.subtotal)}
                            </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography sx={{ fontSize: bodyFontSize }}>Tax:</Typography>
                            <Typography fontWeight="bold" sx={{ fontSize: bodyFontSize }}>
                                {formatMoney(invoice.tax)}
                            </Typography>
                        </Box>
                        <Divider sx={{ my: 2 }} />
                        <Box display="flex" justifyContent="space-between">
                            <Typography variant="h6" sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>Total:</Typography>
                            <Typography variant="h6" color="primary" fontWeight="bold" sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
                                {formatMoney(invoice.total)}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default InvoiceDetailPage;
