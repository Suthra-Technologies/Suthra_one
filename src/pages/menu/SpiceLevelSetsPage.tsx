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
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
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
    useMediaQuery,
    useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { menuAPI, spiceLevelSetsAPI } from '../../services/api';
import type { SpiceLevel, SpiceLevelSet } from './types';
import { CardGridSkeleton } from '../../components/common/PageSkeleton';

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

/**
 * Scrollable multi-column checkbox list of menu items. Used by both the "add
 * items" and "set details" dialogs so they select and lay out identically.
 */
const ItemPickList: React.FC<{
    items: any[];
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
    emptyText?: string;
}> = ({ items, selectedIds, onToggle, emptyText = 'No items match your search.' }) => {
    if (items.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                {emptyText}
            </Typography>
        );
    }

    return (
        <Box
            sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                maxHeight: { xs: '45vh', sm: '42vh' },
                overflowY: 'auto',
                display: 'grid',
                // Hundreds of items in one column means endless scrolling.
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(3, minmax(0, 1fr))',
                },
            }}
        >
            {items.map(item => (
                <Box
                    key={item._id}
                    onClick={() => onToggle(item._id)}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1,
                        py: 0.5,
                        minWidth: 0,
                        cursor: 'pointer',
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                    }}
                >
                    <Checkbox size="small" checked={selectedIds.has(item._id)} sx={{ flexShrink: 0 }} />
                    <Typography variant="body2" noWrap title={item.name}>
                        {item.name}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

const SpiceLevelSetsPage: React.FC<SpiceLevelSetsPageProps> = ({ hideHeader = false }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [sets, setSets] = useState<SpiceLevelSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingSet, setEditingSet] = useState<SpiceLevelSet | null>(null);
    const [formData, setFormData] = useState({ ...emptyForm });
    const [submitting, setSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

    // Bulk assignment. Selection is a set of ids so it survives search changes.
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [assignTarget, setAssignTarget] = useState<SpiceLevelSet | null>(null);
    const [assignSelectedIds, setAssignSelectedIds] = useState<Set<string>>(new Set());
    const [assignSearch, setAssignSearch] = useState('');
    const [assigning, setAssigning] = useState(false);

    // Details view: the items currently using a set
    const [detailsTarget, setDetailsTarget] = useState<SpiceLevelSet | null>(null);
    const [detailsItems, setDetailsItems] = useState<any[]>([]);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsSelectedIds, setDetailsSelectedIds] = useState<Set<string>>(new Set());
    const [detailsSearch, setDetailsSearch] = useState('');
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

    const matchesSearch = (item: any, term: string) =>
        !term.trim() || (item.name || '').toLowerCase().includes(term.trim().toLowerCase());

    const filteredAssignableItems = assignableItems.filter(item => matchesSearch(item, assignSearch));
    const filteredDetailsItems = detailsItems.filter(item => matchesSearch(item, detailsSearch));

    const toggleId = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string) => {
        setter(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleAssignItem = toggleId(setAssignSelectedIds);
    const toggleDetailsItem = toggleId(setDetailsSelectedIds);

    // Add-only: the dialog starts empty and offers just the items not already
    // in this set. Removal lives in the details dialog.
    const handleOpenAssign = (set: SpiceLevelSet) => {
        setAssignTarget(set);
        setAssignSelectedIds(new Set());
        setAssignSearch('');
    };

    /** Closes the add dialog, returning to the details view if it came from there. */
    const handleCloseAssign = () => {
        setAssignTarget(null);
        setAssignSelectedIds(new Set());
        setAssignSearch('');
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
        setDetailsSelectedIds(new Set());
        setDetailsSearch('');
        loadDetailsItems(set);
    };

    const handleRemoveSelected = async () => {
        if (!detailsTarget || removingId || detailsSelectedIds.size === 0) return;
        const ids = [...detailsSelectedIds];
        try {
            setRemovingId('bulk');
            const res = await spiceLevelSetsAPI.unassign(detailsTarget._id, ids);
            toast.success(`Removed ${res.data.updated} item(s) from this set`);
            setDetailsItems(prev => prev.filter(item => !detailsSelectedIds.has(item._id)));
            setDetailsSelectedIds(new Set());
            await Promise.all([fetchSets(), fetchMenuItems()]);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to remove items');
        } finally {
            setRemovingId(null);
        }
    };

    const handleAssign = async () => {
        if (!assignTarget || assigning) return;
        try {
            setAssigning(true);
            const res = await spiceLevelSetsAPI.assign(assignTarget._id, [...assignSelectedIds]);
            toast.success(`Applied to ${res.data.updated} menu item(s)`);
            setAssignTarget(null);
            // Leave nothing selected — the applied items now belong to the set and
            // are listed in its details dialog, not here.
            setAssignSelectedIds(new Set());
            setAssignSearch('');
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
        <Box sx={{ p: hideHeader ? 0 : { xs: 1.5, sm: 3 } }}>
            <Box
                display="flex"
                flexDirection={{ xs: 'column', sm: 'row' }}
                justifyContent={hideHeader ? 'flex-end' : 'space-between'}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                gap={1.5}
                mb={3}
            >
                {!hideHeader && (
                    <Box>
                        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">Spice Level Sets</Typography>
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
                <CardGridSkeleton count={6} cardHeight={260} />
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
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
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
                                                    {/* Side by side on desktop; stacked on mobile so neither
                                                        field is squeezed to a few characters wide. */}
                                                    <Stack
                                                        direction={{ xs: 'column', sm: 'row' }}
                                                        spacing={1}
                                                        sx={{ flex: 1, minWidth: 0 }}
                                                    >
                                                        <TextField
                                                            label="Label"
                                                            size="small"
                                                            required
                                                            value={level.label}
                                                            onChange={e => handleLevelChange(index, 'label', e.target.value)}
                                                            sx={{ flex: 1, minWidth: 0 }}
                                                        />
                                                        <TextField
                                                            label="Description"
                                                            size="small"
                                                            value={level.description || ''}
                                                            onChange={e => handleLevelChange(index, 'description', e.target.value)}
                                                            sx={{ flex: 1.4, minWidth: 0 }}
                                                        />
                                                    </Stack>
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
            <Dialog open={!!assignTarget} onClose={handleCloseAssign} maxWidth="md" fullWidth fullScreen={isMobile}>
                <DialogTitle>Add menu items to “{assignTarget?.name}”</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Only items without a spice level set are listed. To move an item from another
                        set, remove it there first.
                    </Typography>
                    {assignableItems.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                            Every menu item already belongs to a spice level set.
                        </Typography>
                    ) : (
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="caption" color="text.secondary">
                                {assignSelectedIds.size} of {assignableItems.length} selected
                            </Typography>
                            <Box>
                                {/* Acts on what is currently visible, so searching then
                                    selecting all is a fast way to pick a whole group. */}
                                <Button
                                    size="small"
                                    onClick={() => setAssignSelectedIds(prev =>
                                        new Set([...prev, ...filteredAssignableItems.map(i => i._id)]))}
                                >
                                    {assignSearch.trim() ? 'Select all shown' : 'Select all'}
                                </Button>
                                <Button
                                    size="small"
                                    color="inherit"
                                    disabled={assignSelectedIds.size === 0}
                                    onClick={() => setAssignSelectedIds(new Set())}
                                >
                                    Clear
                                </Button>
                            </Box>
                        </Box>
                    )}
                    {/* A plain search + checkbox list rather than an Autocomplete:
                        Autocomplete ties the selection to its input, so clearing the
                        search text also cleared what had been ticked. */}
                    <TextField
                        fullWidth
                        size="small"
                        label="Search items"
                        value={assignSearch}
                        onChange={e => setAssignSearch(e.target.value)}
                        sx={{ mb: 1.5 }}
                    />
                    <ItemPickList
                        items={filteredAssignableItems}
                        selectedIds={assignSelectedIds}
                        onToggle={toggleAssignItem}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAssign}>Cancel</Button>
                    <Button variant="contained" onClick={handleAssign} disabled={assigning || assignSelectedIds.size === 0}>
                        {assigning ? 'Applying…' : `Apply${assignSelectedIds.size > 0 ? ` (${assignSelectedIds.size})` : ''}`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Set details: the levels, and the items currently using them */}
            <Dialog open={!!detailsTarget} onClose={() => setDetailsTarget(null)} maxWidth="md" fullWidth fullScreen={isMobile}>
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
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                                Removing an item turns off spice selection for it until it is added to another set.
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                label="Search items"
                                value={detailsSearch}
                                onChange={e => setDetailsSearch(e.target.value)}
                                sx={{ mb: 1.5 }}
                            />
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="caption" color="text.secondary">
                                    {detailsSelectedIds.size} selected
                                </Typography>
                                <Box>
                                    <Button
                                        size="small"
                                        onClick={() => setDetailsSelectedIds(prev =>
                                            new Set([...prev, ...filteredDetailsItems.map(i => i._id)]))}
                                    >
                                        {detailsSearch.trim() ? 'Select all shown' : 'Select all'}
                                    </Button>
                                    <Button
                                        size="small"
                                        color="inherit"
                                        disabled={detailsSelectedIds.size === 0}
                                        onClick={() => setDetailsSelectedIds(new Set())}
                                    >
                                        Clear
                                    </Button>
                                </Box>
                            </Box>
                            <ItemPickList
                                items={filteredDetailsItems}
                                selectedIds={detailsSelectedIds}
                                onToggle={toggleDetailsItem}
                            />
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
                    <Box sx={{ flex: 1 }} />
                    {detailsSelectedIds.size > 0 && (
                        <Button
                            color="error"
                            startIcon={removingId ? <CircularProgress size={16} /> : <DeleteIcon />}
                            disabled={!!removingId}
                            onClick={handleRemoveSelected}
                        >
                            Remove ({detailsSelectedIds.size})
                        </Button>
                    )}
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
