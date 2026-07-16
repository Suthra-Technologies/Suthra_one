import { buildBillEscPos } from './escposBill';
import { buildBillStarLine } from './starlineBill';
import { buildBillEposXml } from './eposPrintBill';
import { buildLogoRaster } from './logoRaster';
import type { EscPosBillData, EscPosBillItem } from './escposBill';
import { sendToThermalPrinter, sendEposPrint, isThermalPrintAvailable } from '../services/thermalPrint';
import { sendToUsbPrinter, isUsbPrintAvailable } from '../services/usbPrint';
import {
    formatDateTime,
    getOrderTypeLabel,
    getPaymentMethodLabel,
} from './orderWorkflows';
import type { TenantPrinterSettings } from '../context/SettingsContext';
import { isCashPayment } from './cashDrawer';
import { formatSpiceLevelLabel, stripSpiceFromName } from './spiceLevel';

/**
 * Public site base for QR/feedback links. In the native app window.location.origin is
 * "localhost", so prefer the configured public URL (env), then the API host, then origin.
 */
function getPublicSiteBase(): string {
    const env = (import.meta as any).env || {};
    const explicit = (env.VITE_PUBLIC_SITE_URL as string) || '';
    if (explicit) return explicit.replace(/\/$/, '');
    const api = (env.VITE_API_URL as string) || '';
    if (api && !/localhost|127\.0\.0\.1/.test(api)) return api.replace(/\/api\/?$/, '').replace(/\/$/, '');
    if (typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location.origin)) {
        return window.location.origin;
    }
    return 'https://nexzenpos.com';
}

/**
 * Maps a bill/order object (the same shape PrintBillDialog fetches via ordersAPI.getBillData)
 * into ESC/POS bytes and sends them to the configured Wi-Fi thermal printer.
 *
 * Returns true if it actually printed via the thermal printer; false if thermal printing
 * isn't available/configured (caller can then fall back to the browser print path).
 * Throws only when configured but the socket/print genuinely fails.
 */
