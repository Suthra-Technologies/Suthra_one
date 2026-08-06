import {
    Add as AddIcon,
    ArrowDownward as ArrowDownIcon,
    ArrowUpward as ArrowUpIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    LocalFireDepartment as FireIcon,
    Star as StarIcon,
} from '@mui/icons-material';
import {
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    Grid,
    IconButton,
    Paper,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { menuAPI, spiceLevelSetsAPI } from '../../services/api';
import type { SpiceLevel, SpiceLevelSet } from './types';

interface SpiceLevelSetsPageProps {
    hideHeader?: boolean;
}

const emptyForm = {
    name: '',
    description: '',
    levels: [] as SpiceLevel[],
    isDefault: false,
    isActive: true,
};

/** "Very Hot" -> "very_hot"; the stable key stored on orders. */
const toValue = (label: string) => label.trim().toLowerCase().replace(/[\s-]+/g, '_');

const SpiceLevelSetsPage: React.FC<SpiceLevelSetsPageProps> = ({ hideHeader = false }) => {
    const [sets, setSets] = useState<SpiceLevelSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingSet, setEditingSet] = useState<SpiceLevelSet | null>(null);
    const [formData, setFormData] = useState({ ...emptyForm });
    const [submitting, setSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

    // Bulk assignment
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [assignTarget, setAssignTarget] = useState<SpiceLevelSet | null>(null);
    const [assignSelection, setAssignSelection] = useState<any[]>([]);
    const [assigning, setAssigning] = useState(false);

    // Details view: the items currently using a set
    const [detailsTarget, setDetailsTarget] = useState<SpiceLevelSet | null>(null);
    const [detailsItems, setDetailsItems] = useState<any[]>([]);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    /** Set to reopen in the details dialog once the add dialog closes. */
    const [returnToDetails, setReturnToDetails] = useState<SpiceLevelSet | null>(null);

    const fetchSets = async () => {
        try {
            setLoading(true);
            const response = await spiceLevelSetsAPI.getAll();
            setSets(response.data);
        } catch (error) {
            toast.error('Failed to fetch spice level sets');
        } finally {
            setLoading(false);
        }
    };

    // Items carry the spiceLevelSet they belong to, which is what pre-selects the
    // assign dialog — so this must be re-fetched after an assign, not just once.
    const fetchMenuItems = async () => {
        try {
            const res = await menuAPI.getAll({ limit: 1000 });
            const data = res.data;
            setMenuItems(Array.isArray(data) ? data : (data?.items || []));
        } catch {
            /* the dialog still works, it just cannot pre-select */
        }
    };

    useEffect(() => {
        fetchSets();
        fetchMenuItems();
    }, []);

    const handleOpenDialog = (set?: SpiceLevelSet) => {
        if (set) {
            setEditingSet(set);
            setFormData({
                name: set.name,
                description: set.description || '',
                levels: set.levels ? set.levels.map(l => ({ ...l })) : [],
                isDefault: !!set.isDefault,
                isActive: set.isActive !== false,
            });
        } else {
            setEditingSet(null);
            setFormData({ ...emptyForm, levels: [] });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingSet(null);
    };

    const handleAddLevel = () => {
        setFormData(prev => ({
            ...prev,
            levels: [...prev.levels, { value: '', label: '', description: '' }],
        }));
    };

    const handleRemoveLevel = (index: number) => {
        setFormData(prev => {
            const levels = [...prev.levels];
            levels.splice(index, 1);
            return { ...prev, levels };
        });
    };

    const handleLevelChange = (index: number, field: keyof SpiceLevel, value: string) => {
        setFormData(prev => {
            const levels = [...prev.levels];
            levels[index] = { ...levels[index], [field]: value };
            // The key follows the label until the level has been saved once —
            // after that it is frozen so existing orders keep resolving.
            if (field === 'label' && !editingSet) {
                levels[index].value = toValue(value);
            }
            return { ...prev, levels };
        });
    };

    // Order matters: levels render mild -> hottest wherever they are shown.
    const handleMoveLevel = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        setFormData(prev => {
            if (target < 0 || target >= prev.levels.length) return prev;
            const levels = [...prev.levels];
            [levels[index], levels[target]] = [levels[target], levels[index]];
            return { ...prev, levels };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        if (!formData.name.trim()) {
            toast.error('Set name is required');
            return;
        }
        if (formData.levels.length === 0) {
            toast.error('Add at least one spice level');
            return;
        }
        if (formData.levels.some(level => !level.label.trim())) {
            toast.error('Every spice level needs a label');
            return;
        }

        const levels = formData.levels.map(level => ({
            value: (level.value || toValue(level.label)).trim(),
            label: level.label.trim(),
            description: (level.description || '').trim(),
        }));

        const duplicate = levels.find((level, i) => levels.findIndex(l => l.value === level.value) !== i);
        if (duplicate) {
            toast.error(`Duplicate spice level "${duplicate.label}"`);
            return;
        }

        const payload = { ...formData, name: formData.name.trim(), levels };

        try {
            setSubmitting(true);
            if (editingSet) {
                await spiceLevelSetsAPI.update(editingSet._id, payload);
                toast.success('Spice level set updated');
            } else {
                await spiceLevelSetsAPI.create(payload);
                toast.success('Spice level set created');
            }
            handleCloseDialog();
            fetchSets();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to save spice level set');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (isDeleting || !confirmDelete.id) return;
        try {
            setIsDeleting(true);
            await spiceLevelSetsAPI.delete(confirmDelete.id);
            toast.success('Spice level set deleted');
            fetchSets();
        } catch (error: any) {
            // The API refuses to delete a set still used by menu items.
            toast.error(error?.response?.data?.message || 'Failed to delete spice level set');
        } finally {
            setIsDeleting(false);
            setConfirmDelete({ open: false, id: null });
        }
    };

    /** The set an item currently belongs to, whether populated or a raw id. */
    const itemSetId = (item: any) =>
        typeof item.spiceLevelSet === 'object' ? item.spiceLevelSet?._id : item.spiceLevelSet;

    /**
     * Only items without a set can be added. Offering one that belongs to another
     * set would silently move it, so reassigning is a deliberate two-step: remove
     * it from its current set, then add it here.
     */
    const assignableItems = menuItems.filter(item => !itemSetId(item));

    // Add-only: the dialog starts empty and offers just the items not already
    // in this set. Removal lives in the details dialog.
    const handleOpenAssign = (set: SpiceLevelSet) => {
        setAssignTarget(set);
        setAssignSelection([]);
    };

    /** Closes the add dialog, returning to the details view if it came from there. */
    const handleCloseAssign = () => {
        setAssignTarget(null);
        setAssignSelection([]);
        if (returnToDetails) {
            setDetailsTarget(returnToDetails);
            setReturnToDetails(null);
        }
    };

    const loadDetailsItems = async (set: SpiceLevelSet) => {
        try {
            setDetailsLoading(true);
            const res = await spiceLevelSetsAPI.getMenuItems(set._id);
            setDetailsItems(res.data);
        } catch {
            toast.error('Failed to load items for this set');
            setDetailsItems([]);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleOpenDetails = (set: SpiceLevelSet) => {
        setDetailsTarget(set);
        loadDetailsItems(set);
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!detailsTarget || removingId) return;
        try {
            setRemovingId(itemId);
            await spiceLevelSetsAPI.unassign(detailsTarget._id, [itemId]);
            setDetailsItems(prev => prev.filter(item => item._id !== itemId));
            await Promise.all([fetchSets(), fetchMenuItems()]);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to remove item');
        } finally {
            setRemovingId(null);
        }
    };

    const handleAssign = async () => {
        if (!assignTarget || assigning) return;
        try {
            setAssigning(true);
            const res = await spiceLevelSetsAPI.assign(assignTarget._id, assignSelection.map(item => item._id));
            toast.success(`Applied to ${res.data.updated} menu item(s)`);
            setAssignTarget(null);
            // Leave nothing selected — the applied items now belong to the set and
            // are listed in its details dialog, not here.
            setAssignSelection([]);
            await Promise.all([fetchSets(), fetchMenuItems()]);
            // Came from the details dialog — go back to it, now showing the additions.
            if (returnToDetails) {
                setDetailsTarget(returnToDetails);
                setReturnToDetails(null);
                await loadDetailsItems(returnToDetails);
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to assign spice level set');
        } finally {
            setAssigning(false);
        }
    };

    return (
        <Box sx={{ p: hideHeader ? 0 : 3 }}>
            <Box display="flex" justifyContent={hideHeader ? 'flex-end' : 'space-between'} alignItems="center" mb={3}>
                {!hideHeader && (
                    <Box>
                        <Typography variant="h4" fontWeight="bold">Spice Level Sets</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Create reusable spice scales and apply them to the menu items that share them.
                        </Typography>
                    </Box>
                )}
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ borderRadius: 2 }}>
                    Create Spice Set
                </Button>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
            ) : sets.length === 0 ? (
                <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3, bgcolor: 'grey.50', border: '1px dashed', borderColor: 'divider' }}>
                    <FireIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No spice level sets configured</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Different dishes can offer different spice scales. Create a set to get started.
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                        Create First Spice Set
                    </Button>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {sets.map(set => (
                        <Grid item xs={12} sm={6} md={4} key={set._id}>
                            <Card
                                onClick={() => handleOpenDetails(set)}
                                sx={{ height: '100%', borderRadius: 3, cursor: 'pointer', transition: '0.3s', '&:hover': { boxShadow: 4 } }}
                            >
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="h6" fontWeight="bold" noWrap>{set.name}</Typography>
                                            {set.description && (
                                                <Typography variant="body2" color="text.secondary" noWrap>{set.description}</Typography>
                                            )}
                                        </Box>
                                        {/* Stop propagation so these never trigger the card's details dialog. */}
                                        <Box sx={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                            <IconButton size="small" color="primary" onClick={() => handleOpenDialog(set)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={() => setConfirmDelete({ open: true, id: set._id })}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>

                                    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                                        {set.isDefault && (
                                            <Tooltip title="Used when an item enables spice levels without picking a set">
                                                <Chip size="small" color="warning" icon={<StarIcon />} label="Default" />
                                            </Tooltip>
                                        )}
                                        <Chip size="small" variant="outlined" label={`${set.menuItemCount ?? 0} item(s)`} />
                                    </Stack>

                                    <Divider sx={{ mb: 1.5 }} />

                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                        {(set.levels || []).map((level, index) => (
                                            <Tooltip key={level.value} title={level.description || ''}>
                                                <Chip
                                                    size="small"
                                                    label={level.label}
                                                    icon={<FireIcon />}
                                                    sx={{
                                                        // Deepen the colour as the scale climbs.
                                                        bgcolor: `rgba(211, 47, 47, ${0.08 + (index / Math.max(set.levels.length - 1, 1)) * 0.28})`,
                                                    }}
                                                />
                                            </Tooltip>
                                        ))}
                                    </Stack>

                                    <Button
                                        size="small"
                                        sx={{ mt: 2 }}
                                        onClick={e => { e.stopPropagation(); handleOpenAssign(set); }}
                                    >
                                        Add menu items
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Create / edit dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <form onSubmit={handleSubmit}>
                    <DialogTitle>{editingSet ? 'Edit Spice Level Set' : 'Create Spice Level Set'}</DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2}>
                            <TextField
                                label="Set name"
                                placeholder="e.g. Indian Spice"
                                fullWidth
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                            <TextField
                                label="Description"
                                placeholder="Where this scale applies"
                                fullWidth
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />

                            <Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Levels (mildest first)
                                    </Typography>
                                    <Button size="small" startIcon={<AddIcon />} onClick={handleAddLevel}>Add level</Button>
                                </Box>

                                {formData.levels.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                        No levels yet — add at least one.
                                    </Typography>
                                ) : (
                                    <Stack spacing={1}>
                                        {formData.levels.map((level, index) => (
                                            <Paper key={index} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Stack>
                                                        <IconButton size="small" disabled={index === 0} onClick={() => handleMoveLevel(index, -1)}>
                                                            <ArrowUpIcon fontSize="inherit" />
                                                        </IconButton>
                                                        <IconButton size="small" disabled={index === formData.levels.length - 1} onClick={() => handleMoveLevel(index, 1)}>
                                                            <ArrowDownIcon fontSize="inherit" />
                                                        </IconButton>
                                                    </Stack>
                                                    <TextField
                                                        label="Label"
                                                        size="small"
                                                        required
                                                        value={level.label}
                                                        onChange={e => handleLevelChange(index, 'label', e.target.value)}
                                                        sx={{ flex: 1 }}
                                                    />
                                                    <TextField
                                                        label="Description"
                                                        size="small"
                                                        value={level.description || ''}
                                                        onChange={e => handleLevelChange(index, 'description', e.target.value)}
                                                        sx={{ flex: 1.4 }}
                                                    />
                                                    <IconButton size="small" color="error" onClick={() => handleRemoveLevel(index)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                                {editingSet && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ pl: 6 }}>
                                                        key: {level.value || toValue(level.label)}
                                                    </Typography>
                                                )}
                                            </Paper>
                                        ))}
                                    </Stack>
                                )}
                            </Box>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.isDefault}
                                        onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body2">Use as default set</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Applied when an item enables spice levels without picking a set.
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button type="submit" variant="contained" disabled={submitting}>
                            {submitting ? 'Saving…' : editingSet ? 'Save changes' : 'Create'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Bulk assign dialog */}
            <Dialog open={!!assignTarget} onClose={handleCloseAssign} maxWidth="sm" fullWidth>
                <DialogTitle>Add menu items to “{assignTarget?.name}”</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Only items without a spice level set are listed. To move an item from another
                        set, remove it there first.
                    </Typography>
                    {assignableItems.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                            Every menu item already belongs to a spice level set.
                        </Typography>
                    )}
                    <Autocomplete
                        multiple
                        // A set can cover dozens of items; show a couple of chips
                        // and collapse the rest into "+N" so the field stays compact.
                        limitTags={2}
                        options={assignableItems}
                        value={assignSelection}
                        onChange={(_, value) => setAssignSelection(value)}
                        getOptionLabel={option => option.name || ''}
                        isOptionEqualToValue={(option, value) => option._id === value._id}
                        getLimitTagsText={more => `+${more}`}
                        renderInput={params => (
                            <TextField
                                {...params}
                                label="Menu items"
                                placeholder={assignSelection.length > 0 ? '' : 'Search items'}
                            />
                        )}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAssign}>Cancel</Button>
                    <Button variant="contained" onClick={handleAssign} disabled={assigning || assignSelection.length === 0}>
                        {assigning ? 'Applying…' : 'Apply'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Set details: the levels, and the items currently using them */}
            <Dialog open={!!detailsTarget} onClose={() => setDetailsTarget(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pr: 6 }}>
                    {detailsTarget?.name}
                    {detailsTarget?.description && (
                        <Typography variant="body2" color="text.secondary">{detailsTarget.description}</Typography>
                    )}
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Levels
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1, mb: 2.5 }}>
                        {(detailsTarget?.levels || []).map(level => (
                            <Tooltip key={level.value} title={level.description || ''}>
                                <Chip size="small" icon={<FireIcon />} label={level.label} />
                            </Tooltip>
                        ))}
                    </Stack>

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Menu items ({detailsItems.length})
                        </Typography>
                        <Button
                            size="small"
                            startIcon={<AddIcon />}
                            // Hand off to the add dialog rather than stacking the two;
                            // handleAssign reopens this one when it finishes.
                            onClick={() => {
                                if (!detailsTarget) return;
                                setDetailsTarget(null);
                                setReturnToDetails(detailsTarget);
                                handleOpenAssign(detailsTarget);
                            }}
                        >
                            Add items
                        </Button>
                    </Box>

                    {detailsLoading ? (
                        <Box display="flex" justifyContent="center" p={3}><CircularProgress size={28} /></Box>
                    ) : detailsItems.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            No menu items use this set yet.
                        </Typography>
                    ) : (
                        <>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                            Removing an item turns off spice selection for it until it is added to another set.
                        </Typography>
                        <Stack spacing={1}>
                            {detailsItems.map(item => (
                                <Paper key={item._id} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                                            {item.name}
                                        </Typography>
                                        <Tooltip title="Remove from this set">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    disabled={removingId === item._id}
                                                    onClick={() => handleRemoveItem(item._id)}
                                                >
                                                    {removingId === item._id
                                                        ? <CircularProgress size={16} />
                                                        : <DeleteIcon fontSize="small" />}
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            if (!detailsTarget) return;
                            const set = detailsTarget;
                            setDetailsTarget(null);
                            handleOpenDialog(set);
                        }}
                    >
                        Edit set
                    </Button>
                    <Button variant="contained" onClick={() => setDetailsTarget(null)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, id: null })} maxWidth="xs" fullWidth>
                <DialogTitle>Delete spice level set?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Sets still used by menu items cannot be deleted. Reassign those items first.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete({ open: false, id: null })}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={isDeleting}>
                        {isDeleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SpiceLevelSetsPage;
