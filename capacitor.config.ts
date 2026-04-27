import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.nexzen.pos',
    appName: 'NexZen POS',
    webDir: 'dist',

    plugins: {
        CapacitorHttp: {
            enabled: true,
        },
    },
};

export default config;