export async function printBillThermal(
    billData: any,
    printerSettings: TenantPrinterSettings | undefined,
    formatMoney: (n: number) => string,
): Promise<boolean> {
    const billing = printerSettings?.billing;

    if (!printerSettings?.enabled || !billing) return false;

    // Wired USB printer (WebUSB, desktop browser). Doesn't need an IP or the Android plugin.
    const isUsb = billing.type === 'usb';
    // ePOS-Print is plain HTTP — works from a desktop/Clover browser, not just the Android app.
    // commandMode defaults to 'epos-print' to match the settings dropdown's default display.
    const isEpos = billing.type === 'escpos-tcp' && (billing.commandMode || 'epos-print') === 'epos-print';
    if (isUsb) {
        if (!isUsbPrintAvailable()) return false;
    } else if (isEpos) {
        if (!billing.ip) return false;
    } else {
        // Raw ESC/POS or Star Line over TCP socket: needs the native Android plugin + a printer IP.
        if (!isThermalPrintAvailable() || billing.type !== 'escpos-tcp' || !billing.ip) {
            return false;
        }
    }

    const items: EscPosBillItem[] = (billData.items || [])
        .filter((it: any) => it.preparationStatus !== 'cancelled')
        .map((it: any) => {
            const spiceRaw = it.spiceLevel ? String(it.spiceLevel) : '';
            const name = stripSpiceFromName(it.name || it.menuItem?.name, spiceRaw) || 'Item';
            return {
                name,
                quantity: it.quantity ?? 1,
                price: it.price ?? 0,
                total: it.total ?? (it.price ?? 0) * (it.quantity ?? 1),
                spiceLevel: spiceRaw ? formatSpiceLevelLabel(spiceRaw) : undefined,
                // Collect add-on / modifier names (supports a few shapes the API may return).
                addOns: [
                    ...(Array.isArray(it.addOns) ? it.addOns : []),
                    ...(Array.isArray(it.modifiers) ? it.modifiers : []),
                ]
                    .map((a: any) => (typeof a === 'string' ? a : a?.name || a?.label || ''))
                    .filter(Boolean),
            };
        });

    const tableLabel =
        billData.tableNumber ||
        billData.table?.tableNumber ||
        billData.table?.number ||
        billData.table?.tableName ||
        billData.table?.name ||
        undefined;

    const customerNameRaw = billData.customer?.name;
    const customerName =
        customerNameRaw && !/^[0-9a-fA-F]{8,24}$/.test(customerNameRaw)
            ? customerNameRaw
            : undefined;

    const data: EscPosBillData = {
        restaurantName: billData.restaurant?.name || 'Restaurant',
        restaurantAddress: billData.restaurant?.address,
        restaurantPhone: billData.restaurant?.phone,
        gstNo: billData.restaurant?.gstNo,
        orderNumber:
            billData.orderNumber ||
            (billData._id ? billData._id.slice(-8)?.toUpperCase() : ''),
        dateText: formatDateTime(billData.date || billData.createdAt, billData.restaurant?.timezone),
        orderTypeLabel: getOrderTypeLabel(billData.orderType),
        tableLabel: billData.orderType === 'dine_in' ? tableLabel : undefined,
        tokenNumber: billData.dailyTokenNumber,
        customerName,
        items,
        subtotal: billData.subtotal ?? 0,
        tax: billData.tax?.amount || undefined,
        processingFee: billData.processingFee || undefined,
        deliveryCharge: billData.deliveryCharge || undefined,
        serviceCharge: billData.serviceCharge?.amount || undefined,
        discount:
            (billData.discount?.amount || 0) + (billData.couponDiscount || 0) || undefined,
        couponCode: billData.discount?.couponCode || billData.couponCode || undefined,
        rewardDiscount: billData.rewardDiscount || undefined,
        tip: billData.tip || undefined,
        totalAmount: billData.totalAmount ?? 0,
        paymentMethodLabel:
            billData.paymentStatus === 'pending'
                ? 'PENDING'
                : getPaymentMethodLabel(
                      billData.payments?.length
                          ? billData.payments.map((p: any) => p.method)
                          : billData.paymentMethod,
                  ),
        paid: billData.paymentStatus === 'paid',
        // Cash order: kick the drawer (wired to the billing printer) along with the bill.
        openDrawer: isCashPayment(billData),
        // Delivery orders: QR links to the delivery tracking URL (DoorDash/Uber). All other
        // order types: QR links to the feedback page ("Scan to Rate Us").
        ...(() => {
            const isDelivery = billData.orderType === 'delivery';
            if (isDelivery) {
                // Delivery: print Uber's handoff QR so the driver can scan to confirm pickup.
                if (billData.handoffQr) {
                    return { qrUrl: billData.handoffQr as string, qrCaption: 'Driver: Scan to Confirm Pickup', qrType: billData.handoffQrType as string };
                }
                // No handoff QR yet — skip the QR (don't print a feedback one on a delivery bill).
                return { qrUrl: undefined, qrCaption: '', qrType: undefined };
            }
            const feedbackUrl =
                billData.restaurant?.slug && billData._id
                    ? `${getPublicSiteBase()}/${billData.restaurant.slug}/feedback/${billData._id}`
                    : undefined;
            return { qrUrl: feedbackUrl, qrCaption: 'Scan to Rate Us', qrType: 'QR' };
        })(),
        formatMoney,
    };

    // Convert the brand logo to a printer raster (best-effort; skipped if it can't load).
    const logoUrl = billData.restaurant?.logo;
    if (logoUrl) {
        try {
            const raster = await buildLogoRaster(logoUrl);
            if (raster) {
                data.logoEscposBytes = raster.escposBytes;
                data.logoEpos = { base64: raster.eposBase64, width: raster.width, height: raster.height };
            }
        } catch {
            // Logo failed to render — print the bill without it.
        }
    }

    // Wired USB printer: send raw ESC/POS bytes straight over WebUSB.
    if (isUsb) {
        await sendToUsbPrinter(buildBillEscPos(data));
        return true;
    }

    // Epson TM-m30III (and other TM printers) use ePOS-Print over HTTP — works when raw 9100 is off.
    if (isEpos) {
        const xml = buildBillEposXml(data);
        await sendEposPrint(xml, billing.ip, billing.deviceId || 'local_printer');
        return true;
    }

    // Star printers (SP700/SP742) default to Star Line Mode; everything else uses raw ESC/POS over 9100.
    const bytes =
        billing.commandMode === 'star-line'
            ? buildBillStarLine(data)
            : buildBillEscPos(data);
    await sendToThermalPrinter(bytes, billing.ip, billing.port || 9100);
    return true;
}
