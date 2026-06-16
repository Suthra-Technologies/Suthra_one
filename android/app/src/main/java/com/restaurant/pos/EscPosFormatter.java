package com.restaurant.pos;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Builds ESC/POS bytes and ePOS-Print XML for KOT + bill from the backend's bill JSON
 * (orders/:id/bill shape). Java mirror of the TS escposBill / kotThermal / eposPrintBill builders,
 * used by the background PrintStationService where the WebView formatters aren't available.
 *
 * 80mm = 48 chars/line.
 */
public final class EscPosFormatter {
    private static final int W = 48;

    private static final byte ESC = 0x1b;
    private static final byte GS = 0x1d;

    private EscPosFormatter() {}

    // ── helpers ──────────────────────────────────────────────────────────
    private static String clean(String s) {
        if (s == null) return "";
        return s.replace("₹", "Rs.").replaceAll("[<>]", "").replaceAll("\\s{2,}", " ").trim();
    }

    private static String money(double n) {
        return "Rs." + String.format(Locale.US, "%.2f", n);
    }

    private static String padR(String s, int w) {
        if (s.length() > w) return s.substring(0, w);
        StringBuilder b = new StringBuilder(s);
        while (b.length() < w) b.append(' ');
        return b.toString();
    }

    private static String padL(String s, int w) {
        if (s.length() > w) return s.substring(0, w);
        StringBuilder b = new StringBuilder();
        while (b.length() < w - s.length()) b.append(' ');
        b.append(s);
        return b.toString();
    }

    private static double num(JSONObject o, String k) {
        return o == null ? 0 : o.optDouble(k, 0);
    }

    private static String orderTypeLabel(String t) {
        if (t == null) return "ORDER";
        return t.replace('_', ' ');
    }

    private static String fmtDate(String iso) {
        if (iso == null || iso.isEmpty()) return "";
        try {
            // Backend sends ISO; just show date+time best-effort.
            SimpleDateFormat in = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            in.setLenient(true);
            Date d = in.parse(iso.length() >= 19 ? iso.substring(0, 19) : iso);
            return new SimpleDateFormat("dd/MM/yyyy hh:mm a", Locale.US).format(d);
        } catch (Exception e) {
            return iso;
        }
    }

    private static String tableLabel(JSONObject bill) {
        JSONObject t = bill.optJSONObject("table");
        if (t == null) return null;
        for (String k : new String[]{"tableNumber", "number", "tableName", "name"}) {
            String v = t.optString(k, null);
            if (v != null && !v.isEmpty() && !"null".equals(v)) return v;
        }
        return null;
    }

    private static String customerName(JSONObject bill) {
        JSONObject c = bill.optJSONObject("customer");
        if (c == null) return null;
        String name = c.optString("name", null);
        if (name == null || name.isEmpty()) return null;
        if (name.matches("^[0-9a-fA-F]{8,24}$")) return null; // looks like an id
        return name;
    }

    // ── ESC/POS byte writer ───────────────────────────────────────────────
    private static class Esc {
        final ByteArrayOutputStream b = new ByteArrayOutputStream();
        Esc raw(int... bytes) { for (int x : bytes) b.write(x); return this; }
        Esc text(String s) {
            String safe = s == null ? "" : s.replace("₹", "Rs.");
            for (int i = 0; i < safe.length(); i++) b.write(safe.charAt(i) & 0xff);
            return this;
        }
        Esc line(String s) { return text(s).raw(0x0a); }
        Esc line() { return raw(0x0a); }
        Esc rule() { return line(repeat('-', W)); }
        Esc leftRight(String l, String r) {
            int space = W - l.length() - r.length();
            if (space < 1) { line(l); return line(padL(r, W)); }
            StringBuilder sb = new StringBuilder(l);
            for (int i = 0; i < space; i++) sb.append(' ');
            sb.append(r);
            return line(sb.toString());
        }
        byte[] bytes() { return b.toByteArray(); }
    }

