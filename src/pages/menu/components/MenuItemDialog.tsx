import {
    Add as AddIcon,
    Close as CloseIcon,
    Image as ImageIcon,
    Restaurant as RestaurantIcon,
    Straighten as StraightenIcon,
    Today as TodayIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Paper,
    Select,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Typography,
    alpha,
    useTheme
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ActionHistoryList from '../../../components/common/ActionHistoryList';
import { useSettings } from '../../../context/SettingsContext';
import { menuAPI, uploadAPI } from '../../../services/api';
import type {
    Category,
    IMenuItem,
    ModifierGroup,
    Subcategory,
    TrayOption,
    Variant
} from '../types';

interface MenuItemDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingMenuItem: IMenuItem | null;
    categories: Category[];
    subcategories: Subcategory[];
    trays: any[];
}

const SPICE_LEVEL_OPTIONS = [
    { value: 'mild', label: 'Mild' },
    { value: 'medium', label: 'Medium' },
    { value: 'hot', label: 'Hot' },
    { value: 'very_hot', label: 'Very Hot' },
] as const;

const MenuItemDialog: React.FC<MenuItemDialogProps> = ({
    open,
    onClose,
    onSuccess,
    editingMenuItem,
    categories,
    subcategories,
    trays
}) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { formatCurrency } = useSettings();
    const [dialogTab, setDialogTab] = useState(0);

    // Form State
    const [menuItemForm, setMenuItemForm] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        subcategory: '',
        image: '',
        isAvailable: true,
        isCateringAvailable: true,
        variants: [] as Variant[],
        modifierGroups: [] as ModifierGroup[],
        addOns: [] as string[],
        taxRate: '',
        isAutoDebit: true,
        foodType: '' as '' | 'veg' | 'non-veg',
        trayOptions: [] as TrayOption[],
        quantityType: 'number' as 'number' | 'tray',
        baseTray: '',
        servingSize: 1,
        isSpiceLevelAvailable: false,
        spiceLevels: ['mild', 'medium', 'hot', 'very_hot'] as string[],
        spiceLevel: undefined as any,
        availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as string[],
        isWeeklyScheduleEnabled: false,
        availabilityType: 'highlight' as 'highlight' | 'available_only',
        displayOption: 'normal' as 'normal' | 'weekly_special' | 'todays_special',
        validFrom: null as Date | null,
        validTo: null as Date | null,
        priority: 0,
    });

    const [menuItemTouched, setMenuItemTouched] = useState({
        name: false,
        price: false,
        category: false,
        subcategory: false,
        image: false,
        foodType: false,
        taxRate: false
    });

    const [isSaving, setIsSaving] = useState(false);

    // Initialize form when editingMenuItem changes or dialog opens
    useEffect(() => {
        if (open) {
            if (editingMenuItem) {
                // Initialize for editing
                const item = editingMenuItem;
                const itemSpiceLevels = (item as any).spiceLevels || ['mild', 'medium', 'hot', 'very_hot'];
                const itemSpiceLevelData = (item as any).spiceLevelData || {};

                // Build spice level fields
                const spiceLevelFields: any = {};
                itemSpiceLevels.forEach((level: string, index: number) => {
                    const fieldKey = `spiceLevel_${index}`;
                    spiceLevelFields[fieldKey] = itemSpiceLevelData[level] || level || '';
                });

                setMenuItemForm({
                    name: item.name,
                    description: item.description || '',
                    price: item.price.toString(),
                    category: typeof item.category === 'object' ? item.category._id : item.category,
                    subcategory: typeof item.subcategory === 'object' ? item.subcategory?._id : (item.subcategory || ''),
                    image: item.image || '',
                    isAvailable: item.isAvailable,
                    isCateringAvailable: item.isCateringAvailable,
                    variants: item.variants || [],
                    modifierGroups: item.modifierGroups || [],
                    addOns: item.addOns || [],
                    taxRate: item.taxRate ? item.taxRate.toString() : '',
                    isAutoDebit: item.isAutoDebit !== undefined ? item.isAutoDebit : true,
                    foodType: item.foodType || '',
                    trayOptions: item.trayOptions || [],
                    quantityType: item.quantityType || 'number',
                    baseTray: item.baseTray || '',
                    servingSize: item.servingSize || 1,
                    isSpiceLevelAvailable: !!item.isSpiceLevelAvailable,
                    spiceLevels: itemSpiceLevels,
                    spiceLevel: item.spiceLevel,
                    ...spiceLevelFields,
                    availableDays: item.availableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                    isWeeklyScheduleEnabled: !!item.isWeeklyScheduleEnabled,
                    availabilityType: item.availabilityType || 'highlight',
                    displayOption: item.displayOption || 'normal',
                    validFrom: item.validFrom ? new Date(item.validFrom) : null,
                    validTo: item.validTo ? new Date(item.validTo) : null,
                    priority: item.priority || 0,
                });
            } else {
                // Reset for new item
                setMenuItemForm({
                    name: '',
                    description: '',
                    price: '',
                    category: '',
                    subcategory: '',
                    image: '',
                    isAvailable: true,
                    isCateringAvailable: true,
                    variants: [],
                    modifierGroups: [],
                    addOns: [],
                    taxRate: '',
                    isAutoDebit: true,
                    foodType: '',
                    trayOptions: [],
                    quantityType: 'number',
                    baseTray: '',
                    servingSize: 1,
                    isSpiceLevelAvailable: false,
                    spiceLevels: ['mild', 'medium', 'hot', 'very_hot'],
                    spiceLevel: undefined,
                    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                    isWeeklyScheduleEnabled: false,
                    availabilityType: 'highlight',
                    displayOption: 'normal',
                    validFrom: null,
                    validTo: null,
                    priority: 0,
                });
            }
            setMenuItemTouched({
                name: false,
                price: false,
                category: false,
                subcategory: false,
                image: false,
                foodType: false,
                taxRate: false
            });
            setDialogTab(0);
        }
    }, [open, editingMenuItem]);

    const filteredSubcategories = useMemo(() => {
        if (!menuItemForm.category) return [];
        return subcategories.filter((subcategory) => {
            const parentId = typeof subcategory.parentCategory === 'object'
                ? subcategory.parentCategory?._id
                : subcategory.parentCategory;
            return parentId === menuItemForm.category;
        });
    }, [menuItemForm.category, subcategories]);

    const handleSaveMenuItem = async () => {
        if (!menuItemForm.name || !menuItemForm.name.trim()) {
            setMenuItemTouched(prev => ({ ...prev, name: true }));
            toast.error('Item name is required');
            return;
        }

        if (menuItemForm.taxRate && isNaN(parseFloat(menuItemForm.taxRate as any))) {
            setMenuItemTouched(prev => ({ ...prev, taxRate: true }));
            toast.error('Enter a valid tax rate');
            return;
        }

        if (!menuItemForm.category) {
            setMenuItemTouched(prev => ({ ...prev, category: true }));
            toast.error('Please select a category');
            return;
        }

        if (!menuItemForm.price || !menuItemForm.price.toString().trim()) {
            setMenuItemTouched(prev => ({ ...prev, price: true }));
            toast.error('Base price is required');
            return;
        }

        const parsedPrice = parseFloat(menuItemForm.price as any);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            setMenuItemTouched(prev => ({ ...prev, price: true }));
            toast.error('Enter a valid base price');
            return;
        }

        try {
            setIsSaving(true);
            const spiceLevelData: any = {};
            if (menuItemForm.isSpiceLevelAvailable) {
                menuItemForm.spiceLevels.forEach((_, index) => {
                    const fieldKey = `spiceLevel_${index}` as keyof typeof menuItemForm;
                    const levelName = menuItemForm[fieldKey] as string;
                    if (levelName) {
                        spiceLevelData[levelName] = levelName;
                    }
                });
            }

            const payload = {
                ...menuItemForm,
                price: parsedPrice,
                taxRate: menuItemForm.taxRate ? parseFloat(menuItemForm.taxRate) : null,
                spiceLevelData
            };

            if (editingMenuItem) {
                await menuAPI.update(editingMenuItem._id, payload);
                toast.success('Menu item updated successfully');
            } else {
                await menuAPI.create(payload);
                toast.success('Menu item created successfully');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving menu item:', error);
            toast.error(error.response?.data?.message || 'Failed to save menu item');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const loadingToast = toast.loading('Uploading image...');
            try {
                const response = await uploadAPI.uploadImage(file);
                toast.dismiss(loadingToast);
                toast.success('Image uploaded successfully!');
                setMenuItemForm({ ...menuItemForm, image: response.data.url });
            } catch (error) {
                toast.dismiss(loadingToast);
                toast.error('Failed to upload image');
            }
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2 }}>
                {editingMenuItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    size="small"
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        bgcolor: theme.palette.error.main,
                        color: '#fff',
                        width: 28,
                        height: 28,
                        minWidth: 28,
                        padding: '4px',
                        fontSize: '14px',
                        '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.85) },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}>
                <Tabs value={dialogTab} onChange={(_, v) => setDialogTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="Details" />
                    <Tab label="History" disabled={!editingMenuItem} />
                </Tabs>
                {dialogTab === 0 && (
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        {/* Left Column */}
                        <Grid item xs={12} md={6}>
                            <Stack spacing={3}>
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <RestaurantIcon fontSize="small" color="primary" /> Primary Information
                                    </Typography>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Item Name"
                                            value={menuItemForm.name}
                                            onChange={(e) => setMenuItemForm({ ...menuItemForm, name: e.target.value })}
                                            onBlur={() => setMenuItemTouched({ ...menuItemTouched, name: true })}
                                            error={menuItemTouched.name && !menuItemForm.name.trim()}
                                            helperText={menuItemTouched.name && !menuItemForm.name.trim() ? 'Item name is required' : ''}
                                            fullWidth
                                            required
                                        />

                                        <FormControl fullWidth error={menuItemTouched.category && !menuItemForm.category}>
                                            <InputLabel>Category</InputLabel>
                                            <Select
                                                value={menuItemForm.category}
                                                label="Category"
                                                onChange={(e) => setMenuItemForm({ ...menuItemForm, category: e.target.value, subcategory: '' })}
                                                onBlur={() => setMenuItemTouched(prev => ({ ...prev, category: true }))}
                                            >
                                                <MenuItem value=""><em>Select Category</em></MenuItem>
                                                {categories.map((cat) => (
                                                    <MenuItem key={cat._id} value={cat._id}>{cat.name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        <FormControl fullWidth disabled={!menuItemForm.category}>
                                            <InputLabel>Subcategory</InputLabel>
                                            <Select
                                                value={menuItemForm.subcategory}
                                                label="Subcategory"
                                                onChange={(e) => setMenuItemForm({ ...menuItemForm, subcategory: e.target.value })}
                                            >
                                                <MenuItem value=""><em>No Subcategory</em></MenuItem>
                                                {filteredSubcategories.map((sub) => (
                                                    <MenuItem key={sub._id} value={sub._id}>{sub.name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        <FormControl fullWidth>
                                            <InputLabel>Food Type</InputLabel>
                                            <Select
                                                value={menuItemForm.foodType}
                                                label="Food Type"
                                                onChange={(e) => setMenuItemForm({ ...menuItemForm, foodType: e.target.value as any })}
                                            >
                                                <MenuItem value="veg">Veg</MenuItem>
                                                <MenuItem value="non-veg">Non-Veg</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <TextField
                                            label="Description"
                                            value={menuItemForm.description}
                                            onChange={(e) => setMenuItemForm({ ...menuItemForm, description: e.target.value })}
                                            fullWidth
                                            multiline
                                            rows={3}
                                        />
                                    </Stack>
                                </Paper>

                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ImageIcon fontSize="small" color="primary" /> Media & Image
                                    </Typography>
                                    <Stack spacing={2}>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                            <Button variant="outlined" component="label" startIcon={<ImageIcon fontSize="small" />} color="primary">
                                                Upload Image
                                                <input type="file" hidden accept="image/*" onChange={handleUploadImage} />
                                            </Button>
                                            <TextField
                                                label="Or paste Image URL"
                                                value={menuItemForm.image}
                                                onChange={(e) => setMenuItemForm({ ...menuItemForm, image: e.target.value })}
                                                fullWidth
                                                placeholder="https://example.com/image.jpg"
                                                size="small"
                                            />
                                        </Stack>
                                    </Stack>
                                </Paper>
                            </Stack>
                        </Grid>

                        {/* Right Column */}
                        <Grid item xs={12} md={6}>
                            <Stack spacing={3}>
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.secondary.main, 0.02) }}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <StraightenIcon fontSize="small" color="secondary" /> Pricing & Serving
                                    </Typography>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Standard Price (Per Item) ($)"
                                            type="number"
                                            value={menuItemForm.price}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || parseFloat(val) > 0) setMenuItemForm({ ...menuItemForm, price: val });
                                            }}
                                            onBlur={() => setMenuItemTouched({ ...menuItemTouched, price: true })}
                                            error={menuItemTouched.price && (menuItemForm.price === '' || parseFloat(menuItemForm.price as any) <= 0)}
                                            fullWidth
                                            required
                                            inputProps={{ min: 0.01, step: 0.01 }}
                                        />

                                        {menuItemForm.isCateringAvailable && (
                                            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                                    <InputLabel>Primary Tray for Display</InputLabel>
                                                    <Select
                                                        value={menuItemForm.baseTray}
                                                        label="Primary Tray for Display"
                                                        onChange={(e) => setMenuItemForm({ ...menuItemForm, baseTray: e.target.value })}
                                                    >
                                                        {trays.map((t) => (
                                                            <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                <Typography variant="caption" fontWeight="bold" color="secondary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textTransform: 'uppercase' }}>
                                                    Catering Tray Pricing
                                                </Typography>
                                                <Stack spacing={1.5}>
                                                    {trays.map((t) => {
                                                        const option = menuItemForm.trayOptions.find(o => o.tray === t._id);
                                                        return (
                                                            <Stack key={t._id} direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                                                                <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" noWrap>{t.name}</Typography></Box>
                                                                <TextField
                                                                    size="small" sx={{ width: 90 }} label="Serves" type="number"
                                                                    value={option?.servingSize || menuItemForm.servingSize || 1}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value);
                                                                        if (!val || val < 1) return;
                                                                        const newOptions = [...menuItemForm.trayOptions];
                                                                        const idx = newOptions.findIndex(o => o.tray === t._id);
                                                                        if (idx > -1) newOptions[idx].servingSize = val;
                                                                        else newOptions.push({ tray: t._id, price: 0, servingSize: val, isActive: true });
                                                                        setMenuItemForm({ ...menuItemForm, trayOptions: newOptions });
                                                                    }}
                                                                />
                                                                <TextField
                                                                    size="small" sx={{ width: 110 }} label="Price" type="number"
                                                                    value={option?.price || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                        if (val !== null && val <= 0) return;
                                                                        const newOptions = [...menuItemForm.trayOptions];
                                                                        const idx = newOptions.findIndex(o => o.tray === t._id);
                                                                        if (idx > -1) {
                                                                            if (val === null) newOptions.splice(idx, 1);
                                                                            else newOptions[idx].price = val;
                                                                        } else if (val !== null) {
                                                                            newOptions.push({ tray: t._id, price: val, servingSize: menuItemForm.servingSize || 1, isActive: true });
                                                                        }
                                                                        setMenuItemForm({ ...menuItemForm, trayOptions: newOptions });
                                                                    }}
                                                                />
                                                            </Stack>
                                                        );
                                                    })}
                                                </Stack>
                                            </Box>
                                        )}

                                        <TextField
                                            label="Tax Rate (%)"
                                            type="number"
                                            value={menuItemForm.taxRate}
                                            onChange={(e) => setMenuItemForm({ ...menuItemForm, taxRate: e.target.value })}
                                            fullWidth
                                            placeholder="Override Global Tax"
                                        />
                                    </Stack>
                                </Paper>

                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AddIcon fontSize="small" color="primary" /> Inventory & Visibility
                                    </Typography>
                                    <Stack spacing={1}>
                                        <FormControlLabel control={<Switch checked={menuItemForm.isAvailable} onChange={(e) => setMenuItemForm({ ...menuItemForm, isAvailable: e.target.checked })} />} label="Available for ordering" />
                                        <FormControlLabel control={<Switch checked={menuItemForm.isAutoDebit} onChange={(e) => setMenuItemForm({ ...menuItemForm, isAutoDebit: e.target.checked })} />} label="Auto Debit from Inventory" />
                                        <FormControlLabel control={<Switch checked={menuItemForm.isCateringAvailable} onChange={(e) => setMenuItemForm({ ...menuItemForm, isCateringAvailable: e.target.checked })} />} label="Available for Catering" />
                                        <FormControlLabel control={<Switch checked={menuItemForm.isSpiceLevelAvailable} onChange={(e) => setMenuItemForm({ ...menuItemForm, isSpiceLevelAvailable: e.target.checked })} />} label="Enable Spice Level Selection" />
                                    </Stack>
                                </Paper>
                            </Stack>
                        </Grid>

                        {/* Weekly Availability Section */}
                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: menuItemForm.isWeeklyScheduleEnabled ? 3 : 0 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TodayIcon fontSize="small" color="primary" /> Weekly Availability
                                    </Typography>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={menuItemForm.isWeeklyScheduleEnabled}
                                                onChange={(e) => setMenuItemForm({ ...menuItemForm, isWeeklyScheduleEnabled: e.target.checked })}
                                                color="primary"
                                            />
                                        }
                                        label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Enable Weekly Schedule</Typography>}
                                        labelPlacement="start"
                                        sx={{ mr: 0 }}
                                    />
                                </Box>

                                {menuItemForm.isWeeklyScheduleEnabled && (
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Availability Type</InputLabel>
                                                <Select
                                                    value={menuItemForm.availabilityType || 'available_only'}
                                                    label="Availability Type"
                                                    onChange={(e) => setMenuItemForm({ ...menuItemForm, availabilityType: e.target.value as any })}
                                                >
                                                    <MenuItem value="highlight">Highlight Only (Available Everyday, Highlighted on specific days)</MenuItem>
                                                    <MenuItem value="available_only">Available Only on Selected Days</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Display Options</InputLabel>
                                                <Select
                                                    value={menuItemForm.displayOption || 'normal'}
                                                    label="Display Options"
                                                    onChange={(e) => setMenuItemForm({ ...menuItemForm, displayOption: e.target.value as any })}
                                                >
                                                    <MenuItem value="normal">Normal</MenuItem>
                                                    <MenuItem value="weekly_special">Weekly Special</MenuItem>
                                                    <MenuItem value="todays_special">Today's Special</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>Quick Select:</Typography>
                                                <Stack direction="row" spacing={1}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ borderRadius: 2, textTransform: 'none', px: 2 }}
                                                        onClick={() => setMenuItemForm({ ...menuItemForm, availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] })}
                                                    >
                                                        Weekdays
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ borderRadius: 2, textTransform: 'none', px: 2 }}
                                                        onClick={() => setMenuItemForm({ ...menuItemForm, availableDays: ['saturday', 'sunday'] })}
                                                    >
                                                        Weekend
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ borderRadius: 2, textTransform: 'none', px: 2 }}
                                                        onClick={() => setMenuItemForm({ ...menuItemForm, availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] })}
                                                    >
                                                        All Days
                                                    </Button>
                                                </Stack>
                                            </Box>
                                        </Grid>

                                        <Grid item xs={12}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Days Available</InputLabel>
                                                <Select
                                                    multiple
                                                    value={menuItemForm.availableDays || []}
                                                    label="Days Available"
                                                    onChange={(e) => setMenuItemForm({ ...menuItemForm, availableDays: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value as string[] })}
                                                    input={<OutlinedInput label="Days Available" />}
                                                    renderValue={(selected) => (
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                            {(selected as string[]).map((value) => (
                                                                <Chip
                                                                    key={value}
                                                                    label={value.charAt(0).toUpperCase() + value.slice(1)}
                                                                    size="small"
                                                                    sx={{ borderRadius: 1 }}
                                                                />
                                                            ))}
                                                        </Box>
                                                    )}
                                                >
                                                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                                                        <MenuItem key={day} value={day}>
                                                            {day.charAt(0).toUpperCase() + day.slice(1)}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                label="Valid From (Optional)"
                                                type="date"
                                                size="small"
                                                value={menuItemForm.validFrom ? new Date(menuItemForm.validFrom).toISOString().split('T')[0] : ''}
                                                onChange={(e) => setMenuItemForm({ ...menuItemForm, validFrom: e.target.value ? new Date(e.target.value) : null })}
                                                fullWidth
                                                InputLabelProps={{ shrink: true }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                label="Valid Till (Optional)"
                                                type="date"
                                                size="small"
                                                value={menuItemForm.validTo ? new Date(menuItemForm.validTo).toISOString().split('T')[0] : ''}
                                                onChange={(e) => setMenuItemForm({ ...menuItemForm, validTo: e.target.value ? new Date(e.target.value) : null })}
                                                fullWidth
                                                InputLabelProps={{ shrink: true }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                label="Priority (Higher first)"
                                                type="number"
                                                size="small"
                                                value={menuItemForm.priority || 0}
                                                onChange={(e) => setMenuItemForm({ ...menuItemForm, priority: parseInt(e.target.value) || 0 })}
                                                fullWidth
                                            />
                                        </Grid>
                                    </Grid>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                )}
                {dialogTab === 1 && editingMenuItem && (
                    <Box sx={{ mt: 2 }}>
                        <ActionHistoryList history={editingMenuItem.actionHistory || []} />
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5, pt: 1.5, gap: 1.5 }}>
                <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, px: 3, color: 'text.secondary', borderColor: 'divider' }}>Cancel</Button>
                <Button onClick={handleSaveMenuItem} variant="contained" disabled={isSaving} sx={{ borderRadius: 2, px: 3, boxShadow: theme.shadows[4] }}>
                    {isSaving ? <CircularProgress size={24} /> : (editingMenuItem ? 'Update Item' : 'Save Item')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default React.memo(MenuItemDialog);
