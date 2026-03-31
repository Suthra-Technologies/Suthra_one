import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    Divider,
    Stack,
    CircularProgress,
    Card,
    CardMedia,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Print as PrintIcon,
    CheckCircle as ApproveIcon,
    Inventory as ReceiveIcon
} from '@mui/icons-material';
import ActionHistoryList from '../../components/common/ActionHistoryList';
import { purchaseOrdersAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';

const fixS3Url = (url: string) => {
    if (!url) return '';
    // Check for virtual-hosted-style URLs (bucket.s3.region.amazonaws.com)
    const match = url.match(/^https:\/\/([a-zA-Z0-9.-]+)\.s3\.([a-zA-Z0-9-]+)\.amazonaws\.com\/(.+)$/);
    if (match) {
        const [, bucket, region, key] = match;
        // content-style (path-style): s3.region.amazonaws.com/bucket/key
        return `https://s3.${region}.amazonaws.com/${bucket}/${key}`;
    }
    return url;
};

const PurchaseOrderDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { formatCurrency } = useSettings();
    const [po, setPO] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchPO = async () => {
        try {
            const response = await purchaseOrdersAPI.getOne(id!);
            setPO(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchPO();
        }
    }, [id]);




    const handleApprove = async () => {
        try {
            await purchaseOrdersAPI.updateStatus(id!, 'approved');
            toast.success('Purchase order approved');
            fetchPO();
        } catch (error) {
            toast.error('Failed to approve purchase order');
        }
    };

    const handleReceive = async () => {
        try {
            await purchaseOrdersAPI.receive(id!);
            toast.success('Purchase order received');
            fetchPO();
        } catch (error) {
            toast.error('Failed to receive purchase order');
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!po) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Purchase Order not found</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, mb: 3, gap: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: { xs: 2, md: 0 } }}>
                    <Button
                        startIcon={<BackIcon />}
                        onClick={() => navigate('..', { relative: 'path' })} // Go back to list
                        sx={{ mr: 2, minWidth: 'auto' }}
                    >
                        Back
                    </Button>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                            {po.poNumber}
                        </Typography>
                        <Chip
                            label={po.status.toUpperCase()}
                            color={
                                po.status === 'approved' ? 'info' :
                                    po.status === 'received' ? 'success' :
                                        po.status === 'cancelled' ? 'error' : 'default'
                            }
                            size="small"
                        />
                    </Box>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', md: 'auto' } }}>
                    {po.status === 'pending' && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<ApproveIcon />}
                            onClick={handleApprove}
                            fullWidth
                            sx={{ width: { sm: 'auto' } }}
                        >
                            Approve
                        </Button>
                    )}
                    {po.status === 'approved' && (
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<ReceiveIcon />}
                            onClick={handleReceive}
                            fullWidth
                            sx={{ width: { sm: 'auto' } }}
                        >
                            Receive
                        </Button>
                    )}
                    <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} fullWidth sx={{ width: { sm: 'auto' } }}>
                        Print
                    </Button>
                </Stack>
            </Box>

            <Grid container spacing={3}>
                {/* Vendor & Details */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            {po.type === 'expense' ? 'Payee Details' : 'Vendor Information'}
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="textSecondary">Name</Typography>
                                <Typography variant="body1" fontWeight="500">{po.vendor.name}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="textSecondary">Contact</Typography>
                                <Typography variant="body1">{po.vendor.contact || '-'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="textSecondary">Email</Typography>
                                <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>{po.vendor.email || '-'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="textSecondary">Address</Typography>
                                <Typography variant="body1">{po.vendor.address || '-'}</Typography>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Items Table */}
                    <TableContainer component={Paper} sx={{ mb: 3, overflowX: 'auto' }}>
                        <Table sx={{ minWidth: { xs: 600, sm: '100%' } }}>
                            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell>Description</TableCell>
                                    <TableCell align="right">Quantity</TableCell>
                                    <TableCell align="right">Unit Price</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {po.items.map((item: any, index: number) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Typography variant="body2">{item.description}</Typography>
                                            {item.inventoryItem && (
                                                <Typography variant="caption" color="textSecondary">
                                                    (Inventory Linked)
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">{item.quantity} {item.unit}</TableCell>
                                        <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                                        <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                                    </TableRow>
                                ))}
                                {/* Totals */}
                                <TableRow>
                                    <TableCell colSpan={2} sx={{ display: { xs: 'none', sm: 'table-cell' } }} />
                                    <TableCell align="right" colSpan={2}><strong>Subtotal</strong></TableCell>
                                    <TableCell align="right">{formatCurrency(po.subtotal)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={2} sx={{ display: { xs: 'none', sm: 'table-cell' } }} />
                                    <TableCell align="right" colSpan={2}><strong>Tax</strong></TableCell>
                                    <TableCell align="right">{formatCurrency(po.tax)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={2} sx={{ display: { xs: 'none', sm: 'table-cell' } }} />
                                    <TableCell align="right" colSpan={2}><strong>Total Amount</strong></TableCell>
                                    <TableCell align="right">
                                        <Typography variant="h6" color="primary" fontWeight="bold">
                                            {formatCurrency(po.totalAmount)}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

                {/* Sidebar Info */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>Payment Info</Typography>
                        <Stack spacing={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="textSecondary">Status</Typography>
                                <Chip label={po.paymentStatus.toUpperCase()} size="small" />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="textSecondary">Method</Typography>
                                <Typography variant="body2">{po.paymentMethod.replace('_', ' ').toUpperCase()}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="textSecondary">Source</Typography>
                                <Typography variant="body2">{po.paymentSource?.replace('_', ' ').toUpperCase() || '-'}</Typography>
                            </Box>
                        </Stack>
                    </Paper>

                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Attachments</Typography>
                        {po.attachments && po.attachments.length > 0 ? (
                            <Stack spacing={2}>
                                {po.attachments.map((att: any, index: number) => (
                                    <Card key={index} variant="outlined">
                                        {att.url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                            <CardMedia
                                                component="img"
                                                height="140"
                                                image={fixS3Url(att.url)}
                                                alt="Attachment"
                                                sx={{ objectFit: 'contain', bgcolor: '#f0f0f0' }}
                                            />
                                        ) : (
                                            <Box sx={{ p: 2 }}>
                                                <Typography variant="body2" noWrap>{att.url}</Typography>
                                            </Box>
                                        )}
                                        <Button
                                            fullWidth
                                            size="small"
                                            onClick={() => window.open(fixS3Url(att.url), '_blank')}
                                        >
                                            View File
                                        </Button>
                                    </Card>
                                ))}
                            </Stack>
                        ) : (
                            <Typography variant="body2" color="textSecondary">No attachments</Typography>
                        )}
                    </Paper>

                    {/* History */}
                    <Paper sx={{ p: 3, mt: 3 }}>
                        <Typography variant="h6" gutterBottom>History</Typography>
                        <ActionHistoryList history={po.actionHistory || []} emptyMessage="No history for this PO." />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default PurchaseOrderDetailPage;
