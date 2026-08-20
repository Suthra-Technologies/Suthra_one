import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Inventory2 as InventoryIcon } from '@mui/icons-material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Paper,
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
    useMediaQuery,
    useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { providerPortalAPI, uploadAPI } from '../../services/api';
import { renderUnitOptions } from '../../utils/materialUnits';

const ACCENT = '#00695c';

const HIDE_SCROLLBAR = {
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
    '&::-webkit-scrollbar': { width: 0, height: 0, display: 'none' },
    WebkitOverflowScrolling: 'touch' as const,
};

const EMPTY_FORM = { name: '', unit: '', defaultUnitPrice: '', image: '' };

/**
 * The provider's own catalog, editable.
 *
 * This list is what restaurants pick from when placing an order, and it feeds
 * the superadmin's provider record — so an item added here shows up in both
 * places without anyone re-typing it.
 */
const ProviderMaterialsPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [profile, setProfile] = useState<any | null>(null);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    // Index of the row being edited, or null when adding a new one.
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await providerPortalAPI.profile();
            setProfile(res.data);
            setMaterials(res.data?.materials || []);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load your catalog');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setEditIndex(null);
        setForm({ ...EMPTY_FORM });
        setErrors({});
        setDialogOpen(true);
    };

    const openEdit = (index: number) => {
        const m = materials[index];
        setEditIndex(index);
        setForm({
            name: m.name || '',
            unit: m.unit || '',
            defaultUnitPrice: m.defaultUnitPrice != null ? String(m.defaultUnitPrice) : '',
            image: m.image || '',
        });
        setErrors({});
        setDialogOpen(true);
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // let the same file be re-picked after a failure
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please choose an image file');
            return;
        }
        // The S3 endpoint accepts larger files, but a catalog thumbnail this big
        // is a mistake worth catching before the upload.
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5 MB');
            return;
        }

        setUploading(true);
        try {
            // Filed under platform/providers/material-images/ in S3 — provider
            // catalogs belong to no single restaurant.
            const res = await uploadAPI.uploadImage(file, 'provider-material');
            setForm(prev => ({ ...prev, image: res.data.url }));
            toast.success('Image uploaded');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const validate = () => {
        const next: Record<string, string> = {};
        if (!form.name.trim()) next.name = 'Item name is required';
        if (!form.unit) next.unit = 'Pick a unit';
        const price = form.defaultUnitPrice.trim();
        if (price !== '') {
            const parsed = Number(price);
            if (!Number.isFinite(parsed) || parsed < 0) next.defaultUnitPrice = 'Enter a valid price';
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                unit: form.unit || undefined,
                defaultUnitPrice: form.defaultUnitPrice !== '' ? Number(form.defaultUnitPrice) : undefined,
                image: form.image || undefined,
            };
            const res = editIndex === null
                ? await providerPortalAPI.addMaterial(payload)
                : await providerPortalAPI.updateMaterial(editIndex, payload);
            // The API returns the whole catalog, so the table stays in step
            // without a second round trip.
            setMaterials(res.data || []);
            toast.success(editIndex === null ? 'Item added' : 'Item updated');
            setDialogOpen(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save item');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleteIndex === null) return;
        setDeleting(true);
        try {
            const res = await providerPortalAPI.removeMaterial(deleteIndex);
            setMaterials(res.data || []);
            toast.success('Item removed');
            setDeleteIndex(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to remove item');
        } finally {
            setDeleting(false);
        }
    };

    const f = (key: keyof typeof form) => (e: any) => {
        setForm(prev => ({ ...prev, [key]: e.target.value }));
        setErrors(prev => ({ ...prev, [key]: '' }));
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress sx={{ color: ACCENT }} />
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 1 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>My Materials</Typography>
                    <Typography variant="body2" color="text.secondary">
                        What restaurants can order from you.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openAdd}
                    sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#004d40' } }}
                >
                    Add Material
                </Button>
            </Box>

            {(profile?.categories || []).length > 0 && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2, mt: 1 }}>
                    {profile.categories.map((c: string) => (
                        <Chip key={c} label={c} size="small" sx={{ fontSize: '0.7rem' }} />
                    ))}
                </Stack>
            )}

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', mt: 2 }}>
                <TableContainer sx={{ ...HIDE_SCROLLBAR, overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Price per unit</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {materials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                                        <InventoryIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                                        <Typography color="text.secondary">No materials listed yet.</Typography>
                                        <Button
                                            variant="contained"
                                            startIcon={<AddIcon />}
                                            onClick={openAdd}
                                            sx={{ mt: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#004d40' } }}
                                        >
                                            Add Your First Material
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ) : materials.map((m: any, i: number) => (
                                <TableRow key={i} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Avatar
                                                variant="rounded"
                                                src={m.image || undefined}
                                                sx={{ width: 36, height: 36, bgcolor: 'grey.100', color: 'text.disabled' }}
                                            >
                                                {!m.image && <InventoryIcon fontSize="small" />}
                                            </Avatar>
                                            <span>{m.name}</span>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{m.unit || '—'}</TableCell>
                                    <TableCell align="right">
                                        {m.defaultUnitPrice != null
                                            ? `$${Number(m.defaultUnitPrice).toFixed(2)}${m.unit ? ` / ${m.unit}` : ''}`
                                            : '—'}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                            <Tooltip title="Edit">
                                                <IconButton size="small" onClick={() => openEdit(i)} sx={{ color: ACCENT }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Remove">
                                                <IconButton size="small" color="error" onClick={() => setDeleteIndex(i)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Alert severity="info" sx={{ mt: 2 }}>
                Items you add here appear in the ordering screen for every restaurant on NexZen.
            </Alert>

            {/* ---- Add / Edit ---- */}
            <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="xs" fullWidth fullScreen={isMobile}>
                <DialogTitle>{editIndex === null ? 'Add Material' : 'Edit Material'}</DialogTitle>
                <DialogContent sx={HIDE_SCROLLBAR}>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="Item name *"
                            value={form.name}
                            onChange={f('name')}
                            error={!!errors.name}
                            helperText={errors.name}
                            autoFocus
                        />
                        <TextField
                            select
                            fullWidth
                            label="Unit *"
                            value={form.unit}
                            onChange={f('unit')}
                            error={!!errors.unit}
                            helperText={errors.unit}
                        >
                            {renderUnitOptions()}
                        </TextField>
                        <TextField
                            fullWidth
                            label="Price per unit"
                            type="number"
                            value={form.defaultUnitPrice}
                            onChange={f('defaultUnitPrice')}
                            error={!!errors.defaultUnitPrice}
                            helperText={errors.defaultUnitPrice || 'Optional — shown to restaurants as a guide price'}
                            inputProps={{ min: 0, step: '0.01' }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                endAdornment: form.unit ? (
                                    <InputAdornment position="end">
                                        <Typography variant="caption" color="text.secondary">/ {form.unit}</Typography>
                                    </InputAdornment>
                                ) : null,
                            }}
                        />
                        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
                                Material Photo
                            </Typography>
                            <Avatar
                                variant="rounded"
                                src={form.image || undefined}
                                sx={{ width: 96, height: 96, mx: 'auto', mb: 1.5, bgcolor: 'grey.100', color: 'text.disabled' }}
                            >
                                {!form.image && <PhotoCameraIcon />}
                            </Avatar>
                            <Stack direction="row" spacing={1} justifyContent="center">
                                <Button component="label" size="small" variant="outlined" disabled={uploading}>
                                    {uploading ? 'Uploading…' : form.image ? 'Change' : 'Upload'}
                                    <input hidden type="file" accept="image/*" onChange={handleUploadImage} />
                                </Button>
                                {form.image && !uploading && (
                                    <Button size="small" color="error" onClick={() => setForm(prev => ({ ...prev, image: '' }))}>
                                        Remove
                                    </Button>
                                )}
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)} disabled={saving || uploading}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving || uploading}
                        sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#004d40' } }}
                    >
                        {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : editIndex === null ? 'Add' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ---- Delete confirmation ---- */}
            <Dialog open={deleteIndex !== null} onClose={() => !deleting && setDeleteIndex(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Remove Material</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Remove <strong>{deleteIndex !== null ? materials[deleteIndex]?.name : ''}</strong> from your
                        catalog? Restaurants will no longer be able to order it.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                        Orders already placed are not affected.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteIndex(null)} disabled={deleting}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
                        {deleting ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Remove'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProviderMaterialsPage;
