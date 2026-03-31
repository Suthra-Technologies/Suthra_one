import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.restaurant.pos',
    appName: 'Nexzen Restaurant POS',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        cleartext: true
    },
    plugins: {
        CapacitorHttp: {
            enabled: true,
        },
    },
};

export default config;
