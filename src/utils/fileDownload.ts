import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Cross-platform file download utility.
 *
 * - **Web**: standard blob-URL + hidden-anchor download.
 * - **Android**: uses Capacitor Filesystem.downloadFile() to download via the
 *   native HTTP stack directly to the device's Download folder.
 * - **iOS**: uses Filesystem.downloadFile() → share-sheet so the user can
 *   "Save to Files" or open in another app.
 *
 * IMPORTANT: On native, CapacitorHttp (enabled in this project) breaks
 * `responseType: 'blob'` in axios — the blob arrives empty / corrupt.
 * This utility sidesteps that entirely by using the native download API.
 */

/**
 * Download a file by URL. On native this streams directly from the server
 * via the native HTTP stack; on web it uses fetch + blob download.
 *
 * @param url       Full URL to the file (e.g. https://api.example.com/api/reports/export/excel?...)
 * @param fileName  The name for the downloaded file (e.g. "report.xlsx")
 * @param headers   Optional HTTP headers (e.g. { Authorization: 'Bearer ...' })
 */
export async function downloadFromUrl(
    url: string,
    fileName: string,
    headers?: Record<string, string>,
): Promise<void> {
    if (Capacitor.isNativePlatform()) {
        await downloadOnNative(url, fileName, headers);
    } else {
        await downloadOnWeb(url, fileName, headers);
    }
}

// ──────────────────────────────────────────
// Web: fetch blob then trigger browser download
// ──────────────────────────────────────────
async function downloadOnWeb(
    url: string,
    fileName: string,
    headers?: Record<string, string>,
): Promise<void> {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const blob = await response.blob();

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
}

// ──────────────────────────────────────────
// Native: use Filesystem.downloadFile()
// ──────────────────────────────────────────
async function downloadOnNative(
    url: string,
    fileName: string,
    headers?: Record<string, string>,
): Promise<void> {
    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
        await downloadOnAndroid(url, fileName, headers);
    } else {
        await downloadOnIOS(url, fileName, headers);
    }
}

// ──────────────────────────────────────────
// Android: download straight to Downloads folder
// ──────────────────────────────────────────
async function downloadOnAndroid(
    url: string,
    fileName: string,
    headers?: Record<string, string>,
): Promise<void> {
    // Try 1: public Download folder via ExternalStorage
    try {
        await Filesystem.downloadFile({
            url,
            path: `Download/${fileName}`,
            directory: Directory.ExternalStorage,
            headers,
            recursive: true,
        });
        return;
    } catch (_) { /* scoped-storage may block this on Android 11+ */ }

    // Try 2: Documents directory (app-scoped but visible in Files app)
    try {
        await Filesystem.downloadFile({
            url,
            path: fileName,
            directory: Directory.Documents,
            headers,
            recursive: true,
        });
        return;
    } catch (_) { /* fallback */ }

    // Try 3: cache dir → share sheet as last resort
    const result = await Filesystem.downloadFile({
        url,
        path: fileName,
        directory: Directory.Cache,
        headers,
    });

    if (result?.path) {
        const { Share } = await import('@capacitor/share');
        await Share.share({
            title: fileName,
            url: result.path,
            dialogTitle: `Save ${fileName}`,
        });
    }
}

// ──────────────────────────────────────────
// iOS: download to cache → share-sheet (standard iOS UX)
// ──────────────────────────────────────────
async function downloadOnIOS(
    url: string,
    fileName: string,
    headers?: Record<string, string>,
): Promise<void> {
    const result = await Filesystem.downloadFile({
        url,
        path: fileName,
        directory: Directory.Cache,
        headers,
    });

    if (result?.path) {
        const { Share } = await import('@capacitor/share');
        await Share.share({
            title: fileName,
            url: result.path,
            dialogTitle: `Save ${fileName}`,
        });
    }
}
