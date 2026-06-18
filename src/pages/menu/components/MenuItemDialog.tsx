import {
    Add as AddIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Inventory2Outlined as DirectLinkIcon,
    Image as ImageIcon,
    PlaylistAdd as PlaylistAddIcon,
    MenuBookOutlined as RecipeIcon,
    Restaurant as RestaurantIcon,
    Straighten as StraightenIcon,
    Today as TodayIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
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
    OutlinedInput,
    Paper,
    Select,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,

    Tooltip,
    Typography,
    alpha,
    useMediaQuery,
    useTheme
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ActionHistoryList from '../../../components/common/ActionHistoryList';
import { useSettings } from '../../../context/SettingsContext';
import { useActiveTenant } from '../../../hooks/useActiveTenant';
import { inventoryAPI, menuAPI, modifierTemplatesAPI, uploadAPI, recipesAPI } from '../../../services/api';
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
    const [templates, setTemplates] = useState<ModifierGroupTemplate[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const { getRelativePath } = useActiveTenant();
    const { formatCurrency } = useSettings();
    const [dialogTab, setDialogTab] = useState(0);
    const todayStr = new Date().toISOString().split('T')[0];

    const [existingRecipe, setExistingRecipe] = useState<any>(null);
    const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);


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
        priority: '' as string | number,
        linkedGroups: [] as string[],
        linkedInventoryItem: '',
        inventoryConsumptionQty: 1,
        inventoryTrackingMode: 'recipe' as 'direct' | 'recipe',
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

    useEffect(() => {
        if (open) {
            modifierTemplatesAPI.getAll().then(res => setTemplates(res.data)).catch(err => console.error(err));
            inventoryAPI.getAll().then(res => setInventoryItems(res.data)).catch(err => console.error(err));
        }
    }, [open]);

    useEffect(() => {
        if (open && editingMenuItem) {
            setIsLoadingRecipe(true);
            recipesAPI.getByMenuItem(editingMenuItem._id)
                .then(res => setExistingRecipe(res.data.data || res.data))
                .catch(() => setExistingRecipe(null))
                .finally(() => setIsLoadingRecipe(false));
        } else {
            setExistingRecipe(null);
        }
    }, [open, editingMenuItem]);

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
                    validTo: item.validTo ? new Date(item.validTo) : null,
                    priority: item.priority || '',
                    linkedGroups: item.linkedGroups ? item.linkedGroups.map((g: any) => typeof g === 'string' ? g : g._id) : [],
                    linkedInventoryItem: typeof item.linkedInventoryItem === 'object' ? (item.linkedInventoryItem as any)?._id : (item.linkedInventoryItem || ''),
                    inventoryConsumptionQty: item.inventoryConsumptionQty || 1,
                    inventoryTrackingMode: item.inventoryTrackingMode || (item.linkedInventoryItem ? 'direct' : 'recipe'),
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
                    priority: '',
                    linkedGroups: [],
                    linkedInventoryItem: '',
                    inventoryConsumptionQty: 1,
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
                priority: parseInt(menuItemForm.priority as any) || 0,
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
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: theme.shadows[10],
                    backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))`,
                    maxHeight: isMobile ? '80vh' : '90vh',
                    m: isMobile ? 1.5 : 2
                }
            }}
        >
            <DialogTitle sx={{
                m: 0,
                p: { xs: 1.25, sm: 2.5 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'center' : 'flex-start',
                borderBottom: isMobile ? 1 : 0,
                borderColor: 'divider',
                bgcolor: isMobile ? alpha(theme.palette.primary.main, 0.03) : 'transparent'
            }}>
                <Typography variant={isMobile ? "subtitle1" : "h5"} fontWeight={800} color="primary.main">
                    {editingMenuItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                </Typography>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    size="small"
                    sx={{
                        position: 'absolute',
                        right: 12,
                        top: 12,
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        color: theme.palette.error.main,
                        width: 32,
                        height: 32,
                        transition: 'all 0.2s',
                        '&:hover': {
                            bgcolor: theme.palette.error.main,
                            color: '#fff',
                            transform: 'rotate(90deg)'
                        },
                    }}
                >
                    <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{
                p: { xs: 1, sm: 3 },
                pt: { xs: 0, sm: 1 },
                '& .MuiFormLabel-asterisk': { color: 'red' }
            }}>
                <Tabs
                    value={dialogTab}
                    onChange={(_, v) => setDialogTab(v)}
                    sx={{
                        mb: { xs: 1, sm: 2 },
                        borderBottom: 1,
                        borderColor: 'divider',
                        minHeight: { xs: 36, sm: 48 },
                        '& .MuiTab-root': { py: 0.5, minHeight: { xs: 36, sm: 48 } }
                    }}
                >
                    <Tab label="Details" />
                    <Tab label="Variants & Modifiers" />
                    <Tab label="History" disabled={!editingMenuItem} />
                </Tabs>
                {dialogTab === 0 && (
                    <Grid container spacing={isMobile ? 1 : 3} sx={{ mt: isMobile ? 0 : 1 }}>
                        {/* Left Column */}
                        <Grid item xs={12} md={6}>
                            <Stack spacing={isMobile ? 1.5 : 3}>
                                <Paper variant="outlined" sx={{ p: isMobile ? 1 : 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                                    <Typography variant={isMobile ? "caption" : "subtitle2"} fontWeight="bold" sx={{ mb: isMobile ? 1 : 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <RestaurantIcon fontSize="small" color="primary" /> Primary Information
                                    </Typography>
                                    <Stack spacing={isMobile ? 1 : 2}>
                                        <TextField
                                            label="Item Name"
                                            value={menuItemForm.name}
                                            onChange={(e) => setMenuItemForm({ ...menuItemForm, name: e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })}
                                            onBlur={() => setMenuItemTouched({ ...menuItemTouched, name: true })}
                                            error={menuItemTouched.name && !menuItemForm.name.trim()}
                                            helperText={menuItemTouched.name && !menuItemForm.name.trim() ? 'Item name is required' : ''}
                                            fullWidth
                                            required
                                            size={isMobile ? "small" : "medium"}
                                        />

                                        <FormControl fullWidth size={isMobile ? "small" : "medium"} error={menuItemTouched.category && !menuItemForm.category}>
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

                                        <FormControl fullWidth size={isMobile ? "small" : "medium"} disabled={!menuItemForm.category}>
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

                                        <FormControl fullWidth size={isMobile ? "small" : "medium"}>
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
                                            onChange={(e) => setMenuItemForm({ ...menuItemForm, description: e.target.value.slice(0, 250) })}
                                            fullWidth
                                            multiline
                                            rows={2}
                                            size={isMobile ? "small" : "medium"}
                                            inputProps={{ maxLength: 250 }}
                                            helperText={`${menuItemForm.description.length || 0}/250`}
                                            FormHelperTextProps={{ sx: { textAlign: 'right' } }}
                                        />
                                    </Stack>
                                </Paper>

                                <Paper variant="outlined" sx={{ p: isMobile ? 1 : 2, borderRadius: 2 }}>
                                    <Typography variant={isMobile ? "caption" : "subtitle2"} fontWeight="bold" sx={{ mb: isMobile ? 1 : 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ImageIcon fontSize="small" color="primary" /> Media & Image
                                    </Typography>
                                    <Stack spacing={isMobile ? 1 : 2}>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                            <Button variant="outlined" component="label" startIcon={<ImageIcon fontSize="small" />} color="primary" size={isMobile ? "small" : "medium"}>
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
                            <Stack spacing={isMobile ? 1 : 3}>
                                <Paper variant="outlined" sx={{ p: isMobile ? 1 : 2, borderRadius: 2, bgcolor: alpha(theme.palette.secondary.main, 0.02) }}>
                                    <Typography variant={isMobile ? "caption" : "subtitle2"} fontWeight="bold" sx={{ mb: isMobile ? 1 : 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <StraightenIcon fontSize="small" color="secondary" /> Pricing & Serving
                                    </Typography>
                                    <Stack spacing={isMobile ? 1 : 2}>
                                        <TextField
                                            label="Standard Price (Per Item) ($)"
                                            type="number"
                                            value={menuItemForm.price}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const parts = val.split('.');
                                                if (parts.length > 1 && parts[1].length > 3) return;
                                                if (val === '' || parseFloat(val) >= 0) setMenuItemForm({ ...menuItemForm, price: val });
                                            }}
                                            onBlur={() => setMenuItemTouched({ ...menuItemTouched, price: true })}
                                            error={menuItemTouched.price && (menuItemForm.price === '' || parseFloat(menuItemForm.price as any) <= 0)}
                                            fullWidth
                                            required
                                            size={isMobile ? "small" : "medium"}
                                            inputProps={{ min: 0.01, step: 0.01 }}
                                        />

                                        {menuItemForm.isCateringAvailable && (
                                            <Box sx={{ p: isMobile ? 1 : 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
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
                                                <Typography variant="caption" fontWeight="bold" color="secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textTransform: 'uppercase' }}>
                                                    Catering Tray Pricing
                                                </Typography>
                                                <Stack spacing={0.5}>
                                                    {trays.map((t) => {
                                                        const option = menuItemForm.trayOptions.find(o => o.tray === t._id);
                                                        return (
                                                            <Stack key={t._id} direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
                                                                <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="caption" noWrap>{t.name}</Typography></Box>
                                                                <TextField
                                                                    size="small" sx={{ width: 60 }} label="Serves" type="number"
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
                                                                    size="small" sx={{ width: 70 }} label="Price" type="number"
                                                                    value={option?.price || ''}
                                                                    onChange={(e) => {
                                                                        const valStr = e.target.value;
                                                                        const parts = valStr.split('.');
                                                                        if (parts.length > 1 && parts[1].length > 3) return;
                                                                        const val = valStr === '' ? null : parseFloat(valStr);
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
                                    </Stack>
                                </Paper>

                                <Paper variant="outlined" sx={{ p: isMobile ? 1 : 2, borderRadius: 2 }}>
                                    <Typography variant={isMobile ? "caption" : "subtitle2"} fontWeight="bold" sx={{ mb: isMobile ? 0.5 : 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AddIcon fontSize="small" color="primary" /> Inventory & Visibility
                                    </Typography>

                                    <Stack spacing={0} sx={{ mb: 2 }}>
                                        <FormControlLabel control={<Switch size="small" checked={menuItemForm.isAvailable} onChange={(e) => setMenuItemForm({ ...menuItemForm, isAvailable: e.target.checked })} />} label={<Typography variant="body2">Available for ordering</Typography>} />
                                        <FormControlLabel control={<Switch size="small" checked={menuItemForm.isCateringAvailable} onChange={(e) => setMenuItemForm({ ...menuItemForm, isCateringAvailable: e.target.checked })} />} label={<Typography variant="body2">Available for Catering</Typography>} />
                                        <FormControlLabel control={<Switch size="small" checked={menuItemForm.isSpiceLevelAvailable} onChange={(e) => setMenuItemForm({ ...menuItemForm, isSpiceLevelAvailable: e.target.checked })} />} label={<Typography variant="body2">Enable Spice Level Selection</Typography>} />
                                    </Stack>

                                    <Divider sx={{ mb: 2 }} />
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Stock Deduction Method
                                    </Typography>

                                    <Stack direction={isMobile ? 'column' : 'row'} spacing={1.5}>
                                        {[
                                            { value: 'recipe', icon: <RecipeIcon />, label: 'Recipe', desc: 'Deduct ingredients', color: theme.palette.success.main },
                                            { value: 'direct', icon: <DirectLinkIcon />, label: 'Direct Link', desc: 'Deduct single item', color: theme.palette.info.main },
                                        ].map((opt) => {
                                            const isSelected = menuItemForm.inventoryTrackingMode === opt.value;
                                            return (
                                                <Box
                                                    key={opt.value}
                                                    onClick={() => setMenuItemForm({ ...menuItemForm, inventoryTrackingMode: opt.value })}
                                                    sx={{
                                                        flex: 1,
                                                        cursor: 'pointer',
                                                        p: 1.5,
                                                        borderRadius: 2,
                                                        border: '2px solid',
                                                        borderColor: isSelected ? opt.color : 'divider',
                                                        bgcolor: isSelected ? alpha(opt.color, 0.06) : 'transparent',
                                                        transition: 'all 0.2s ease',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1.5,
                                                        '&:hover': {
                                                            borderColor: isSelected ? opt.color : alpha(opt.color, 0.4),
                                                            bgcolor: alpha(opt.color, 0.04),
                                                        },
                                                    }}
                                                >
                                                    <Box sx={{
                                                        width: 36, height: 36,
                                                        borderRadius: '50%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        bgcolor: isSelected ? alpha(opt.color, 0.15) : alpha(theme.palette.action.active, 0.08),
                                                        color: isSelected ? opt.color : theme.palette.text.secondary,
                                                        transition: 'all 0.2s ease',
                                                        flexShrink: 0,
                                                    }}>
                                                        {React.cloneElement(opt.icon, { fontSize: 'small' })}
                                                    </Box>
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography variant="body2" fontWeight={isSelected ? 700 : 500} color={isSelected ? opt.color : 'text.primary'} noWrap>
                                                            {opt.label}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" noWrap>
                                                            {opt.desc}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Stack>

                                    {menuItemForm.inventoryTrackingMode === 'recipe' && (
                                        <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.2) }}>
                                            <Stack spacing={1.5}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <RecipeIcon fontSize="small" sx={{ color: 'success.main' }} />
                                                    <Typography variant="body2" color="text.secondary">
                                                        Ingredients will be auto-deducted from the recipe linked to this item.
                                                    </Typography>
                                                </Box>
                                                
                                                {!editingMenuItem ? (
                                                    <Typography variant="caption" sx={{ color: 'warning.dark', fontStyle: 'italic', bgcolor: alpha(theme.palette.warning.main, 0.1), p: 1, borderRadius: 1 }}>
                                                        Save this menu item first to create and manage its recipe.
                                                    </Typography>
                                                ) : isLoadingRecipe ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
                                                        <CircularProgress size={16} />
                                                        <Typography variant="caption">Checking recipe status...</Typography>
                                                    </Box>
                                                ) : existingRecipe ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 1 }}>
                                                        <Typography variant="caption" fontWeight="bold" color="success.dark">
                                                            Recipe Configured ✓
                                                        </Typography>
                                                        <Button 
                                                            size="small" 
                                                            variant="outlined" 
                                                            color="success"
                                                            onClick={() => navigate(getRelativePath(`/recipes/${existingRecipe._id}/edit?returnTo=/menu`))}
                                                            sx={{ textTransform: 'none', py: 0.5 }}
                                                        >
                                                            View / Edit
                                                        </Button>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 1 }}>
                                                        <Typography variant="caption" fontWeight="bold" color="warning.dark">
                                                            No Recipe Found ⚠
                                                        </Typography>
                                                        <Button 
                                                            size="small" 
                                                            variant="contained" 
                                                            color="warning"
                                                            onClick={() => navigate(getRelativePath(`/recipes/create?menuItem=${editingMenuItem._id}&returnTo=/menu`))}
                                                            sx={{ textTransform: 'none', py: 0.5, boxShadow: 'none' }}
                                                        >
                                                            Create Recipe
                                                        </Button>
                                                    </Box>
                                                )}
                                            </Stack>
                                        </Box>
                                    )}

                                    {menuItemForm.inventoryTrackingMode === 'direct' && (
                                        <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.info.main, 0.04), borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.2) }}>
                                            <Stack spacing={2}>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>Inventory Item</InputLabel>
                                                    <Select
                                                        value={menuItemForm.linkedInventoryItem}
                                                        label="Inventory Item"
                                                        onChange={(e) => setMenuItemForm({ ...menuItemForm, linkedInventoryItem: e.target.value })}
                                                    >
                                                        <MenuItem value=""><em>Select an item...</em></MenuItem>
                                                        {inventoryItems.map((item) => (
                                                            <MenuItem key={item._id} value={item._id}>
                                                                {item.name} ({item.sku}) — {item.currentStock} {item.unit}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                {menuItemForm.linkedInventoryItem && (
                                                    <TextField
                                                        label="Qty to deduct per unit sold"
                                                        type="number"
                                                        size="small"
                                                        value={menuItemForm.inventoryConsumptionQty}
                                                        onChange={(e) => setMenuItemForm({ ...menuItemForm, inventoryConsumptionQty: parseFloat(e.target.value) || 1 })}
                                                        fullWidth
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                    )}
                                </Paper>
                            </Stack>
                        </Grid>

                        {/* Weekly Availability Section */}
                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: isMobile ? 1 : 2, borderRadius: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: menuItemForm.isWeeklyScheduleEnabled ? 1 : 0 }}>
                                    <Typography variant={isMobile ? "caption" : "subtitle2"} fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TodayIcon fontSize="small" color="primary" /> Weekly Availability
                                    </Typography>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                size="small"
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
                                    <Grid container spacing={1.5}>
                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Availability Type</InputLabel>
                                                <Select
                                                    value={menuItemForm.availabilityType || 'available_only'}
                                                    label="Availability Type"
                                                    onChange={(e) => setMenuItemForm({ ...menuItemForm, availabilityType: e.target.value as any })}
                                                    sx={{
                                                        '& .MuiSelect-select': {
                                                            pr: '48px !important',
                                                        }
                                                    }}
                                                    renderValue={(selected) => (
                                                        <Box sx={{
                                                            overflowX: 'auto',
                                                            whiteSpace: 'nowrap',
                                                            width: '100%',
                                                            '&::-webkit-scrollbar': { height: '2px' },
                                                            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1 }
                                                        }}>
                                                            {selected === 'highlight'
                                                                ? 'Highlight Only (Available Everyday, Highlighted on specific days)'
                                                                : 'Available Only on Selected Days'}
                                                        </Box>
                                                    )}
                                                >
                                                    <MenuItem value="highlight">
                                                        <Box sx={{
                                                            overflowX: 'auto',
                                                            whiteSpace: 'nowrap',
                                                            width: '100%',
                                                            '&::-webkit-scrollbar': { height: '2px' },
                                                            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1 }
                                                        }}>
                                                            Highlight Only (Available Everyday, Highlighted on specific days)
                                                        </Box>
                                                    </MenuItem>
                                                    <MenuItem value="available_only">
                                                        <Box sx={{
                                                            overflowX: 'auto',
                                                            whiteSpace: 'nowrap',
                                                            width: '100%',
                                                            '&::-webkit-scrollbar': { height: '2px' },
                                                            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1 }
                                                        }}>
                                                            Available Only on Selected Days
                                                        </Box>
                                                    </MenuItem>
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
                                            <Box sx={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 1, mb: 0.5, flexDirection: isMobile ? 'column' : 'row' }}>
                                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>Quick Select:</Typography>
                                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 0.5 }}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ borderRadius: 2, textTransform: 'none', px: 1, fontSize: '0.7rem' }}
                                                        onClick={() => setMenuItemForm({ ...menuItemForm, availableDays: ['monday', 'tuesday', 'wednesday', 'thursday'] })}
                                                    >
                                                        Weekdays
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ borderRadius: 2, textTransform: 'none', px: 1, fontSize: '0.7rem' }}
                                                        onClick={() => setMenuItemForm({ ...menuItemForm, availableDays: ['friday', 'saturday', 'sunday'] })}
                                                    >
                                                        Weekend
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ borderRadius: 2, textTransform: 'none', px: 1, fontSize: '0.7rem' }}
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
                                                inputProps={{ min: todayStr }}
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
                                                inputProps={{ min: menuItemForm.validFrom ? new Date(menuItemForm.validFrom).toISOString().split('T')[0] : todayStr }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                label="Position (Order)"
                                                type="number"
                                                size="small"
                                                value={menuItemForm.priority}
                                                onChange={(e) => setMenuItemForm({ ...menuItemForm, priority: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0) })}
                                                fullWidth
                                                inputProps={{ min: 0 }}
                                            />
                                        </Grid>
                                    </Grid>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                )}

                {dialogTab === 1 && (
                    <Box sx={{ mt: 3 }}>
                        <Grid container spacing={3}>
                            {/* Variants Section */}
                            <Grid item xs={12} md={6}>
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <StraightenIcon fontSize="small" color="primary" /> Item Variants
                                        </Typography>
                                        <Button
                                            startIcon={<AddIcon />}
                                            size="small"
                                            onClick={() => {
                                                const newVariants = [...menuItemForm.variants, { name: '', price: 0 }];
                                                setMenuItemForm({ ...menuItemForm, variants: newVariants });
                                            }}
                                        >
                                            Add Variant
                                        </Button>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                        Create options like "Small", "Medium", "Large" or different flavors.
                                    </Typography>
                                    <Stack spacing={2}>
                                        {menuItemForm.variants.map((variant, index) => (
                                            <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                <TextField
                                                    label="Name"
                                                    value={variant.name}
                                                    size="small"
                                                    fullWidth
                                                    onChange={(e) => {
                                                        const newVariants = [...menuItemForm.variants];
                                                        newVariants[index].name = e.target.value;
                                                        setMenuItemForm({ ...menuItemForm, variants: newVariants });
                                                    }}
                                                />
                                                <TextField
                                                    label="Price"
                                                    type="number"
                                                    value={variant.price}
                                                    size="small"
                                                    sx={{ width: 120 }}
                                                    onChange={(e) => {
                                                        const newVariants = [...menuItemForm.variants];
                                                        newVariants[index].price = parseFloat(e.target.value) || 0;
                                                        setMenuItemForm({ ...menuItemForm, variants: newVariants });
                                                    }}
                                                />
                                                <IconButton
                                                    color="error"
                                                    size="small"
                                                    onClick={() => {
                                                        const newVariants = menuItemForm.variants.filter((_, i) => i !== index);
                                                        setMenuItemForm({ ...menuItemForm, variants: newVariants });
                                                    }}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Box>
                                        ))}
                                        {menuItemForm.variants.length === 0 && (
                                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                                                No variants added
                                            </Typography>
                                        )}
                                    </Stack>
                                </Paper>
                            </Grid>

                            {/* Modifier Groups Section */}
                            <Grid item xs={12} md={6}>
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.secondary.main, 0.02) }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <PlaylistAddIcon fontSize="small" color="secondary" /> Add-ons & Customizations
                                        </Typography>
                                    </Box>

                                    <Box sx={{ mb: 3 }}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Global Add-on Templates</InputLabel>
                                            <Select
                                                multiple
                                                value={menuItemForm.linkedGroups}
                                                onChange={(e) => setMenuItemForm({ ...menuItemForm, linkedGroups: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                                                input={<OutlinedInput label="Global Add-on Templates" />}
                                                renderValue={(selected) => (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                        {selected.map((value) => (
                                                            <Chip key={value} label={templates.find(t => t._id === value)?.name || value} size="small" />
                                                        ))}
                                                    </Box>
                                                )}
                                            >
                                                {templates.length === 0 && <MenuItem disabled>No global add-ons found</MenuItem>}
                                                {templates.map((template) => (
                                                    <MenuItem key={template._id} value={template._id}>
                                                        {template.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                                                Select reusable groups defined in the "Global Add-ons" manager.
                                            </Typography>
                                        </FormControl>
                                    </Box>

                                    <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="caption" fontWeight="bold" color="secondary">Custom Local Modifiers</Typography>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            startIcon={<AddIcon />}
                                            size="small"
                                            onClick={() => {
                                                const newGroups = [...menuItemForm.modifierGroups, {
                                                    name: '',
                                                    selectionType: 'single',
                                                    required: false,
                                                    options: []
                                                }];
                                                setMenuItemForm({ ...menuItemForm, modifierGroups: newGroups });
                                            }}
                                        >
                                            Add Group
                                        </Button>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                        Groups of add-ons like "Toppings", "Sides", or "Choice of Protein".
                                    </Typography>

                                    <Stack spacing={3}>
                                        {menuItemForm.modifierGroups.map((group, groupIndex) => (
                                            <Paper key={groupIndex} variant="outlined" sx={{ p: 2, position: 'relative', borderColor: 'divider' }}>
                                                <IconButton
                                                    sx={{ position: 'absolute', right: 4, top: 4 }}
                                                    color="error"
                                                    size="small"
                                                    onClick={() => {
                                                        const newGroups = menuItemForm.modifierGroups.filter((_, i) => i !== groupIndex);
                                                        setMenuItemForm({ ...menuItemForm, modifierGroups: newGroups });
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>

                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} sm={6}>
                                                        <TextField
                                                            label="Group Name"
                                                            value={group.name}
                                                            size="small"
                                                            fullWidth
                                                            onChange={(e) => {
                                                                const newGroups = [...menuItemForm.modifierGroups];
                                                                newGroups[groupIndex].name = e.target.value;
                                                                setMenuItemForm({ ...menuItemForm, modifierGroups: newGroups });
                                                            }}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <FormControl fullWidth size="small">
                                                            <InputLabel>Selection Type</InputLabel>
                                                            <Select
                                                                value={group.selectionType}
                                                                label="Selection Type"
                                                                onChange={(e) => {
                                                                    const newGroups = [...menuItemForm.modifierGroups];
                                                                    newGroups[groupIndex].selectionType = e.target.value as any;
                                                                    setMenuItemForm({ ...menuItemForm, modifierGroups: newGroups });
                                                                }}
                                                            >
                                                                <MenuItem value="single">Single (Radio)</MenuItem>
                                                                <MenuItem value="multiple">Multiple (Checkbox)</MenuItem>
                                                            </Select>
                                                        </FormControl>
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    size="small"
                                                                    checked={group.required}
                                                                    onChange={(e) => {
                                                                        const newGroups = [...menuItemForm.modifierGroups];
                                                                        newGroups[groupIndex].required = e.target.checked;
                                                                        setMenuItemForm({ ...menuItemForm, modifierGroups: newGroups });
                                                                    }}
                                                                />
                                                            }
                                                            label={<Typography variant="body2">Required for Customer</Typography>}
                                                        />
                                                    </Grid>
                                                </Grid>

                                                <Divider sx={{ my: 2 }} />

                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                    <Typography variant="caption" fontWeight="bold">Options</Typography>
                                                    <Button
                                                        size="small"
                                                        startIcon={<AddIcon />}
                                                        onClick={() => {
                                                            const newGroups = [...menuItemForm.modifierGroups];
                                                            newGroups[groupIndex].options.push({ name: '', price: 0, isDefault: false });
                                                            setMenuItemForm({ ...menuItemForm, modifierGroups: newGroups });
                                                        }}
                                                    >
                                                        Add Option
                                                    </Button>
                                                </Box>

                                                <Stack spacing={1}>
                                                    {group.options.map((option, optionIndex) => (
                                                        <Box key={optionIndex} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                            <TextField
                                                                placeholder="Option Name"
                                                                value={option.name}
                                                                size="small"
                                                                fullWidth
                                                                onChange={(e) => {
                                                                    const newGroups = [...menuItemForm.modifierGroups];
                                                                    newGroups[groupIndex].options[optionIndex].name = e.target.value;
                                                                    setMenuItemForm({ ...menuItemForm, modifierGroups: newGroups });
                                                                }}
                                                            />
                                                            <TextField
                                                                placeholder="Price"
                                                                type="number"
                                                                value={option.price}
                                                                size="small"
                                                                sx={{ width: 100 }}
                                                                onChange={(e) => {
                                                                    const newGroups = [...menuItemForm.modifierGroups];
                                                                    newGroups[groupIndex].options[optionIndex].price = parseFloat(e.target.value) || 0;
                                                                    setMenuItemForm({ ...menuItemForm, modifierGroups: newGroups });
                                                                }}
                                                            />
                                                            <Tooltip title="Default Option">
                                                                <Checkbox
                                                                    size="small"
                                                                    checked={option.isDefault}
                                                                    onChange={(e) => {
                                                                        const newGroups = [...menuItemForm.modifierGroups];
                                                                        // If single selection, uncheck others
                                                                        if (group.selectionType === 'single' && e.target.checked) {
                                                                            newGroups[groupIndex].options.forEach((o, i) => {
                                                                                o.isDefault = i === optionIndex;
                                                                            });
                                                                        } else {
                                                                            newGroups[groupIndex].options[optionIndex].isDefault = e.target.checked;
                                                                        }
                                                                        setMenuItemForm({ ...menuItemForm, modifierGroups: newGroups });
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => {
                                                                    const newGroups = [...menuItemForm.modifierGroups];
                                                                    newGroups[groupIndex].options = newGroups[groupIndex].options.filter((_, i) => i !== optionIndex);
                                                                    setMenuItemForm({ ...menuItemForm, modifierGroups: newGroups });
                                                                }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    ))}
                                                </Stack>
                                            </Paper>
                                        ))}
                                        {menuItemForm.modifierGroups.length === 0 && (
                                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                                                No custom modifiers added
                                            </Typography>
                                        )}
                                    </Stack>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {dialogTab === 2 && editingMenuItem && (
                    <Box sx={{ mt: 1 }}>
                        <ActionHistoryList history={editingMenuItem.actionHistory || []} />
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{
                p: { xs: 1, sm: 2 },
                flexDirection: isMobile ? 'column-reverse' : 'row',
                gap: 1,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: isMobile ? alpha(theme.palette.primary.main, 0.03) : 'transparent'
            }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    fullWidth={isMobile}
                    sx={{
                        borderRadius: 2,
                        px: 3,
                        color: 'text.secondary',
                        borderColor: 'divider',
                        order: isMobile ? 2 : 1
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSaveMenuItem}
                    variant="contained"
                    disabled={isSaving}
                    fullWidth={isMobile}
                    sx={{
                        borderRadius: 2,
                        px: 3,
                        boxShadow: theme.shadows[4],
                        order: isMobile ? 1 : 2
                    }}
                >
                    {isSaving ? <CircularProgress size={24} /> : (editingMenuItem ? 'Update Item' : 'Save Item')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default React.memo(MenuItemDialog);
