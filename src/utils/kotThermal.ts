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

const CHARS_PER_LINE = 48; // 80mm

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
    items: KotItem[];
}

const padR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s + ' '.repeat(w - s.length));
const padL = (s: string, w: number) => (s.length > w ? s.slice(0, w) : ' '.repeat(w - s.length) + s);

/** Remove stray angle brackets and collapse extra spaces from a display string. */
const cleanText = (s?: string) => (s ?? '').replace(/[<>]/g, '').replace(/\s{2,}/g, ' ').trim();

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
    const rule = () => line('-'.repeat(CHARS_PER_LINE));

    b.push(...INIT);
    b.push(...ALIGN_CENTER, ...BOLD_ON, ...DOUBLE_ON);
    line('** KITCHEN **');
    b.push(...DOUBLE_OFF, ...BOLD_OFF, ...ALIGN_LEFT);
    rule();
    if (data.tokenNumber != null) { b.push(...BOLD_ON, ...DOUBLE_ON); line(`Token #${data.tokenNumber}`); b.push(...DOUBLE_OFF, ...BOLD_OFF); }
    if (data.orderNumber) line('Order No: ' + data.orderNumber);
    if (data.orderTypeLabel) line('Type: ' + data.orderTypeLabel.toUpperCase());
    if (data.tableLabel) line('Table: ' + data.tableLabel);
    if (data.customerName) line('Customer: ' + data.customerName);
    rule();
    b.push(...BOLD_ON); line(padR('Item', CHARS_PER_LINE - 5) + padL('Qty', 5)); b.push(...BOLD_OFF);
    rule();
    for (const it of data.items.filter(i => i.preparationStatus !== 'cancelled')) {
        const name = cleanText(it.name) || 'Item';
        const qty = padL(String(it.quantity), 5);
        b.push(...BOLD_ON);
        if (name.length <= CHARS_PER_LINE - 5) {
            line(padR(name, CHARS_PER_LINE - 5) + qty);
        } else {
            line(padR(name.slice(0, CHARS_PER_LINE - 5), CHARS_PER_LINE - 5) + qty);
            line('  ' + name.slice(CHARS_PER_LINE - 5));
        }
        b.push(...BOLD_OFF);
        if (it.spiceLevel) line('   Spice: ' + cleanText(it.spiceLevel));
        if (it.notes) line('   Note: ' + cleanText(it.notes));
    }
    rule();
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
    parts.push('<text align="center"/>', '<text em="true" dw="true" dh="true"/>');
    t('** KITCHEN **');
    parts.push('<text dw="false" dh="false" em="false"/>', '<text align="left"/>');
    t('-'.repeat(CHARS_PER_LINE));
    if (data.tokenNumber != null) { parts.push('<text em="true" dw="true" dh="true"/>'); t(`Token #${data.tokenNumber}`); parts.push('<text dw="false" dh="false" em="false"/>'); }
    if (data.orderNumber) t('Order No: ' + data.orderNumber);
    if (data.orderTypeLabel) t('Type: ' + data.orderTypeLabel.toUpperCase());
    if (data.tableLabel) t('Table: ' + data.tableLabel);
    if (data.customerName) t('Customer: ' + data.customerName);
    t('-'.repeat(CHARS_PER_LINE));
    parts.push('<text em="true"/>'); t(padR('Item', CHARS_PER_LINE - 5) + padL('Qty', 5)); parts.push('<text em="false"/>');
    t('-'.repeat(CHARS_PER_LINE));
    for (const it of data.items.filter(i => i.preparationStatus !== 'cancelled')) {
        const name = cleanText(it.name) || 'Item';
        const qty = padL(String(it.quantity), 5);
        parts.push('<text em="true"/>');
        if (name.length <= CHARS_PER_LINE - 5) t(padR(name, CHARS_PER_LINE - 5) + qty);
        else { t(padR(name.slice(0, CHARS_PER_LINE - 5), CHARS_PER_LINE - 5) + qty); t('  ' + name.slice(CHARS_PER_LINE - 5)); }
        parts.push('<text em="false"/>');
        if (it.spiceLevel) t('   Spice: ' + cleanText(it.spiceLevel));
        if (it.notes) t('   Note: ' + cleanText(it.notes));
    }
    t('-'.repeat(CHARS_PER_LINE));
    parts.push('<feed line="3"/>', '<cut type="feed"/>');
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
