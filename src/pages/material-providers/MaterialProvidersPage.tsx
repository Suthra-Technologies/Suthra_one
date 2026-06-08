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
    WhatsApp as WhatsAppIcon,
    History as HistoryIcon,
    CheckCircle as ReceivedIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { materialProvidersAPI, supportAPI, purchaseOrdersAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-hot-toast';

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
}

const POS_PROVIDER_NAME = 'NexZen POS';

const MaterialProvidersPage: React.FC = () => {
    const { settings } = useSettings();
    const restaurantName = settings?.restaurant?.name || 'our restaurant';
    const [providers, setProviders] = useState<MaterialProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Order dialog state
    const [orderProvider, setOrderProvider] = useState<MaterialProvider | null>(null);
    const [orderText, setOrderText] = useState('');
    const [orderNeedDate, setOrderNeedDate] = useState('');
    const [requesting, setRequesting] = useState(false);

    // Our restaurant's contact details (included in every order)
    const r = settings?.restaurant;
    const restPhone = (r as any)?.phone || '';
    const restEmail = (r as any)?.email || '';
    const restLocation = [(r as any)?.address, (r as any)?.city, (r as any)?.state, (r as any)?.zipCode]
        .filter(Boolean).join(', ');

    const openOrder = (provider: MaterialProvider) => {
        setOrderProvider(provider);
        setOrderText('');
        setOrderNeedDate('');
    };
    const closeOrder = () => setOrderProvider(null);

    const buildSubject = (p: MaterialProvider) => `Order request from ${restaurantName}`;
    const buildBody = (p: MaterialProvider) => {
        const lines: string[] = [
            `Hello ${p.contactPerson || p.name},`,
            '',
            `${restaurantName} would like to place the following order. We found you through ${POS_PROVIDER_NAME}.`,
            '',
            orderText.trim() || '(order details)',
            '',
        ];
        if (orderNeedDate) {
            lines.push(`Needed by: ${new Date(orderNeedDate).toLocaleDateString()}`, '');
        }
        lines.push('Please confirm availability and pricing.', '');
        lines.push('--- Ordered by ---', restaurantName);
        if (restPhone) lines.push(`Phone: ${restPhone}`);
        if (restEmail) lines.push(`Email: ${restEmail}`);
        if (restLocation) lines.push(`Location: ${restLocation}`);
        lines.push('', `Referred via ${POS_PROVIDER_NAME}.`);
        return lines.join('\n');
    };

    const sendViaEmail = (p: MaterialProvider) => {
        if (!p.email) return;
        const url = `mailto:${p.email}?subject=${encodeURIComponent(buildSubject(p))}&body=${encodeURIComponent(buildBody(p))}`;
        window.open(url, '_blank');
        placeOrder(p, 'email');
    };

    const sendViaWhatsApp = (p: MaterialProvider) => {
        if (!p.phone) return;
        const digits = p.phone.replace(/\D/g, '');
        const url = `https://wa.me/${digits}?text=${encodeURIComponent(buildBody(p))}`;
        window.open(url, '_blank');
        placeOrder(p, 'whatsapp');
    };

    const [placing, setPlacing] = useState(false);

    // Build the payload for recording a placed order
    const buildOrderPayload = (p: MaterialProvider, channel: 'email' | 'whatsapp' | 'manual') => ({
        providerId: p._id,
        providerName: p.name,
        providerEmail: p.email || '',
        providerPhone: p.phone || '',
        providerAddress: p.address || '',
        orderText: orderText.trim(),
        needByDate: orderNeedDate || undefined,
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

    const openReceive = (order: any) => {
        setReceiveTarget(order);
        setReceiveItems([{ description: order.orderText || '', quantity: '1', unit: '', unitPrice: '' }]);
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

    const requestSuperadmin = async (p: MaterialProvider) => {
        if (requesting) return;
        try {
            setRequesting(true);
            await supportAPI.createTicket({
                subject: `Missing contact details for material provider: ${p.name}`,
                category: 'Material Provider',
                priority: 'medium',
                message: `We want to order from material provider "${p.name}" but it has no email or phone on file. Please add contact details so we can reach them.${orderText.trim() ? `\n\nIntended order:\n${orderText.trim()}` : ''}${orderNeedDate ? `\nNeeded by: ${new Date(orderNeedDate).toLocaleDateString()}` : ''}\n\nOur details: ${restaurantName}${restPhone ? `, ${restPhone}` : ''}${restEmail ? `, ${restEmail}` : ''}${restLocation ? `, ${restLocation}` : ''}`,
            });
            toast.success('Request sent to the platform admin');
            closeOrder();
        } catch {
            toast.error('Failed to send request. Please try again.');
        } finally {
            setRequesting(false);
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
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
        p.categories?.some(c => c.toLowerCase().includes(search.toLowerCase()))
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

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            )}

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
                                        {provider.name.charAt(0).toUpperCase()}
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

                                {provider.categories && provider.categories.length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                                        {provider.categories.map(cat => (
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

                                {provider.materialImage && (
                                    <Box sx={{ mt: 1.75 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.62rem' }}>
                                            Material
                                        </Typography>
                                        <Box
                                            component="img"
                                            src={provider.materialImage}
                                            alt={`${provider.name} material`}
                                            loading="lazy"
                                            sx={{
                                                width: '100%',
                                                height: 140,
                                                objectFit: 'cover',
                                                borderRadius: 2,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                display: 'block',
                                            }}
                                        />
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Order dialog */}
            <Dialog open={!!orderProvider} onClose={closeOrder} maxWidth="xs" fullWidth>
                {orderProvider && (() => {
                    const hasEmail = !!orderProvider.email;
                    const hasPhone = !!orderProvider.phone;
                    const hasContact = hasEmail || hasPhone;
                    return (
                        <>
                            <DialogTitle sx={{ pb: 1 }}>Order from {orderProvider.name}</DialogTitle>
                            <DialogContent>
                                <TextField
                                    label="Order details"
                                    placeholder="e.g. 50 kg chicken, 20 L water…"
                                    value={orderText}
                                    onChange={(e) => setOrderText(e.target.value)}
                                    fullWidth
                                    multiline
                                    minRows={4}
                                    autoFocus
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
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                        Preview (what the provider receives)
                                    </Typography>
                                    <Box
                                        component="pre"
                                        sx={{
                                            m: 0,
                                            p: 1.5,
                                            bgcolor: 'grey.50',
                                            borderRadius: 1.5,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            fontFamily: 'inherit',
                                            fontSize: '0.8rem',
                                            lineHeight: 1.5,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            maxHeight: 220,
                                            overflowY: 'auto',
                                            color: 'text.secondary',
                                        }}
                                    >
                                        {buildBody(orderProvider)}
                                    </Box>
                                    {!restPhone && !restEmail && !restLocation && (
                                        <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>
                                            Add your restaurant phone, email and address in Settings so providers can reach you.
                                        </Typography>
                                    )}
                                </Box>
                                {!hasContact && (
                                    <Alert severity="warning" sx={{ mt: 2 }}>
                                        This provider has no email or phone on file, so the order can't be sent directly.
                                        You can request the platform admin to add their contact details.
                                    </Alert>
                                )}
                            </DialogContent>
                            <DialogActions sx={{ p: 2, pt: 0, flexWrap: 'wrap', gap: 1 }}>
                                <Button onClick={closeOrder} color="inherit">Cancel</Button>
                                <Box sx={{ flexGrow: 1 }} />
                                {hasContact ? (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        {hasPhone && (
                                            <Button
                                                variant="outlined"
                                                color="success"
                                                startIcon={<WhatsAppIcon />}
                                                onClick={() => sendViaWhatsApp(orderProvider)}
                                            >
                                                WhatsApp
                                            </Button>
                                        )}
                                        {hasEmail && (
                                            <Button
                                                variant="outlined"
                                                startIcon={<EmailIcon />}
                                                onClick={() => sendViaEmail(orderProvider)}
                                            >
                                                Email
                                            </Button>
                                        )}
                                        <Button
                                            variant="contained"
                                            disabled={placing}
                                            startIcon={placing ? <CircularProgress size={16} color="inherit" /> : <OrderIcon />}
                                            onClick={() => placeOrder(orderProvider, 'manual')}
                                        >
                                            {placing ? 'Saving…' : 'Placed Order'}
                                        </Button>
                                    </Stack>
                                ) : (
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        disabled={requesting}
                                        startIcon={requesting ? <CircularProgress size={16} color="inherit" /> : undefined}
                                        onClick={() => requestSuperadmin(orderProvider)}
                                    >
                                        {requesting ? 'Sending…' : 'Request Admin'}
                                    </Button>
                                )}
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
                                            </Typography>
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
                                                color={o.status === 'received' ? 'success' : o.status === 'cancelled' ? 'default' : 'warning'}
                                                sx={{ textTransform: 'capitalize', mb: 0.5 }}
                                            />
                                            {o.status === 'placed' && (
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
                                <TextField
                                    label="Item"
                                    value={it.description}
                                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                                    size="small"
                                    sx={{ flex: '2 1 160px' }}
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
                                <TextField
                                    label="Unit"
                                    value={it.unit}
                                    onChange={(e) => updateItem(i, 'unit', e.target.value)}
                                    size="small"
                                    placeholder="kg"
                                    sx={{ flex: '0 1 80px' }}
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
