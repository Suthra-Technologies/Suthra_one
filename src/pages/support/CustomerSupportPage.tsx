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
} from '@mui/material';
import {
    Close as CloseIcon,
    Visibility as VisibilityIcon,
    Send as SendIcon,
    Image as ImageIcon,
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
}

const fixS3Url = (url: string) => {
    if (!url) return '';
    const match = url.match(/^https:\/\/([a-zA-Z0-9.-]+)\.s3\.([a-zA-Z0-9-]+)\.amazonaws.com\/(.+)$/);
    if (match) {
        const [, bucket, region, key] = match;
        return `https://s3.${region}.amazonaws.com/${bucket}/${key}`;
    }
    return url;
};

const CustomerSupportPage: React.FC = () => {
    const theme = useTheme();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);

    const [replyMessage, setReplyMessage] = useState('');
    const [replyAttachments, setReplyAttachments] = useState<{ url: string; name: string }[]>([]);
    const [replying, setReplying] = useState(false);
    const [uploading, setUploading] = useState(false);

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
        if (!selectedTicket || !replyMessage) return;

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
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" fontWeight="900" color="primary">
                    Customer Support
                </Typography>
                <Button variant="outlined" onClick={loadTickets} disabled={loading}>
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
                        <DialogTitle sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'grey.50' }}>
                            <Box>
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
                                    </Stack>
                                </Box>
                            </Box>
                            <IconButton onClick={() => setViewDialogOpen(false)} size="small" sx={{ bgcolor: 'white' }}>
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers sx={{ p: 3, bgcolor: '#fbfcfd', minHeight: 400 }}>
                            <Box sx={{ mb: 4 }}>
                                <Typography variant="subtitle2" gutterBottom fontWeight="700">Status Management</Typography>
                                <Stack direction="row" spacing={1}>
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
                                </Stack>
                            </Box>

                            <Typography variant="subtitle2" gutterBottom fontWeight="700">Conversation History</Typography>
                            <Stack spacing={2} sx={{ mb: 4 }}>
                                {selectedTicket.messages.map((msg, idx) => (
                                    <Box key={idx} sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: msg.senderRole === 'customer' ? 'flex-start' : 'flex-end'
                                    }}>
                                        <Paper sx={{
                                            p: 2,
                                            borderRadius: 3,
                                            maxWidth: '80%',
                                            bgcolor: msg.senderRole === 'customer' ? 'white' : alpha(theme.palette.primary.main, 0.05),
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
                                                                    image={fixS3Url(att.url)}
                                                                    alt={att.name}
                                                                    sx={{ cursor: 'pointer', width: 100, objectFit: 'cover' }}
                                                                    onClick={() => window.open(att.url, '_blank')}
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
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Box sx={{ width: '100%', px: 1 }}>
                                <Grid container spacing={1} alignItems="flex-end">
                                    <Grid item xs>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={2}
                                            placeholder="Type your response to the customer..."
                                            value={replyMessage}
                                            onChange={(e) => setReplyMessage(e.target.value)}
                                            variant="outlined"
                                            sx={{ bgcolor: 'white' }}
                                            InputProps={{
                                                sx: { borderRadius: 3 }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item>
                                        <Stack direction="row" spacing={1}>
                                            <IconButton component="label" sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}>
                                                <ImageIcon />
                                                <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                                            </IconButton>
                                            <Button
                                                variant="contained"
                                                onClick={handleReply}
                                                disabled={!replyMessage || replying || uploading}
                                                startIcon={<SendIcon />}
                                                sx={{ borderRadius: 3, px: 3, h: 56 }}
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
        </Container>
    );
};

export default CustomerSupportPage;
