import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Inventory2 as InventoryIcon } from '@mui/icons-material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CollectionsIcon from '@mui/icons-material/Collections';
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

const EMPTY_FORM = { name: '', unit: '', defaultUnitPrice: '', images: [] as string[] };
const MAX_IMAGES = 10;

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
        setForm({ ...EMPTY_FORM, images: [] });
        setErrors({});
        setDialogOpen(true);
    };

    const openEdit = (index: number) => {
        const m = materials[index];
        setEditIndex(index);
        // Backward compat: if only `image` exists, seed the images array from it
        let imgs = Array.isArray(m.images) && m.images.length > 0
            ? [...m.images]
            : m.image ? [m.image] : [];
        setForm({
            name: m.name || '',
            unit: m.unit || '',
            defaultUnitPrice: m.defaultUnitPrice != null ? String(m.defaultUnitPrice) : '',
            images: imgs,
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
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5 MB');
            return;
        }
        if (form.images.length >= MAX_IMAGES) {
            toast.error(`Maximum ${MAX_IMAGES} images allowed`);
            return;
        }

        setUploading(true);
        try {
            const res = await uploadAPI.uploadImage(file, 'provider-material');
            setForm(prev => ({ ...prev, images: [...prev.images, res.data.url] }));
            toast.success('Image uploaded');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (idx: number) => {
        setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
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
                // Keep backward compat: `image` = first photo
                image: form.images.length > 0 ? form.images[0] : undefined,
                images: form.images.length > 0 ? form.images : undefined,
            };
            const res = editIndex === null
                ? await providerPortalAPI.addMaterial(payload)
                : await providerPortalAPI.updateMaterial(editIndex, payload);
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
                            ) : materials.map((m: any, i: number) => {
                                const thumb = (Array.isArray(m.images) && m.images.length > 0) ? m.images[0] : m.image;
                                const imgCount = (Array.isArray(m.images) ? m.images.length : 0) || (m.image ? 1 : 0);
                                return (
                                <TableRow key={i} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                                <Avatar
                                                    variant="rounded"
                                                    src={thumb || undefined}
                                                    sx={{ width: 36, height: 36, bgcolor: 'grey.100', color: 'text.disabled' }}
                                                >
                                                    {!thumb && <InventoryIcon fontSize="small" />}
                                                </Avatar>
                                                {imgCount > 1 && (
                                                    <Box sx={{
                                                        position: 'absolute', bottom: -4, right: -4,
                                                        bgcolor: ACCENT, color: '#fff', borderRadius: '50%',
                                                        width: 18, height: 18, display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700,
                                                        border: '2px solid #fff',
                                                    }}>
                                                        {imgCount}
                                                    </Box>
                                                )}
                                            </Box>
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
                            );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Alert severity="info" sx={{ mt: 2 }}>
                Items you add here appear in the ordering screen for every restaurant on Suthra One.
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
                        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <CollectionsIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        Material Photos
                                    </Typography>
                                </Stack>
                                <Typography variant="caption" color="text.disabled">
                                    {form.images.length} / {MAX_IMAGES}
                                </Typography>
                            </Stack>
                            {form.images.length > 0 && (
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                                    gap: 1,
                                    mb: 1.5,
                                }}>
                                    {form.images.map((url, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{
                                                position: 'relative',
                                                borderRadius: 1.5,
                                                overflow: 'hidden',
                                                aspectRatio: '1',
                                                border: idx === 0 ? `2px solid ${ACCENT}` : '1px solid',
                                                borderColor: idx === 0 ? ACCENT : 'divider',
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src={url}
                                                alt={`Material image ${idx + 1}`}
                                                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                            />
                                            {idx === 0 && (
                                                <Box sx={{
                                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                                    bgcolor: 'rgba(0,105,92,0.85)', color: '#fff',
                                                    fontSize: '0.6rem', textAlign: 'center', py: 0.2,
                                                    fontWeight: 600, letterSpacing: 0.5,
                                                }}>
                                                    PRIMARY
                                                </Box>
                                            )}
                                            <IconButton
                                                size="small"
                                                onClick={() => removeImage(idx)}
                                                sx={{
                                                    position: 'absolute', top: 2, right: 2,
                                                    bgcolor: 'rgba(0,0,0,0.55)', color: '#fff',
                                                    width: 20, height: 20,
                                                    '&:hover': { bgcolor: 'error.main' },
                                                }}
                                            >
                                                <CloseIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                            {form.images.length === 0 && (
                                <Box sx={{ textAlign: 'center', py: 2 }}>
                                    <PhotoCameraIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 0.5 }} />
                                    <Typography variant="body2" color="text.disabled">
                                        No images yet
                                    </Typography>
                                </Box>
                            )}
                            <Stack direction="row" spacing={1} justifyContent="center">
                                <Button
                                    component="label"
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    disabled={uploading || form.images.length >= MAX_IMAGES}
                                >
                                    {uploading ? 'Uploading…' : 'Add Image'}
                                    <input hidden type="file" accept="image/*" onChange={handleUploadImage} />
                                </Button>
                                {form.images.length > 0 && !uploading && (
                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={() => setForm(prev => ({ ...prev, images: [] }))}
                                    >
                                        Remove All
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
