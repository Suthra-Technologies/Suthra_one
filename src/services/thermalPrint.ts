import { registerPlugin, Capacitor } from '@capacitor/core';

/**
 * Bridge to the native ThermalPrint Capacitor plugin (Android).
 * Sends raw ESC/POS bytes to a Wi-Fi/LAN thermal printer over TCP (port 9100 by default).
 */
export interface ThermalPrintPlugin {
    print(options: {
        ip: string;
        port?: number;
        /** Base64-encoded ESC/POS byte payload */
        dataBase64: string;
    }): Promise<{ success: boolean }>;
    /** Epson ePOS-Print: HTTP POST of ePOS-Print XML (works when raw 9100 is disabled). */
    eposPrint(options: {
        url: string;
        xml: string;
    }): Promise<{ success: boolean; response?: string }>;
    /** Start the background foreground-service print station. */
    startPrintStation(options: {
        jwt: string;
        apiBase: string;
        printerIp: string;
        printerPort?: number;
        commandMode?: string;
        devId?: string;
    }): Promise<{ success: boolean }>;
    /** Stop the background print station. */
    stopPrintStation(): Promise<{ success: boolean }>;
}

const ThermalPrint = registerPlugin<ThermalPrintPlugin>('ThermalPrint');

/** True only when running inside the native Android app where the plugin exists. */
export function isThermalPrintAvailable(): boolean {
    return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('ThermalPrint');
}

/** Encode a Uint8Array of ESC/POS bytes to base64 for the native bridge. */
function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

/**
 * Send raw ESC/POS bytes to the configured Wi-Fi thermal printer.
 * Throws if the native plugin is unavailable or the socket fails.
 */
export async function sendToThermalPrinter(
    bytes: Uint8Array,
    ip: string,
    port = 9100,
): Promise<void> {
    if (!isThermalPrintAvailable()) {
        throw new Error('Thermal printing is only available in the Android app.');
    }
    if (!ip) {
        throw new Error('Printer IP address is not configured.');
    }
    await ThermalPrint.print({ ip, port, dataBase64: bytesToBase64(bytes) });
}

/**
 * ePOS-Print is plain HTTP, so it works from ANY environment that can reach the printer:
 * the native Android plugin OR a desktop/Clover browser via fetch(). True whenever we have
 * either transport available (the actual reachability check happens when we POST).
 */
export function isEposPrintAvailable(): boolean {
    return isThermalPrintAvailable() || typeof fetch !== 'undefined';
}

/**
 * POST ePOS-Print XML to the printer from a browser via fetch(). Used on the laptop/desktop
 * and on Clover, where the native Android plugin isn't present. The printer replies with an
 * ePOS-Print response XML containing success="true"/"false".
 *
 * Note: the page must be able to reach the printer. If the app is served over https the
 * browser will block this http:// request as mixed content — serve the POS over http or
 * put the printer behind https for production.
 */
async function eposPrintViaFetch(url: string, xml: string): Promise<void> {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""' },
        body: xml,
    });
    const responseXml = await res.text();
    if (!res.ok) {
        throw new Error(`Printer HTTP ${res.status}: ${responseXml}`);
    }
    const ok = responseXml.includes('success="true"') || responseXml.includes("success='true'");
    if (!ok) {
        throw new Error(`Printer reported failure: ${responseXml}`);
    }
}

/**
 * Print to an Epson TM printer via ePOS-Print (HTTP). Use for TM-m30III etc. where raw
 * port 9100 is disabled by default. `ip` is the printer IP; devId defaults to local_printer.
 * Uses the native Android plugin when available, otherwise a browser fetch() POST.
 * Throws if the printer is unreachable or reports failure.
 */
export async function sendEposPrint(
    xml: string,
    ip: string,
    devId = 'local_printer',
): Promise<void> {
    if (!ip) {
        throw new Error('Printer IP address is not configured.');
    }
    const url = `http://${ip}/cgi-bin/epos/service.cgi?devid=${encodeURIComponent(devId)}&timeout=10000`;
    if (isThermalPrintAvailable()) {
        await ThermalPrint.eposPrint({ url, xml });
    } else {
        await eposPrintViaFetch(url, xml);
    }
}

/**
 * Start the background print station (foreground service). It polls the backend for new orders
 * and prints KOT + bill even when the app is backgrounded. Pass the staff JWT + API base.
 */
export async function startPrintStation(opts: {
    jwt: string;
    apiBase: string;
    printerIp: string;
    printerPort?: number;
    commandMode?: string;
    devId?: string;
}): Promise<void> {
    if (!isThermalPrintAvailable()) throw new Error('Print station only available in the Android app.');
    await ThermalPrint.startPrintStation(opts);
}

export async function stopPrintStation(): Promise<void> {
    if (!isThermalPrintAvailable()) return;
    await ThermalPrint.stopPrintStation();
}

export default ThermalPrint;
