import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Inventory as InventoryIcon,
    Link as LinkIcon,
    LinkOff as LinkOffIcon,
    PlaylistAdd as PlaylistAddIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import {
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Switch,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { inventoryAPI, menuAPI, modifierTemplatesAPI } from '../../services/api';
import type { ModifierGroupTemplate } from './types';

interface AddOnGroupsPageProps {
    hideHeader?: boolean;
}

const AddOnGroupsPage: React.FC<AddOnGroupsPageProps> = ({ hideHeader = false }) => {
    const [templates, setTemplates] = useState<ModifierGroupTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ModifierGroupTemplate | null>(null);
    const [formData, setFormData] = useState<Partial<ModifierGroupTemplate>>({
        name: '',
        menuItems: [],
        selectionType: 'single',
        required: false,
        options: [],
        isActive: true,
    });
    const [submitting, setSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });

    // Inventory & Menu Items for linking
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await modifierTemplatesAPI.getAll();
            setTemplates(response.data);
        } catch (error) {
            toast.error('Failed to fetch add-on groups');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
        // Fetch inventory & menu items for linking dropdowns with a high limit to ensure searchability
        inventoryAPI.getAll().then(res => {
            const data = res.data;
            const items = Array.isArray(data) ? data : (data?.items || []);
            setInventoryItems(items);
        }).catch(() => {});

        menuAPI.getAll({ limit: 1000 }).then(res => {
            const data = res.data;
            const items = Array.isArray(data) ? data : (data?.items || []);
            setMenuItems(items);
        }).catch(() => {});
    }, []);

    const handleOpenDialog = (template?: ModifierGroupTemplate) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                name: template.name,
                menuItems: (template.menuItems as any) || [],
                selectionType: template.selectionType,
                required: template.required,
                options: template.options ? [...template.options] : [],
                isActive: template.isActive,
            });
        } else {
            setEditingTemplate(null);
            setFormData({
                name: '',
                menuItems: [],
                selectionType: 'single',
                required: false,
                options: [],
                isActive: true,
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingTemplate(null);
    };

    const handleAddOption = () => {
        setFormData({
            ...formData,
            options: [...(formData.options || []), { name: '', price: 0, qty: 1, isDefault: false }]
        });
    };

    const handleRemoveOption = (index: number) => {
        const newOptions = [...(formData.options || [])];
        newOptions.splice(index, 1);
        setFormData({ ...formData, options: newOptions });
    };

    const handleOptionChange = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const newOptions = [...(prev.options || [])];
            newOptions[index] = { ...newOptions[index], [field]: value };

            // If setting default and single selection, unset others
            if (field === 'isDefault' && value === true && prev.selectionType === 'single') {
                newOptions.forEach((opt, i) => {
                    if (i !== index) opt.isDefault = false;
                });
            }

            return { ...prev, options: newOptions };
        });
    };

    // Batch multiple field changes in one setState to avoid race conditions
    const handleOptionChangeMulti = (index: number, changes: Record<string, any>) => {
        setFormData(prev => {
            const newOptions = [...(prev.options || [])];
            newOptions[index] = { ...newOptions[index], ...changes };
            return { ...prev, options: newOptions };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        if (submitting) return;
        e.preventDefault();

        // Validation
        if (!formData.name || !formData.name.trim()) {
            toast.error('Add-on group name is required');
            return;
        }
        if (!formData.menuItems || formData.menuItems.length === 0) {
            toast.error('Link at least one menu item');
            return;
        }
        if (!formData.options || formData.options.length === 0) {
            toast.error('Add at least one option');
            return;
        }
        if (formData.options.some(opt => !opt.name.trim())) {
            toast.error('All options must have a name');
            return;
        }

        const payload = { ...formData, name: formData.name.trim() };

        try {
            setSubmitting(true);
            if (editingTemplate) {
                await modifierTemplatesAPI.update(editingTemplate._id, payload);
                toast.success('Add-on group updated');
            } else {
                await modifierTemplatesAPI.create(payload);
                toast.success('Add-on group created');
            }
            handleCloseDialog();
            fetchTemplates();
        } catch (error) {
            toast.error('Failed to save add-on group');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (isDeleting || !confirmDelete.id) return;
        try {
            setIsDeleting(true);
            await modifierTemplatesAPI.delete(confirmDelete.id);
            toast.success('Add-on group deleted');
            fetchTemplates();
        } catch (error) {
            toast.error('Failed to delete add-on group');
        } finally {
            setIsDeleting(false);
            setConfirmDelete({ open: false, id: null });
        }
    };

    return (
        <Box sx={{ p: hideHeader ? 0 : 3 }}>
            <Box display="flex" justifyContent={hideHeader ? "flex-end" : "space-between"} alignItems="center" mb={3}>
                {!hideHeader && (
                    <Box>
                        <Typography variant="h4" fontWeight="bold">
                            Global Add-on Groups
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Create reusable modifier groups that can be linked to multiple menu items.
                        </Typography>
                    </Box>
                )}
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{ borderRadius: 2 }}
                >
                    Create Add on
                </Button>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
            ) : templates.length === 0 ? (
                <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3, bgcolor: 'grey.50', border: '1px dashed', borderColor: 'divider' }}>
                    <PlaylistAddIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No add-on groups configured</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Create your first global add-on group to reuse across your menu.
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                        Create First Add on
                    </Button>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {templates.map((template) => (
                        <Grid item xs={12} sm={6} md={4} key={template._id}>
                            <Card sx={{ height: '100%', borderRadius: 3, transition: '0.3s', '&:hover': { boxShadow: 4 } }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                        <Typography variant="h6" fontWeight="bold">
                                            {template.name}
                                        </Typography>
                                        <Box>
                                            <IconButton size="small" onClick={() => handleOpenDialog(template)} color="primary">
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => setConfirmDelete({ open: true, id: template._id })} color="error">
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>

                                    <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                                        <Chip
                                            label={template.selectionType === 'single' ? 'Single' : 'Multiple'}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                        {template.required && (
                                            <Chip label="Required" size="small" color="secondary" variant="outlined" />
                                        )}
                                        {(template.menuItems?.length || 0) > 0 && (
                                            <Chip
                                                label={`${template.menuItems!.length} menu item${template.menuItems!.length === 1 ? '' : 's'}`}
                                                size="small"
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>

                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Options ({template.options?.length || 0}):
                                    </Typography>
                                    <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                                        {(template.options || []).map((opt, i) => (
                                            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    • {opt.name}{opt.isDefault ? ' (Default)' : ''}
                                                    {(opt.linkedMenuItem || opt.linkedInventoryItem) && (
                                                        <Chip icon={<InventoryIcon />} label={opt.linkedMenuItem ? 'Recipe' : 'Raw'} size="small" sx={{ height: 18, fontSize: 10 }} color={opt.linkedMenuItem ? 'primary' : 'success'} variant="outlined" />
                                                    )}
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600}>${opt.price.toFixed(2)}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <form onSubmit={handleSubmit}>
                    <DialogTitle>
                        {editingTemplate ? 'Edit Add-on Group' : 'Create Add-on Group'}
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
                            One group can offer multiple side dish options, linked to one or more menu items
                        </Typography>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Add-on Group Name"
                                    placeholder="e.g. Choose a Side Dish"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    helperText="A group can offer several side dish options below — customers may pick one or more."
                                    sx={{ mb: 1 }}
                                />
                                <Autocomplete
                                    multiple
                                    fullWidth
                                    options={menuItems}
                                    getOptionLabel={(item: any) => item.name || ''}
                                    isOptionEqualToValue={(opt, val) => opt._id === val?._id}
                                    value={menuItems.filter((m: any) => (formData.menuItems || []).includes(m._id))}
                                    onChange={(_e, val: any[]) => setFormData({ ...formData, menuItems: val.map(v => v._id) })}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Linked Menu Items" required placeholder="Search menu items..." />
                                    )}
                                    sx={{ mb: 2 }}
                                />
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <FormControl fullWidth>
                                            <InputLabel>Selection Type</InputLabel>
                                            <Select
                                                value={formData.selectionType}
                                                label="Selection Type"
                                                onChange={(e) => setFormData({ ...formData, selectionType: e.target.value as any })}
                                            >
                                                <MenuItem value="single">Single (Radio)</MenuItem>
                                                <MenuItem value="multiple">Multiple (Checkbox)</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={6} display="flex" alignItems="center">
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={formData.required}
                                                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                                                />
                                            }
                                            label="Required"
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>

                            <Grid item xs={12}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography variant="subtitle2" fontWeight="bold">Side Dish Options</Typography>
                                    <Button size="small" startIcon={<AddIcon />} onClick={handleAddOption}>
                                        Add Option
                                    </Button>
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                                <Box sx={{ maxHeight: 420, overflowY: 'auto', pr: 1 }}>
                                    {(formData.options || []).map((option, index) => (
                                        <Paper key={index} variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
                                            {/* Row 1: Name, Qty (serving amount), Price, Default, Delete */}
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                                <TextField
                                                    size="small"
                                                    placeholder="Side dish name"
                                                    value={option.name}
                                                    onChange={(e) => handleOptionChange(index, 'name', e.target.value)}
                                                    sx={{ flex: 2 }}
                                                />
                                                <Tooltip title="Quantity given to the customer for this option">
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        placeholder="Qty"
                                                        value={option.qty ?? 1}
                                                        onChange={(e) => handleOptionChange(index, 'qty', parseFloat(e.target.value) || 1)}
                                                        sx={{ flex: 1 }}
                                                        InputProps={{ inputProps: { min: 0.01, step: 0.1 } }}
                                                    />
                                                </Tooltip>
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    placeholder="Price"
                                                    value={option.price}
                                                    onChange={(e) => handleOptionChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                    sx={{ flex: 1 }}
                                                    InputProps={{ startAdornment: '$' }}
                                                />
                                                <Tooltip title="Set as default">
                                                    <Switch
                                                        size="small"
                                                        checked={option.isDefault}
                                                        onChange={(e) => handleOptionChange(index, 'isDefault', e.target.checked)}
                                                    />
                                                </Tooltip>
                                                <IconButton size="small" color="error" onClick={() => handleRemoveOption(index)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>

                                            {/* Row 2: Inventory Linking */}
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                                {/* Link type indicator */}
                                                {(option.linkedMenuItem || option.linkedInventoryItem) ? (
                                                    <Chip
                                                        icon={<LinkIcon />}
                                                        label={option.linkedMenuItem ? 'Menu Item' : 'Raw Material'}
                                                        size="small"
                                                        color={option.linkedMenuItem ? 'primary' : 'success'}
                                                        variant="outlined"
                                                        onDelete={() => {
                                                            handleOptionChangeMulti(index, { 
                                                                linkedMenuItem: undefined, 
                                                                linkedInventoryItem: undefined,
                                                                consumptionQty: 1,
                                                                consumptionUnit: undefined
                                                            });
                                                        }}
                                                        deleteIcon={<LinkOffIcon />}
                                                    />
                                                ) : (
                                                    <Chip icon={<LinkOffIcon />} label="No inventory link" size="small" variant="outlined" color="default" />
                                                )}

                                                {/* Menu Item Autocomplete */}
                                                <Autocomplete
                                                    size="small"
                                                    sx={{ flex: 2, minWidth: 180 }}
                                                    options={menuItems}
                                                    getOptionLabel={(item: any) => item.name || ''}
                                                    isOptionEqualToValue={(opt, val) => opt._id === (val?._id || val)}
                                                    value={menuItems.find((m: any) => m._id === option.linkedMenuItem) || null}
                                                    onChange={(_e, val) => {
                                                        handleOptionChangeMulti(index, {
                                                            linkedMenuItem: val?._id || undefined,
                                                            linkedInventoryItem: val ? undefined : option.linkedInventoryItem,
                                                        });
                                                    }}
                                                    renderInput={(params) => <TextField {...params} placeholder="Link Menu Item" />}
                                                    disabled={!!option.linkedInventoryItem}
                                                />

                                                {/* Inventory Item Autocomplete */}
                                                <Autocomplete
                                                    size="small"
                                                    sx={{ flex: 2, minWidth: 180 }}
                                                    options={inventoryItems}
                                                    getOptionLabel={(item: any) => `${item.name} (${item.unit})`}
                                                    isOptionEqualToValue={(opt, val) => opt._id === (val?._id || val)}
                                                    value={inventoryItems.find((m: any) => m._id === option.linkedInventoryItem) || null}
                                                    onChange={(_e, val) => {
                                                        handleOptionChangeMulti(index, {
                                                            linkedInventoryItem: val?._id || undefined,
                                                            linkedMenuItem: val ? undefined : option.linkedMenuItem,
                                                            consumptionUnit: val?.unit || option.consumptionUnit,
                                                        });
                                                    }}
                                                    renderInput={(params) => <TextField {...params} placeholder="Link Raw Material" />}
                                                    disabled={!!option.linkedMenuItem}
                                                />

                                                {/* Consumption Qty — inventory deducted per selection, distinct from the serving Qty above */}
                                                {(option.linkedMenuItem || option.linkedInventoryItem) && (
                                                    <Tooltip title="Inventory quantity deducted per selection">
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        label="Deduct qty"
                                                        value={option.consumptionQty ?? 1}
                                                        onChange={(e) => handleOptionChange(index, 'consumptionQty', parseFloat(e.target.value) || 1)}
                                                        sx={{ width: 100 }}
                                                        InputProps={{ inputProps: { min: 0.01, step: 0.1 } }}
                                                    />
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </Paper>
                                    ))}
                                    {(formData.options || []).length === 0 && (
                                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                            No options added yet.
                                        </Typography>
                                    )}
                                </Box>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button type="submit" variant="contained" startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />} disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save Group'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, id: null })}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this add-on group? Menu items using this group will no longer show these options.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete({ open: false, id: null })} disabled={isDeleting}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={isDeleting} startIcon={isDeleting && <CircularProgress size={16} color="inherit" />}>
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AddOnGroupsPage;
