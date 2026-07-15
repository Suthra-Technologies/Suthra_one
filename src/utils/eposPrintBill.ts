/**
 * Builds an Epson ePOS-Print XML document for a restaurant bill.
 *
 * ePOS-Print is the TM-m30III's native network protocol (HTTP POST to service.cgi).
 * It works even when raw TCP port 9100 is disabled on the printer — which is the
 * default state on the TM-m30III. Use this instead of escposBill for Epson TM printers.
 *
 * Sized for 80mm (TM-m30III) = 48 characters per line at font A.
 */

import type { EscPosBillData, EscPosBillItem } from './escposBill';
import { sanitizePrintText } from './escposBill';
import { DRAWER_KICK_EPOS_XML } from './cashDrawer';

const CHARS_PER_LINE = 48; // TM-m30III, 80mm, font A.
const EPOS_NS = 'http://www.epson-pos.com/schemas/2011/03/epos-print';

/** Escape text for XML. Also strips non-ASCII (emoji) the printer font can't render. */
function esc(s: string): string {
    return (s ?? '')
        .replace(/₹/g, 'Rs.')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

const padR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s + ' '.repeat(w - s.length));
const padL = (s: string, w: number) => (s.length > w ? s.slice(0, w) : ' '.repeat(w - s.length) + s);

class EposBuilder {
    private parts: string[] = [];

    /** A line of text (LF appended). align: 'left'|'center'|'right'. */
    line(str = '', opts: { bold?: boolean; align?: 'left' | 'center' | 'right'; doubleW?: boolean; doubleH?: boolean } = {}): this {
        if (opts.align) this.parts.push(`<text align="${opts.align}"/>`);
        if (opts.bold) this.parts.push('<text em="true"/>');
        if (opts.doubleW || opts.doubleH) {
            this.parts.push(`<text dw="${opts.doubleW ? 'true' : 'false'}" dh="${opts.doubleH ? 'true' : 'false'}"/>`);
        }
        this.parts.push(`<text>${esc(str)}&#10;</text>`);
        // Reset emphasis/size so it doesn't bleed into following lines.
        if (opts.bold) this.parts.push('<text em="false"/>');
        if (opts.doubleW || opts.doubleH) this.parts.push('<text dw="false" dh="false"/>');
        if (opts.align && opts.align !== 'left') this.parts.push('<text align="left"/>');
        return this;
    }

    rule(): this {
        return this.line('-'.repeat(CHARS_PER_LINE));
    }

    leftRight(left: string, right: string, opts: { bold?: boolean; big?: boolean } = {}): this {
        const space = CHARS_PER_LINE - left.length - right.length;
        const text = space < 1 ? left + ' ' + right : left + ' '.repeat(space) + right;
        return this.line(text, { bold: opts.bold, doubleW: opts.big, doubleH: opts.big });
    }

    qrCode(content: string): this {
        this.parts.push('<text align="center"/>');
        this.parts.push(`<symbol type="qrcode_model_2" level="level_m" width="6">${esc(content)}</symbol>`);
        this.parts.push('<text align="left"/>');
        return this;
    }

    /** Print a CODE128 barcode */
    barcode128(content: string): this {
        this.parts.push('<text align="center"/>');
        this.parts.push(`<barcode type="code128" width="2" height="80" hri="below" font="font_b">{B${esc(content)}</barcode>`);
        this.parts.push('<text align="left"/>');
        return this;
    }

    feedCut(): this {
        this.parts.push('<feed line="3"/>');
        this.parts.push('<cut type="feed"/>');
        return this;
    }

    /** Wrap everything in the ePOS-Print SOAP envelope. */
    toXml(): string {
        return (
            '<?xml version="1.0" encoding="utf-8"?>' +
            '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">' +
            '<s:Body>' +
            `<epos-print xmlns="${EPOS_NS}">` +
            this.parts.join('') +
            '</epos-print>' +
            '</s:Body>' +
            '</s:Envelope>'
        );
    }
}

