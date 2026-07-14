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
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Print as PrintIcon,
    CheckCircle as ApproveIcon,
    Inventory as ReceiveIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import ActionHistoryList from '../../components/common/ActionHistoryList';
import { purchaseOrdersAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';
import { useActiveTenant } from '../../hooks/useActiveTenant';

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
    const { getRelativePath } = useActiveTenant();
    const { formatCurrency } = useSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const headingFontSize = { xs: '1.12rem', sm: '1.4rem', md: '2.125rem' };
    const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };
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
        <Box sx={{ p: { xs: 1.2, sm: 3 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, mb: { xs: 2, sm: 3 }, gap: { xs: 1.25, sm: 2 }, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: { xs: 1, md: 0 } }}>
                    <Button
                        startIcon={<BackIcon />}
                        onClick={() => navigate(getRelativePath('/purchase-orders'))}
                        sx={{ mr: 2, minWidth: 'auto' }}
                    >
                        Back
                    </Button>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, flexWrap: 'wrap', gap: 1, width: '100%' }}>
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
                            {po.poNumber}
                        </Typography>
                        <Chip
                            label={po.status?.toUpperCase()}
                            color={
                                po.status === 'approved' ? 'info' :
                                    po.status === 'received' ? 'success' :
                                        po.status === 'cancelled' ? 'error' : 'default'
                            }
                            size="small"
                        />
                    </Box>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }} sx={{ width: { xs: '100%', md: 'auto' } }}>
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
                    <Button variant="contained" color="secondary" startIcon={<EditIcon />} onClick={() => navigate(getRelativePath(`/purchase-orders/edit/${id}`))} fullWidth sx={{ width: { sm: 'auto' } }}>
                        Edit
                    </Button>
                    <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} fullWidth sx={{ width: { sm: 'auto' } }}>
                        Print
                    </Button>
                </Stack>
            </Box>

            <Grid container spacing={{ xs: 1.5, sm: 3 }}>
                {/* Vendor & Details */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: { xs: 1.4, sm: 3 }, mb: { xs: 1.5, sm: 3 } }}>
                        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' }, color: { xs: '#000', sm: 'text.primary' }, textAlign: { xs: 'center', sm: 'left' } }}>
                            {po.type === 'expense' ? 'Payee Details' : 'Vendor Information'}
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="textSecondary" sx={{ fontSize: bodyFontSize }}>Name</Typography>
                                <Typography variant="body1" fontWeight="500" sx={{ fontSize: bodyFontSize }}>{po.vendor.name}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="textSecondary" sx={{ fontSize: bodyFontSize }}>Contact</Typography>
                                <Typography variant="body1" sx={{ fontSize: bodyFontSize }}>{po.vendor.contact || '-'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="textSecondary" sx={{ fontSize: bodyFontSize }}>Email</Typography>
                                <Typography variant="body1" sx={{ wordBreak: 'break-all', fontSize: bodyFontSize }}>{po.vendor.email || '-'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="textSecondary" sx={{ fontSize: bodyFontSize }}>Address</Typography>
                                <Typography variant="body1" sx={{ fontSize: bodyFontSize }}>{po.vendor.address || '-'}</Typography>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Items - Mobile Cards */}
                    <Paper sx={{ display: { xs: 'block', md: 'none' }, p: 1.2, mb: 1.5 }}>
                        <Stack spacing={1}>
                            {(po?.items || []).map((item: any, index: number) => (
                                <Paper key={index} variant="outlined" sx={{ p: 1.1, borderRadius: 2 }}>
                                    <Typography variant="body2" sx={{ fontSize: bodyFontSize, fontWeight: 700 }}>
                                        {item.description}
                                    </Typography>
                                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: bodyFontSize }}>
                                            Qty: {item.quantity} {item.unit}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontSize: bodyFontSize }}>
                                            {formatCurrency(item.unitPrice)}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700, fontSize: bodyFontSize }}>
                                        Total: {formatCurrency(item.total)}
                                    </Typography>
                                </Paper>
                            ))}
                            <Divider sx={{ my: 0.5 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ fontSize: bodyFontSize, fontWeight: 700 }}>Subtotal</Typography>
                                <Typography sx={{ fontSize: bodyFontSize }}>{formatCurrency(po.subtotal)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ fontSize: bodyFontSize, fontWeight: 700 }}>Tax</Typography>
                                <Typography sx={{ fontSize: bodyFontSize }}>{formatCurrency(po.tax)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ fontSize: bodyFontSize, fontWeight: 700 }}>Total Amount</Typography>
                                <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, fontWeight: 800, color: 'primary.main' }}>
                                    {formatCurrency(po.totalAmount)}
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>

                    {/* Items Table */}
                    <TableContainer component={Paper} sx={{ mb: 3, overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
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
                                {(po?.items || []).map((item: any, index: number) => (
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
                    <Paper sx={{ p: { xs: 1.4, sm: 3 }, mb: { xs: 1.5, sm: 3 } }}>
                        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' }, color: { xs: '#000', sm: 'text.primary' }, textAlign: { xs: 'center', sm: 'left' } }}>Payment Info</Typography>
                        <Stack spacing={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="textSecondary" sx={{ fontSize: bodyFontSize }}>Status</Typography>
                                <Chip label={po.paymentStatus?.toUpperCase()} size="small" />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="textSecondary" sx={{ fontSize: bodyFontSize }}>Method</Typography>
                                <Typography variant="body2" sx={{ fontSize: bodyFontSize }}>{po.paymentMethod.replace('_', ' ')?.toUpperCase()}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="textSecondary" sx={{ fontSize: bodyFontSize }}>Source</Typography>
                                <Typography variant="body2" sx={{ fontSize: bodyFontSize }}>{po.paymentSource?.replace('_', ' ')?.toUpperCase() || '-'}</Typography>
                            </Box>
                        </Stack>
                    </Paper>

                    <Paper sx={{ p: { xs: 1.4, sm: 3 } }}>
                        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' }, color: { xs: '#000', sm: 'text.primary' }, textAlign: { xs: 'center', sm: 'left' } }}>Attachments</Typography>
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
                    <Paper sx={{ p: { xs: 1.4, sm: 3 }, mt: { xs: 1.5, sm: 3 } }}>
                        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' }, color: { xs: '#000', sm: 'text.primary' }, textAlign: { xs: 'center', sm: 'left' } }}>History</Typography>
                        <ActionHistoryList history={po.actionHistory || []} emptyMessage="No history for this PO." />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default PurchaseOrderDetailPage;
