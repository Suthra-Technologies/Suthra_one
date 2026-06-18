import { PushNotifications } from '@capacitor/push-notifications';
import type { Token, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-hot-toast';
import { usersAPI } from './api';
import { getTenantSlugFromHostname } from '../utils/tenant.utils';

let navigateFn: any = null;
let activeTenantSlug: string | undefined = undefined;

export const PushNotificationService = {
    async register(navigate?: any, tenantSlug?: string) {
        if (navigate) navigateFn = navigate;
        if (tenantSlug) activeTenantSlug = tenantSlug;

        if (Capacitor.getPlatform() === 'web') {
            console.log('Push notifications are not supported on web.');
            return;
        }

        // Request permission to use push notifications
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
        await PushNotifications.removeAllListeners();

        PushNotifications.addListener('registration', async (token: Token) => {
            console.log('Push registration success, token: ' + token.value);
            try {
                localStorage.setItem('fcm_token', token.value);
                await usersAPI.registerFcmToken(token.value);
                console.log('FCM token successfully registered on server');
            } catch (err) {
                console.error('Failed to register FCM token on server:', err);
            }
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
            
            try {
                const data = notification.notification.data;
                if (data && data.orderId) {
                    const orderId = data.orderId;
                    const type = data.type;
                    const hostnameSlug = getTenantSlugFromHostname();
                    
                    // Determine route path prefix (empty for subdomains, /slug for path-based routing)
                    const prefix = hostnameSlug ? '' : (activeTenantSlug ? `/${activeTenantSlug}` : '');
                    const activeRole = localStorage.getItem('activeRole')?.toLowerCase() || '';
                    const isStaff = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier', 'superadmin'].includes(activeRole);
                    
                    let targetPath = '';
                    
                    if (type === 'NEW_CATERING_ORDER' || type === 'CATERING_ORDER_STATUS_UPDATE' || type === 'CATERING_ORDER_UPDATE') {
                        if (isStaff) {
                            targetPath = `${prefix}/catering-admin`;
                        } else {
                            targetPath = `${prefix}/customer/catering/track/${orderId}`;
                        }
                    } else {
                        // Normal order
                        if (isStaff) {
                            targetPath = `${prefix}/orders?open=${orderId}`;
                        } else {
                            // Deep link to order tracking in customer portal
                            targetPath = `${prefix}/orders?open=${orderId}`;
                        }
                    }
                    
                    if (navigateFn && targetPath) {
                        console.log('Push Notification Deep Linking to:', targetPath);
                        setTimeout(() => {
                            navigateFn(targetPath);
                        }, 300);
                    }
                }
            } catch (err) {
                console.error('Error in pushNotificationActionPerformed routing:', err);
            }
        });
    },

    async unregister() {
        if (Capacitor.getPlatform() !== 'web') {
            try {
                const token = localStorage.getItem('fcm_token');
                if (token) {
                    await usersAPI.unregisterFcmToken(token);
                    localStorage.removeItem('fcm_token');
                    console.log('FCM token successfully removed from server');
                }
            } catch (err) {
                console.error('Failed to unregister FCM token from server:', err);
            }
            await PushNotifications.removeAllListeners();
        }
    }
};
