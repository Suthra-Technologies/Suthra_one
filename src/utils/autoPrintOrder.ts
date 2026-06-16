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
    if (!orderId) return false;
    if (!autoPrintEnabled) return false;
    if (!isThermalPrintAvailable()) return false;
    if (!printerSettings?.enabled) return false;
    if (printedOrderIds.has(orderId)) {
        console.log('[AutoPrint] Skipped duplicate for order', orderId);
        return false;
    }

    // Reserve the id up front so a near-simultaneous second trigger bails out immediately.
    markPrinted(orderId);

    try {
        const { data: billData } = await ordersAPI.getBillData(orderId);

        // 1) Kitchen ticket first. A KOT failure must not stop the bill.
        try {
            await printKotThermal(billData, printerSettings);
        } catch (kotErr) {
            console.error('[AutoPrint] KOT print failed:', kotErr);
        }

        // 2) Customer bill.
        await printBillThermal(billData, printerSettings, formatMoney);
        return true;
    } catch (err) {
        // Printing failed — allow a future retry for this order.
        printedOrderIds.delete(orderId);
        console.error('[AutoPrint] Failed to print order', orderId, err);
        throw err;
    }
}
