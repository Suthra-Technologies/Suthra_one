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

const CreateRecipePage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const isEditMode = !!id;
    const queryParams = new URLSearchParams(location.search);
    const preSelectedMenuItemId = queryParams.get('menuItem');

    const [loading, setLoading] = useState(false);
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
            const response = await menuAPI.getAll();
            setMenuItems(response.data || []);
            return response.data || [];
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
            // The API returns { statusCode: 200, data: { ...recipe } }
            // So response.data is the wrapper, and response.data.data is the actual recipe.
            const recipe = response.data.data || response.data;


            console.log('INIT DEBUG: Fetched Recipe Data:', recipe);
            console.log('INIT DEBUG: Current Menu Items:', currentMenuItems.length);
            console.log('INIT DEBUG: Current Inventory Items:', currentInventoryItems.length);

            // Find matching menu item from the fetched list
            const menuItemId = typeof recipe.menuItem === 'object' ? recipe.menuItem?._id : recipe.menuItem;
            const matchedMenuItem = currentMenuItems.find(
                item => item._id === menuItemId
            );
            console.log('INIT DEBUG: Matched Menu Item:', matchedMenuItem);

            const ingredients = (recipe.ingredients || []).map((ing: any) => {
                const ingId = typeof ing.inventoryItem === 'object' ? ing.inventoryItem?._id : ing.inventoryItem;
                const matchedInventoryItem = currentInventoryItems.find(
                    item => item._id === ingId
                );

                if (!matchedInventoryItem) {
                    console.warn('INIT DEBUG: No matching inventory item found for ID:', ingId);
                }

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
                isActive: recipe.isActive,
                actionHistory: recipe.actionHistory || [],
            };

            console.log('INIT DEBUG: Final formData Update:', formDataUpdate);
            setFormData(formDataUpdate);
        } catch (error) {
            console.error('Error fetching recipe:', error);
            toast.error('Failed to load recipe');
            // Don't navigate away immediately so we can see the console
            // navigate('/admin/recipes'); 
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

            if (isEditMode) {
                await recipesAPI.update(id!, payload);
                toast.success('Recipe updated successfully');
            } else {
                await recipesAPI.create(payload);
                toast.success('Recipe created successfully');
            }
            navigate('/admin/recipes');
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} recipe`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <IconButton onClick={() => navigate('/admin/recipes')} sx={{ mr: 2 }}>
                    <BackIcon />
                </IconButton>
                <Typography variant="h4" fontWeight="bold">
                    {isEditMode ? 'Edit Recipe' : 'Create Recipe'}
                </Typography>
            </Box>

            {/* Basic Info */}
            <Paper sx={{ p: 3, mb: 3, '& .MuiFormLabel-asterisk': { color: 'red' } }}>
                <Typography variant="h6" gutterBottom>
                    Basic Information
                </Typography>
                <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
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
                            renderInput={(params) => (
                                <TextField {...params} label="Menu Item" placeholder="Select menu item" required />
                            )}
                        />
                        <TextField
                            label="Recipe Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            fullWidth
                            required
                        />
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Serving Size"
                            type="number"
                            value={formData.servingSize}
                            onChange={(e) => setFormData({ ...formData, servingSize: parseInt(e.target.value) || 1 })}
                            fullWidth
                        />
                        <TextField
                            label="Preparation Time (minutes)"
                            type="number"
                            value={formData.preparationTime}
                            onChange={(e) => setFormData({ ...formData, preparationTime: parseInt(e.target.value) || 0 })}
                            fullWidth
                        />
                    </Stack>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={!!formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            />
                        }
                        label="Active"
                    />
                </Stack>
            </Paper>

            {/* Ingredients */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Ingredients</Typography>
                    <Button startIcon={<AddIcon />} onClick={addIngredient} variant="outlined" size="small">
                        Add Ingredient
                    </Button>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Inventory Item <Box component="span" sx={{ color: 'error.main' }}>*</Box></TableCell>
                                <TableCell width={150}>Quantity <Box component="span" sx={{ color: 'error.main' }}>*</Box></TableCell>
                                <TableCell width={180}>Unit</TableCell>
                                <TableCell width={50}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {formData.ingredients.map((ingredient, index) => (
                                <TableRow key={index}>
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
                                        <TextField
                                            type="number"
                                            value={ingredient.quantity}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                handleIngredientChange(index, 'quantity', Math.max(0, isNaN(val) ? 0 : val));
                                            }}
                                            inputProps={{ min: 0 }}
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
                                            SelectProps={{ native: true }}
                                        >
                                            {units.map((u) => (
                                                <option key={u.value} value={u.value}>
                                                    {u.label}
                                                </option>
                                            ))}
                                        </TextField>
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
            </Paper>

            {/* Tray Options Information Section */}
            {formData.menuItem && formData.menuItem.trayOptions && formData.menuItem.trayOptions.length > 0 && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <TrayIcon color="primary" />
                        <Typography variant="h6">Configured Tray Options</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        This item is available in following tray sizes for catering/bulk orders.
                    </Typography>

                    <Grid container spacing={2}>
                        {formData.menuItem.trayOptions.map((opt: any, idx: number) => {
                            const trayInfo = trays.find(t => t._id === opt.tray);
                            if (!trayInfo) return null;

                            return (
                                <Grid item xs={12} sm={6} md={4} key={idx}>
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fbfbfb', borderRadius: 2 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" color="primary">
                                            {trayInfo.name}
                                        </Typography>
                                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                                            <Typography variant="body2">Serves: <strong>~{opt.servingSize || 1} people</strong></Typography>
                                            <Typography variant="body2">Price: <strong>{formatCurrency(opt.price)}</strong></Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Dimensions: {trayInfo.width || '?'}" x {trayInfo.length || '?'}" x {trayInfo.depth || '?'}"
                                            </Typography>
                                        </Stack>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>

                    <Box sx={{ mt: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <CalculateIcon color="secondary" />
                            <Typography variant="subtitle1" fontWeight="bold">Raw Material Requirement Preview</Typography>
                        </Box>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead sx={{ bgcolor: '#eee' }}>
                                    <TableRow>
                                        <TableCell>Ingredient</TableCell>
                                        <TableCell align="right">Base Qty ({formData.servingSize} serv)</TableCell>
                                        {formData.menuItem.trayOptions.map((opt: any, idx: number) => {
                                            const t = trays.find(tr => tr._id === opt.tray);
                                            return t ? <TableCell key={idx} align="right">{t.name} <Typography component="span" variant="caption" sx={{ display: 'block' }}>({opt.servingSize || 1} serv)</Typography></TableCell> : null;
                                        })}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {formData.ingredients.map((ing, iIdx) => {
                                        if (!ing.inventoryItem) return null;
                                        return (
                                            <TableRow key={iIdx}>
                                                <TableCell>{(ing.inventoryItem as any).name}</TableCell>
                                                <TableCell align="right">{ing.quantity} {ing.unit}</TableCell>
                                                {formData.menuItem.trayOptions.map((opt: any, tIdx: number) => {
                                                    const t = trays.find(tr => tr._id === opt.tray);
                                                    if (!t) return null;
                                                    const recipeServings = formData.servingSize || 1;
                                                    const trayServings = opt.servingSize || 1;
                                                    const ratio = trayServings / recipeServings;
                                                    const scaledQty = (ing.quantity * ratio).toFixed(2);
                                                    return <TableCell key={tIdx} align="right"><strong>{scaledQty}</strong> {ing.unit}</TableCell>;
                                                })}
                                            </TableRow>
                                        );
                                    })}
                                    {formData.ingredients.filter(i => i.inventoryItem).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={formData.menuItem.trayOptions.length + 2} align="center" sx={{ py: 2 }}>
                                                Add ingredients above to see scaling requirements
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Paper>
            )}

            {/* Instructions */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Instructions
                </Typography>
                <TextField
                    label="Preparation Instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    multiline
                    rows={5}
                    fullWidth
                    placeholder="Enter step-by-step preparation instructions..."
                />
            </Paper>

            {/* History */}
            {isEditMode && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        History
                    </Typography>
                    <ActionHistoryList history={formData.actionHistory || []} emptyMessage="No history for this recipe." />
                </Paper>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button onClick={() => navigate('/admin/recipes')} disabled={loading}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading}>
                    {isEditMode ? 'Update Recipe' : 'Create Recipe'}
                </Button>
            </Box>
        </Box>
    );
};

export default CreateRecipePage;
