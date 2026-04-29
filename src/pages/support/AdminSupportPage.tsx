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
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardMedia,
  Stack,
  Select,
  FormControl,
  InputLabel,
  useTheme,
  alpha,
  TablePagination,
  useMediaQuery
} from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Image as ImageIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { supportAPI, uploadAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface Ticket {
  _id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  messages?: {
    message: string;
    attachments?: { url: string; name: string }[];
  }[];
}

const fixS3Url = (url: string) => {
  if (!url) return '';
  // Check for virtual-hosted-style URLs (bucket.s3.region.amazonaws.com)
  // This causes SSL errors if the bucket name contains dots
  const match = url.match(/^https:\/\/([a-zA-Z0-9.-]+)\.s3\.([a-zA-Z0-9-]+)\.amazonaws\.com\/(.+)$/);
  if (match) {
    const [, bucket, region, key] = match;
    // content-style (path-style): s3.region.amazonaws.com/bucket/key
    return `https://s3.${region}.amazonaws.com/${bucket}/${key}`;
  }
  return url;
};

const AdminSupportPage: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('technical');
  const [priority, setPriority] = useState('medium');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await supportAPI.listMine();
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load tickets');
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

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Show size-limit error immediately (backend limit is 10MB)
    const maxSizeInBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      toast.error('upload image failed image size should not exceed more than 10 MB');
      return;
    }

    try {
      setUploading(true);
      toast.loading('Uploading image...');
      const response = await uploadAPI.uploadImage(file);
      toast.dismiss();
      toast.success('Image uploaded successfully!');

      setAttachments([...attachments, {
        url: response.data.url,
        name: file.name,
      }]);
    } catch (error: any) {
      toast.dismiss();
      const backendMessage = error?.response?.data?.message || error?.message || '';
      if (
        backendMessage.toLowerCase().includes('file too large') ||
        backendMessage.toLowerCase().includes('limit_file_size') ||
        backendMessage.toLowerCase().includes('10mb')
      ) {
        toast.error('upload image failed image size should not exceed more than 10 MB');
      } else {
        toast.error('Failed to upload image');
      }
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const createTicket = async () => {
    if (!subject || !message) {
      toast.error('Subject and message are required');
      return;
    }
    try {
      if (editingTicket) {
        await supportAPI.update(editingTicket._id, {
          subject,
          category,
          priority,
          message,
          attachments,
        });
        toast.success('Ticket updated');
      } else {
        await supportAPI.create({
          subject,
          category,
          priority,
          message,
          attachments,
        });
        toast.success('Ticket created');
      }
      setSubject('');
      setMessage('');
      setAttachments([]);
      setEditingTicket(null);
      loadTickets();
    } catch (e: any) {
      console.error(e);
      const errText = `${e?.response?.data?.message || ''} ${e?.message || ''}`.toLowerCase();
      if (editingTicket && (e?.response?.status === 404 || errText.includes('cannot patch'))) {
        toast.error('Update API route not available. Please restart backend and try again.');
      } else {
        toast.error(e.response?.data?.message || `Failed to ${editingTicket ? 'update' : 'create'} ticket`);
      }
    }
  };

  const handleEditTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setSubject(ticket.subject || '');
    setCategory(ticket.category || 'technical');
    setPriority(ticket.priority || 'medium');
    setMessage(ticket.messages?.[0]?.message || '');
    setAttachments(ticket.messages?.[0]?.attachments || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTicket = async (ticket: Ticket) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await supportAPI.delete(ticket._id);
      toast.success('Ticket deleted');
      if (editingTicket?._id === ticket._id) {
        setEditingTicket(null);
        setSubject('');
        setMessage('');
        setAttachments([]);
      }
      loadTickets();
    } catch (e: any) {
      const errText = `${e?.response?.data?.message || ''} ${e?.message || ''}`.toLowerCase();
      if (e?.response?.status === 404 || errText.includes('cannot delete')) {
        toast.error('Delete API route not available. Please restart backend and try again.');
      } else {
        toast.error(e.response?.data?.message || 'Failed to delete ticket');
      }
    }
  };

  const handleUpdateStatus = async (ticket: Ticket, newStatus: string) => {
    try {
      await supportAPI.reply(ticket._id, { status: newStatus });
      toast.success('Ticket status updated');
      loadTickets();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update ticket status');
    }
  };

  const viewTicketDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setViewDialogOpen(true);
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

  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const paginatedTickets = safeTickets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2 } }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography 
          variant="h4" 
          sx={{ 
            mb: { xs: 1, sm: 2 }, 
            textAlign: { xs: 'center', md: 'left' },
            fontSize: { xs: '1.45rem', sm: '2.125rem' },
            fontWeight: 'bold',
            color: 'text.primary'
          }}
        >
          Support
        </Typography>
      </Box>

      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
          {editingTicket ? 'Edit Ticket' : 'Create Ticket'}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 200px 200px' }, gap: { xs: 1.5, sm: 2 } }}>
          <TextField label={<Box component="span">Subject <Box component="span" sx={{ color: 'error.main' }}>*</Box></Box>} value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth size={isMobile ? "small" : "medium"} />
          <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} size={isMobile ? "small" : "medium"}>
            {['billing', 'technical', 'feature_request', 'account', 'other', 'order_issue', 'feedback', 'refund_issue'].map((c) => (
              <MenuItem key={c} value={c}>
                {c.replace('_', ' ')}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} size={isMobile ? "small" : "medium"}>
            {['low', 'medium', 'high', 'urgent'].map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <TextField
          label={<Box component="span">Describe your issue <Box component="span" sx={{ color: 'error.main' }}>*</Box></Box>}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          fullWidth
          multiline
          rows={3}
          sx={{ mt: { xs: 1.5, sm: 2 } }}
          size={isMobile ? "small" : "medium"}
        />

        {/* Image Upload Section */}
        <Box sx={{ mt: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontSize: '0.8rem' }}>
            Attach Screenshots
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              component="label"
              startIcon={<ImageIcon />}
              disabled={uploading}
              size="small"
              sx={{ py: 1 }}
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
              <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
            </Button>
            {attachments.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {attachments.length} image(s) attached
              </Typography>
            )}
          </Stack>

          {/* Image Previews */}
          {attachments.length > 0 && (
            <Grid container spacing={1.5} sx={{ mt: 1 }}>
              {attachments.map((att, index) => (
                <Grid item xs={6} sm={4} key={index}>
                  <Card sx={{ position: 'relative' }}>
                    <CardMedia component="img" height="100" image={fixS3Url(att.url)} alt={att.name} />
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'error.dark',
                        },
                        width: 20,
                        height: 20,
                      }}
                      onClick={() => removeAttachment(index)}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        <Box sx={{ mt: { xs: 2, sm: 2 }, display: 'flex', justifyContent: 'flex-end' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {editingTicket && (
              <Button
                variant="outlined"
                onClick={() => {
                  setEditingTicket(null);
                  setSubject('');
                  setMessage('');
                  setAttachments([]);
                }}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Cancel Edit
              </Button>
            )}
            <Button variant="contained" onClick={createTicket} disabled={uploading} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              {editingTicket ? 'Update Ticket' : 'Submit'}
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
          My Tickets
        </Typography>
        <Divider sx={{ mb: { xs: 1.5, md: 2 } }} />
        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <Stack spacing={{ xs: 1.5, md: 2 }}>
            {(Array.isArray(paginatedTickets) ? paginatedTickets : []).map((t) => (
              <Paper
                key={t._id}
                variant="outlined"
                sx={{
                  p: { xs: 1.5, md: 2.5 },
                  borderRadius: 2,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.01)
                  }
                }}
              >
                <Box sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', md: 'center' },
                  gap: 2
                }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {t.subject}
                      </Typography>
                      <Chip
                        label={t.status.replace('_', ' ')}
                        size="small"
                        color={statusColor(t.status)}
                        sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {t.messages?.[0]?.message || '-'}
                    </Typography>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    justifyContent={{ xs: 'space-between', md: 'flex-end' }}
                    sx={{ width: { xs: '100%', md: 'auto' }, mt: { xs: 1, md: 0 } }}
                  >
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={t.priority} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                      <Chip label={t.category} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                    </Box>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <FormControl size="small" sx={{ minWidth: 116 }}>
                        <Select
                          value={t.status}
                          onChange={(e) => handleUpdateStatus(t, e.target.value)}
                          sx={{ textTransform: 'capitalize', fontSize: '0.8rem' }}
                        >
                          <MenuItem value="open">Open</MenuItem>
                          <MenuItem value="in_progress">In Progress</MenuItem>
                          <MenuItem value="resolved">Resolved</MenuItem>
                          <MenuItem value="closed">Closed</MenuItem>
                        </Select>
                      </FormControl>
                      <IconButton
                        onClick={() => handleEditTicket(t)}
                        size="small"
                        sx={{
                          bgcolor: alpha(theme.palette.warning.main, 0.12),
                          color: 'warning.main',
                          '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.2) }
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteTicket(t)}
                        size="small"
                        sx={{
                          bgcolor: alpha(theme.palette.error.main, 0.12),
                          color: 'error.main',
                          '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => viewTicketDetails(t)}
                        size="small"
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          color: 'primary.main',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              </Paper>
            ))}
            {tickets.length === 0 && <Typography color="text.secondary">No tickets yet</Typography>}
            {tickets.length > 0 && (
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={tickets.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            )}
          </Stack>
        )}
      </Paper>

      {/* View Ticket Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Ticket Details
          <IconButton
            onClick={() => setViewDialogOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'error.dark',
              },
              width: 28,
              height: 28,
            }}
            size="small"
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTicket && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedTicket.subject}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip label={selectedTicket.status} size="small" color={statusColor(selectedTicket.status)} />
                <Chip label={selectedTicket.priority} size="small" />
                <Chip label={selectedTicket.category} size="small" />
              </Stack>
              <Divider sx={{ my: 2 }} />

              {selectedTicket.messages?.map((msg, index) => (
                <Box key={index} sx={{ mb: 3 }}>
                  <Typography variant="body1" paragraph>
                    {msg.message}
                  </Typography>

                  {/* Display attached images */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Attachments:
                      </Typography>
                      <Grid container spacing={2}>
                        {msg.attachments.map((att, attIndex) => (
                          <Grid item xs={6} sm={4} key={attIndex}>
                            <Card>
                              <CardMedia
                                component="img"
                                height="150"
                                image={fixS3Url(att.url)}
                                alt={att.name}
                                sx={{ cursor: 'pointer' }}
                                onClick={() => window.open(att.url, '_blank')}
                              />
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container >
  );
};

export default AdminSupportPage;
