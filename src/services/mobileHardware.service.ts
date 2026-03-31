import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

export const MobileHardwareService = {
    // Capture image using camera
    async captureImage() {
        if (Capacitor.getPlatform() === 'web') {
            console.warn('Camera not natively supported in browser mode.');
            return null;
        }

        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: true,
                resultType: CameraResultType.Uri,
                source: CameraSource.Camera
            });

            return image;
        } catch (error) {
            console.error('Camera capture failed:', error);
            return null;
        }
    },

    // Scan QR/Barcode using MLKit
    async startScan() {
        if (Capacitor.getPlatform() === 'web') {
            alert('Scanning is only supported on Android/iOS devices.');
            return null;
        }

        try {
            // Check/request permissions
            const { camera } = await BarcodeScanner.requestPermissions();
            if (camera !== 'granted') {
                alert('Camera permission is required for scanning.');
                return null;
            }

            // Prepare UI
            document.querySelector('body')?.classList.add('scanner-active');

            // The MLKit version is highly customizable. 
            // This simple flow assumes a full-screen scan.
            const { barcodes } = await BarcodeScanner.scan({
                formats: [BarcodeFormat.QrCode, BarcodeFormat.Ean13],
            });

            // Cleanup UI
            document.querySelector('body')?.classList.remove('scanner-active');

            if (barcodes.length > 0) {
                return barcodes[0].rawValue;
            }
            return null;
        } catch (error) {
            console.error('Scan failed:', error);
            document.querySelector('body')?.classList.remove('scanner-active');
            return null;
        }
    },

    async isSupported() {
        const { supported } = await BarcodeScanner.isSupported();
        return supported;
    }
};
