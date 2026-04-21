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
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to upload image');
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
      await supportAPI.create({
        subject,
        category,
        priority,
        message,
        attachments,
      });
      toast.success('Ticket created');
      setSubject('');
      setMessage('');
      setAttachments([]);
      loadTickets();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to create ticket');
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
          Create Ticket
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
          <Button variant="contained" onClick={createTicket} disabled={uploading} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Submit
          </Button>
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
