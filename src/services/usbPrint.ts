/**
 * WebUSB transport for a wired (USB-connected) ESC/POS thermal printer.
 *
 * This is the "no agent, no SDK" path: the page talks to the USB printer directly via
 * navigator.usb. It works in Chromium browsers (Chrome / Edge) on desktop when the printer
 * is plugged in over USB and the user has granted access. It sends the SAME ESC/POS byte
 * payloads (Uint8Array) that the Wi-Fi/TCP path uses (buildBillEscPos / buildKotEscPos).
 *
 * Notes / limitations:
 *  - WebUSB requires a secure context (https or http://localhost) and a user gesture for the
 *    initial requestDevice() permission prompt — so the first connect must be from a click.
 *  - Many OSes claim USB-class printers with their own driver; on Windows you may need to use
 *    Zadig to install a WinUSB driver for the printer so the browser can claim the interface.
 *  - Not available in the Capacitor Android WebView or on Clover (use the TCP/Clover paths there).
 */

/** A USB printer device once granted + opened, plus its bulk-OUT endpoint. */
interface ConnectedUsbPrinter {
    device: any; // USBDevice
    interfaceNumber: number;
    endpointNumber: number;
}

// Remember the connected printer for the session so we don't reprompt on every print.
let connected: ConnectedUsbPrinter | null = null;

/** True when the browser exposes WebUSB (Chromium desktop, secure context). */
export function isUsbPrintAvailable(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as any).usb;
}

/**
 * Find the first interface that has a bulk OUT endpoint (the data-in channel of an
 * ESC/POS printer). Printers expose this on the "printer" USB class (0x07) but some
 * generic ones use vendor-specific classes, so we don't filter on class here.
 */
function findBulkOutEndpoint(device: any): { interfaceNumber: number; endpointNumber: number } | null {
    const config = device.configuration;
    if (!config) return null;
    for (const iface of config.interfaces) {
        // Use the first alternate that has a bulk OUT endpoint.
        for (const alt of iface.alternates) {
            const out = alt.endpoints.find(
                (e: any) => e.direction === 'out' && e.type === 'bulk',
            );
            if (out) {
                return { interfaceNumber: iface.interfaceNumber, endpointNumber: out.endpointNumber };
            }
        }
    }
    return null;
}

/** Open a granted USBDevice and locate its bulk-OUT endpoint. */
async function openDevice(device: any): Promise<ConnectedUsbPrinter> {
    if (!device.opened) await device.open();
    if (device.configuration === null) await device.selectConfiguration(1);

    const ep = findBulkOutEndpoint(device);
    if (!ep) {
        try { await device.close(); } catch { /* ignore */ }
        throw new Error('No bulk OUT endpoint found — is this an ESC/POS USB printer?');
    }

    try {
        await device.claimInterface(ep.interfaceNumber);
    } catch (err: any) {
        // On some platforms the OS printer driver already claims the interface.
        try { await device.close(); } catch { /* ignore */ }
        throw new Error(
            'Could not claim the USB printer interface. The OS print driver may be holding it. ' +
            (err?.message || ''),
        );
    }

    return { device, interfaceNumber: ep.interfaceNumber, endpointNumber: ep.endpointNumber };
}

/**
 * Prompt the user to pick a USB printer and remember it. MUST be called from a user
 * gesture (e.g. a button click) the first time, because requestDevice() needs one.
 * Returns the product name for display.
 */
export async function connectUsbPrinter(): Promise<string> {
    if (!isUsbPrintAvailable()) {
        throw new Error('WebUSB is not supported in this browser. Use Chrome or Edge on desktop.');
    }
    // Empty filters => show all USB devices; the user picks the printer.
    const device = await (navigator as any).usb.requestDevice({ filters: [] });
    connected = await openDevice(device);
    return device.productName || `USB Printer ${device.vendorId}:${device.productId}`;
}

/**
 * Re-attach to a previously granted USB printer without prompting (e.g. on app load).
 * Returns true if a previously authorized device was found and opened.
 */
export async function reconnectUsbPrinter(): Promise<boolean> {
    if (!isUsbPrintAvailable()) return false;
    if (connected?.device?.opened) return true;
    try {
        const devices = await (navigator as any).usb.getDevices();
        if (!devices || devices.length === 0) return false;
        connected = await openDevice(devices[0]);
        return true;
    } catch {
        return false;
    }
}

/** True if a USB printer is currently connected and ready to receive bytes. */
export function isUsbPrinterConnected(): boolean {
    return !!connected?.device?.opened;
}

/**
 * Send raw ESC/POS bytes to the connected USB printer. Tries to reconnect to a
 * previously authorized device first; throws if none is available (caller can fall back).
 */
export async function sendToUsbPrinter(bytes: Uint8Array): Promise<void> {
    if (!isUsbPrintAvailable()) {
        throw new Error('WebUSB is not supported in this browser.');
    }
    if (!isUsbPrinterConnected()) {
        const ok = await reconnectUsbPrinter();
        if (!ok || !connected) {
            throw new Error('No USB printer connected. Click "Connect USB Printer" first.');
        }
    }
    const { device, endpointNumber } = connected!;
    const result = await device.transferOut(endpointNumber, bytes);
    if (result.status !== 'ok') {
        throw new Error(`USB transfer failed: ${result.status}`);
    }
}

/** Release and forget the connected USB printer. */
export async function disconnectUsbPrinter(): Promise<void> {
    if (connected?.device) {
        try { await connected.device.releaseInterface(connected.interfaceNumber); } catch { /* ignore */ }
        try { await connected.device.close(); } catch { /* ignore */ }
    }
    connected = null;
}
