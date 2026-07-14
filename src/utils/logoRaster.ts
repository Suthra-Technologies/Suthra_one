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

const MAX_WIDTH_DOTS = 200; // ~25mm — a compact centered logo (printer width is ~384 dots).

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

    // 1) Draw at native size on white, then auto-crop blank/transparent margins so the printed
    //    logo is tight (no big gap above/below) and not clipped.
    const nw = img.naturalWidth || 1;
    const nh = img.naturalHeight || 1;
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = nw;
    srcCanvas.height = nh;
    const sctx = srcCanvas.getContext('2d');
    if (!sctx) return null;
    sctx.fillStyle = '#fff';
    sctx.fillRect(0, 0, nw, nh);
    sctx.drawImage(img, 0, 0, nw, nh);

    let srcData: ImageData;
    try {
        srcData = sctx.getImageData(0, 0, nw, nh);
    } catch {
        return null; // canvas tainted by cross-origin image
    }

    // Find the bounding box of non-white (ink) pixels.
    let minX = nw, minY = nh, maxX = -1, maxY = -1;
    for (let y = 0; y < nh; y++) {
        for (let x = 0; x < nw; x++) {
            const i = (y * nw + x) * 4;
            const lum = 0.299 * srcData.data[i] + 0.587 * srcData.data[i + 1] + 0.114 * srcData.data[i + 2];
            if (lum < 200) { // has ink
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    // Fallback to full image if nothing detected.
    if (maxX < 0) { minX = 0; minY = 0; maxX = nw - 1; maxY = nh - 1; }
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;

    // 2) Scale the cropped logo to fit the printer width (cap height so a tall logo isn't huge).
    let w = Math.min(maxWidth, cropW);
    w = Math.max(8, w - (w % 8));
    let h = Math.max(1, Math.round((cropH / cropW) * w));
    const MAX_H = 120; // dots; keep the logo compact so it never dominates the receipt
    if (h > MAX_H) {
        const scale = MAX_H / h;
        h = MAX_H;
        w = Math.max(8, Math.round(w * scale));
        w = w - (w % 8);
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    // Draw only the cropped region, scaled to the target size.
    ctx.drawImage(srcCanvas, minX, minY, cropW, cropH, 0, 0, w, h);

    let pixels: ImageData;
    try {
        pixels = ctx.getImageData(0, 0, w, h);
    } catch {
        return null;
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

function loadImageFromUrl(url: string, crossOrigin: boolean): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (crossOrigin) img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

/**
 * Loads an image for canvas rasterization. To avoid the canvas being "tainted"
 * (which makes getImageData throw and silently drops the logo), it first tries
 * to fetch the bytes as a blob and load via an object URL — a same-origin blob
 * URL is never tainted. Falls back to a direct crossOrigin image load.
 */
async function loadImage(src: string): Promise<HTMLImageElement> {
    try {
        const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
        if (res.ok) {
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            try {
                return await loadImageFromUrl(objectUrl, false);
            } finally {
                // Revoke after the image has loaded (decode already done).
                setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
            }
        }
    } catch {
        // fetch blocked / failed — fall through to direct load below.
    }
    return loadImageFromUrl(src, true);
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}
