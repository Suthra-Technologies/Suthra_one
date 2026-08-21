import React, { useMemo, useRef } from 'react';
import {
    Box,
    Button,
    Divider,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
    alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'react-hot-toast';
import { getTenantSlugFromHostname, getTenantUrl } from '../utils/tenant.utils';

interface KioskQRCardProps {
    /** Optional explicit slug; otherwise resolved from hostname/localStorage. */
    slug?: string;
    /** Restaurant name — used for the downloaded file name. */
    restaurantName?: string;
}

/**
 * "Use this instead of Kiosk" — a scannable QR that points at the tenant's
 * public self-service ordering page (the global dine-in / takeaway kiosk,
 * GuestPOSPage at the tenant root). Customers scan it to order from their own
 * phone instead of a dedicated kiosk device. The QR is deterministic from the
 * tenant URL, so it is generated client-side and needs no persistence.
 */
const KioskQRCard: React.FC<KioskQRCardProps> = ({ slug, restaurantName }) => {
    const theme = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);

    const resolvedSlug = useMemo(
        () => slug || getTenantSlugFromHostname() || localStorage.getItem('tenantSlug') || '',
        [slug],
    );

    // Tenant root = the kiosk landing (GuestPOSPage) where the guest picks
    // global dine-in / takeaway and orders.
    const kioskUrl = useMemo(
        () => (resolvedSlug ? getTenantUrl(resolvedSlug, '') : ''),
        [resolvedSlug],
    );

    const handleCopy = async () => {
        if (!kioskUrl) return;
        try {
            await navigator.clipboard.writeText(kioskUrl);
            toast.success('Kiosk link copied');
        } catch {
            toast.error('Could not copy link');
        }
    };

    const handleDownload = () => {
        const canvas = containerRef.current?.querySelector('canvas');
        if (!canvas) return;
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const safeName = (restaurantName || resolvedSlug || 'kiosk').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        link.href = pngUrl;
        link.download = `${safeName}-kiosk-qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: 3,
                borderColor: alpha(theme.palette.primary.main, 0.25),
                background: alpha(theme.palette.primary.main, 0.03),
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                <QrCode2Icon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                    Use this instead of Kiosk
                </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, fontFamily: "'Outfit', sans-serif" }}>
                Print and place this QR at your counter or on tables. Customers scan it to open your
                self-service ordering page on their own phone and order directly — no kiosk device needed.
            </Typography>

            <Divider sx={{ mb: 2.5 }} />

            {kioskUrl ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'center', sm: 'flex-start' }}>
                    <Box
                        ref={containerRef}
                        sx={{
                            p: 1.5,
                            bgcolor: '#fff',
                            borderRadius: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            lineHeight: 0,
                        }}
                    >
                        <QRCodeCanvas value={kioskUrl} size={180} level="M" includeMargin />
                    </Box>

                    <Stack spacing={2} sx={{ flex: 1, width: '100%' }}>
                        <TextField
                            fullWidth
                            label="Kiosk link"
                            value={kioskUrl}
                            InputProps={{
                                readOnly: true,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Tooltip title="Copy link">
                                            <IconButton onClick={handleCopy} edge="end" size="small">
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                                Download QR
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<OpenInNewIcon />}
                                component="a"
                                href={kioskUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ borderRadius: 2.5, fontWeight: 700 }}
                            >
                                Preview kiosk
                            </Button>
                        </Stack>
                    </Stack>
                </Stack>
            ) : (
                <Typography variant="body2" color="error">
                    Could not determine your restaurant's link. Please reload the page.
                </Typography>
            )}
        </Paper>
    );
};

export default KioskQRCard;
