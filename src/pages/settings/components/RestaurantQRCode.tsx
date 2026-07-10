import {
    Download as DownloadIcon,
    ContentCopy as ContentCopyIcon,
    OpenInNew as OpenInNewIcon,
    AutoFixHigh as AutoFixHighIcon,
} from '@mui/icons-material';
import { Box, Button, Paper, Stack, TextField, Tooltip, Typography, alpha } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import QRCodeStyling, {
    type Options as QRStylingOptions,
    type DotType,
    type CornerSquareType,
    type CornerDotType,
    type Gradient,
} from 'qr-code-styling';

interface RestaurantQRCodeProps {
    /** The URL the QR code should point to (e.g. https://mythri.localhost:3000/) */
    url: string;
    /** Logo image URL to embed in the centre of the QR code (optional) */
    logoUrl?: string;
    /** Used for the downloaded file name */
    restaurantName?: string;
}

type FrameLayout = 'plain' | 'rounded' | 'badge' | 'ticket';

interface QrStyle {
    name: string;
    /** Module (square) shape */
    dotType: DotType;
    /** Outer corner-eye shape */
    cornerSquareType: CornerSquareType;
    /** Inner corner-eye dot shape */
    cornerDotType: CornerDotType;
    /** Solid foreground colour (used when no gradient) */
    color: string;
    /** Optional gradient applied to the modules */
    gradient?: Gradient;
    /** Optional distinct colour for the corner eyes */
    cornerColor?: string;
    bgColor: string;
    /** Card background behind the QR */
    cardBg: string;
    /** Accent used for frame / caption */
    accent: string;
    captionColor: string;
    layout: FrameLayout;
    caption: string;
}

const linear = (rotation: number, stops: [string, string]): Gradient => ({
    type: 'linear',
    rotation,
    colorStops: [
        { offset: 0, color: stops[0] },
        { offset: 1, color: stops[1] },
    ],
});

// A rotating set of distinct looks. Tapping "Regenerate" cycles through these.
// Each one changes the module shape, the corner-eye shapes, colours/gradients
// and the surrounding frame.
const STYLES: QrStyle[] = [
    {
        name: 'Classic',
        dotType: 'square',
        cornerSquareType: 'square',
        cornerDotType: 'square',
        color: '#111827',
        bgColor: '#ffffff',
        cardBg: '#ffffff',
        accent: '#111827',
        captionColor: '#111827',
        layout: 'plain',
        caption: 'SCAN TO ORDER',
    },
    {
        name: 'Rounded Indigo',
        dotType: 'rounded',
        cornerSquareType: 'extra-rounded',
        cornerDotType: 'dot',
        color: '#4f46e5',
        gradient: linear(45, ['#6366f1', '#4338ca']),
        cornerColor: '#3730a3',
        bgColor: '#ffffff',
        cardBg: '#eef2ff',
        accent: '#4f46e5',
        captionColor: '#3730a3',
        layout: 'rounded',
        caption: 'SCAN TO ORDER',
    },
    {
        name: 'Dots Emerald',
        dotType: 'dots',
        cornerSquareType: 'dot',
        cornerDotType: 'dot',
        color: '#059669',
        cornerColor: '#047857',
        bgColor: '#ffffff',
        cardBg: '#ecfdf5',
        accent: '#059669',
        captionColor: '#065f46',
        layout: 'badge',
        caption: 'ORDER ONLINE',
    },
    {
        name: 'Classy Sunset',
        dotType: 'classy-rounded',
        cornerSquareType: 'extra-rounded',
        cornerDotType: 'dot',
        color: '#ea580c',
        gradient: linear(35, ['#fb923c', '#c2410c']),
        cornerColor: '#9a3412',
        bgColor: '#fff7ed',
        cardBg: '#fff7ed',
        accent: '#ea580c',
        captionColor: '#9a3412',
        layout: 'ticket',
        caption: 'SCAN • ORDER • ENJOY',
    },
    {
        name: 'Midnight Cyan',
        dotType: 'rounded',
        cornerSquareType: 'extra-rounded',
        cornerDotType: 'dot',
        color: '#38bdf8',
        gradient: linear(90, ['#22d3ee', '#3b82f6']),
        cornerColor: '#7dd3fc',
        bgColor: '#0f172a',
        cardBg: '#0f172a',
        accent: '#38bdf8',
        captionColor: '#e2e8f0',
        layout: 'rounded',
        caption: 'SCAN TO ORDER',
    },
    {
        name: 'Classy Rose',
        dotType: 'classy',
        cornerSquareType: 'square',
        cornerDotType: 'square',
        color: '#e11d48',
        gradient: linear(60, ['#fb7185', '#be123c']),
        cornerColor: '#9f1239',
        bgColor: '#ffffff',
        cardBg: '#fff1f2',
        accent: '#e11d48',
        captionColor: '#9f1239',
        layout: 'badge',
        caption: 'SCAN TO ORDER',
    },
];

const QR_SIZE = 220;

/**
 * Renders a styled QR code for the restaurant's customer-facing URL using the
 * `qr-code-styling` engine, so the module/corner shapes, colours and gradients
 * can all change. The "Regenerate" button rotates through several presets, and
 * the result can be downloaded as a PNG.
 */
