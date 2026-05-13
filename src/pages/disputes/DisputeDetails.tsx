import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Divider,
  Stack,
  useTheme,
  alpha,
  CircularProgress,
  Avatar,
  Paper,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Gavel,
  History,
  CheckCircle,
  Error as ErrorIcon,
  AttachMoney,
  Person,
  Notes,
  Receipt,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { disputesAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const DisputeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState<any>(null);
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false);
  const [resolution, setResolution] = useState({
    type: 'full_refund',
    amount: 0,
    notes: '',
  });

  const fetchDisputeDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await disputesAPI.getOne(id);
      setDispute(res.data);
      setResolution(prev => ({ ...prev, amount: res.data.disputedAmount }));
    } catch (error) {
      toast.error('Failed to load dispute details');
      navigate('/disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputeDetails();
  }, [id]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return;
    try {
      await disputesAPI.updateStatus(id, newStatus, `Status updated to ${newStatus}`);
      toast.success('Status updated');
      fetchDisputeDetails();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleResolve = async () => {
    if (!id) return;
    try {
      await disputesAPI.resolve(id, resolution);
      toast.success('Dispute resolved successfully');
      setResolutionDialogOpen(false);
      fetchDisputeDetails();
    } catch (error) {
      toast.error('Failed to resolve dispute');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!dispute) return null;

  const isResolved = dispute.status === 'resolved' || dispute.status === 'rejected';

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={4}>
        <Button onClick={() => navigate('/disputes')}>Back to List</Button>
        <Typography variant="h4" fontWeight="800">Dispute #{dispute.orderNumber}</Typography>
      </Stack>

      <Grid container spacing={3}>
        {/* Left Column: Info & Evidence */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="700">Claim Details</Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase' }}>Reason</Typography>
                  <Typography variant="body1" fontWeight="600" color="error.main">
                    {dispute.reason.replace(/_/g, ' ').toUpperCase()}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase' }}>Description</Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.02), mt: 1 }}>
                    <Typography variant="body1">{dispute.description}</Typography>
                  </Paper>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase' }}>Evidence</Typography>
                  {dispute.evidence?.length > 0 ? (
                    <Grid container spacing={1} mt={1}>
                      {dispute.evidence.map((img: string, idx: number) => (
                        <Grid item xs={4} sm={3} key={idx}>
                          <Box
                            component="img"
                            src={img}
                            sx={{ width: '100%', borderRadius: 2, cursor: 'pointer', border: '1px solid', borderColor: 'divider' }}
                            onClick={() => window.open(img, '_blank')}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 1 }}>No visual evidence provided.</Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="700">Audit History</Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                {dispute.statusHistory.map((history: any, idx: number) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 2 }}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                      <History sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="600">
                        {history.status.replace(/_/g, ' ').toUpperCase()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(history.timestamp).toLocaleString()} • {history.notes}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Actions & Resolution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.02), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.1), mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="700">Financial Summary</Typography>
              <Stack spacing={2} mt={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Order Total</Typography>
                  <Typography variant="body2" fontWeight="700">
                    {dispute.order && typeof dispute.order === 'object' 
                      ? `$${dispute.order.totalAmount?.toFixed(2)}` 
                      : '$---'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Disputed Amount</Typography>
                  <Typography variant="h6" color="error.main" fontWeight="800">${dispute.disputedAmount.toFixed(2)}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="700">Actions</Typography>
              <Stack spacing={2} mt={2}>
                {!isResolved && (
                  <>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="warning"
                      startIcon={<History />}
                      disabled={dispute.status === 'under_investigation'}
                      onClick={() => handleStatusUpdate('under_investigation')}
                    >
                      Mark Investigating
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<CheckCircle />}
                      onClick={() => setResolutionDialogOpen(true)}
                    >
                      Resolve Claim
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      startIcon={<ErrorIcon />}
                      onClick={() => handleStatusUpdate('rejected')}
                    >
                      Reject Claim
                    </Button>
                  </>
                )}
                {isResolved && (
                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2, textAlign: 'center' }}>
                    <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6" color="success.main" fontWeight="700">Resolved</Typography>
                    <Typography variant="body2">{dispute.resolution?.notes}</Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Resolution Dialog */}
      <Dialog open={resolutionDialogOpen} onClose={() => setResolutionDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Resolve Dispute</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              select
              fullWidth
              label="Resolution Type"
              value={resolution.type}
              onChange={(e) => setResolution({ ...resolution, type: e.target.value })}
            >
              <MenuItem value="full_refund">Full Refund</MenuItem>
              <MenuItem value="partial_refund">Partial Refund</MenuItem>
              <MenuItem value="store_credit">Store Credit</MenuItem>
              <MenuItem value="replacement">Replacement</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Refund Amount"
              type="number"
              value={resolution.amount}
              onChange={(e) => setResolution({ ...resolution, amount: parseFloat(e.target.value) || 0 })}
              disabled={resolution.type === 'full_refund'}
              InputProps={{ startAdornment: <AttachMoney sx={{ fontSize: 20, mr: 0.5, color: 'text.secondary' }} /> }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Internal Notes"
              placeholder="Explain why this resolution was chosen..."
              value={resolution.notes}
              onChange={(e) => setResolution({ ...resolution, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setResolutionDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleResolve}>Complete Resolution</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DisputeDetails;
