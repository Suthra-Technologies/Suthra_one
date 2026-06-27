package com.restaurant.pos;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.os.Build;
import android.util.Base64;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Sends raw ESC/POS bytes to a Wi-Fi / LAN thermal printer over TCP (default port 9100).
 *
 * JS side calls:
 *   ThermalPrint.print({ ip: "192.168.1.50", port: 9100, dataBase64: "<base64 ESC/POS bytes>" })
 *
 * Returns { success: true } or rejects with an error message. Runs the socket work on a
 * background thread so it never blocks the WebView / UI.
 */
@CapacitorPlugin(name = "ThermalPrint")
public class ThermalPrintPlugin extends Plugin {

    @PluginMethod
    public void print(final PluginCall call) {
        final String ip = call.getString("ip");
        final int port = call.getInt("port", 9100);
        final String dataBase64 = call.getString("dataBase64");

        if (ip == null || ip.trim().isEmpty()) {
            call.reject("Printer IP is required");
            return;
        }
        if (dataBase64 == null || dataBase64.isEmpty()) {
            call.reject("No print data provided");
            return;
        }

        new Thread(new Runnable() {
            @Override
            public void run() {
                Socket socket = null;
                try {
                    byte[] payload = Base64.decode(dataBase64, Base64.DEFAULT);

                    socket = new Socket();
                    // 4s to connect, 4s read/write timeout — fail fast if printer is off/offline.
                    socket.connect(new InetSocketAddress(ip.trim(), port), 4000);
                    socket.setSoTimeout(4000);

                    OutputStream out = socket.getOutputStream();
                    out.write(payload);
                    out.flush();

                    // Give the printer a moment to drain the buffer before we close.
                    try { Thread.sleep(120); } catch (InterruptedException ignored) {}

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("Print failed: " + e.getMessage(), e);
                } finally {
                    if (socket != null) {
                        try { socket.close(); } catch (Exception ignored) {}
                    }
                }
            }
        }).start();
    }

    /**
     * Prints via Epson ePOS-Print: HTTP POST of ePOS-Print XML to the printer's service.cgi.
     * This is the TM-m30III's native network protocol and works even when raw port 9100 is disabled.
     *
     * JS side calls:
     *   ThermalPrint.eposPrint({ url: "http://192.168.1.56/cgi-bin/epos/service.cgi?devid=local_printer", xml: "<...>" })
     *
     * The printer replies with an ePOS-Print response XML containing success="true"/"false";
     * we parse that so the caller gets a real result instead of a silent drop.
     */
    @PluginMethod
    public void eposPrint(final PluginCall call) {
        final String url = call.getString("url");
        final String xml = call.getString("xml");

        if (url == null || url.trim().isEmpty()) {
            call.reject("ePOS-Print URL is required");
            return;
        }
        if (xml == null || xml.isEmpty()) {
            call.reject("No print XML provided");
            return;
        }

        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection conn = null;
                try {
                    URL target = new URL(url.trim());
                    conn = (HttpURLConnection) target.openConnection();
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(6000);
                    conn.setRequestMethod("POST");
                    conn.setDoOutput(true);
                    // ePOS-Print requires this exact content type and SOAPAction.
                    conn.setRequestProperty("Content-Type", "text/xml; charset=utf-8");
                    conn.setRequestProperty("SOAPAction", "\"\"");

                    byte[] body = xml.getBytes(StandardCharsets.UTF_8);
                    OutputStream os = conn.getOutputStream();
                    os.write(body);
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    InputStream is = (code >= 200 && code < 400) ? conn.getInputStream() : conn.getErrorStream();
                    StringBuilder resp = new StringBuilder();
                    if (is != null) {
                        BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                        String line;
                        while ((line = reader.readLine()) != null) resp.append(line);
                        reader.close();
                    }
                    String responseXml = resp.toString();

                    if (code != 200) {
                        call.reject("Printer HTTP " + code + ": " + responseXml);
                        return;
                    }
                    // ePOS-Print response: <response success="true" code="" status="..." />
                    boolean ok = responseXml.contains("success=\"true\"") || responseXml.contains("success='true'");
                    if (!ok) {
                        call.reject("Printer reported failure: " + responseXml);
                        return;
                    }

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("response", responseXml);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("ePOS print failed: " + e.getMessage(), e);
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }
        }).start();
    }

    /** Start the background print station foreground service with the given config. */
    @PluginMethod
    public void startPrintStation(PluginCall call) {
        try {
            android.content.Intent i = new android.content.Intent(getContext(), PrintStationService.class);
            i.putExtra("jwt", call.getString("jwt"));
            i.putExtra("apiBase", call.getString("apiBase"));
            i.putExtra("printerIp", call.getString("printerIp"));
            i.putExtra("printerPort", call.getInt("printerPort", 9100));
            i.putExtra("commandMode", call.getString("commandMode", "epos-print"));
            i.putExtra("devId", call.getString("devId", "local_printer"));
            i.putExtra("kotOnly", call.getBoolean("kotOnly", false));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(i);
            } else {
                getContext().startService(i);
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to start print station: " + e.getMessage(), e);
        }
    }

    /** Stop the background print station service. */
    @PluginMethod
    public void stopPrintStation(PluginCall call) {
        try {
            android.content.Intent i = new android.content.Intent(getContext(), PrintStationService.class);
            i.setAction("STOP");
            getContext().startService(i);
            getContext().stopService(new android.content.Intent(getContext(), PrintStationService.class));
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop print station: " + e.getMessage(), e);
        }
    }
}
