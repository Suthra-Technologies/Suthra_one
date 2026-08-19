import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    Paper,
    Switch,
    FormControlLabel,
    Grid,
    Chip,
    IconButton,
    alpha,
    useTheme
} from '@mui/material';
import {
    Print as PrintIcon,
    Close as CloseIcon,
    Smartphone as MobileIcon
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { settingsAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import type { TableItem } from './FloorPlanView';

interface ContactlessDiningModalProps {
    open: boolean;
    onClose: () => void;
    tables: TableItem[];
    tenantSlug?: string | null;
}

const ContactlessDiningModal: React.FC<ContactlessDiningModalProps> = ({
    open,
    onClose,
    tables,
    tenantSlug
}) => {
    const theme = useTheme();
    const [enabled, setEnabled] = useState(true);
    const [paymentMode, setPaymentMode] = useState<'pay_now' | 'pay_later'>('pay_later');
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (open) {
            settingsAPI.get('dining_rooms').then(res => {
                const data = res.data?.settings || res.data || {};
                if (typeof data.contactlessEnabled === 'boolean') {
                    setEnabled(data.contactlessEnabled);
                }
                if (data.paymentMode) {
                    setPaymentMode(data.paymentMode);
                }
            }).catch(() => null);
        }
    }, [open]);

    const handleToggleEnabled = async (newVal: boolean) => {
        setEnabled(newVal);
        try {
            setSaving(true);
            await settingsAPI.update('dining_rooms', { contactlessEnabled: newVal, paymentMode });
            toast.success(newVal ? 'Contactless QR Dining enabled' : 'Contactless QR Dining turned OFF in database');
        } catch (e) {
            console.error('Failed to update contactless settings', e);
            toast.error('Failed to save setting to backend database');
        } finally {
            setSaving(false);
        }
    };

    const handlePaymentModeChange = async (newMode: 'pay_now' | 'pay_later') => {
        setPaymentMode(newMode);
        try {
            setSaving(true);
            await settingsAPI.update('dining_rooms', { contactlessEnabled: enabled, paymentMode: newMode });
            toast.success('Payment mode updated in database');
        } catch (e) {
            console.error('Failed to update payment mode', e);
        } finally {
            setSaving(false);
        }
    };

    const activeTables = tables.filter(t => t.isActive !== false);
    const getTableQrUrl = (table: TableItem) => {
        const slug = tenantSlug || 'mythri';
        const domain = window.location.origin;
        return `${domain}/${slug}?tableId=${table._id}&tableNo=${encodeURIComponent(table.tableNumber)}`;
    };

    const handlePrintAll = () => {
        if (!enabled) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const cardsHtml = activeTables.map(t => {
            const qrUrl = getTableQrUrl(t);
            return `
                <div class="qr-card">
                    <div class="brand">MYTHRI RESTAURANT</div>
                    <div class="table-title">TABLE ${t.tableNumber}</div>
                    <div class="section-tag">${(t.section || t.location || 'Indoor').toUpperCase()} • ${t.capacity} SEATS</div>
                    <div class="qr-box">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}" alt="Table ${t.tableNumber} QR" />
                    </div>
                    <div class="instruction">Scan with phone camera to<br><b>View Menu, Order & Pay</b></div>
                </div>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Table QR Standees</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #fff; }
                    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                    .qr-card {
                        border: 2px solid #000;
                        border-radius: 16px;
                        padding: 24px;
                        text-align: center;
                        background: #fff;
                        page-break-inside: avoid;
                    }
                    .brand { font-size: 14px; font-weight: 800; letter-spacing: 2px; color: #666; margin-bottom: 8px; }
                    .table-title { font-size: 28px; font-weight: 900; margin-bottom: 4px; }
                    .section-tag { font-size: 11px; font-weight: 700; color: #444; margin-bottom: 16px; }
                    .qr-box { display: inline-block; padding: 12px; border: 1.5px solid #eee; border-radius: 12px; background: #fafafa; margin-bottom: 16px; }
                    .instruction { font-size: 13px; color: #333; line-height: 1.4; }
                    @media print {
                        body { padding: 0; }
                        .grid { gap: 15px; }
                    }
                </style>
            </head>
            <body>
                <div class="grid">${cardsHtml}</div>
                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3.5, p: 0.5 } }}
        >
            <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MobileIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={900}>
                            Contactless Table QR Dining
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                            Allow guests to scan table QR standees to view menu, order & pay from their phone
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ py: 2.5 }}>
                {/* SETTINGS CONTROL CARD */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3, bgcolor: '#F8FAFC' }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={enabled}
                                        disabled={saving}
                                        onChange={(e) => handleToggleEnabled(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={800}>
                                            Contactless QR Ordering Active
                                        </Typography>
                                        <Typography variant="caption" color={enabled ? 'success.main' : 'error.main'} fontWeight={700}>
                                            {enabled ? 'Guests can scan table QR codes to order' : 'QR Ordering disabled for restaurant'}
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                                <Typography variant="caption" fontWeight={800} color="text.secondary">
                                    Payment Mode:
                                </Typography>
                                <Button
                                    size="small"
                                    disabled={saving}
                                    variant={paymentMode === 'pay_later' ? 'contained' : 'outlined'}
                                    onClick={() => handlePaymentModeChange('pay_later')}
                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
                                >
                                    Pay at Cashier
                                </Button>
                                <Button
                                    size="small"
                                    disabled={saving}
                                    variant={paymentMode === 'pay_now' ? 'contained' : 'outlined'}
                                    onClick={() => handlePaymentModeChange('pay_now')}
                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
                                >
                                    Pay on Phone
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>

                {!enabled ? (
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 4,
                            borderRadius: 3,
                            textAlign: 'center',
                            bgcolor: '#FFF1F2',
                            borderColor: '#FECDD3',
                            color: '#9F1239',
                            my: 2
                        }}
                    >
                        <Typography variant="h6" fontWeight={900} gutterBottom>
                            🛑 Contactless QR Dining is Turned OFF
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ maxW: 480, mx: 'auto' }}>
                            QR code table ordering is currently disabled for your restaurant. Turn ON the switch above to enable contactless dining and view or print Table QR codes.
                        </Typography>
                    </Paper>
                ) : (
                    <>
                        {/* ACTION BAR */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={900}>
                                Table QR Code Standees ({activeTables.length} Tables)
                            </Typography>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<PrintIcon />}
                                onClick={handlePrintAll}
                                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900, px: 2.5 }}
                            >
                                Print All Table QR Cards
                            </Button>
                        </Box>

                        {/* TABLE QR GRID */}
                        <Grid container spacing={2}>
                            {activeTables.map((table) => {
                                const qrUrl = getTableQrUrl(table);
                                return (
                                    <Grid item xs={6} sm={4} md={3} key={table._id}>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                borderRadius: 3,
                                                textAlign: 'center',
                                                transition: 'all 0.15s ease',
                                                '&:hover': { borderColor: 'primary.main', boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }
                                            }}
                                        >
                                            <Chip
                                                label={`TABLE ${table.tableNumber}`}
                                                size="small"
                                                color="primary"
                                                sx={{ fontWeight: 900, mb: 1.5, px: 1 }}
                                            />
                                            <Box sx={{ p: 1, bgcolor: '#FFFFFF', borderRadius: 2, display: 'inline-block', border: '1px solid', borderColor: 'divider', mb: 1 }}>
                                                <QRCodeSVG value={qrUrl} size={110} level="M" />
                                            </Box>
                                            <Typography variant="caption" display="block" color="text.secondary" fontWeight={700}>
                                                {(table.section || table.location || 'Indoor').toUpperCase()} • {table.capacity} Seats
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 2.5, py: 1.5 }}>
                <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ContactlessDiningModal;
