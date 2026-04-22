import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Cross-platform file download utility.
 *
 * On **web** the standard blob-URL + hidden-anchor approach is used.
 * On **native** (iOS / Android via Capacitor) the blob is converted to a
 * base64 data-URI, written to the device cache directory via the Filesystem
 * plugin, and then handed to the native share-sheet so the user can save /
 * open it with any compatible app.
 */
export async function downloadFile(
    blob: Blob,
    fileName: string,
    mimeType?: string,
): Promise<void> {
    if (Capacitor.isNativePlatform()) {
        await downloadOnNative(blob, fileName, mimeType);
    } else {
        downloadOnWeb(blob, fileName);
    }
}

// ──────────────────────────────────────────
// Web: classic blob-URL approach
// ──────────────────────────────────────────
function downloadOnWeb(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────
// Native: write to cache → share-sheet
// ──────────────────────────────────────────
async function downloadOnNative(
    blob: Blob,
    fileName: string,
    mimeType?: string,
): Promise<void> {
    // Convert blob → base64
    const base64 = await blobToBase64(blob);

    // Write to the app's cache directory
    const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
    });

    // Resolve the full URI that native APIs can read
    const fileUri = result.uri;

    // Open the native share-sheet so the user can save / open / share
    await Share.share({
        title: fileName,
        url: fileUri,
        dialogTitle: `Save ${fileName}`,
    });
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // reader.result is "data:<mime>;base64,XXXX…"
            const dataUrl = reader.result as string;
            // Strip the data-URL prefix – Filesystem expects raw base64
            const base64 = dataUrl.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
