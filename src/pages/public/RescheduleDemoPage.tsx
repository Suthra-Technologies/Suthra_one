import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Container, Typography, Paper, Grid, TextField, MenuItem, Button, 
  CircularProgress, Alert 
} from '@mui/material';
import { publicDemoAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { getEasternTzAbbreviation, formatSlotLabel } from '../../utils/demoSlots';

const RescheduleDemoPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [demoRequest, setDemoRequest] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    preferredDate: '',
    preferredTime: '',
  });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);

  useEffect(() => {
    if (!token) return;
    publicDemoAPI.getDemoByToken(token)
      .then(res => {
        setDemoRequest(res.data);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Invalid or expired reschedule link.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (formData.preferredDate) {
      setFetchingSlots(true);
      setFormData(prev => ({ ...prev, preferredTime: '' }));
      const apiUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:5006";
      fetch(`${apiUrl}/api/email/demo-requests/slots?date=${formData.preferredDate}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.slots) {
                setAvailableSlots(data.slots);
            } else {
                setAvailableSlots([]);
            }
        })
        .catch(() => setAvailableSlots([]))
        .finally(() => setFetchingSlots(false));
    } else {
      setAvailableSlots([]);
    }
  }, [formData.preferredDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !formData.preferredDate || !formData.preferredTime) {
      toast.error('Please select a date and time');
      return;
    }

    setSubmitting(true);
    try {
      const newDateTime = new Date(`${formData.preferredDate}T${formData.preferredTime}:00`).toISOString();
      await publicDemoAPI.rescheduleDemo(token, newDateTime);
      setSuccess(true);
      toast.success('Successfully rescheduled!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reschedule. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8f9fa' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8f9fa' }}>
        <Container maxWidth="sm">
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          <Button variant="contained" onClick={() => navigate('/')}>Return to Homepage</Button>
        </Container>
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8f9fa' }}>
        <Container maxWidth="sm">
          <Paper elevation={0} sx={{ p: 6, borderRadius: 4, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" fontWeight="bold" gutterBottom>
              Rescheduled!
            </Typography>
            <Typography color="text.secondary" mb={4}>
              Your demo has been successfully rescheduled. We have notified our team and will send you a new meeting invite shortly.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/')}>Return to Homepage</Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8f9fa', py: 8 }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 6 }, borderRadius: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom align="center">
            Reschedule Your Demo
          </Typography>
          <Typography color="text.secondary" mb={4} align="center">
            Hi <strong>{demoRequest?.businessName}</strong>, please pick a new date and time for your personalized demo.
          </Typography>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  name="preferredDate"
                  label="New Preferred Date"
                  value={formData.preferredDate}
                  onChange={handleFormChange}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: new Date().toISOString().split('T')[0] }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  select
                  name="preferredTime"
                  label={fetchingSlots ? "Loading slots..." : `New Preferred Time (${getEasternTzAbbreviation()})`}
                  value={formData.preferredTime}
                  onChange={handleFormChange}
                  disabled={!formData.preferredDate || fetchingSlots}
                >
                  {availableSlots.length > 0 ? (
                    availableSlots.map(slot => (
                      <MenuItem key={slot} value={slot}>{formatSlotLabel(slot, getEasternTzAbbreviation())}</MenuItem>
                    ))
                  ) : (
                    <MenuItem value="" disabled>No slots available</MenuItem>
                  )}
                </TextField>
              </Grid>

              <Grid item xs={12} mt={2}>
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={submitting || !formData.preferredDate || !formData.preferredTime}
                  sx={{ py: 1.5, fontWeight: 'bold' }}
                >
                  {submitting ? 'Submitting...' : 'Confirm New Time'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default RescheduleDemoPage;