export function buildBillEposXml(data: EscPosBillData): string {
    const b = new EposBuilder();
    // Sanitize money strings BEFORE column padding so "₹30.00" → "Rs.30.00" doesn't grow
    // the line by 2 chars after alignment (which wrapped amounts onto the next line).
    const m = (n: number) => sanitizePrintText(data.formatMoney(n));

    // Cash drawer kick (drawer is wired to the printer's DK port) — fire before printing.
    if (data.openDrawer) (b as any).parts.push(DRAWER_KICK_EPOS_XML);

    // Logo (centered, top) — ePOS-Print <image> with 1-bit raster base64.
    if (data.logoEpos) {
        (b as any).parts.push('<text align="center"/>');
        (b as any).parts.push(
            `<image width="${data.logoEpos.width}" height="${data.logoEpos.height}" color="color_1" mode="mono">${data.logoEpos.base64}</image>`,
        );
        (b as any).parts.push('<text align="left"/>');
    }

    // Header
    b.line(data.restaurantName, { align: 'center', bold: true, doubleW: false, doubleH: true });
    if (data.restaurantAddress) b.line(data.restaurantAddress, { align: 'center' });
    if (data.restaurantPhone) b.line('Ph: ' + data.restaurantPhone, { align: 'center' });
    if (data.gstNo) b.line('GSTIN: ' + data.gstNo, { align: 'center' });
    b.rule();

    // Order meta
    b.line(
        data.orderTypeLabel?.toUpperCase() + (data.tokenNumber ? ` - Token #${data.tokenNumber}` : ''),
        { align: 'center', bold: true },
    );
    b.line('Order No: ' + data.orderNumber);
    b.line('Date: ' + data.dateText);
    if (data.tableLabel) b.line('Table: ' + data.tableLabel);
    if (data.customerName) b.line('Customer: ' + data.customerName);
    b.rule();

    // Items header
    // Price sized so "Rs.130.00" (9 chars) still leaves a gap after the qty column.
    const W_NAME = 23, W_QTY = 4, W_PRICE = 10, W_AMT = CHARS_PER_LINE - W_NAME - W_QTY - W_PRICE;
    b.line(padR('Item', W_NAME) + padL('Qty', W_QTY) + padL('Price', W_PRICE) + padL('Amount', W_AMT), { bold: true });
    b.rule();

    for (const it of data.items as EscPosBillItem[]) {
        const name = sanitizePrintText(it.name || '');
        const qty = padL(String(it.quantity), W_QTY);
        const price = padL(m(it.price), W_PRICE);
        const amt = padL(m(it.total), W_AMT);
        if (name.length <= W_NAME) {
            b.line(padR(name, W_NAME) + qty + price + amt);
        } else {
            b.line(padR(name.slice(0, W_NAME), W_NAME) + qty + price + amt);
            let rest = name.slice(W_NAME);
            while (rest.length) {
                b.line(rest.slice(0, W_NAME));
                rest = rest.slice(W_NAME);
            }
        }
        // Spice level on its own line under the item name.
        if (it.spiceLevel) b.line('  Spice: ' + sanitizePrintText(it.spiceLevel));
        // Add-ons / modifiers printed indented under the item.
        for (const add of it.addOns || []) {
            if (add) b.line('  + ' + sanitizePrintText(String(add)).slice(0, W_NAME - 4));
        }
    }
    b.rule();

    // Totals
    b.leftRight('Subtotal:', m(data.subtotal));
    if (data.tax || data.processingFee) {
        if (data.tax) b.leftRight('Tax:', m(data.tax));
        if (data.processingFee) b.leftRight('Processing Fee:', m(data.processingFee));
    } else if (data.taxAndFees) {
        b.leftRight('Tax & Fees:', m(data.taxAndFees));
    }
    if (data.deliveryCharge) b.leftRight('Delivery:', m(data.deliveryCharge));
    if (data.serviceCharge) b.leftRight('Service Charge:', m(data.serviceCharge));
    if (data.discount) {
        const label = data.couponCode ? `Discount (${data.couponCode}):` : 'Discount:';
        b.leftRight(label, '-' + m(data.discount));
    }
    if (data.rewardDiscount) b.leftRight('Points Discount:', '-' + m(data.rewardDiscount));
    if (data.tip) b.leftRight('Tip:', m(data.tip));
    b.rule();
    b.leftRight('TOTAL', m(data.totalAmount), { bold: true, big: true });
    b.leftRight('Payment:', data.paymentMethodLabel + (data.paid ? ' (PAID)' : ' (PENDING)'), { bold: true });
    b.rule();

    // QR code (feedback / "Scan to Rate Us")
    if (data.qrUrl) {
        if (data.qrType?.toUpperCase() === 'CODE128') {
            b.barcode128(data.qrUrl);
        } else {
            b.qrCode(data.qrUrl);
        }
        b.line(data.qrCaption || 'Scan to Rate Us', { align: 'center' });
        b.rule();
    }

    // Footer
    b.line(data.footerLine || 'Thank you! Please visit again.', { align: 'center' });

    b.feedCut();
    return b.toXml();
}
