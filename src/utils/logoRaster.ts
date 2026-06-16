/**
 * Converts a logo image (URL or data URI) into printer-ready monochrome raster data.
 *
 * Produces:
 *  - ESC/POS bytes (GS v 0 raster bit-image) for the raw 9100 path
 *  - base64 raster + width/height for the ePOS-Print <image> tag
 *
 * The image is scaled to fit the printer width (default 384 dots = 48mm printable on 80mm),
 * converted to grayscale, then thresholded to 1-bit black/white.
 */

export interface LogoRaster {
    /** ESC/POS GS v 0 payload (includes the command header + bitmap). */
    escposBytes: Uint8Array;
    /** Base64 of the 1-bit-per-pixel raster (row-major, MSB first) for ePOS-Print <image>. */
    eposBase64: string;
    width: number;  // dots
    height: number; // dots
}

const MAX_WIDTH_DOTS = 384; // 80mm printers: ~384 dots printable width.

let cache: { src: string; result: LogoRaster } | null = null;

/**
 * Load + convert a logo. Returns null if the URL can't be loaded (e.g. CORS) so callers
 * can simply skip the logo rather than fail the whole print.
 */
export async function buildLogoRaster(src: string, maxWidth = MAX_WIDTH_DOTS): Promise<LogoRaster | null> {
    if (!src) return null;
    if (cache && cache.src === src) return cache.result;

    let img: HTMLImageElement;
    try {
        img = await loadImage(src);
    } catch {
        return null; // image not loadable (CORS / 404) — skip logo gracefully
    }

    // Scale to fit width, keep aspect ratio. Width must be a multiple of 8 for byte packing.
    let w = Math.min(maxWidth, img.naturalWidth || maxWidth);
    w = Math.max(8, w - (w % 8));
    const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // White background so transparent PNGs don't print as black.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    let pixels: ImageData;
    try {
        pixels = ctx.getImageData(0, 0, w, h);
    } catch {
        return null; // canvas tainted by cross-origin image
    }

    // Threshold to 1-bit. bit = 1 means black (print a dot).
    const bytesPerRow = w / 8;
    const mono = new Uint8Array(bytesPerRow * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (lum < 160) {
                mono[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
            }
        }
    }

    // ESC/POS: GS v 0 m xL xH yL yH [data]  (m=0 normal)
    const xL = bytesPerRow & 0xff;
    const xH = (bytesPerRow >> 8) & 0xff;
    const yL = h & 0xff;
    const yH = (h >> 8) & 0xff;
    const header = [0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH];
    const escposBytes = new Uint8Array(header.length + mono.length);
    escposBytes.set(header, 0);
    escposBytes.set(mono, header.length);

    const result: LogoRaster = {
        escposBytes,
        eposBase64: bytesToBase64(mono),
        width: w,
        height: h,
    };
    cache = { src, result };
    return result;
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // needed to read pixels from remote images
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}
