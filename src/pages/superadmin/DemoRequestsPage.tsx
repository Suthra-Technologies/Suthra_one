import {
  Business as BusinessIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  FilterList as FilterIcon,
  Phone as PhoneIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Event as EventIcon,
  Update as UpdateIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { superAPI, publicDemoAPI } from '../../services/api';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'warning' as const },
  { value: 'contacted', label: 'Contacted', color: 'info' as const },
  { value: 'demo_scheduled', label: 'Demo Scheduled', color: 'primary' as const },
  { value: 'completed', label: 'Completed', color: 'success' as const },
  { value: 'rejected', label: 'Rejected', color: 'error' as const },
];

const getStatusChipColor = (status: string): 'default' | 'warning' | 'info' | 'primary' | 'success' | 'error' => {
  const found = STATUS_OPTIONS.find((s) => s.value === status);
  return found?.color || 'default';
};

const getStatusLabel = (status: string): string => {
  const found = STATUS_OPTIONS.find((s) => s.value === status);
  return found?.label || status;
};

const DemoRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);

  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ preferredDate: '', preferredTime: '' });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await superAPI.listDemoRequests(params);
      setRequests(response.data.requests || []);
      setTotalPages(response.data.totalPages || 1);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching demo requests:', error);
      toast.error('Failed to load demo requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  useEffect(() => {
    if (rescheduleData.preferredDate) {
      setFetchingSlots(true);
      setRescheduleData(prev => ({ ...prev, preferredTime: '' }));
      publicDemoAPI.getAvailableSlots(rescheduleData.preferredDate)
        .then(res => {
          if (res.data && res.data.slots) {
            setAvailableSlots(res.data.slots);
          } else {
            setAvailableSlots([]);
          }
        })
        .catch(() => setAvailableSlots([]))
        .finally(() => setFetchingSlots(false));
    } else {
      setAvailableSlots([]);
    }
  }, [rescheduleData.preferredDate]);

  const handleSearch = () => {
    setPage(1);
    fetchRequests();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setNotes(request.notes || '');
    setMeetingLink(request.meetingLink || '');
    setDetailDialogOpen(true);
  };

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      await superAPI.updateDemoRequest(requestId, { status: newStatus });
      toast.success('Status updated successfully');
      fetchRequests();
      // Update selected request if dialog is open
      if (selectedRequest && selectedRequest._id === requestId) {
        setSelectedRequest((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedRequest) return;
    try {
      await superAPI.updateDemoRequest(selectedRequest._id, { notes });
      toast.success('Notes saved successfully');
      fetchRequests();
      setSelectedRequest((prev: any) => ({ ...prev, notes }));
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const handleConfirmDemo = async () => {
    if (!selectedRequest) return;
    try {
      await superAPI.confirmDemoRequest(selectedRequest._id, { meetingLink });
      toast.success('Demo confirmed and email sent');
      fetchRequests();
      setSelectedRequest((prev: any) => ({ ...prev, status: 'demo_scheduled', meetingLink }));
    } catch (error) {
      console.error('Error confirming demo:', error);
      toast.error('Failed to confirm demo');
    }
  };

  const handleDeleteClick = (id: string) => {
    setRequestToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleRescheduleClick = (request: any) => {
    setSelectedRequest(request);
    setRescheduleData({ preferredDate: '', preferredTime: '' });
    setAvailableSlots([]);
    setRescheduleDialogOpen(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedRequest || !rescheduleData.preferredDate || !rescheduleData.preferredTime) return;
    setRescheduling(true);
    try {
      await superAPI.adminRescheduleDemo(selectedRequest._id, {
        newDate: rescheduleData.preferredDate,
        newTime: rescheduleData.preferredTime,
        requestedBy: 'admin'
      });
      toast.success('Demo successfully rescheduled!');
      setRescheduleDialogOpen(false);
      fetchRequests();
      if (detailDialogOpen) {
        setDetailDialogOpen(false); // Close details or refetch to update history
      }
    } catch (error: any) {
      console.error('Error rescheduling:', error);
      toast.error(error.response?.data?.message || 'Failed to reschedule. The selected slot might be taken.');
      // Refetch slots if conflict
      setRescheduleData(prev => ({ ...prev, preferredTime: '' }));
      if (rescheduleData.preferredDate) {
        publicDemoAPI.getAvailableSlots(rescheduleData.preferredDate).then(res => {
          if (res.data?.slots) setAvailableSlots(res.data.slots);
        });
      }
    } finally {
      setRescheduling(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!requestToDelete) return;
    try {
      await superAPI.deleteDemoRequest(requestToDelete);
      toast.success('Demo request deleted');
      setDeleteConfirmOpen(false);
      setRequestToDelete(null);
      if (detailDialogOpen && selectedRequest?._id === requestToDelete) {
        setDetailDialogOpen(false);
        setSelectedRequest(null);
      }
      fetchRequests();
    } catch (error) {
      console.error('Error deleting demo request:', error);
      toast.error('Failed to delete demo request');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          textAlign: { xs: 'center', sm: 'left' },
          whiteSpace: 'nowrap',
          fontSize: { xs: '1.5rem', sm: '2.125rem' },
          mt: { xs: -1, sm: 0 },
        }}
      >
        Demo Requests
      </Typography>

      {/* Summary & Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setSearch(''); setPage(1); setTimeout(fetchRequests, 0); }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                label="Status Filter"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                startAdornment={
                  <InputAdornment position="start">
                    <FilterIcon fontSize="small" />
                  </InputAdornment>
                }
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <Button variant="contained" onClick={handleSearch} fullWidth>
              Search
            </Button>
          </Grid>
          <Grid item xs={12} sm={12} md={3}>
            <Typography variant="body2" color="text.secondary" textAlign={{ xs: 'center', md: 'right' }}>
              Total: <strong>{total}</strong> demo request{total !== 1 ? 's' : ''}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Desktop Table View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#d32f2f', 0.04) }}>
                <TableCell sx={{ fontWeight: 700 }}>Business Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Requested Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Last Updated</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Rescheduled By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No demo requests found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => {
                  const isRecentlyUpdated = req.updatedAt && (new Date().getTime() - new Date(req.updatedAt).getTime() < 5 * 60000); // 5 mins
                  return (
                  <TableRow
                    key={req._id}
                    hover
                    sx={{ 
                      '&:last-child td, &:last-child th': { border: 0 },
                      bgcolor: isRecentlyUpdated ? alpha('#4caf50', 0.05) : 'inherit',
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <BusinessIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2">{req.businessName}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="primary" component="a" href={`mailto:${req.email}`} sx={{ textDecoration: 'none' }}>
                        {req.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {req.phonePrefix} {req.phoneNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={req.preferredDateTime ? "primary" : "text.secondary"}>
                        {req.preferredDateTime ? formatDate(req.preferredDateTime) : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                          value={req.status}
                          onChange={(e) => handleStatusChange(req._id, e.target.value)}
                          size="small"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(req.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {req.updatedAt ? formatDate(req.updatedAt) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {req.rescheduledBy || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleViewDetails(req)} color="primary">
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reschedule">
                          <IconButton size="small" onClick={() => handleRescheduleClick(req)} color="secondary">
                            <EventIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDeleteClick(req._id)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Mobile Card View */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : requests.length === 0 ? (
          <Box textAlign="center" p={4}>
            <Typography color="textSecondary">No demo requests found</Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {requests.map((req) => (
              <Card key={req._id} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={1.5}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {req.businessName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatDate(req.createdAt)}
                      </Typography>
                    </Box>
                    <Chip
                      label={getStatusLabel(req.status)}
                      color={getStatusChipColor(req.status)}
                      size="small"
                    />
                  </Box>

                  <Divider sx={{ mb: 1.5 }} />

                  <Stack spacing={1} mb={2}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <EmailIcon fontSize="small" color="action" />
                      <Typography variant="body2" component="a" href={`mailto:${req.email}`} sx={{ textDecoration: 'none', color: 'primary.main' }}>
                        {req.email}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <PhoneIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {req.phonePrefix} {req.phoneNumber}
                      </Typography>
                    </Box>
                  </Stack>

                  <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={req.status}
                      label="Status"
                      onChange={(e) => handleStatusChange(req._id, e.target.value)}
                      size="small"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Divider sx={{ mb: 1.5 }} />

                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" onClick={() => handleViewDetails(req)} fullWidth startIcon={<ViewIcon />}>
                      View
                    </Button>
                    <Button size="small" variant="outlined" color="secondary" onClick={() => handleRescheduleClick(req)} fullWidth startIcon={<EventIcon />}>
                      Reschedule
                    </Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => handleDeleteClick(req._id)} fullWidth startIcon={<DeleteIcon />}>
                      Delete
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Pagination */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
      </Box>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            mt: { xs: 8, sm: 'auto' },
            mb: { xs: 2, sm: 'auto' },
            maxHeight: { xs: '80vh', sm: 'calc(100% - 64px)' },
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight="bold">
            Demo Request Details
          </Typography>
          <IconButton
            onClick={() => setDetailDialogOpen(false)}
            size="small"
            sx={{
              bgcolor: 'error.main',
              color: 'white',
              width: 28,
              height: 28,
              '&:hover': { bgcolor: 'error.dark' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedRequest && (
            <Stack spacing={3}>
              {/* Business Info */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="overline" color="text.secondary" display="block" mb={1.5}>
                  Business Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <BusinessIcon color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Business Name
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selectedRequest.businessName}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <EmailIcon color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Email
                        </Typography>
                        <Typography
                          variant="body2"
                          component="a"
                          href={`mailto:${selectedRequest.email}`}
                          sx={{ textDecoration: 'none', color: 'primary.main', display: 'block' }}
                        >
                          {selectedRequest.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PhoneIcon color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Phone
                        </Typography>
                        <Typography variant="body2">
                          {selectedRequest.phonePrefix} {selectedRequest.phoneNumber}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Submitted On
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(selectedRequest.createdAt)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Status Management */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="overline" color="text.secondary" display="block" mb={1.5}>
                  Status Management
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedRequest.status}
                    label="Status"
                    onChange={(e) => handleStatusChange(selectedRequest._id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Paper>

              {/* Notes */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="overline" color="text.secondary" display="block" mb={1.5}>
                  Internal Notes
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes about this demo request..."
                  variant="outlined"
                  size="small"
                />
                <Box mt={1.5} textAlign="right">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSaveNotes}
                    disabled={notes === (selectedRequest.notes || '')}
                  >
                    Save Notes
                  </Button>
                </Box>
              </Paper>

              {/* Scheduling & Confirmation */}
              {selectedRequest.preferredDateTime && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <Typography variant="overline" color="success.main" display="block" mb={1.5} fontWeight="bold">
                    Schedule Confirmation
                  </Typography>
                  <Typography variant="body2" mb={2}>
                    Requested Time: <strong>{formatDate(selectedRequest.preferredDateTime)}</strong>
                  </Typography>
                  <TextField
                    fullWidth
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="Enter meeting link (e.g. Zoom/Google Meet) for the customer"
                    variant="outlined"
                    size="small"
                    sx={{ mb: 2, bgcolor: 'white' }}
                  />
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    onClick={handleConfirmDemo}
                  >
                    Confirm & Send Invite
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    sx={{ mt: 1 }}
                    onClick={() => handleRescheduleClick(selectedRequest)}
                  >
                    Reschedule
                  </Button>
                </Paper>
              )}

              {/* Reschedule History */}
              {selectedRequest.rescheduleHistory && selectedRequest.rescheduleHistory.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                    <HistoryIcon fontSize="small" color="action" />
                    <Typography variant="overline" color="text.secondary" display="block">
                      Reschedule History
                    </Typography>
                  </Stack>
                  <Stack spacing={2}>
                    {selectedRequest.rescheduleHistory.map((history: any, idx: number) => (
                      <Box key={idx} sx={{ pl: 2, borderLeft: '2px solid #e0e0e0' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {formatDate(history.timestamp)}
                        </Typography>
                        <Typography variant="body2">
                          Changed by: <strong>{history.changedBy || 'Unknown'}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strike>{history.oldSlot ? formatDate(history.oldSlot) : 'N/A'}</strike> 
                          {' \u2192 '} 
                          <strong style={{ color: '#1976d2' }}>{history.newSlot ? formatDate(history.newSlot) : 'N/A'}</strong>
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this demo request? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog
        open={rescheduleDialogOpen}
        onClose={() => !rescheduling && setRescheduleDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reschedule Demo</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" mb={3} color="text.secondary">
            Current slot: <strong>{selectedRequest?.preferredDateTime ? formatDate(selectedRequest.preferredDateTime) : 'N/A'}</strong>
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                type="date"
                label="New Preferred Date"
                value={rescheduleData.preferredDate}
                onChange={(e) => setRescheduleData({ ...rescheduleData, preferredDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
                disabled={rescheduling}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                select
                label={fetchingSlots ? "Loading slots..." : "New Preferred Time"}
                value={rescheduleData.preferredTime}
                onChange={(e) => setRescheduleData({ ...rescheduleData, preferredTime: e.target.value })}
                disabled={!rescheduleData.preferredDate || fetchingSlots || rescheduling}
              >
                {availableSlots.length > 0 ? (
                  availableSlots.map(slot => (
                    <MenuItem key={slot} value={slot}>{slot}</MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>No slots available</MenuItem>
                )}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRescheduleDialogOpen(false)} disabled={rescheduling}>Cancel</Button>
          <Button 
            onClick={handleRescheduleSubmit} 
            variant="contained" 
            color="primary"
            disabled={rescheduling || !rescheduleData.preferredDate || !rescheduleData.preferredTime}
          >
            {rescheduling ? 'Rescheduling...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DemoRequestsPage;
