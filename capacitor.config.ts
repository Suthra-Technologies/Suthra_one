import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.nexzen.pos',
    appName: 'NexZen POS',
    webDir: 'dist',
    // server: {
    //     url: "http://192.168.1.9:3000",
    //     cleartext: true
    // },
    plugins: {
        CapacitorHttp: {
            enabled: true,
        },
    },
};

export default config;