    private static String repeat(char c, int n) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(c);
        return sb.toString();
    }

    private static final int[] INIT = {ESC, 0x40};
    private static final int[] AL = {ESC, 0x61, 0x00};
    private static final int[] AC = {ESC, 0x61, 0x01};
    private static final int[] BOLD_ON = {ESC, 0x45, 0x01};
    private static final int[] BOLD_OFF = {ESC, 0x45, 0x00};
    private static final int[] DBL_ON = {GS, 0x21, 0x11};
    private static final int[] DBL_OFF = {GS, 0x21, 0x00};
    private static final int[] CUT = {GS, 0x56, 0x42, 0x00};

    private static int[] feed(int n) { return new int[]{ESC, 0x64, n}; }

    private static void qr(Esc e, String content) {
        if (content == null || content.isEmpty()) return;
        int moduleSize = 6;
        e.raw(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
        e.raw(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize);
        e.raw(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
        int len = content.length() + 3;
        e.raw(GS, 0x28, 0x6b, len & 0xff, (len >> 8) & 0xff, 0x31, 0x50, 0x30);
        for (int i = 0; i < content.length(); i++) e.b.write(content.charAt(i) & 0xff);
        e.raw(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    }

    // ── BILL (ESC/POS) ─────────────────────────────────────────────────────
    public static byte[] buildBill(JSONObject bill) {
        Esc e = new Esc();
        JSONObject r = bill.optJSONObject("restaurant");
        e.raw(INIT);
        e.raw(AC).raw(BOLD_ON).raw(DBL_ON).line(r != null ? r.optString("name", "Restaurant") : "Restaurant").raw(DBL_OFF).raw(BOLD_OFF);
        if (r != null) {
            if (!r.optString("address", "").isEmpty()) e.line(r.optString("address"));
            if (!r.optString("phone", "").isEmpty()) e.line("Ph: " + r.optString("phone"));
            if (!r.optString("gstNo", "").isEmpty()) e.line("GSTIN: " + r.optString("gstNo"));
        }
        e.raw(AL).rule();

        String token = bill.has("dailyTokenNumber") && !bill.isNull("dailyTokenNumber") ? (" - Token #" + bill.optInt("dailyTokenNumber")) : "";
        e.raw(AC).raw(BOLD_ON).line(orderTypeLabel(bill.optString("orderType")).toUpperCase(Locale.US) + token).raw(BOLD_OFF).raw(AL);
        e.line("Order No: " + bill.optString("orderNumber", ""));
        e.line("Date: " + fmtDate(bill.optString("createdAt", bill.optString("date", ""))));
        String tbl = tableLabel(bill);
        if ("dine_in".equals(bill.optString("orderType")) && tbl != null) e.line("Table: " + tbl);
        String cust = customerName(bill);
        if (cust != null) e.line("Customer: " + cust);
        e.rule();

        int wName = 24, wQty = 4, wPrice = 9, wAmt = W - 24 - 4 - 9;
        e.raw(BOLD_ON).line(padR("Item", wName) + padL("Qty", wQty) + padL("Price", wPrice) + padL("Amount", wAmt)).raw(BOLD_OFF).rule();

        JSONArray items = bill.optJSONArray("items");
        if (items != null) {
            for (int i = 0; i < items.length(); i++) {
                JSONObject it = items.optJSONObject(i);
                if (it == null) continue;
                if ("cancelled".equals(it.optString("preparationStatus", ""))) continue;
                String name = clean(it.optString("name", it.optString("menuItem", "Item")));
                if (name.isEmpty()) name = "Item";
                int qty = it.optInt("quantity", 1);
                double price = it.optDouble("price", 0);
                double total = it.has("total") ? it.optDouble("total") : price * qty;
                if (name.length() <= wName) {
                    e.line(padR(name, wName) + padL(String.valueOf(qty), wQty) + padL(money(price), wPrice) + padL(money(total), wAmt));
                } else {
                    e.line(padR(name.substring(0, wName), wName) + padL(String.valueOf(qty), wQty) + padL(money(price), wPrice) + padL(money(total), wAmt));
                    e.line("  " + name.substring(wName));
                }
            }
        }
        e.rule();

        e.leftRight("Subtotal:", money(bill.optDouble("subtotal", 0)));
        JSONObject tax = bill.optJSONObject("tax");
        double taxAmt = (tax != null ? tax.optDouble("amount", 0) : 0) + bill.optDouble("processingFee", 0);
        if (taxAmt > 0) e.leftRight("Tax & Fees:", money(taxAmt));
        if (bill.optDouble("deliveryCharge", 0) > 0) e.leftRight("Delivery:", money(bill.optDouble("deliveryCharge")));
        JSONObject sc = bill.optJSONObject("serviceCharge");
        if (sc != null && sc.optDouble("amount", 0) > 0) e.leftRight("Service Charge:", money(sc.optDouble("amount")));
        e.rule();
        e.raw(BOLD_ON).raw(DBL_ON).leftRight("TOTAL", money(bill.optDouble("totalAmount", 0))).raw(DBL_OFF).raw(BOLD_OFF);
        boolean paid = "paid".equals(bill.optString("paymentStatus", ""));
        e.raw(BOLD_ON).leftRight("Payment:", bill.optString("paymentMethod", "").toUpperCase(Locale.US) + (paid ? " (PAID)" : " (PENDING)")).raw(BOLD_OFF);
        e.rule();

        // QR
        String slug = r != null ? r.optString("slug", "") : "";
        String id = bill.optString("_id", "");
        if (!slug.isEmpty() && !id.isEmpty()) {
            e.raw(AC);
            qr(e, "https://" + "nexzenpos.com" + "/" + slug + "/feedback/" + id);
            e.line("Scan to Rate Us").raw(AL).rule();
        }
        e.raw(AC).line("Thank you! Please visit again.").raw(AL);
        e.raw(feed(4)).raw(CUT);
        return e.bytes();
    }

    // ── KOT (ESC/POS) ──────────────────────────────────────────────────────
    public static byte[] buildKot(JSONObject bill) {
        Esc e = new Esc();
        e.raw(INIT);
        e.raw(AC).raw(BOLD_ON).raw(DBL_ON).line("** KITCHEN **").raw(DBL_OFF).raw(BOLD_OFF).raw(AL).rule();
        if (bill.has("dailyTokenNumber") && !bill.isNull("dailyTokenNumber")) {
            e.raw(BOLD_ON).raw(DBL_ON).line("Token #" + bill.optInt("dailyTokenNumber")).raw(DBL_OFF).raw(BOLD_OFF);
        }
        if (!bill.optString("orderNumber", "").isEmpty()) e.line("Order No: " + bill.optString("orderNumber"));
        e.line("Type: " + orderTypeLabel(bill.optString("orderType")).toUpperCase(Locale.US));
        String tbl = tableLabel(bill);
        if (tbl != null) e.line("Table: " + tbl);
        String cust = customerName(bill);
        if (cust != null) e.line("Customer: " + cust);
        e.rule();
        e.raw(BOLD_ON).line(padR("Item", W - 5) + padL("Qty", 5)).raw(BOLD_OFF).rule();
        JSONArray items = bill.optJSONArray("items");
        if (items != null) {
            for (int i = 0; i < items.length(); i++) {
                JSONObject it = items.optJSONObject(i);
                if (it == null || "cancelled".equals(it.optString("preparationStatus", ""))) continue;
                String name = clean(it.optString("name", "Item"));
                if (name.isEmpty()) name = "Item";
                String qty = padL(String.valueOf(it.optInt("quantity", 1)), 5);
                e.raw(BOLD_ON);
                if (name.length() <= W - 5) e.line(padR(name, W - 5) + qty);
                else { e.line(padR(name.substring(0, W - 5), W - 5) + qty); e.line("  " + name.substring(W - 5)); }
                e.raw(BOLD_OFF);
                String spice = clean(it.optString("spiceLevel", ""));
                if (!spice.isEmpty()) e.line("   Spice: " + spice);
                String notes = clean(it.optString("notes", ""));
                if (!notes.isEmpty()) e.line("   Note: " + notes);
            }
        }
        e.rule().raw(feed(4)).raw(CUT);
        return e.bytes();
    }

    // ── ePOS-Print XML variants ────────────────────────────────────────────
    private static String xmlEsc(String s) {
        if (s == null) return "";
        return s.replace("₹", "Rs.").replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
    }

    private static String eposEnvelope(String body) {
        return "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
                "<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\"><s:Body>" +
                "<epos-print xmlns=\"http://www.epson-pos.com/schemas/2011/03/epos-print\">" +
                body + "</epos-print></s:Body></s:Envelope>";
    }

    private static String t(String s) { return "<text>" + xmlEsc(s) + "&#10;</text>"; }

    public static String buildBillEpos(JSONObject bill) {
        StringBuilder p = new StringBuilder();
        JSONObject r = bill.optJSONObject("restaurant");
        p.append("<text align=\"center\"/><text em=\"true\" dw=\"true\" dh=\"true\"/>");
        p.append(t(r != null ? r.optString("name", "Restaurant") : "Restaurant"));
        p.append("<text dw=\"false\" dh=\"false\" em=\"false\"/>");
        if (r != null) {
            if (!r.optString("address", "").isEmpty()) p.append(t(r.optString("address")));
            if (!r.optString("phone", "").isEmpty()) p.append(t("Ph: " + r.optString("phone")));
            if (!r.optString("gstNo", "").isEmpty()) p.append(t("GSTIN: " + r.optString("gstNo")));
        }
        p.append("<text align=\"left\"/>").append(t(repeat('-', W)));
        String token = bill.has("dailyTokenNumber") && !bill.isNull("dailyTokenNumber") ? (" - Token #" + bill.optInt("dailyTokenNumber")) : "";
        p.append("<text align=\"center\" em=\"true\"/>").append(t(orderTypeLabel(bill.optString("orderType")).toUpperCase(Locale.US) + token)).append("<text align=\"left\" em=\"false\"/>");
        p.append(t("Order No: " + bill.optString("orderNumber", "")));
        p.append(t("Date: " + fmtDate(bill.optString("createdAt", ""))));
        String tbl = tableLabel(bill);
        if ("dine_in".equals(bill.optString("orderType")) && tbl != null) p.append(t("Table: " + tbl));
        String cust = customerName(bill);
        if (cust != null) p.append(t("Customer: " + cust));
        p.append(t(repeat('-', W)));
        int wName = 24, wQty = 4, wPrice = 9, wAmt = W - 24 - 4 - 9;
        p.append("<text em=\"true\"/>").append(t(padR("Item", wName) + padL("Qty", wQty) + padL("Price", wPrice) + padL("Amount", wAmt))).append("<text em=\"false\"/>").append(t(repeat('-', W)));
        JSONArray items = bill.optJSONArray("items");
        if (items != null) {
            for (int i = 0; i < items.length(); i++) {
                JSONObject it = items.optJSONObject(i);
                if (it == null || "cancelled".equals(it.optString("preparationStatus", ""))) continue;
                String name = clean(it.optString("name", "Item"));
                if (name.isEmpty()) name = "Item";
                int qty = it.optInt("quantity", 1);
                double price = it.optDouble("price", 0);
                double total = it.has("total") ? it.optDouble("total") : price * qty;
                if (name.length() <= wName) p.append(t(padR(name, wName) + padL(String.valueOf(qty), wQty) + padL(money(price), wPrice) + padL(money(total), wAmt)));
                else { p.append(t(padR(name.substring(0, wName), wName) + padL(String.valueOf(qty), wQty) + padL(money(price), wPrice) + padL(money(total), wAmt))); p.append(t("  " + name.substring(wName))); }
            }
        }
        p.append(t(repeat('-', W)));
        p.append(t(padR("Subtotal:", W - money(bill.optDouble("subtotal", 0)).length()) + money(bill.optDouble("subtotal", 0))));
        p.append(t(repeat('-', W)));
        boolean paid = "paid".equals(bill.optString("paymentStatus", ""));
        p.append("<text em=\"true\" dw=\"true\" dh=\"true\"/>");
        String totalStr = money(bill.optDouble("totalAmount", 0));
        p.append(t("TOTAL" + repeat(' ', Math.max(1, (W / 2) - 5 - totalStr.length())) + totalStr));
        p.append("<text dw=\"false\" dh=\"false\" em=\"false\"/>");
        p.append(t("Payment: " + bill.optString("paymentMethod", "").toUpperCase(Locale.US) + (paid ? " (PAID)" : " (PENDING)")));
        p.append(t(repeat('-', W)));
        String slug = r != null ? r.optString("slug", "") : "";
        String id = bill.optString("_id", "");
        if (!slug.isEmpty() && !id.isEmpty()) {
            p.append("<text align=\"center\"/>");
            p.append("<symbol type=\"qrcode_model_2\" level=\"level_m\" width=\"6\">")
                    .append(xmlEsc("https://nexzenpos.com/" + slug + "/feedback/" + id)).append("</symbol>");
            p.append(t("Scan to Rate Us")).append("<text align=\"left\"/>");
        }
        p.append("<text align=\"center\"/>").append(t("Thank you! Please visit again.")).append("<text align=\"left\"/>");
        p.append("<feed line=\"3\"/><cut type=\"feed\"/>");
        return eposEnvelope(p.toString());
    }

    public static String buildKotEpos(JSONObject bill) {
        StringBuilder p = new StringBuilder();
        p.append("<text align=\"center\"/><text em=\"true\" dw=\"true\" dh=\"true\"/>").append(t("** KITCHEN **")).append("<text dw=\"false\" dh=\"false\" em=\"false\"/><text align=\"left\"/>").append(t(repeat('-', W)));
        if (bill.has("dailyTokenNumber") && !bill.isNull("dailyTokenNumber")) {
            p.append("<text em=\"true\" dw=\"true\" dh=\"true\"/>").append(t("Token #" + bill.optInt("dailyTokenNumber"))).append("<text dw=\"false\" dh=\"false\" em=\"false\"/>");
        }
        if (!bill.optString("orderNumber", "").isEmpty()) p.append(t("Order No: " + bill.optString("orderNumber")));
        p.append(t("Type: " + orderTypeLabel(bill.optString("orderType")).toUpperCase(Locale.US)));
        String tbl = tableLabel(bill);
        if (tbl != null) p.append(t("Table: " + tbl));
        String cust = customerName(bill);
        if (cust != null) p.append(t("Customer: " + cust));
        p.append(t(repeat('-', W)));
        p.append("<text em=\"true\"/>").append(t(padR("Item", W - 5) + padL("Qty", 5))).append("<text em=\"false\"/>").append(t(repeat('-', W)));
        JSONArray items = bill.optJSONArray("items");
        if (items != null) {
            for (int i = 0; i < items.length(); i++) {
                JSONObject it = items.optJSONObject(i);
                if (it == null || "cancelled".equals(it.optString("preparationStatus", ""))) continue;
                String name = clean(it.optString("name", "Item"));
                if (name.isEmpty()) name = "Item";
                String qty = padL(String.valueOf(it.optInt("quantity", 1)), 5);
                p.append("<text em=\"true\"/>");
                if (name.length() <= W - 5) p.append(t(padR(name, W - 5) + qty));
                else { p.append(t(padR(name.substring(0, W - 5), W - 5) + qty)); p.append(t("  " + name.substring(W - 5))); }
                p.append("<text em=\"false\"/>");
                String spice = clean(it.optString("spiceLevel", ""));
                if (!spice.isEmpty()) p.append(t("   Spice: " + spice));
                String notes = clean(it.optString("notes", ""));
                if (!notes.isEmpty()) p.append(t("   Note: " + notes));
            }
        }
        p.append(t(repeat('-', W))).append("<feed line=\"3\"/><cut type=\"feed\"/>");
        return eposEnvelope(p.toString());
    }
}
