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
  Menu,
  Tooltip,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
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
  const [rowsPerPage, setRowsPerPage] = useState(12);
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
  // Quick account-status change via the card chip
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [statusMenuTenant, setStatusMenuTenant] = useState<any | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  // Note prompt shown before applying a status change
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteTenant, setNoteTenant] = useState<any | null>(null);
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const ACCOUNT_STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending Approval' },
    { value: 'active', label: 'Active / Approved' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'hold', label: 'On Hold' },
  ];

  // Default, editable note text for each status transition — saves admins from
  // having to type the same explanation for routine approvals/suspensions.
  const getDefaultStatusNote = (tenantName: string, fromStatus: string, toStatus: string): string => {
    const from = fromStatus || 'pending';
    if (toStatus === 'active') {
      return from === 'pending'
        ? `Approved "${tenantName}" after review — account activated.`
        : `Reactivated "${tenantName}" — account set back to active.`;
    }
    if (toStatus === 'suspended') {
      return `Suspended "${tenantName}" account.`;
    }
    if (toStatus === 'hold') {
      return `Placed "${tenantName}" account on hold pending further review.`;
    }
    if (toStatus === 'pending') {
      return `Reverted "${tenantName}" account to pending approval.`;
    }
    return `Changed "${tenantName}" status from ${from} to ${toStatus}.`;
  };

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

  const handleStatusChipClick = (e: React.MouseEvent<HTMLElement>, tenant: any) => {
    e.stopPropagation();
    setStatusMenuTenant(tenant);
    setStatusMenuAnchor(e.currentTarget);
  };

  const handleStatusMenuClose = () => {
    setStatusMenuAnchor(null);
    setStatusMenuTenant(null);
  };

  const handleStatusSelect = (newStatus: string) => {
    const tenant = statusMenuTenant;
    handleStatusMenuClose();
    if (!tenant || newStatus === (tenant.status || 'pending')) return;
    // Require a note for every status change before applying it — pre-filled with a
    // generic, editable reason so routine changes don't need to be typed out each time.
    setNoteTenant(tenant);
    setPendingStatus(newStatus);
    setStatusNote(getDefaultStatusNote(tenant.name, tenant.status, newStatus));
    setNoteDialogOpen(true);
  };

  const closeNoteDialog = () => {
    setNoteDialogOpen(false);
    setNoteTenant(null);
    setPendingStatus('');
    setStatusNote('');
  };

  const confirmStatusUpdate = async () => {
    if (!noteTenant || !statusNote.trim()) return;
    const tenant = noteTenant;
    try {
      setUpdatingStatusId(tenant._id);
      await superAPI.updateTenantSubscription(tenant._id, { status: pendingStatus, statusNote: statusNote.trim() });
      toast.success(`Account status updated to "${pendingStatus}"`);
      closeNoteDialog();
      fetchTenants();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update account status');
    } finally {
      setUpdatingStatusId(null);
    }
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
                        <Tooltip title="Click to copy tenant ID">
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            noWrap
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(tenant._id);
                              toast.success('Tenant ID copied');
                            }}
                            sx={{
                              display: 'block',
                              fontFamily: 'monospace',
                              fontSize: '0.65rem',
                              cursor: 'pointer',
                              '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                            }}
                          >
                            ID: {tenant._id}
                          </Typography>
                        </Tooltip>
                      </Box>
                      <Tooltip title="Click to change account status">
                        <Chip
                          label={tenant.status || 'pending'}
                          color={
                            tenant.status === 'active' ? 'success' :
                            tenant.status === 'pending' ? 'warning' :
                            tenant.status === 'suspended' ? 'error' :
                            tenant.status === 'hold' ? 'error' : 'default'
                          }
                          size="small"
                          clickable
                          disabled={updatingStatusId === tenant._id}
                          onClick={(e) => handleStatusChipClick(e, tenant)}
                          icon={updatingStatusId === tenant._id
                            ? <CircularProgress size={12} sx={{ ml: 0.5, color: 'inherit' }} />
                            : undefined}
                          deleteIcon={<ArrowDropDownIcon />}
                          onDelete={(e) => handleStatusChipClick(e as any, tenant)}
                          sx={{ fontWeight: 'bold', height: 22, fontSize: '0.7rem', textTransform: 'capitalize' }}
                        />
                      </Tooltip>
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
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.65rem', letterSpacing: 0.5 }}>Registered</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {tenant.createdAt
                            ? new Date(tenant.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                            : '—'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.65rem', letterSpacing: 0.5 }}>Activated</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {tenant.activatedAt
                            ? new Date(tenant.activatedAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                            : (tenant.status === 'active' ? 'Active' : 'Not yet')}
                        </Typography>
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

      {/* Quick account-status change menu (opened from the card chip) */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={handleStatusMenuClose}
      >
        {ACCOUNT_STATUS_OPTIONS.map((opt) => (
          <MenuItem
            key={opt.value}
            selected={(statusMenuTenant?.status || 'pending') === opt.value}
            onClick={() => handleStatusSelect(opt.value)}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Menu>

      {/* Note prompt — required for every account-status change */}
      <Dialog open={noteDialogOpen} onClose={closeNoteDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pb: 1 }}>Update Account Status</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Changing <strong>{noteTenant?.name}</strong> status from{' '}
            <Box component="span" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{noteTenant?.status || 'pending'}</Box>{' '}
            to{' '}
            <Box component="span" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{pendingStatus}</Box>.
            Please add a note explaining this change — it will be recorded in the activity log.
          </Typography>
          <TextField
            label="Note"
            placeholder="Reason for this status change..."
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            autoFocus
            required
            error={noteDialogOpen && statusNote.length > 0 && !statusNote.trim()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeNoteDialog} disabled={updatingStatusId === noteTenant?._id}>Cancel</Button>
          <Button
            onClick={confirmStatusUpdate}
            variant="contained"
            disabled={!statusNote.trim() || updatingStatusId === noteTenant?._id}
            startIcon={updatingStatusId === noteTenant?._id ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

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
            {/* Account Status is now changed directly from the store card chip. */}
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
                    {plan.name} ($${Number(plan.price || 0).toFixed(2)}/{plan.interval})
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
