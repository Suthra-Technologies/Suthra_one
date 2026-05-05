import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    Card,
    CardContent,
    Grid,
    Stack,
    CircularProgress,
    Pagination,
    Tooltip,
    TextField,
    useTheme,
    useMediaQuery,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    Restaurant as RestaurantIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { recipesAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';
import { useActiveTenant } from '../../hooks/useActiveTenant';

interface RecipesPageProps {
    hideHeader?: boolean;
}

const RecipesPage: React.FC<RecipesPageProps> = ({ hideHeader }) => {
    const navigate = useNavigate();
    const { getRelativePath } = useActiveTenant();
    const { formatCurrency } = useSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const headingFontSize = { xs: '1.12rem', sm: '1.4rem', md: '2.125rem' };
    const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };
    const [recipes, setRecipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecipes, setTotalRecipes] = useState(0);
    const [search, setSearch] = useState('');

    // Delete Confirmation State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [recipeToDelete, setRecipeToDelete] = useState<{ id: string, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchRecipes = async () => {
        setLoading(true);
        try {
            const limit = 50;
            const response = await recipesAPI.getAll({ page, limit, search });
            setRecipes(response.data.data || []);
            setTotalRecipes(response.data.total);
            setTotalPages(Math.ceil(response.data.total / limit));
        } catch (error) {
            console.error('Error fetching recipes:', error);
            toast.error('Failed to load recipes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecipes();
    }, [page, search]);

    const handleDeleteClick = (id: string, name: string) => {
        setRecipeToDelete({ id, name });
        setDeleteDialogOpen(true);
    };

    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setRecipeToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!recipeToDelete) return;

        setIsDeleting(true);
        try {
            await recipesAPI.delete(recipeToDelete.id);
            toast.success('Recipe deleted successfully');
            setDeleteDialogOpen(false);
            setRecipeToDelete(null);
            fetchRecipes();
        } catch (error) {
            toast.error('Failed to delete recipe');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRecalculateCost = async (id: string, name: string) => {
        try {
            await recipesAPI.recalculateCost(id);
            toast.success(`Cost recalculated for "${name}"`);
            fetchRecipes();
        } catch (error) {
            toast.error('Failed to recalculate cost');
        }
    };

    return (
        <Box sx={{ p: hideHeader ? 0 : { xs: 1.25, sm: 3 } }}>
            {!hideHeader && (
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, sm: 3 }, gap: { xs: 1.25, sm: 0 } }}>
                    <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, width: { xs: '100%', sm: 'auto' } }}>
                        <Typography
                            variant="h4"
                            fontWeight="bold"
                            sx={{ fontSize: headingFontSize, color: { xs: '#000', sm: 'text.primary' } }}
                        >
                            Recipes
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: bodyFontSize }}>
                            Total Records: {totalRecipes}
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate(getRelativePath('/recipes/create'))}
                        sx={{ width: { xs: '100%', sm: 'auto' }, fontSize: bodyFontSize }}
                    >
                        Create Recipe
                    </Button>
                </Box>
            )}

            {/* Search */}
            <Paper sx={{ p: { xs: 1.25, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
                <TextField
                    label="Search Recipes"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or instructions..."
                    fullWidth
                    size="small"
                />
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress />
                </Box>
            ) : recipes.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: { xs: 3.5, sm: 5 } }}>
                    <Typography color="textSecondary" sx={{ fontSize: bodyFontSize }}>No recipes found</Typography>
                    <Button
                        startIcon={<AddIcon />}
                        onClick={() => navigate(getRelativePath('/recipes/create'))}
                        sx={{ mt: 2, fontSize: bodyFontSize }}
                    >
                        Create Your First Recipe
                    </Button>
                </Box>
            ) : isMobile ? (
                // Mobile Card View
                <Stack spacing={1.2}>
                    {recipes.map((recipe) => (
                        <Card key={recipe._id}>
                            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.1}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <RestaurantIcon color="action" fontSize="small" />
                                        <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '0.9rem' }}>
                                            {recipe.name}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={recipe.isActive ? 'Active' : 'Inactive'}
                                        size="small"
                                        color={recipe.isActive ? 'success' : 'default'}
                                    />
                                </Stack>

                                <Grid container spacing={0.8} mb={1.2}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Menu Item</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{recipe.menuItem?.name || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Total Cost</Typography>
                                        <Typography variant="body2" fontWeight="bold" color="primary" sx={{ fontSize: '0.78rem' }}>
                                            {formatCurrency(recipe.totalCost || 0)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Serving Size</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{recipe.servingSize}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Ingredients</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{recipe.ingredients?.length || 0}</Typography>
                                    </Grid>
                                </Grid>

                                <Stack direction="row" spacing={0.6} justifyContent="flex-end" sx={{ mt: 0.6, borderTop: 1, borderColor: 'divider', pt: 1 }}>
                                    <Tooltip title="Recalculate Cost">
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleRecalculateCost(recipe._id, recipe.name)}
                                        >
                                            <RefreshIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Edit">
                                        <IconButton
                                            size="small"
                                            onClick={() => navigate(getRelativePath(`/recipes/${recipe._id}/edit`))}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteClick(recipe._id, recipe.name)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            ) : (
                // Desktop Table View
                <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell><strong>Recipe Name</strong></TableCell>
                                <TableCell><strong>Menu Item</strong></TableCell>
                                <TableCell><strong>Ingredients</strong></TableCell>
                                <TableCell><strong>Serving Size</strong></TableCell>
                                <TableCell><strong>Total Cost</strong></TableCell>
                                <TableCell><strong>Cost/Serving</strong></TableCell>
                                <TableCell><strong>Prep Time</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell align="right"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {recipes.map((recipe) => (
                                <TableRow key={recipe._id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <RestaurantIcon color="action" fontSize="small" />
                                            <Typography variant="body2" fontWeight="bold">
                                                {recipe.name}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {recipe.menuItem?.name || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={`${recipe.ingredients?.length || 0} ingredients`}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>{recipe.servingSize}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold" color="primary">
                                            {formatCurrency(recipe.totalCost || 0)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrency(recipe.costPerServing || 0)}
                                    </TableCell>
                                    <TableCell>
                                        {recipe.preparationTime ? `${recipe.preparationTime} min` : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={recipe.isActive ? 'Active' : 'Inactive'}
                                            size="small"
                                            color={recipe.isActive ? 'success' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Recalculate Cost">
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleRecalculateCost(recipe._id, recipe.name)}
                                            >
                                                <RefreshIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Edit">
                                            <IconButton
                                                size="small"
                                                onClick={() => navigate(getRelativePath(`/recipes/${recipe._id}/edit`))}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDeleteClick(recipe._id, recipe.name)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Pagination */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                    color="primary"
                />
            </Box>
            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleCancelDelete}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        width: '100%',
                        maxWidth: 400
                    }
                }}
            >
                <DialogTitle id="delete-dialog-title" sx={{ fontWeight: 'bold' }}>
                    Confirm Delete
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        Are you sure you want to delete the recipe <strong>"{recipeToDelete?.name}"</strong>? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button onClick={handleCancelDelete} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        color="error"
                        variant="contained"
                        disabled={isDeleting}
                        startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RecipesPage;
