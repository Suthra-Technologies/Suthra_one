/**
 * Builds an ESC/POS byte payload for a restaurant bill, sized for an 80mm thermal printer.
 *
 * 80mm printers fit 48 characters per line at the default font (use 32 for 58mm — change CHARS_PER_LINE).
 * Output is a Uint8Array of raw ESC/POS commands ready to send over TCP:9100.
 */

import { DRAWER_KICK_ESCPOS } from './cashDrawer';

const CHARS_PER_LINE: number = 48; // 80mm. Use 32 for 58mm printers.

// ── ESC/POS control codes ──────────────────────────────────────────────
const ESC = 0x1b;
const GS = 0x1d;

const INIT = [ESC, 0x40]; // initialize printer
const ALIGN_LEFT = [ESC, 0x61, 0x00];
const ALIGN_CENTER = [ESC, 0x61, 0x01];
const ALIGN_RIGHT = [ESC, 0x61, 0x02];
const BOLD_ON = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];
const DOUBLE_ON = [GS, 0x21, 0x11]; // double width + height
const DOUBLE_OFF = [GS, 0x21, 0x00];
const DOUBLE_H = [GS, 0x21, 0x01]; // double height only (normal width)
const FEED = (n: number) => [ESC, 0x64, n]; // feed n lines
const CUT = [GS, 0x56, 0x42, 0x00]; // partial cut, feed before cut

export interface EscPosBillItem {
    name: string;
    quantity: number;
    price: number;
    total: number;
    /** Optional add-ons / modifiers printed under the item line. */
    addOns?: string[];
}

export interface EscPosBillData {
    restaurantName: string;
    restaurantAddress?: string;
    restaurantPhone?: string;
    gstNo?: string;
    orderNumber: string;
    dateText: string;
    orderTypeLabel: string;
    tableLabel?: string;
    tokenNumber?: string | number;
    customerName?: string;
    items: EscPosBillItem[];
    subtotal: number;
    /** Combined tax+fees (legacy single line). Prefer the itemized fields below. */
    taxAndFees?: number;
    tax?: number;
    processingFee?: number;
    deliveryCharge?: number;
    serviceCharge?: number;
    discount?: number;
    /** Coupon code shown beside the discount line, e.g. "Discount (SAVE10)". */
    couponCode?: string;
    rewardDiscount?: number;
    tip?: number;
    totalAmount: number;
    paymentMethodLabel: string;
    paid: boolean;
    /** Fire the cash-drawer kick with this bill (cash payments). */
    openDrawer?: boolean;
    footerLine?: string;
    /** Optional feedback URL — printed as a QR code ("Scan to Rate Us") at the bottom. */
    qrUrl?: string;
    qrCaption?: string;
    qrType?: string;
    /** Optional pre-rendered logo raster (ESC/POS GS v 0 bytes) printed at the very top. */
    logoEscposBytes?: Uint8Array;
    /** Optional pre-rendered logo for ePOS-Print <image> (1-bit raster base64 + dimensions). */
    logoEpos?: { base64: string; width: number; height: number };
    /** Currency formatter, e.g. (n) => `₹${n.toFixed(2)}`. Avoid the ₹ glyph — see formatMoney. */
    formatMoney: (n: number) => string;
}

class EscPosBuilder {
    private bytes: number[] = [];

    raw(arr: number[]): this {
        this.bytes.push(...arr);
        return this;
    }

    /** Append text. Replaces ₹ with "Rs." since most thermal printers lack the rupee glyph. */
    text(str: string): this {
        const safe = (str ?? '').replace(/₹/g, 'Rs.');
        for (let i = 0; i < safe.length; i++) {
            this.bytes.push(safe.charCodeAt(i) & 0xff);
        }
        return this;
    }

    line(str = ''): this {
        return this.text(str).raw([0x0a]);
    }

    /** Full-width dashed separator. */
    rule(): this {
        return this.line('-'.repeat(CHARS_PER_LINE));
    }

    /** Left text + right text padded to fill the line width. */
    leftRight(left: string, right: string): this {
        const space = CHARS_PER_LINE - left.length - right.length;
        if (space < 1) {
            // Too long — wrap right value onto its own right-aligned line.
            this.line(left);
            return this.line(' '.repeat(Math.max(0, CHARS_PER_LINE - right.length)) + right);
        }
        return this.line(left + ' '.repeat(space) + right);
    }

