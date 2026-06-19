/**
 * Single entry point for auto-printing an order (KOT + bill) to the Wi-Fi thermal printer.
 *
 * Used by BOTH:
 *  - POS submitOrder (orders placed on this device)
 *  - NotificationProvider's socket `newOrder` handler (orders from customer portal / web / guest)
 *
 * A module-level dedupe set ensures the same order never prints twice even if both paths fire
 * for it (e.g. the POS phone also receives its own newOrder socket event).
 */

import { ordersAPI } from '../services/api';
import { printBillThermal } from './printBillThermal';
import { printKotThermal } from './kotThermal';
import { isThermalPrintAvailable } from '../services/thermalPrint';
import { isUsbPrintAvailable } from '../services/usbPrint';
import type { TenantPrinterSettings } from '../context/SettingsContext';

// Order ids already printed (or printing) this session. Capped to avoid unbounded growth.
const printedOrderIds = new Set<string>();
const MAX_TRACKED = 500;

function markPrinted(id: string) {
    if (printedOrderIds.size >= MAX_TRACKED) {
        // Drop the oldest entry (insertion order) to keep the set bounded.
        const first = printedOrderIds.values().next().value;
        if (first) printedOrderIds.delete(first);
    }
    printedOrderIds.add(id);
}

/**
 * Fetch the bill for an order and print KOT then bill. Safe to call from anywhere:
 * - no-ops if not on Android / printing disabled / printer unconfigured
 * - dedupes by order id so the same order can't double-print
 *
 * Returns true if it actually printed, false if skipped.
 */
export async function autoPrintOrder(
    orderId: string,
    printerSettings: TenantPrinterSettings | undefined,
    autoPrintEnabled: boolean,
    formatMoney: (n: number) => string,
): Promise<boolean> {
    if (!orderId) { console.log('[AutoPrint] No orderId — skip'); return false; }
    if (!autoPrintEnabled) { console.log('[AutoPrint] Auto-print disabled — skip'); return false; }
    // Printing is possible via the native Android plugin (Wi-Fi/TCP), WebUSB (wired desktop),
    // or ePOS-Print over HTTP from any browser (e.g. TM-m30III on the laptop / Clover).
    // commandMode is treated as 'epos-print' when unset, to match the settings dropdown's default.
    const isEpos = (cfg?: { type?: string; commandMode?: string }) =>
        cfg?.type === 'escpos-tcp' && (cfg.commandMode || 'epos-print') === 'epos-print';
    const eposConfigured = isEpos(printerSettings?.billing) || isEpos(printerSettings?.kitchen);
    if (!isThermalPrintAvailable() && !isUsbPrintAvailable() && !eposConfigured) {
        console.log('[AutoPrint] No usable transport (not Android, no USB, no ePOS configured) — skip', {
            billing: printerSettings?.billing,
            kitchen: printerSettings?.kitchen,
        });
        return false;
    }
    if (!printerSettings?.enabled) { console.log('[AutoPrint] Printer settings disabled — skip'); return false; }
    if (printedOrderIds.has(orderId)) {
        console.log('[AutoPrint] Skipped duplicate for order', orderId);
        return false;
    }
    console.log('[AutoPrint] Proceeding to print order', orderId);

    // Reserve the id up front so a near-simultaneous second trigger bails out immediately.
    markPrinted(orderId);

    try {
        const { data: billData } = await ordersAPI.getBillData(orderId);
        const isDelivery = billData?.orderType === 'delivery';

        // Delivery: print the KOT now (kitchen starts cooking) but DEFER the bill. The bill prints
        // later via the background station once the Uber pickup barcode (handoffQr) is set — which
        // happens when staff move the order to ready-to-takeaway. Non-delivery: print KOT + bill now.
        try {
            await printKotThermal(billData, printerSettings);
            // Mark KOT done so the background station doesn't reprint it.
            await ordersAPI.markPrintStage(orderId, 'kot').catch(() => {});
        } catch (kotErr) {
            console.error('[AutoPrint] KOT print failed:', kotErr);
        }

        if (isDelivery) {
            // Bill handled by the background station when the pickup QR is ready.
            printedOrderIds.delete(orderId);
            console.log('[AutoPrint] Delivery bill deferred to print station for', orderId);
            return false;
        }

        // Non-delivery: print the bill now and mark it done.
        await printBillThermal(billData, printerSettings, formatMoney);
        await ordersAPI.markPrintStage(orderId, 'bill').catch(() => {});
        return true;
    } catch (err) {
        // Printing failed — allow a future retry for this order.
        printedOrderIds.delete(orderId);
        console.error('[AutoPrint] Failed to print order', orderId, err);
        throw err;
    }
}
