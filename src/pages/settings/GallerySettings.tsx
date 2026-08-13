import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardMedia,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Switch,
    TextField,
    Typography,
    CircularProgress,
    Stack,
    Tooltip,
    alpha,
    Paper
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    Add as AddIcon,
    CloudUpload as UploadIcon,
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { galleryAPI, uploadAPI } from '../../services/api';
import { CardGridSkeleton } from '../../components/common/PageSkeleton';

interface GalleryItem {
    _id: string;
    imageUrl: string;
    title?: string;
    description?: string;
    isActive: boolean;
    sortOrder: number;
}

const GallerySettings: React.FC = () => {
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<GalleryItem> | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchGallery = async () => {
        try {
            setLoading(true);
            const res = await galleryAPI.getAll();
            setItems(res.data || []);
        } catch (error) {
            console.error('Failed to fetch gallery:', error);
            toast.error('Failed to load gallery items');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGallery();
    }, []);

    const handleOpenDialog = (item?: GalleryItem) => {
        setEditingItem(item || {
            imageUrl: '',
            title: '',
            description: '',
            isActive: true,
            sortOrder: items.length
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingItem(null);
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (uploading) return;
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const res = await uploadAPI.uploadImage(file);
            setEditingItem(prev => ({ ...prev, imageUrl: res.data.url }));
            toast.success('Image uploaded successfully', { position: 'top-center', style: { marginTop: '90px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, background: '#333', color: '#fff' } });
        } catch (error) {
            console.error('Image upload failed:', error);
            toast.error('Failed to upload image', { position: 'top-center', style: { marginTop: '90px', fontFamily: "'Outfit', sans-serif", fontWeight: 700 } });
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (uploading) return;
        if (!editingItem?.imageUrl) {
            toast.error('Please upload an image');
            return;
        }

        try {
            if (editingItem._id) {
                await galleryAPI.update(editingItem._id, editingItem);
                toast.success('Gallery item updated', { position: 'top-center', style: { marginTop: '90px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, background: '#333', color: '#fff' } });
            } else {
                await galleryAPI.create(editingItem);
                toast.success('Gallery item added', { position: 'top-center', style: { marginTop: '90px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, background: '#333', color: '#fff' } });
            }
            handleCloseDialog();
            fetchGallery();
        } catch (error) {
            console.error('Failed to save gallery item:', error);
            toast.error('Failed to save gallery item');
        }
    };

    const handleDelete = async (id: string) => {
        if (isProcessing) return;
        if (!window.confirm('Are you sure you want to delete this image?')) return;

        try {
            setIsProcessing(true);
            await galleryAPI.delete(id);
            toast.success('Image deleted');
            fetchGallery();
        } catch (error) {
            console.error('Failed to delete image:', error);
            toast.error('Failed to delete image');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleToggleActive = async (item: GalleryItem) => {
        if (isProcessing) return;
        try {
            setIsProcessing(true);
            await galleryAPI.update(item._id, { isActive: !item.isActive });
            setItems(prev => prev.map(i => i._id === item._id ? { ...i, isActive: !i.isActive } : i));
            toast.success(`Image ${!item.isActive ? 'activated' : 'deactivated'}`);
        } catch (error) {
            console.error('Failed to toggle status:', error);
            toast.error('Failed to update status');
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading && items.length === 0) {
        return <CardGridSkeleton count={6} cardHeight={280} />;
    }

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Restaurant Gallery</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
                        Manage images displayed in the customer-facing app.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{ 
                        borderRadius: 2.5, 
                        fontWeight: 800, 
                        fontFamily: "'Outfit', sans-serif",
                        px: 2,
                        py: 0.8,
                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                    }}
                >
                    Add Image
                </Button>
            </Stack>

            {items.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}>
                    <Typography color="text.secondary">No images in gallery yet.</Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        sx={{ 
                            mt: 2, 
                            borderRadius: 2.5,
                            fontWeight: 700,
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: '0.75rem'
                        }}
                    >
                        Upload First Image
                    </Button>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {items.map((item) => (
                        <Grid item xs={12} sm={6} md={4} key={item._id}>
                            <Card sx={{
                                borderRadius: 3,
                                overflow: 'hidden',
                                transition: 'transform 0.2s',
                                '&:hover': { transform: 'translateY(-4px)' },
                                position: 'relative',
                                border: '1px solid',
                                borderColor: item.isActive ? alpha('#4F46E5', 0.1) : 'divider'
                            }}>
                                <CardMedia
                                    component="img"
                                    height="180"
                                    image={item.imageUrl}
                                    alt={item.title}
                                    sx={{ bgcolor: 'grey.100' }}
                                />
                                <Box sx={{
                                    position: 'absolute',
                                    top: 10,
                                    right: 10,
                                    zIndex: 1
                                }}>
                                    <Tooltip title={item.isActive ? "Active" : "Inactive"}>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleToggleActive(item)}
                                            sx={{
                                                bgcolor: item.isActive ? 'success.main' : 'grey.500',
                                                color: 'white',
                                                '&:hover': { bgcolor: item.isActive ? 'success.dark' : 'grey.600' }
                                            }}
                                        >
                                            {item.isActive ? <CheckCircleIcon fontSize="small" /> : <UncheckedIcon fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                                <CardContent sx={{ pb: 1 }}>
                                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                                        {item.title || 'Untitled Image'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{
                                        height: 40,
                                        overflow: 'hidden',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        fontFamily: "'Outfit', sans-serif"
                                    }}>
                                        {item.description || 'No description'}
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                                        Order: {item.sortOrder}
                                    </Typography>
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                                    <IconButton size="small" onClick={() => handleOpenDialog(item)} color="primary">
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleDelete(item._id)} color="error">
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingItem?._id ? 'Edit Gallery Item' : 'Add Gallery Item'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box>
                            <input
                                accept="image/*"
                                style={{ display: 'none' }}
                                id="gallery-image-upload"
                                type="file"
                                onChange={handleImageUpload}
                            />
                            <label htmlFor="gallery-image-upload">
                                <Box sx={{
                                    border: '2px dashed',
                                    borderColor: editingItem?.imageUrl ? 'success.light' : 'divider',
                                    borderRadius: 3,
                                    p: 3,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&:hover': { bgcolor: alpha('#4F46E5', 0.04) }
                                }}>
                                    {uploading ? (
                                        <CircularProgress size={24} />
                                    ) : editingItem?.imageUrl ? (
                                        <Box>
                                            <img
                                                src={editingItem.imageUrl}
                                                alt="Preview"
                                                style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 }}
                                            />
                                            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                                                Click to change image
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <>
                                            <UploadIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="body1">Click to Upload Image</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Supports JPG, PNG (Max 10MB)
                                            </Typography>
                                        </>
                                    )}
                                </Box>
                            </label>
                        </Box>

                        <TextField
                            fullWidth
                            label="Title"
                            value={editingItem?.title || ''}
                            onChange={(e) => setEditingItem(prev => ({ ...prev, title: e.target.value }))}
                        />

                        <TextField
                            fullWidth
                            label="Description"
                            multiline
                            rows={3}
                            value={editingItem?.description || ''}
                            onChange={(e) => setEditingItem(prev => ({ ...prev, description: e.target.value }))}
                        />

                        <TextField
                            fullWidth
                            type="number"
                            label="Sort Order"
                            value={editingItem?.sortOrder ?? 0}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setEditingItem(prev => ({
                                    ...prev,
                                    sortOrder: isNaN(val) ? 0 : Math.max(0, val)
                                }));
                            }}
                            inputProps={{ min: 0 }}
                            helperText="Priority of the image (0 or higher). Lower numbers appear first."
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: { xs: 2, sm: 3 }, gap: 1 }}>
                    <Button 
                        size="small" 
                        onClick={handleCloseDialog}
                        sx={{ fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleSave}
                        disabled={uploading || !editingItem?.imageUrl}
                        sx={{ 
                            borderRadius: 2,
                            fontWeight: 800,
                            fontFamily: "'Outfit', sans-serif",
                            px: 3,
                            boxShadow: `0 4px 12px ${alpha('#4F46E5', 0.2)}`
                        }}
                    >
                        {editingItem?._id ? 'Save Changes' : 'Add to Gallery'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GallerySettings;
