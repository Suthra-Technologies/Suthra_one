import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Grid,
    Card,
    CardContent,
    Box,
    Typography,
    Chip,
    CardActions,
    Tooltip,
    IconButton,
    useTheme,
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface SortableCategoryItemProps {
    category: any;
    menuItems: any[];
    subcategories: any[];
    itemBelongsToCategory: (item: any, category: any) => boolean;
    getSubcategoryParentId: (subcategory: any) => string;
    getSubcategoryId: (subcategory: any) => string;
    handleOpenCategoryDialog: (categoryOrSubcategory?: any, parentId?: string) => void;
    handleDeleteCategory: (category: any) => void;
}

export function SortableCategoryItem({
    category,
    menuItems,
    subcategories,
    itemBelongsToCategory,
    getSubcategoryParentId,
    getSubcategoryId,
    handleOpenCategoryDialog,
    handleDeleteCategory,
}: SortableCategoryItemProps) {
    const theme = useTheme();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
        position: 'relative' as const,
    };

    return (
        <Grid item xs={12} sm={6} md={4} ref={setNodeRef} style={style}>
            <Card
                {...attributes}
                {...listeners}
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'grab',
                    '&:active': { cursor: 'grabbing' },
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    ...(isDragging ? { boxShadow: theme.shadows[12] } : {}),
                    '&:hover': {
                        transform: isDragging ? 'none' : 'translateY(-4px)',
                        boxShadow: theme.shadows[8],
                    },
                }}
            >
                <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mr: 1,
                                color: 'text.secondary',
                            }}
                        >
                            <DragIndicatorIcon />
                        </Box>
                        <CategoryIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6">{category.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {category.itemCount ?? menuItems.filter(item => itemBelongsToCategory(item, category)).length} items
                            </Typography>
                        </Box>
                    </Box>
                    {category.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {category.description}
                        </Typography>
                    )}

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {subcategories
                            .filter((subcategory) => getSubcategoryParentId(subcategory) === category._id)
                            .map((subcategory) => (
                                <Chip
                                    key={subcategory._id}
                                    label={`${subcategory.name} (${menuItems.filter((item) => getSubcategoryId(item.subcategory) === subcategory._id).length})`}
                                    variant="outlined"
                                    onClick={() => handleOpenCategoryDialog(subcategory)}
                                    onDelete={() => handleDeleteCategory(subcategory)}
                                    deleteIcon={<DeleteIcon />}
                                    sx={{ borderRadius: '10px' }}
                                />
                            ))}
                        {subcategories.filter((subcategory) => getSubcategoryParentId(subcategory) === category._id).length === 0 && (
                            <Typography variant="caption" color="text.secondary">
                                No subcategories yet
                            </Typography>
                        )}
                    </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                    <Tooltip title="Add Subcategory">
                        <IconButton size="small" color="secondary" onClick={() => handleOpenCategoryDialog(undefined, category._id)}>
                            <AddIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => handleOpenCategoryDialog(category)}>
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDeleteCategory(category)}>
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </CardActions>
            </Card>
        </Grid>
    );
}
