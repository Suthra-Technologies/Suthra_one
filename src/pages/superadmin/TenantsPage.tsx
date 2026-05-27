import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
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
import { Edit as EditIcon, Search as SearchIcon, Close as CloseIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { superAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
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
    currentPlan: '',
    status: ''
  });

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const [tenantsRes, plansRes] = await Promise.all([
        superAPI.listTenants({ page: page + 1, limit: rowsPerPage, search }),
        superAPI.listPlansPublic()
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
      currentPlan: tenant.currentPlan?._id || '',
      status: tenant.status || 'pending'
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
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: { xs: 1.5, sm: 3 }, pt: { xs: 0.5, sm: 3 } }}>
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
          Stores Management
        </Typography>

        <TextField
          label="Search Stores"
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

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {tenants.map((tenant) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={tenant._id}>
                <Card 
                  elevation={2} 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderRadius: 3,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 2, pb: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                      <Box sx={{ overflow: 'hidden', mr: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold" noWrap title={tenant.name} sx={{ lineHeight: 1.2 }}>
                          {tenant.name}
                        </Typography>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }} noWrap>
                          {tenant.slug}
                        </Typography>
                      </Box>
                      <Chip
                        label={tenant.status || 'pending'}
                        color={
                          tenant.status === 'active' ? 'success' :
                          tenant.status === 'pending' ? 'warning' :
                          tenant.status === 'suspended' ? 'error' :
                          tenant.status === 'hold' ? 'error' : 'default'
                        }
                        size="small"
                        sx={{ fontWeight: 'bold', height: 22, fontSize: '0.7rem', textTransform: 'capitalize' }}
                      />
                    </Box>

                    <Divider sx={{ mb: 1.5, borderStyle: 'dashed' }} />

                    <Box mb={1.5}>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.65rem', letterSpacing: 0.5, mb: 0.25 }}>
                        Owner
                      </Typography>
                      {tenant.ownerUser ? (
                        <>
                          <Typography variant="body2" fontWeight={600} noWrap title={`${tenant.ownerUser?.firstName} ${tenant.ownerUser?.lastName}`} sx={{ lineHeight: 1.2 }}>
                            {tenant.ownerUser?.firstName} {tenant.ownerUser?.lastName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" noWrap title={tenant.ownerUser?.email} sx={{ display: 'block' }}>
                            {tenant.ownerUser?.email}
                          </Typography>
                          {tenant.ownerUser?.phone && (
                            <Typography variant="caption" color="textSecondary" noWrap title={tenant.ownerUser?.phone} sx={{ display: 'block' }}>
                              {tenant.ownerUser?.phone}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" color="textSecondary" fontStyle="italic">No Owner</Typography>
                      )}
                    </Box>

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.65rem', letterSpacing: 0.5 }}>Plan</Typography>
                        <Typography variant="body2" fontWeight={600} noWrap>{tenant.currentPlan?.name || 'No Plan'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.65rem', letterSpacing: 0.5 }}>Subscription</Typography>
                        <Box mt={0.25}>
                          <Chip
                            label={tenant.subscriptionStatus}
                            color={tenant.subscriptionStatus === 'active' ? 'primary' : 'warning'}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                          />
                        </Box>
                      </Grid>
                      {tenant.subscriptionEndsAt && (
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.65rem', letterSpacing: 0.5 }}>Expires</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {new Date(tenant.subscriptionEndsAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>

                  <Divider />
                  
                  <Box p={1.5} bgcolor="rgba(0,0,0,0.01)">
                    <Stack direction="row" spacing={1}>
                      <Button
                        startIcon={<VisibilityIcon fontSize="small" />}
                        fullWidth
                        variant="outlined"
                        size="small"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 0.5 }}
                        onClick={() => navigate(`/superadmin/tenants/${tenant._id}`, { state: { tenant } })}
                      >
                        Details
                      </Button>
                      <Button
                        startIcon={<EditIcon fontSize="small" />}
                        onClick={() => handleEditClick(tenant)}
                        fullWidth
                        variant="contained"
                        size="small"
                        disableElevation
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, py: 0.5 }}
                      >
                        Manage
                      </Button>
                    </Stack>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Box display="flex" justifyContent="center" mt={4} mb={2}>
            <Paper elevation={1} sx={{ borderRadius: 2 }}>
              <TablePagination
                rowsPerPageOptions={[6, 12, 24, 48]}
                component="div"
                count={totalTenants}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
          </Box>
        </>
      )}

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
              <InputLabel>Account Status</InputLabel>
              <Select
                value={editForm.status}
                label="Account Status"
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <MenuItem value="pending">Pending Approval</MenuItem>
                <MenuItem value="active">Active / Approved</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="hold">On Hold</MenuItem>
              </Select>
            </FormControl>

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
