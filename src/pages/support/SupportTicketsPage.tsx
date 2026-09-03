import React, { useEffect, useState } from 'react';
import { Container, Paper, Box, Typography, Button, TextField, Chip, Divider, List, ListItem, ListItemText } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { supportAPI } from '../../services/api';

interface Ticket {
  _id: string;
  subject: string;
  status: string;
  priority: string;
  updatedAt: string;
  messages?: { message: string }[];
}

const SupportTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await supportAPI.listTickets({ page: 1, limit: 20 });
      setTickets(res.data?.data || res.data || []);
    } catch (e) {
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const createTicket = async () => {
    if (!newSubject || !newMessage) return;
    setCreating(true);
    try {
      await supportAPI.createTicket({ subject: newSubject, message: newMessage });
      setNewSubject('');
      setNewMessage('');
      fetchTickets();
    } catch {
      setError('Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Support Tickets</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Create Ticket</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Subject" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth multiline minRows={3} label="Message" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button variant="contained" onClick={createTicket} disabled={creating || !newSubject || !newMessage}>
              Submit
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>My Tenant Tickets</Typography>
        {loading ? (
          <Typography>Loading...</Typography>
        ) : tickets.length === 0 ? (
          <Typography color="text.secondary">No tickets yet</Typography>
        ) : (
          <List>
            {tickets.map(t => (
              <React.Fragment key={t._id}>
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={t.subject}
                    secondary={
                      <>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                          <Chip size="small" label={t.status} />
                          <Chip size="small" label={`Priority: ${t.priority}`} />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(t.updatedAt).toLocaleString()}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {t.messages?.[t.messages.length - 1]?.message || '—'}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default SupportTicketsPage;
