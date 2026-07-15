/**
 * Kitchen Order Ticket (KOT) thermal printing for Wi-Fi/LAN printers (Android app).
 *
 * A KOT is a kitchen-facing ticket: token, order no, type, table, and item names + qty
 * (with notes / spice level). No prices, no totals, no QR. Prints to the KITCHEN printer
 * (settings.printer.kitchen), not the billing printer.
 *
 * Supports the same three command modes as the bill: epos-print (Epson TM), escpos (raw 9100), star-line.
 */

import { sendToThermalPrinter, sendEposPrint, isThermalPrintAvailable } from '../services/thermalPrint';
import { sendToUsbPrinter, isUsbPrintAvailable } from '../services/usbPrint';
import type { TenantPrinterSettings } from '../context/SettingsContext';

const CHARS_PER_LINE_LARGE = 21; // Safe for 76mm double-width

export interface KotItem {
    name: string;
    quantity: number;
    notes?: string;
    spiceLevel?: string;
    preparationStatus?: string;
}

export interface KotData {
    tokenNumber?: string | number;
    orderNumber?: string;
    orderTypeLabel?: string;
    tableLabel?: string;
    customerName?: string;
    orderDateStr?: string;
    printedDateStr?: string;
    items: KotItem[];
}

const padR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s + ' '.repeat(w - s.length));
const padL = (s: string, w: number) => (s.length > w ? s.slice(0, w) : ' '.repeat(w - s.length) + s);

/** Remove stray angle brackets and collapse extra spaces from a display string. */
const cleanText = (s?: string) => (s ?? '').replace(/[<>]/g, '').replace(/\s{2,}/g, ' ').trim();

function formatUsDate(dateObj: Date): string {
    const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const d = dateObj.getDate().toString().padStart(2, '0');
    const y = dateObj.getFullYear();
    let h = dateObj.getHours();
    const min = dateObj.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${m}/${d}/${y} ${h}:${min} ${ampm}`;
}

// ── ESC/POS control codes ──
const ESC = 0x1b, GS = 0x1d;
const INIT = [ESC, 0x40];
const ALIGN_CENTER = [ESC, 0x61, 0x01];
const ALIGN_LEFT = [ESC, 0x61, 0x00];
const BOLD_ON = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];
const DOUBLE_ON = [GS, 0x21, 0x11];
const DOUBLE_OFF = [GS, 0x21, 0x00];
const FEED = (n: number) => [ESC, 0x64, n];
const CUT = [GS, 0x56, 0x42, 0x00];

function textBytes(str: string): number[] {
    const out: number[] = [];
    const safe = (str ?? '').replace(/₹/g, 'Rs.');
    for (let i = 0; i < safe.length; i++) out.push(safe.charCodeAt(i) & 0xff);
    return out;
}

function buildKotEscPos(data: KotData): Uint8Array {
    const b: number[] = [];
    const line = (s = '') => { b.push(...textBytes(s), 0x0a); };
    const rule = () => line('-'.repeat(CHARS_PER_LINE_LARGE));

    b.push(...INIT);
    // Large font for readability in kitchen
    b.push(...ALIGN_LEFT, ...BOLD_ON, ...DOUBLE_ON);

    // Order Type centered
    if (data.orderTypeLabel) {
        b.push(...ALIGN_CENTER);
        line(data.orderTypeLabel?.toUpperCase());
        b.push(...ALIGN_LEFT);
    } else {
        b.push(...ALIGN_CENTER);
        line('** KITCHEN **');
        b.push(...ALIGN_LEFT);
    }

    if (data.orderDateStr) line(data.orderDateStr);

    if (data.printedDateStr) {
        const fullPrinted = 'Printed: ' + data.printedDateStr;
        if (fullPrinted.length > CHARS_PER_LINE_LARGE) {
            line(fullPrinted.slice(0, 20));
            line(fullPrinted.slice(20));
        } else {
            line(fullPrinted);
        }
    }

    if (data.tokenNumber != null) {
        line(`Token #${data.tokenNumber}`);
    }

    if (data.tableLabel) {
        line(`Table: ${data.tableLabel}`);
    }

    if (data.customerName) {
        line('');
        line(data.customerName);
    }

    b.push(...BOLD_OFF);
    rule();

    for (const it of (data?.items || []).filter(i => i.preparationStatus !== 'cancelled')) {
        const name = cleanText(it.name) || 'Item';
        const qtyStr = it.quantity > 1 ? ` x${it.quantity}` : '';
        const fullItemStr = name + qtyStr;

        if (fullItemStr.length <= CHARS_PER_LINE_LARGE) {
            line(fullItemStr);
        } else {
            line(fullItemStr.slice(0, CHARS_PER_LINE_LARGE));
            line(' ' + fullItemStr.slice(CHARS_PER_LINE_LARGE, CHARS_PER_LINE_LARGE * 2 - 1));
        }

        if (it.spiceLevel) {
            const spice = cleanText(it.spiceLevel);
            line(padL(spice, CHARS_PER_LINE_LARGE));
        }
        if (it.notes) {
            const note = cleanText(it.notes);
            line(' ' + note);
        }
        rule();
    }

    if (data.orderNumber) {
        b.push(...DOUBLE_OFF, ...BOLD_ON);
        line(`ID: ${data.orderNumber}`);
    }

    b.push(...FEED(4), ...CUT);
    return Uint8Array.from(b);
}

