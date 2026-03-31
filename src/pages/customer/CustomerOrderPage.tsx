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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    useTheme,
    useMediaQuery,
    Paper,
    Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    Remove as RemoveIcon,
    ShoppingCart as CartIcon,
    Close as CloseIcon,
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
    const [cartOpen, setCartOpen] = useState(false);

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
        toast.success(`${item.name} added to cart`);
    };

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    if (loading) {
        return <Box sx={{ p: 5, textAlign: 'center' }}><Typography>Loading Menu...</Typography></Box>;
    }

    return (
        <Box sx={{ pb: 10 }}>
            {/* Categories Scrollable */}
            <Box sx={{ 
                display: 'flex', 
                overflowX: 'auto', 
                gap: 1, 
                p: 2, 
                bgcolor: 'background.paper',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                {categories.map(cat => (
                    <Chip
                        key={cat}
                        label={cat}
                        onClick={() => setSelectedCategory(cat)}
                        color={selectedCategory === cat ? "primary" : "default"}
                        variant={selectedCategory === cat ? "filled" : "outlined"}
                        sx={{ fontWeight: 'bold' }}
                    />
                ))}
            </Box>

            {/* Menu Items Grid */}
            <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                    {menuItems.filter(item => selectedCategory === 'All' || 
                        (typeof item.category === 'string' ? item.category : item.category?.name) === selectedCategory
                    ).map(item => (
                        <Grid item xs={12} sm={6} md={4} key={item._id}>
                            <Card sx={{ display: 'flex', height: '100%', borderRadius: 3 }}>
                                <Box sx={{ flex: 1, p: 2 }}>
                                    <Typography variant="h6" fontWeight="bold">{item.name}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        {item.description}
                                    </Typography>
                                    <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                        {formatCurrency(item.price)}
                                    </Typography>
                                    <Button 
                                        variant="contained" 
                                        size="small" 
                                        onClick={() => addToCart(item)}
                                        sx={{ mt: 1, borderRadius: 2 }}
                                    >
                                        Add
                                    </Button>
                                </Box>
                                {item.image && (
                                    <CardMedia
                                        component="img"
                                        sx={{ width: 120, height: '100%', objectFit: 'cover' }}
                                        image={item.image}
                                        alt={item.name}
                                    />
                                )}
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Sticky Bottom Cart Bar */}
            {cart.length > 0 && (
                <Paper 
                    elevation={10} 
                    sx={{ 
                        position: 'fixed', 
                        bottom: 0, 
                        left: 0, 
                        right: 0, 
                        p: 2, 
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        zIndex: 100
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Badge badgeContent={cart.reduce((s, i) => s + i.quantity, 0)} color="secondary">
                            <CartIcon />
                        </Badge>
                        <Box>
                            <Typography variant="subtitle2">Item(s) in Cart</Typography>
                            <Typography variant="h6" fontWeight="bold">{formatCurrency(calculateTotal())}</Typography>
                        </Box>
                    </Box>
                    <Button 
                        variant="contained" 
                        color="secondary" 
                        onClick={() => navigate(`/${slug}/customer/bookings`)}
                        sx={{ fontWeight: 'bold', borderRadius: 2 }}
                    >
                        View Order
                    </Button>
                </Paper>
            )}
        </Box>
    );
};

export default CustomerOrderPage;
