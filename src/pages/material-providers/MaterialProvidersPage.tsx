import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    Avatar,
    TextField,
    InputAdornment,
    CircularProgress,
    Alert,
    Divider,
    IconButton,
    Tooltip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Autocomplete,
} from '@mui/material';
import {
    Search as SearchIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    LocationOn as LocationIcon,
    Language as WebsiteIcon,
    Person as PersonIcon,
    Store as StoreIcon,
    ShoppingCartCheckout as OrderIcon,
    History as HistoryIcon,
    CheckCircle as ReceivedIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Remove as RemoveIcon,
    Close as CloseIcon,
    Inventory2 as InventoryIcon,
    CloudUpload as CloudUploadIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { materialProvidersAPI, purchaseOrdersAPI, uploadAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { CardGridSkeleton } from '../../components/common/PageSkeleton';

interface MaterialProvider {
    _id: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
    categories?: string[];
    status: string;
    notes?: string;
    logo?: string;
    materialImage?: string;
    materials?: { name: string; unit?: string; defaultUnitPrice?: number; image?: string; images?: string[] }[];
}

/**
 * Colour for a provider-order status chip.
 *
 * placed -> confirmed -> sent are the provider's steps; received is ours.
 */
const ORDER_STATUS_COLOR: Record<string, 'warning' | 'info' | 'primary' | 'success' | 'default'> = {
    placed: 'warning',
    confirmed: 'info',
    sent: 'primary',
    received: 'success',
    cancelled: 'default',
};

/** An order can be received until it is already received or was cancelled. */
const CAN_RECEIVE = ['placed', 'confirmed', 'sent'];

/** Image slider used on catalog item cards in the order dialog; falls back to a single frame when there's only one photo (or none). */
const MaterialImageSlider: React.FC<{ images: string[]; alt: string }> = ({ images, alt }) => {
    const [index, setIndex] = useState(0);
    const hasMultiple = images.length > 1;

    const go = (delta: number) => {
        setIndex(prev => (prev + delta + images.length) % images.length);
    };

    return (
        <Box sx={{ position: 'relative', width: '100%', height: 160, bgcolor: 'grey.100', overflow: 'hidden' }}>
            {images.length > 0 ? (
                <Box component="img" src={images[index]} alt={alt} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <InventoryIcon sx={{ color: 'text.disabled', fontSize: 48 }} />
                </Box>
            )}
            {images.length > 0 && (
                <>
                    <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); go(-1); }}
                        disabled={!hasMultiple}
                        sx={{ position: 'absolute', top: '50%', left: 4, transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.4)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' }, '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.5)' } }}
                    >
                        <ChevronLeftIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); go(1); }}
                        disabled={!hasMultiple}
                        sx={{ position: 'absolute', top: '50%', right: 4, transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.4)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' }, '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.5)' } }}
                    >
                        <ChevronRightIcon fontSize="small" />
                    </IconButton>
                    {hasMultiple && (
                        <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)' }}>
                            {images.map((_, i) => (
                                <Box
                                    key={i}
                                    onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                                    sx={{
                                        width: 6, height: 6, borderRadius: '50%', cursor: 'pointer',
                                        bgcolor: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
                                    }}
                                />
                            ))}
                        </Stack>
                    )}
                </>
            )}
        </Box>
    );
};

