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

    // Cross-device dedupe: atomically claim the order in the backend. If another device
    // (background print station, second POS terminal, browser session) already claimed it,
    // skip — that device is printing it. If the claim call itself fails (offline backend),
    // print anyway: a missed dedupe beats a missed ticket.
    try {
        const { data: claim } = await ordersAPI.claimPrint(orderId);
        if (claim && claim.claimed === false) {
            console.log('[AutoPrint] Another device claimed order', orderId, '— skipping');
            return false;
        }
    } catch (claimErr) {
        console.warn('[AutoPrint] claimPrint failed — printing without cross-device dedupe', claimErr);
    }

    try {
        const { data: billData } = await ordersAPI.getBillData(orderId);
        const isDelivery = billData?.orderType === 'delivery';

        if (billData?.isPreOrder) {
            console.log('[AutoPrint] Pre-order detected — deferring KOT print until promotion');
            printedOrderIds.delete(orderId);
            return false;
        }

        // Print Automation mode picks what gets auto-printed: both (default), KOT only, or bill only.
        const mode = printerSettings?.autoPrintMode || 'both';
        const shouldPrintKot = mode === 'both' || mode === 'kot';
        const shouldPrintBill = mode === 'both' || mode === 'bill';

        // Delivery: print the KOT now (kitchen starts cooking) but DEFER the bill. The bill prints
        // later via the background station once the Uber pickup barcode (handoffQr) is set — which
        // happens when staff move the order to ready-to-takeaway. Non-delivery: print KOT + bill now.
        if (shouldPrintKot) {
            try {
                await printKotThermal(billData, printerSettings);
                // Mark KOT done so the background station doesn't reprint it.
                await ordersAPI.markPrintStage(orderId, 'kot').catch(() => {});
            } catch (kotErr) {
                console.error('[AutoPrint] KOT print failed:', kotErr);
            }
        } else {
            console.log('[AutoPrint] Mode excludes KOT — skipping, marking done to prevent background reprint');
            await ordersAPI.markPrintStage(orderId, 'kot').catch(() => {});
        }

        if (!shouldPrintBill) {
            console.log('[AutoPrint] Mode excludes bill — marking done to prevent background reprint');
            await ordersAPI.markPrintStage(orderId, 'bill').catch(() => {});
            return true;
        }

        if (isDelivery) {
            // Bill handled by the background station when the pickup QR is ready.
            printedOrderIds.delete(orderId);
            console.log('[AutoPrint] Delivery bill deferred to print station for', orderId);
            return false;
        }

        // Only print the bill if a billing printer is explicitly configured with an IP.
        // If only a KOT/kitchen printer is set (billing type = 'none' or no IP), skip bill.
        const billingConfigured =
            printerSettings?.billing?.type &&
            printerSettings.billing.type !== 'none' &&
            (printerSettings.billing.type === 'usb' || !!printerSettings.billing.ip);

        if (billingConfigured) {
            await printBillThermal(billData, printerSettings, formatMoney);
            await ordersAPI.markPrintStage(orderId, 'bill').catch(() => {});
        } else {
            // No billing printer — mark bill as "done" in the backend so the background
            // print station doesn't pick it up and print it separately.
            console.log('[AutoPrint] Billing printer not configured — marking bill done to prevent background reprint');
            await ordersAPI.markPrintStage(orderId, 'bill').catch(() => {});
        }
        return true;
    } catch (err) {
        // Printing failed — allow a future retry for this order.
        printedOrderIds.delete(orderId);
        console.error('[AutoPrint] Failed to print order', orderId, err);
        throw err;
    }
}
