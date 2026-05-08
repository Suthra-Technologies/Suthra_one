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
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Pagination,
  Card,
  CardContent,
  CardMedia,
  Divider,
  Select,
  MenuItem,
  FormControl,
  Avatar,
  AvatarGroup,
  Tooltip,
  Grid,
  IconButton,
  Stack,
} from '@mui/material';
import { Image as ImageIcon, Close as CloseIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { superAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

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

const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<any | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editMessage, setEditMessage] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await superAPI.listSupportTickets({ page });
      setTickets(response.data.tickets || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page]);

  const handleReplyClick = (ticket: any) => {
    setSelectedTicket(ticket);
    setReplyMessage('');
    setReplyDialogOpen(true);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    try {
      await superAPI.replySupportTicket(selectedTicket._id, { message: replyMessage });
      toast.success('Reply sent successfully');
      setReplyDialogOpen(false);
      fetchTickets();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await superAPI.replySupportTicket(ticketId, { status: newStatus });
      toast.success('Status updated successfully');
      fetchTickets();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleEditClick = (ticket: any) => {
    setEditingTicket(ticket);
    setEditSubject(ticket.subject || '');
    setEditCategory(ticket.category || 'technical');
    setEditPriority(ticket.priority || 'medium');
    setEditMessage(ticket.messages?.[0]?.message || '');
    setEditDialogOpen(true);
  };

  const handleUpdateTicket = async () => {
    if (!editingTicket || !editSubject.trim() || !editMessage.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    try {
      await superAPI.updateSupportTicket(editingTicket._id, {
        subject: editSubject,
        category: editCategory,
        priority: editPriority,
        message: editMessage,
      });
      toast.success('Ticket updated successfully');
      setEditDialogOpen(false);
      setEditingTicket(null);
      fetchTickets();
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      toast.error(error?.response?.data?.message || 'Failed to update ticket');
    }
  };

  const handleDeleteTicket = async (ticket: any) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;

    try {
      await superAPI.deleteSupportTicket(ticket._id);
      toast.success('Ticket deleted successfully');
      fetchTickets();
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete ticket');
    }
  };

  const getStatusColor = (status: string): 'default' | 'warning' | 'info' | 'success' => {
    const colors: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
      open: 'warning',
      in_progress: 'info',
      resolved: 'success',
      closed: 'default',
    };
    return colors[status] || 'default';
  };

  // Get attachments from first message
  const getTicketAttachments = (ticket: any) => {
    if (!ticket.messages || ticket.messages.length === 0) return [];
    const firstMessage = ticket.messages[0];
    return firstMessage.attachments || [];
  };

  const getCreatorName = (ticket: any) => {
    const firstName = ticket?.createdBy?.firstName || '';
    const lastName = ticket?.createdBy?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'N/A';
  };

  return (
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: { xs: 1.5, sm: 3 }, pt: { xs: 0.5, sm: 3 } }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          textAlign: { xs: 'center', sm: 'left' },
          whiteSpace: 'nowrap',
          fontSize: { xs: '1.5rem', sm: '2.125rem' },
          mt: { xs: -1, sm: 0 }
        }}
      >
        Support Tickets
      </Typography>

      {/* Desktop View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Subject</TableCell>
                <TableCell>Images</TableCell>
                <TableCell>Tenant</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary">No tickets found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => {
                  const attachments = getTicketAttachments(ticket);
                  return (
                    <TableRow key={ticket._id}>
                      <TableCell>
                        <Typography variant="subtitle2">{ticket.subject}</Typography>
                      </TableCell>
                      <TableCell>
                        {attachments.length > 0 ? (
                          <AvatarGroup max={3}>
                            {attachments.map((att: any, index: number) => (
                              <Tooltip key={index} title={att.name || 'Image'}>
                                <Avatar
                                  src={fixS3Url(att.url)}
                                  sx={{ width: 40, height: 40, cursor: 'pointer' }}
                                  onClick={() => window.open(att.url, '_blank')}
                                >
                                  <ImageIcon />
                                </Avatar>
                              </Tooltip>
                            ))}
                          </AvatarGroup>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No images
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{ticket.tenant?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {getCreatorName(ticket)}
                        </Typography>
                        {ticket.createdBy?.email && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {ticket.createdBy.email}
                          </Typography>
                        )}
                        {ticket.createdBy?.phone && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {ticket.createdBy.phone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={ticket.priority}
                          color={
                            ticket.priority === 'urgent'
                              ? 'error'
                              : ticket.priority === 'high'
                                ? 'warning'
                                : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {/* Status Dropdown - Only Super Admin can change */}
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={ticket.status}
                            onChange={(e) => handleStatusChange(ticket._id, e.target.value)}
                            size="small"
                          >
                            <MenuItem value="open">Open</MenuItem>
                            <MenuItem value="in_progress">In Progress</MenuItem>
                            <MenuItem value="resolved">Resolved</MenuItem>
                            <MenuItem value="closed">Closed</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>{new Date(ticket.lastUpdatedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined" onClick={() => handleReplyClick(ticket)}>
                            View & Reply
                          </Button>
                          <IconButton size="small" color="primary" onClick={() => handleEditClick(ticket)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteTicket(ticket)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
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
        ) : tickets.length === 0 ? (
          <Box textAlign="center" p={4}>
            <Typography color="textSecondary">No tickets found</Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {tickets.map((ticket) => {
              const attachments = getTicketAttachments(ticket);
              return (
                <Card key={ticket._id} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {ticket.subject}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {ticket.tenant?.name || 'N/A'}
                        </Typography>
                      </Box>
                      <Chip
                        label={ticket.priority}
                        color={
                          ticket.priority === 'urgent'
                            ? 'error'
                            : ticket.priority === 'high'
                              ? 'warning'
                              : 'default'
                        }
                        size="small"
                      />
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={2} mb={2}>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                          <Typography variant="caption" color="textSecondary">Created By:</Typography>
                          <Box>
                            <Typography variant="body2">{getCreatorName(ticket)}</Typography>
                            {ticket.createdBy?.email && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {ticket.createdBy.email}
                              </Typography>
                            )}
                            {ticket.createdBy?.phone && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {ticket.createdBy.phone}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="textSecondary" display="block" mb={0.5}>Status</Typography>
                          <FormControl size="small" fullWidth>
                            <Select
                              value={ticket.status}
                              onChange={(e) => handleStatusChange(ticket._id, e.target.value)}
                              size="small"
                            >
                              <MenuItem value="open">Open</MenuItem>
                              <MenuItem value="in_progress">In Progress</MenuItem>
                              <MenuItem value="resolved">Resolved</MenuItem>
                              <MenuItem value="closed">Closed</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Last Updated</Typography>
                        <Typography variant="body2">{new Date(ticket.lastUpdatedAt).toLocaleDateString()}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Images</Typography>
                        <Box>
                          {attachments.length > 0 ? (
                            <AvatarGroup max={3} sx={{ justifyContent: 'flex-start' }}>
                              {attachments.map((att: any, index: number) => (
                                <Tooltip key={index} title={att.name || 'Image'}>
                                  <Avatar
                                    src={fixS3Url(att.url)}
                                    sx={{ width: 30, height: 30, cursor: 'pointer' }}
                                    onClick={() => window.open(att.url, '_blank')}
                                  >
                                    <ImageIcon fontSize="small" />
                                  </Avatar>
                                </Tooltip>
                              ))}
                            </AvatarGroup>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No images
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    </Grid>

                    <Divider sx={{ mb: 2 }} />

                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="contained" onClick={() => handleReplyClick(ticket)} fullWidth>
                        View & Reply
                      </Button>
                      <IconButton color="primary" onClick={() => handleEditClick(ticket)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDeleteTicket(ticket)}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
      </Box>

      {/* Reply Dialog */}
      <Dialog
        open={replyDialogOpen}
        onClose={() => setReplyDialogOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            mt: { xs: 8, sm: 'auto' },
            mb: { xs: 2, sm: 'auto' },
            maxHeight: { xs: '80vh', sm: 'calc(100% - 64px)' }
          }
        }}
      >
        <DialogTitle>
          Ticket: {selectedTicket?.subject}
          <IconButton
            onClick={() => setReplyDialogOpen(false)}
            size="small"
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              bgcolor: 'error.main',
              color: 'white',
              width: 24,
              height: 24,
              '&:hover': {
                bgcolor: 'error.dark',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Ticket Info */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`Priority: ${selectedTicket?.priority}`} size="small" />
              <Chip label={`Status: ${selectedTicket?.status}`} size="small" color={getStatusColor(selectedTicket?.status)} />
              <Chip label={`Category: ${selectedTicket?.category}`} size="small" />
            </Box>

            {(selectedTicket?.customerDetails?.fullName || selectedTicket?.customerDetails?.email || selectedTicket?.customerDetails?.phone) && (
              <Box sx={{ p: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 1 }}>
                <Typography variant="overline" color="text.secondary" display="block">Customer Details (Dynamic Metadata):</Typography>
                <Typography variant="body2">
                  {selectedTicket.customerDetails.fullName} {selectedTicket.customerDetails.email && `(${selectedTicket.customerDetails.email})`} {selectedTicket.customerDetails.phone && `| ${selectedTicket.customerDetails.phone}`}
                </Typography>
              </Box>
            )}

            <Divider />

            {/* Messages */}
            <Box sx={{ maxHeight: 400, overflowY: 'auto', p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              {selectedTicket?.messages?.map((msg: any, index: number) => (
                <Card
                  key={index}
                  sx={{ mb: 2, bgcolor: msg.senderRole === 'super_admin' ? '#e3f2fd' : 'white' }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      {msg.senderRole === 'super_admin' ? 'Support Team' : 'Customer'} -{' '}
                      {new Date(msg.createdAt).toLocaleString()}
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {msg.message}
                    </Typography>

                    {/* Display Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Attachments:
                        </Typography>
                        <Grid container spacing={2}>
                          {msg.attachments.map((att: any, attIndex: number) => (
                            <Grid item xs={6} sm={4} md={3} key={attIndex}>
                              <Card
                                sx={{ cursor: 'pointer' }}
                                onClick={() => window.open(att.url, '_blank')}
                              >
                                <CardMedia
                                  component="img"
                                  height="120"
                                  image={fixS3Url(att.url)}
                                  alt={att.name || 'Attachment'}
                                />
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>


            {/* Reply Input */}
            <TextField
              label="Reply"
              multiline
              rows={4}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your reply here..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialogOpen(false)}>Close</Button>
          <Button onClick={handleSendReply} variant="contained" disabled={!replyMessage.trim()}>
            Send Reply
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Ticket</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Subject"
            value={editSubject}
            onChange={(e) => setEditSubject(e.target.value)}
            fullWidth
          />
          <TextField
            label="Category"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            fullWidth
          />
          <FormControl fullWidth>
            <Select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              displayEmpty
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Message"
            value={editMessage}
            onChange={(e) => setEditMessage(e.target.value)}
            multiline
            rows={4}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateTicket}>Update</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TicketsPage;
