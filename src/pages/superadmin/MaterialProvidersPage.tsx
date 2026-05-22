import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, CircularProgress, IconButton,
  TextField, InputAdornment, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, OutlinedInput,
  Divider, List, ListItem, ListItemText, ListItemSecondaryAction, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CategoryIcon from '@mui/icons-material/Category';
import { materialProvidersAPI, materialCategoriesAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const EMPTY_FORM = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  website: '',
  categories: [] as string[],
  status: 'active',
  notes: '',
};

const MaterialProvidersPage: React.FC = () => {
  // --- providers state ---
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // --- categories state ---
  const [categories, setCategories] = useState<any[]>([]);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [catEditTarget, setCatEditTarget] = useState<any | null>(null);
  const [catDeleteTarget, setCatDeleteTarget] = useState<any | null>(null);
  const [catDeleting, setCatDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await materialCategoriesAPI.list();
      setCategories(res.data || []);
    } catch {
      toast.error('Failed to load categories');
    }
  }, []);

  const load = useCallback(async (p: number, rpp: number, s: string) => {
    setLoading(true);
    try {
      const res = await materialProvidersAPI.list({ page: p + 1, limit: rpp, search: s || undefined });
      setRows(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load material providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, rowsPerPage, search); }, [page, rowsPerPage, search, load]);
  useEffect(() => { loadCategories(); }, [loadCategories]);

  // --- provider actions ---
  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      contactPerson: row.contactPerson || '',
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      website: row.website || '',
      categories: row.categories || [],
      status: row.status || 'active',
      notes: row.notes || '',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (form.phone.length !== 10) newErrors.phone = 'Phone number must be exactly 10 digits';
    else if (/^0{2,}/.test(form.phone)) newErrors.phone = 'Phone number cannot start with multiple zeros';
    else if (/(\d)\1{7,}/.test(form.phone)) newErrors.phone = 'Phone number looks invalid';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await materialProvidersAPI.update(editing._id, form);
        toast.success('Provider updated');
      } else {
        await materialProvidersAPI.create(form);
        toast.success('Provider added');
      }
      setDialogOpen(false);
      load(page, rowsPerPage, search);
    } catch {
      toast.error('Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await materialProvidersAPI.remove(deleteTarget._id);
      toast.success('Provider deleted');
      setDeleteTarget(null);
      load(page, rowsPerPage, search);
    } catch {
      toast.error('Failed to delete provider');
    } finally {
      setDeleting(false);
    }
  };

  const f = (key: keyof typeof form) => (e: any) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  // --- category actions ---
  const openAddCategory = () => {
    setCatEditTarget(null);
    setCatName('');
    setCatDescription('');
  };

  const openEditCategory = (cat: any) => {
    setCatEditTarget(cat);
    setCatName(cat.name || '');
    setCatDescription(cat.description || '');
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) { toast.error('Category name is required'); return; }
    setCatSaving(true);
    try {
      if (catEditTarget) {
        await materialCategoriesAPI.update(catEditTarget._id, { name: catName.trim(), description: catDescription.trim() });
        toast.success('Category updated');
      } else {
        await materialCategoriesAPI.create({ name: catName.trim(), description: catDescription.trim() });
        toast.success('Category added');
      }
      setCatEditTarget(null);
      setCatName('');
      setCatDescription('');
      loadCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!catDeleteTarget) return;
    setCatDeleting(true);
    try {
      await materialCategoriesAPI.remove(catDeleteTarget._id);
      toast.success('Category deleted');
      setCatDeleteTarget(null);
      loadCategories();
    } catch {
      toast.error('Failed to delete category');
    } finally {
      setCatDeleting(false);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" fontWeight="bold">Material Providers</Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<CategoryIcon />}
            onClick={() => setCatDialogOpen(true)}
            sx={{ borderColor: '#d32f2f', color: '#d32f2f', '&:hover': { borderColor: '#b71c1c', bgcolor: 'rgba(211,47,47,0.05)' } }}
          >
            Manage Categories
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAdd}
            sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
          >
            Add Provider
          </Button>
        </Stack>
      </Box>

      {/* Search */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by name, contact, email…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); setSearch(searchInput); } }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setSearchInput(''); setSearch(''); setPage(0); }}>✕</IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
          sx={{ width: 320 }}
        />
        <Button variant="outlined" size="small" onClick={() => { setPage(0); setSearch(searchInput); }}>
          Search
        </Button>
      </Stack>

      {/* Table */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact Person</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Categories</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">No material providers found.</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} sx={{ mt: 2, bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}>
                      Add First Provider
                    </Button>
                  </TableCell>
                </TableRow>
              ) : rows.map((row) => (
                <TableRow key={row._id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                  <TableCell>{row.contactPerson || '-'}</TableCell>
                  <TableCell>{row.phone || '-'}</TableCell>
                  <TableCell>{row.email || '-'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {(row.categories || []).length === 0 ? (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      ) : (row.categories || []).map((c: string) => (
                        <Chip key={c} label={c} size="small" sx={{ fontSize: '0.65rem' }} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.status}
                      size="small"
                      color={row.status === 'active' ? 'success' : 'default'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton size="small" onClick={() => openEdit(row)} color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleteTarget(row)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Paper>

      {/* ---- Add / Edit Provider Dialog ---- */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Provider' : 'Add Material Provider'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField fullWidth label="Name *" value={form.name} onChange={f('name')} error={!!errors.name} helperText={errors.name} />
            <TextField fullWidth label="Contact Person" value={form.contactPerson} onChange={f('contactPerson')} />
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                label="Phone *"
                value={form.phone}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm(prev => ({ ...prev, phone: cleanVal }));
                  setErrors(prev => ({ ...prev, phone: '' }));
                }}
                error={!!errors.phone}
                helperText={errors.phone}
              />
              <TextField fullWidth label="Email" type="email" value={form.email} onChange={f('email')} />
            </Stack>
            <TextField fullWidth label="Address" value={form.address} onChange={f('address')} />
            <TextField fullWidth label="Website" value={form.website} onChange={f('website')} />
            <FormControl fullWidth>
              <InputLabel>Categories</InputLabel>
              <Select
                multiple
                value={form.categories}
                onChange={(e) => setForm(prev => ({ ...prev, categories: typeof e.target.value === 'string' ? [e.target.value] : e.target.value as string[] }))}
                input={<OutlinedInput label="Categories" />}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {(selected as string[]).map((v) => (
                      <Chip key={v} label={v} size="small" />
                    ))}
                  </Stack>
                )}
              >
                {categories.length === 0 ? (
                  <MenuItem disabled>
                    <Typography variant="caption" color="text.secondary">No categories yet — use "Manage Categories" to add</Typography>
                  </MenuItem>
                ) : categories.map((c) => (
                  <MenuItem key={c._id} value={c.name}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={form.status} onChange={f('status')}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="Notes" multiline rows={2} value={form.notes} onChange={f('notes')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}>
            {saving ? <CircularProgress size={18} /> : editing ? 'Save Changes' : 'Add Provider'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Manage Categories Dialog ---- */}
      <Dialog open={catDialogOpen} onClose={() => { setCatDialogOpen(false); setCatEditTarget(null); setCatName(''); setCatDescription(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Categories</DialogTitle>
        <DialogContent>
          {/* Add / Edit inline form */}
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
              {catEditTarget ? 'Edit Category' : 'Add New Category'}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Stack spacing={1.5} flex={1}>
                <TextField
                  size="small"
                  fullWidth
                  label="Category Name *"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCategory(); }}
                />
                <TextField
                  size="small"
                  fullWidth
                  label="Description (optional)"
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                />
              </Stack>
              <Stack spacing={1} sx={{ pt: 0.5 }}>
                <Button
                  variant="contained"
                  onClick={handleSaveCategory}
                  disabled={catSaving || !catName.trim()}
                  sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' }, whiteSpace: 'nowrap', minWidth: 100 }}
                >
                  {catSaving ? <CircularProgress size={16} /> : catEditTarget ? 'Update' : 'Add'}
                </Button>
                {catEditTarget && (
                  <Button variant="outlined" size="small" onClick={openAddCategory}>
                    Cancel Edit
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>

          <Divider sx={{ mb: 1 }} />

          {/* Existing categories list */}
          {categories.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No categories yet. Add your first one above.
            </Typography>
          ) : (
            <List dense disablePadding>
              {categories.map((cat) => (
                <ListItem
                  key={cat._id}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: catEditTarget?._id === cat._id ? 'rgba(211,47,47,0.06)' : 'transparent',
                    border: '1px solid',
                    borderColor: catEditTarget?._id === cat._id ? 'rgba(211,47,47,0.3)' : 'divider',
                  }}
                >
                  <ListItemText
                    primary={cat.name}
                    secondary={cat.description || undefined}
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => openEditCategory(cat)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setCatDeleteTarget(cat)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCatDialogOpen(false); setCatEditTarget(null); setCatName(''); setCatDescription(''); }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Provider Confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Provider</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={18} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Category Confirm */}
      <Dialog open={!!catDeleteTarget} onClose={() => setCatDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Typography>Delete category <strong>{catDeleteTarget?.name}</strong>? Existing providers using this category will keep the value but it won't appear in the dropdown.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteCategory} disabled={catDeleting}>
            {catDeleting ? <CircularProgress size={18} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaterialProvidersPage;
