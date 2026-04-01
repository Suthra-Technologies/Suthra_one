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

interface MenuItem {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: string | { _id: string; name: string };
    image?: string;
    isAvailable: boolean;
}

interface CartItem extends MenuItem {
    quantity: number;
    cartId: string;
    spiceLevel?: string;
}

const CustomerOrderPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { formatCurrency, settings } = useSettings();

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (slug) {
            fetchMenu(slug);
        }
    }, [slug]);

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

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(c => c._id === item._id);
            if (existing) {
                return prev.map(c => c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { ...item, quantity: 1, cartId: item._id }];
        });
        toast.success(`${item.name} added to cart`, {
            position: 'bottom-center',
            style: { borderRadius: '10px', background: '#333', color: '#fff' }
        });
    };

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const totalQuantity = cart.reduce((s, i) => s + i.quantity, 0);

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
            {/* Elegant Hero Section */}
            <Box sx={{
                position: 'relative',
                height: { xs: '180px', sm: '240px' },
                width: '100%',
                background: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80)`,
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
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, alignItems: 'center' }}>
                            <Chip 
                                size="small" 
                                icon={<HotIcon sx={{ color: '#ff4d4d !important' }} />} 
                                label="Top Rated" 
                                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.3)' }} 
                            />
                            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>Digital Menu</Typography>
                        </Box>
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
                    {/* <Typography variant="body2" color="text.secondary">Handpicked selections just for you</Typography> */}
                </Box>

                <Grid container spacing={3}>
                    {menuItems.filter(item => selectedCategory === 'All' ||
                        (typeof item.category === 'string' ? item.category : item.category?.name) === selectedCategory
                    ).map((item, index) => (
                        <Grid item xs={12} sm={6} md={4} key={item._id}>
                            <Fade in timeout={300 + (index * 50)}>
                                <Card sx={{
                                    height: '100%',
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
                                            height={isMobile ? "160" : "200"}
                                            image={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'}
                                            alt={item.name}
                                            sx={{ filter: item.isAvailable ? 'none' : 'grayscale(100%)' }}
                                        />
                                        <Box sx={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            bgcolor: 'rgba(255,255,255,0.9)',
                                            backdropFilter: 'blur(10px)',
                                            borderRadius: 2,
                                            px: 1.5,
                                            py: 0.5,
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                                        }}>
                                            <Typography variant="subtitle2" fontWeight="800" color="primary">
                                                {formatCurrency(item.price)}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <CardContent sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, gap: 1 }}>
                                            <Typography variant="h6" fontWeight="800" noWrap title={item.name} sx={{ flex: 1 }}>
                                                {item.name}
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={() => addToCart(item)}
                                                startIcon={<AddIcon />}
                                                sx={{
                                                    borderRadius: 2.5,
                                                    textTransform: 'none',
                                                    fontWeight: '800',
                                                    minWidth: '70px',
                                                    flexShrink: 0,
                                                    boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                                                }}
                                            >
                                                Add
                                            </Button>
                                        </Box>

                                        <Typography variant="body2" color="text.secondary" sx={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            height: '60px'
                                        }}>
                                            {item.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Fade>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* Premium Sticky Floating Cart Bar */}
            {cart.length > 0 && (
                <Zoom in>
                    <Box sx={{
                        position: 'fixed',
                        bottom: 24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: { xs: 'calc(100% - 32px)', sm: '420px' },
                        zIndex: 1000
                    }}>
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
                                onClick={() => navigate(`/${slug}/customer/bookings`)}
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
                    </Box>
                </Zoom>
            )}
        </Box>
    );
};

export default CustomerOrderPage;

