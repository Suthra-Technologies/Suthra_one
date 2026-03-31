import { PushNotifications } from '@capacitor/push-notifications';
import type { Token, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-hot-toast';

export const PushNotificationService = {
    async register() {
        if (Capacitor.getPlatform() === 'web') {
            console.log('Push notifications are not supported on web.');
            return;
        }

        // Request permission to use push notifications
        // iOS will prompt a user and return if they granted permission or not
        // Android will just grant without prompting
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            console.log('Push notification permission denied.');
            return;
        }

        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();

        // On success, we should be able to receive a token
        PushNotifications.addListener('registration', (token: Token) => {
            console.log('Push registration success, token: ' + token.value);
            // Here you would typically send the token to your server
            // TODO: Save token to user profile on backend
        });

        // Some issue with our setup and push will not work
        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on registration: ' + JSON.stringify(error));
        });

        // Show us the notification payload if the app is open on our device
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ' + JSON.stringify(notification));
            toast.success(notification.title || 'New Notification', {
                icon: '🔔',
            });
        });

        // Method called when an action is performed on the notification
        PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
            console.log('Push action performed: ' + JSON.stringify(notification));
        });
    },

    async unregister() {
        if (Capacitor.getPlatform() !== 'web') {
            await PushNotifications.removeAllListeners();
        }
    }
};