export default function RestaurantQRCode({ url, logoUrl, restaurantName }: RestaurantQRCodeProps) {
    const theme = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const qrRef = useRef<QRCodeStyling | null>(null);
    const [styleIndex, setStyleIndex] = useState(0);
    const style = STYLES[styleIndex];

    const safeName = useMemo(
        () =>
            (restaurantName || 'restaurant')
                ?.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '') || 'restaurant',
        [restaurantName],
    );

    // A logo that fails to load (broken URL, or cross-origin without CORS) aborts
    // the canvas draw in qr-code-styling and leaves the whole QR blank. So we
    // pre-load it with CORS and only embed it once we know it actually loads.
    const [usableLogo, setUsableLogo] = useState<string | undefined>(undefined);

    useEffect(() => {
        const candidate = logoUrl && /^(https?:|data:|blob:|\/)/.test(logoUrl) ? logoUrl : '';
        if (!candidate) {
            setUsableLogo(undefined);
            return;
        }
        let cancelled = false;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            if (!cancelled) setUsableLogo(candidate);
        };
        img.onerror = () => {
            if (!cancelled) setUsableLogo(undefined);
        };
        img.src = candidate;
        return () => {
            cancelled = true;
        };
    }, [logoUrl]);

    const options: QRStylingOptions = useMemo(
        () => ({
            width: QR_SIZE,
            height: QR_SIZE,
            type: 'canvas',
            data: url,
            margin: 6,
            qrOptions: { errorCorrectionLevel: 'H' },
            image: usableLogo,
            imageOptions: {
                crossOrigin: 'anonymous',
                margin: 4,
                imageSize: 0.4,
                hideBackgroundDots: true,
            },
            backgroundOptions: { color: style.bgColor },
            dotsOptions: style.gradient
                ? { type: style.dotType, gradient: style.gradient }
                : { type: style.dotType, color: style.color },
            cornersSquareOptions: {
                type: style.cornerSquareType,
                color: style.cornerColor || style.color,
            },
            cornersDotOptions: {
                type: style.cornerDotType,
                color: style.cornerColor || style.color,
            },
        }),
        [url, usableLogo, style],
    );

    // Create the instance on first run, then keep it updated. Re-append on every
    // run so it survives React StrictMode's mount/unmount/remount in dev (which
    // would otherwise leave the container empty).
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        if (!qrRef.current) {
            qrRef.current = new QRCodeStyling(options);
        } else {
            qrRef.current.update(options);
        }

        container.innerHTML = '';
        qrRef.current.append(container);
    }, [options]);

    const regenerate = () => {
        let next = styleIndex;
        while (next === styleIndex && STYLES.length > 1) {
            next = Math.floor(Math.random() * STYLES.length);
        }
        setStyleIndex(next);
    };

    const frameSx = useMemo(() => {
        const base = {
            position: 'relative' as const,
            bgcolor: style.cardBg,
            display: 'inline-flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            gap: 1.25,
        };
        switch (style.layout) {
            case 'rounded':
                return { ...base, p: 2.5, borderRadius: 4, border: `3px solid ${style.accent}` };
            case 'badge':
                return {
                    ...base,
                    p: 2.5,
                    borderRadius: '24px 24px 24px 0',
                    boxShadow: `0 10px 24px ${alpha(style.accent, 0.3)}`,
                };
            case 'ticket':
                return { ...base, p: 2.5, borderRadius: 3, border: `2px dashed ${style.accent}` };
            case 'plain':
            default:
                return { ...base, p: 2, borderRadius: 2, boxShadow: `0 4px 12px ${alpha('#000', 0.08)}` };
        }
    }, [style]);

    const handleDownload = async () => {
        const qr = qrRef.current;
        if (!qr) {
            toast.error('QR code is not ready yet. Please try again.');
            return;
        }
        try {
            await qr.download({
                name: `${safeName}-qr-${style.name?.toLowerCase().replace(/\s+/g, '-')}`,
                extension: 'png',
            });
            toast.success('QR code downloaded');
        } catch {
            // A cross-origin logo taints the canvas and blocks export.
            toast.error('Could not export the QR code. Try a logo hosted on the same domain.');
        }
    };

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Link copied');
        } catch {
            toast.error('Could not copy link');
        }
    };

    return (
        <Paper
            variant="outlined"
            sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.02) }}
        >
            <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", mb: 0.5 }}>
                Customer QR Code
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Share this QR code with customers. Tap{' '}
                <Box component="span" sx={{ fontWeight: 700 }}>
                    Regenerate
                </Box>{' '}
                to cycle through shapes, colours and layouts.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'center', sm: 'flex-start' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Box sx={frameSx}>
                        <Box ref={containerRef} sx={{ lineHeight: 0 }} />
                        <Typography
                            sx={{
                                fontFamily: "'Outfit', sans-serif",
                                fontWeight: 800,
                                letterSpacing: 1.5,
                                fontSize: '0.8rem',
                                color: style.captionColor,
                            }}
                        >
                            {style.caption}
                        </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                        Style: {style.name}
                    </Typography>
                </Box>

                <Stack spacing={2} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Ordering link"
                        value={url}
                        slotProps={{ input: { readOnly: true } }}
                    />
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                        <Button
                            variant="outlined"
                            startIcon={<AutoFixHighIcon />}
                            onClick={regenerate}
                            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                        >
                            Regenerate
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={handleDownload}
                            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                        >
                            Download QR
                        </Button>
                        <Tooltip title="Copy link">
                            <Button
                                variant="outlined"
                                startIcon={<ContentCopyIcon />}
                                onClick={handleCopyUrl}
                                sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                            >
                                Copy link
                            </Button>
                        </Tooltip>
                        <Tooltip title="Open page">
                            <Button
                                variant="outlined"
                                startIcon={<OpenInNewIcon />}
                                component="a"
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                            >
                                Preview
                            </Button>
                        </Tooltip>
                    </Stack>
                    {usableLogo && (
                        <Typography variant="caption" color="text.secondary">
                            Tip: if the download fails, the logo may be hosted on another domain. Re-upload it under
                            Restaurant Logo above so it can be embedded.
                        </Typography>
                    )}
                </Stack>
            </Stack>
        </Paper>
    );
}
