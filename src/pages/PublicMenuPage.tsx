import {
  Add,
  Close,
  Favorite,
  FavoriteBorder,
  LocalOffer,
  Restaurant,
  Search,
  ShoppingCart
} from '@mui/icons-material';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Rating,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useGuestCart } from '../context/GuestCartContext';
import { menuAPI } from '../services/api';

interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  isAvailable: boolean;
  category: string;
  availableDays?: string[];
  isWeeklyScheduleEnabled?: boolean;
  availabilityType?: 'highlight' | 'available_only';
  displayOption?: 'normal' | 'weekly_special' | 'todays_special';
  validFrom?: string | null;
  validTo?: string | null;
  priority?: number;
  rating?: number;
  reviewCount?: number;
  dietaryInfo?: string[];
  specialOffer?: string;
  isAlcohol?: boolean;
}

interface Category {
  _id: string;
  name: string;
}

const PublicMenuPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { cart, addItem, getCartSummary } = useGuestCart();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cartDialogOpen, setCartDialogOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMenuData();
  }, []);

  const loadMenuData = async () => {
    try {
      setLoading(true);
      const publicMenuResponse = await menuAPI.getPublicMenu(slug || '');
      const data = publicMenuResponse.data;
      if (data && data.items) {
        setCategories(data.categories || []);
        setMenuItems(data.items);
      } else {
        const menuByCategory = Array.isArray(data) ? data : [];
        setCategories(menuByCategory.map((mc: any) => mc.category));
        setMenuItems(menuByCategory.flatMap((mc: any) => mc.items));
      }
    } catch (err) {
      setError('Failed to load menu. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const getDayName = (date: Date): string => {
    return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
  };

  const today = getDayName(new Date());

  const isItemAvailableForDay = (item: MenuItem, day: string): boolean => {
    if (!item.isWeeklyScheduleEnabled) return true;
    if (item.validFrom && new Date(item.validFrom) > new Date()) return false;
    if (item.validTo && new Date(item.validTo) < new Date()) return false;
    if (item.availabilityType === 'available_only') {
      return (item.availableDays || []).includes(day);
    }
    return true; // highlight mode: always available
  };

  const isSpecialToday = (item: MenuItem): boolean => {
    if (!item.isWeeklyScheduleEnabled) return false;
    if (item.validFrom && new Date(item.validFrom) > new Date()) return false;
    if (item.validTo && new Date(item.validTo) < new Date()) return false;
    return (item.availableDays || []).includes(today) && item.displayOption !== 'normal';
  };

  const getSpecialBadge = (item: MenuItem): string | null => {
    if (!isSpecialToday(item)) return null;
    if (item.displayOption === 'todays_special') return "🔥 Today's Special";
    if (item.displayOption === 'weekly_special') return '⭐ Weekly Special';
    return null;
  };
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm?.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const isAvailable = item.isAvailable && isItemAvailableForDay(item, today);
    return matchesSearch && matchesCategory && isAvailable;
  });
  const todaysSpecials = filteredItems
    .filter(item => isSpecialToday(item))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const regularItems = filteredItems;
  const handleAddToCart = (item: MenuItem, quantity = 1) => {
    addItem(item, quantity);
  };

  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item);
    setItemDialogOpen(true);
  };

  const handleFavoriteToggle = (itemId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
      } else {
        newFavorites.add(itemId);
      }
      return newFavorites;
    });
  };

  const handleProceedToCheckout = () => {
    navigate('/customer-auth', { state: { returnTo: '/checkout' } });
  };

  const cartSummary = getCartSummary();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <LoadingSpinner message="Loading delicious menu..." />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50', py: 2 }}>
      <Container maxWidth="lg">
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            🍽️ Our Menu
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Browse our delicious offerings and add to cart
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            No account needed to browse! Sign up when you're ready to order.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Restaurant />}
              onClick={() => navigate(`/${slug}/book-table`)}
            >
              Book a Table
            </Button>
            <Button
              variant="contained"
              size="large"
              startIcon={<ShoppingCart />}
              onClick={() => setCartDialogOpen(true)}
            >
              View Cart ({cartSummary.totalItems})
            </Button>
          </Box>
        </Paper>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search for dishes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Tabs
                value={selectedCategory}
                onChange={(_e, value) => setSelectedCategory(value)}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="All" value="all" />
                {categories.map(category => (
                  <Tab key={category._id} label={category.name} value={category._id} />
                ))}
              </Tabs>
            </Grid>
          </Grid>
        </Paper>
        {/* Specials for Today section */}
        {todaysSpecials.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              🔥 Specials for Today
            </Typography>
            <Grid container spacing={3}>
              {todaysSpecials.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={`special-${item._id}`}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
                      cursor: 'pointer',
                      border: '2px solid',
                      borderColor: item.displayOption === 'todays_special' ? '#FF6B35' : '#6366F1',
                    }}
                    onClick={() => handleItemClick(item)}
                  >
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        height="180"
                        image={item.image || '/placeholder-food.jpg'}
                        alt={item.name}
                        sx={{ objectFit: 'cover' }}
                      />
                      <Chip
                        label={getSpecialBadge(item)}
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          background: item.displayOption === 'todays_special'
                            ? 'linear-gradient(135deg, #FF6B35, #F7C948)'
                            : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        }}
                      />
                    </Box>
                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {item.name}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          ${item.price.toFixed(2)}
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<Add />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(item);
                          }}
                          size="small"
                        >
                          Add to Cart
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
        <Grid container spacing={3}>
          {filteredItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item._id}>
              <Card
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 }, cursor: 'pointer' }}
                onClick={() => handleItemClick(item)}
              >
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={item.image || '/placeholder-food.jpg'}
                    alt={item.name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <IconButton
                    sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.9)', '&:hover': { backgroundColor: 'rgba(255,255,255,1)' } }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFavoriteToggle(item._id);
                    }}
                  >
                    {favorites.has(item._id) ? (
                      <Favorite color="error" />
                    ) : (
                      <FavoriteBorder />
                    )}
                  </IconButton>
                  <Chip
                    label={categories.find(c => c._id === item.category)?.name || 'Food'}
                    size="small"
                    sx={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.9)' }}
                  />
                  {item.specialOffer && (
                    <Chip
                      icon={<LocalOffer />}
                      label={item.specialOffer}
                      color="secondary"
                      size="small"
                      sx={{ position: 'absolute', bottom: 8, left: 8 }}
                    />
                  )}
                  {getSpecialBadge(item) && (
                    <Chip
                      label={getSpecialBadge(item)}
                      size="small"
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        background: item.displayOption === 'todays_special'
                          ? 'linear-gradient(135deg, #FF6B35, #F7C948)'
                          : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      }}
                    />
                  )}
                </Box>
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                    {categories.find(c => c._id === item.category)?.name || 'General'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Rating value={item.rating || 4.5} readOnly size="small" />
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      ({item.reviewCount || 0} reviews)
                    </Typography>
                  </Box>
                  {/* <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                    {item.description}
                  </Typography> */}
                  <Box sx={{ mb: 2 }}>
                    {item.dietaryInfo?.map((diet, index) => (
                      <Chip
                        key={index}
                        label={diet}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      ${item.price.toFixed(2)}
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(item);
                      }}
                      size="small"
                    >
                      Add to Cart
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        {filteredItems.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Restaurant sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No dishes found matching your search.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or browse all categories.
            </Typography>
          </Box>
        )}
        {!cartSummary.isEmpty && (
          <Fab
            color="primary"
            sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}
            onClick={() => setCartDialogOpen(true)}
          >
            <Badge badgeContent={cartSummary.totalItems} color="error">
              <ShoppingCart />
            </Badge>
          </Fab>
        )}
        <Dialog
          open={cartDialogOpen}
          onClose={() => setCartDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Your Cart</Typography>
              <IconButton onClick={() => setCartDialogOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {(cart?.items || []).map((item: any, index: number) => (
              <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1">{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      ${item.price.toFixed(2)} each
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button size="small" variant="outlined">
                      Qty: {item.quantity}
                    </Button>
                    <Typography variant="subtitle1" fontWeight="bold">
                      ${item.itemTotal.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" color="primary" fontWeight="bold">
                ${cart.totalAmount.toFixed(2)}
              </Typography>
            </Box>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleProceedToCheckout}
              sx={{ py: 1.5 }}
            >
              Continue to Checkout
            </Button>
            <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 1 }}>
              You'll be asked to sign in or create an account
            </Typography>
          </DialogContent>
        </Dialog>
        <Dialog
          open={itemDialogOpen}
          onClose={() => setItemDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          {selectedItem && (
            <>
              <DialogTitle>
                <IconButton sx={{ position: 'absolute', right: 8, top: 8 }} onClick={() => setItemDialogOpen(false)}>
                  <Close />
                </IconButton>
              </DialogTitle>
              <DialogContent sx={{ p: 0 }}>
                <Box sx={{ position: 'relative' }}>
                  <img src={selectedItem.image || '/placeholder-food.jpg'} alt={selectedItem.name} style={{ width: '100%', height: 300, objectFit: 'cover' }} />
                </Box>
                <Box sx={{ p: 3 }}>
                  <Typography variant="h4" gutterBottom>
                    {selectedItem.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Rating value={selectedItem.rating || 4.5} readOnly />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      ({selectedItem.reviewCount || 0} reviews)
                    </Typography>
                  </Box>
                  {/* <Typography variant="body1" paragraph>
                    {selectedItem.description}
                  </Typography> */}
                  <Box sx={{ mb: 3 }}>
                    {selectedItem.dietaryInfo?.map((diet, index) => (
                      <Chip key={index} label={diet} size="small" variant="outlined" sx={{ mr: 1, mb: 1 }} />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" color="primary" fontWeight="bold">
                      ${selectedItem.price.toFixed(2)}
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<Add />}
                      onClick={() => {
                        handleAddToCart(selectedItem);
                        setItemDialogOpen(false);
                      }}
                    >
                      Add to Cart
                    </Button>
                  </Box>
                </Box>
              </DialogContent>
            </>
          )}
        </Dialog>
      </Container>
    </Box>
  );
};

export default PublicMenuPage;
