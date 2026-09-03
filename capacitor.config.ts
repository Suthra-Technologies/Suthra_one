import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.nexzen.pos',
    appName: 'Suthra One',
    webDir: 'dist',
    server: {
        url: 'http://192.168.1.32:3000',
        cleartext: true,
        androidScheme: 'http',
    },

    plugins: {
        CapacitorHttp: {
            enabled: true,
        },
    },
};

export default config;
