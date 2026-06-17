import {
    Add as AddIcon,
    Category as CategoryIcon,
    Close as CloseIcon,
    CloudUpload as CloudUploadIcon,
    CloudDownload as CloudDownloadIcon,
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
    Menu as MenuIcon,
    PlaylistAdd as PlaylistAddIcon,
    FileUpload as FileUploadIcon,
    PhotoCamera as PhotoCameraIcon,
    OpenInNew as OpenInNewIcon,
    RestoreFromTrash as RestoreIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import {
    Menu,
    Alert,
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
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Link
} from '@mui/material';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import ActionHistoryList from '../../components/common/ActionHistoryList';
import { useSettings } from '../../context/SettingsContext';
import { menuAPI, traysAPI, uploadAPI, recipesAPI, modifierTemplatesAPI } from '../../services/api';
import TraysPage from './TraysPage';
import RecipesPage from '../recipes/RecipesPage';
import type { Category, Subcategory, IMenuItem } from './types';
import MenuItemDialog from './components/MenuItemDialog';
import AddOnGroupsPage from './AddOnGroupsPage';
import TaxCategorySelector from './components/TaxCategorySelector';
import { useActiveTenant } from '../../hooks/useActiveTenant';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCategoryItem } from './SortableCategoryItem';

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
    const [isProcessing, setIsProcessing] = useState(false);

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
    const PAGE_LIMIT = 50;
    const LOAD_MORE_LIMIT = 10;

    // Deleted items state
    const [deletedMenuItems, setDeletedMenuItems] = useState<IMenuItem[]>([]);
    const [deletedCategories, setDeletedCategories] = useState<Category[]>([]);
    const [deletedSubcategories, setDeletedSubcategories] = useState<Subcategory[]>([]);
    const [deletedTrays, setDeletedTrays] = useState<any[]>([]);
    const [deletedRecipes, setDeletedRecipes] = useState<any[]>([]);
    const [deletedAddOns, setDeletedAddOns] = useState<any[]>([]);
    const [deletedLoading, setDeletedLoading] = useState(false);

    // Dialogs State
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = categories.findIndex(c => c._id === active.id);
            const newIndex = categories.findIndex(c => c._id === over.id);

            const newCategories = arrayMove(categories, oldIndex, newIndex);
            setCategories(newCategories);

            const payload = newCategories.map((c, index) => ({
                id: c._id,
                sortOrder: index,
            }));

            try {
                await menuAPI.reorderCategories(payload);
                toast.success('Category order saved');
            } catch (err: any) {
                console.error('Failed to reorder categories:', err);
                toast.error('Failed to save category order');
                fetchData();
            }
        }
    };

    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [menuItemDialogOpen, setMenuItemDialogOpen] = useState(false);
    // Confirmation shown before adding a menu item (lists existing categories / offer to add more)
    const [categoryConfirmOpen, setCategoryConfirmOpen] = useState(false);

    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingMenuItem, setEditingMenuItem] = useState<IMenuItem | null>(null);
    const [bulkCsv, setBulkCsv] = useState('');
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [bulkPreviewItems, setBulkPreviewItems] = useState<any[]>([]);
    const [uploadingBulk, setUploadingBulk] = useState(false);
    const [previewLimit, setPreviewLimit] = useState(50);
    const [dialogTab, setDialogTab] = useState(0);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const previewFileRef = useRef<HTMLInputElement>(null);
    const [previewTargetIdx, setPreviewTargetIdx] = useState<number | null>(null);

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
    const [confirmAction, setConfirmAction] = useState<{ 
        open: boolean; 
        title: string; 
        message: React.ReactNode; 
        onConfirm: () => void;
        onAlternative?: () => void;
        confirmLabel?: string;
        alternativeLabel?: string;
        showCancel?: boolean;
    }>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });
    useEffect(() => {
        debouncedFetchData();
    }, []);

    useEffect(() => {
        setSelectedSubcategory('all');
    }, [selectedCategory]);

    const fetchDeletedData = async () => {
        try {
            setDeletedLoading(true);
            const [menuRes, categoriesRes, subcategoriesRes, traysRes, recipesRes, addOnsRes] = await Promise.all([
                menuAPI.getAll({ isDeleted: true, limit: 200 }),
                menuAPI.getAllCategories({ isDeleted: true }),
                menuAPI.getAllSubcategories(undefined, true),
                traysAPI.getAll({ isDeleted: true }),
                recipesAPI.getAll({ isDeleted: true }),
                modifierTemplatesAPI.getAll({ isDeleted: true })
            ]);
            
            const data = menuRes.data;
            const items = Array.isArray(data) ? data : (data?.items || []);
            setDeletedMenuItems(items);

            console.log('[DEBUG] Deleted Data fetched:', {
                traysResData: traysRes.data,
                recipesResData: recipesRes.data,
                addOnsResData: addOnsRes.data,
                isTraysArray: Array.isArray(traysRes.data)
            });

            const catData = categoriesRes.data?.data || categoriesRes.data;
            const subcatData = subcategoriesRes.data?.data || subcategoriesRes.data;
            
            setDeletedCategories(Array.isArray(catData) ? catData : []);
            setDeletedSubcategories(Array.isArray(subcatData) ? subcatData : []);
            setDeletedTrays(Array.isArray(traysRes.data) ? traysRes.data : []);
            setDeletedRecipes(Array.isArray(recipesRes.data?.data) ? recipesRes.data.data : (Array.isArray(recipesRes.data) ? recipesRes.data : []));
            setDeletedAddOns(Array.isArray(addOnsRes.data) ? addOnsRes.data : []);
        } catch (error) {
            console.error('Error fetching deleted data:', error);
        } finally {
            setDeletedLoading(false);
        }
    };

    useEffect(() => {
        // Only refresh data when switching tabs, not on every render
        if (loading === false) { // Only refresh after initial load is complete
            debouncedFetchData();
        }
        if (tabValue === 5) {
            fetchDeletedData();
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

    const normalizeKey = (value?: string | null) => String(value || '').trim().toLowerCase();

    const itemBelongsToCategory = (item: IMenuItem, category: Category) => {
        const categoryKeys = [category._id, category.name].map(normalizeKey).filter(Boolean);

        const itemKeys = [
            getCategoryId(item.category),
            typeof item.category === 'string' ? item.category : item.category?.name,
            ...(Array.isArray(item.categories)
                ? item.categories.flatMap((value) => (
                    typeof value === 'string'
                        ? [value]
                        : [value._id, value.name]
                ))
                : []),
        ].map(normalizeKey).filter(Boolean);

        return categoryKeys.some((key) => itemKeys.includes(key));
    };

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
        if (isProcessing) return;
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

        const executeSave = async () => {
            try {
                setIsProcessing(true);
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
            } finally {
                setIsProcessing(false);
            }
        };

        // Check for duplicates before creating new
        if (!editingCategory) {
            const normalizedNewName = categoryForm.name.toLowerCase().trim();
            const isCreatingSubcategory = !!categoryForm.parentCategory;

            let existingDuplicate: any = null;
            if (isCreatingSubcategory) {
                existingDuplicate = subcategories.find(sub => 
                    sub.name.toLowerCase().trim() === normalizedNewName && 
                    getSubcategoryParentId(sub) === categoryForm.parentCategory
                );
            } else {
                existingDuplicate = categories.find(cat => 
                    cat.name.toLowerCase().trim() === normalizedNewName
                );
            }

            if (existingDuplicate) {
                setConfirmAction({
                    open: true,
                    title: 'Duplicate Name Detected',
                    message: (
                        <Box>
                            <Typography variant="body2" gutterBottom>
                                A {isCreatingSubcategory ? 'subcategory' : 'category'} named <strong>"{existingDuplicate.name}"</strong> already exists.
                            </Typography>
                            <Typography variant="body2">
                                Do you want to create a <strong>New</strong> category with this name, or <strong>Merge</strong> (use the existing one)?
                            </Typography>
                        </Box>
                    ),
                    confirmLabel: 'Create New',
                    alternativeLabel: 'Merge',
                    showCancel: true,
                    onConfirm: () => {
                        executeSave();
                    },
                    onAlternative: () => {
                        setCategoryDialogOpen(false);
                        toast.success(`Using existing category "${existingDuplicate.name}"`);
                    }
                });
                return;
            }
        }

        await executeSave();
    };

    const handleDeleteCategory = async (category: Category) => {
        const deletingSubcategory = isSubcategory(category);
        setConfirmDelete({
            open: true,
            title: deletingSubcategory ? 'Delete Subcategory' : 'Delete Category',
            message: deletingSubcategory
                ? <>Are you sure you want to delete the subcategory <strong>"{category.name}"</strong>? It can be restored later.</>
                : <>Are you sure you want to delete the category <strong>"{category.name}"</strong>? It can be restored later.</>,
            onConfirm: async () => {
                if (isProcessing) return;
                try {
                    setIsProcessing(true);
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
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };

    const handleRestoreCategory = async (category: Category) => {
        if (isProcessing) return;
        try {
            setIsProcessing(true);
            const isSubcat = isSubcategory(category);
            if (isSubcat) {
                await menuAPI.restoreSubcategory(category._id);
                toast.success(`Subcategory "${category.name}" restored successfully`);
            } else {
                await menuAPI.restoreCategory(category._id);
                toast.success(`Category "${category.name}" restored successfully`);
            }
            fetchData();
        } catch (error: any) {
            console.error('Error restoring category:', error);
            toast.error(error.response?.data?.message || 'Failed to restore category');
        } finally {
            setIsProcessing(false);
        }
    };

    // Menu Item Management
    const handleOpenMenuItemDialog = (item?: IMenuItem) => {
        // Editing an existing item — no category gate needed.
        if (item) {
            setEditingMenuItem(item);
            setMenuItemDialogOpen(true);
            return;
        }

        // Adding a new item: a menu item must belong to a category.
        if (categories.length === 0) {
            toast.error('Please add a category before adding menu items.');
            handleOpenCategoryDialog();
            return;
        }

        // Categories exist — confirm with the user (and offer to add more) before continuing.
        setCategoryConfirmOpen(true);
    };

    // Proceed from the confirmation dialog to actually add the menu item.
    const proceedToAddMenuItem = () => {
        setCategoryConfirmOpen(false);
        setEditingMenuItem(null);
        setMenuItemDialogOpen(true);
    };

    const handleDeleteMenuItem = async (item: IMenuItem) => {
        setConfirmDelete({
            open: true,
            title: 'Delete Menu Item',
            message: <>Are you sure you want to delete <strong>"{item.name}"</strong>? It can be restored later.</>,
            onConfirm: async () => {
                if (isProcessing) return;
                try {
                    setIsProcessing(true);
                    await menuAPI.delete(item._id);
                    toast.success(`Menu item "${item.name}" deleted successfully`);
                    fetchData();
                } catch (error: any) {
                    console.error('Error deleting menu item:', error);
                    toast.error(error.response?.data?.message || 'Failed to delete menu item');
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };

    const handleRestoreMenuItem = async (item: IMenuItem) => {
        if (isProcessing) return;
        try {
            setIsProcessing(true);
            await menuAPI.restore(item._id);
            toast.success(`Menu item "${item.name}" restored successfully`);
            fetchData();
            fetchDeletedData();
        } catch (error: any) {
            console.error('Error restoring menu item:', error);
            toast.error(error.response?.data?.message || 'Failed to restore menu item');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRestoreTray = async (item: any) => {
        if (isProcessing) return;
        try {
            setIsProcessing(true);
            await traysAPI.restore(item._id);
            toast.success(`Tray "${item.name}" restored successfully`);
            fetchDeletedData();
        } catch (error: any) {
            console.error('Error restoring tray:', error);
            toast.error(error.response?.data?.message || 'Failed to restore tray');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRestoreRecipe = async (item: any) => {
        if (isProcessing) return;
        try {
            setIsProcessing(true);
            await recipesAPI.restore(item._id);
            toast.success(`Recipe "${item.name}" restored successfully`);
            fetchDeletedData();
        } catch (error: any) {
            console.error('Error restoring recipe:', error);
            toast.error(error.response?.data?.message || 'Failed to restore recipe');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRestoreAddOn = async (item: any) => {
        if (isProcessing) return;
        try {
            setIsProcessing(true);
            await menuAPI.restoreTemplate(item._id);
            toast.success(`Add-on group "${item.name}" restored successfully`);
            fetchDeletedData();
        } catch (error: any) {
            console.error('Error restoring add-on group:', error);
            toast.error(error.response?.data?.message || 'Failed to restore add-on group');
        } finally {
            setIsProcessing(false);
        }
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

    const handleRemoveImage = (idx: number) => {
        const newItems = [...bulkPreviewItems];
        newItems[idx].image = '';
        setBulkPreviewItems(newItems);
    };

    const handleUrlChange = (idx: number, url: string) => {
        const newItems = [...bulkPreviewItems];
        newItems[idx].image = url;
        setBulkPreviewItems(newItems);
    };

    const handlePreviewImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (previewTargetIdx === null) return;
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            toast.error('Image size exceeds 15MB limit');
            return;
        }

        const loadingToast = toast.loading('Uploading replacement image...');
        try {
            const response = await uploadAPI.uploadImage(file);
            const newItems = [...bulkPreviewItems];
            newItems[previewTargetIdx].image = response.data.url;
            setBulkPreviewItems(newItems);
            toast.success('Image replaced successfully');
        } catch (error) {
            toast.error('Failed to upload image');
        } finally {
            toast.dismiss(loadingToast);
            setPreviewTargetIdx(null);
            if (previewFileRef.current) previewFileRef.current.value = '';
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                let ws = wb.Sheets[wb.SheetNames[0]];
                let data = XLSX.utils.sheet_to_json(ws);

                // If first sheet is empty, try to find a sheet with data
                if (data.length === 0 && wb.SheetNames.length > 1) {
                    for (let i = 1; i < wb.SheetNames.length; i++) {
                        ws = wb.Sheets[wb.SheetNames[i]];
                        data = XLSX.utils.sheet_to_json(ws);
                        if (data.length > 0) break;
                    }
                }

                if (data.length === 0) {
                    toast.error('The selected file appears to be empty or has no recognizable data.');
                    return;
                }

                toast.loading('Processing your file...', { id: 'bulk-parse' });

                // Process data
                if (data.length === 0) {
                    toast.error('Excel sheet is empty');
                    return;
                }

                // Map data to CreateMenuDto
                const items = await Promise.all(data.map(async (row: any) => {
                    // Robust Dynamic Header Mapping
                    const findValue = (keywords: string[]) => {
                        const key = Object.keys(row).find(k => {
                            const normalizedK = k.toLowerCase().trim();
                            return keywords.some(kw => normalizedK === kw || normalizedK.includes(kw));
                        });
                        return key ? row[key] : undefined;
                    };

                    const id = findValue(['id', 'item id', '_id']);
                    const name = findValue(['name', 'item', 'product', 'title']);
                    const price = findValue(['price', 'rate', 'cost', 'amount']);
                    const category = findValue(['category', 'cat']);
                    const subcategory = findValue(['subcategory', 'subcat', 'sub category']);
                    const description = findValue(['description', 'desc', 'details']);
                    const image = findValue(['image url', 'imageurl', 'image', 'photo', 'img', 'url', 'link']);
                    const foodType = findValue(['food type', 'foodtype', 'veg', 'type']);
                    const isAvailable = findValue(['available', 'isavailable', 'stock']);
                    const isCateringAvailable = findValue(['catering', 'iscatering']);

                    if (!name || (price === undefined && row['Price'] === undefined)) {
                        // invalid row
                        return null;
                    }

                    // Process image field
                    const processedImage = await processImageField(image || '');

                    return {
                        _id: id ? String(id).trim() : undefined,
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



                const imageCount = validItems.filter(item => item.image).length;
                console.log(`[Frontend] Parsed ${validItems.length} items. Images found: ${imageCount}`);
                
                setBulkPreviewItems(validItems);
                setPreviewLimit(50);
                setDialogTab(1);
                toast.success(`Successfully parsed ${validItems.length} items. Detected ${imageCount} items with images.`, { id: 'bulk-parse' });
            } catch (error) {
                console.error(error);
                toast.error('Failed to parse Excel file');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleConfirmBulkUpload = async () => {
        if (uploadingBulk || bulkPreviewItems.length === 0) return;

        setUploadingBulk(true);
        const progressToast = toast.loading(`Uploading ${bulkPreviewItems.length} items...`);

        try {
            const res = await menuAPI.bulkCreate(bulkPreviewItems);
            console.log('[Frontend] Bulk upload response:', res);

            const createdCount = Array.isArray(res.data) ? res.data.length : (res.data?.count || 0);
            const skippedCount = bulkPreviewItems.length - createdCount;

            toast.dismiss(progressToast);
            if (createdCount > 0) {
                toast.success(`Uploaded ${createdCount} items.${skippedCount > 0 ? ` Skipped ${skippedCount} duplicates.` : ''}`);
            } else {
                toast.error(`No new items added. ${skippedCount} items were duplicates.`);
            }
            
            setBulkDialogOpen(false);
            setBulkPreviewItems([]);
            
            // Refresh data
            toast.loading('Refreshing menu...');
            setTimeout(() => {
                fetchData();
                toast.dismiss();
            }, 2000);
        } catch (error: any) {
            toast.dismiss(progressToast);
            console.error('[Frontend] Bulk upload error:', error);
            toast.error(`Upload failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
        } finally {
            setUploadingBulk(false);
        }
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

                // Expected: Item ID, Image URL, Name, Price, Category, Subcategory, Description, ImageURL, FoodType, IsAvailable, IsCateringAvailable
                // This is a bit ambiguous for pasted CSV if columns change, but we assume a fixed format or mostly we rely on Excel upload.
                // Let's assume the first column might be ID if it's 24 chars, or we just rely on handleFileUpload for Excel.
                // We'll leave the old CSV parsing alone for now, but handleFileUpload is what they use for Excel.
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

            try {
                console.log('[Frontend] Parsed CSV bulk upload request with', validItems.length, 'items');
                setBulkPreviewItems(validItems);
                setPreviewLimit(50); // Reset limit
                setDialogTab(1); // Switch to preview tab
                setBulkCsv('');
                toast.dismiss();
                toast.success(`Parsed ${validItems.length} items successfully.`);
            } catch (error: any) {
                console.error(error);
                toast.error(error.response?.data?.message || 'Failed to process items');
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

    const [isExporting, setIsExporting] = useState(false);

    const handleExportExcel = async () => {
        try {
            setIsExporting(true);
            const response = await menuAPI.exportExcel();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Menu_Export.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Menu exported successfully!');
        } catch (error) {
            console.error('Error exporting menu:', error);
            toast.error('Failed to export menu.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleOpenBulkDialog = () => {
        setBulkPreviewItems([]);
        setDialogTab(0);
        setBulkDialogOpen(true);
    };

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
                <Tab label="Add-ons" icon={<PlaylistAddIcon />} iconPosition="start" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                <Tab label="Deleted" icon={<DeleteIcon />} iconPosition="start" sx={{ fontWeight: 'bold', textTransform: 'none', color: 'error.main' }} />
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
                                    startIcon={isExporting ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon sx={{ fontSize: isMobile ? '0.9rem !important' : 'inherit' }} />}
                                    onClick={handleExportExcel}
                                    disabled={isExporting}
                                    sx={{ 
                                        width: 'auto',
                                        fontSize: isMobile ? '0.7rem' : '0.85rem',
                                        px: isMobile ? 1.5 : 2,
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        color: theme.palette.success.main,
                                        borderColor: theme.palette.success.main,
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.success.main, 0.04),
                                            borderColor: theme.palette.success.dark,
                                        }
                                    }}
                                >
                                    Export Menu
                                </Button>
                                <Button
                                    variant="outlined"
                                    size={isMobile ? "small" : "medium"}
                                    startIcon={<CloudUploadIcon sx={{ fontSize: isMobile ? '0.9rem !important' : 'inherit' }} />}
                                    onClick={handleOpenBulkDialog}
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
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={categories.map(c => c._id)}
                                        strategy={rectSortingStrategy}
                                    >
                                        <Grid container spacing={3}>
                                            {categories.map(category => (
                                                <SortableCategoryItem
                                                    key={category._id}
                                                    category={category}
                                                    menuItems={menuItems}
                                                    subcategories={subcategories}
                                                    itemBelongsToCategory={itemBelongsToCategory}
                                                    getSubcategoryParentId={getSubcategoryParentId}
                                                    getSubcategoryId={getSubcategoryId}
                                                    handleOpenCategoryDialog={handleOpenCategoryDialog}
                                                    handleDeleteCategory={handleDeleteCategory}
                                                />
                                            ))}
                                        </Grid>
                                    </SortableContext>
                                </DndContext>
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

            {/* Add-on Groups Tab */}
            {tabValue === 4 && (
                <Box>
                    <AddOnGroupsPage hideHeader />
                </Box>
            )}

            {/* Deleted Items Tab */}
            {tabValue === 5 && (
                <Box>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'error.main' }}>
                        Deleted Items
                    </Typography>
                    {deletedLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : deletedMenuItems.length === 0 && deletedCategories.length === 0 && deletedSubcategories.length === 0 && deletedTrays.length === 0 && deletedRecipes.length === 0 && deletedAddOns.length === 0 ? (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 10,
                            textAlign: 'center',
                            bgcolor: 'rgba(0,0,0,0.02)',
                            borderRadius: 4,
                            border: '2px dashed',
                            borderColor: 'divider',
                        }}>
                            <DeleteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" fontWeight="bold" gutterBottom>
                                No deleted items
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Items you delete will appear here and can be restored.
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {deletedCategories.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>Deleted Categories</Typography>
                                    <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
                                        <Table>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'error.50' }}>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Deleted At</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {deletedCategories.map((item: any) => (
                                                    <TableRow key={item._id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                                        <TableCell><Typography fontWeight="bold">{item.name}</Typography></TableCell>
                                                        <TableCell>{item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : '—'}</TableCell>
                                                        <TableCell align="right">
                                                            <Tooltip title="Restore">
                                                                <IconButton color="success" onClick={() => handleRestoreCategory(item)} disabled={isProcessing}>
                                                                    <RestoreIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}

                            {deletedSubcategories.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>Deleted Subcategories</Typography>
                                    <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
                                        <Table>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'error.50' }}>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Parent Category</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Deleted At</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {deletedSubcategories.map((item: any) => (
                                                    <TableRow key={item._id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                                        <TableCell><Typography fontWeight="bold">{item.name}</Typography></TableCell>
                                                        <TableCell>{typeof item.parentCategory === 'object' && item.parentCategory?.name ? item.parentCategory.name : '—'}</TableCell>
                                                        <TableCell>{item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : '—'}</TableCell>
                                                        <TableCell align="right">
                                                            <Tooltip title="Restore">
                                                                <IconButton color="success" onClick={() => handleRestoreCategory(item)} disabled={isProcessing}>
                                                                    <RestoreIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}

                            {deletedMenuItems.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>Deleted Menu Items</Typography>
                                    <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
                                        <Table>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'error.50' }}>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Price</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Deleted At</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {deletedMenuItems.map((item: any) => (
                                                    <TableRow key={item._id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                {item.image && (
                                                                    <Box component="img" src={item.image} alt={item.name} sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover' }} />
                                                                )}
                                                                <Box>
                                                                    <Typography fontWeight="bold">{item.name}</Typography>
                                                                    {item.description && (
                                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                            {item.description}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>{typeof item.category === 'object' && item.category?.name ? item.category.name : '—'}</TableCell>
                                                        <TableCell>{formatCurrency(item.price)}</TableCell>
                                                        <TableCell>{item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : '—'}</TableCell>
                                                        <TableCell align="right">
                                                            <Tooltip title="Restore">
                                                                <IconButton color="success" onClick={() => handleRestoreMenuItem(item)} disabled={isProcessing}>
                                                                    <RestoreIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}

                            {deletedTrays.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>Deleted Trays</Typography>
                                    <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
                                        <Table>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'error.50' }}>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Deleted At</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {deletedTrays.map((item: any) => (
                                                    <TableRow key={item._id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                                        <TableCell><Typography fontWeight="bold">{item.name}</Typography></TableCell>
                                                        <TableCell>{item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : '—'}</TableCell>
                                                        <TableCell align="right">
                                                            <Tooltip title="Restore">
                                                                <IconButton color="success" onClick={() => handleRestoreTray(item)} disabled={isProcessing}>
                                                                    <RestoreIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}

                            {deletedRecipes.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>Deleted Recipes</Typography>
                                    <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
                                        <Table>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'error.50' }}>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Menu Item</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Serving Size</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Deleted At</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {deletedRecipes.map((item: any) => (
                                                    <TableRow key={item._id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                                        <TableCell><Typography fontWeight="bold">{item.menuItem?.name || 'Unknown'}</Typography></TableCell>
                                                        <TableCell>{item.servingSize}</TableCell>
                                                        <TableCell>{item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : '—'}</TableCell>
                                                        <TableCell align="right">
                                                            <Tooltip title="Restore">
                                                                <IconButton color="success" onClick={() => handleRestoreRecipe(item)} disabled={isProcessing}>
                                                                    <RestoreIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}

                            {deletedAddOns.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>Deleted Add-on Groups</Typography>
                                    <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
                                        <Table>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'error.50' }}>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Modifiers</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Deleted At</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {deletedAddOns.map((item: any) => (
                                                    <TableRow key={item._id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                                        <TableCell><Typography fontWeight="bold">{item.name}</Typography></TableCell>
                                                        <TableCell>{item.modifiers?.length || 0} items</TableCell>
                                                        <TableCell>{item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : '—'}</TableCell>
                                                        <TableCell align="right">
                                                            <Tooltip title="Restore">
                                                                <IconButton color="success" onClick={() => handleRestoreAddOn(item)} disabled={isProcessing}>
                                                                    <RestoreIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}
                        </Box>
                    )}
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
                                label={(editingCategory ? isSubcategory(editingCategory) : !!categoryForm.parentCategory) ? "Subcategory Name" : "Category Name"}
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value.trimStart().replace(/[^a-zA-Z\s]/g, '') })}
                                onBlur={() => {
                                    setCategoryForm({ ...categoryForm, name: categoryForm.name.trim() });
                                    setCategoryTouched((prev) => ({ ...prev, name: true }));
                                }}
                                error={categoryTouched.name && !categoryForm.name.trim()}
                                helperText={categoryTouched.name && !categoryForm.name.trim() ? ((editingCategory ? isSubcategory(editingCategory) : !!categoryForm.parentCategory) ? 'Subcategory name is required' : 'Category name is required') : `${categoryForm.name.length}/50 characters`}
                                fullWidth
                                required
                                inputProps={{ maxLength: 50 }}
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
            <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography variant="h6" component="div">Bulk Upload Menu Items</Typography>
                        <Tabs value={dialogTab} onChange={(e, v) => setDialogTab(v)} sx={{ mt: 1 }}>
                            <Tab label="Upload File" />
                            <Tab label={`Preview (${bulkPreviewItems.length})`} disabled={bulkPreviewItems.length === 0} />
                        </Tabs>
                    </Box>
                    <IconButton
                        aria-label="close bulk upload dialog"
                        onClick={() => setBulkDialogOpen(false)}
                        size="small"
                        sx={{
                            bgcolor: theme.palette.error.main,
                            color: '#fff',
                            width: 28,
                            height: 28,
                            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.85) },
                        }}
                    >
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {dialogTab === 0 && (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Box sx={{ mb: 4, p: 3, border: '2px dashed', borderColor: 'divider', borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                                <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2, opacity: 0.5 }} />
                                <Typography variant="h6" gutterBottom fontWeight="bold">Upload Spreadsheet</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    Upload an Excel (.xlsx, .xls) or CSV file with your menu items.
                                </Typography>
                                <Button
                                    variant="contained"
                                    component="label"
                                    startIcon={<CloudUploadIcon />}
                                    size="large"
                                    sx={{ borderRadius: 2, px: 4 }}
                                >
                                    Select File
                                    <input
                                        type="file"
                                        hidden
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleFileUpload}
                                    />
                                </Button>
                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
                                    Maximum 500 items per batch
                                </Typography>
                            </Box>

                            <Box sx={{ mt: 2 }}>
                                <Button 
                                    variant="outlined" 
                                    size="small" 
                                    startIcon={<PlaylistAddIcon />}
                                    sx={{ borderRadius: 2 }}
                                    onClick={() => {
                                        const template = [
                                            { Name: 'Classic Burger', Price: 12.99, Category: 'Main Course', Subcategory: 'Burgers', Description: 'Juicy beef patty with lettuce, tomato, and special sauce', Image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500', 'Food Type': 'non-veg', 'Is Available': 'true', 'Is Catering Available': 'true' },
                                            { Name: 'Margherita Pizza', Price: 14.50, Category: 'Main Course', Subcategory: 'Italian', Description: 'Fresh mozzarella, basil, and tomato sauce', Image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500', 'Food Type': 'veg', 'Is Available': 'true', 'Is Catering Available': 'true' },
                                            { Name: 'Greek Salad', Price: 9.99, Category: 'Starters', Subcategory: 'Salads', Description: 'Cucumber, olives, feta cheese, and balsamic dressing', Image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500', 'Food Type': 'veg', 'Is Available': 'true', 'Is Catering Available': 'false' }
                                        ];
                                        const ws = XLSX.utils.json_to_sheet(template);
                                        const wb = XLSX.utils.book_new();
                                        XLSX.utils.book_append_sheet(wb, ws, "Template");
                                        XLSX.writeFile(wb, "menu_upload_template.xlsx");
                                    }}
                                >
                                    Download Excel Template
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {dialogTab === 1 && (
                        <Box>
                            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <Box>
                                        Reviewing <b>{bulkPreviewItems.length}</b> items. 
                                        Detected <b>{bulkPreviewItems.filter(i => i.image).length}</b> images.
                                    </Box>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                        Check the first {previewLimit} items below
                                    </Typography>
                                </Box>
                            </Alert>
                            <TableContainer component={Paper} sx={{ maxHeight: 600, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', width: 80 }}>Preview</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', width: 280 }}>Image Link</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Item Details</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Price</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {bulkPreviewItems.slice(0, previewLimit).map((item, idx) => (
                                            <TableRow key={idx} hover>
                                                <TableCell>
                                                    <Tooltip 
                                                        title={
                                                            item.image ? (
                                                                <Box sx={{ p: 0.5 }}>
                                                                    <img 
                                                                        src={item.image} 
                                                                        alt="Large Preview" 
                                                                        style={{ maxWidth: 300, maxHeight: 300, borderRadius: 4, display: 'block' }} 
                                                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Invalid+Image+URL'; }}
                                                                    />
                                                                </Box>
                                                            ) : "No Image"
                                                        }
                                                        arrow
                                                        placement="right"
                                                    >
                                                        <Box 
                                                            sx={{ 
                                                                width: 70, 
                                                                height: 70, 
                                                                borderRadius: 2, 
                                                                overflow: 'hidden', 
                                                                border: '2px solid', 
                                                                borderColor: item.image ? 'primary.light' : 'divider',
                                                                position: 'relative',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                bgcolor: 'action.hover',
                                                                transition: 'transform 0.2s',
                                                                '&:hover': { transform: 'scale(1.05)', cursor: 'zoom-in' }
                                                            }}
                                                        >
                                                            {item.image ? (
                                                                <img 
                                                                    src={item.image} 
                                                                    alt={item.name} 
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                    loading="lazy"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/70?text=Error';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <ImageIcon sx={{ color: 'text.disabled' }} />
                                                            )}
                                                        </Box>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            placeholder="Paste Image URL..."
                                                            value={item.image || ''}
                                                            onChange={(e) => handleUrlChange(idx, e.target.value)}
                                                            InputProps={{
                                                                sx: { fontSize: '0.75rem', bgcolor: 'background.paper' },
                                                                endAdornment: item.image ? (
                                                                    <InputAdornment position="end">
                                                                        <IconButton size="small" onClick={() => handleRemoveImage(idx)} color="error">
                                                                            <CloseIcon fontSize="small" />
                                                                        </IconButton>
                                                                    </InputAdornment>
                                                                ) : null
                                                            }}
                                                        />
                                                        {item.image && (
                                                            <Button 
                                                                variant="text"
                                                                size="small"
                                                                onClick={() => setFullScreenImage(item.image)}
                                                                sx={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main', textTransform: 'none', p: 0, justifyContent: 'flex-start', '&:hover': { textDecoration: 'underline' } }}
                                                            >
                                                                <OpenInNewIcon sx={{ fontSize: 12 }} /> View Full Resolution
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="text"
                                                            size="small"
                                                            startIcon={<PhotoCameraIcon sx={{ fontSize: 14 }} />}
                                                            onClick={() => {
                                                                setPreviewTargetIdx(idx);
                                                                previewFileRef.current?.click();
                                                            }}
                                                            sx={{ fontSize: '0.65rem', textTransform: 'none', p: 0, justifyContent: 'flex-start', minWidth: 0, height: 'auto' }}
                                                        >
                                                            Replace with File
                                                        </Button>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold" sx={{ color: 'text.primary' }}>{item.name}</Typography>
                                                    <Chip 
                                                        label={item.foodType || 'n/a'} 
                                                        size="small" 
                                                        variant="filled"
                                                        color={item.foodType === 'veg' ? 'success' : item.foodType === 'non-veg' ? 'error' : 'default'}
                                                        sx={{ height: 18, fontSize: '0.65rem', mt: 0.5, fontWeight: 600 }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.primary">{item.category}</Typography>
                                                    {item.subcategory && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                                                            {item.subcategory}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>
                                                    {formatCurrency(item.price)}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" sx={{ 
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        maxWidth: 200
                                                    }}>
                                                        {item.description || '-'}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {bulkPreviewItems.length > previewLimit && (
                                <Box sx={{ mt: 2, textAlign: 'center' }}>
                                    <Button 
                                        variant="outlined" 
                                        onClick={() => setPreviewLimit(prev => prev + 50)}
                                        sx={{ borderRadius: 2, fontWeight: 'bold' }}
                                    >
                                        Load More (Showing {previewLimit} of {bulkPreviewItems.length})
                                    </Button>
                                </Box>
                            )}
                            <input
                                type="file"
                                hidden
                                ref={previewFileRef}
                                accept="image/*"
                                onChange={handlePreviewImageChange}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, px: 3 }}>
                    <Button onClick={() => setBulkDialogOpen(false)} disabled={uploadingBulk}>Cancel</Button>
                    <Box sx={{ flexGrow: 1 }} />
                    {dialogTab === 1 && (
                        <>
                            <Button 
                                onClick={() => {
                                    setBulkPreviewItems([]);
                                    setDialogTab(0);
                                }} 
                                color="inherit"
                                disabled={uploadingBulk}
                            >
                                Clear Selection
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleConfirmBulkUpload}
                                disabled={uploadingBulk}
                                startIcon={uploadingBulk ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                                sx={{ borderRadius: 2, px: 4 }}
                            >
                                {uploadingBulk ? 'Uploading...' : `Confirm & Upload ${bulkPreviewItems.length} Items`}
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            {/* Generic Confirmation Dialog */}
            <Dialog
                open={confirmAction.open}
                onClose={() => setConfirmAction({ ...confirmAction, open: false })}
                PaperProps={{
                    sx: { borderRadius: 3, p: 1, maxWidth: '450px' }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <WarningIcon sx={{ color: 'warning.main', fontSize: 32 }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                            {confirmAction.title}
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {confirmAction.message}
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 1.5, gap: 1 }}>
                    {confirmAction.showCancel !== false && (
                        <Button
                            onClick={() => setConfirmAction({ ...confirmAction, open: false })}
                            variant="outlined"
                            sx={{ borderRadius: 2, px: 2 }}
                        >
                            Cancel
                        </Button>
                    )}
                    <Box sx={{ flexGrow: 1 }} />
                    {confirmAction.onAlternative && (
                        <Button
                            onClick={() => {
                                confirmAction.onAlternative?.();
                                setConfirmAction({ ...confirmAction, open: false });
                            }}
                            variant="outlined"
                            color="primary"
                            sx={{ borderRadius: 2, px: 2, fontWeight: 'bold' }}
                        >
                            {confirmAction.alternativeLabel || 'Alternative'}
                        </Button>
                    )}
                    <Button
                        onClick={() => {
                            confirmAction.onConfirm();
                            setConfirmAction({ ...confirmAction, open: false });
                        }}
                        variant="contained"
                        color="primary"
                        sx={{ borderRadius: 2, px: 3, fontWeight: 'bold' }}
                    >
                        {confirmAction.confirmLabel || 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirm categories before adding a menu item */}
            <Dialog
                open={categoryConfirmOpen}
                onClose={() => setCategoryConfirmOpen(false)}
                PaperProps={{ sx: { borderRadius: 3, maxWidth: 460 } }}
                fullWidth
            >
                <DialogTitle sx={{ pb: 1 }}>Add Menu Item</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Your menu item will be added under one of these {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}.
                        Want to add another category first, or continue?
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {categories.map((cat) => (
                            <Chip
                                key={cat._id}
                                label={cat.name}
                                size="small"
                                variant="outlined"
                                color="primary"
                            />
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 1.5, gap: 1 }}>
                    <Button onClick={() => setCategoryConfirmOpen(false)}>Cancel</Button>
                    <Button
                        variant="outlined"
                        onClick={() => { setCategoryConfirmOpen(false); handleOpenCategoryDialog(); }}
                    >
                        Add Category
                    </Button>
                    <Button variant="contained" onClick={proceedToAddMenuItem}>
                        Continue to Add Item
                    </Button>
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
             {/* Full Screen Image Preview Dialog */}
             <Dialog 
                open={Boolean(fullScreenImage)} 
                onClose={() => setFullScreenImage(null)} 
                maxWidth="md" 
                fullWidth
                PaperProps={{
                    sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'hidden' }
                }}
            >
                <DialogTitle sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', bgcolor: 'rgba(0,0,0,0.5)' }}>
                    <IconButton onClick={() => setFullScreenImage(null)} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.8)' }}>
                    {fullScreenImage && (
                        <img 
                            src={fullScreenImage} 
                            alt="Full Resolution" 
                            style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} 
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default MenuPage;
