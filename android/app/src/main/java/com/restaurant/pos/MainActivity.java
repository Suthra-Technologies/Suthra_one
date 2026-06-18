package com.restaurant.pos;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the thermal-print Capacitor plugin BEFORE the bridge initializes
        // so isPluginAvailable('ThermalPrint') and Wi-Fi printing work in the app.
        registerPlugin(ThermalPrintPlugin.class);
        super.onCreate(savedInstanceState);

        try {
            FirebaseApp.getInstance();
        } catch (IllegalStateException e) {
            // Firebase is not initialized (likely because google-services.json is missing).
            // Initialize with dummy options to prevent crashes on register() calls.
            FirebaseOptions options = new FirebaseOptions.Builder()
                .setApplicationId("1:1234567890:android:abcdef")
                .setApiKey("dummy_api_key_to_prevent_crash")
                .setProjectId("dummy-project")
                .build();
            FirebaseApp.initializeApp(this, options);
        }
    }
}
