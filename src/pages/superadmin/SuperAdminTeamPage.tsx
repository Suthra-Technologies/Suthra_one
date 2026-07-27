import {
  Add as AddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Shield as ShieldIcon,
  Star as StarIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
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
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { superAPI } from '../../services/api';

// These must match the @RequirePermissions keys in superadmin.controller.ts
const AVAILABLE_MODULES = [
  { key: 'stores', label: 'Stores', description: 'View and manage all restaurant tenants' },
  { key: 'plans', label: 'Subscription Plans', description: 'Create, edit, and delete subscription plans' },
  { key: 'invoices', label: 'Invoices', description: 'View and manage platform invoices' },
  { key: 'tickets', label: 'Support Tickets', description: 'View and respond to support tickets' },
  { key: 'demo_requests', label: 'Demo Requests', description: 'Handle demo scheduling and confirmation' },
  { key: 'delivery', label: 'Delivery Reports', description: 'View delivery analytics across stores' },
  { key: 'logs', label: 'System Logs', description: 'Access SMS, email, activity, and audit logs' },
  { key: 'settings', label: 'Settings', description: 'Manage platform-wide settings' },
  { key: 'team', label: 'Team Management', description: 'Add and manage superadmin team members' },
];

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isActive: boolean;
  isRootAdmin: boolean;
  permissions: Array<{ module: string; actions: string[] }>;
  roles?: string[];
  createdAt?: string;
  lastLogin?: string;
}

const defaultForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  permissions: [] as Array<{ module: string; actions: string[] }>,
  roles: ['superadmin'] as string[],
};

// Each role implies access to its own module, so selecting the role enables it automatically
const ROLE_REQUIRED_MODULE: Record<string, string> = {
  sales_admin: 'demo_requests',
  support_admin: 'tickets',
};

