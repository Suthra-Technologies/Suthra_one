import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, CircularProgress, IconButton,
  TextField, InputAdornment, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, OutlinedInput,
  Divider, List, ListItem, ListItemText, ListItemSecondaryAction, Tooltip,
  Avatar, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CategoryIcon from '@mui/icons-material/Category';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { materialProvidersAPI, materialCategoriesAPI, uploadAPI } from '../../services/api';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { toast } from 'react-hot-toast';
import { TableSkeleton } from '../../components/common/PageSkeleton';

const EMPTY_FORM = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  address1: '',
  street: '',
  city: '',
  state: '',
  country: '',
  zipcode: '',
  website: '',
  categories: [] as string[],
  status: 'active',
  notes: '',
  logo: '',
  materialImage: '',
  materials: [] as { name: string; unit: string; defaultUnitPrice: string }[],
};

const MaterialProvidersPage: React.FC = () => {
  // Google Maps key for address autocomplete — sourced from the frontend .env (VITE_GOOGLE_MAPS_API_KEY).
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
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
      address1: row.address1 || '',
      street: row.street || '',
      city: row.city || '',
      state: row.state || '',
      country: row.country || '',
      zipcode: row.zipcode || '',
      website: row.website || '',
      categories: row.categories || [],
      status: row.status || 'active',
      notes: row.notes || '',
      logo: row.logo || '',
      materialImage: row.materialImage || '',
      materials: (row.materials || []).map((m: any) => ({
        name: m.name || '',
        unit: m.unit || '',
        defaultUnitPrice: m.defaultUnitPrice != null ? String(m.defaultUnitPrice) : '',
      })),
    });
    setErrors({});
    setDialogOpen(true);
  };

  const addMaterial = () => {
    setForm(prev => ({ ...prev, materials: [...prev.materials, { name: '', unit: '', defaultUnitPrice: '' }] }));
  };

  const updateMaterial = (index: number, key: 'name' | 'unit' | 'defaultUnitPrice', value: string) => {
    setForm(prev => ({
      ...prev,
      materials: prev.materials.map((m, i) => i === index ? { ...m, [key]: value } : m),
    }));
  };

  const removeMaterial = (index: number) => {
    setForm(prev => ({ ...prev, materials: prev.materials.filter((_, i) => i !== index) }));
  };

  const handleUploadImage = async (field: 'logo' | 'materialImage', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    const loadingToast = toast.loading('Uploading image...');
    try {
      const res = await uploadAPI.uploadImage(file, 'provider');
      setForm(prev => ({ ...prev, [field]: res.data.url }));
      toast.success('Image uploaded');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      toast.dismiss(loadingToast);
    }
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
      const combinedAddress = [
        form.address1.trim(),
        form.street.trim(),
        form.city.trim(),
        form.state.trim(),
        form.country.trim(),
        form.zipcode.trim()
      ].filter(Boolean).join(', ');

      const payload = {
        ...form,
        address: combinedAddress,
        materials: form.materials
          .filter(m => m.name.trim())
          .map(m => ({
            name: m.name.trim(),
            unit: m.unit.trim() || undefined,
            defaultUnitPrice: m.defaultUnitPrice !== '' ? parseFloat(m.defaultUnitPrice) : undefined,
          })),
      };

      if (editing) {
        await materialProvidersAPI.update(editing._id, payload);
        toast.success('Provider updated');
      } else {
        await materialProvidersAPI.create(payload);
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

  if (loading && rows.length === 0) {
    return <TableSkeleton rows={8} columns={7} />;
  }

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
              {rows.length === 0 ? (
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
            <AddressAutocomplete
              label="Address 1"
              value={form.address1}
              apiKey={googleMapsApiKey}
              onChange={(val) => setForm(prev => ({ ...prev, address1: val }))}
              onSelect={(addr) => setForm(prev => ({
                ...prev,
                address1: addr.fullAddress || addr.street || prev.address1,
                street: addr.street || prev.street,
                city: addr.city || prev.city,
                state: addr.state || prev.state,
                country: addr.country || prev.country,
                zipcode: addr.zipCode || prev.zipcode,
              }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="Street" value={form.street} onChange={f('street')} />
              <TextField fullWidth label="City" value={form.city} onChange={f('city')} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="State" value={form.state} onChange={f('state')} />
              <TextField fullWidth label="Country" value={form.country} onChange={f('country')} />
              <TextField fullWidth label="Zip Code" value={form.zipcode} onChange={f('zipcode')} />
            </Stack>
            <TextField fullWidth label="Website" value={form.website} onChange={f('website')} />
            <Autocomplete
              multiple
              freeSolo
              options={categories.map((c: any) => c.name)}
              value={form.categories}
              onChange={(_e, val) => setForm(prev => ({
                ...prev,
                categories: (val as string[]).map(v => v.trim()).filter(Boolean),
              }))}
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} size="small" {...getTagProps({ index })} key={`${option}-${index}`} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Categories"
                  placeholder="Select or type a custom item name"
                  helperText='Pick from the list or type your own and press Enter'
                />
              )}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={form.status} onChange={f('status')}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="Notes" multiline rows={2} value={form.notes} onChange={f('notes')} />

            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary" fontWeight={700}>MATERIALS SUPPLIED</Typography>
            </Divider>
            <Typography variant="caption" color="text.secondary">
              These items will appear in the "Item" dropdown when a restaurant receives an order from this provider.
            </Typography>
            <Stack spacing={1.5}>
              {form.materials.map((m, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                  <TextField
                    size="small"
                    label="Item name"
                    value={m.name}
                    onChange={(e) => updateMaterial(i, 'name', e.target.value)}
                    sx={{ flex: '2 1 160px' }}
                  />
                  <TextField
                    size="small"
                    label="Unit"
                    placeholder="kg"
                    value={m.unit}
                    onChange={(e) => updateMaterial(i, 'unit', e.target.value)}
                    sx={{ flex: '0 1 90px' }}
                  />
                  <TextField
                    size="small"
                    label="Default price"
                    type="number"
                    value={m.defaultUnitPrice}
                    onChange={(e) => updateMaterial(i, 'defaultUnitPrice', e.target.value)}
                    inputProps={{ min: 0, step: 'any' }}
                    sx={{ flex: '0 1 110px' }}
                  />
                  <IconButton size="small" color="error" onClick={() => removeMaterial(i)} sx={{ mt: 0.5 }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={addMaterial} sx={{ alignSelf: 'flex-start' }}>
                Add material
              </Button>
            </Stack>

            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary" fontWeight={700}>IMAGES</Typography>
            </Divider>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {([
                { field: 'logo' as const, label: 'Company / Brand Logo' },
                { field: 'materialImage' as const, label: 'Material Image' },
              ]).map(({ field, label }) => (
                <Box key={field} sx={{ flex: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>{label}</Typography>
                  <Avatar
                    variant="rounded"
                    src={form[field] || undefined}
                    sx={{ width: 84, height: 84, mx: 'auto', mb: 1, bgcolor: 'grey.100', color: 'text.disabled' }}
                  >
                    {!form[field] && <PhotoCameraIcon />}
                  </Avatar>
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Button component="label" size="small" variant="outlined">
                      {form[field] ? 'Change' : 'Upload'}
                      <input hidden type="file" accept="image/*" onChange={(e) => handleUploadImage(field, e)} />
                    </Button>
                    {form[field] && (
                      <Button size="small" color="error" onClick={() => setForm(prev => ({ ...prev, [field]: '' }))}>
                        Remove
                      </Button>
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
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