const MaterialProvidersPage: React.FC = () => {
    const [providers, setProviders] = useState<MaterialProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Order dialog state
    const [orderProvider, setOrderProvider] = useState<MaterialProvider | null>(null);
    // Step 1: pick items from the provider's catalog. Step 2 (reached via
    // "Proceed to Pay"): notes/date/payment details, gated on a proof upload.
    const [orderStep, setOrderStep] = useState<'items' | 'payment'>('items');
    const [orderText, setOrderText] = useState('');
    const [orderNeedDate, setOrderNeedDate] = useState('');
    const [paymentMode, setPaymentMode] = useState('');
    const [paymentProofUrl, setPaymentProofUrl] = useState('');
    const [uploadingProof, setUploadingProof] = useState(false);

    // Order dialog — quantities keyed by catalog item name, chosen straight from
    // what the provider supplies (no free-text item entry).
    const [orderQtys, setOrderQtys] = useState<Record<string, number>>({});
    const orderMaterialOptions = orderProvider?.materials || [];

    const bumpOrderQty = (name: string, delta: number) => {
        setOrderQtys(prev => {
            const next = Math.max(0, (prev[name] || 0) + delta);
            const copy = { ...prev };
            if (next === 0) delete copy[name];
            else copy[name] = next;
            return copy;
        });
    };

    const filledOrderItems = orderMaterialOptions
        .filter(m => (orderQtys[m.name] || 0) > 0)
        .map(m => ({ name: m.name, quantity: String(orderQtys[m.name]), unit: m.unit || '', unitPrice: m.defaultUnitPrice }));
    const orderSubtotal = filledOrderItems.reduce((sum, it) => sum + (it.unitPrice || 0) * (parseFloat(it.quantity) || 1), 0);
    // Free text sent to the provider, built from the picked catalog items plus any extra notes typed on the payment step.
    const orderItemsText = filledOrderItems
        .map(it => `${it.quantity} ${it.unit ? `${it.unit} ` : ''}${it.name}`.trim())
        .join('\n');
    const combinedOrderText = [orderItemsText, orderText.trim()].filter(Boolean).join('\n');

    const openOrder = (provider: MaterialProvider) => {
        setOrderProvider(provider);
        setOrderStep('items');
        setOrderText('');
        setOrderNeedDate('');
        setPaymentMode('');
        setPaymentProofUrl('');
        setOrderQtys({});
    };
    const closeOrder = () => setOrderProvider(null);

    const handleProofUpload = async (file: File) => {
        try {
            setUploadingProof(true);
            const res = await uploadAPI.uploadImage(file, 'purchase');
            setPaymentProofUrl(res.data?.url || '');
        } catch {
            toast.error('Failed to upload payment proof');
        } finally {
            setUploadingProof(false);
        }
    };

    const [placing, setPlacing] = useState(false);

    // Build the payload for recording a placed order
    const buildOrderPayload = (p: MaterialProvider, channel: 'email' | 'whatsapp' | 'manual') => ({
        providerId: p._id,
        providerName: p.name,
        providerEmail: p.email || '',
        providerPhone: p.phone || '',
        providerAddress: p.address || '',
        orderText: combinedOrderText,
        items: filledOrderItems.map(it => ({ name: it.name.trim(), quantity: it.quantity || '1', unit: it.unit || '' })),
        needByDate: orderNeedDate || undefined,
        note: orderText.trim() || undefined,
        paymentMode: paymentMode || undefined,
        paymentProofUrl: paymentProofUrl || undefined,
        channel,
    });

    const placeOrder = async (p: MaterialProvider, channel: 'email' | 'whatsapp' | 'manual' = 'manual') => {
        if (placing) return;
        try {
            setPlacing(true);
            await purchaseOrdersAPI.createMaterialOrder(buildOrderPayload(p, channel));
            toast.success('Order placed and saved to history');
            closeOrder();
        } catch {
            toast.error('Failed to place order');
        } finally {
            setPlacing(false);
        }
    };

    // ---- Order history ----
    const [historyProvider, setHistoryProvider] = useState<MaterialProvider | null>(null);
    const [historyOrders, setHistoryOrders] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [receivingId, setReceivingId] = useState<string | null>(null);

    const openHistory = async (p: MaterialProvider) => {
        setHistoryProvider(p);
        setHistoryLoading(true);
        try {
            const res = await purchaseOrdersAPI.listMaterialOrders(p._id);
            setHistoryOrders(res.data?.data || []);
        } catch {
            setHistoryOrders([]);
        } finally {
            setHistoryLoading(false);
        }
    };
    const closeHistory = () => { setHistoryProvider(null); setHistoryOrders([]); };

    // Receive dialog (edit PO line items before adding to Purchase Orders)
    type ReceiveItem = { description: string; quantity: string; unit: string; unitPrice: string };
    const [receiveTarget, setReceiveTarget] = useState<any | null>(null);
    const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);
    const [receiveNotes, setReceiveNotes] = useState('');

    const receiveProvider = React.useMemo(
        () => providers.find(p => p._id === receiveTarget?.providerId) || null,
        [providers, receiveTarget]
    );
    const receiveMaterialOptions = receiveProvider?.materials || [];

    const openReceive = (order: any) => {
        setReceiveTarget(order);
        const structuredItems = Array.isArray(order.items) ? order.items.filter((it: any) => it?.name) : [];
        setReceiveItems(
            structuredItems.length > 0
                ? structuredItems.map((it: any) => ({
                    description: it.name,
                    quantity: String(it.quantity ?? 1),
                    unit: it.unit || '',
                    unitPrice: '',
                }))
                : [{ description: order.orderText || '', quantity: '1', unit: '', unitPrice: '' }]
        );
        setReceiveNotes('');
    };
    const closeReceive = () => { setReceiveTarget(null); setReceiveItems([]); setReceiveNotes(''); };
    const updateItem = (i: number, field: keyof ReceiveItem, value: string) => {
        if (field === 'quantity' || field === 'unitPrice') {
            let cleanValue = value;
            if (cleanValue.length > 1 && cleanValue.startsWith('0') && !cleanValue.startsWith('0.')) {
                cleanValue = cleanValue.replace(/^0+/, '');
                if (cleanValue === '') cleanValue = '0';
            }
            const parts = cleanValue.split('.');
            if (parts[0].length > 5) return;
            setReceiveItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: cleanValue } : it));
        } else {
            setReceiveItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
        }
    };
    const addItem = () => setReceiveItems(prev => [...prev, { description: '', quantity: '1', unit: '', unitPrice: '' }]);
    const removeItem = (i: number) => setReceiveItems(prev => prev.filter((_, idx) => idx !== i));

    // When a catalog item is picked, auto-fill its unit/default price alongside the description.
    const selectMaterial = (i: number, materialName: string) => {
        const match = receiveMaterialOptions.find(m => m.name === materialName);
        setReceiveItems(prev => prev.map((it, idx) => idx === i ? {
            ...it,
            description: materialName,
            unit: match?.unit ?? it.unit,
            unitPrice: match?.defaultUnitPrice != null ? String(match.defaultUnitPrice) : it.unitPrice,
        } : it));
    };

    const receiveTotal = receiveItems.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

    const confirmReceive = async () => {
        if (!receiveTarget || receivingId) return;
        const items = receiveItems
            .filter(it => it.description.trim())
            .map(it => ({
                description: it.description.trim(),
                quantity: Number(it.quantity) || 1,
                unit: it.unit.trim() || 'unit',
                unitPrice: Number(it.unitPrice) || 0,
            }));
        if (items.length === 0) { toast.error('Add at least one item with a description'); return; }
        try {
            setReceivingId(receiveTarget._id);
            await purchaseOrdersAPI.receiveMaterialOrder(receiveTarget._id, { items, notes: receiveNotes.trim() || undefined });
            toast.success('Marked received — added to Purchase Orders');
            closeReceive();
            if (historyProvider) {
                const res = await purchaseOrdersAPI.listMaterialOrders(historyProvider._id);
                setHistoryOrders(res.data?.data || []);
            }
        } catch {
            toast.error('Failed to mark received');
        } finally {
            setReceivingId(null);
        }
    };

    useEffect(() => {
        setLoading(true);
        materialProvidersAPI.getAll({ search: search || undefined, limit: 100 })
            .then(res => setProviders(res.data?.data || []))
            .catch(() => setError('Failed to load material providers.'))
            .finally(() => setLoading(false));
    }, [search]);

    const filtered = providers.filter(p =>
        !search ||
        p.name?.toLowerCase().includes(search?.toLowerCase()) ||
        p.contactPerson?.toLowerCase().includes(search?.toLowerCase()) ||
        p.categories?.some(c => c?.toLowerCase().includes(search?.toLowerCase()))
    );

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Material Providers
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Approved suppliers and material providers managed by the platform.
                </Typography>
            </Box>

            <TextField
                placeholder="Search by name, contact person, or category…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 3, maxWidth: 480 }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                    ),
                }}
            />

            {loading && <CardGridSkeleton count={6} cardHeight={280} />}

            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && filtered.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <StoreIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No material providers found.</Typography>
                </Box>
            )}

            <Grid container spacing={2}>
                {filtered.map(provider => (
                    <Grid item xs={12} sm={6} md={4} key={provider._id}>
                        <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none', '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }, transition: 'box-shadow 0.2s' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                    <Avatar
                                        src={provider.logo || undefined}
                                        variant="rounded"
                                        sx={{
                                            bgcolor: provider.logo ? 'transparent' : 'primary.light',
                                            color: 'primary.main',
                                            width: 48,
                                            height: 48,
                                            fontWeight: 700,
                                            fontSize: '1.1rem',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            '& img': { objectFit: 'contain' },
                                        }}
                                    >
                                        {provider.name.charAt(0)?.toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Typography fontWeight="bold" noWrap>{provider.name}</Typography>
                                        <Chip
                                            label={provider.status}
                                            size="small"
                                            color={provider.status === 'active' ? 'success' : 'default'}
                                            sx={{ height: 18, fontSize: '0.65rem', mt: 0.25 }}
                                        />
                                    </Box>
                                    <Tooltip title="Order history">
                                        <IconButton onClick={() => openHistory(provider)} sx={{ color: 'text.secondary' }}>
                                            <HistoryIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Place an order">
                                        <IconButton
                                            color="primary"
                                            onClick={() => openOrder(provider)}
                                            sx={{ bgcolor: 'primary.light', color: 'primary.main', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
                                        >
                                            <OrderIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Box>

                                {provider.categories && (provider?.categories || []).length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                                        {(provider?.categories || []).map(cat => (
                                            <Chip key={cat} label={cat} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                                        ))}
                                    </Box>
                                )}

                                <Divider sx={{ mb: 1.5 }} />

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    {provider.contactPerson && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="body2" color="text.secondary">{provider.contactPerson}</Typography>
                                        </Box>
                                    )}
                                    {provider.phone && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="body2" component="a" href={`tel:${provider.phone}`} sx={{ color: 'primary.main', textDecoration: 'none' }}>
                                                {provider.phone}
                                            </Typography>
                                        </Box>
                                    )}
                                    {provider.email && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="body2" component="a" href={`mailto:${provider.email}`} sx={{ color: 'primary.main', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {provider.email}
                                            </Typography>
                                        </Box>
                                    )}
                                    {provider.address && (
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                            <LocationIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25 }} />
                                            <Typography variant="body2" color="text.secondary">{provider.address}</Typography>
                                        </Box>
                                    )}
                                    {provider.website && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <WebsiteIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography
                                                variant="body2"
                                                component="a"
                                                href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{ color: 'primary.main', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            >
                                                {provider.website}
                                            </Typography>
                                        </Box>
                                    )}
                                    {provider.notes && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                            {provider.notes}
                                        </Typography>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Order dialog */}
            <Dialog open={!!orderProvider} onClose={closeOrder} maxWidth="sm" fullWidth>
                {orderProvider && (() => {
                    if (orderStep === 'items') {
                        return (
                            <>
                                <DialogTitle sx={{ pb: 1 }}>Order from {orderProvider.name}</DialogTitle>
                                <DialogContent>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mt: 1, mb: 1, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                        Items
                                    </Typography>
                                    {orderMaterialOptions.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                                            No catalog set for this provider.
                                        </Typography>
                                    ) : (
                                        <Grid container spacing={1.5}>
                                            {orderMaterialOptions.map((mat) => {
                                                const qty = orderQtys[mat.name] || 0;
                                                return (
                                                    <Grid item xs={6} key={mat.name}>
                                                        <Box
                                                            sx={{
                                                                border: '1px solid', borderColor: qty > 0 ? 'primary.main' : 'divider',
                                                                borderRadius: 2, overflow: 'hidden', height: '100%',
                                                                display: 'flex', flexDirection: 'column',
                                                            }}
                                                        >
                                                            <MaterialImageSlider
                                                                images={(mat.images && mat.images.length > 0) ? mat.images : (mat.image ? [mat.image] : [])}
                                                                alt={mat.name}
                                                            />
                                                            <Box sx={{ p: 1.25, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                                                <Typography variant="body2" fontWeight={600} noWrap>{mat.name}</Typography>
                                                                {mat.unit && (
                                                                    <Typography variant="caption" color="text.secondary" noWrap>{mat.unit}</Typography>
                                                                )}
                                                                {mat.defaultUnitPrice != null && (
                                                                    <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                                                                        ${Number(mat.defaultUnitPrice).toFixed(2)}
                                                                    </Typography>
                                                                )}
                                                                <Box sx={{ mt: 'auto', pt: 1 }}>
                                                                    {qty > 0 ? (
                                                                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                                                            <IconButton size="small" onClick={() => bumpOrderQty(mat.name, -1)} sx={{ border: '1px solid', borderColor: 'divider' }}>
                                                                                <RemoveIcon fontSize="inherit" />
                                                                            </IconButton>
                                                                            <Typography variant="body2" fontWeight={600} sx={{ minWidth: 20, textAlign: 'center' }}>{qty}</Typography>
                                                                            <IconButton size="small" onClick={() => bumpOrderQty(mat.name, 1)} sx={{ border: '1px solid', borderColor: 'divider' }}>
                                                                                <AddIcon fontSize="inherit" />
                                                                            </IconButton>
                                                                        </Stack>
                                                                    ) : (
                                                                        <Button size="small" variant="outlined" fullWidth onClick={() => bumpOrderQty(mat.name, 1)}>
                                                                            Add to cart
                                                                        </Button>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                    </Grid>
                                                );
                                            })}
                                        </Grid>
                                    )}
                                    {orderSubtotal > 0 && (
                                        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography fontWeight={700}>Total</Typography>
                                            <Typography fontWeight={700}>${orderSubtotal.toFixed(2)}</Typography>
                                        </Box>
                                    )}
                                </DialogContent>
                                <DialogActions sx={{ p: 2, pt: 0 }}>
                                    <Button onClick={closeOrder} color="inherit">Cancel</Button>
                                    <Box sx={{ flexGrow: 1 }} />
                                    <Button
                                        variant="contained"
                                        disabled={filledOrderItems.length === 0}
                                        startIcon={<OrderIcon />}
                                        onClick={() => setOrderStep('payment')}
                                    >
                                        Proceed to Pay
                                    </Button>
                                </DialogActions>
                            </>
                        );
                    }

                    return (
                        <>
                            <DialogTitle sx={{ pb: 1 }}>Order from {orderProvider.name}</DialogTitle>
                            <DialogContent>
                                <TextField
                                    label="Additional notes (optional)"
                                    placeholder="e.g. deliver before noon"
                                    value={orderText}
                                    onChange={(e) => setOrderText(e.target.value)}
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    sx={{ mt: 1 }}
                                />
                                <TextField
                                    label="Need by date"
                                    type="date"
                                    value={orderNeedDate}
                                    onChange={(e) => setOrderNeedDate(e.target.value)}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ min: new Date().toISOString().split('T')[0] }}
                                    sx={{ mt: 2 }}
                                />
                                <TextField
                                    label="Payment mode"
                                    placeholder="e.g. Bank transfer, UPI, Cheque"
                                    value={paymentMode}
                                    onChange={(e) => setPaymentMode(e.target.value)}
                                    fullWidth
                                    sx={{ mt: 2 }}
                                />
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                        Proof of payment
                                    </Typography>
                                    {paymentProofUrl ? (
                                        <Box sx={{ position: 'relative', width: '100%', height: 140, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                                            <Box component="img" src={paymentProofUrl} alt="Payment proof" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                            <IconButton
                                                size="small"
                                                onClick={() => setPaymentProofUrl('')}
                                                sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ) : (
                                        <Button
                                            component="label"
                                            variant="outlined"
                                            fullWidth
                                            disabled={uploadingProof}
                                            startIcon={uploadingProof ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                                            sx={{ height: 100, borderStyle: 'dashed' }}
                                        >
                                            {uploadingProof ? 'Uploading…' : 'Drop payment screenshot / receipt'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                hidden
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleProofUpload(file);
                                                    e.target.value = '';
                                                }}
                                            />
                                        </Button>
                                    )}
                                    {!paymentProofUrl && (
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                            Upload a payment screenshot or receipt to place the order.
                                        </Typography>
                                    )}
                                </Box>
                                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                                        <Typography variant="body2" color="text.secondary">${orderSubtotal.toFixed(2)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                        <Typography fontWeight={700}>Total</Typography>
                                        <Typography fontWeight={700}>${orderSubtotal.toFixed(2)}</Typography>
                                    </Box>
                                </Box>
                            </DialogContent>
                            <DialogActions sx={{ p: 2, pt: 0, flexWrap: 'wrap', gap: 1 }}>
                                <Button onClick={() => setOrderStep('items')} color="inherit">Back</Button>
                                <Box sx={{ flexGrow: 1 }} />
                                <Button
                                    variant="contained"
                                    disabled={placing || !paymentProofUrl}
                                    startIcon={placing ? <CircularProgress size={16} color="inherit" /> : <OrderIcon />}
                                    onClick={() => placeOrder(orderProvider, 'manual')}
                                >
                                    {placing ? 'Saving…' : 'Place Order'}
                                </Button>
                            </DialogActions>
                        </>
                    );
                })()}
            </Dialog>

            {/* Order history dialog */}
            <Dialog open={!!historyProvider} onClose={closeHistory} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>Order history — {historyProvider?.name}</DialogTitle>
                <DialogContent>
                    {historyLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
                    ) : historyOrders.length === 0 ? (
                        <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                            No orders placed to this provider yet.
                        </Typography>
                    ) : (
                        <Stack spacing={1.5} sx={{ mt: 1 }}>
                            {historyOrders.map((o) => (
                                <Box key={o._id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                {o.orderText || '(no details)'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                Placed {new Date(o.createdAt).toLocaleDateString()}
                                                {o.needByDate ? ` · Needed by ${new Date(o.needByDate).toLocaleDateString()}` : ''}
                                                {o.channel && o.channel !== 'manual' ? ` · via ${o.channel}` : ''}
                                                {o.paymentMode ? ` · Paid via ${o.paymentMode}` : ''}
                                            </Typography>
                                            {o.paymentProofUrl && (
                                                <Typography variant="caption" display="block">
                                                    <a href={o.paymentProofUrl} target="_blank" rel="noopener noreferrer">View payment proof</a>
                                                </Typography>
                                            )}
                                            {/* The provider's own progress, so the
                                                restaurant can see an order was
                                                acknowledged and dispatched. */}
                                            {(o.confirmedAt || o.sentAt) && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {o.confirmedAt ? `Confirmed ${new Date(o.confirmedAt).toLocaleDateString()}` : ''}
                                                    {o.confirmedAt && o.sentAt ? ' · ' : ''}
                                                    {o.sentAt ? `Sent ${new Date(o.sentAt).toLocaleDateString()}` : ''}
                                                </Typography>
                                            )}
                                            {o.providerNote && (
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic' }}>
                                                    Provider: {o.providerNote}
                                                </Typography>
                                            )}
                                            {o.status === 'received' && o.poNumber && (
                                                <Typography variant="caption" color="success.main" display="block">
                                                    In Purchase Orders: {o.poNumber}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                            <Chip
                                                label={o.status}
                                                size="small"
                                                color={ORDER_STATUS_COLOR[o.status] || 'warning'}
                                                sx={{ textTransform: 'capitalize', mb: 0.5 }}
                                            />
                                            {/* Receivable from any live state — a
                                                restaurant may take delivery before
                                                the provider marks it dispatched.
                                                Previously this only appeared for
                                                'placed', which left confirmed and
                                                sent orders with no way to receive. */}
                                            {CAN_RECEIVE.includes(o.status) && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="success"
                                                    startIcon={<ReceivedIcon />}
                                                    onClick={() => openReceive(o)}
                                                    sx={{ display: 'block', mt: 0.5 }}
                                                >
                                                    Received
                                                </Button>
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            ))}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeHistory}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Receive dialog — edit PO details before adding to Purchase Orders */}
            <Dialog open={!!receiveTarget} onClose={closeReceive} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pb: 0.5 }}>Receive order — add to Purchase Orders</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 0.5 }}>
                        Review and edit the items before they're added to Purchase Orders.
                    </Typography>
                    <Stack spacing={1.5}>
                        {receiveItems.map((it, i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <Autocomplete
                                    freeSolo
                                    options={receiveMaterialOptions.map(m => m.name)}
                                    value={it.description}
                                    inputValue={it.description}
                                    onChange={(_e, val) => selectMaterial(i, val || '')}
                                    onInputChange={(_e, val) => updateItem(i, 'description', val)}
                                    size="small"
                                    sx={{ flex: '2 1 160px' }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Item"
                                            placeholder={receiveMaterialOptions.length ? 'Select an item' : 'No catalog set for this provider'}
                                        />
                                    )}
                                />
                                <TextField
                                    label="Qty"
                                    type="number"
                                    value={it.quantity}
                                    onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                                    size="small"
                                    sx={{ flex: '0 1 70px' }}
                                    inputProps={{ min: 0, step: 'any' }}
                                />
                                {/* Read-only — the provider defines the unit it supplies in. */}
                                <TextField
                                    label="Unit"
                                    value={it.unit || ''}
                                    size="small"
                                    InputProps={{ readOnly: true }}
                                    placeholder="—"
                                    sx={{
                                        flex: '0 1 100px',
                                        '& .MuiInputBase-input': { cursor: 'default' },
                                    }}
                                />
                                <TextField
                                    label="Unit price"
                                    type="number"
                                    value={it.unitPrice}
                                    onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                                    size="small"
                                    sx={{ flex: '0 1 100px' }}
                                    inputProps={{ min: 0, step: 'any' }}
                                />
                                <IconButton size="small" color="error" onClick={() => removeItem(i)} disabled={receiveItems.length === 1} sx={{ mt: 0.5 }}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                    </Stack>
                    <Button size="small" startIcon={<AddIcon />} onClick={addItem} sx={{ mt: 1 }}>Add item</Button>

                    <TextField
                        label="Notes (optional)"
                        value={receiveNotes}
                        onChange={(e) => setReceiveNotes(e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        sx={{ mt: 2 }}
                    />
                    <Typography variant="subtitle2" sx={{ mt: 2, textAlign: 'right' }}>
                        Total: ${receiveTotal.toFixed(2)}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={closeReceive} color="inherit">Cancel</Button>
                    <Button
                        variant="contained"
                        color="success"
                        disabled={!!receivingId}
                        startIcon={receivingId ? <CircularProgress size={16} color="inherit" /> : <ReceivedIcon />}
                        onClick={confirmReceive}
                    >
                        {receivingId ? 'Saving…' : 'Add to Purchase Orders'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MaterialProvidersPage;