// Names: letters plus the separators that appear in real names (space, hyphen, apostrophe)
const sanitizeName = (value: string) => value.replace(/[^a-zA-Z\s'-]/g, '').slice(0, 50);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

const SuperAdminTeamPage: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // History Dialog States
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState<TeamMember | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isCurrentUserRoot = (user as any)?.isRootAdmin;
  const canViewLogs = isCurrentUserRoot || (user as any)?.permissions?.some((p: any) => p.module === 'logs');

  const fetchUserLogs = async (email: string) => {
    try {
      setHistoryLoading(true);
      const res = await superAPI.getAdminLogs({ performedBy: email, limit: 100 });
      setHistoryLogs(res.data.logs || []);
    } catch (err) {
      toast.error('Failed to load activity logs for this member');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = (member: TeamMember) => {
    setHistoryUser(member);
    setHistoryLogs([]);
    setHistoryOpen(true);
    fetchUserLogs(member.email);
  };

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAPI.listTeam();
      setMembers(res.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleOpenCreate = () => {
    setEditing(null);
    // Mirror the role the Select shows by default, along with the module it implies
    setForm({
      ...defaultForm,
      roles: ['superadmin', 'sales_admin'],
      permissions: [{ module: ROLE_REQUIRED_MODULE.sales_admin, actions: ['full'] }],
    });
    setShowPassword(false);
    setDialogOpen(true);
  };

  const handleOpenEdit = (member: TeamMember) => {
    setEditing(member);
    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      password: '',
      phone: member.phone || '',
      permissions: member.permissions || [],
      roles: member.roles || ['superadmin'],
    });
    setShowPassword(false);
    setDialogOpen(true);
  };

  const isModuleEnabled = (moduleKey: string) => {
    return form.permissions.some(p => p.module === moduleKey);
  };

  const toggleModule = (moduleKey: string) => {
    if (isModuleEnabled(moduleKey)) {
      setForm(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p.module !== moduleKey),
      }));
    } else {
      setForm(prev => ({
        ...prev,
        permissions: [...prev.permissions, { module: moduleKey, actions: ['full'] }],
      }));
    }
  };

  const handleSave = async () => {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();

    if (!firstName || !lastName || !email) {
      toast.error('First name, last name, and email are required');
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (form.phone && form.phone.length < 10) {
      toast.error('Phone number must be at least 10 digits');
      return;
    }
    if (!editing && !form.password) {
      toast.error('Password is required for new team members');
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        const updateData: any = {
          firstName,
          lastName,
          phone: form.phone,
          permissions: form.permissions,
          roles: form.roles,
        };
        if (form.password) updateData.password = form.password;
        await superAPI.updateTeamMember(editing._id, updateData);
        toast.success('Team member updated successfully');
      } else {
        await superAPI.createTeamMember({ ...form, firstName, lastName, email });
        toast.success('Team member created successfully');
      }
      setDialogOpen(false);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save team member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!memberToDelete) return;
    try {
      await superAPI.deleteTeamMember(memberToDelete._id);
      toast.success('Team member removed successfully');
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete team member');
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    try {
      await superAPI.updateTeamMember(member._id, { isActive: !member.isActive });
      toast.success(`${member.firstName} is now ${!member.isActive ? 'active' : 'deactivated'}`);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldIcon color="error" /> Team Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage superadmin team members and their module access permissions
          </Typography>
        </Box>
        {isCurrentUserRoot && (
          <Button
            variant="contained"
            color="error"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Add Team Member
          </Button>
        )}
      </Box>

      {!isCurrentUserRoot && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Only the Root Admin can manage team members. You can view the team list but cannot make changes.
        </Alert>
      )}

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="error" />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#d32f2f', 0.04) }}>
                <TableCell sx={{ fontWeight: 700 }}>Member</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Permissions</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Last Login</TableCell>
                {(isCurrentUserRoot || canViewLogs) && <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member._id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: member.isRootAdmin ? 'error.main' : alpha('#d32f2f', 0.15), width: 36, height: 36 }}>
                        {member.isRootAdmin ? <StarIcon sx={{ fontSize: 18 }} /> : <PersonIcon sx={{ fontSize: 18, color: 'error.main' }} />}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {member.firstName} {member.lastName}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.3 }}>
                          {member.isRootAdmin && (
                            <Chip label="Root Admin" size="small" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />
                          )}
                          {!member.isRootAdmin && member.roles?.includes('sales_admin') && (
                            <Chip label="Sales Admin" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                          )}
                          {!member.isRootAdmin && member.roles?.includes('support_admin') && (
                            <Chip label="Support Admin" size="small" color="secondary" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                          )}
                          {/* {!member.isRootAdmin && !member.roles?.includes('sales_admin') && !member.roles?.includes('support_admin') && (
                            <Chip label="General Admin" size="small" color="default" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                          )} */}
                        </Stack>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{member.email}</Typography>
                  </TableCell>
                  <TableCell>
                    {member.isRootAdmin ? (
                      <Chip label="Full Access" size="small" color="error" variant="outlined" />
                    ) : member.permissions?.length ? (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {member.permissions.map((p) => {
                          const mod = AVAILABLE_MODULES.find(m => m.key === p.module);
                          return (
                            <Chip
                              key={p.module}
                              label={mod?.label || p.module}
                              size="small"
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem', mb: 0.3 }}
                            />
                          );
                        })}
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.disabled">No permissions</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={member.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={member.isActive ? 'success' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {member.lastLogin ? new Date(member.lastLogin).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                    </Typography>
                  </TableCell>
                  {(isCurrentUserRoot || canViewLogs) && (
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                        {canViewLogs && (
                          <Tooltip title="View Action History">
                            <IconButton size="small" color="primary" onClick={() => handleOpenHistory(member)}>
                              <HistoryIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {isCurrentUserRoot && !member.isRootAdmin && (
                          <>
                            <Tooltip title={member.isActive ? 'Deactivate' : 'Activate'}>
                              <Switch
                                size="small"
                                checked={member.isActive}
                                onChange={() => handleToggleActive(member)}
                                color="error"
                              />
                            </Tooltip>
                            <Tooltip title="Edit Permissions">
                              <IconButton size="small" onClick={() => handleOpenEdit(member)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove">
                              <IconButton size="small" color="error" onClick={() => { setMemberToDelete(member); setDeleteDialogOpen(true); }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">No team members found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
          <Typography variant="h6" fontWeight={700}>
            {editing ? 'Edit Team Member' : 'Add Team Member'}
          </Typography>
          <IconButton onClick={() => setDialogOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                label="First Name" fullWidth size="small" required
                inputProps={{ maxLength: 50 }}
                value={form.firstName}
                onChange={e => setForm(prev => ({ ...prev, firstName: sanitizeName(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Last Name" fullWidth size="small" required
                inputProps={{ maxLength: 50 }}
                value={form.lastName}
                onChange={e => setForm(prev => ({ ...prev, lastName: sanitizeName(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email" fullWidth size="small" required
                type="email"
                inputProps={{ maxLength: 100 }}
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value.replace(/\s/g, '').toLowerCase() }))}
                disabled={!!editing}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Phone" fullWidth size="small"
                type="tel"
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 }}
                value={form.phone}
                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 15) }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label={editing ? 'New Password (optional)' : 'Password'}
                fullWidth size="small"
                type={showPassword ? 'text' : 'password'}
                required={!editing}
                value={form.password}
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel id="role-select-label">Team Member Role</InputLabel>
                <Select
                  labelId="role-select-label"
                  label="Team Member Role"
                  value={form.roles?.includes('sales_admin') ? 'sales_admin' : (form.roles?.includes('support_admin') ? 'support_admin' : 'superadmin')}
                  onChange={e => {
                    const val = e.target.value;
                    let rolesArray = ['superadmin'];
                    if (val === 'sales_admin') rolesArray = ['superadmin', 'sales_admin'];
                    else if (val === 'support_admin') rolesArray = ['superadmin', 'support_admin'];
                    const requiredModule = ROLE_REQUIRED_MODULE[val];
                    setForm(prev => {
                      // Drop the module implied by the previous role, then enable the new one,
                      // so switching roles swaps the module instead of accumulating both
                      const previousRoleModules = (prev.roles || [])
                        .map(role => ROLE_REQUIRED_MODULE[role])
                        .filter(m => m && m !== requiredModule);
                      const permissions = prev.permissions.filter(p => !previousRoleModules.includes(p.module));
                      if (requiredModule && !permissions.some(p => p.module === requiredModule)) {
                        permissions.push({ module: requiredModule, actions: ['full'] });
                      }
                      return { ...prev, roles: rolesArray, permissions };
                    });
                  }}
                >
                  {/* <MenuItem value="superadmin">General Admin</MenuItem> */}
                  <MenuItem value="sales_admin">Sales Admin</MenuItem>
                  <MenuItem value="support_admin">Support Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Module Access Permissions
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Toggle which modules this team member can access. Unassigned modules will be hidden from their sidebar and API requests will be blocked.
          </Typography>

          <Grid container spacing={1.5}>
            {AVAILABLE_MODULES.map((mod) => (
              <Grid item xs={12} sm={6} key={mod.key}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 2,
                    borderColor: isModuleEnabled(mod.key) ? 'error.main' : 'divider',
                    bgcolor: isModuleEnabled(mod.key) ? alpha('#d32f2f', 0.03) : 'transparent',
                    cursor: 'pointer',
                    minHeight: 64,
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: 'error.light', bgcolor: alpha('#d32f2f', 0.02) },
                  }}
                  onClick={() => toggleModule(mod.key)}
                >
                  <Box sx={{ pr: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{mod.label}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                      {mod.description}
                    </Typography>
                  </Box>
                  <Switch
                    checked={isModuleEnabled(mod.key)}
                    color="error"
                    size="small"
                    onClick={e => e.stopPropagation()}
                    onChange={() => toggleModule(mod.key)}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSave}
            disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            {saving ? 'Saving...' : editing ? 'Update Member' : 'Create Member'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Remove Team Member?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to remove <strong>{memberToDelete?.firstName} {memberToDelete?.lastName}</strong> ({memberToDelete?.email}) from the superadmin team? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} sx={{ textTransform: 'none' }}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, pt: 2.5 }}>
          <Stack>
            <Typography variant="h6" fontWeight="bold">Action History</Typography>
            <Typography variant="caption" color="text.secondary">
              Activity log for {historyUser?.firstName} {historyUser?.lastName} ({historyUser?.email})
            </Typography>
          </Stack>
          <IconButton onClick={() => setHistoryOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress color="error" />
            </Box>
          ) : historyLogs.length === 0 ? (
            <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No actions recorded for this member.</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Module</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Target</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Details</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Date & Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyLogs.map((log) => (
                    <TableRow key={log._id} hover>
                      <TableCell>
                        <Chip
                          label={log.module}
                          size="small"
                          variant="outlined"
                          color={
                            log.module === 'SUPERADMIN_TEAM' ? 'error' :
                            log.module === 'STORE' ? 'primary' :
                            log.module === 'PLAN' ? 'secondary' :
                            log.module === 'TICKET' ? 'warning' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          color={
                            log.action === 'MEMBER_CREATED' || log.action === 'CREATED' ? 'success' :
                            log.action === 'MEMBER_DELETED' || log.action === 'DELETED' ? 'error' :
                            log.action === 'MEMBER_UPDATED' || log.action === 'UPDATED' ? 'warning' : 'default'
                          }
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {log.targetName || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setHistoryOpen(false)} variant="contained" color="error" sx={{ textTransform: 'none', borderRadius: 2 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminTeamPage;
