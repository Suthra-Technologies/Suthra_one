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
    FormControl,
    useMediaQuery
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
    MoveToInbox as RestockIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { purchaseOrdersAPI, uploadAPI, inventoryAPI, usersAPI, vendorsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useActiveTenant } from '../../hooks/useActiveTenant';

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
    const { id } = useParams();
    const { getRelativePath } = useActiveTenant();
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<any>(null);
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
        if (id) {
            fetchPO();
        }
    }, [id]);

    const fetchPO = async () => {
        try {
            setLoading(true);
            const response = await purchaseOrdersAPI.getOne(id!);
            const po = response.data.data || response.data;
            setFormData({
                type: po.type || 'purchase_order',
                poNumber: po.poNumber,
                vendor: po.vendor || { name: '', contact: '', email: '', address: '' },
                category: po.category || 'raw_materials',
                referenceNumber: po.referenceNumber || '',
                dueDate: po.dueDate ? new Date(po.dueDate).toISOString().split('T')[0] : '',
                items: (po.items && po.items.length > 0) ? po.items : [{ description: '', quantity: 1, unit: 'kg', unitPrice: 0, total: 0, inventoryItem: '', weightValue: '', weightUnit: 'lb' }],
                taxRate: po.taxRate || 0,
                shippingCost: po.shippingCost || 0,
                notes: po.notes || '',
                status: po.status || 'draft',
                paymentStatus: po.paymentStatus || 'unpaid',
                paymentMethod: po.paymentMethod || 'cash',
                paymentSource: po.paymentSource || 'bank_account',
                attachments: po.attachments || [],
                metadata: po.metadata || {},
            });
            if (po.vendor && po.vendor.name) {
                // We just set a string/object so the Autocomplete shows it
                setSelectedVendor(po.vendor);
            }
        } catch (error) {
            console.error('Failed to fetch PO', error);
            toast.error('Failed to load purchase order');
        } finally {
            setLoading(false);
        }
    };

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

    const handleNumberInput = (index: number, field: string, rawValue: string) => {
        let cleanValue = rawValue;
        if (cleanValue.length > 1 && cleanValue.startsWith('0') && !cleanValue.startsWith('0.')) {
            cleanValue = cleanValue.replace(/^0+/, '');
            if (cleanValue === '') cleanValue = '0';
        }
        const parts = cleanValue.split('.');
        if (parts[0].length > 5) return;
        handleItemChange(index, field, cleanValue);
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
                const q = parseFloat(newItems[index].quantity as any) || 0;
                const p = parseFloat(newItems[index].unitPrice as any) || 0;
                newItems[index].total = q * p;
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

            console.log('--- AI Extraction Processed ---');

            const responseData = response.data?.data || response.data;
            const extractionData = responseData.extraction || responseData;
            const verificationData = responseData.verification || {};

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
        if (loading) return;
        if (!formData.vendor.name && formData.category !== 'salaries') {
            setErrors(prev => ({ ...prev, name: 'Required field' }));
            toast.error('Entity name is required');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                status,
                subtotal: calculateSubtotal(),
                tax: calculateTax(),
                totalAmount: calculateTotal(),
            };
            if (id) {
                await purchaseOrdersAPI.update(id, payload);
                toast.success('Record updated successfully!');
                navigate(getRelativePath('/purchase-orders'));
            } else {
                await purchaseOrdersAPI.create(payload);
                toast.success('Record saved successfully!');
                navigate(getRelativePath('/purchase-orders'));
            }
        } catch (error: any) {
            console.error('Save PO Error:', error);
            toast.error(error.response?.data?.message || 'Failed to save record');
        } finally {
            setLoading(false);
        }
    };

    const SectionHeader = ({ icon, title, centeredOnMobile, sx }: { icon: React.ReactNode, title: string, centeredOnMobile?: boolean, sx?: any }) => (
        <Stack
            direction="row"
            spacing={isMobile ? 1.25 : 2}
            alignItems="center"
            sx={{
                mb: isMobile ? 1.5 : 3,
                width: '100%',
                ...sx
            }}
        >
            <Box sx={{
                p: isMobile ? 0.75 : 1.25,
                borderRadius: isMobile ? 1.5 : 2.5,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
                '& .MuiSvgIcon-root': { fontSize: isMobile ? 18 : 24 }
            }}>
                {icon}
            </Box>
            <Typography
                variant="body1"
                fontWeight={900}
                sx={{
                    fontSize: { xs: '0.9rem', md: '1.25rem' },
                    letterSpacing: '-0.02em',
                    color: 'text.primary',
                    textTransform: 'uppercase',
                    opacity: 0.9
                }}
            >
                {title}
            </Typography>
        </Stack>
    );

    <Paper sx={{
        p: { xs: 2.5, md: 4 },
        borderRadius: { xs: 4, md: 5 },
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        maxWidth: { xs: 500, md: 'none' },
        mx: { xs: 'auto', md: 0 },
        width: '100%'
    }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isMobile ? 1.5 : 3, flexWrap: 'nowrap', gap: 1 }}>
            <SectionHeader icon={<DetailsIcon />} title="Category" sx={{ mb: 0 }} />

            <Button
                component="label"
                variant="contained"
                color="secondary"
                disabled={extracting}
                startIcon={extracting ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />}
                sx={{
                    borderRadius: 2,
                    px: { xs: 1.5, sm: 3 },
                    py: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '0.7rem', sm: '0.875rem' },
                    minWidth: 'auto',
                    whiteSpace: 'nowrap',
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                    boxShadow: '0 4px 14px 0 rgba(139,92,246,0.2)',
                    textTransform: 'none',
                    height: { xs: 32, md: 40 }
                }}
            >
                {extracting ? '...' : (isMobile ? 'AI Extract' : 'AI Invoice Extraction')}
                <input type="file" hidden accept="image/*,application/pdf,.doc,.docx" onChange={handleExtractInvoice} />
            </Button>
        </Box>
        <Grid container spacing={isMobile ? 1.5 : 3}>
            <Grid item xs={12}>
                <TextField
                    select
                    fullWidth
                    size={isMobile ? "small" : "medium"}
                    label="Primary Category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    SelectProps={{
                        MenuProps: { PaperProps: { sx: { borderRadius: 3 } } },
                        sx: { fontSize: isMobile ? '0.875rem' : '1rem' }
                    }}
                />
            </Grid>
        </Grid>
    </Paper>

    // --- Dynamic UI Logic ---
    const isSalary = formData.category === 'salaries';
    const isUtility = formData.category === 'utilities';
    const isInventory = formData.category === 'raw_materials';

    if (id && loading && formData.poNumber.startsWith('PO-')) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{
            p: { xs: 1.5, md: 4 },
            maxWidth: 1400,
            mx: 'auto',
            minHeight: '100vh',
            bgcolor: '#f9fafb',
            overflowX: 'hidden'
        }}>
            <Stack
                direction={isMobile ? "column" : "row"}
                alignItems="center"
                spacing={isMobile ? 1.5 : 2}
                mb={isMobile ? 3 : 5}
                sx={{ textAlign: 'center', width: '100%' }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, width: { xs: '100%', sm: 'auto' }, justifyContent: 'center' }}>
                    <IconButton size={isMobile ? "small" : "medium"} onClick={() => navigate(getRelativePath('/purchase-orders'))} sx={{ border: '1px solid', borderColor: 'divider', p: isMobile ? 1 : 1.25, bgcolor: 'white' }}>
                        <BackIcon fontSize={isMobile ? "small" : "medium"} />
                    </IconButton>
                    <Box>
                        <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' }, letterSpacing: '-0.04em' }}>{id ? 'Edit Entry' : 'Create Entry'}</Typography>
                    </Box>
                </Box>
                <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }} />
                <Chip
                    label={formData.poNumber}
                    color="primary"
                    variant="outlined"
                    sx={{
                        fontWeight: 'bold',
                        fontSize: { xs: '0.75rem', sm: '1rem' },
                        height: isMobile ? 24 : 32,
                        px: 0.5,
                    }}
                />
            </Stack>

            <Grid container spacing={isMobile ? 0 : 4} justifyContent="center" sx={{ width: '100%', m: 0 }}>
                {/* Left Column - Main Form */}
                <Grid item xs={12} md={12}>
                    <Stack spacing={isMobile ? 2 : 4} alignItems={isMobile ? "center" : "stretch"}>
                        {/* 1. Transaction Type & Category */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mb: 0 }}>
                            <Button
                                component="label"
                                variant="contained"
                                color="secondary"
                                disabled={extracting}
                                startIcon={extracting ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />}
                                sx={{
                                    borderRadius: 2,
                                    px: { xs: 1.5, sm: 3 },
                                    py: { xs: 0.5, sm: 1 },
                                    fontSize: { xs: '0.7rem', sm: '0.875rem' },
                                    minWidth: 'auto',
                                    whiteSpace: 'nowrap',
                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                    boxShadow: '0 4px 14px 0 rgba(139,92,246,0.2)',
                                    textTransform: 'none',
                                    height: { xs: 32, md: 40 }
                                }}
                            >
                                {extracting ? '...' : (isMobile ? 'AI Extract' : 'AI Invoice Extraction')}
                                <input type="file" hidden accept="image/*,application/pdf,.doc,.docx" onChange={handleExtractInvoice} />
                            </Button>
                        </Box>


                        {/* 2. Specialized Entity Selection */}
                        <Paper sx={{
                            p: { xs: 2.5, md: 4 },
                            borderRadius: { xs: 4, md: 5 },
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            maxWidth: { xs: 500, md: 'none' },
                            mx: { xs: 'auto', md: 0 },
                            width: '100%'
                        }}>
                            <SectionHeader
                                icon={<VendorIcon />}
                                title={isSalary ? 'Staff' : isUtility ? 'Provider' : 'Vendor Details'}
                            />
                            <Grid container spacing={isMobile ? 1.5 : 3}>
                                {isSalary ? (
                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth>
                                            <Autocomplete
                                                options={users}
                                                size={isMobile ? "small" : "medium"}
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
                                                renderInput={(params) => <TextField {...params} label="Select Staff Member *" sx={{ '& .MuiInputLabel-root': { fontSize: isMobile ? '0.8rem' : '1rem' } }} />}
                                            />
                                        </FormControl>
                                    </Grid>
                                ) : (
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Autocomplete
                                                options={vendors}
                                                size={isMobile ? "small" : "medium"}
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
                                                    <Box component="li" {...props} sx={{ fontSize: '0.875rem' }}>
                                                        <Box>
                                                            <Typography fontWeight="bold" variant="body2">{option.name}</Typography>
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
                                                        label={isUtility ? "Provider *" : "Vendor *"}
                                                        error={!!errors.name}
                                                        sx={{ '& .MuiInputLabel-root': { fontSize: isMobile ? '0.8rem' : '1rem' } }}
                                                    />
                                                )}
                                                noOptionsText={
                                                    formData.vendor.name ? (
                                                        <Box sx={{ textAlign: 'center', py: 1 }}>
                                                            <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block' }}>
                                                                "{formData.vendor.name}" not found
                                                            </Typography>
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                                                                onClick={handleCreateVendor}
                                                                sx={{
                                                                    textTransform: 'none',
                                                                    borderRadius: 1.5,
                                                                    fontSize: '0.7rem',
                                                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                                                                }}
                                                            >
                                                                Create
                                                            </Button>
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', py: 1 }}>
                                                            Type to search...
                                                        </Typography>
                                                    )
                                                }
                                            />
                                            {formData.vendor.name && !selectedVendor && (
                                                <IconButton
                                                    onClick={handleCreateVendor}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: alpha(theme.palette.warning.main, 0.1),
                                                        color: theme.palette.warning.dark,
                                                        borderRadius: 1.5,
                                                        p: 1
                                                    }}
                                                >
                                                    <AddIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Grid>
                                )}

                                {isSalary && (
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            type="month"
                                            size={isMobile ? "small" : "medium"}
                                            label="Salary Month"
                                            value={formData.metadata.payMonth || ''}
                                            onChange={(e) => handleMetadataChange('payMonth', e.target.value)}
                                            InputLabelProps={{ shrink: true, sx: { fontSize: isMobile ? '0.8rem' : '1rem' } }}
                                            sx={{ '& .MuiInputBase-input': { fontSize: isMobile ? '0.875rem' : '1rem' } }}
                                        />
                                    </Grid>
                                )}

                                {isUtility && (
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            size={isMobile ? "small" : "medium"}
                                            label="Meter Reading"
                                            value={formData.metadata.meterReading || ''}
                                            onChange={(e) => handleMetadataChange('meterReading', e.target.value)}
                                            sx={{ '& .MuiInputLabel-root': { fontSize: isMobile ? '0.8rem' : '1rem' } }}
                                        />
                                    </Grid>
                                )}

                                {!isSalary && (
                                    <>
                                        <Grid item xs={isMobile ? 6 : 4} sm={4}>
                                            <TextField
                                                fullWidth
                                                size={isMobile ? "small" : "medium"}
                                                label="Contact"
                                                value={formData.vendor.contact}
                                                onChange={(e) => handleVendorChange('contact', e.target.value)}
                                                sx={{ '& .MuiInputLabel-root': { fontSize: isMobile ? '0.8rem' : '1rem' } }}
                                            />
                                        </Grid>
                                        <Grid item xs={isMobile ? 6 : 4} sm={4}>
                                            <TextField
                                                fullWidth
                                                size={isMobile ? "small" : "medium"}
                                                label="Invoice #"
                                                value={formData.referenceNumber}
                                                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                                placeholder="INV-001"
                                                sx={{ '& .MuiInputLabel-root': { fontSize: isMobile ? '0.8rem' : '1rem' } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                size={isMobile ? "small" : "medium"}
                                                label="Email"
                                                value={formData.vendor.email}
                                                onChange={(e) => handleVendorChange('email', e.target.value)}
                                                sx={{
                                                    display: { xs: isMobile ? 'none' : 'block', sm: 'block' },
                                                    '& .MuiInputLabel-root': { fontSize: isMobile ? '0.8rem' : '1rem' }
                                                }}
                                            />
                                            {isMobile && (
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    label="Address"
                                                    value={formData.vendor.address}
                                                    onChange={(e) => handleVendorChange('address', e.target.value)}
                                                    sx={{ '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}
                                                />
                                            )}
                                        </Grid>
                                        {!isMobile && (
                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    label="Address / Branch"
                                                    multiline rows={1}
                                                    value={formData.vendor.address}
                                                    onChange={(e) => handleVendorChange('address', e.target.value)}
                                                />
                                            </Grid>
                                        )}
                                    </>
                                )}
                            </Grid>
                        </Paper>                        {/* 3. Dynamic Items Table */}
                        <Paper sx={{
                            p: { xs: 2, md: 4 },
                            borderRadius: { xs: 4, md: 5 },
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            maxWidth: { xs: 500, md: 'none' },
                            mx: { xs: 'auto', md: 0 },
                            width: '100%'
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isMobile ? 1.5 : 3, gap: 1 }}>
                                <SectionHeader
                                    icon={<ItemsIcon />}
                                    title={isSalary ? 'Pay' : 'Items'}
                                    sx={{ mb: 0, width: 'auto' }}
                                />
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    {isInventory && formData.items.some(i => i.inventoryItem && i.inventoryItem !== 'verified') && (
                                        <Button
                                            size="small"
                                            startIcon={<RestockIcon sx={{ fontSize: 16 }} />}
                                            onClick={handleRestockAll}
                                            variant="contained"
                                            sx={{
                                                borderRadius: 1.5,
                                                whiteSpace: 'nowrap',
                                                textTransform: 'none',
                                                fontSize: '0.7rem',
                                                px: 1,
                                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                            }}
                                        >
                                            Restock
                                        </Button>
                                    )}
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                                        onClick={addItem}
                                        variant="outlined"
                                        sx={{
                                            borderRadius: 1.5,
                                            width: 'auto',
                                            whiteSpace: 'nowrap',
                                            fontSize: '0.7rem',
                                            px: 1
                                        }}
                                    >
                                        Add
                                    </Button>
                                </Box>
                            </Box>

                            <TableContainer sx={{
                                overflowX: 'auto',
                                maxHeight: { xs: 'none', sm: 500 },
                                '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                            }}>
                                {/* MOBILE CARD VIEW */}
                                {isMobile ? (
                                    formData.items.length === 0 ? (
                                        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                            <Typography variant="caption">No items available</Typography>
                                        </Box>
                                    ) : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            {formData.items.map((item, index) => (
                                                <Box key={index} sx={{
                                                    width: '100%',
                                                    maxWidth: 500,
                                                    mx: 'auto',
                                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                    borderRadius: 2,
                                                    p: 1.5,
                                                    bgcolor: alpha(theme.palette.background.default, 0.3),
                                                }}>
                                                    {/* Description / Pay Component */}
                                                    <Box sx={{ mb: 1 }}>
                                                        {isInventory ? (
                                                            <Autocomplete
                                                                options={inventoryItems}
                                                                size="small"
                                                                freeSolo
                                                                getOptionLabel={(o) => typeof o === 'string' ? o : (o.name || '')}
                                                                value={item.description}
                                                                onInputChange={(_, val) => handleItemChange(index, 'description', val)}
                                                                onChange={(_, val: any) => {
                                                                    if (val && typeof val !== 'string') {
                                                                        handleItemChange(index, 'inventoryItem', val._id);
                                                                    }
                                                                }}
                                                                renderInput={(p) => <TextField {...p} fullWidth placeholder="Search material..." sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }} />}
                                                            />
                                                        ) : (
                                                            <TextField
                                                                fullWidth size="small" placeholder="Item description..."
                                                                value={item.description}
                                                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                                sx={{ '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
                                                            />
                                                        )}
                                                    </Box>

                                                    {/* QTY / Amount row */}
                                                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                                        <TextField
                                                            type="number" size="small" label={isSalary ? "Amount" : "Qty"}
                                                            value={isSalary ? item.unitPrice : item.quantity}
                                                            onChange={(e) => handleNumberInput(index, isSalary ? 'unitPrice' : 'quantity', e.target.value)}
                                                            sx={{ flex: 1, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                                                        />

                                                        {!isSalary && (
                                                            <TextField
                                                                type="number" size="small" label="Price"
                                                                value={item.unitPrice}
                                                                onChange={(e) => handleNumberInput(index, 'unitPrice', e.target.value)}
                                                                sx={{ flex: 1, '& .MuiInputLabel-root': { fontSize: '0.75rem' } }}
                                                                InputProps={{ startAdornment: <InputAdornment position="start" sx={{ '& p': { fontSize: '0.75rem' } }}>$</InputAdornment> }}
                                                            />
                                                        )}
                                                    </Box>

                                                    {/* Footer: Sum + Status + Delete */}
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="caption" fontWeight={900} sx={{ color: 'primary.main', fontSize: '0.9rem' }}>
                                                                ${(isSalary ? item.unitPrice : item.total || 0).toFixed(2)}
                                                            </Typography>
                                                            {isInventory && item.inventoryItem && (
                                                                <Chip label="MATCHED" size="small" color="success" variant="outlined" sx={{ fontSize: '0.6rem', height: 16, fontWeight: 800 }} />
                                                            )}
                                                            {isInventory && !item.inventoryItem && item.description && (
                                                                <Button
                                                                    size="small"
                                                                    onClick={() => handleCreateInventoryItem(index)}
                                                                    sx={{ fontSize: '0.6rem', height: 20, p: 0, textTransform: 'none', minWidth: 'auto', color: 'orange' }}
                                                                >
                                                                    + INVENTORY
                                                                </Button>
                                                            )}
                                                        </Box>

                                                        <IconButton
                                                            size="small" color="error"
                                                            onClick={() => removeItem(index)}
                                                            disabled={formData.items.length === 1}
                                                            sx={{ p: 0.5 }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Box>
                                    )
                                ) : (
                                    /* DESKTOP TABLE VIEW - Simplified for better grep matching */
                                    <Box>
                                        <Table sx={{ minWidth: 800 }}>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>{isSalary ? 'Pay Component' : isInventory ? 'Inventory Item' : 'Description'}</TableCell>
                                                    {!isSalary && <TableCell align="right" sx={{ fontWeight: 'bold' }}>Quantity</TableCell>}
                                                    {!isSalary && <TableCell align="right" sx={{ fontWeight: 'bold' }}>Unit Price</TableCell>}
                                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{isSalary ? 'Amount' : 'Total'}</TableCell>
                                                    {!isSalary && <TableCell width={50}></TableCell>}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {formData.items.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            {isInventory ? (
                                                                <Box>
                                                                    <Autocomplete
                                                                        options={inventoryItems}
                                                                        size="small"
                                                                        freeSolo
                                                                        getOptionLabel={(o) => typeof o === 'string' ? o : (o.name || '')}
                                                                        value={item.description}
                                                                        onInputChange={(_, val) => handleItemChange(index, 'description', val)}
                                                                        onChange={(_, val: any) => {
                                                                            if (val && typeof val !== 'string') {
                                                                                handleItemChange(index, 'inventoryItem', val._id);
                                                                            }
                                                                        }}
                                                                        renderInput={(p) => <TextField {...p} size="small" fullWidth placeholder="Search..." />}
                                                                    />
                                                                    <Box sx={{ mt: 0.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                                                                        {item.inventoryItem && item.inventoryItem !== 'verified' && (
                                                                            <Chip label="MATCHED" size="small" color="success" variant="outlined" sx={{ fontSize: '0.6rem', height: 16, fontWeight: 800 }} />
                                                                        )}
                                                                        {!item.inventoryItem && item.description && (
                                                                            <Button
                                                                                size="small"
                                                                                onClick={() => handleCreateInventoryItem(index)}
                                                                                sx={{ fontSize: '0.65rem', height: 20, p: 0, textTransform: 'none', minWidth: 'auto', color: 'orange', fontWeight: 'bold' }}
                                                                            >
                                                                                + INVENTORY
                                                                            </Button>
                                                                        )}
                                                                    </Box>
                                                                </Box>
                                                            ) : (
                                                                <TextField fullWidth size="small" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
                                                            )}
                                                        </TableCell>
                                                        {!isSalary && (
                                                            <TableCell align="right">
                                                                <TextField type="number" size="small" value={item.quantity} onChange={(e) => handleNumberInput(index, 'quantity', e.target.value)} />
                                                            </TableCell>
                                                        )}
                                                        {!isSalary && (
                                                            <TableCell align="right">
                                                                <TextField type="number" size="small" value={item.unitPrice} onChange={(e) => handleNumberInput(index, 'unitPrice', e.target.value)} />
                                                            </TableCell>
                                                        )}
                                                        <TableCell align="right">${(isSalary ? item.unitPrice : item.total || 0).toFixed(2)}</TableCell>
                                                        {!isSalary && (
                                                            <TableCell>
                                                                <IconButton onClick={() => removeItem(index)} disabled={formData.items.length === 1} size="small" color="error"><DeleteIcon /></IconButton>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                )}
                            </TableContainer>
                        </Paper>

                        {/* 4. Financial Summary + Settlement */}
                        <Grid container spacing={isMobile ? 0 : 4} justifyContent="center" sx={{ width: '100%', m: 0 }}>
                            <Grid item xs={12} md={8} sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Paper sx={{
                                    p: { xs: 2.5, md: 4 },
                                    borderRadius: { xs: 4, md: 5 },
                                    bgcolor: '#111827',
                                    color: 'white',
                                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                                    height: '100%',
                                    maxWidth: { xs: 500, md: 'none' },
                                    mx: { xs: 'auto', md: 0 },
                                    width: '100%'
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                        <Typography variant={isMobile ? "subtitle1" : "h5"} fontWeight={900}>Goal</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="caption" sx={{ opacity: 0.6 }}>Method:</Typography>
                                            <Chip label={formData.paymentMethod.toUpperCase()} size="small" sx={{ bgcolor: alpha('#fff', 0.1), color: 'white', fontWeight: 800, fontSize: '0.65rem' }} />
                                        </Box>
                                    </Box>
                                    <Divider sx={{ mb: 2, bgcolor: alpha('#fff', 0.1) }} />
                                    <Stack spacing={isMobile ? 1.5 : 2}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="caption" sx={{ opacity: 0.6 }}>Estimated Delivery / Due</Typography>
                                            <TextField
                                                type="date" size="small"
                                                value={formData.dueDate}
                                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                                sx={{
                                                    '& input': { color: 'white', py: 0.2, px: 1, fontSize: '0.8rem' },
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.1) },
                                                    '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)', cursor: 'pointer' }
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{ p: isMobile ? 1.5 : 2, borderRadius: isMobile ? 2 : 3, bgcolor: alpha(theme.palette.primary.main, 0.15), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.3) }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" fontWeight="bold">Grand Net</Typography>
                                                <Typography variant={isMobile ? "h5" : "h4"} fontWeight={900} color="primary.main">
                                                    ${calculateTotal().toFixed(2)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Stack>
                                    <Box sx={{ mt: isMobile ? 2 : 3 }}>
                                        <Grid container spacing={isMobile ? 1.5 : 2}>
                                            <Grid item xs={6}>
                                                <Button fullWidth variant="outlined"
                                                    onClick={() => handleSubmit('draft')}
                                                    sx={{ borderRadius: 2, py: isMobile ? 1 : 1.5, color: 'white', fontSize: isMobile ? '0.8rem' : '1rem', borderColor: 'rgba(255,255,255,0.2)' }}
                                                >
                                                    Draft
                                                </Button>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Button fullWidth variant="contained"
                                                    onClick={() => handleSubmit('pending')}
                                                    sx={{ borderRadius: 2, py: isMobile ? 1 : 1.5, fontWeight: 'bold', fontSize: isMobile ? '0.8rem' : '1rem' }}
                                                    disabled={loading}
                                                >
                                                    {loading ? <CircularProgress size={20} color="inherit" /> : 'Process'}
                                                </Button>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Paper sx={{
                                    p: { xs: 2.5, md: 4 },
                                    borderRadius: { xs: 4, md: 5 },
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    height: '100%',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                    maxWidth: { xs: 500, md: 'none' },
                                    mx: { xs: 'auto', md: 0 },
                                    width: '100%'
                                }}>
                                    <SectionHeader icon={<BankIcon />} title="Settlement" />
                                    <Stack spacing={isMobile ? 1.5 : 2.5}>
                                        <TextField
                                            select fullWidth label="Payment Method" size="small"
                                            value={formData.paymentMethod}
                                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                            SelectProps={{ sx: { fontSize: '0.875rem' } }}
                                        >
                                            <MenuItem value="cash" sx={{ fontSize: '0.875rem' }}>💵 Cash</MenuItem>
                                            <MenuItem value="bank_transfer" sx={{ fontSize: '0.875rem' }}>🏛️ Bank Transfer</MenuItem>
                                            <MenuItem value="upi" sx={{ fontSize: '0.875rem' }}>📱 UPI / Online</MenuItem>
                                            <MenuItem value="card" sx={{ fontSize: '0.875rem' }}>💳 Card</MenuItem>
                                        </TextField>
                                        <TextField
                                            select fullWidth label="Settlement Source" size="small"
                                            value={formData.paymentSource}
                                            onChange={(e) => setFormData({ ...formData, paymentSource: e.target.value })}
                                            SelectProps={{ sx: { fontSize: '0.875rem' } }}
                                        >
                                            <MenuItem value="bank_account" sx={{ fontSize: '0.875rem' }}>Bank Account</MenuItem>
                                            <MenuItem value="petty_cash" sx={{ fontSize: '0.875rem' }}>Petty Cash</MenuItem>
                                        </TextField>
                                    </Stack>
                                </Paper>
                            </Grid>
                        </Grid>

                        {/* 5. Evidence & Notes */}
                        <Grid container spacing={isMobile ? 0 : 4} justifyContent="center" sx={{ width: '100%', m: 0 }}>

                            <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Paper sx={{
                                    p: { xs: 2.5, md: 4 },
                                    borderRadius: { xs: 4, md: 5 },
                                    height: '100%',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                                    border: '1px solid',
                                    borderColor: alpha(theme.palette.divider, 0.1),
                                    display: 'flex',
                                    flexDirection: 'column',
                                    maxWidth: { xs: 500, md: 'none' },
                                    mx: { xs: 'auto', md: 0 },
                                    width: '100%'
                                }}>
                                    <SectionHeader icon={<AttachmentIcon />} title="Photos" />
                                    <Stack
                                        direction="row"
                                        flexWrap="wrap"
                                        gap={isMobile ? 1 : 2}
                                        mb={isMobile ? 1.5 : 3}
                                    >
                                        {formData.attachments.map((att, idx) => (
                                            <Card key={idx} sx={{ width: isMobile ? 60 : 80, height: isMobile ? 60 : 80, position: 'relative', borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                                                <CardMedia component="img" height={isMobile ? "60" : "80"} image={att.url} sx={{ objectFit: 'cover' }} />
                                                <IconButton
                                                    size="small"
                                                    sx={{ position: 'absolute', top: 2, right: 2, bgcolor: alpha('#f44336', 0.8), color: 'white', '&:hover': { bgcolor: '#f44336' }, width: 14, height: 14, p: 0 }}
                                                    onClick={() => removeAttachment(idx)}
                                                >
                                                    <DeleteIcon sx={{ fontSize: 10 }} />
                                                </IconButton>
                                            </Card>
                                        ))}
                                        <Button
                                            component="label"
                                            sx={{
                                                width: isMobile ? 60 : 80,
                                                height: isMobile ? 60 : 80,
                                                borderRadius: 1.5,
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
                                                <CircularProgress size={16} />
                                            ) : (
                                                <>
                                                    <UploadIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                                                    <Typography variant="caption" sx={{ mt: 0.2, fontWeight: 800, fontSize: '0.6rem' }}>ADD</Typography>
                                                </>
                                            )}
                                            <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                                        </Button>
                                    </Stack>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ opacity: 0.7, fontSize: '0.65rem' }}
                                    >
                                        Upload bills or receipts for auditing.
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Paper sx={{
                                    p: { xs: 2.5, md: 4 },
                                    borderRadius: { xs: 4, md: 5 },
                                    height: '100%',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    maxWidth: { xs: 500, md: 'none' },
                                    mx: { xs: 'auto', md: 0 },
                                    width: '100%'
                                }}>
                                    <SectionHeader
                                        icon={<BackIcon sx={{ transform: 'rotate(-90deg)' }} />}
                                        title="Notes"
                                    />
                                    <TextField
                                        fullWidth multiline rows={isMobile ? 2 : 3}
                                        placeholder="Internal reasoning..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1.5,
                                                fontSize: '0.875rem',
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

            {/* Bottom Action Section */}
            <Box sx={{
                mt: 6,
                mb: 4,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 2,
                bgcolor: 'transparent'
            }}>
                <Button
                    variant="outlined"
                    fullWidth={isMobile}
                    onClick={() => navigate(getRelativePath('/purchase-orders'))}
                    sx={{
                        borderRadius: 2.5,
                        px: 4,
                        py: 1.5,
                        fontWeight: 700,
                        color: 'text.secondary',
                        borderColor: 'divider',
                        '&:hover': {
                            borderColor: 'text.primary',
                            bgcolor: alpha(theme.palette.action.hover, 0.04)
                        }
                    }}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth={isMobile}
                    onClick={() => handleSubmit('pending')}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    sx={{
                        borderRadius: 2.5,
                        px: 8,
                        py: 1.5,
                        fontWeight: 900,
                        fontSize: '1rem',
                        boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
                        '&:hover': {
                            boxShadow: '0 12px 30px rgba(59, 130, 246, 0.5)',
                            transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.3s ease'
                    }}
                >
                    {loading ? 'Saving...' : (id ? 'Update Entry' : 'Save Entry')}
                </Button>
            </Box>
        </Box>
    );
};

export default CreatePOPage;
