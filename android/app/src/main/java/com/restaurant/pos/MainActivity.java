package com.restaurant.pos;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ThermalPrintPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
