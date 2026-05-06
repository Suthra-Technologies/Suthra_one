import {
    Add as AddIcon,
    Category as CategoryIcon,
    Close as CloseIcon,
    CloudUpload as CloudUploadIcon,
    DeleteForever as DeleteForeverIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Image as ImageIcon,
    Search as SearchIcon,
    Restaurant as RestaurantIcon,
    WarningAmber as WarningIcon,
    Straighten as StraightenIcon,
    MenuBook as MenuBookIcon,
    Today as TodayIcon,
    Menu as MenuIcon
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardMedia,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Paper,
    Select,
    Skeleton,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    alpha,
    InputAdornment,
    useTheme,
    useMediaQuery,
    Divider
} from '@mui/material';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import ActionHistoryList from '../../components/common/ActionHistoryList';
import { useSettings } from '../../context/SettingsContext';
import { menuAPI, traysAPI, uploadAPI } from '../../services/api';
import TraysPage from './TraysPage';
import RecipesPage from '../recipes/RecipesPage';
import type { Category, Subcategory, IMenuItem } from './types';
import MenuItemDialog from './components/MenuItemDialog';
import TaxCategorySelector from './components/TaxCategorySelector';
import { useActiveTenant } from '../../hooks/useActiveTenant';


const MenuPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const headingFontSize = { xs: '1.12rem', sm: '1.4rem', md: '2.125rem' };
    const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };
    const navigate = useNavigate();
    const { formatCurrency } = useSettings();
    const { getRelativePath } = useActiveTenant();
    const [tabValue, setTabValue] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // Menu Items State
    const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [debouncedLoading, setDebouncedLoading] = useState(false);
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [trays, setTrays] = useState<any[]>([]);
    const hasInitializedSearch = useRef(false);
    const latestMenuRequestRef = useRef(0);
    const menuItemsRef = useRef<HTMLDivElement>(null);
    const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [totalMenuCount, setTotalMenuCount] = useState(0);
    const PAGE_LIMIT = 100;
    const LOAD_MORE_LIMIT = 50;

    // Dialogs State
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [menuItemDialogOpen, setMenuItemDialogOpen] = useState(false);

    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingMenuItem, setEditingMenuItem] = useState<IMenuItem | null>(null);
    const [bulkCsv, setBulkCsv] = useState('');
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [dialogTab, setDialogTab] = useState(0);

    // Form State for Categories
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        description: '',
        icon: '',
        parentCategory: '',
        taxCode: '',
    });
    const [categoryTouched, setCategoryTouched] = useState({ name: false, parentCategory: false, taxCode: false });
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; title: string; message: React.ReactNode; onConfirm: () => void }>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });
    useEffect(() => {
        debouncedFetchData();
    }, []);

    useEffect(() => {
        setSelectedSubcategory('all');
    }, [selectedCategory]);

    useEffect(() => {
        // Only refresh data when switching tabs, not on every render
        if (loading === false) { // Only refresh after initial load is complete
            debouncedFetchData();
        }
    }, [tabValue]);

    useEffect(() => {
        if (!hasInitializedSearch.current) {
            hasInitializedSearch.current = true;
            return;
        }

        const timeoutId = window.setTimeout(() => {
            fetchMenuItems(searchQuery, selectedCategory, selectedSubcategory);
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [searchQuery, selectedCategory, selectedSubcategory]);

    const getCategoryId = (category?: string | Category | null) =>
        category && typeof category === 'object' ? category._id : (category || '');

    const getSubcategoryId = (subcategory?: string | Subcategory | null) =>
        subcategory && typeof subcategory === 'object' ? subcategory._id : (subcategory || '');

    const getSubcategoryParentId = (subcategory?: string | Category | Subcategory | null) => {
        if (!subcategory || typeof subcategory === 'string') {
            return '';
        }
        return subcategory.parentCategory && typeof subcategory.parentCategory === 'object'
            ? subcategory.parentCategory._id
            : (subcategory.parentCategory || '');
    };

    const isSubcategory = (category?: Category | null): category is Subcategory =>
        Boolean(category?.parentCategory);


    const fetchMenuItems = async (activeSearch = searchQuery, category = selectedCategory, subcategory = selectedSubcategory) => {
        const requestId = latestMenuRequestRef.current + 1;
        latestMenuRequestRef.current = requestId;

        try {
            setSearchLoading(true);
            const params: any = {
                limit: PAGE_LIMIT,
                search: activeSearch.trim() || undefined,
                category: category !== 'all' ? category : undefined,
                subcategory: subcategory !== 'all' ? subcategory : undefined,
            };
            const menuRes = await menuAPI.getAll(params);
            if (latestMenuRequestRef.current === requestId) {
                const data = menuRes.data;
                const newMenuItems = Array.isArray(data) ? data : (data?.items || []);
                const newCursor = Array.isArray(data) ? null : data?.nextCursor;
                const totalCount = Array.isArray(data) ? newMenuItems.length : (data?.totalCount || 0);
                
                console.log('[Frontend] fetchMenuItems: Received', newMenuItems.length, 'menu items, total:', totalCount);
                setMenuItems(newMenuItems);
                setNextCursor(newCursor);
                setTotalMenuCount(totalCount);
            }
        } catch (error: any) {
            console.error('Error fetching menu items:', error);
            if (latestMenuRequestRef.current === requestId) {
                // Only show toast for non-timeout errors
                if (error.code !== 'ECONNABORTED') {
                    toast.error('Failed to search menu items');
                }
            }
        } finally {
            if (latestMenuRequestRef.current === requestId) {
                setSearchLoading(false);
            }
        }
    };

    const debouncedFetchData = useMemo(() => {
        return (activeSearch = searchQuery) => {
            // Clear any existing timeout
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }

            // Set a new timeout
            fetchTimeoutRef.current = setTimeout(() => {
                fetchData(activeSearch, selectedCategory, selectedSubcategory);
                fetchTimeoutRef.current = null;
            }, 500); // 500ms debounce delay
        };
    }, [selectedCategory, selectedSubcategory]);

    const fetchData = async (activeSearch = searchQuery, category = selectedCategory, subcategory = selectedSubcategory, retryCount = 0) => {
        const requestId = latestMenuRequestRef.current + 1;
        latestMenuRequestRef.current = requestId;

        try {
            setLoading(true);

            // Create timeout promises for each API call
            const timeoutPromise = (timeout: number) => new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), timeout)
            );

            // Fetch data with individual timeout handling
            const menuPromise = Promise.race([
                menuAPI.getAll({
                    limit: PAGE_LIMIT,
                    search: activeSearch.trim() || undefined,
                    category: category !== 'all' ? category : undefined,
                    subcategory: subcategory !== 'all' ? subcategory : undefined,
                }),
                timeoutPromise(15000) // 15 second timeout for menu items
            ]);

            const categoriesPromise = Promise.race([
                menuAPI.getAllCategories(),
                timeoutPromise(10000) // 10 second timeout for categories
            ]);

            const subcategoriesPromise = Promise.race([
                menuAPI.getAllSubcategories().catch((error) => {
                    console.warn('[Frontend] Failed to fetch subcategories:', error);
                    return { data: [] }; // Return empty array on error
                }),
                timeoutPromise(10000) // 10 second timeout for subcategories
            ]);

            const traysPromise = Promise.race([
                traysAPI.getAll(),
                timeoutPromise(10000) // 10 second timeout for trays
            ]);

            const [menuRes, categoriesRes, subcategoriesRes, traysRes] = await Promise.allSettled([
                menuPromise,
                categoriesPromise,
                subcategoriesPromise,
                traysPromise
            ]);

            // Extract results, handling potential failures
            let newMenuItems = [];
            let newCursor = null;
            let totalCount = 0;
            if (menuRes.status === 'fulfilled') {
                const data = (menuRes as PromiseFulfilledResult<any>).value.data;
                newMenuItems = Array.isArray(data) ? data : (data?.items || []);
                newCursor = Array.isArray(data) ? null : data?.nextCursor;
                totalCount = Array.isArray(data) ? newMenuItems.length : (data?.totalCount || 0);
            }
            const newCategories = categoriesRes.status === 'fulfilled'
                ? (categoriesRes as PromiseFulfilledResult<any>).value.data
                : [];
            const newSubcategories = subcategoriesRes.status === 'fulfilled'
                ? (subcategoriesRes as PromiseFulfilledResult<any>).value.data
                : [];
            const newTrays = traysRes.status === 'fulfilled'
                ? (traysRes as PromiseFulfilledResult<any>).value.data
                : [];

            // Check if this request is still the latest one
            if (latestMenuRequestRef.current === requestId) {
                console.log('[Frontend] fetchData: Received', {
                    menuItems: newMenuItems.length,
                    categories: newCategories.length,
                    categoriesList: newCategories.map(c => ({ id: c._id, name: c.name })),
                    subcategories: newSubcategories.length,
                    trays: newTrays.length
                });

                console.log('[Frontend] Categories received:', newCategories.map(cat => ({ id: cat._id, name: cat.name })));
                console.log('[Frontend] Looking for missing categories like "appetizers"...');
                console.log('[Frontend] All category names:', newCategories.map(c => c.name.toLowerCase()));

                // Check for specific categories
                const expectedCategories = ['appetizers', 'starters', 'soups', 'salads', 'desserts', 'beverages'];
                const missingCategories = expectedCategories.filter(cat =>
                    !newCategories.some(c => c.name.toLowerCase() === cat.toLowerCase())
                );

                if (missingCategories.length > 0) {
                    console.warn('[Frontend] Missing expected categories:', missingCategories);
                } else {
                    console.log('[Frontend] All expected categories found');
                }

                setMenuItems(newMenuItems);
                setNextCursor(newCursor);
                setTotalMenuCount(totalCount);
                setCategories(newCategories);
                setSubcategories(newSubcategories);
                setTrays(newTrays);
            }
        } catch (error: any) {
            // Only handle error if this is still the latest request
            if (latestMenuRequestRef.current === requestId) {
                console.error('Error fetching data:', error);

                // Check if it's a timeout error
                const isTimeout = error.message?.includes('timeout') || error.code === 'ECONNABORTED';

                // Retry logic for timeout errors
                if (isTimeout && retryCount < 2) {
                    console.log(`[Frontend] Retrying fetch data due to timeout (attempt ${retryCount + 1})...`);
                    setTimeout(() => fetchData(activeSearch, category, subcategory, retryCount + 1), 3000); // 3 second retry delay
                    return;
                }

                // For non-timeout errors or after max retries, set empty data to prevent UI from breaking
                console.log('[Frontend] Setting empty data due to persistent error');
                setMenuItems([]);
                setCategories([]);
                setSubcategories([]);
                setTrays([]);

                // Show user feedback
                if (isTimeout) {
                    toast.error('Request timed out. Please check your connection and try again.');
                } else {
                    toast.error('Failed to load menu data. Please refresh the page.');
                }
            }
        } finally {
            // Only set loading to false if this is still the latest request
            if (latestMenuRequestRef.current === requestId) {
                setLoading(false);
            }
        }
    };


    // Fetch more items for pagination
    const handleLoadMore = async () => {
        if (!nextCursor || isFetchingMore) return;

        try {
            setIsFetchingMore(true);
            const res = await menuAPI.getAll({
                search: searchQuery.trim() || undefined,
                category: selectedCategory !== 'all' ? selectedCategory : undefined,
                subcategory: selectedSubcategory !== 'all' ? selectedSubcategory : undefined,
                cursor: nextCursor,
                limit: LOAD_MORE_LIMIT
            });

            const data = res.data;
            const moreItems = Array.isArray(data) ? data : (data?.items || []);
            const newCursor = Array.isArray(data) ? null : data?.nextCursor;

            setMenuItems(prev => [...prev, ...moreItems]);
            setNextCursor(newCursor);
        } catch (error) {
            console.error('Error loading more items:', error);
            toast.error('Failed to load more items');
        } finally {
            setIsFetchingMore(false);
        }
    };



    // Category Management
    const handleOpenCategoryDialog = (category?: Category, presetParentCategory = '') => {
        if (category) {
            setEditingCategory(category);
            setCategoryForm({
                name: category.name,
                description: category.description || '',
                icon: category.icon || '',
                parentCategory: getSubcategoryParentId(category) || '',
                taxCode: category.taxCode || '',
            });
        } else {
            setEditingCategory(null);
            setCategoryForm({ name: '', description: '', icon: '', parentCategory: presetParentCategory, taxCode: '' });
        }

        setCategoryTouched({ name: false, parentCategory: false, taxCode: false });
        setDialogTab(0);
        setCategoryDialogOpen(true);
    };

    const handleSaveCategory = async () => {
        if (!categoryForm.name || !categoryForm.name.trim()) {
            setCategoryTouched((prev) => ({ ...prev, name: true }));
            toast.error('Category name is required');
            return;
        }

        if (!categoryForm.taxCode || !categoryForm.taxCode.trim()) {
            setCategoryTouched((prev) => ({ ...prev, taxCode: true }));
            toast.error('Tax Code (TIC) is required');
            return;
        }

        try {
            if (editingCategory && isSubcategory(editingCategory)) {
                if (!categoryForm.parentCategory) {
                    setCategoryTouched((prev) => ({ ...prev, parentCategory: true }));
                    toast.error('Please select a parent category');
                    return;
                }
                await menuAPI.updateSubcategory(editingCategory._id, categoryForm);
                toast.success('Subcategory updated successfully');
            } else if (editingCategory) {
                await menuAPI.updateCategory(editingCategory._id, categoryForm);
                toast.success('Category updated successfully');
            } else if (categoryForm.parentCategory) {
                await menuAPI.createSubcategory(categoryForm);
                toast.success('Subcategory created successfully');
            } else {
                await menuAPI.createCategory(categoryForm);
                toast.success('Category created successfully');
            }
            fetchData();
            setCategoryDialogOpen(false);
        } catch (error: any) {
            console.error('Error saving category:', error);
            toast.error(error.response?.data?.message || 'Failed to save category');
        }
    };

    const handleDeleteCategory = async (category: Category) => {
        const deletingSubcategory = isSubcategory(category);
        setConfirmDelete({
            open: true,
            title: deletingSubcategory ? 'Delete Subcategory' : 'Delete Category',
            message: deletingSubcategory
                ? <>Are you sure you want to delete the subcategory <strong>"{category.name}"</strong>? Items linked to it will lose only the subcategory assignment.</>
                : <>Are you sure you want to delete the category <strong>"{category.name}"</strong>? This will affect all menu items in this category.</>,
            onConfirm: async () => {
                try {
                    if (deletingSubcategory) {
                        await menuAPI.deleteSubcategory(category._id);
                        toast.success(`Subcategory "${category.name}" deleted successfully`);
                    } else {
                        await menuAPI.deleteCategory(category._id);
                        toast.success(`Category "${category.name}" deleted successfully`);
                    }
                    fetchData();
                } catch (error: any) {
                    console.error('Error deleting category:', error);
                    toast.error(error.response?.data?.message || 'Failed to delete category');
                }
            }
        });
    };

    // Menu Item Management
    const handleOpenMenuItemDialog = (item?: IMenuItem) => {
        setEditingMenuItem(item || null);
        setMenuItemDialogOpen(true);
    };

    const handleDeleteMenuItem = async (item: IMenuItem) => {
        setConfirmDelete({
            open: true,
            title: 'Delete Menu Item',
            message: <>Are you sure you want to delete <strong>"{item.name}"</strong>?</>,
            onConfirm: async () => {
                try {
                    await menuAPI.delete(item._id);
                    toast.success(`Menu item "${item.name}" deleted successfully`);
                    fetchData();
                } catch (error: any) {
                    console.error('Error deleting menu item:', error);
                    toast.error(error.response?.data?.message || 'Failed to delete menu item');
                }
            }
        });
    };

    const processImageField = async (imageValue: string): Promise<string> => {
        if (!imageValue || !imageValue.trim()) {
            return '';
        }

        const trimmedImage = String(imageValue).trim();

        // Check if it's a URL (http/https or data URL)
        if (trimmedImage.startsWith('http') || trimmedImage.startsWith('data:')) {
            return trimmedImage;
        }

        // Check if it's a local file path or base64 without data: prefix
        if (trimmedImage.includes('/') || trimmedImage.includes('\\') || trimmedImage.length > 100) {
            // For local files, we'd need to handle file upload separately
            // For now, treat as URL if it looks like one
            if (trimmedImage.startsWith('www.') || trimmedImage.includes('.')) {
                return trimmedImage.startsWith('http') ? trimmedImage : `https://${trimmedImage}`;
            }
        }

        // Return as-is for other cases
        return trimmedImage;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Process data
                if (data.length === 0) {
                    toast.error('Excel sheet is empty');
                    return;
                }

                // Map data to CreateMenuDto
                const items = await Promise.all(data.map(async (row: any) => {
                    // Try to map various common header names
                    const name = row['Name'] || row['name'] || row['Item Name'];
                    const price = row['Price'] || row['price'] || row['Base Price'];
                    const category = row['Category'] || row['category'] || row['Categories'];
                    const subcategory = row['Subcategory'] || row['subcategory'] || row['Sub Category'] || row['Sub Category Name'];
                    const description = row['Description'] || row['description'];
                    const image = row['Image'] || row['image'] || row['Image URL'];
                    const foodType = row['Food Type'] || row['foodType'] || row['Food Type'];
                    const isAvailable = row['Is Available'] !== undefined ? row['Is Available'] : row['isAvailable'];
                    const isCateringAvailable = row['Is Catering Available'] !== undefined ? row['Is Catering Available'] : row['isCateringAvailable'];

                    if (!name || (price === undefined && row['Price'] === undefined)) {
                        // invalid row
                        return null;
                    }

                    // Process image field
                    const processedImage = await processImageField(image || '');

                    return {
                        name: String(name).trim(),
                        price: parseFloat(price) || 0,
                        category: String(category || '').trim(),
                        categories: category ? [String(category).trim()] : [],
                        subcategory: String(subcategory || '').trim(),
                        description: String(description || '').trim(),
                        image: processedImage,
                        isAvailable: isAvailable !== false && isAvailable !== 'false', // default true
                        isCateringAvailable: isCateringAvailable !== false && isCateringAvailable !== 'false', // default true
                        isAutoDebit: true,
                        foodType: foodType && ['veg', 'non-veg'].includes(String(foodType).toLowerCase()) ? String(foodType).toLowerCase() as 'veg' | 'non-veg' : undefined,
                        availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                    };
                }));

                const validItems = items.filter(Boolean);

                if (validItems.length === 0) {
                    toast.error('No valid items found in Excel. Please check headers (Name, Price, Category).');
                    return;
                }

                // Check for large uploads and warn user
                const maxItems = 500;
                if (validItems.length > maxItems) {
                    toast.error(`Maximum ${maxItems} items allowed per upload. Found ${validItems.length} items. Please split your data into smaller batches.`);
                    return;
                }

                // Show progress for large uploads
                const uploadSize = validItems.length;
                const progressMessage = uploadSize > 100 ?
                    `Uploading ${uploadSize} items from Excel. This may take a while...` :
                    `Uploading ${uploadSize} items from Excel...`;

                toast.loading(progressMessage);

                // Debug: Log the data being sent
                console.log('[Frontend] Sending bulk upload request with', validItems.length, 'items');
                console.log('[Frontend] Sample item data:', validItems[0]);

                try {
                    const res = await menuAPI.bulkCreate(validItems);

                    // Debug: Log the response
                    console.log('[Frontend] Bulk upload response:', res);

                    const createdCount = Array.isArray(res.data) ? res.data.length : 0;
                    const skippedCount = validItems.length - createdCount;

                    toast.dismiss();
                    if (createdCount > 0) {
                        toast.success(`Uploaded ${createdCount} items.${skippedCount > 0 ? ` Skipped ${skippedCount} duplicates.` : ''}`);
                    } else {
                        toast.error(`No new items added. ${skippedCount} items were duplicates.`);
                    }
                    setBulkDialogOpen(false);

                    // Add a delay to ensure backend has time to create categories
                    toast.loading('Refreshing categories and menu items...');
                    setTimeout(() => {
                        fetchData(); // Refresh all data including menu items and categories
                        toast.dismiss();
                        // Force a second refresh to ensure UI updates
                        setTimeout(() => {
                            fetchData();
                        }, 1000);
                    }, 3000); // Increased delay to 3 seconds for better UI refresh
                } catch (error: any) {
                    toast.dismiss();
                    console.error('[Frontend] Bulk upload error:', error);
                    toast.error(`Upload failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
                    console.error('[Frontend] Bulk upload error details:', error.response?.data);
                }
            } catch (error) {
                console.error(error);
                toast.error('Failed to parse Excel file');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleBulkUpload = async () => {
        if (!bulkCsv.trim()) {
            toast.error('Please enter CSV data');
            return;
        }

        try {
            const rows = bulkCsv.split('\n').filter(r => r.trim());
            const items = await Promise.all(rows.map(async row => {
                // Try comma or pipe or tab
                let parts = row.split(',').map(p => p.trim());
                if (parts.length < 2 && row.includes('\t')) parts = row.split('\t').map(p => p.trim());
                if (parts.length < 2 && row.includes('|')) parts = row.split('|').map(p => p.trim());

                // Expected: Name, Price, Category, Subcategory, Description, ImageURL, FoodType, IsAvailable, IsCateringAvailable
                const [name, priceStr, category, subcategory, description, image, foodType, isAvailableStr, isCateringAvailableStr] = parts;

                if (!name || !priceStr) {
                    return null;
                }

                const price = parseFloat(priceStr);
                if (isNaN(price)) {
                    return null;
                }

                // Process image field
                const processedImage = await processImageField(image || '');

                // Convert string values to boolean properly
                const isAvailable = isAvailableStr ? String(isAvailableStr).toLowerCase() !== 'false' && String(isAvailableStr) !== '0' : true;
                const isCateringAvailable = isCateringAvailableStr ? String(isCateringAvailableStr).toLowerCase() !== 'false' && String(isCateringAvailableStr) !== '0' : true;

                return {
                    name: String(name).trim(),
                    price: price,
                    category: category || '',
                    categories: category ? [category] : [],
                    subcategory: subcategory || '',
                    description: description || '',
                    image: processedImage,
                    isAvailable: isAvailable,
                    isCateringAvailable: isCateringAvailable,
                    isAutoDebit: true,
                    foodType: foodType && ['veg', 'non-veg'].includes(String(foodType).toLowerCase()) ? String(foodType).toLowerCase() as 'veg' | 'non-veg' : undefined,
                    availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                };
            }));

            const validItems = items.filter(i => i && i.name && !isNaN(i.price));

            if (validItems.length === 0) {
                toast.error('No valid items found');
                return;
            }

            // Check for large uploads and warn user
            const maxItems = 500;
            if (validItems.length > maxItems) {
                toast.error(`Maximum ${maxItems} items allowed per upload. Found ${validItems.length} items. Please split your data into smaller batches.`);
                return;
            }

            // Show progress for large uploads
            const uploadSize = validItems.length;
            const progressMessage = uploadSize > 100 ?
                `Uploading ${uploadSize} items. This may take a while...` :
                `Uploading ${uploadSize} items...`;

            toast.loading(progressMessage);

            // Debug: Log the data being sent
            console.log('[Frontend] Sending CSV bulk upload request with', validItems.length, 'items');
            console.log('[Frontend] Sample item data:', validItems[0]);

            try {
                const res = await menuAPI.bulkCreate(validItems);

                // Debug: Log the response
                console.log('[Frontend] CSV bulk upload response:', res);

                const createdCount = Array.isArray(res.data) ? res.data.length : 0;
                const skippedCount = validItems.length - createdCount;

                toast.dismiss();
                if (createdCount > 0) {
                    toast.success(`Uploaded ${createdCount} items.${skippedCount > 0 ? ` Skipped ${skippedCount} duplicates.` : ''}`);
                } else {
                    toast.error(`No new items added. ${skippedCount} duplicates found.`);
                }
                setBulkDialogOpen(false);
                // Add a delay to ensure backend has time to create categories
                toast.loading('Refreshing categories and menu items...');
                setTimeout(() => {
                    fetchData(); // Refresh all data including menu items and categories
                    toast.dismiss();
                    // Force a second refresh to ensure UI updates
                    setTimeout(() => {
                        fetchData();
                    }, 1000);
                }, 3000); // Increased delay to 3 seconds for better UI refresh
                setBulkCsv('');
            } catch (error: any) {
                console.error(error);
                toast.dismiss();
                toast.error(error.response?.data?.message || 'Failed to upload items');
            }
        } catch (error: any) {
            console.error(error);
            toast.dismiss();
            toast.error('Failed to process CSV data');
        }
    };

    // Filter categories to show only those with menu items
    const categoriesWithItems = useMemo(() => {
        return categories.filter(category =>
            menuItems.some(item => getCategoryId(item.category) === category._id)
        );
    }, [categories, menuItems]);

    const filteredMenuItems = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        const filtered = menuItems.filter((item) => {
            const categoryId = getCategoryId(item.category);
            const subcategoryId = getSubcategoryId(item.subcategory);
            const itemCategories = Array.isArray(item.categories) ? item.categories.map(getCategoryId) : [];
            const matchesCategory = selectedCategory === 'all' || categoryId === selectedCategory || itemCategories.includes(selectedCategory);
            const matchesSubcategory = selectedSubcategory === 'all' || subcategoryId === selectedSubcategory;

            // Simple search like POS page - search in item name primarily
            const matchesSearch = !normalizedQuery ||
                item.name.toLowerCase().includes(normalizedQuery) ||
                (item.description && item.description.toLowerCase().includes(normalizedQuery));

            return matchesSearch && matchesCategory && matchesSubcategory;
        });

        // Scroll to first result when searching
        if (normalizedQuery && filtered.length > 0 && menuItemsRef.current) {
            setTimeout(() => {
                const firstItemElement = document.getElementById(`menu-item-${filtered[0]._id}`);
                if (firstItemElement) {
                    firstItemElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                    setHighlightedItemId(filtered[0]._id);
                    setTimeout(() => setHighlightedItemId(null), 2000);
                }
            }, 100);
        }

        return filtered;
    }, [menuItems, searchQuery, selectedCategory, selectedSubcategory, categories, subcategories]);

    return (
        <Box sx={{ p: { xs: 1.2, md: 3 }, pt: { xs: 0.8, md: 3 } }}>
            {/* Header */}
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' }, 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: { xs: 1, sm: 4 }, 
                gap: { xs: 1, sm: 2 },
                px: { xs: 1, sm: 0 },
                mt: { xs: 0.5, sm: 0 }
            }}>
                <Typography 
                    variant="h4" 
                    sx={{ 
                        fontWeight: 800,
                        fontSize: headingFontSize,
                        color: { xs: '#000', sm: 'text.primary' },
                        textAlign: { xs: 'center', sm: 'left' },
                        width: { xs: '100%', sm: 'auto' }
                    }}
                >
                    Menu Management
                </Typography>
            </Box>

            {/* Tabs */}
            <Tabs 
                value={tabValue} 
                onChange={(_, newValue) => setTabValue(newValue)} 
                variant={isMobile ? "fullWidth" : "scrollable"} 
                scrollButtons={false}
                sx={{ 
                    mb: { xs: 1, sm: 3 },
                    borderBottom: 1, 
                    borderColor: 'divider',
                    '& .MuiTab-root': {
                        fontSize: bodyFontSize,
                        minHeight: { xs: 42, sm: 48 },
                    },
                    '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' }
                }}
            >
                <Tab label="Items" icon={<RestaurantIcon />} iconPosition="start" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                <Tab label="Categories" icon={<CategoryIcon />} iconPosition="start" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                <Tab label="Trays" icon={<StraightenIcon />} iconPosition="start" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                <Tab label="Recipes" icon={<MenuBookIcon />} iconPosition="start" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
            </Tabs>

            {/* Menu Items Tab */}
            {tabValue === 0 && (
                <Box>
                    {/* Actions Bar */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                        <TextField
                            placeholder="Search menu items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="small"
                            fullWidth
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'background.paper' } }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" fontSize="small" />
                                    </InputAdornment>
                                ),
                                endAdornment: searchQuery ? (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearchQuery('')}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ) : null
                            }}
                        />
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <Chip
                                label="All"
                                onClick={() => setSelectedCategory('all')}
                                color={selectedCategory === 'all' ? 'primary' : 'default'}
                                variant={selectedCategory === 'all' ? 'filled' : 'outlined'}
                                size="small"
                                sx={{ fontWeight: 600 }}
                            />
                            {categories.map(cat => (
                                <Chip
                                    key={cat._id}
                                    label={cat.name}
                                    onClick={() => setSelectedCategory(cat._id)}
                                    color={selectedCategory === cat._id ? 'primary' : 'default'}
                                    variant={selectedCategory === cat._id ? 'filled' : 'outlined'}
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                />
                            ))}
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: bodyFontSize }}>
                                {filteredMenuItems.length} Items Found
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    size={isMobile ? "small" : "medium"}
                                    startIcon={<CloudUploadIcon sx={{ fontSize: isMobile ? '0.9rem !important' : 'inherit' }} />}
                                    onClick={() => setBulkDialogOpen(true)}
                                    sx={{ 
                                        width: 'auto',
                                        fontSize: isMobile ? '0.7rem' : '0.85rem',
                                        px: isMobile ? 1.5 : 2,
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Bulk Upload
                                </Button>
                                <Button
                                    variant="contained"
                                    size={isMobile ? "small" : "medium"}
                                    startIcon={<AddIcon sx={{ fontSize: isMobile ? '0.9rem !important' : 'inherit' }} />}
                                    onClick={() => handleOpenMenuItemDialog()}
                                    sx={{ 
                                        width: 'auto',
                                        fontSize: isMobile ? '0.7rem' : '0.85rem',
                                        px: isMobile ? 1.5 : 2,
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Add Menu Item
                                </Button>
                        </Box>
                    </Box>
                </Box>

                    {/* Menu Items Grid */}
                    {loading ? (
                        <Box sx={{ width: '100%' }}>
                            {/* Loading Skeleton */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.2, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
                                <Typography variant="h6" color="text.secondary">
                                    Loading menu items...
                                </Typography>
                                <Grid container spacing={3}>
                                    {[...Array(6)].map((_, index) => (
                                        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                                            <Card sx={{ height: 280 }}>
                                                <CardContent sx={{ p: 2 }}>
                                                    <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 2 }} />
                                                    <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
                                                    <Skeleton variant="text" width="60%" height={20} sx={{ mb: 2 }} />
                                                    <Skeleton variant="text" width="40%" height={28} />
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        </Box>
                    ) : filteredMenuItems.length === 0 ? (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 12,
                            px: 3,
                            textAlign: 'center',
                            bgcolor: 'rgba(0,0,0,0.02)',
                            borderRadius: 4,
                            border: '2px dashed',
                            borderColor: 'divider',
                        }}>
                            <Box sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                bgcolor: 'background.paper',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 2,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}>
                                <RestaurantIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                            </Box>
                            <Typography variant="h6" color="text.primary" fontWeight="bold" gutterBottom sx={{ fontSize: headingFontSize, textAlign: 'center', color: { xs: '#000', sm: 'text.primary' } }}>
                                No menu items found
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 350, mb: 3, fontSize: bodyFontSize }}>
                                {searchQuery.trim()
                                    ? `No results matched "${searchQuery.trim()}". Try another keyword or clear the search.`
                                    : categories.length === 0
                                        ? 'Start by creating your first category to organize your menu.'
                                        : 'Your menu is looking a bit empty! Let\'s add some delicious dishes.'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                {searchQuery.trim() ? (
                                    <Button
                                        variant="outlined"
                                        onClick={() => setSearchQuery('')}
                                        sx={{ borderRadius: '20px', textTransform: 'none', px: 4 }}
                                    >
                                        Clear Search
                                    </Button>
                                ) : categories.length === 0 ? (
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={() => handleOpenCategoryDialog()}
                                        sx={{ borderRadius: '20px', textTransform: 'none', px: 4 }}
                                    >
                                        Create Category
                                    </Button>
                                ) : (
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={() => handleOpenMenuItemDialog()}
                                        sx={{ borderRadius: '20px', textTransform: 'none', px: 4 }}
                                    >
                                        Add Menu Item
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    ) : (
                        <Box ref={menuItemsRef}>
                            <Grid container spacing={{ xs: 1.5, sm: 3 }}>
                                {filteredMenuItems.map(item => (
                                    <Grid item xs={6} sm={6} md={4} lg={3} key={item._id}>
                                        <Card
                                            id={`menu-item-${item._id}`}
                                            sx={{
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                borderRadius: { xs: '12px', sm: '16px' },
                                                overflow: 'hidden',
                                                border: highlightedItemId === item._id ? '2px solid' : 'none',
                                                borderColor: highlightedItemId === item._id ? 'primary.main' : 'transparent',
                                                boxShadow: highlightedItemId === item._id
                                                    ? '0 4px 16px rgba(25, 118, 210, 0.2)'
                                                    : '0 2px 8px rgba(0,0,0,0.04)',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    transform: isMobile ? 'none' : 'translateY(-5px)',
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                                                },
                                            }}
                                        >
                                            {/* ── Compact image area ── */}
                                            <Box sx={{ position: 'relative', height: { xs: 100, sm: 185 }, overflow: 'hidden', flexShrink: 0, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                                <Box
                                                    className="card-image-inner"
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        backgroundImage: item.image ? `url(${item.image})` : 'none',
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: 'center',
                                                        transition: 'transform 0.45s ease',
                                                        ...(!item.image && {
                                                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
                                                        }),
                                                    }}
                                                >
                                                    {!item.image && (
                                                        <ImageIcon sx={{ fontSize: { xs: 32, sm: 48 }, color: alpha(theme.palette.primary.main, 0.2) }} />
                                                    )}
                                                </Box>
                                            </Box>

                                            {/* ── Content Area ── */}
                                            <CardContent sx={{ flexGrow: 1, px: { xs: 1.25, sm: 2 }, pt: { xs: 1, sm: 1.4 }, pb: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
                                                {/* Header Row: Veg/Non-veg dot at top right for mobile density */}
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                    <Typography sx={{
                                                        fontSize: { xs: '0.55rem', sm: '0.66rem' }, fontWeight: 700, letterSpacing: 0.5,
                                                        textTransform: 'uppercase', color: theme.palette.primary.main, lineHeight: 1,
                                                        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                                    }}>
                                                        {typeof item.category === 'object' ? item.category.name : 'Menu'}
                                                    </Typography>
                                                    
                                                    {(item as any).foodType && (
                                                        <Box sx={{
                                                            width: 14, height: 14,
                                                            border: `1.5px solid ${(item as any).foodType === 'veg' ? '#22c55e' : '#ef4444'}`,
                                                            borderRadius: '2px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            bgcolor: 'background.paper',
                                                        }}>
                                                            {(item as any).foodType === 'veg' ? (
                                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22c55e' }} />
                                                            ) : (
                                                                <Box sx={{ width: 0, height: 0, borderLeft: '3px solid transparent', borderRight: '3px solid transparent', borderBottom: '6px solid #ef4444' }} />
                                                            )}
                                                        </Box>
                                                    )}
                                                </Box>

                                                {/* Item name */}
                                                <Typography fontWeight={800} sx={{ 
                                                    fontSize: { xs: '0.85rem', sm: '1rem' }, 
                                                    lineHeight: 1.2, 
                                                    mb: 0.5,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    minHeight: { xs: '2rem', sm: 'auto' }
                                                }}>
                                                    {item.name}
                                                </Typography>

                                                {/* Price */}
                                                <Typography sx={{ fontWeight: 900, fontSize: { xs: '0.95rem', sm: '1.1rem' }, color: theme.palette.primary.main, mb: 1 }}>
                                                    {formatCurrency(item.price)}
                                                </Typography>
                                            </CardContent>

                                            {/* ── Footer Actions ── */}
                                            <Divider sx={{ opacity: 0.6 }} />
                                            <Box sx={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                px: 1, py: { xs: 0.5, sm: 1 },
                                                mt: 'auto',
                                                gap: 0.5
                                            }}>
                                                <IconButton size="small" onClick={() => navigate(getRelativePath(`/recipes/create?menuItem=${item._id}`))}
                                                    sx={{ color: theme.palette.secondary.main, p: 0.5 }}>
                                                    <MenuBookIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleOpenMenuItemDialog(item)}
                                                    sx={{ color: theme.palette.primary.main, p: 0.5 }}>
                                                    <EditIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleDeleteMenuItem(item)}
                                                    sx={{ color: theme.palette.error.main, p: 0.5 }}>
                                                    <DeleteIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                                                </IconButton>
                                            </Box>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>

                            {/* Pagination footer */}
                            {nextCursor && (
                                <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Showing {filteredMenuItems.length} of {totalMenuCount} items
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        onClick={handleLoadMore}
                                        disabled={isFetchingMore}
                                        startIcon={isFetchingMore ? <CircularProgress size={20} /> : null}
                                        sx={{ 
                                            borderRadius: '20px', 
                                            px: 4, 
                                            minWidth: 160,
                                            borderColor: 'primary.main',
                                            '&:disabled': {
                                                borderColor: 'divider'
                                            }
                                        }}
                                    >
                                        {isFetchingMore ? 'Loading...' : 'Load More Items'}
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>
            )}

            {/* Categories Tab */}
            {tabValue === 1 && (
                <Box>
                    {console.log('[Frontend] Rendering Categories tab. Current categories:', categories.map(cat => ({ id: cat._id, name: cat.name })))}
                    {loading ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                            <Typography variant="h6" color="text.secondary">
                                Loading categories...
                            </Typography>
                            <Grid container spacing={3}>
                                {[...Array(4)].map((_, index) => (
                                    <Grid item xs={12} sm={6} md={4} key={index}>
                                        <Card sx={{ height: 120 }}>
                                            <CardContent sx={{ p: 2 }}>
                                                <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
                                                <Skeleton variant="text" width="40%" height={20} />
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={() => handleOpenCategoryDialog(undefined, categories[0]?._id || '')}
                                    fullWidth={false}
                                    disabled={categories.length === 0}
                                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                                >
                                    Add Subcategory
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => handleOpenCategoryDialog()}
                                    fullWidth={false}
                                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                                >
                                    Add Category
                                </Button>
                            </Box>

                            {categories.length === 0 ? (
                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    py: 12,
                                    px: 3,
                                    textAlign: 'center',
                                    bgcolor: 'rgba(0,0,0,0.02)',
                                    borderRadius: 4,
                                    border: '2px dashed',
                                    borderColor: 'divider',
                                }}>
                                    <Box sx={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: '50%',
                                        bgcolor: 'background.paper',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 2,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }}>
                                        <CategoryIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                                    </Box>
                                    <Typography variant="h6" color="text.primary" fontWeight="bold" gutterBottom sx={{ fontSize: headingFontSize, textAlign: 'center', color: { xs: '#000', sm: 'text.primary' } }}>
                                        No categories found
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 350, mb: 3, fontSize: bodyFontSize }}>
                                        Categories help you organize your menu items for better management and customer experience.
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={() => handleOpenCategoryDialog()}
                                        sx={{ borderRadius: '20px', textTransform: 'none', px: 4 }}
                                    >
                                        Add Your First Category
                                    </Button>
                                </Box>
                            ) : (
                                <Grid container spacing={3}>
                                    {categories.map(category => (
                                        <Grid item xs={12} sm={6} md={4} key={category._id}>
                                            <Card
                                                sx={{
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                                    '&:hover': {
                                                        transform: 'translateY(-4px)',
                                                        boxShadow: theme.shadows[8],
                                                    },
                                                }}
                                            >
                                                <CardContent sx={{ flexGrow: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                        <CategoryIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <Typography variant="h6">{category.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {menuItems.filter(item => getCategoryId(item.category) === category._id).length} items
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
                                    ))}
                                </Grid>
                            )}
                        </>
                    )}
                </Box>
            )}

            {/* Tray Management Tab */}
            {tabValue === 2 && (
                <TraysPage hideHeader />
            )}

            {/* Recipes Tab */}
            {tabValue === 3 && (
                <Box>
                    <RecipesPage hideHeader />
                </Box>
            )}

            {/* Category Dialog */}
            <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ m: 0, p: 2 }}>
                    {editingCategory
                        ? isSubcategory(editingCategory) ? 'Edit Subcategory' : 'Edit Category'
                        : categoryForm.parentCategory ? 'Add New Subcategory' : 'Add New Category'}
                    <IconButton
                        aria-label="close category dialog"
                        onClick={() => setCategoryDialogOpen(false)}
                        size="small"
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            bgcolor: theme.palette.error.main,
                            color: '#fff',
                            width: 28,
                            height: 28,
                            minWidth: 28,
                            padding: '4px',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.85) },
                        }}
                    >
                        <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}>
                    <Tabs value={dialogTab} onChange={(e, v) => setDialogTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <Tab label="Details" />
                        <Tab label="History" disabled={!editingCategory} />
                    </Tabs>

                    {dialogTab === 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <TextField
                                label="Category Name"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                onBlur={() => setCategoryTouched((prev) => ({ ...prev, name: true }))}
                                error={categoryTouched.name && !categoryForm.name.trim()}
                                helperText={categoryTouched.name && !categoryForm.name.trim() ? 'Category name is required' : ''}
                                fullWidth
                                required
                            />
                            <TaxCategorySelector
                                value={categoryForm.taxCode}
                                onChange={(val) => setCategoryForm({ ...categoryForm, taxCode: val })}
                                error={categoryTouched.taxCode && !categoryForm.taxCode.trim()}
                                helperText={categoryTouched.taxCode && !categoryForm.taxCode.trim() ? 'Tax Code (TIC) is required' : ''}
                                required
                            />
                            <FormControl fullWidth>
                                <InputLabel>Parent Category</InputLabel>
                                <Select
                                    value={categoryForm.parentCategory}
                                    label="Parent Category"
                                    onChange={(e) => setCategoryForm({ ...categoryForm, parentCategory: e.target.value })}
                                    onBlur={() => setCategoryTouched((prev) => ({ ...prev, parentCategory: true }))}
                                >
                                    <MenuItem value="">None (Top-level Category)</MenuItem>
                                    {categories
                                        .filter((category) => !editingCategory || category._id !== editingCategory._id)
                                        .map((category) => (
                                            <MenuItem key={category._id} value={category._id}>
                                                {category.name}
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                            <TextField
                                label="Description"
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                fullWidth
                                multiline
                                rows={3}
                            />
                        </Box>
                    )}

                    {dialogTab === 1 && editingCategory && (
                        <Box mt={2}>
                            <ActionHistoryList
                                history={editingCategory.actionHistory || []}
                                emptyMessage={isSubcategory(editingCategory) ? 'No history for this subcategory.' : 'No history for this category.'}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveCategory}
                        disabled={!categoryForm.name}
                    >
                        {editingCategory ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Menu Item Dialog */}
            <MenuItemDialog
                open={menuItemDialogOpen}
                onClose={() => setMenuItemDialogOpen(false)}
                onSuccess={() => fetchData()}
                editingMenuItem={editingMenuItem}
                categories={categories}
                subcategories={subcategories}
                trays={trays}
            />

            {/* Bulk Upload Dialog */}
            <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Bulk Upload Menu Items</DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 3, p: 2, border: '1px dashed grey', borderRadius: 2, bgcolor: 'background.paper', textAlign: 'center' }}>
                        <Typography variant="h6" gutterBottom>Upload Excel / CSV File</Typography>
                        <Button
                            variant="contained"
                            component="label"
                            startIcon={<CloudUploadIcon />}
                            sx={{ mb: 2 }}
                        >
                            Select File
                            <input
                                type="file"
                                hidden
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileUpload}
                            />
                        </Button>
                        <Typography variant="caption" display="block" color="text.secondary">
                            Supported formats: .xlsx, .xls, .csv
                        </Typography>
                        <Button size="small" sx={{ mt: 1 }} onClick={() => {
                            const template = [
                                { Name: 'Burger', Price: 10.99, Category: 'Main Course', Subcategory: 'Burgers', Description: 'Delicious burger', Image: 'https://example.com/burger.jpg', 'Food Type': 'non-veg', 'Is Available': 'true', 'Is Catering Available': 'true' },
                                { Name: 'Pizza', Price: 12.50, Category: 'Main Course', Subcategory: 'Italian', Description: 'Cheese pizza', Image: 'https://example.com/pizza.jpg', 'Food Type': 'veg', 'Is Available': 'true', 'Is Catering Available': 'true' },
                                { Name: 'Salad', Price: 8.99, Category: 'Starters', Subcategory: 'Salads', Description: 'Fresh garden salad', Image: '', 'Food Type': 'veg', 'Is Available': 'true', 'Is Catering Available': 'false' }
                            ];
                            const ws = XLSX.utils.json_to_sheet(template);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "Template");
                            XLSX.writeFile(wb, "menu_upload_template.xlsx");
                        }}>
                            Download Template
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>

            {/* Custom Delete Confirmation Dialog */}
            <Dialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ ...confirmDelete, open: false })}
                PaperProps={{
                    sx: { borderRadius: 3, p: 1, maxWidth: '400px' }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <WarningIcon sx={{ color: 'error.main', fontSize: 32 }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                            {confirmDelete.title}
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ color: 'text.secondary', py: 1 }}>
                        {confirmDelete.message}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 1.5, gap: 1.5 }}>
                    <Button
                        onClick={() => setConfirmDelete({ ...confirmDelete, open: false })}
                        variant="outlined"
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            color: 'text.secondary',
                            borderColor: 'divider',
                            '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            confirmDelete.onConfirm();
                            setConfirmDelete({ ...confirmDelete, open: false });
                        }}
                        variant="contained"
                        color="error"
                        startIcon={<DeleteForeverIcon />}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            boxShadow: theme.shadows[4],
                            '&:hover': { boxShadow: theme.shadows[8] }
                        }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MenuPage;
