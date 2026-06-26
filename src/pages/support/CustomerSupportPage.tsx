import React, { useEffect, useState } from 'react';
import {
    Container,
    Paper,
    Typography,
    TextField,
    MenuItem,
    Button,
    Box,
    Chip,
    Divider,
    Stack,
    List,
    ListItem,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Card,
    CardMedia,
    alpha,
    useTheme,
    TablePagination,
    useMediaQuery
} from '@mui/material';
import {
    Close as CloseIcon,
    Visibility as VisibilityIcon,
    Send as SendIcon,
    Image as ImageIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { supportAPI, uploadAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface Message {
    sender?: string;
    senderRole: string;
    message: string;
    attachments?: { url: string; name: string }[];
    createdAt: string;
}

interface Ticket {
    _id: string;
    subject: string;
    status: string;
    priority: string;
    category: string;
    messages: Message[];
    createdAt: string;
    updatedAt: string;
    customerDetails?: {
        fullName: string;
        email: string;
        phone: string;
    };
    orderId?: string;
    orderSnapshot?: any;
    compensation?: {
        type: string;
        amount: number;
        couponCode?: string;
        reason?: string;
    };
}

const fixImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('/uploads')) {
        let backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5006').replace(/\/api$/, '');
        if (!backendBase.startsWith('http://') && !backendBase.startsWith('https://')) {
            backendBase = 'http://' + backendBase;
        }
        return `${backendBase}${url}`;
    }
    const match = url.match(/^https:\/\/([a-zA-Z0-9.-]+)\.s3\.([a-zA-Z0-9-]+)\.amazonaws.com\/(.+)$/);
    if (match) {
        const [, bucket, region, key] = match;
        return `https://s3.${region}.amazonaws.com/${bucket}/${key}`;
    }
    return url;
};

const CustomerSupportPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);

    const [replyMessage, setReplyMessage] = useState('');
    const [replyAttachments, setReplyAttachments] = useState<{ url: string; name: string }[]>([]);
    const [showSnapshotDetails, setShowSnapshotDetails] = useState(false);
    const [replying, setReplying] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
    const [compensationType, setCompensationType] = useState('none');
    const [compensationAmount, setCompensationAmount] = useState('');
    const [resolveMessage, setResolveMessage] = useState('');
    const [resolving, setResolving] = useState(false);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const loadTickets = async () => {
        setLoading(true);
        try {
            const res = await supportAPI.listCustomerTickets();
            setTickets(res.data || []);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load customer tickets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSizeInBytes = 10 * 1024 * 1024;
        if (file.size > maxSizeInBytes) {
            toast.error('upload image failed image size should not exceed more than 10 MB');
            if (e.target) e.target.value = '';
            return;
        }

        try {
            setUploading(true);
            const response = await uploadAPI.uploadImage(file);
            setReplyAttachments([...replyAttachments, {
                url: response.data.url,
                name: file.name,
            }]);
            toast.success('Image uploaded');
        } catch (error) {
            toast.error('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleReply = async () => {
        // Allow sending an image on its own — a message OR at least one attachment is enough.
        if (!selectedTicket || (!replyMessage && replyAttachments.length === 0)) return;

        try {
            setReplying(true);
            const res = await supportAPI.reply(selectedTicket._id, {
                message: replyMessage,
                attachments: replyAttachments,
            });

            toast.success('Reply sent');
            setReplyMessage('');
            setReplyAttachments([]);

            // Update selected ticket with new message
            setSelectedTicket(res.data);
            loadTickets();
        } catch (e) {
            toast.error('Failed to send reply');
        } finally {
            setReplying(false);
        }
    };

    const handleResolve = async () => {
        if (!selectedTicket) return;

        try {
            setResolving(true);
            const data: any = { message: resolveMessage };
            if (compensationType !== 'none' && compensationAmount) {
                data.compensation = {
                    type: compensationType,
                    amount: parseFloat(compensationAmount),
                    reason: resolveMessage || 'Support ticket resolution'
                };
            }

            const res = await supportAPI.resolve(selectedTicket._id, data);
            toast.success('Ticket resolved successfully');
            setResolveDialogOpen(false);
            setCompensationType('none');
            setCompensationAmount('');
            setResolveMessage('');
            setSelectedTicket(res.data);
            loadTickets();
        } catch (e) {
            toast.error('Failed to resolve ticket');
        } finally {
            setResolving(false);
        }
    };

    const updateStatus = async (newStatus: string) => {
        if (!selectedTicket) return;
        try {
            const res = await supportAPI.reply(selectedTicket._id, { status: newStatus });
            toast.success(`Status updated to ${newStatus}`);
            setSelectedTicket(res.data);
            loadTickets();
        } catch (e) {
            toast.error('Failed to update status');
        }
    };

    const statusColor = (s: string): 'warning' | 'info' | 'success' | 'default' => {
        const colors: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
            open: 'warning',
            in_progress: 'info',
            resolved: 'success',
            closed: 'default',
        };
        return colors[s] || 'default';
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const paginatedTickets = tickets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2 } }}>
            <Box sx={{ 
                mb: { xs: 2, sm: 4 }, 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', 
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 }
            }}>
                <Typography 
                    variant="h4" 
                    fontWeight="900" 
                    sx={{ 
                        color: { xs: '#000', sm: theme.palette.primary.main },
                        fontSize: { xs: '1.45rem', sm: '2.125rem' },
                        whiteSpace: { xs: 'nowrap', sm: 'normal' },
                        textAlign: { xs: 'center', sm: 'left' }
                    }}
                >
                    Customer Support
                </Typography>
                <Button variant="outlined" onClick={loadTickets} disabled={loading} size={isMobile ? "small" : "medium"}>
                    Refresh
                </Button>
            </Box>

            <Paper sx={{ p: 0, overflow: 'hidden', borderRadius: 4, boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
                <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight="700">Recent Customer Tickets</Typography>
                    <Typography variant="body2" color="text.secondary">Manage tickets raised by your customers</Typography>
                </Box>

                {loading ? (
                    <Box sx={{ p: 4, textCenter: 'center' }}>
                        <Typography>Loading tickets...</Typography>
                    </Box>
                ) : (
                    <List sx={{ p: 0 }}>
                        {paginatedTickets.map((t) => (
                            <React.Fragment key={t._id}>
                                <ListItem
                                    sx={{
                                        px: 3,
                                        py: 2.5,
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                                        transition: 'background-color 0.2s',
                                    }}
                                    onClick={() => {
                                        setSelectedTicket(t);
                                        setViewDialogOpen(true);
                                    }}
                                >
                                    <Grid container alignItems="center" spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Typography variant="subtitle1" fontWeight="800" color="text.primary" noWrap>
                                                    {t.subject}
                                                </Typography>
                                            </Box>
                                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Ref: {t._id.slice(-6).toUpperCase()}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">•</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(t.createdAt).toLocaleDateString()}
                                                </Typography>
                                            </Stack>
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Chip label={t.category} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                                                <Chip label={t.priority} size="small" variant="outlined" sx={{
                                                    textTransform: 'capitalize',
                                                    color: t.priority === 'urgent' ? 'error.main' : 'inherit',
                                                    borderColor: t.priority === 'urgent' ? 'error.light' : 'divider'
                                                }} />
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} sm={3} sx={{ textAlign: 'right' }}>
                                            <Chip
                                                label={t.status.replace('_', ' ')}
                                                size="small"
                                                color={statusColor(t.status)}
                                                sx={{ fontWeight: '700', minWidth: 90 }}
                                            />
                                        </Grid>
                                    </Grid>
                                </ListItem>
                                <Divider />
                            </React.Fragment>
                        ))}
                        {tickets.length === 0 && (
                            <Box sx={{ p: 8, textAlign: 'center' }}>
                                <Typography color="text.secondary">No customer tickets found.</Typography>
                            </Box>
                        )}
                    </List>
                )}
                {tickets.length > 0 && (
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        component="div"
                        count={tickets.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                )}
            </Paper>

            <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth sx={{
                '& .MuiDialog-paper': { borderRadius: 4 }
            }}>
                {selectedTicket && (
                    <>
                        <DialogTitle sx={{ p: { xs: 2, sm: 3 }, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50' }}>
                            <Box sx={{ pr: 2 }}>
                                <Typography variant="h6" fontWeight="900">{selectedTicket.subject}</Typography>
                                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        <strong>Customer ID:</strong> {selectedTicket.messages[0]?.sender || 'N/A'}
                                    </Typography>
                                    <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', columnGap: 3, rowGap: 0.5 }}>
                                        {selectedTicket.customerDetails ? (
                                            <>
                                                <Typography variant="caption" color="text.secondary">
                                                    <strong>Name:</strong> {selectedTicket.customerDetails.fullName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    <strong>Email:</strong> {selectedTicket.customerDetails.email}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    <strong>Phone:</strong> {selectedTicket.customerDetails.phone}
                                                </Typography>
                                            </>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">
                                                <strong>Name:</strong> Anonymous
                                            </Typography>
                                        )}
                                        {selectedTicket.orderId && (
                                            <Typography variant="caption" color="text.secondary">
                                                <strong>Linked Order:</strong> #{selectedTicket.orderSnapshot?.orderNumber || selectedTicket.orderId.slice(-6).toUpperCase()}
                                            </Typography>
                                        )}
                                    </Stack>
                                </Box>
                            </Box>
                            <IconButton onClick={() => setViewDialogOpen(false)} size="small" sx={{ bgcolor: 'background.paper', flexShrink: 0, mt: -0.5, mr: -0.5 }}>
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'background.default', minHeight: 400 }}>
                            <Box sx={{ mb: 4 }}>
                                <Typography variant="subtitle2" gutterBottom fontWeight="700">Status Management</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                                        <Chip
                                            key={s}
                                            label={s.replace('_', ' ')}
                                            onClick={() => updateStatus(s)}
                                            color={selectedTicket.status === s ? statusColor(s) : 'default'}
                                            variant={selectedTicket.status === s ? 'filled' : 'outlined'}
                                            sx={{ cursor: 'pointer', textTransform: 'capitalize' }}
                                        />
                                    ))}
                                </Box>
                            </Box>

                            {selectedTicket.orderSnapshot && (
                                <Box sx={{ mb: 4, borderRadius: 3, bgcolor: alpha(theme.palette.info.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1), overflow: 'hidden' }}>
                                    <Box 
                                        onClick={() => setShowSnapshotDetails(!showSnapshotDetails)}
                                        sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.08) } }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Typography variant="subtitle2" fontWeight="800" color="info.main">ORDER SNAPSHOT</Typography>
                                            <Chip size="small" label={`#${selectedTicket.orderSnapshot.orderNumber}`} sx={{ fontWeight: 'bold', fontSize: '0.65rem' }} />
                                            <Typography variant="body2" fontWeight="700" color="primary.main">${selectedTicket.orderSnapshot.totalAmount}</Typography>
                                        </Box>
                                        <IconButton size="small">
                                            {showSnapshotDetails ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                        </IconButton>
                                    </Box>
                                    
                                    <Box sx={{ display: showSnapshotDetails ? 'block' : 'none', p: 3, pt: 1, borderTop: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1) }}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6} sm={4}>
                                                <Typography variant="caption" color="text.secondary">Order Type</Typography>
                                                <Typography variant="body2" fontWeight="700" sx={{ textTransform: 'uppercase' }}>{selectedTicket.orderSnapshot.orderType?.replace('_', ' ')}</Typography>
                                            </Grid>
                                            <Grid item xs={6} sm={4}>
                                                <Typography variant="caption" color="text.secondary">Date</Typography>
                                                <Typography variant="body2" fontWeight="700">{new Date(selectedTicket.orderSnapshot.createdAt).toLocaleDateString()}</Typography>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', mb: 1, display: 'block' }}>Items</Typography>
                                                <Stack spacing={1}>
                                                    {selectedTicket.orderSnapshot.items?.map((item: any, i: number) => (
                                                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Typography variant="caption">• {item.quantity}x {item.name}</Typography>
                                                            <Typography variant="caption" fontWeight="600">${item.total}</Typography>
                                                        </Box>
                                                    ))}
                                                </Stack>
                                                {selectedTicket.orderSnapshot.subtotal && (
                                                    <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography variant="caption" color="text.secondary">Subtotal</Typography>
                                                        <Typography variant="caption">${selectedTicket.orderSnapshot.subtotal}</Typography>
                                                    </Box>
                                                )}
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Box>
                            )}
                            
                            {!selectedTicket.orderSnapshot && selectedTicket.orderId && (
                                <Box sx={{ mb: 4, p: 2, borderRadius: 3, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">Linked Order ID</Typography>
                                        <Typography variant="body2" fontWeight="700">{selectedTicket.orderId}</Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">No snapshot available</Typography>
                                </Box>
                            )}

                            <Typography variant="subtitle2" gutterBottom fontWeight="700">Conversation History</Typography>
                            <Stack spacing={2} sx={{ mb: 4 }}>
                                {selectedTicket.messages.map((msg, idx) => (
                                    <Box key={idx} sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: msg.senderRole === 'customer' ? 'flex-start' : 'flex-end'
                                    }}>
                                        <Paper sx={{
                                            p: { xs: 1.5, sm: 2 },
                                            borderRadius: 3,
                                            maxWidth: { xs: '95%', sm: '80%' },
                                            bgcolor: msg.senderRole === 'customer' ? 'background.paper' : alpha(theme.palette.primary.main, 0.05),
                                            border: '1px solid',
                                            borderColor: msg.senderRole === 'customer' ? 'divider' : alpha(theme.palette.primary.main, 0.1),
                                            boxShadow: 'none'
                                        }}>
                                            <Typography variant="caption" fontWeight="800" color="primary" gutterBottom display="block" sx={{ textTransform: 'uppercase', opacity: 0.7 }}>
                                                {msg.senderRole === 'customer' ? 'Customer' : 'Restaurant Staff'}
                                            </Typography>
                                            <Typography variant="body2">{msg.message}</Typography>
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <Grid container spacing={1} sx={{ mt: 1 }}>
                                                    {msg.attachments.map((att, i) => (
                                                        <Grid item key={i}>
                                                            <Card sx={{ borderRadius: 2 }} elevation={0}>
                                                                <CardMedia
                                                                    component="img"
                                                                    height="100"
                                                                    image={fixImageUrl(att.url)}
                                                                    alt={att.name}
                                                                    sx={{ cursor: 'pointer', width: 100, objectFit: 'cover' }}
                                                                    onClick={() => window.open(fixImageUrl(att.url), '_blank')}
                                                                />
                                                            </Card>
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                            )}
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'right', fontSize: '0.65rem' }}>
                                                {new Date(msg.createdAt).toLocaleString()}
                                            </Typography>
                                        </Paper>
                                    </Box>
                                ))}
                                
                                {selectedTicket.compensation && (
                                    <Box sx={{ mt: 2, p: 3, borderRadius: 3, bgcolor: alpha(theme.palette.success.main, 0.1), border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.2) }}>
                                        <Typography variant="subtitle2" fontWeight="800" color="success.main" gutterBottom>
                                            COMPENSATION ISSUED
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6} sm={3}>
                                                <Typography variant="caption" color="text.secondary" display="block">Type</Typography>
                                                <Typography variant="body2" fontWeight="700" sx={{ textTransform: 'capitalize' }}>{selectedTicket.compensation.type}</Typography>
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                <Typography variant="caption" color="text.secondary" display="block">Amount</Typography>
                                                <Typography variant="body2" fontWeight="700">${selectedTicket.compensation.amount}</Typography>
                                            </Grid>
                                            {selectedTicket.compensation.couponCode && (
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="text.secondary" display="block">Promo Code</Typography>
                                                    <Chip size="small" label={selectedTicket.compensation.couponCode} color="success" sx={{ fontWeight: 'bold' }} />
                                                </Grid>
                                            )}
                                        </Grid>
                                    </Box>
                                )}
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ p: { xs: 2, sm: 3 }, bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                                <Box sx={{ width: '100%', display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' }, mb: 1 }}>
                                    <Button 
                                        variant="outlined" 
                                        color="success" 
                                        onClick={() => setResolveDialogOpen(true)}
                                        sx={{ borderRadius: 3, fontWeight: '700', width: { xs: '100%', sm: 'auto' } }}
                                    >
                                        Resolve with Compensation
                                    </Button>
                                </Box>
                            )}
                            <Box sx={{ width: '100%', px: { xs: 0, sm: 1 } }}>
                                <Grid container spacing={1} alignItems="flex-end">
                                    <Grid item xs={12} sm>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={2}
                                            placeholder="Type your response to the customer..."
                                            value={replyMessage}
                                            onChange={(e) => setReplyMessage(e.target.value)}
                                            variant="outlined"
                                            sx={{ bgcolor: 'background.paper' }}
                                            InputProps={{
                                                sx: { borderRadius: 3 }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm="auto">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: { xs: 1, sm: 0 } }}>
                                            <IconButton component="label" sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: 48, width: 48 }}>
                                                <ImageIcon />
                                                <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                                            </IconButton>
                                            <Button
                                                variant="contained"
                                                onClick={handleReply}
                                                disabled={(!replyMessage && replyAttachments.length === 0) || replying || uploading}
                                                startIcon={<SendIcon />}
                                                sx={{ borderRadius: 3, px: 3, height: 48, flexGrow: { xs: 1, sm: 0 } }}
                                            >
                                                Reply
                                            </Button>
                                        </Stack>
                                    </Grid>
                                </Grid>
                                {replyAttachments.length > 0 && (
                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                        {replyAttachments.map((att, idx) => (
                                            <Chip
                                                key={idx}
                                                label={att.name}
                                                size="small"
                                                onDelete={() => setReplyAttachments(replyAttachments.filter((_, i) => i !== idx))}
                                            />
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            <Dialog open={resolveDialogOpen} onClose={() => setResolveDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: '900' }}>Resolve Ticket</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={3}>
                        <TextField
                            select
                            fullWidth
                            label="Compensation Type"
                            value={compensationType}
                            onChange={(e) => setCompensationType(e.target.value)}
                        >
                            <MenuItem value="none">No Compensation</MenuItem>
                            <MenuItem value="coupon">Promo Code (Coupon)</MenuItem>
                        </TextField>

                        {compensationType !== 'none' && (
                            <TextField
                                fullWidth
                                type="number"
                                label="Amount ($)"
                                value={compensationAmount}
                                onChange={(e) => setCompensationAmount(e.target.value)}
                                InputProps={{ inputProps: { min: 0 } }}
                            />
                        )}

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Resolution Message"
                            value={resolveMessage}
                            onChange={(e) => setResolveMessage(e.target.value)}
                            placeholder="Message to customer regarding this resolution..."
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setResolveDialogOpen(false)} color="inherit">Cancel</Button>
                    <Button 
                        onClick={handleResolve} 
                        variant="contained" 
                        color="success"
                        disabled={resolving || (compensationType !== 'none' && !compensationAmount)}
                    >
                        {resolving ? 'Resolving...' : 'Resolve Ticket'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default CustomerSupportPage;
