/**
 * Builds a Star Line Mode (StarPRNT) byte payload for a restaurant bill.
 *
 * Star printers (SP700/SP742, TSP series) default to Star Line Mode, NOT ESC/POS.
 * If your SP700 is in ESC/POS emulation, use buildBillEscPos() from escposBill.ts instead.
 *
 * Sized for a 76mm / 3-inch SP700 at the standard font = 42 characters per line.
 * Output is raw bytes ready to send over TCP:9100 (the SP700 LAN interface).
 */

const CHARS_PER_LINE = 42; // 76mm SP700, standard font. (48 for some fonts; 32 for 58mm.)

// ── Star Line Mode control codes ───────────────────────────────────────
const ESC = 0x1b;

const INIT = [ESC, 0x40]; // ESC @  initialize
const ALIGN_LEFT = [ESC, 0x1d, 0x61, 0x00]; // ESC GS a n
const ALIGN_CENTER = [ESC, 0x1d, 0x61, 0x01];
const ALIGN_RIGHT = [ESC, 0x1d, 0x61, 0x02];
const EMPHASIS_ON = [ESC, 0x45]; // ESC E  bold on
const EMPHASIS_OFF = [ESC, 0x46]; // ESC F  bold off
// Expanded (double width + height): ESC i n1 n2  (n1=height, n2=width; 1 = 2x)
const EXPAND_ON = [ESC, 0x69, 0x01, 0x01];
const EXPAND_OFF = [ESC, 0x69, 0x00, 0x00];
const LF = [0x0a];
// Star full cut with feed: ESC d 3  (feed + cut). SP700 impact models cut here.
const CUT = [ESC, 0x64, 0x03];

import type { EscPosBillData, EscPosBillItem } from './escposBill';
import { DRAWER_KICK_STAR } from './cashDrawer';

class StarBuilder {
    private bytes: number[] = [];

    raw(arr: number[]): this {
        this.bytes.push(...arr);
        return this;
    }

    text(str: string): this {
        const safe = (str ?? '').replace(/₹/g, 'Rs.');
        for (let i = 0; i < safe.length; i++) this.bytes.push(safe.charCodeAt(i) & 0xff);
        return this;
    }

    line(str = ''): this {
        return this.text(str).raw(LF);
    }

    rule(): this {
        return this.line('-'.repeat(CHARS_PER_LINE));
    }

    leftRight(left: string, right: string): this {
        const space = CHARS_PER_LINE - left.length - right.length;
        if (space < 1) {
            this.line(left);
            return this.line(' '.repeat(Math.max(0, CHARS_PER_LINE - right.length)) + right);
        }
        return this.line(left + ' '.repeat(space) + right);
    }

    build(): Uint8Array {
        return Uint8Array.from(this.bytes);
    }
}

export function buildBillStarLine(data: EscPosBillData): Uint8Array {
    const b = new StarBuilder();
    const m = data.formatMoney;

    b.raw(INIT);

    // Cash drawer kick (drawer is wired to the printer's DK port; BEL fires it on Star).
    if (data.openDrawer) b.raw(DRAWER_KICK_STAR);

    // Header
    b.raw(ALIGN_CENTER).raw(EMPHASIS_ON).raw(EXPAND_ON).line(data.restaurantName).raw(EXPAND_OFF).raw(EMPHASIS_OFF);
    if (data.restaurantAddress) b.line(data.restaurantAddress);
    if (data.restaurantPhone) b.line('Ph: ' + data.restaurantPhone);
    if (data.gstNo) b.line('GSTIN: ' + data.gstNo);
    b.raw(ALIGN_LEFT).rule();

    // Order meta
    b.raw(ALIGN_CENTER).raw(EMPHASIS_ON)
        .line(data.orderTypeLabel?.toUpperCase() + (data.tokenNumber ? ` - Token #${data.tokenNumber}` : ''))
        .raw(EMPHASIS_OFF).raw(ALIGN_LEFT);
    b.line('Order No: ' + data.orderNumber);
    b.line('Date: ' + data.dateText);
    if (data.tableLabel) b.line('Table: ' + data.tableLabel);
    if (data.customerName) b.line('Customer: ' + data.customerName);
    b.rule();

    // Items header: Item | Qty | Price | Amount (widths sum to 42)
    const W_NAME = 20;
    const W_QTY = 4;
    const W_PRICE = 8;
    const W_AMT = CHARS_PER_LINE - W_NAME - W_QTY - W_PRICE; // 10

    const padR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s + ' '.repeat(w - s.length));
    const padL = (s: string, w: number) => (s.length > w ? s.slice(0, w) : ' '.repeat(w - s.length) + s);

    b.raw(EMPHASIS_ON)
        .line(padR('Item', W_NAME) + padL('Qty', W_QTY) + padL('Price', W_PRICE) + padL('Amount', W_AMT))
        .raw(EMPHASIS_OFF).rule();

    for (const it of data.items as EscPosBillItem[]) {
        const name = it.name || '';
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
        // Add-ons / modifiers printed indented under the item.
        for (const add of it.addOns || []) {
            if (add) b.line('  + ' + String(add).slice(0, W_NAME - 4));
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
    b.raw(EMPHASIS_ON).raw(EXPAND_ON).leftRight('TOTAL', m(data.totalAmount)).raw(EXPAND_OFF).raw(EMPHASIS_OFF);
    b.raw(EMPHASIS_ON).leftRight('Payment:', data.paymentMethodLabel + (data.paid ? ' (PAID)' : ' (PENDING)')).raw(EMPHASIS_OFF);
    b.rule();

    // Footer
    b.raw(ALIGN_CENTER).line(data.footerLine || 'Thank you! Please visit again.').raw(ALIGN_LEFT);

    b.raw(LF).raw(LF).raw(LF).raw(CUT);
    return b.build();
}
