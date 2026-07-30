import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.nexzen.pos',
    appName: 'NexZen POS',
    webDir: 'dist',
    server: {
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