    /**
     * Print a QR code using the ESC/POS GS ( k commands (supported by Epson TM-m30III).
     * model 2, configurable module size, error-correction level M.
     */
    qrCode(content: string, moduleSize = 6): this {
        const data = content ?? '';
        // Function 165: select QR model 2
        this.raw([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
        // Function 167: module size (1–16)
        this.raw([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize & 0xff]);
        // Function 169: error correction level M (0x31)
        this.raw([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]);
        // Function 180: store the QR data. Length = dataLen + 3.
        const bytes: number[] = [];
        for (let i = 0; i < data.length; i++) bytes.push(data.charCodeAt(i) & 0xff);
        const len = bytes.length + 3;
        const pL = len & 0xff;
        const pH = (len >> 8) & 0xff;
        this.raw([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...bytes]);
        // Function 181: print the stored QR symbol
        this.raw([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);
        return this;
    }

    barcode128(content: string): this {
        const data = content ?? '';
        if (!data) return this;
        // height
        this.raw([GS, 0x68, 80]);
        // width
        this.raw([GS, 0x77, 3]);
        // HRI below
        this.raw([GS, 0x48, 2]);
        // HRI font B
        this.raw([GS, 0x66, 1]);
        
        const bytes: number[] = [];
        for (let i = 0; i < data.length; i++) bytes.push(data.charCodeAt(i) & 0xff);
        const len = bytes.length + 2;
        this.raw([GS, 0x6b, 0x49, len]);
        this.raw([123, 66]); // {B
        this.raw(bytes);
        return this;
    }

    build(): Uint8Array {
        return Uint8Array.from(this.bytes);
    }
}

export function buildBillEscPos(data: EscPosBillData): Uint8Array {
    const b = new EscPosBuilder();
    const m = data.formatMoney;

    b.raw(INIT);

    // ── Cash drawer kick (drawer is wired to the printer's DK port) ──
    if (data.openDrawer) b.raw(DRAWER_KICK_ESCPOS);

    // ── Logo (centered, top) ──
    if (data.logoEscposBytes && data.logoEscposBytes.length) {
        b.raw(ALIGN_CENTER).raw(Array.from(data.logoEscposBytes)).raw([0x0a]).raw(ALIGN_LEFT);
    }

    // ── Header ──
    b.raw(ALIGN_CENTER).raw(BOLD_ON).raw(DOUBLE_H).line(data.restaurantName).raw(DOUBLE_OFF).raw(BOLD_OFF);
    if (data.restaurantAddress) b.line(data.restaurantAddress);
    if (data.restaurantPhone) b.line('Ph: ' + data.restaurantPhone);
    if (data.gstNo) b.line('GSTIN: ' + data.gstNo);
    b.raw(ALIGN_LEFT).rule();

    // ── Order meta ──
    b.raw(ALIGN_CENTER).raw(BOLD_ON)
        .line(data.orderTypeLabel?.toUpperCase() + (data.tokenNumber ? ` - Token #${data.tokenNumber}` : ''))
        .raw(BOLD_OFF).raw(ALIGN_LEFT);
    b.line('Order No: ' + data.orderNumber);
    b.line('Date: ' + data.dateText);
    if (data.tableLabel) b.line('Table: ' + data.tableLabel);
    if (data.customerName) b.line('Customer: ' + data.customerName);
    b.rule();

    // ── Items header: Item | Qty | Price | Amount ──
    // Column widths sum to CHARS_PER_LINE (48): name 24, qty 4, price 9, amount 11.
    const W_NAME = CHARS_PER_LINE === 32 ? 14 : 24;
    const W_QTY = 4;
    const W_PRICE = CHARS_PER_LINE === 32 ? 6 : 9;
    const W_AMT = CHARS_PER_LINE - W_NAME - W_QTY - W_PRICE;

    const padR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s + ' '.repeat(w - s.length));
    const padL = (s: string, w: number) => (s.length > w ? s.slice(0, w) : ' '.repeat(w - s.length) + s);

    b.raw(BOLD_ON)
        .line(padR('Item', W_NAME) + padL('Qty', W_QTY) + padL('Price', W_PRICE) + padL('Amount', W_AMT))
        .raw(BOLD_OFF).rule();

    for (const it of data.items) {
        const name = it.name || '';
        const qty = padL(String(it.quantity), W_QTY);
        const price = padL(m(it.price), W_PRICE);
        const amt = padL(m(it.total), W_AMT);
        if (name.length <= W_NAME) {
            b.line(padR(name, W_NAME) + qty + price + amt);
        } else {
            // Long name: print numbers on first line, wrap the rest of the name below.
            b.line(padR(name.slice(0, W_NAME), W_NAME) + qty + price + amt);
            let rest = name.slice(W_NAME);
            while (rest.length) {
                b.line(rest.slice(0, W_NAME));
                rest = rest.slice(W_NAME);
            }
        }
        // Add-ons / modifiers printed indented under the item.
        for (const add of it.addOns || []) {
            if (add) b.line('  + ' + String(add).slice(0, W_NAME - 4));
        }
    }
    b.rule();

    // ── Totals ──
    b.leftRight('Subtotal:', m(data.subtotal));
    // Prefer itemized tax/fees; fall back to the legacy combined line.
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
    b.raw(BOLD_ON).raw(DOUBLE_ON).leftRight('TOTAL', m(data.totalAmount)).raw(DOUBLE_OFF).raw(BOLD_OFF);
    b.raw(BOLD_ON).leftRight('Payment:', data.paymentMethodLabel + (data.paid ? ' (PAID)' : ' (PENDING)')).raw(BOLD_OFF);
    b.rule();

    // ── QR code (feedback / "Scan to Rate Us") ──
    if (data.qrUrl) {
        b.raw(ALIGN_CENTER);
        if (data.qrType?.toUpperCase() === 'CODE128') {
            b.barcode128(data.qrUrl);
            b.line(''); // extra margin
        } else {
            b.qrCode(data.qrUrl);
        }
        b.line(data.qrCaption || 'Scan to Rate Us').raw(ALIGN_LEFT);
        b.rule();
    }

    // ── Footer ──
    b.raw(ALIGN_CENTER).line(data.footerLine || 'Thank you! Please visit again.').raw(ALIGN_LEFT);

    b.raw(FEED(4)).raw(CUT);
    return b.build();
}
