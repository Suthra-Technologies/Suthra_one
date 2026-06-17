import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    Autocomplete,
    FormControlLabel,
    Switch,
    Grid,
    useTheme,
    useMediaQuery,
    alpha,
    MenuItem,
    CircularProgress,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    ArrowBack as BackIcon,
    Straighten as TrayIcon,
    Calculate as CalculateIcon
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { recipesAPI, menuAPI, inventoryAPI, traysAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import ActionHistoryList from '../../components/common/ActionHistoryList';
import { useSettings } from '../../context/SettingsContext';
import { useActiveTenant } from '../../hooks/useActiveTenant';
import CustomInput from '../../components/common/CustomInput';

const CreateRecipePage: React.FC = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { getRelativePath } = useActiveTenant();
    const { id } = useParams();
    const location = useLocation();
    const isEditMode = !!id;
    const queryParams = new URLSearchParams(location.search);
    const preSelectedMenuItemId = queryParams.get('menuItem');
    const returnTo = queryParams.get('returnTo');

    const handleNavigationBack = () => {
        if (returnTo) {
            navigate(getRelativePath(returnTo));
        } else {
            navigate(getRelativePath('/recipes'));
        }
    };

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [trays, setTrays] = useState<any[]>([]);
    const { getUnits, formatCurrency } = useSettings();
    const units = getUnits();

    const [formData, setFormData] = useState({
        menuItem: null as any,
        name: '',
        servingSize: 1,
        ingredients: [{ inventoryItem: null, quantity: 0, unit: units.length > 0 ? units[0].value : 'kg' }],
        preparationTime: 0,
        instructions: '',
        isActive: true,
        actionHistory: [] as any[],
    });

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const fetchedMenuItems = await fetchMenuItems();
            const fetchedInventoryItems = await fetchInventoryItems();
            await fetchTrays();

            if (isEditMode) {
                await fetchRecipe(fetchedMenuItems, fetchedInventoryItems);
            } else if (preSelectedMenuItemId) {
                const matched = fetchedMenuItems.find((m: any) => m._id === preSelectedMenuItemId);
                if (matched) {
                    setFormData(prev => ({
                        ...prev,
                        menuItem: matched,
                        name: `${matched.name} Recipe`
                    }));
                }
            }
            setInitialLoading(false);
            setLoading(false);
        };
        init();
    }, [id]);

    const fetchTrays = async () => {
        try {
            const response = await traysAPI.getAll();
            setTrays(response.data || []);
        } catch (error) {
            console.error('Error fetching trays:', error);
        }
    };

    const fetchMenuItems = async () => {
        try {
            const [menuRes, recipesRes] = await Promise.all([
                menuAPI.getAll(),
                recipesAPI.getAll({ limit: 1000 })
            ]);
            
            const data = menuRes.data;
            const allItems = Array.isArray(data) ? data : (data?.items || []);
            const recipes = recipesRes.data?.data || recipesRes.data || [];
            
            let currentMenuItemId = null;
            if (isEditMode && id) {
                const currentRecipe = recipes.find((r: any) => r._id === id);
                if (currentRecipe) {
                    currentMenuItemId = typeof currentRecipe.menuItem === 'object' ? currentRecipe.menuItem?._id : currentRecipe.menuItem;
                }
            }

            const itemsWithRecipes = new Set(recipes.map((r: any) => 
                typeof r.menuItem === 'object' ? r.menuItem?._id : r.menuItem
            ).filter(Boolean));

            const filteredItems = allItems.filter((item: any) => {
                if (currentMenuItemId && item._id === currentMenuItemId) return true;
                if (item.inventoryTrackingMode === 'direct') return false;
                if (itemsWithRecipes.has(item._id)) return false;
                return true;
            });

            setMenuItems(filteredItems);
            return allItems;
        } catch (error) {
            console.error('Error fetching menu items:', error);
            return [];
        }
    };

    const fetchInventoryItems = async () => {
        try {
            const response = await inventoryAPI.getAll();
            setInventoryItems(response.data || []);
            return response.data || [];
        } catch (error) {
            console.error('Error fetching inventory items:', error);
            return [];
        }
    };

    const fetchRecipe = async (currentMenuItems: any[], currentInventoryItems: any[]) => {
        try {
            const response = await recipesAPI.getOne(id!);
            const recipe = response.data.data || response.data;

            const menuItemId = typeof recipe.menuItem === 'object' ? recipe.menuItem?._id : recipe.menuItem;
            const matchedMenuItem = currentMenuItems.find(
                item => item._id === menuItemId
            );

            const ingredients = (recipe.ingredients || []).map((ing: any) => {
                const ingId = typeof ing.inventoryItem === 'object' ? ing.inventoryItem?._id : ing.inventoryItem;
                const matchedInventoryItem = currentInventoryItems.find(
                    item => item._id === ingId
                );

                return {
                    inventoryItem: matchedInventoryItem || ing.inventoryItem || null,
                    quantity: ing.quantity,
                    unit: ing.unit,
                };
            });

            const formDataUpdate = {
                menuItem: matchedMenuItem || recipe.menuItem || null,
                name: recipe.name,
                servingSize: recipe.servingSize,
                ingredients: ingredients,
                preparationTime: recipe.preparationTime || 0,
                instructions: recipe.instructions || '',
                isActive: recipe.isActive === false || recipe.isActive === 'false' ? false : true,
                actionHistory: recipe.actionHistory || [],
            };

            setFormData(formDataUpdate);
        } catch (error) {
            console.error('Error fetching recipe:', error);
            toast.error('Failed to load recipe');
            handleNavigationBack();
        }
    };

    const handleIngredientChange = (index: number, field: string, value: any) => {
        const newIngredients = [...formData.ingredients];
        newIngredients[index] = { ...newIngredients[index], [field]: value };

        if (field === 'inventoryItem' && value) {
            const itemUnit = value.unit || value.baseUnit || value.unitOfMeasure;
            if (itemUnit) {
                newIngredients[index] = { ...newIngredients[index], unit: itemUnit };
            }
        }

        setFormData({ ...formData, ingredients: newIngredients });
    };

    const addIngredient = () => {
        setFormData({
            ...formData,
            ingredients: [...formData.ingredients, { inventoryItem: null, quantity: 0, unit: units.length > 0 ? units[0].value : 'kg' }],
        });
    };

    const removeIngredient = (index: number) => {
        setFormData({
            ...formData,
            ingredients: formData.ingredients.filter((_, i) => i !== index),
        });
    };

    const handleSubmit = async () => {
        if (!formData.menuItem) {
            toast.error('Please select a menu item');
            return;
        }
        if (!formData.name) {
            toast.error('Recipe name is required');
            return;
        }
        if (formData.ingredients.length === 0 || !formData.ingredients[0].inventoryItem) {
            toast.error('At least one ingredient is required');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                menuItem: formData.menuItem._id || formData.menuItem,
                ingredients: formData.ingredients.map(ing => ({
                    inventoryItem: (ing.inventoryItem as any)?._id || ing.inventoryItem,
                    quantity: ing.quantity,
                    unit: ing.unit,
                })),
            };

            console.log('[DEBUG Frontend] Recipe Payload:', payload);

            if (isEditMode) {
                await recipesAPI.update(id!, payload);
                toast.success('Recipe updated successfully');
            } else {
                await recipesAPI.create(payload);
                toast.success('Recipe created successfully');
            }
            handleNavigationBack();
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} recipe`);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 }, pt: { xs: 1, sm: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 3 } }}>
                <IconButton onClick={handleNavigationBack} sx={{ mr: { xs: 1, sm: 2 } }} size={isMobile ? "small" : "medium"}>
                    <BackIcon fontSize={isMobile ? "small" : "medium"} />
                </IconButton>
                <Typography variant={isMobile ? "h6" : "h4"} fontWeight={800}>
                    {isEditMode ? 'Edit Recipe' : 'Create Recipe'}
                </Typography>
            </Box>

            {/* Basic Info */}
            <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: { xs: 1.5, sm: 3 }, '& .MuiFormLabel-asterisk': { color: 'red' }, borderRadius: { xs: 2, sm: 3 }, boxShadow: theme.shadows[2] }}>
                <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold" gutterBottom sx={{ color: 'primary.main', mb: { xs: 1.5, sm: 2 } }}>
                    Basic Information
                </Typography>
                <Stack spacing={isMobile ? 1.5 : 2}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={isMobile ? 1.5 : 2}>
                        <Autocomplete
                            options={menuItems}
                            getOptionLabel={(option) => option.name || ''}
                            isOptionEqualToValue={(option, value) => option._id === value._id}
                            value={formData.menuItem || null}
                            onChange={(_, newValue) => {
                                setFormData({
                                    ...formData,
                                    menuItem: newValue,
                                    name: newValue ? `${newValue.name} Recipe` : ''
                                });
                            }}
                            fullWidth
                            size={isMobile ? "small" : "medium"}
                            renderInput={(params) => (
                                <TextField {...params} label="Menu Item" placeholder="Select menu item" required />
                            )}
                        />
                        <CustomInput
                            type="alphanumeric"
                            label="Recipe Name"
                            value={formData.name}
                            onChange={(val) => setFormData({ ...formData, name: val })}
                            fullWidth
                            required
                            size={isMobile ? "small" : "medium"}
                        />
                    </Stack>
                    <Stack direction={isMobile ? "column" : "row"} spacing={isMobile ? 1.5 : 2}>
                        <CustomInput
                            type="number"
                            label="Serving Size"
                            value={formData.servingSize}
                            onChange={(val) => setFormData({ ...formData, servingSize: parseInt(val) || 1 })}
                            allowDecimals={false}
                            fullWidth
                            maxLength={4}
                            size={isMobile ? "small" : "medium"}
                        />
                        <CustomInput
                            type="number"
                            label="Preparation Time (minutes)"
                            value={formData.preparationTime}
                            onChange={(val) => setFormData({ ...formData, preparationTime: parseInt(val) || 0 })}
                            allowDecimals={false}
                            fullWidth
                            maxLength={3}
                            size={isMobile ? "small" : "medium"}
                        />
                    </Stack>
                    <FormControlLabel
                        control={
                            <Switch
                                size={isMobile ? "small" : "medium"}
                                checked={!!formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            />
                        }
                        label={<Typography variant={isMobile ? "body2" : "body1"}>Active</Typography>}
                    />
                </Stack>
            </Paper>

            {/* Ingredients */}
            <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: { xs: 1.5, sm: 3 }, borderRadius: { xs: 2, sm: 3 }, boxShadow: theme.shadows[2] }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
                    <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold" sx={{ color: 'primary.main' }}>Ingredients</Typography>
                    <Button 
                        startIcon={<AddIcon />} 
                        onClick={addIngredient} 
                        variant="contained" 
                        size={isMobile ? "small" : "medium"}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                    >
                        {isMobile ? "Add" : "Add Ingredient"}
                    </Button>
                </Box>

                {isMobile ? (
                    <Stack spacing={2}>
                        {formData.ingredients.map((ingredient, index) => (
                            <Paper 
                                variant="outlined" 
                                key={index} 
                                sx={{ 
                                    p: 1.5, 
                                    borderRadius: 2, 
                                    bgcolor: alpha(theme.palette.background.default, 0.5),
                                    position: 'relative',
                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                                }}
                            >
                                <Stack spacing={1.5}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="caption" fontWeight="bold" color="text.secondary">Ingredient #{index + 1}</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {ingredient.inventoryItem && (
                                                <Typography variant="caption" fontWeight="bold" color="primary">
                                                    Cost: {formatCurrency((ingredient.quantity || 0) * ((ingredient.inventoryItem as any).costPrice || 0))}
                                                </Typography>
                                            )}
                                            {formData.ingredients.length > 1 && (
                                                <IconButton size="small" color="error" onClick={() => removeIngredient(index)} sx={{ p: 0.5 }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Box>
                                    
                                    <Autocomplete
                                        options={inventoryItems}
                                        getOptionLabel={(option) => option.name || ''}
                                        isOptionEqualToValue={(option, value) => option._id === value._id}
                                        value={ingredient.inventoryItem || null}
                                        onChange={(_, newValue) => handleIngredientChange(index, 'inventoryItem', newValue)}
                                        size="small"
                                        renderInput={(params) => (
                                            <TextField {...params} label="Inventory Item" placeholder="Search..." required />
                                        )}
                                    />

                                    <Stack direction="row" spacing={1.5}>
                                        <CustomInput
                                            type="number"
                                            label="Quantity"
                                            value={ingredient.quantity}
                                            onChange={(val) => {
                                                const parsedVal = parseFloat(val);
                                                handleIngredientChange(index, 'quantity', Math.max(0, isNaN(parsedVal) ? 0 : parsedVal));
                                            }}
                                            inputProps={{ min: 0 }}
                                            maxLength={4}
                                            size="small"
                                            fullWidth
                                            required
                                        />
                                        <TextField
                                            select
                                            label="Unit"
                                            value={ingredient.unit}
                                            onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                                            size="small"
                                            fullWidth
                                            
                                        >
                                            {units.map((u) => (
                                                <MenuItem key={u.value} value={u.value}>
                                                    {u.label}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Stack>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Inventory Item <Box component="span" sx={{ color: 'error.main' }}>*</Box></TableCell>
                                    <TableCell width={150}>Quantity <Box component="span" sx={{ color: 'error.main' }}>*</Box></TableCell>
                                    <TableCell width={180}>Unit</TableCell>
                                    <TableCell width={100}>Est. Cost</TableCell>
                                    <TableCell width={50}></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {formData.ingredients.map((ingredient, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell>
                                            <Autocomplete
                                                options={inventoryItems}
                                                getOptionLabel={(option) => option.name || ''}
                                                isOptionEqualToValue={(option, value) => option._id === value._id}
                                                value={ingredient.inventoryItem || null}
                                                onChange={(_, newValue) => handleIngredientChange(index, 'inventoryItem', newValue)}
                                                renderInput={(params) => (
                                                    <TextField {...params} placeholder="Select inventory item" size="small" />
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <CustomInput
                                                type="number"
                                                value={ingredient.quantity}
                                                onChange={(val) => {
                                                    const parsedVal = parseFloat(val);
                                                    handleIngredientChange(index, 'quantity', Math.max(0, isNaN(parsedVal) ? 0 : parsedVal));
                                                }}
                                                inputProps={{ min: 0 }}
                                                maxLength={4}
                                                size="small"
                                                fullWidth
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                select
                                                value={ingredient.unit}
                                                onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                                                size="small"
                                                fullWidth
                                                
                                            >
                                                {units.map((u) => (
                                                    <MenuItem key={u.value} value={u.value}>
                                                        {u.label}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold" color="primary">
                                                {ingredient.inventoryItem ? formatCurrency((ingredient.quantity || 0) * ((ingredient.inventoryItem as any).costPrice || 0)) : formatCurrency(0)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {formData.ingredients.length > 1 && (
                                                <IconButton size="small" color="error" onClick={() => removeIngredient(index)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Tray Options Information Section */}
            {formData.menuItem && formData.menuItem.trayOptions && formData.menuItem.trayOptions.length > 0 && (
                <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: { xs: 1.5, sm: 3 }, borderRadius: { xs: 2, sm: 3 }, boxShadow: theme.shadows[2] }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <TrayIcon color="primary" fontSize={isMobile ? "small" : "medium"} />
                        <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold">Configured Tray Options</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                        This item is available in following tray sizes for catering/bulk orders.
                    </Typography>

                    <Grid container spacing={isMobile ? 1.5 : 2}>
                        {formData.menuItem.trayOptions.map((opt: any, idx: number) => {
                            const trayInfo = trays.find(t => t._id === opt.tray);
                            if (!trayInfo) return null;

                            return (
                                <Grid item xs={12} sm={6} md={4} key={idx}>
                                    <Paper variant="outlined" sx={{ p: isMobile ? 1.5 : 2, bgcolor: alpha(theme.palette.background.default, 0.4), borderRadius: 2 }}>
                                        <Typography variant="body2" fontWeight="bold" color="primary">
                                            {trayInfo.name}
                                        </Typography>
                                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                                            <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography component="span">Serves:</Typography> <Box component="span" sx={{ fontWeight: 'bold' }}>~{opt.servingSize || 1} people</Box>
                                            </Typography>
                                            <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography component="span">Price:</Typography> <Box component="span" sx={{ fontWeight: 'bold' }}>{formatCurrency(opt.price)}</Box>
                                            </Typography>
                                        </Stack>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>

                    <Box sx={{ mt: isMobile ? 2 : 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <CalculateIcon color="secondary" fontSize={isMobile ? "small" : "medium"} />
                            <Typography variant={isMobile ? "body2" : "subtitle1"} fontWeight="bold">Material Preview</Typography>
                        </Box>
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : 'inherit' }}>Ingredient</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : 'inherit' }}>Base ({formData.servingSize})</TableCell>
                                        {formData.menuItem.trayOptions.map((opt: any, idx: number) => {
                                            const t = trays.find(tr => tr._id === opt.tray);
                                            return t ? <TableCell key={idx} align="right" sx={{ fontWeight: 'bold', fontSize: isMobile ? '0.75rem' : 'inherit' }}>{t.name}</TableCell> : null;
                                        })}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {formData.ingredients.map((ing, iIdx) => {
                                        if (!ing.inventoryItem) return null;
                                        return (
                                            <TableRow key={iIdx}>
                                                <TableCell sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>{(ing.inventoryItem as any).name}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>{ing.quantity} {ing.unit}</TableCell>
                                                {formData.menuItem.trayOptions.map((opt: any, tIdx: number) => {
                                                    const t = trays.find(tr => tr._id === opt.tray);
                                                    if (!t) return null;
                                                    const recipeServings = formData.servingSize || 1;
                                                    const trayServings = opt.servingSize || 1;
                                                    const ratio = trayServings / recipeServings;
                                                    const scaledQty = (ing.quantity * ratio).toFixed(2);
                                                    return <TableCell key={tIdx} align="right" sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}><Box component="span" sx={{ fontWeight: 'bold' }}>{scaledQty}</Box> {ing.unit}</TableCell>;
                                                })}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Paper>
            )}

            {/* Instructions */}
            <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: { xs: 1.5, sm: 3 }, borderRadius: { xs: 2, sm: 3 }, boxShadow: theme.shadows[2] }}>
                <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold" gutterBottom sx={{ color: 'primary.main', mb: isMobile ? 1.5 : 2 }}>
                    Instructions
                </Typography>
                <CustomInput
                    type="textarea"
                    label="Preparation Instructions"
                    value={formData.instructions}
                    onChange={(val) => setFormData({ ...formData, instructions: val })}
                    multiline
                    rows={isMobile ? 3 : 5}
                    fullWidth
                    maxLength={1000}
                    showCounter={true}
                    size={isMobile ? "small" : "medium"}
                    placeholder="Enter step-by-step preparation instructions..."
                />
            </Paper>

            {/* History */}
            {isEditMode && (
                <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: { xs: 1.5, sm: 3 }, borderRadius: { xs: 2, sm: 3 }, boxShadow: theme.shadows[2] }}>
                    <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold" gutterBottom>
                        History
                    </Typography>
                    <ActionHistoryList history={formData.actionHistory || []} emptyMessage="No history for this recipe." />
                </Paper>
            )}

            {/* Actions */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2, mb: 4 }}>
                <Button fullWidth variant="outlined" onClick={handleNavigationBack} disabled={loading} sx={{ borderRadius: 2, fontWeight: 'bold' }}>
                    Cancel
                </Button>
                <Button fullWidth variant="contained" onClick={handleSubmit} disabled={loading} sx={{ borderRadius: 2, fontWeight: 'bold' }}>
                    {isEditMode ? 'Update Recipe' : 'Create Recipe'}
                </Button>
            </Stack>
        </Box>
    );
};

export default CreateRecipePage;
