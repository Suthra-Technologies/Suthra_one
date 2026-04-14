import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Button,
    IconButton,
    Badge,
    Chip,
    useTheme,
    useMediaQuery,
    Paper,
    Divider,
    Container,
    alpha,
    CircularProgress,
    Fade,
    Zoom,
    Dialog,
    DialogTitle,
    DialogContent,
    Stack,
} from '@mui/material';
import {
    Add as AddIcon,
    Remove as RemoveIcon,
    ShoppingCart as CartIcon,
    ArrowForwardIos as ChevronIcon,
    LocalFireDepartment as HotIcon,
    RestaurantMenu as MenuIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { menuAPI, ordersAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { useGuestCart } from '../../context/GuestCartContext';
import { useActiveTenant } from '../../hooks/useActiveTenant';

interface MenuItem {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: string | { _id: string; name: string };
    image?: string;
    isAvailable: boolean;
    foodType?: 'veg' | 'non-veg';
    isSpiceLevelAvailable?: boolean;
    spiceLevels?: string[];
}

interface CartItem extends MenuItem {
    quantity: number;
    cartId: string;
    spiceLevel?: string;
}

const DietarySymbol = ({ type }: { type?: 'veg' | 'non-veg' }) => {
    if (!type) return null;
    const isVeg = type === 'veg';
    const color = isVeg ? '#24a159' : '#b22d2d'; // Slightly richer colors
    return (
        <Box sx={{
            border: `2px solid ${color}`,
            width: 15,
            height: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            borderRadius: '2px',
            mr: 1.2
        }}>
            <Box sx={{
                width: isVeg ? 7.5 : 9,
                height: isVeg ? 7.5 : 9,
                borderRadius: isVeg ? '50%' : '1px',
                bgcolor: color,
                clipPath: isVeg ? 'none' : 'polygon(50% 10%, 0% 100%, 100% 100%)'
            }} />
        </Box>
    );
};

const CustomerOrderPage: React.FC = () => {
    const { slug, getRelativePath } = useActiveTenant();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { formatCurrency, settings } = useSettings();
    const { cart, addItem, updateQuantity, clearCart } = useGuestCart();

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (slug) {
            fetchMenu(slug);
        }
    }, [slug]);

    const [spiceSelectionItem, setSpiceSelectionItem] = useState<MenuItem | null>(null);

    const fetchMenu = async (tenantSlug: string) => {
        try {
            setLoading(true);
            const response = await menuAPI.getPublicMenu(tenantSlug);
            const items = response.data?.items || [];
            const availableItems = items.filter((item: any) => item.isAvailable);
            setMenuItems(availableItems);

            const uniqueCategories = Array.from(
                new Set(
                    availableItems.map((item: any) =>
                        typeof item.category === 'string' ? item.category : item.category?.name
                    ).filter(Boolean)
                )
            );
            setCategories(['All', ...uniqueCategories as string[]]);
        } catch (error) {
            console.error('Error fetching menu:', error);
            toast.error('Failed to load menu.');
        } finally {
            setLoading(false);
        }
    };

    const getItemQuantity = (itemId: string) => {
        return cart.items.find(c => c.id === itemId)?.quantity || 0;
    };

    const addToCart = (item: MenuItem) => {
        if (item.isSpiceLevelAvailable) {
            setSpiceSelectionItem(item);
        } else {
            addItem(item, 1, [], '');
        }
    };

    const handleConfirmSpice = (spiceLevel: string) => {
        if (spiceSelectionItem) {
            addItem(spiceSelectionItem, 1, [], spiceLevel);
            setSpiceSelectionItem(null);
        }
    };

    const removeFromCart = (itemId: string) => {
        const itemIndex = cart.items.findIndex(c => c.id === itemId);
        if (itemIndex >= 0) {
            updateQuantity(itemIndex, cart.items[itemIndex].quantity - 1);
        }
    };

    const calculateTotal = () => cart.totalAmount;
    const totalQuantity = cart.totalItems;

    const SpiceLevelDialog = () => {
        if (!spiceSelectionItem) return null;

        const levels = spiceSelectionItem.spiceLevels && spiceSelectionItem.spiceLevels.length > 0
            ? spiceSelectionItem.spiceLevels
            : ['mild', 'medium', 'hot', 'extra hot'];

        return (
            <Dialog
                open={Boolean(spiceSelectionItem)}
                onClose={() => setSpiceSelectionItem(null)}
                PaperProps={{
                    sx: { borderRadius: 5, width: '100%', maxWidth: 350, p: 1 }
                }}
            >
                <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                    <Typography variant="h6" fontWeight="900">Select Spice Level</Typography>
                    <Typography variant="body2" color="text.secondary">{spiceSelectionItem?.name}</Typography>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        {levels.map((level) => (
                            <Button
                                key={level}
                                variant="outlined"
                                fullWidth
                                onClick={() => handleConfirmSpice(level.toLowerCase())}
                                sx={{
                                    py: 1.5,
                                    borderRadius: 3,
                                    textTransform: 'none',
                                    fontWeight: '700',
                                    color: 'text.primary',
                                    borderColor: 'divider',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                        borderColor: 'primary.main',
                                        color: 'primary.main'
                                    }
                                }}
                            >
                                {level.charAt(0).toUpperCase() + level.slice(1).replace(/_/g, ' ')}
                            </Button>
                        ))}
                    </Stack>
                </DialogContent>
            </Dialog>
        );
    };

    if (loading) {
        return (
            <Box sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={40} thickness={4} />
                <Typography variant="h6" color="text.secondary" fontWeight="500">Preparing Menu...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: '#f8f9fa', minHeight: '100vh', pb: 12 }}>
            <SpiceLevelDialog />
            {/* Elegant Hero Section */}
            <Box sx={{
                position: 'relative',
                height: { xs: '180px', sm: '220px' },
                width: '100%',
                background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1200&q=80)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                mb: -4,
                zIndex: 1
            }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant={isMobile ? "h4" : "h2"} fontWeight="900" sx={{ mb: 1, textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                            {settings?.restaurant?.name || 'Gourmet Dining'}
                        </Typography>
                    </Box>
                </Container>
            </Box>

            {/* Categorical Navigation - Elevated & Sticky */}
            <Paper sx={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                borderRadius: '0 0 24px 24px',
                mx: { xs: 0, sm: 2 },
                mb: 4
            }}>
                <Box sx={{
                    display: 'flex',
                    overflowX: 'auto',
                    gap: 1.5,
                    p: 2,
                    '&::-webkit-scrollbar': { display: 'none' },
                    '-ms-overflow-style': 'none',
                    scrollbarWidth: 'none',
                }}>
                    {categories.map(cat => (
                        <Button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            variant={selectedCategory === cat ? "contained" : "text"}
                            sx={{
                                minWidth: 'fit-content',
                                px: 3,
                                borderRadius: 10,
                                fontWeight: '700',
                                textTransform: 'none',
                                fontSize: '0.9rem',
                                color: selectedCategory === cat ? 'white' : 'text.secondary',
                                bgcolor: selectedCategory === cat ? 'primary.main' : 'transparent',
                                '&:hover': {
                                    bgcolor: selectedCategory === cat ? 'primary.dark' : alpha(theme.palette.primary.main, 0.05),
                                }
                            }}
                        >
                            {cat}
                        </Button>
                    ))}
                </Box>
            </Paper>

            {/* Menu Items Showcase */}
            <Container maxWidth="lg">
                <Box sx={{ mb: 2, px: 1 }}>
                    <Typography variant="h5" fontWeight="800" color="text.primary">
                        {selectedCategory === 'All' ? 'Our Menu Items' : selectedCategory}
                    </Typography>
                </Box>

                <Grid container spacing={3}>
                    {menuItems.filter(item =>
                        (selectedCategory === 'All' || (typeof item.category === 'string' ? item.category : item.category?.name) === selectedCategory) &&
                        item.name.toLowerCase() !== 'cheese pizza'
                    ).map((item, index) => {
                        const qty = getItemQuantity(item._id);
                        return (
                            <Grid item xs={12} sm={6} md={4} key={item._id}>
                                <Fade in timeout={300 + (index * 50)}>
                                    <Card sx={{
                                        borderRadius: 5,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                                        overflow: 'hidden',
                                        '&:hover': {
                                            transform: 'translateY(-8px)',
                                            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                                        }
                                    }}>
                                        <Box sx={{ position: 'relative' }}>
                                            <CardMedia
                                                component="img"
                                                height={isMobile ? "180" : "220"}
                                                image={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'}
                                                alt={item.name}
                                                sx={{ filter: item.isAvailable ? 'none' : 'grayscale(100%)' }}
                                            />
                                        </Box>

                                        <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, overflow: 'hidden' }}>
                                                <DietarySymbol type={item.foodType} />
                                                <Typography variant="h6" fontWeight="800" sx={{ color: 'text.primary', fontSize: '1rem', lineHeight: 1.1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                    {item.name}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                <Typography variant="h6" fontWeight="900" color="primary" sx={{ fontSize: '1.2rem' }}>
                                                    {formatCurrency(item.price)}
                                                </Typography>

                                                {qty > 0 ? (
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1.5,
                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                        borderRadius: 2,
                                                        px: 1,
                                                        py: 0.3,
                                                        border: '1px solid',
                                                        borderColor: alpha(theme.palette.primary.main, 0.2)
                                                    }}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => removeFromCart(item._id)}
                                                            sx={{ color: 'primary.main', p: 0.5 }}
                                                        >
                                                            <RemoveIcon sx={{ fontSize: '1.2rem' }} />
                                                        </IconButton>
                                                        <Typography fontWeight="900" color="primary.main" sx={{ minWidth: '15px', textAlign: 'center', fontSize: '1rem' }}>
                                                            {qty}
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => addToCart(item)}
                                                            sx={{ color: 'primary.main', p: 0.5 }}
                                                        >
                                                            <AddIcon sx={{ fontSize: '1.2rem' }} />
                                                        </IconButton>
                                                    </Box>
                                                ) : (
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => addToCart(item)}
                                                        startIcon={<AddIcon />}
                                                        sx={{
                                                            borderRadius: 2,
                                                            textTransform: 'none',
                                                            fontWeight: '800',
                                                            minWidth: '85px',
                                                            boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                                                            py: 0.5
                                                        }}
                                                    >
                                                        Add
                                                    </Button>
                                                )}
                                            </Box>

                                            {/* <Typography variant="body2" color="text.secondary" sx={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                fontSize: '0.8rem',
                                                lineHeight: 1.4,
                                                height: '2.8em'
                                            }}>
                                                {item.description}
                                            </Typography> */}
                                        </CardContent>
                                    </Card>
                                </Fade>
                            </Grid>
                        );
                    })}
                </Grid>
            </Container>

            {/* Premium Sticky Floating Cart Bar */}
           {cart.items.length > 0 && (
    <Box sx={{
        position: 'fixed',
        bottom: 24,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 1000,
        px: 2,
        pointerEvents: 'none', // let clicks pass through the wrapper
    }}>
        <Zoom in>
            <Paper
                elevation={15}
                sx={{
                    p: 1.5,
                    bgcolor: '#1a1a1a',
                    color: 'white',
                    borderRadius: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)',
                    width: { xs: '100%', sm: '420px' },
                    pointerEvents: 'auto', // re-enable clicks on the actual bar
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 1 }}>
                    <Badge
                        badgeContent={totalQuantity}
                        color="error"
                        overlap="circular"
                        sx={{
                            '& .MuiBadge-badge': {
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                height: 22,
                                minWidth: 22,
                                border: '2px solid #1a1a1a'
                            }
                        }}
                    >
                        <Box sx={{
                            width: 44,
                            height: 44,
                            bgcolor: alpha(theme.palette.primary.main, 0.2),
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'primary.main'
                        }}>
                            <CartIcon />
                        </Box>
                    </Badge>
                    <Box>
                        <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Total Order</Typography>
                        <Typography variant="h6" fontWeight="900" sx={{ lineHeight: 1.1 }}>{formatCurrency(calculateTotal())}</Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    onClick={() => navigate(getRelativePath('/customer/checkout'))}
                    endIcon={<ChevronIcon />}
                    sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        fontWeight: '900',
                        borderRadius: 10,
                        height: 52,
                        px: 4,
                        textTransform: 'none',
                        fontSize: '1rem',
                        '&:hover': { bgcolor: 'primary.dark' }
                    }}
                >
                    Checkout
                </Button>
            </Paper>
        </Zoom>
    </Box>
)}
        </Box>
    );
};

export default CustomerOrderPage;

