import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    MenuItem,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Card,
    CardMedia,
    CircularProgress,
    Grid,
    Divider,
    Autocomplete,
    alpha,
    useTheme,
    Tooltip,
    InputAdornment,
    Chip,
    FormControl
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    ArrowBack as BackIcon,
    CloudUpload as UploadIcon,
    Store as VendorIcon,
    Description as DetailsIcon,
    Inventory as ItemsIcon,
    AttachFile as AttachmentIcon,
    LocalShipping as ShippingIcon,
    AccountBalance as BankIcon,
    InfoOutlined as InfoIcon,
    AutoAwesome as AutoAwesomeIcon,
    CheckCircle as CheckCircleIcon,
    AddCircleOutline as AddCircleIcon,
    MoveToInbox as RestockIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { purchaseOrdersAPI, uploadAPI, inventoryAPI, usersAPI, vendorsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

// --- Global Utilities ---
const normalizeUnit = (unit: string): string => {
    const u = (unit || '').toLowerCase().trim();
    if (u === 'box') return 'boxes';
    if (u === 'packet') return 'packets';
    if (u === 'piece') return 'pieces';
    if (u === 'bottle') return 'bottles';
    if (u === 'kg') return 'kg';
    if (u === 'g') return 'g';
    if (u === 'l') return 'l';
    if (u === 'ml') return 'ml';
    return u;
};

const CreatePOPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<any>(null);
    
    // Check for pre-filled data from navigation state (e.g., from Reorder alerts)
    const state = location.state as any;

    const [formData, setFormData] = useState({
        type: 'purchase_order',
        poNumber: `PO-${Date.now().toString().slice(-6)}`, // Visual indicator
        vendor: state?.vendor || { name: '', contact: '', email: '', address: '' },
        category: state?.category || 'raw_materials',
        referenceNumber: '',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: state?.items || [{ description: '', quantity: 1, unit: 'kg', unitPrice: 0, total: 0, inventoryItem: '', weightValue: '', weightUnit: 'lb' }],
        taxRate: 0, // No tax for purchase orders
        shippingCost: 0,
        notes: state?.notes || '',
        status: 'draft',
        paymentStatus: 'unpaid',
        paymentMethod: 'cash',
        paymentSource: 'bank_account',
        attachments: [] as any[],
        metadata: {} as any,
    });
    const [uploading, setUploading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchInventory();
        fetchUsers();
        fetchVendors();
    }, []);

    // Refetch vendors when category changes
    useEffect(() => {
        fetchVendors();
        setSelectedVendor(null); // Reset selected vendor when category changes
    }, [formData.category]);

    const fetchInventory = async () => {
        try {
            const response = await inventoryAPI.getAll();
            setInventoryItems(response.data || []);
        } catch (error) {
            console.error('Failed to fetch inventory', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await usersAPI.getUsers();
            const allUsers = response.data.data || response.data.users || response.data || [];
            setUsers(allUsers.filter((u: any) => !u.roles?.includes('customer')));
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const fetchVendors = async () => {
        try {
            const response = await vendorsAPI.getAll({ status: 'active', category: formData.category });
            setVendors(response.data.vendors || []);
        } catch (error) {
            console.error('Failed to fetch vendors', error);
        }
    };

    const handleCreateVendor = async () => {
        const vendorName = formData.vendor.name?.trim();
        if (!vendorName) {
            toast.error('Vendor name is required');
            return;
        }
        try {
            toast.loading('Creating vendor...', { id: 'create-vendor' });
            const newVendor = {
                name: vendorName,
                contact: formData.vendor.contact || '',
                email: formData.vendor.email || '',
                address: formData.vendor.address || '',
                categories: [formData.category || 'raw_materials'],
                status: 'active',
            };
            const response = await vendorsAPI.create(newVendor);
            const created = response.data?.data || response.data?.vendor || response.data;
            
            // Refresh vendors list and auto-select the new one
            await fetchVendors();
            setSelectedVendor(created);
            setFormData(prev => ({
                ...prev,
                vendor: {
                    name: created.name,
                    contact: created.contact || prev.vendor.contact,
                    email: created.email || prev.vendor.email,
                    address: created.address || prev.vendor.address,
                },
                metadata: { ...prev.metadata, vendorId: created._id }
            }));
            toast.success(`Vendor "${vendorName}" created!`, { id: 'create-vendor' });
        } catch (error: any) {
            console.error('Failed to create vendor:', error);
            toast.error(error.response?.data?.message || 'Failed to create vendor', { id: 'create-vendor' });
        }
    };

    const handleVendorSelect = (vendor: any) => {
        setSelectedVendor(vendor);
        if (vendor) {
            setFormData(prev => ({
                ...prev,
                vendor: {
                    name: vendor.name,
                    contact: vendor.contact || '',
                    email: vendor.email || '',
                    address: vendor.address || '',
                },
                metadata: { ...prev.metadata, vendorId: vendor._id }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                vendor: { name: '', contact: '', email: '', address: '' },
                metadata: { ...prev.metadata, vendorId: undefined }
            }));
        }
    };

    const handleVendorChange = (field: string, value: string) => {
        let finalValue = value;
        if (field === 'contact') {
            finalValue = value.replace(/\D/g, '').slice(0, 10);
        }
        setFormData({ ...formData, vendor: { ...formData.vendor, [field]: finalValue } });
    };

    const handleMetadataChange = (field: string, value: any) => {
        setFormData({ ...formData, metadata: { ...formData.metadata, [field]: value } });
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];

        if (field === 'inventoryItem' && value) {
            const item = inventoryItems.find(i => i._id === value);
            if (item) {
                newItems[index] = {
                    ...newItems[index],
                    description: item.name,
                    unit: item.unit,
                    unitPrice: item.costPrice || 0,
                    inventoryItem: item._id,
                    total: (newItems[index].quantity || 1) * (item.costPrice || 0)
                };
            }
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
            if (field === 'quantity' || field === 'unitPrice') {
                newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unitPrice || 0);
            }
        }

        setFormData({ ...formData, items: newItems });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const response = await uploadAPI.uploadImage(file);
            const url = response.data.url || response.data.imageUrl || response.data;
            const finalUrl = typeof url === 'string' ? url : (url.url || url);

            setFormData(prev => ({
                ...prev,
                attachments: [...prev.attachments, { url: finalUrl, name: file.name }]
            }));
            toast.success('File uploaded successfully');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const removeAttachment = (index: number) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const handleExtractInvoice = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset the input so the same file can be re-uploaded
        event.target.value = '';

        setExtracting(true);
        toast.loading('Extracting invoice with AI...', { id: 'extract-toast' });
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            const response = await purchaseOrdersAPI.extractInvoice(formDataUpload);
            
            console.log('=== AI FULL RESPONSE ===', JSON.stringify(response.data, null, 2));
            
            const responseData = response.data?.data || response.data;
            const extractionData = responseData.extraction || responseData;
            const verificationData = responseData.verification || {};
            
            console.log('=== EXTRACTION KEYS ===', Object.keys(extractionData));
            console.log('=== EXTRACTION DATA ===', JSON.stringify(extractionData, null, 2));
            console.log('=== VERIFICATION KEYS ===', Object.keys(verificationData));
            console.log('=== VERIFICATION DATA ===', JSON.stringify(verificationData, null, 2));

            // Helper: recursively find an object with certain keys
            const findNested = (obj: any, ...keys: string[]): any => {
                if (!obj || typeof obj !== 'object') return null;
                for (const key of keys) {
                    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
                }
                for (const val of Object.values(obj)) {
                    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                        const found = findNested(val, ...keys);
                        if (found !== null && found !== undefined) return found;
                    }
                }
                return null;
            };

            // Helper: recursively find first array in object
            const findFirstArray = (obj: any): any[] => {
                if (!obj || typeof obj !== 'object') return [];
                if (Array.isArray(obj)) return obj;
                for (const val of Object.values(obj)) {
                    if (Array.isArray(val) && val.length > 0) return val;
                    if (typeof val === 'object' && val !== null) {
                        const found = findFirstArray(val);
                        if (found.length > 0) return found;
                    }
                }
                return [];
            };

            // --- Auto-fill Vendor Details ---
            const vendorObj = extractionData.vendor || extractionData.vendor_details || extractionData.supplier_info || {};
            const vendorName = findNested(extractionData, 'vendor_name', 'supplier_name', 'company_name') || 
                               vendorObj.vendor_name || vendorObj.name || vendorObj.company || vendorObj.supplier || 
                               extractionData.vendor_name || extractionData.supplier || '';
            const vendorContact = findNested(extractionData, 'phone', 'phone_number', 'contact_number', 'tel') ||
                                  vendorObj.phone || vendorObj.contact || vendorObj.phone_number || '';
            const vendorEmail = findNested(extractionData, 'email', 'vendor_email') || 
                                vendorObj.email || '';
            const vendorAddress = findNested(extractionData, 'address', 'vendor_address', 'location', 'street') || 
                                  vendorObj.address || vendorObj.location || '';

            console.log('=== MAPPED VENDOR ===', { vendorName, vendorContact, vendorEmail, vendorAddress });

            // --- Auto-fill Items ---
            // Try verification data first (matched products), then extraction data
            let rawItems = findFirstArray(verificationData);
            if (rawItems.length === 0) rawItems = findFirstArray(extractionData);
            
            console.log('=== RAW ITEMS ===', JSON.stringify(rawItems, null, 2));

            const extractedItems = rawItems.length > 0 ? rawItems.map((item: any) => {
                const qty = parseFloat(item.quantity || item.qty || item.count || item.amount || 1);
                const price = parseFloat(item.price || item.unit_price || item.unitPrice || item.rate || item.cost || item.unit_cost || 0);
                const itemName = item.name || item.description || item.product || item.item || item.product_name || 
                                 item.matched_name || item.item_name || item.material || '';
                
                // Try to match with existing inventory items
                let matchedInventoryId = item.inventory_id || item.inventoryId || item.matched_id || item._id || '';
                if (!matchedInventoryId && itemName) {
                    const matchedInv = inventoryItems.find((inv: any) =>
                        inv.name.toLowerCase().includes(itemName.toLowerCase()) ||
                        itemName.toLowerCase().includes(inv.name.toLowerCase())
                    );
                    if (matchedInv) matchedInventoryId = matchedInv._id;
                }

                // Check if verified/matched
                const isVerified = item.verified === true || item.matched === true || item.exists === true || 
                                   item.status === 'matched' || item.status === 'verified' || item.status === 'found';

                return {
                    description: itemName,
                    quantity: isNaN(qty) ? 1 : qty,
                    unit: normalizeUnit(item.unit || item.uom || 'kg'),
                    unitPrice: isNaN(price) ? 0 : price,
                    total: (isNaN(qty) ? 1 : qty) * (isNaN(price) ? 0 : price),
                    inventoryItem: matchedInventoryId || (isVerified ? 'verified' : ''),
                    weightValue: item.weight_value || item.weightValue || item.weight || '',
                    weightUnit: normalizeUnit(item.weight_unit || item.weightUnit || item.unit || 'lb')
                };
            }) : [{ description: '', quantity: 1, unit: 'kg', unitPrice: 0, total: 0, inventoryItem: '', weightValue: '', weightUnit: 'lb' }];

            console.log('=== MAPPED ITEMS ===', JSON.stringify(extractedItems, null, 2));

            // --- Auto-fill other fields ---
            const invoiceNumber = findNested(extractionData, 'invoice_number', 'invoiceNumber', 'reference', 'bill_number', 'receipt_number', 'invoice_no') || '';
            const dueDate = findNested(extractionData, 'due_date', 'dueDate', 'payment_due', 'delivery_date', 'date_due') || '';
            const invoiceDate = findNested(extractionData, 'invoice_date', 'date', 'order_date', 'bill_date') || '';

            // Format date if found (try to parse various date formats)
            let formattedDueDate = '';
            const rawDate = dueDate || invoiceDate;
            if (rawDate) {
                try {
                    const parsed = new Date(rawDate);
                    if (!isNaN(parsed.getTime())) {
                        formattedDueDate = parsed.toISOString().split('T')[0];
                    }
                } catch (e) { /* ignore parse errors */ }
            }

            console.log('=== MAPPED OTHER ===', { invoiceNumber, dueDate, invoiceDate, formattedDueDate });

            setFormData(prev => ({
                ...prev,
                vendor: {
                    name: vendorName || prev.vendor.name,
                    contact: vendorContact || prev.vendor.contact,
                    email: vendorEmail || prev.vendor.email,
                    address: vendorAddress || prev.vendor.address,
                },
                items: extractedItems,
                referenceNumber: invoiceNumber || prev.referenceNumber,
                dueDate: formattedDueDate || prev.dueDate,
                notes: (prev.notes ? prev.notes + '\n\n' : '') + 
                    `--- AI Extraction ---\n${JSON.stringify(extractionData, null, 2)}` +
                    `\n\n--- AI Verification ---\n${JSON.stringify(verificationData, null, 2)}`
            }));
            
            // Try to match vendor from existing vendors list
            if (vendorName) {
                const matched = vendors.find((v: any) => 
                    v.name.toLowerCase().trim() === vendorName.toLowerCase().trim()
                );
                if (matched) {
                    setSelectedVendor(matched);
                    toast.success(`Invoice extracted! Vendor matched: ${matched.name}`, { id: 'extract-toast' });
                    // Use matched vendor's details if they exist to complement AI extraction
                    setFormData(prev => ({
                        ...prev,
                        vendor: {
                            ...prev.vendor,
                            contact: prev.vendor.contact || matched.contact || '',
                            email: prev.vendor.email || matched.email || '',
                            address: prev.vendor.address || matched.address || '',
                        }
                    }));
                } else {
                    toast.success(`Invoice extracted! Vendor "${vendorName}" filled. Review items.`, { id: 'extract-toast' });
                }
            } else {
                toast.success('Invoice extracted! Review the auto-filled data.', { id: 'extract-toast' });
            }

            // Also upload as visual evidence
            try {
                const uploadRes = await uploadAPI.uploadImage(file);
                const url = uploadRes.data.url || uploadRes.data.imageUrl || uploadRes.data;
                const finalUrl = typeof url === 'string' ? url : (url.url || url);
                setFormData(prev => ({
                    ...prev,
                    attachments: [...prev.attachments, { url: finalUrl, name: file.name }]
                }));
            } catch (err) {
                console.warn('Evidence upload failed, skipping.');
            }

        } catch (error: any) {
            console.error('Extraction error:', error);
            toast.error(error.response?.data?.message || 'Failed to extract invoice', { id: 'extract-toast' });
        } finally {
            setExtracting(false);
        }
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: '', quantity: 1, unit: 'kg', unitPrice: 0, total: 0, inventoryItem: '', weightValue: '', weightUnit: 'lb' }],
        });
    };

    const handleCreateInventoryItem = async (index: number) => {
        const item = formData.items[index];
        if (!item.description) {
            toast.error('Item name is required to create in inventory');
            return;
        }
        
        if (!formData.vendor.name) {
            toast.error('Please select or enter a vendor name first');
            return;
        }

        try {
            toast.loading('Creating inventory item...', { id: `create-inv-${index}` });
            const newItem = {
                name: item.description,
                sku: `AI-${Date.now().toString().slice(-8)}`,
                category: 'raw_materials',
                unit: normalizeUnit(item.unit || 'kg'),
                currentStock: 0,
                minimumStock: 1,
                maximumStock: 1000,
                reorderLevel: 5,
                costPrice: item.unitPrice || 0,
                sellingPrice: 0,
                supplier: {
                    name: formData.vendor.name || '',
                    contact: formData.vendor.contact || '',
                    email: formData.vendor.email || '',
                    address: formData.vendor.address || '',
                },
                description: `Auto-created from Purchase Order ${formData.poNumber}`,
                isPerishable: false,
                isActive: true,
            };
            const response = await inventoryAPI.create(newItem);
            const createdItem = response.data?.data || response.data;
            
            // Update the item row with the new inventory ID
            const newItems = [...formData.items];
            newItems[index] = { ...newItems[index], inventoryItem: createdItem._id };
            setFormData(prev => ({ ...prev, items: newItems }));
            
            // Refresh inventory list
            await fetchInventory();
            
            toast.success(`"${item.description}" added to inventory with supplier "${formData.vendor.name}"!`, { id: `create-inv-${index}` });
        } catch (error: any) {
            console.error('Failed to create inventory item:', error);
            const errorMsg = error.response?.data?.message || 'Failed to create inventory item';
            toast.error(errorMsg, { id: `create-inv-${index}` });
        }
    };

    const removeItem = (index: number) => {
        setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
    };

    const handleRestockAll = async () => {
        const verifiedItems = formData.items.filter(item => item.inventoryItem && item.inventoryItem !== 'verified' && item.quantity > 0);
        if (verifiedItems.length === 0) {
            toast.error('No verified inventory items to restock. Ensure all items are matched to inventory first.');
            return;
        }

        toast.loading(`Restocking ${verifiedItems.length} items...`, { id: 'restock-toast' });
        try {
            const restockPayload = verifiedItems.map(item => ({
                inventoryId: item.inventoryItem,
                quantity: item.quantity,
                costPrice: item.unitPrice || undefined,
            }));

            const response = await inventoryAPI.restockBulk(restockPayload);
            const result = response.data?.data || response.data;

            if (result.success > 0) {
                toast.success(
                    `✅ Restocked ${result.success} items successfully!${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
                    { id: 'restock-toast', duration: 5000 }
                );
            } else {
                toast.error('Failed to restock items. Check the console for details.', { id: 'restock-toast' });
            }
            console.log('Restock result:', result);
        } catch (error: any) {
            console.error('Restock error:', error);
            toast.error(error.response?.data?.message || 'Failed to restock items', { id: 'restock-toast' });
        }
    };

    const calculateSubtotal = () => formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const calculateTax = () => (calculateSubtotal() * (formData.taxRate || 0)) / 100;
    const calculateTotal = () => calculateSubtotal() + calculateTax() + (formData.shippingCost || 0);

    const handleSubmit = async (status: string) => {
        if (!formData.vendor.name && formData.category !== 'salaries') {
            setErrors(prev => ({ ...prev, name: 'Required field' }));
            toast.error('Entity name is required');
            return;
        }

        setLoading(true);
        try {
            await purchaseOrdersAPI.create({
                ...formData,
                status,
                subtotal: calculateSubtotal(),
                tax: calculateTax(),
                totalAmount: calculateTotal(),
            });
            toast.success('Record saved successfully!');
            navigate('../purchase-orders');
        } catch (error: any) {
            console.error('Create PO Error:', error);
            toast.error(error.response?.data?.message || 'Failed to create record');
        } finally {
            setLoading(false);
        }
    };

    const SectionHeader = ({ icon, title, centeredOnMobile, sx }: { icon: React.ReactNode, title: string, centeredOnMobile?: boolean, sx?: any }) => (
        <Stack
            direction={{ xs: centeredOnMobile ? 'column' : 'row', md: 'row' }}
            spacing={2}
            alignItems="center"
            justifyContent={{ xs: centeredOnMobile ? 'center' : 'flex-start', md: 'flex-start' }}
            sx={{
                mb: 3,
                width: '100%',
                textAlign: { xs: centeredOnMobile ? 'center' : 'left', md: 'left' },
                ...sx
            }}
        >
            <Box sx={{
                p: 1.5,
                borderRadius: 2.5,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                display: 'flex',
                boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.05)}`
            }}>
                {icon}
            </Box>
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1.2rem', md: '1.25rem' } }}>{title}</Typography>
        </Stack>
    );

    // --- Dynamic UI Logic ---
    const isSalary = formData.category === 'salaries';
    const isUtility = formData.category === 'utilities';
    const isInventory = formData.category === 'raw_materials';

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
                mb={4}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
                    <IconButton onClick={() => navigate('../purchase-orders')} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <BackIcon />
                    </IconButton>
                    <Box>
                        <Typography variant="h4" fontWeight="900" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>Create Purchase Order</Typography>
                        <Typography variant="body2" color="text.secondary">Detailed financial logging for {formData.category.split('_').join(' ')}</Typography>
                    </Box>
                </Box>
                <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }} />
                <Chip
                    label={formData.poNumber}
                    color="primary"
                    variant="outlined"
                    sx={{
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        px: 1,
                        alignSelf: { xs: 'flex-start', sm: 'center' },
                        ml: { xs: 7, sm: 0 } // Align with text on mobile
                    }}
                />
            </Stack>

            <Grid container spacing={4}>
                {/* Left Column - Main Form */}
                <Grid item xs={12} md={12}>
                    <Stack spacing={4}>
                        {/* 1. Transaction Type & Category */}
                        <Paper sx={{ p: 4, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <SectionHeader icon={<DetailsIcon />} title="Category & Type" sx={{ mb: 0 }} />
                                
                                <Button
                                    component="label"
                                    variant="contained"
                                    color="secondary"
                                    disabled={extracting}
                                    startIcon={extracting ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
                                    sx={{
                                        borderRadius: 3,
                                        px: 3,
                                        py: 1,
                                        background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                        boxShadow: '0 4px 14px 0 rgba(139,92,246,0.39)',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                                        }
                                    }}
                                >
                                    {extracting ? 'Extracting...' : 'Extract Invoice AI'}
                                    <input type="file" hidden accept="image/*,application/pdf,.doc,.docx" onChange={handleExtractInvoice} />
                                </Button>
                            </Box>
                            <Grid container spacing={3}>
                                {/* <Grid item xs={12}>
                                    <ToggleButtonGroup
                                        value={formData.type}
                                        exclusive
                                        onChange={(_, newType) => newType && setFormData({ ...formData, type: newType })}
                                        fullWidth
                                        sx={{ bgcolor: alpha(theme.palette.divider, 0.2), p: 0.5, borderRadius: 4 }}
                                    >
                                        <ToggleButton value="purchase_order" sx={{ borderRadius: 3 }}>🛒 Inventory PO</ToggleButton>
                                        // <ToggleButton value="expense" sx={{ borderRadius: 3 }}>💸 Generic Expense</ToggleButton>
                                    </ToggleButtonGroup>
                                </Grid> */}
                                <Grid item xs={12}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Primary Category"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        SelectProps={{ MenuProps: { PaperProps: { sx: { borderRadius: 3 } } } }}
                                    >
                                        <MenuItem value="raw_materials">🥩 Raw Materials</MenuItem>
                                        <MenuItem value="salaries">👥 Salaries / Labor</MenuItem>
                                        <MenuItem value="rent">🏠 Rent / Property</MenuItem>
                                        <MenuItem value="utilities">⚡ Utilities (Eng/Water)</MenuItem>
                                        <MenuItem value="maintenance">🔧 Maintenance</MenuItem>
                                        <MenuItem value="supplies">🧼 Supplies</MenuItem>
                                        <MenuItem value="other">❓ Other</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    {/* <TextField
                                        fullWidth
                                        label="External Reference #"
                                        placeholder="Invoice or Bill number"
                                        value={formData.referenceNumber}
                                        onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                    /> */}
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* 2. Specialized Entity Selection */}
                        <Paper sx={{ p: 4, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                            <SectionHeader
                                icon={<VendorIcon />}
                                title={isSalary ? 'Employee Information' : isUtility ? 'Service Provider' : 'Vendor / Payee Details'}
                            />
                            <Grid container spacing={3}>
                                {isSalary ? (
                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth>
                                            <Autocomplete
                                                options={users}
                                                getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.roles?.[0]})`}
                                                onChange={(_, newValue) => {
                                                    if (newValue) {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            vendor: {
                                                                name: `${newValue.firstName} ${newValue.lastName}`,
                                                                email: newValue.email,
                                                                contact: newValue.email, // fallback
                                                                address: ''
                                                            },
                                                            metadata: { ...prev.metadata, employeeId: newValue._id }
                                                        }));
                                                    }
                                                }}
                                                renderInput={(params) => <TextField {...params} label="Select Staff Member *" />}
                                            />
                                        </FormControl>
                                    </Grid>
                                ) : (
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                            <Autocomplete
                                                options={vendors}
                                                value={selectedVendor}
                                                getOptionLabel={(option) => typeof option === 'string' ? option : (option.name || '')}
                                                onChange={(_, newValue) => {
                                                    if (typeof newValue === 'string') {
                                                        handleVendorChange('name', newValue);
                                                    } else {
                                                        handleVendorSelect(newValue);
                                                    }
                                                }}
                                                inputValue={formData.vendor.name}
                                                onInputChange={(_, val, reason) => {
                                                    if (reason === 'input') {
                                                        handleVendorChange('name', val);
                                                        if (selectedVendor && val !== selectedVendor.name) {
                                                            setSelectedVendor(null);
                                                        }
                                                    }
                                                }}
                                                freeSolo
                                                sx={{ flex: 1 }}
                                                renderOption={(props, option) => (
                                                    <Box component="li" {...props}>
                                                        <Box>
                                                            <Typography fontWeight="medium">{option.name}</Typography>
                                                            {option.contact && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {option.contact} {option.email && `• ${option.email}`}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                )}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label={<span>{isUtility ? "Select Provider" : "Select Vendor"} <span style={{ color: 'red' }}>*</span></span>}
                                                        error={!!errors.name}
                                                    />
                                                )}
                                                noOptionsText={
                                                    formData.vendor.name ? (
                                                        <Box sx={{ textAlign: 'center', py: 1 }}>
                                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                                "{formData.vendor.name}" not found
                                                            </Typography>
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                startIcon={<AddIcon />}
                                                                onClick={handleCreateVendor}
                                                                sx={{
                                                                    textTransform: 'none',
                                                                    borderRadius: 2,
                                                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                                                }}
                                                            >
                                                                Create "{formData.vendor.name}"
                                                            </Button>
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                                                            Type a vendor name...
                                                        </Typography>
                                                    )
                                                }
                                            />
                                            {formData.vendor.name && !selectedVendor && (
                                                <Tooltip title={`Create "${formData.vendor.name}" as a new vendor`}>
                                                    <Button
                                                        variant="contained"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleCreateVendor();
                                                        }}
                                                        sx={{
                                                            minWidth: 'auto',
                                                            px: 2,
                                                            py: 1.8,
                                                            borderRadius: 2,
                                                            textTransform: 'none',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.85rem',
                                                            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                                            '&:hover': { background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' },
                                                            boxShadow: '0 4px 10px rgba(245,158,11,0.3)',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        + Create New
                                                    </Button>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </Grid>
                                )}

                                {isSalary && (
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            type="month"
                                            label="Salary Month"
                                            value={formData.metadata.payMonth || ''}
                                            onChange={(e) => handleMetadataChange('payMonth', e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                )}

                                {isUtility && (
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Meter Reading (Optional)"
                                            value={formData.metadata.meterReading || ''}
                                            onChange={(e) => handleMetadataChange('meterReading', e.target.value)}
                                        />
                                    </Grid>
                                )}

                                {!isSalary && (
                                    <>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                label="Contact"
                                                value={formData.vendor.contact}
                                                onChange={(e) => handleVendorChange('contact', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                label="Email"
                                                value={formData.vendor.email}
                                                onChange={(e) => handleVendorChange('email', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                label="Invoice / Reference #"
                                                value={formData.referenceNumber}
                                                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                                placeholder="INV-001"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Address / Branch"
                                                multiline rows={1}
                                                value={formData.vendor.address}
                                                onChange={(e) => handleVendorChange('address', e.target.value)}
                                            />
                                        </Grid>
                                    </>
                                )}
                            </Grid>
                        </Paper>

                        {/* 3. Dynamic Items Table */}
                        <Paper sx={{ p: 4, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
                                <SectionHeader
                                    icon={<ItemsIcon />}
                                    title={isSalary ? 'Salary Breakdown' : isUtility ? 'Bill Units' : 'Order Items'}
                                    sx={{ mb: 0, width: 'auto' }}
                                />
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    {isInventory && formData.items.some(i => i.inventoryItem && i.inventoryItem !== 'verified') && (
                                        <Button
                                            startIcon={<RestockIcon />}
                                            onClick={handleRestockAll}
                                            variant="contained"
                                            sx={{
                                                borderRadius: 2,
                                                whiteSpace: 'nowrap',
                                                textTransform: 'none',
                                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                                boxShadow: '0 4px 14px 0 rgba(16,185,129,0.39)',
                                                '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }
                                            }}
                                        >
                                            Restock All Verified
                                        </Button>
                                    )}
                                    <Button
                                        startIcon={<AddIcon />}
                                        onClick={addItem}
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 2,
                                            width: 'auto',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        Add Row
                                    </Button>
                                </Box>
                            </Box>

                            <TableContainer sx={{
                                overflowX: 'auto',
                                maxHeight: 500, // Fixed height for vertical scroll
                                '&::-webkit-scrollbar': {
                                    width: '8px',
                                    height: '8px'
                                },
                                '&::-webkit-scrollbar-track': {
                                    bgcolor: alpha(theme.palette.divider, 0.1),
                                    borderRadius: '4px'
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                                    borderRadius: '4px',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.4)
                                    }
                                }
                            }}>
                                <Table sx={{ minWidth: { xs: 700, sm: 800 } }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>{isSalary ? 'PAY COMPONENT' : isInventory ? 'INVENTORY ITEM' : 'DESCRIPTION'}</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>{isSalary ? 'AMOUNT' : 'QTY'}</TableCell>
                                            {!isSalary && <TableCell sx={{ fontWeight: 'bold' }}>WEIGHT</TableCell>}
                                            {!isSalary && <TableCell sx={{ fontWeight: 'bold' }}>PRICE</TableCell>}
                                            <TableCell sx={{ fontWeight: 'bold' }} align="right">{isSalary ? 'TOTAL' : 'SUM'}</TableCell>
                                            {isInventory && <TableCell sx={{ fontWeight: 'bold' }} align="center">STATUS</TableCell>}
                                            <TableCell width={50}></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {formData.items.map((item, index) => (
                                            <TableRow key={index} sx={{ '& td': { py: 2, borderBottom: 'none' } }}>
                                                <TableCell sx={{ pl: 0 }}>
                                                    {isInventory ? (
                                                        <Autocomplete
                                                            options={inventoryItems}
                                                            getOptionLabel={(o) => o.name || o}
                                                            value={item.description}
                                                            onInputChange={(_, val) => handleItemChange(index, 'description', val)}
                                                            onChange={(_, val: any) => val && handleItemChange(index, 'inventoryItem', val._id)}
                                                            renderInput={(p) => <TextField {...p} size="small" placeholder="Find material..." />}
                                                        />
                                                    ) : isSalary ? (
                                                        <TextField
                                                            select fullWidth size="small"
                                                            value={item.description}
                                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                        >
                                                            <MenuItem value="Basic Salary">Basic Salary</MenuItem>
                                                            {/* <MenuItem value="Overtime">Overtime Pay</MenuItem>
                                                            <MenuItem value="Bonus">Performance Bonus</MenuItem>
                                                            <MenuItem value="Deduction">Penalty / Deduction</MenuItem> */}
                                                        </TextField>
                                                    ) : (
                                                        <TextField
                                                            fullWidth size="small" placeholder="Line detail..."
                                                            value={item.description}
                                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell width={100}>
                                                    <TextField
                                                        type="number"
                                                        value={isSalary ? item.unitPrice : item.quantity}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            handleItemChange(index, isSalary ? 'unitPrice' : 'quantity', val >= 0 ? val : 0);
                                                        }}
                                                        size="small"
                                                        fullWidth
                                                        InputProps={{ inputProps: { min: 0 } }}
                                                    />
                                                </TableCell>
                                                {!isSalary && (
                                                    <TableCell width={140}>
                                                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                            <TextField
                                                                type="number"
                                                                value={item.weightValue || ''}
                                                                onChange={(e) => handleItemChange(index, 'weightValue', e.target.value)}
                                                                size="small"
                                                                placeholder="0"
                                                                sx={{ width: 65 }}
                                                                InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                                                            />
                                                            <TextField
                                                                select
                                                                value={item.weightUnit || 'lb'}
                                                                onChange={(e) => handleItemChange(index, 'weightUnit', e.target.value)}
                                                                size="small"
                                                                sx={{ width: 75 }}
                                                            >
                                                                <MenuItem value="lb">lb</MenuItem>
                                                                <MenuItem value="kg">kg</MenuItem>
                                                                <MenuItem value="oz">oz</MenuItem>
                                                                <MenuItem value="g">g</MenuItem>
                                                                <MenuItem value="l">L</MenuItem>
                                                                <MenuItem value="ml">mL</MenuItem>
                                                                <MenuItem value="pieces">pcs</MenuItem>
                                                                <MenuItem value="boxes">box</MenuItem>
                                                                <MenuItem value="each">ea</MenuItem>
                                                            </TextField>
                                                        </Box>
                                                    </TableCell>
                                                )}
                                                {!isSalary && (
                                                    <TableCell width={115} sx={{ px: 0.5 }}>
                                                        <TextField
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                handleItemChange(index, 'unitPrice', val >= 0 ? val : 0);
                                                            }}
                                                            size="small"
                                                            fullWidth
                                                            InputProps={{
                                                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                                                inputProps: { min: 0 }
                                                            }}
                                                        />
                                                    </TableCell>
                                                )}
                                                <TableCell align="right" width={90} sx={{ px: 0.5 }}>
                                                    <Typography fontWeight="900">${(isSalary ? item.unitPrice : item.total || 0).toFixed(2)}</Typography>
                                                </TableCell>
                                                {isInventory && (
                                                    <TableCell align="center">
                                                        {item.inventoryItem ? (
                                                            <Chip
                                                                icon={<CheckCircleIcon />}
                                                                label="Exists"
                                                                size="small"
                                                                color="success"
                                                                variant="outlined"
                                                                sx={{ fontWeight: 'bold', borderRadius: 2 }}
                                                            />
                                                        ) : item.description ? (
                                                            <Tooltip title={`Create "${item.description}" in inventory`}>
                                                                <Button
                                                                    size="small"
                                                                    variant="contained"
                                                                    startIcon={<AddCircleIcon />}
                                                                    onClick={() => handleCreateInventoryItem(index)}
                                                                    sx={{
                                                                        borderRadius: 2,
                                                                        textTransform: 'none',
                                                                        fontSize: '0.7rem',
                                                                        py: 0.5,
                                                                        px: 1,
                                                                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                                                        '&:hover': { background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' }
                                                                    }}
                                                                >
                                                                    Add to Inventory
                                                                </Button>
                                                            </Tooltip>
                                                        ) : (
                                                            <Typography variant="caption" color="text.secondary">—</Typography>
                                                        )}
                                                    </TableCell>
                                                )}
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => removeItem(index)}
                                                        disabled={formData.items.length === 1}
                                                        sx={{ bgcolor: alpha(theme.palette.error.main, 0.05), '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) } }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                        {/* 4. Financial Summary + Settlement */}
                        <Grid container spacing={{ xs: 2, md: 4 }}>
                            <Grid item xs={12} md={8}>
                                <Paper sx={{ p: 4, borderRadius: 5, bgcolor: '#111827', color: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', height: '100%' }}>
                                    <Typography variant="h5" fontWeight="900" gutterBottom>Financial Goal</Typography>
                                    <Divider sx={{ my: 2, bgcolor: alpha('#fff', 0.1) }} />
                                    <Stack spacing={2}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography color="rgba(255,255,255,0.6)">Payment</Typography>
                                            <Chip label={formData.paymentMethod.toUpperCase()} size="small" sx={{ bgcolor: alpha('#fff', 0.1), color: 'white', fontWeight: 'bold' }} />
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography color="rgba(255,255,255,0.6)">Due Date</Typography>
                                            <TextField
                                                type="date" size="small"
                                                value={formData.dueDate}
                                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                                sx={{
                                                    '& input': { color: 'white', py: 0.5, px: 1, fontSize: '0.875rem' },
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.2) },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                                                    '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)', cursor: 'pointer' }
                                                }}
                                            />
                                        </Box>
                                        <Divider sx={{ bgcolor: alpha('#fff', 0.1) }} />
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography color="rgba(255,255,255,0.6)">Amount</Typography>
                                            <Typography variant="h6" fontWeight="bold">${calculateSubtotal().toFixed(2)}</Typography>
                                        </Box>
                                        <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.15), border: '1px solid', borderColor: 'primary.main' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <Typography variant="subtitle1" fontWeight="bold">Grand Net</Typography>
                                                <Typography variant="h4" fontWeight="900" color="primary.main">
                                                    ${calculateTotal().toFixed(2)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Stack>
                                    <Box sx={{ mt: 3 }}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Button fullWidth variant="outlined"
                                                    onClick={() => handleSubmit('draft')}
                                                    sx={{ borderRadius: 3, py: 1.5, color: 'white', borderColor: 'rgba(255,255,255,0.2)', '&:hover': { borderColor: 'white', bgcolor: alpha('#fff', 0.05) } }}
                                                >
                                                    Draft
                                                </Button>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Button fullWidth variant="contained"
                                                    onClick={() => handleSubmit('pending')}
                                                    sx={{ borderRadius: 3, py: 1.5, fontWeight: 'bold', boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)' }}
                                                    disabled={loading}
                                                >
                                                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Process'}
                                                </Button>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Paper sx={{ p: 4, borderRadius: 5, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                                    <SectionHeader icon={<BankIcon />} title="Settlement" />
                                    <Stack spacing={2.5}>
                                        <TextField
                                            select fullWidth label="Payment Method" size="small"
                                            value={formData.paymentMethod}
                                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                        >
                                            <MenuItem value="cash">💵 Cash</MenuItem>
                                            <MenuItem value="bank_transfer">🏛️ Bank Transfer</MenuItem>
                                            <MenuItem value="upi">📱 UPI / Online</MenuItem>
                                            <MenuItem value="card">💳 Card</MenuItem>
                                        </TextField>
                                        <TextField
                                            select fullWidth label="Source" size="small"
                                            value={formData.paymentSource}
                                            onChange={(e) => setFormData({ ...formData, paymentSource: e.target.value })}
                                        >
                                            <MenuItem value="bank_account">Bank Account</MenuItem>
                                            <MenuItem value="petty_cash">Drawer (Petty Cash)</MenuItem>
                                        </TextField>
                                    </Stack>
                                </Paper>
                            </Grid>
                        </Grid>

                        {/* 5. Evidence & Notes */}
                        <Grid container spacing={{ xs: 2, md: 4 }}>
                            <Grid item xs={12} sm={6}>
                                <Paper sx={{
                                    p: { xs: 3, md: 4 },
                                    borderRadius: 5,
                                    height: '100%',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                                    border: '1px solid',
                                    borderColor: alpha(theme.palette.divider, 0.08),
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: { xs: 'center', md: 'flex-start' }
                                }}>
                                    <SectionHeader icon={<AttachmentIcon />} title="Evidence / Bill Photos" centeredOnMobile />
                                    <Stack
                                        direction="row"
                                        flexWrap="wrap"
                                        gap={2}
                                        mb={3}
                                        sx={{ justifyContent: { xs: 'center', md: 'flex-start' } }}
                                    >
                                        {formData.attachments.map((att, idx) => (
                                            <Card key={idx} sx={{ width: 80, height: 80, position: 'relative', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                                                <CardMedia component="img" height="80" image={att.url} sx={{ objectFit: 'cover' }} />
                                                <IconButton
                                                    size="small"
                                                    sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' }, width: 16, height: 16 }}
                                                    onClick={() => removeAttachment(idx)}
                                                >
                                                    <DeleteIcon sx={{ fontSize: 10 }} />
                                                </IconButton>
                                            </Card>
                                        ))}
                                        <Button
                                            component="label"
                                            sx={{
                                                width: { xs: 100, sm: 80 },
                                                height: { xs: 100, sm: 80 },
                                                borderRadius: 1,
                                                border: '2px dashed',
                                                borderColor: 'divider',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                color: 'text.secondary',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    color: 'primary.main',
                                                    bgcolor: alpha(theme.palette.primary.main, 0.02)
                                                }
                                            }}
                                            disabled={uploading}
                                        >
                                            {uploading ? (
                                                <CircularProgress size={24} />
                                            ) : (
                                                <>
                                                    <UploadIcon sx={{ fontSize: { xs: 28, sm: 20 } }} />
                                                    <Typography variant="caption" sx={{ mt: 0.5, fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.7rem' } }}>Add</Typography>
                                                </>
                                            )}
                                            <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                                        </Button>
                                    </Stack>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            display: 'block',
                                            textAlign: { xs: 'center', md: 'left' }
                                        }}
                                    >
                                        Upload photos of physical bills or delivery receipts for auditing.
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Paper sx={{
                                    p: { xs: 3, md: 4 },
                                    borderRadius: 5,
                                    height: '100%',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: { xs: 'center', md: 'flex-start' }
                                }}>
                                    <SectionHeader
                                        icon={<BackIcon sx={{ transform: 'rotate(-90deg)' }} />}
                                        title="Reason / Notes"
                                        centeredOnMobile
                                    />
                                    <TextField
                                        fullWidth multiline rows={3}
                                        placeholder="Internal reasoning for this entry..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1,
                                                bgcolor: alpha(theme.palette.divider, 0.04),
                                                '& fieldset': { borderColor: alpha(theme.palette.divider, 0.1) }
                                            }
                                        }}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Stack>
                </Grid>

                {/* Right Column - Removed (Financial Goal + Settlement) */}
            </Grid>
        </Box>
    );
};

export default CreatePOPage;