function xmlEsc(s: string): string {
    return (s ?? '').replace(/₹/g, 'Rs.').replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function buildKotEposXml(data: KotData): string {
    const parts: string[] = [];
    const t = (s: string, attrs = '') => parts.push(`<text${attrs ? ' ' + attrs : ''}>${xmlEsc(s)}&#10;</text>`);

    // Large font for readability
    parts.push('<text em="true" dw="true" dh="true"/>');

    if (data.orderTypeLabel) {
        parts.push('<text align="center"/>');
        t(data.orderTypeLabel?.toUpperCase());
        parts.push('<text align="left"/>');
    } else {
        parts.push('<text align="center"/>');
        t('** KITCHEN **');
        parts.push('<text align="left"/>');
    }

    if (data.orderDateStr) t(data.orderDateStr);

    if (data.printedDateStr) {
        const fullPrinted = 'Printed: ' + data.printedDateStr;
        if (fullPrinted.length > CHARS_PER_LINE_LARGE) {
            t(fullPrinted.slice(0, 20));
            t(fullPrinted.slice(20));
        } else {
            t(fullPrinted);
        }
    }

    if (data.tokenNumber != null) {
        t(`Token #${data.tokenNumber}`);
    }

    if (data.tableLabel) {
        t(`Table: ${data.tableLabel}`);
    }

    if (data.customerName) {
        t('');
        t(data.customerName);
    }

    parts.push('<text em="false"/>');
    t('-'.repeat(CHARS_PER_LINE_LARGE));

    for (const it of (data?.items || []).filter(i => i.preparationStatus !== 'cancelled')) {
        const name = cleanText(it.name) || 'Item';
        const qtyStr = it.quantity > 1 ? ` x${it.quantity}` : '';
        const fullItemStr = name + qtyStr;

        if (fullItemStr.length <= CHARS_PER_LINE_LARGE) {
            t(fullItemStr);
        } else {
            t(fullItemStr.slice(0, CHARS_PER_LINE_LARGE));
            t(' ' + fullItemStr.slice(CHARS_PER_LINE_LARGE, CHARS_PER_LINE_LARGE * 2 - 1));
        }

        if (it.spiceLevel) {
            const spice = cleanText(it.spiceLevel);
            t(padL(spice, CHARS_PER_LINE_LARGE));
        }
        if (it.notes) {
            const note = cleanText(it.notes);
            t(' ' + note);
        }
        t('-'.repeat(CHARS_PER_LINE_LARGE));
    }

    if (data.orderNumber) {
        parts.push('<text em="true" dw="false" dh="false"/>');
        t(`ID: ${data.orderNumber}`);
    }

    parts.push('<feed line="4"/>', '<cut type="feed"/>');
    return '<?xml version="1.0" encoding="utf-8"?>' +
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>' +
        '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
        parts.join('') + '</epos-print></s:Body></s:Envelope>';
}

/**
 * Print a KOT to the configured kitchen Wi-Fi printer.
 * Returns true if printed via thermal; false if not available/configured (caller falls back).
 */
export async function printKotThermal(
    order: any,
    printerSettings: TenantPrinterSettings | undefined,
): Promise<boolean> {
    const kitchen = printerSettings?.kitchen;
    if (!printerSettings?.enabled || !kitchen) return false;

    const isUsb = kitchen.type === 'usb';
    // commandMode defaults to 'epos-print' to match the settings dropdown's default display.
    const isEpos = kitchen.type === 'escpos-tcp' && (kitchen.commandMode || 'epos-print') === 'epos-print';
    if (isUsb) {
        if (!isUsbPrintAvailable()) return false;
    } else if (isEpos) {
        if (!kitchen.ip) return false;
    } else if (
        !isThermalPrintAvailable() ||
        kitchen.type !== 'escpos-tcp' ||
        !kitchen.ip
    ) {
        return false;
    }

    const data: KotData = {
        tokenNumber: order.dailyTokenNumber,
        orderNumber: order.orderNumber,
        orderTypeLabel: (order.orderType || '').replace(/_/g, ' '),
        tableLabel:
            order.tableNumber || order.table?.tableNumber || order.table?.number ||
            order.table?.tableName || order.table?.name || undefined,
        customerName: order.customer?.name && !/^[0-9a-fA-F]{8,24}$/.test(order.customer.name)
            ? order.customer.name : undefined,
        orderDateStr: order.createdAt ? formatUsDate(new Date(order.createdAt)) : undefined,
        printedDateStr: formatUsDate(new Date()),
        items: (order.items || []).map((it: any) => ({
            name: it.name || it.menuItem?.name || 'Item',
            quantity: it.quantity ?? 1,
            notes: it.notes,
            spiceLevel: it.spiceLevel,
            preparationStatus: it.preparationStatus,
        })),
    };

    if (isUsb) {
        await sendToUsbPrinter(buildKotEscPos(data));
    } else if (isEpos) {
        await sendEposPrint(buildKotEposXml(data), kitchen.ip, kitchen.deviceId || 'local_printer');
    } else {
        await sendToThermalPrinter(buildKotEscPos(data), kitchen.ip, kitchen.port || 9100);
    }
    return true;
}
