/**
 * Cash drawer support. The drawer is wired to the receipt printer's DK (drawer kick)
 * port, so "opening the drawer" means sending a kick command to the billing printer:
 *  - raw ESC/POS (TCP 9100 or WebUSB): ESC p 0 25 250  → pulse on drawer pin 2
 *  - Epson ePOS-Print (HTTP):          <pulse drawer="drawer_1" time="pulse_100"/>
 *  - Star Line Mode:                    BEL (0x07)      → fires the drawer on Star printers
 *
 * Two entry points:
 *  - `isCashPayment(order)`   — used by the bill builders to embed the kick in the bill print
 *  - `openCashDrawer(settings)` — standalone kick (no printout) for when staff collect cash
 *    after the bill already printed (e.g. PaymentCollectionDialog "pay at counter").
 */

import { sendToThermalPrinter, sendEposPrint, isThermalPrintAvailable } from '../services/thermalPrint';
import { sendToUsbPrinter, isUsbPrintAvailable } from '../services/usbPrint';
import type { TenantPrinterSettings } from '../context/SettingsContext';

/** ESC p 0 25 250 — kick drawer pin 2, 50ms on / 500ms off. */
export const DRAWER_KICK_ESCPOS = [0x1b, 0x70, 0x00, 0x19, 0xfa];

/** BEL — fires the cash drawer on Star Line Mode printers (SP700 etc.). */
export const DRAWER_KICK_STAR = [0x07];

/** ePOS-Print element that fires drawer 1 with a 100ms pulse. */
export const DRAWER_KICK_EPOS_XML = '<pulse drawer="drawer_1" time="pulse_100"/>';

/**
 * True when the order/bill was (or will be) paid in cash — either the order-level
 * paymentMethod or any collected payment split with method 'cash'.
 */
export function isCashPayment(order: any): boolean {
    if (!order) return false;
    if (order.paymentMethod === 'cash') return true;
    if (Array.isArray(order.payments)) {
        return order.payments.some((p: any) => p?.method === 'cash');
    }
    return false;
}

/** Minimal ePOS-Print SOAP envelope containing only the drawer pulse (nothing prints). */
function buildDrawerOnlyEposXml(): string {
    return (
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
        '<s:Body>' +
        '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
        DRAWER_KICK_EPOS_XML +
        '</epos-print>' +
        '</s:Body>' +
        '</s:Envelope>'
    );
}

/**
 * Open the cash drawer attached to the billing printer without printing anything.
 * Best-effort: resolves true if the kick was sent, false if no usable printer is
 * configured. Throws only when a configured transport genuinely fails.
 */
export async function openCashDrawer(
    printerSettings: TenantPrinterSettings | undefined,
): Promise<boolean> {
    const billing = printerSettings?.billing;
    if (!printerSettings?.enabled || !billing || billing.type === 'none') return false;

    // Wired USB printer (WebUSB).
    if (billing.type === 'usb') {
        if (!isUsbPrintAvailable()) return false;
        await sendToUsbPrinter(Uint8Array.from(DRAWER_KICK_ESCPOS));
        return true;
    }

    if (billing.type !== 'escpos-tcp' || !billing.ip) return false;

    // commandMode defaults to 'epos-print' to match the settings dropdown (same as printBillThermal).
    const mode = billing.commandMode || 'epos-print';
    if (mode === 'epos-print') {
        await sendEposPrint(buildDrawerOnlyEposXml(), billing.ip, billing.deviceId || 'local_printer');
        return true;
    }

    // Raw TCP modes need the native Android plugin.
    if (!isThermalPrintAvailable()) return false;
    const bytes = mode === 'star-line' ? DRAWER_KICK_STAR : DRAWER_KICK_ESCPOS;
    await sendToThermalPrinter(Uint8Array.from(bytes), billing.ip, billing.port || 9100);
    return true;
}
