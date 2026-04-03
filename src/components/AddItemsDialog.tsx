import { Close as CloseIcon, Remove as RemoveIcon } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    CardMedia,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Paper,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { menuAPI, ordersAPI, tablesAPI } from '../services/api';
import { canAddItems } from '../utils/orderWorkflows';
import { useSettings } from '../context/SettingsContext';

interface AddItemsDialogProps {
    open: boolean;
    order: any | null;
    onClose: () => void;
    onSuccess: () => void;
}

interface NewItem {
    menuItem: string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
    variant?: any;
}

const AddItemsDialog: React.FC<AddItemsDialogProps> = ({ open, order, onClose, onSuccess }) => {
    const { formatCurrency } = useSettings();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Use shared utility function
    const isAddItemsAllowed = order ? canAddItems(order.status, order.orderType) : false;

    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<any[]>([]);

    // Variant selection state
    const [variantModalOpen, setVariantModalOpen] = useState(false);
    const [selectedItemForVariant, setSelectedItemForVariant] = useState<any>(null);

    // Custom Note state
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
    const [tempNote, setTempNote] = useState('');

    const addNewItemRow = () => {
        setItems([...items, { menuItem: '', name: '', quantity: 1, price: 0, notes: '' }]);
    };

    const removeItemRow = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof NewItem, value: any) => {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        setItems(updatedItems);
    };

    const addToCart = (item: any) => {
        setItems((prev) => {
            // Check if item already exists in cart (by _id which handles variants uniqueness)
            const existing = prev.find((c) => c._id === item._id);
            if (existing) {
                return prev.map((c) => (c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c));
            }
            // If it's a new item, ensure we have the correct structure
            const newItem = {
                ...item,
                menuItem: item.menuItem || item._id, // Ensure menuItem ID is set
                quantity: 1
            };
            return [...prev, newItem];
        });
    };

    const handleItemClick = (item: any) => {
        if (item.variants && item.variants.length > 0) {
            setSelectedItemForVariant(item);
            setVariantModalOpen(true);
        } else {
            addToCart(item);
        }
    };

    const handleSubmit = async () => {
        if (!order || items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        // Validate items
        const invalidItems = items.filter(item => !item.name || item.quantity <= 0 || item.price <= 0);
        if (invalidItems.length > 0) {
            toast.error('Please fill in all item details correctly');
            return;
        }

        try {
            console.log(order._id, items, 'order._id, items');
            setLoading(true);
            // Ensure we send clean data to backend
            const itemsToSend = items.map(item => ({
                menuItem: item.menuItem || item._id.split('-')[0], // Handle composite IDs if any
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                notes: item.notes,
                variant: item.variant,
                spiceLevel: item.spiceLevel
            }));

            await ordersAPI.addItems(order._id, itemsToSend);
            toast.success('Items added successfully');
            onSuccess();
            onClose();
            setItems([]);
        } catch (error: any) {
            console.error('Error adding items:', error);
            toast.error(error.response?.data?.message || 'Failed to add items');
        } finally {
            setLoading(false);
        }
    };

    // Calculate total
    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    if (!order) return null;


    // Initialise data
    useEffect(() => {
        fetchMenu();
    }, []);

    // Fetch menu, categories, tables
    const fetchMenu = async () => {
        try {
            setLoading(true);
            const [menuRes, categoriesRes] = await Promise.all([
                menuAPI.getAll(),
                menuAPI.getAllCategories(),
            ]);
            const data = menuRes.data;
            setMenuItems(Array.isArray(data) ? data : (data?.items || []));
            setCategories(categoriesRes.data);
        } catch (error) {
            console.error('Error fetching menu data:', error);
            toast.error('Failed to load menu');
        } finally {
            setLoading(false);
        }
    };
    // Filtering menu items
    const filteredItems = menuItems.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
            selectedCategory === 'all' ||
            (item.category && (item.category._id === selectedCategory || item.category === selectedCategory));
        return matchesSearch && matchesCategory;
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{
            sx: { height: '90vh' }
        }}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Add Items to Order
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{
                        bgcolor: 'error.main',
                        color: 'white',
                        width: 20, // Reduced width
                        height: 20, // Reduced height
                        padding: 0, // Remove padding to keep it tiny
                        '&:hover': {
                            bgcolor: 'error.dark',
                        },
                        '& .MuiSvgIcon-root': {
                            fontSize: '0.9rem' // Smaller icon font size
                        }
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
                <Box sx={{ p: 3, pb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Order #{order.orderNumber?.split('-').pop() || order._id.slice(-6)}
                    </Typography>
                </Box>

                {!isAddItemsAllowed && (
                    <Box sx={{ px: 3, pb: 2 }}>
                        <Alert severity="warning">
                            Items cannot be added to this order in its current status ({order.status}).
                        </Alert>
                    </Box>
                )}

                {isAddItemsAllowed && (
                    <>
                        <Box sx={{ px: 3, pb: 2 }}>
                            <Alert severity="info">
                                Add additional items to this order. The bill will be updated automatically.
                            </Alert>
                        </Box>

                        {/* Table for added items */}
                        <Box sx={{ px: 3, pb: 2 }}>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell><strong>Item</strong></TableCell>
                                            <TableCell align="center"><strong>Qty</strong></TableCell>
                                            <TableCell align="right"><strong>Price</strong></TableCell>
                                            <TableCell align="right"><strong>Subtotal</strong></TableCell>
                                            <TableCell align="center"><strong>Action</strong></TableCell>
                                        </TableRow>
                                    </TableHead>

                                    <TableBody>
                                        {items.map((item, index) => (
                                            <TableRow key={index} hover>
                                                {/* Item Name */}
                                                <TableCell>
                                                    <Typography variant="subtitle2" noWrap>{item.name}</Typography>

                                                    {/* Notes Display */}
                                                    {item.notes && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Note: {item.notes}
                                                        </Typography>
                                                    )}

                                                    {/* Add/Edit Note Button */}
                                                    <Button
                                                        variant="text"
                                                        size="small"
                                                        sx={{ p: 0, minWidth: 'auto', fontSize: '0.75rem' }}
                                                        onClick={() => {
                                                            setEditingNoteIndex(index);
                                                            setTempNote(item.notes || "");
                                                            setNoteModalOpen(true);
                                                        }}
                                                    >
                                                        {item.notes ? "Edit Note" : "Add Note"}
                                                    </Button>
                                                </TableCell>

                                                {/* Quantity Stepper */}
                                                <TableCell align="center">
                                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() =>
                                                                updateItem(index, "quantity", Math.max(1, item.quantity - 1))
                                                            }
                                                        >
                                                            <RemoveIcon fontSize="small" />
                                                        </IconButton>

                                                        <Typography sx={{ width: 24, textAlign: "center" }}>
                                                            {item.quantity}
                                                        </Typography>

                                                        <IconButton
                                                            size="small"
                                                            onClick={() => updateItem(index, "quantity", item.quantity + 1)}
                                                        >
                                                            <CloseIcon sx={{ transform: "rotate(45deg)" }} fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </TableCell>

                                                {/* Price */}
                                                <TableCell align="right">
                                                    {formatCurrency(item.price)}
                                                </TableCell>

                                                {/* Subtotal */}
                                                <TableCell align="right">
                                                    <Typography fontWeight="bold">
                                                        {formatCurrency(item.quantity * item.price)}
                                                    </Typography>
                                                </TableCell>

                                                {/* Remove Button */}
                                                <TableCell align="center">
                                                    <IconButton color="error" size="small" onClick={() => removeItemRow(index)}>
                                                        <RemoveIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        {items.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center">
                                                    <Typography variant="body2" color="text.secondary">
                                                        No items added yet. Click a menu item to add.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>

                            </TableContainer>
                        </Box>

                        {/* Category Tabs */}
                        <Box sx={{ px: 3, pb: 2 }}>
                            <Tabs
                                value={selectedCategory}
                                onChange={(_, v) => setSelectedCategory(v)}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{ borderBottom: 1, borderColor: 'divider' }}
                            >
                                <Tab label="All Items" value="all" />
                                {categories.map((cat) => (
                                    <Tab key={cat._id} label={cat.name} value={cat._id} />
                                ))}
                            </Tabs>
                        </Box>

                        {/* Menu Items Grid - Scrollable Area */}
                        <Box sx={{
                            flex: 1,
                            overflow: 'auto',
                            px: 3,
                            pb: 2
                        }}>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <Grid container spacing={2}>
                                    {filteredItems.map((item) => (
                                        <Grid item xs={12} sm={6} md={4} lg={3} key={item._id}>
                                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                <CardActionArea onClick={() => handleItemClick(item)} sx={{ flexGrow: 1 }}>
                                                    {item.image && (
                                                        <CardMedia component="img" height="140" image={item.image} alt={item.name} />
                                                    )}
                                                    <CardContent>
                                                        <Typography gutterBottom variant="h6" component="div" noWrap>
                                                            {item.name}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            {formatCurrency(item.price)}
                                                        </Typography>
                                                        {item.category && (
                                                            <Chip label={item.category.name || 'Uncategorized'} size="small" variant="outlined" />
                                                        )}
                                                    </CardContent>
                                                </CardActionArea>
                                            </Card>
                                        </Grid>
                                    ))}
                                    {filteredItems.length === 0 && (
                                        <Grid item xs={12}>
                                            <Box sx={{ textAlign: 'center', p: 5 }}>
                                                <Typography color="text.secondary">No items found</Typography>
                                            </Box>
                                        </Grid>
                                    )}
                                </Grid>
                            )}
                        </Box>
                    </>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    position: "sticky",
                    bottom: 0,
                    zIndex: 100,
                    bgcolor: "background.paper",
                    borderTop: "1px solid",
                    borderColor: "divider",
                    justifyContent: "space-between",
                    p: 2
                }}
            >
                {/* Total Section */}
                <Box>
                    {items.length > 0 && (
                        <>
                            <Typography variant="subtitle2">
                                Additional Items Total:
                            </Typography>
                            <Typography variant="h6" color="primary">
                                {formatCurrency(
                                    items.reduce((sum, item) => sum + item.quantity * item.price, 0)
                                )}
                            </Typography>
                        </>
                    )}
                </Box>

                {/* Action buttons */}
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Button onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>

                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={loading || !isAddItemsAllowed || items.length === 0}
                    >
                        {loading ? "Adding..." : "Add Items to Order"}
                    </Button>
                </Box>
            </DialogActions>

            {/* Variant Selection Dialog */}
            <Dialog open={variantModalOpen} onClose={() => setVariantModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Select Variant</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle1" gutterBottom>{selectedItemForVariant?.name}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {selectedItemForVariant?.variants?.map((v: any) => (
                            <Button
                                key={v._id || v.name}
                                variant="outlined"
                                onClick={() => {
                                    addToCart({
                                        ...selectedItemForVariant,
                                        _id: `${selectedItemForVariant._id}-${v._id || v.name}`, // Unique ID for cart
                                        menuItem: selectedItemForVariant._id, // Keep original menu item ID
                                        name: `${selectedItemForVariant.name} (${v.name})`,
                                        price: selectedItemForVariant.price + v.price, // Additive Pricing
                                        variant: v
                                    });
                                    setVariantModalOpen(false);
                                    setSelectedItemForVariant(null);
                                }}
                                sx={{ justifyContent: 'space-between' }}
                            >
                                <span>{v.name}</span>
                                <span>{formatCurrency(v.price)}</span>
                            </Button>
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setVariantModalOpen(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>

            {/* Custom Note Dialog */}
            <Dialog open={noteModalOpen} onClose={() => setNoteModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Item Note</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Cooking Instructions / Note"
                            value={tempNote}
                            onChange={(e) => setTempNote(e.target.value)}
                            placeholder="e.g. Extra spicy, No onions, etc."
                            autoFocus
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNoteModalOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            if (editingNoteIndex !== null) {
                                updateItem(editingNoteIndex, "notes", tempNote);
                            }
                            setNoteModalOpen(false);
                        }}
                    >
                        Save Note
                    </Button>
                </DialogActions>
            </Dialog>

        </Dialog>
    );
};

export default AddItemsDialog;