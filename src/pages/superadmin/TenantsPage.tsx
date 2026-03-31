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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  TablePagination,
  Stack,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Edit as EditIcon, Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { superAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const TenantsPage: React.FC = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalTenants, setTotalTenants] = useState(0);
  const [search, setSearch] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    subscriptionStatus: '',
    trialEndsAt: '',
    subscriptionEndsAt: '',
    autoRenew: true,
    currentPlan: ''
  });

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const [tenantsRes, plansRes] = await Promise.all([
        superAPI.listTenants({ page: page + 1, limit: rowsPerPage, search }),
        superAPI.listPlans()
      ]);
      setTenants(tenantsRes.data.tenants);
      setTotalTenants(tenantsRes.data.total);
      setPlans(plansRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [page, rowsPerPage, search]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEditClick = (tenant: any) => {
    setSelectedTenant(tenant);
    setEditForm({
      subscriptionStatus: tenant.subscriptionStatus,
      trialEndsAt: tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toISOString().split('T')[0] : '',
      subscriptionEndsAt: tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt).toISOString().split('T')[0] : '',
      autoRenew: tenant.autoRenew,
      currentPlan: tenant.currentPlan?._id || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedTenant) return;
    try {
      await superAPI.updateTenantSubscription(selectedTenant._id, editForm);
      toast.success('Tenant updated successfully');
      setEditDialogOpen(false);
      fetchTenants();
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Failed to update tenant');
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        gap: 2
      }}>
        <Typography
          variant="h4"
          sx={{
            textAlign: { xs: 'center', sm: 'left' },
            fontSize: { xs: '1.5rem', sm: '2.125rem' },
            whiteSpace: 'nowrap'
          }}
        >
          Tenant Management
        </Typography>

        <TextField
          label="Search Tenants"
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            endAdornment: <SearchIcon color="action" />
          }}
          sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 300 } }}
        />
      </Box>

      {/* Desktop View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer
          component={Paper}
          sx={{
            overflow: 'auto',
            maxWidth: '100%',
            maxHeight: { xs: 500, sm: 'none' },
            borderRadius: 2,
            boxShadow: 2,
            '&::-webkit-scrollbar': {
              height: '6px',
              width: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.1)',
              borderRadius: '10px',
            }
          }}
        >
          <Table stickyHeader sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper', whiteSpace: 'nowrap' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper', whiteSpace: 'nowrap' }}>Domain</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper', whiteSpace: 'nowrap' }}>Owner</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper', whiteSpace: 'nowrap' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper', whiteSpace: 'nowrap' }}>Plan</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper', whiteSpace: 'nowrap' }}>Subscription</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper', whiteSpace: 'nowrap' }}>Expires</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper', whiteSpace: 'nowrap' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant._id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{tenant.name}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{tenant.slug}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="body2">{tenant.ownerUser?.firstName} {tenant.ownerUser?.lastName}</Typography>
                      <Typography variant="caption" color="textSecondary">{tenant.ownerUser?.email}</Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Chip label={tenant.status} color={tenant.status === 'active' ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {tenant.currentPlan?.name || 'No Plan'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Chip
                        label={tenant.subscriptionStatus}
                        color={tenant.subscriptionStatus === 'active' ? 'primary' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <IconButton onClick={() => handleEditClick(tenant)} size="small">
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalTenants}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box>

      {/* Mobile View */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2}>
            {tenants.map((tenant) => (
              <Card key={tenant._id} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {tenant.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {tenant.slug}
                      </Typography>
                    </Box>
                    <Chip
                      label={tenant.status}
                      color={tenant.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2} mb={2}>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="textSecondary">Owner</Typography>
                      <Box>
                        <Typography variant="body2">{tenant.ownerUser?.firstName} {tenant.ownerUser?.lastName}</Typography>
                        <Typography variant="caption" color="textSecondary">{tenant.ownerUser?.email}</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="textSecondary">Plan</Typography>
                      <Typography variant="body2">{tenant.currentPlan?.name || 'No Plan'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="textSecondary">Subscription</Typography>
                      <Box>
                        <Chip
                          label={tenant.subscriptionStatus}
                          color={tenant.subscriptionStatus === 'active' ? 'primary' : 'warning'}
                          size="small"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="textSecondary">Expires</Typography>
                      <Typography variant="body2">{tenant.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt).toLocaleDateString() : 'N/A'}</Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ mb: 2 }} />

                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => handleEditClick(tenant)}
                    fullWidth
                    variant="outlined"
                    size="small"
                  >
                    Edit Subscription
                  </Button>
                </CardContent>
              </Card>
            ))}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalTenants}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Stack>
        )}
      </Box>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle sx={{ m: 0, p: 2, pr: 6, position: 'relative' }}>
          Edit Subscription: {selectedTenant?.name}
          <IconButton
            aria-label="close"
            onClick={() => setEditDialogOpen(false)}
            size="small"
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
              bgcolor: 'error.main',
              '&:hover': {
                bgcolor: 'error.dark',
              },
              width: 24,
              height: 24,
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: { xs: '100%', sm: 300 } }}>
            <FormControl fullWidth>
              <InputLabel>Current Plan</InputLabel>
              <Select
                value={editForm.currentPlan}
                label="Current Plan"
                onChange={(e) => setEditForm({ ...editForm, currentPlan: e.target.value })}
              >
                <MenuItem value="">No Plan</MenuItem>
                {plans.map((plan) => (
                  <MenuItem key={plan._id} value={plan._id}>
                    {plan.name} (${plan.price}/{plan.interval})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Subscription Status</InputLabel>
              <Select
                value={editForm.subscriptionStatus}
                label="Subscription Status"
                onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
              >
                <MenuItem value="trial">Trial</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Trial Ends At"
              type="date"
              value={editForm.trialEndsAt}
              onChange={(e) => setEditForm({ ...editForm, trialEndsAt: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Subscription Ends At"
              type="date"
              value={editForm.subscriptionEndsAt}
              onChange={(e) => setEditForm({ ...editForm, subscriptionEndsAt: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Auto Renew</InputLabel>
              <Select
                value={editForm.autoRenew ? 'true' : 'false'}
                label="Auto Renew"
                onChange={(e) => setEditForm({ ...editForm, autoRenew: e.target.value === 'true' })}
              >
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantsPage;
