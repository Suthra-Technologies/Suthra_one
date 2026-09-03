package com.restaurant.pos;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Foreground service that runs as the restaurant "print station":
 * polls the backend for new (not-yet-auto-printed) orders and prints KOT + bill to the
 * Wi-Fi thermal printer — even when the app is backgrounded or the screen is off.
 *
 * Started/stopped from JS via ThermalPrintPlugin.startPrintStation / stopPrintStation, which
 * passes the JWT, API base URL, and printer config as extras.
 */
public class PrintStationService extends Service {
    private static final String TAG = "PrintStation";
    private static final String CHANNEL_ID = "print_station";
    private static final int NOTIF_ID = 4711;
    private static final long POLL_INTERVAL_MS = 7000;

    private final AtomicBoolean running = new AtomicBoolean(false);
    private Thread worker;

    // Config (from intent extras)
    private String jwt;
    private String apiBase;     // e.g. https://atlantafence.net
    private String printerIp;
    private int printerPort = 9100;
    private String commandMode; // epos-print | escpos | star-line
    private String devId = "local_printer";
    private boolean kotOnly = false; // when true: skip bill, print KOT only

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            if ("STOP".equals(intent.getAction())) {
                stopSelf();
                return START_NOT_STICKY;
            }
            jwt = intent.getStringExtra("jwt");
            apiBase = stripTrailingSlash(intent.getStringExtra("apiBase"));
            printerIp = intent.getStringExtra("printerIp");
            printerPort = intent.getIntExtra("printerPort", 9100);
            commandMode = intent.getStringExtra("commandMode");
            if (intent.getStringExtra("devId") != null) devId = intent.getStringExtra("devId");
            kotOnly = intent.getBooleanExtra("kotOnly", false);
            // Persist config so the sticky-restart picks it up without JS re-sending intent.
            android.content.SharedPreferences prefs =
                getSharedPreferences("print_station", android.content.Context.MODE_PRIVATE);
            prefs.edit()
                .putString("jwt", jwt)
                .putString("apiBase", apiBase)
                .putString("printerIp", printerIp)
                .putInt("printerPort", printerPort)
                .putString("commandMode", commandMode)
                .putString("devId", devId)
                .putBoolean("kotOnly", kotOnly)
                .apply();
        }

        startForeground(NOTIF_ID, buildNotification("Print station running"));

        if (running.compareAndSet(false, true)) {
            worker = new Thread(this::pollLoop, "print-station-poll");
            worker.start();
        }
        // STICKY: Android restarts the service if killed, keeping the station alive.
        return START_STICKY;
    }

    private void pollLoop() {
        Log.i(TAG, "Print station started. Polling " + apiBase + " printer=" + printerIp + ":" + printerPort + " mode=" + commandMode);
        while (running.get()) {
            try {
                if (apiBase != null && jwt != null && printerIp != null) {
                    JSONArray queue = fetchPrintQueue();
                    if (queue != null) {
                        for (int i = 0; i < queue.length() && running.get(); i++) {
                            JSONObject entry = queue.optJSONObject(i);
                            if (entry == null) continue;
                            String orderId = entry.optString("_id", null);
                            JSONObject bill = entry.optJSONObject("bill");
                            String stage = entry.optString("stage", "both"); // kot | bill | both
                            if (orderId == null || bill == null) continue;
                            // Ensure the bill has a usable date: fall back to the entry's createdAt.
                            if (bill.optString("date", "").isEmpty() && bill.optString("createdAt", "").isEmpty()) {
                                String entryDate = entry.optString("createdAt", "");
                                if (!entryDate.isEmpty()) {
                                    try { bill.put("date", entryDate); } catch (Exception ignored) {}
                                }
                            }
                            try {
                                // Atomically claim the order — the in-app auto-print (or another
                                // device) may be printing it right now. Losing the claim means
                                // someone else has it; skip to avoid duplicate tickets.
                                if (!claimPrint(orderId)) {
                                    Log.i(TAG, "Order " + orderId + " claimed by another device — skipping");
                                    continue;
                                }
                                printOrder(bill, stage);
                                markPrinted(orderId, stage);
                                Log.i(TAG, "Printed order " + orderId + " stage=" + stage);
                            } catch (Exception e) {
                                Log.e(TAG, "Failed to print order " + orderId + ": " + e.getMessage());
                                // Leave it unmarked so it retries next poll.
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Poll error: " + e.getMessage());
            }
            try { Thread.sleep(POLL_INTERVAL_MS); } catch (InterruptedException ignored) { }
        }
        Log.i(TAG, "Print station stopped.");
    }

    // ── Networking ──────────────────────────────────────────────────────
    private JSONArray fetchPrintQueue() throws Exception {
        URL url = new URL(apiBase + "/api/orders/station/print-queue?lookbackMinutes=30");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        try {
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(8000);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + jwt);
            conn.setRequestProperty("Accept", "application/json");
            int code = conn.getResponseCode();
            String body = readBody(conn, code);
            if (code != 200) {
                Log.w(TAG, "print-queue HTTP " + code + ": " + body);
                return null;
            }
            return new JSONArray(body);
        } finally {
            conn.disconnect();
        }
    }

    /**
     * Atomically claims the order for printing. Returns true if this device won the
     * claim. On HTTP/network failure returns true (print anyway) — a missed dedupe
     * beats a missed ticket, and the queue query already filters claimed orders.
     */
    private boolean claimPrint(String orderId) {
        try {
            URL url = new URL(apiBase + "/api/orders/station/" + orderId + "/claim-print");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            try {
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(6000);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Authorization", "Bearer " + jwt);
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.getOutputStream().write("{}".getBytes(StandardCharsets.UTF_8));
                int code = conn.getResponseCode();
                String body = readBody(conn, code);
                if (code != 200 && code != 201) {
                    Log.w(TAG, "claim-print HTTP " + code + ": " + body);
                    return true;
                }
                JSONObject res = new JSONObject(body);
                return res.optBoolean("claimed", true);
            } finally {
                conn.disconnect();
            }
        } catch (Exception e) {
            Log.w(TAG, "claim-print failed (" + e.getMessage() + ") — printing anyway");
            return true;
        }
    }

    private void markPrinted(String orderId, String stage) throws Exception {
        URL url = new URL(apiBase + "/api/orders/station/" + orderId + "/mark-printed");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        try {
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(6000);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Authorization", "Bearer " + jwt);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.getOutputStream().write(("{\"stage\":\"" + stage + "\"}").getBytes(StandardCharsets.UTF_8));
            int code = conn.getResponseCode();
            readBody(conn, code);
        } finally {
            conn.disconnect();
        }
    }

    private String readBody(HttpURLConnection conn, int code) throws Exception {
        InputStream is = (code >= 200 && code < 400) ? conn.getInputStream() : conn.getErrorStream();
        if (is == null) return "";
        BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = r.readLine()) != null) sb.append(line);
        r.close();
        return sb.toString();
    }

    // ── Printing ────────────────────────────────────────────────────────
    private void printOrder(JSONObject bill, String stage) throws Exception {
        boolean doKot = "kot".equals(stage) || "both".equals(stage);
        // If kotOnly mode is active, never print the bill regardless of stage.
        boolean doBill = !kotOnly && ("bill".equals(stage) || "both".equals(stage));
        boolean epos = "epos-print".equals(commandMode);
        if (doKot) {
            if (epos) sendEpos(EscPosFormatter.buildKotEpos(bill));
            else sendRaw(EscPosFormatter.buildKot(bill));
        }
        if (doBill) {
            if (epos) sendEpos(EscPosFormatter.buildBillEpos(bill));
            else sendRaw(EscPosFormatter.buildBill(bill));
        }
    }

    private void sendRaw(byte[] payload) throws Exception {
        Socket socket = new Socket();
        try {
            socket.connect(new InetSocketAddress(printerIp, printerPort), 4000);
            socket.setSoTimeout(4000);
            OutputStream out = socket.getOutputStream();
            out.write(payload);
            out.flush();
            try { Thread.sleep(150); } catch (InterruptedException ignored) { }
        } finally {
            try { socket.close(); } catch (Exception ignored) { }
        }
    }

    private void sendEpos(String xml) throws Exception {
        URL url = new URL("http://" + printerIp + "/cgi-bin/epos/service.cgi?devid=" + devId + "&timeout=10000");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        try {
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(6000);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "text/xml; charset=utf-8");
            conn.setRequestProperty("SOAPAction", "\"\"");
            conn.setDoOutput(true);
            conn.getOutputStream().write(xml.getBytes(StandardCharsets.UTF_8));
            int code = conn.getResponseCode();
            String resp = readBody(conn, code);
            if (code != 200 || !(resp.contains("success=\"true\"") || resp.contains("success='true'"))) {
                throw new Exception("ePOS failed HTTP " + code + ": " + resp);
            }
        } finally {
            conn.disconnect();
        }
    }

    // ── Notification / lifecycle ────────────────────────────────────────
    private Notification buildNotification(String text) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Print Station", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Keeps the auto-bill printer running");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Suthra One Print Station")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_send)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    @Override
    public void onDestroy() {
        running.set(false);
        if (worker != null) worker.interrupt();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private static String stripTrailingSlash(String s) {
        if (s == null) return null;
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }
}
