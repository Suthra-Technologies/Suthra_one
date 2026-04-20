import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.nexzen.pos',
    appName: 'Nexzen POS',
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
