import React, { useEffect, useState } from 'react';
import {
    Container,
    Typography,
    Grid,
    Card,
    CardMedia,
    Box,
    IconButton,
    Dialog,
    DialogContent,
    useTheme,
    alpha
} from '@mui/material';
import {
    Close as CloseIcon,
    Collections as CollectionsIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { galleryAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { CardGridSkeleton } from '../../components/common/PageSkeleton';

const GalleryPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { tenantSlug } = useAuth();
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        const fetchGallery = async () => {
            if (!tenantSlug) return;
            try {
                setLoading(true);
                const response = await galleryAPI.getPublic(tenantSlug);
                setImages(response.data || []);
            } catch (error) {
                console.error('Failed to fetch gallery:', error);
                toast.error('Could not load gallery images');
            } finally {
                setLoading(false);
            }
        };

        fetchGallery();
    }, [tenantSlug]);

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
                <CardGridSkeleton count={6} cardHeight={300} />
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
            <Box sx={{ mb: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                    <ArrowBackIcon />
                </IconButton>
                <Box>
                    <Typography variant="h3" fontWeight={800} gutterBottom sx={{ 
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Restaurant Gallery
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Take a look at our delicious offerings and atmosphere
                    </Typography>
                </Box>
            </Box>

            {images.length === 0 ? (
                <Box sx={{ 
                    textAlign: 'center', 
                    py: 10, 
                    px: 3, 
                    borderRadius: 4, 
                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                    border: '2px dashed',
                    borderColor: 'divider'
                }}>
                    <CollectionsIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        No images found in the gallery yet.
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {images.map((image) => (
                        <Grid item xs={12} sm={6} md={4} key={image._id}>
                            <Card 
                                sx={{ 
                                    height: '100%', 
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    '&:hover': {
                                        transform: 'scale(1.03)',
                                        boxShadow: `0 20px 40px ${alpha(theme.palette.common.black, 0.15)}`,
                                        '& .overlay': { opacity: 1 }
                                    }
                                }}
                                onClick={() => setSelectedImage(image.imageUrl)}
                            >
                                <CardMedia
                                    component="img"
                                    height="300"
                                    image={image.imageUrl}
                                    alt={image.title || 'Gallery Image'}
                                    sx={{ objectFit: 'cover' }}
                                />
                                <Box className="overlay" sx={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    bgcolor: alpha(theme.palette.common.black, 0.4),
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-end',
                                    p: 3,
                                    opacity: 0,
                                    transition: 'opacity 0.3s'
                                }}>
                                    <Typography variant="h6" color="white" fontWeight={700}>
                                        {image.title}
                                    </Typography>
                                    {image.description && (
                                        <Typography variant="body2" color="rgba(255,255,255,0.8)">
                                            {image.description}
                                        </Typography>
                                    )}
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Dialog
                fullWidth
                maxWidth="lg"
                open={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                PaperProps={{
                    sx: {
                        bgcolor: 'transparent',
                        boxShadow: 'none',
                        overflow: 'hidden'
                    }
                }}
            >
                <Box sx={{ position: 'relative', textAlign: 'center' }}>
                    <IconButton
                        onClick={() => setSelectedImage(null)}
                        sx={{
                            position: 'absolute',
                            right: 16,
                            top: 16,
                            color: 'white',
                            bgcolor: 'rgba(0,0,0,0.5)',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                            zIndex: 1
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    {selectedImage && (
                        <img
                            src={selectedImage}
                            alt="Preview"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                borderRadius: '12px',
                                boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                            }}
                        />
                    )}
                </Box>
            </Dialog>
        </Container>
    );
};

export default GalleryPage;
