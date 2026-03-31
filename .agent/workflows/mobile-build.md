---
description: How to build and run the Restaurant POS Mobile App (Android/iOS)
---

# Mobile Build Workflow

We are using **Capacitor** for the mobile app. It is the modern successor to Cordova and offers better performance and easier integration with React/Vite.

### Native Features Integrated:
- **QR/Barcode Scanning**: Powered by Google ML Kit (High speed).
- **Camera Capture**: For uploading bills or profile photos.
- **Push Notifications**: For real-time order alerts.

## 1. Prerequisites
- **Android Studio** installed (for Android) or **Xcode** (for iOS/Mac).
- **Gradle** environment set up.

## 2. Prepare the Web Build
Every time you make changes to the code, you must build the web project first:
// turbo
```powershell
npm run build
```

## 3. Sync with Native Projects
After building, sync the changes to the Android/iOS folders:
// turbo
```powershell
npx cap sync
```

## 4. Run the App

### For Android
To open the project in Android Studio and build the APK:
// turbo
```powershell
npx cap open android
```
- In Android Studio, click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
- To run on a connected device/emulator: Click the **Run** (Play) button.

### Live Reload (Development Mode)
If you want to see changes instantly on your device during development:
1. Find your computer's local IP address (e.g., `192.168.1.XX`).
2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://192.168.1.XX:3000',
     cleartext: true
   }
   ```
3. Run the development server: `npm run start`
4. Run: `npx cap copy`

## 5. Environment Variables
Make sure your `.env` has a publicly accessible API URL (not `localhost`) when testing on a physical device.
Example for Dev Tunnel:
```env
VITE_API_URL=https://your-dev-tunnel-url.ms
```
