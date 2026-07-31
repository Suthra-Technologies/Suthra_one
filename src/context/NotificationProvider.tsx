import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { socketService } from '../services/socket.service';
import { useAuth } from './AuthContext';
import { toast as realToast } from 'react-hot-toast';
import { Box, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon, Restaurant as RestaurantIcon, EventSeat as BookIcon, SupportAgent as SupportIcon } from '@mui/icons-material';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { getSoundSrc, getSoundConfig, preloadNativeSounds } from '../utils/notificationSounds';

const checkNotificationPerm = async () => {
    let isAllowed = true;
    if (Capacitor.isNativePlatform()) {
        try {
            const pushPerm = await PushNotifications.checkPermissions();
            if (pushPerm.receive === 'denied' || pushPerm.receive === 'prompt') {
                isAllowed = false;
            }
        } catch(e) {}
        try {
            const localPerm = await LocalNotifications.checkPermissions();
            if (localPerm.display === 'denied' || localPerm.display === 'prompt') {
                isAllowed = false;
            }
        } catch(e) {}
    } else if ('Notification' in window) {
        if (Notification.permission === 'denied') isAllowed = false;
    }
    return isAllowed;
};

const toast = {
    custom: async (jsx: Parameters<typeof realToast.custom>[0], opts?: Parameters<typeof realToast.custom>[1]) => { if (await checkNotificationPerm()) realToast.custom(jsx, opts); },
    success: async (msg: Parameters<typeof realToast.success>[0], opts?: Parameters<typeof realToast.success>[1]) => { if (await checkNotificationPerm()) realToast.success(msg, opts); },
    error: async (msg: Parameters<typeof realToast.error>[0], opts?: Parameters<typeof realToast.error>[1]) => { if (await checkNotificationPerm()) realToast.error(msg, opts); },
    dismiss: (id?: any) => realToast.dismiss(id)
};
import { NativeAudio } from '@capacitor-community/native-audio';
import { useSettings } from './SettingsContext';
import { autoPrintOrder } from '../utils/autoPrintOrder';
import { tenantAPI } from '../services/api';

interface Notification {
    id: number | string;
    timestamp: Date | string;
    read: boolean;
    type: string;
    title: string;
    message: string;
    priority: string;
    data?: any;
    targetRoles?: string[];
}

// Stable id so refreshing/re-injecting replaces the existing subscription
// notification instead of stacking duplicates.
const SUBSCRIPTION_NOTIFICATION_ID = 'subscription-status';
// Start warning when the subscription/trial has this many whole days left.
const SUBSCRIPTION_WARNING_DAYS = 3;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Builds a subscription warning notification from the tenant record, or null
 * when nothing needs surfacing (healthy subscription with plenty of time left).
 * Warns when a trial/subscription expires within SUBSCRIPTION_WARNING_DAYS, and
 * flags an expired subscription outright.
 */
const buildSubscriptionNotification = (tenant: any): Notification | null => {
    if (!tenant) return null;

    const status = tenant.subscriptionStatus;
    const endDate = status === 'trial' ? tenant.trialEndsAt : tenant.subscriptionEndsAt;
    const daysRemaining = endDate
        ? Math.ceil((new Date(endDate).getTime() - Date.now()) / MS_PER_DAY)
        : null;

    const isTrial = status === 'trial';
    const label = isTrial ? 'free trial' : 'subscription';

    // Already expired (either flagged by the backend, or the end date has passed).
    const isExpired =
        status === 'expired' ||
        status === 'cancelled' ||
        (daysRemaining !== null && daysRemaining <= 0 && (status === 'trial' || status === 'active'));

    let title: string;
    let message: string;

    if (isExpired) {
        title = isTrial ? 'Free trial ended' : 'Subscription expired';
        message = `Your ${label} has ended. Please renew to keep using the system without interruption.`;
    } else if (daysRemaining !== null && daysRemaining <= SUBSCRIPTION_WARNING_DAYS) {
        const dayWord = daysRemaining === 1 ? 'day' : 'days';
        title = isTrial ? 'Free trial ending soon' : 'Subscription expiring soon';
        message = `Your ${label} expires in ${daysRemaining} ${dayWord}. Renew now to avoid any interruption.`;
    } else {
        // Healthy subscription with time to spare — nothing to surface.
        return null;
    }

    return {
        id: SUBSCRIPTION_NOTIFICATION_ID,
        timestamp: new Date(),
        read: false,
        type: isExpired ? 'error' : 'warning',
        title,
        message,
        priority: 'high',
        data: { subscription: true, subscriptionStatus: status, daysRemaining, expiresAt: endDate },
        targetRoles: ['admin', 'manager'],
    };
};

interface AutoCloseRequest {
    orders: any[];
    count: number;
    closeTime: string;
}

interface NotificationContextType {
    notifications: Notification[];
    clearNotifications: () => void;
    markAsRead: (id: string | number) => void;
    markAllAsRead: () => void;
    testNotification: () => void;
    deliveryLocations: Record<string, { lat: number, lng: number, timestamp: Date }>;
    trackOrder: (orderId: string, lat: number, lng: number) => void;
    autoCloseRequest: AutoCloseRequest | null;
    dismissAutoCloseRequest: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    clearNotifications: () => { },
    markAsRead: () => { },
    markAllAsRead: () => { },
    testNotification: () => { },
    deliveryLocations: {},
    trackOrder: () => { },
    autoCloseRequest: null,
    dismissAutoCloseRequest: () => { },
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { settings, formatCurrency } = useSettings();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [autoCloseRequest, setAutoCloseRequest] = useState<AutoCloseRequest | null>(null);

    const soundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const manualLoopRef   = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioRef        = useRef<HTMLAudioElement | null>(null);

    // Hold latest printer settings + currency in a ref so socket handlers read fresh
    // values WITHOUT being recreated (recreating would tear down the socket & miss orders).
    const printCtxRef = useRef({ printer: settings.printer, autoPrint: settings.system?.autoPrint, formatCurrency });
    useEffect(() => {
        printCtxRef.current = { printer: settings.printer, autoPrint: settings.system?.autoPrint, formatCurrency };
    }, [settings.printer, settings.system?.autoPrint, formatCurrency]);

    const playNotificationSound = useCallback(async () => {
        // Check if user has explicitly denied OS notifications
        let isAllowed = true;
        if (Capacitor.isNativePlatform()) {
            try {
                const perm = await LocalNotifications.checkPermissions();
                if (perm.display !== 'granted') isAllowed = false;
            } catch(e) {}
        } else if ('Notification' in window) {
            if (Notification.permission === 'denied') isAllowed = false;
        }

        if (!isAllowed) {
            console.log('🔕 [NotificationProvider] OS Notifications denied. Skipping sound.');
            return;
        }

        // Dispatch an event so the Dashboard (and other views) can instantly refresh live data
        window.dispatchEvent(new CustomEvent('dashboardRefetch'));

        // Stop and discard any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (soundTimeoutRef.current) {
            clearTimeout(soundTimeoutRef.current);
        }
        if (manualLoopRef.current) {
            clearInterval(manualLoopRef.current);
            manualLoopRef.current = null;
        }

        // Read admin-selected sound from global settings, fallback to localStorage/default
        const selectedId  = settings?.notification?.sound || localStorage.getItem('notificationSoundId') || 'notification';
        const selectedSrc = getSoundSrc(selectedId);
        const durationMs = (settings?.notification?.soundDuration || 6) * 1000;

        // --- WEB BROWSER AUDIO PLAYER (Used on Native too) ---
        const audio       = new Audio(selectedSrc);
        audio.volume      = 0.6;
        audio.loop        = true;            // loop so it fills the full duration
        audioRef.current  = audio;

        audio.play()
            .then(() => console.log('🔔 [NotificationProvider] Audio playing successfully'))
            .catch(err => {
            console.warn('🔔 [NotificationProvider] Audio auto-play blocked in dev mode. Tap screen to allow. Error:', err.message);
        });

        // Auto-stop after the configured duration
        soundTimeoutRef.current = setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.loop        = false;
        }, durationMs);
    }, [settings?.notification?.sound, settings?.notification?.soundDuration]);

    const showNotification = useCallback(async (title: string, body: string, soundId?: string) => {
        console.log('🔔 [NotificationProvider] Requesting to show notification:', title);

        const finalSoundId = soundId || settings?.notification?.sound || localStorage.getItem('notificationSoundId') || 'notification';

        // NATIVE MOBILE NOTIFICATION
        if (Capacitor.isNativePlatform()) {
            try {
                const permStatus = await LocalNotifications.checkPermissions();
                if (permStatus.display !== 'granted') {
                    console.log('🔔 [NotificationProvider] OS Notification permission denied. Skipping native banner.');
                    return;
                }

                await LocalNotifications.schedule({
                    notifications: [
                        {
                            title: title,
                            body: body,
                            id: Math.floor(Math.random() * 2147483647), // Must be 32-bit int
                            schedule: { at: new Date(Date.now() + 100) },
                            channelId: 'orders_v4_silent', // Silent OS banner, because HTML5 audio handles the sound!
                            smallIcon: 'ic_stat_icon_config_sample',
                            actionTypeId: '',
                            extra: null
                        }
                    ]
                });
            } catch (e) {
                console.error('🔔 [NotificationProvider] Failed to schedule native notification:', e);
            }
            return;
        }

        // WEB BROWSER NOTIFICATION
        if (!('Notification' in window)) {
            console.log('🔔 [NotificationProvider] This browser does not support desktop notifications');
            return;
        }

        if (Notification.permission === 'granted') {
            try {
                // Pass silent: true so the browser/OS doesn't play a default ping sound,
                // since we are already playing the custom sound via HTML5 Audio.
                new Notification(title, { body, icon: '/logo.png', silent: true });
            } catch (e) {
                console.error('🔔 [NotificationProvider] Failed to show OS notification:', e);
            }
        }
    }, []);

    const getOrderNotificationDetails = useCallback((payload: any) => {
        const sourceOrder = payload?.order || payload || {};

        const rawOrderId =
            sourceOrder.orderNumber ??
            sourceOrder.orderId ??
            sourceOrder.order_id ??
            payload?.orderNumber ??
            payload?.orderId ??
            payload?.order_id;

        const orderIdString = String(rawOrderId ?? '');
        const displayOrderId = orderIdString
            ? (orderIdString.includes('-') ? orderIdString.split('-').pop() : orderIdString)
            : '--';

        const rawToken =
            sourceOrder.dailyTokenNumber ??
            sourceOrder.tokenNumber ??
            sourceOrder.tokenNo ??
            sourceOrder.token_no ??
            sourceOrder.token ??
            payload?.dailyTokenNumber ??
            payload?.tokenNumber ??
            payload?.tokenNo ??
            payload?.token_no ??
            payload?.token;

        const tokenDigits = rawToken === null || rawToken === undefined ? '' : String(rawToken).replace(/\D/g, '');
        const displayTokenNo = tokenDigits || '--';

        const rawOrderType =
            sourceOrder.orderType ??
            sourceOrder.type ??
            sourceOrder.order_type ??
            payload?.orderType ??
            payload?.type ??
            payload?.order_type;

        const displayOrderType = rawOrderType
            ? String(rawOrderType)
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (char) => char?.toUpperCase())
            : '--';

        const rawStatus = payload?.status ?? sourceOrder.status ?? 'Update';
        const displayStatus = String(rawStatus)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char?.toUpperCase());

        return { displayOrderId, displayTokenNo, displayOrderType, displayStatus };
    }, []);

    const handleNewOrder = useCallback(async (data: any) => {
        console.log('🔔 [NotificationProvider] RAW newOrder event:', data);

        if (!user) {
            console.log('🔕 [NotificationProvider] No active user, skipping notification');
            return;
        }

        const userRole = user.role?.toLowerCase() || '';
        console.log(`🔔 [NotificationProvider] Processing for user role: ${userRole}`);

        // Staff roles that should be notified of ALL new orders
        const staffRoles = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier'];

        const orderType = (data.order?.orderType || data.orderType || 'unknown')?.toLowerCase();
        const isDeliveryOrder = orderType === 'delivery';
        const shouldNotifyDelivery = userRole === 'delivery' && isDeliveryOrder;

        // Customer check
        const isCustomer = userRole === 'customer';
        const orderCustomerId = data.order?.customerUser || data.order?.customer?.userId;
        const currentUserId = user.sub || user._id || user.id;
        const isOwnOrder = isCustomer && (orderCustomerId === currentUserId);

        const isStaff = staffRoles.includes(userRole);

        console.log(`🔔 [NotificationProvider] Checks: IsStaff=${isStaff}, IsDelivery=${shouldNotifyDelivery}, IsOwnOrder=${isOwnOrder}`);

        // If not any of the target groups, logic might return, BUT for debugging we will show toasts anyway if meaningful
        // or strictly follow logic. strict logic:
        if (!isStaff && !shouldNotifyDelivery && !isOwnOrder) {
            console.log('🔕 [NotificationProvider] User not eligible.');
            return;
        }

        // Play sound (internally checks permissions)
        playNotificationSound();

        // Format Order Type
        const formatOrderType = (type: string) => {
            switch (type) {
                case 'dine_in': return 'Dine-in';
                case 'takeaway': return 'Takeaway';
                case 'delivery': return 'Delivery';
                case 'online_takeaway': return 'Online Takeaway';
                default: return 'Order';
            }
        };
        const typeLabel = formatOrderType(orderType);
        const { displayTokenNo, displayOrderType } = getOrderNotificationDetails(data);

        let title = `New ${typeLabel} Order!`;
        let body = `Token No #${displayTokenNo}\nType: ${displayOrderType}\nStatus: Placed`;

        if (isOwnOrder) {
            title = 'Order Placed!';
            body = `Token No #${displayTokenNo}\nType: ${displayOrderType}\nStatus: Placed`;
        }

        if (true) {
            console.log(`✅ [NotificationProvider] Showing notification: ${title}`);
            // Show OS / Native Notification
            const selectedId = settings?.notification?.sound || localStorage.getItem('notificationSoundId') || 'notification';
            showNotification(title, body, selectedId);

            // Show Toast
            toast.custom((t) => (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        bgcolor: 'primary.main',
                        color: 'white',
                        p: 2,
                        borderRadius: 2,
                        boxShadow: 3,
                        minWidth: 300,
                        cursor: 'pointer'
                    }}
                    onClick={() => toast.dismiss(t.id)}
                >
                    <RestaurantIcon />
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                        <Typography variant="body2">{body}</Typography>
                    </Box>
                    <IconButton size="small" sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            ), { duration: 5000, position: 'top-right' });
        }

        // Add to local state list
        const newNotif: Notification = {
            id: data.order?._id || Date.now(),
            timestamp: new Date(),
            read: false,
            type: 'order',
            title,
            message: body,
            priority: 'high',
            data: data,
        };
        setNotifications(prev => [newNotif, ...prev].slice(0, 50));

        // Auto-print KOT + bill on the restaurant device for ANY new order.
        // autoPrintOrder dedupes by id so POS orders already printed won't double-print.
        const { printer, autoPrint, formatCurrency: fmt } = printCtxRef.current;
        const newOrderId = data.order?._id || data.orderId || data._id;
        console.log('🖨️ [AutoPrint] newOrder gate:', { isStaff, autoPrint, newOrderId, hasPrinter: !!printer });
        if (isStaff && autoPrint) {
            if (newOrderId) {
                autoPrintOrder(newOrderId, printer, !!autoPrint, fmt)
                    .then((printed) => console.log('🖨️ [AutoPrint] result:', printed))
                    .catch((err) => {
                        console.error('🖨️ [AutoPrint] error:', err);
                        toast.error(`Auto-print failed: ${err?.message || 'check the printer connection.'}`);
                    });
            } else {
                console.warn('🖨️ [AutoPrint] No order id found in newOrder payload — cannot print.', data);
            }
        } else {
            console.warn('🖨️ [AutoPrint] Skipped: isStaff=' + isStaff + ', autoPrint=' + autoPrint);
        }

    }, [user, playNotificationSound, showNotification]);

    const handlePreOrderPromoted = useCallback((data: any) => {
        console.log('🔔 [NotificationProvider] RAW preOrderPromoted event:', data);

        if (!user) return;
        const userRole = user.role?.toLowerCase() || '';
        const staffRoles = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier'];
        const isStaff = staffRoles.includes(userRole);

        if (!isStaff) return;

        playNotificationSound();

        const title = 'Pre-Order Ready For Prep';
        const orderNum = data.order?.orderNumber || 'Order';
        const message = `${orderNum} has been promoted and needs preparation.`;

        showNotification(title, message);

        toast.custom((t) => (
            <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'secondary.main', color: 'white', p: 2, borderRadius: 2, boxShadow: 3, minWidth: 300, cursor: 'pointer' }}
                onClick={() => toast.dismiss(t.id)}
            >
                <RestaurantIcon />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                    <Typography variant="body2">{message}</Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'white' }}><CloseIcon /></IconButton>
            </Box>
        ), { duration: 6000, position: 'top-right' });

        const newNotif: Notification = {
            id: 'promo-' + Date.now(),
            timestamp: new Date(),
            read: false,
            type: 'status',
            title,
            message,
            priority: 'high',
            data: data,
        };
        setNotifications(prev => [newNotif, ...prev].slice(0, 50));

        // Auto-print KOT for the promoted pre-order
        const { printer, autoPrint, formatCurrency: fmt } = printCtxRef.current;
        const newOrderId = data.order?._id || data.orderId || data._id;
        if (isStaff && autoPrint && newOrderId) {
            autoPrintOrder(newOrderId, printer, !!autoPrint, fmt)
                .then((printed) => console.log('🖨️ [AutoPrint] preOrderPromoted result:', printed))
                .catch((err) => console.error('🖨️ [AutoPrint] preOrderPromoted error:', err));
        }
    }, [user, playNotificationSound, showNotification]);

    const handleOrderStatusUpdate = useCallback((data: any) => {
        console.log('🔔 [NotificationProvider] RAW orderStatusUpdate event:', data);
        if (!user) return;

        const userRole = user.role?.toLowerCase() || '';
        const orderType = (data.order?.orderType || data.orderType || '')?.toLowerCase();
        const currentUserId = user.sub || user._id || user.id;

        // Simple permissions check
        const isStaff = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier'].includes(userRole);
        const isCustomer = userRole === 'customer';
        const isOwnOrder = isCustomer && (data.order?.customerUser === currentUserId || data.order?.customer?.userId === currentUserId);
        const isDelivery = userRole === 'delivery' && orderType === 'delivery';

        if (!isStaff && !isOwnOrder && !isDelivery) {
            console.log('🔕 [NotificationProvider] User not eligible for status update.');
            return;
        }

        playNotificationSound();

        const { displayTokenNo, displayOrderType, displayStatus } = getOrderNotificationDetails(data);
        const title = 'Order Update';
        let message = `Token No #${displayTokenNo}\nType: ${displayOrderType}\nStatus: ${displayStatus}`;

        if (isOwnOrder) {
            message = `Token No #${displayTokenNo}\nType: ${displayOrderType}\nStatus: ${displayStatus}`;
        }

        showNotification(title, message);

        toast.custom((t) => (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    bgcolor: 'info.main', // Different color for update
                    color: 'white',
                    p: 2,
                    borderRadius: 2,
                    boxShadow: 3,
                    minWidth: 300,
                }}
                onClick={() => toast.dismiss(t.id)}
            >
                <RestaurantIcon />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                    <Typography variant="body2">{message}</Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'white' }}><CloseIcon /></IconButton>
            </Box>
        ), { duration: 5000 });

        const newNotif: Notification = {
            id: 'status-' + Date.now(),
            timestamp: new Date(),
            read: false,
            type: 'status',
            title,
            message,
            priority: 'medium',
            data: data,
        };
        setNotifications(prev => [newNotif, ...prev].slice(0, 50));

    }, [user, playNotificationSound, showNotification, getOrderNotificationDetails]);

    // Staff-only: orders whose status hasn't changed in over an hour.
    const handleStaleOrdersAlert = useCallback((data: any) => {
        if (!user) return;
        const userRole = user.role?.toLowerCase() || '';
        const staffRoles = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier'];
        if (!staffRoles.includes(userRole)) return;

        const count = data?.count ?? (data?.orders?.length || 0);
        if (count === 0) return;

        playNotificationSound();
        const title = 'Orders Need Attention';
        const message = `${count} order${count === 1 ? '' : 's'} have not been updated for over an hour. Please review and close them.`;
        showNotification(title, message);

        toast.custom((t) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'warning.main', color: 'white', p: 2, borderRadius: 2, boxShadow: 3, minWidth: 300, cursor: 'pointer' }} onClick={() => toast.dismiss(t.id)}>
                <RestaurantIcon />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                    <Typography variant="body2">{message}</Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'white' }}><CloseIcon /></IconButton>
            </Box>
        ), { duration: 6000, position: 'top-right' });

        const newNotif: Notification = { id: 'stale-' + Date.now(), timestamp: new Date(), read: false, type: 'stale-orders', title, message, priority: 'high', data };
        setNotifications(prev => [newNotif, ...prev].slice(0, 50));
    }, [user, playNotificationSound, showNotification]);

    // Admin/manager-only: request to auto-close all open orders before the store closes.
    const handleAutoCloseRequest = useCallback((data: any) => {
        if (!user) return;
        const userRole = user.role?.toLowerCase() || '';
        if (!['admin', 'manager', 'kitchen', 'kitchen_staff'].includes(userRole)) return;

        const count = data?.count ?? (data?.orders?.length || 0);
        const closeTime = data?.closeTime || '';

        playNotificationSound();
        const title = 'Store Closing Soon';
        const message = count > 0
            ? `${count} order${count === 1 ? '' : 's'} still open before close (${closeTime}). Auto-close them all?`
            : `Store closing at ${closeTime}.`;
        showNotification(title, message);

        // Surface the confirm dialog (rendered by the Layout).
        if (count > 0) {
            setAutoCloseRequest({ orders: data?.orders || [], count, closeTime });
        }

        toast.custom((t) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'error.main', color: 'white', p: 2, borderRadius: 2, boxShadow: 3, minWidth: 300, cursor: 'pointer' }} onClick={() => toast.dismiss(t.id)}>
                <RestaurantIcon />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                    <Typography variant="body2">{message}</Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'white' }}><CloseIcon /></IconButton>
            </Box>
        ), { duration: 8000, position: 'top-right' });

        const newNotif: Notification = { id: 'autoclose-' + Date.now(), timestamp: new Date(), read: false, type: 'auto-close', title, message, priority: 'high', data };
        setNotifications(prev => [newNotif, ...prev].slice(0, 50));
    }, [user, playNotificationSound, showNotification]);

    const handleNewCateringOrder = useCallback((data: any) => {
        console.log('🔔 [NotificationProvider] RAW newCateringOrder event:', data);
        if (!user) return;
        const userRole = user.role?.toLowerCase() || '';
        const staffRoles = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier'];
        const isStaff = staffRoles.includes(userRole);
        const isCustomer = userRole === 'customer';
        const orderCustomerId = data.order?.customerUser || data.order?.customer?.userId || data.order?.customerId;
        const currentUserId = user.sub || user._id || user.id;
        const isOwnOrder = isCustomer && (orderCustomerId === currentUserId || data.order?.customerEmail === user.email);

        if (!isStaff && !isOwnOrder) return;

        playNotificationSound();
        const orderNum = data.order?.orderNumber || 'Catering Order';
        const customerName = data.order?.customerName || 'Customer';
        const title = `New Catering Order!`;
        const body = `Order No: ${orderNum}\nCustomer: ${customerName}\nStatus: Pending`;
        showNotification(title, body);

        toast.custom((t) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'success.main', color: 'white', p: 2, borderRadius: 2, boxShadow: 3, minWidth: 300, cursor: 'pointer' }} onClick={() => toast.dismiss(t.id)}>
                <RestaurantIcon />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                    <Typography variant="body2">{body}</Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'white' }}><CloseIcon /></IconButton>
            </Box>
        ), { duration: 6000, position: 'top-right' });

        const newNotif: Notification = { id: data.order?._id || Date.now(), timestamp: new Date(), read: false, type: 'catering', title, message: body, priority: 'high', data: data };
        setNotifications(prev => [newNotif, ...prev].slice(0, 50));
    }, [user, playNotificationSound, showNotification]);

    const handleCateringOrderStatusUpdate = useCallback((data: any) => {
        console.log('🔔 [NotificationProvider] RAW cateringOrderStatusUpdate event:', data);
        if (!user) return;
        const userRole = user.role?.toLowerCase() || '';
        const staffRoles = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier'];
        const isStaff = staffRoles.includes(userRole);
        const isCustomer = userRole === 'customer';
        const orderCustomerId = data.order?.customerUser || data.order?.customer?.userId || data.order?.customerId;
        const currentUserId = user.sub || user._id || user.id;
        const isOwnOrder = isCustomer && (orderCustomerId === currentUserId || data.order?.customerEmail === user.email);

        if (!isStaff && !isOwnOrder) return;

        playNotificationSound();
        const orderNum = data.order?.orderNumber || 'Catering Order';
        const rawStatus = data.status || data.order?.status || 'Update';
        const displayStatus = String(rawStatus).replace(/_/g, ' ').replace(/\b\w/g, (char) => char?.toUpperCase());
        const title = `Catering Order Update`;
        const body = `Order No: ${orderNum}\nStatus: ${displayStatus}`;
        showNotification(title, body);

        toast.custom((t) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'info.main', color: 'white', p: 2, borderRadius: 2, boxShadow: 3, minWidth: 300, cursor: 'pointer' }} onClick={() => toast.dismiss(t.id)}>
                <RestaurantIcon />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                    <Typography variant="body2">{body}</Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'white' }}><CloseIcon /></IconButton>
            </Box>
        ), { duration: 6000, position: 'top-right' });

        const newNotif: Notification = { id: 'catering-status-' + Date.now(), timestamp: new Date(), read: false, type: 'catering-status', title, message: body, priority: 'medium', data: data };
        setNotifications(prev => [newNotif, ...prev].slice(0, 50));
    }, [user, playNotificationSound, showNotification]);

    const handleCateringOrderUpdate = useCallback((data: any) => {
        console.log('🔔 [NotificationProvider] RAW cateringOrderUpdate event:', data);
        if (!user) return;
        const userRole = user.role?.toLowerCase() || '';
        const staffRoles = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier'];
        const isStaff = staffRoles.includes(userRole);
        const isCustomer = userRole === 'customer';
        const orderCustomerId = data.order?.customerUser || data.order?.customer?.userId || data.order?.customerId;
        const currentUserId = user.sub || user._id || user.id;
        const isOwnOrder = isCustomer && (orderCustomerId === currentUserId || data.order?.customerEmail === user.email);

        if (!isStaff && !isOwnOrder) return;

        playNotificationSound();
        const orderNum = data.order?.orderNumber || 'Catering Order';
        const title = `Catering Order Updated`;
        const body = `Order No: ${orderNum} details have been updated.`;
        showNotification(title, body);

        toast.custom((t) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'info.main', color: 'white', p: 2, borderRadius: 2, boxShadow: 3, minWidth: 300, cursor: 'pointer' }} onClick={() => toast.dismiss(t.id)}>
                <RestaurantIcon />
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                    <Typography variant="body2">{body}</Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'white' }}><CloseIcon /></IconButton>
            </Box>
        ), { duration: 6000, position: 'top-right' });

        const newNotif: Notification = { id: 'catering-update-' + Date.now(), timestamp: new Date(), read: false, type: 'catering-update', title, message: body, priority: 'low', data: data };
        setNotifications(prev => [newNotif, ...prev].slice(0, 50));
    }, [user, playNotificationSound, showNotification]);

    // Table bookings. The backend already filters who receives these by role and by
    // the `bookings` push toggle, so this mirrors the catering staff check only.
    const handleBookingEvent = useCallback((title: string, priority: 'high' | 'medium', type: string) =>
        (data: any) => {
            console.log(`🔔 [NotificationProvider] RAW ${type} event:`, data);
            if (!user) return;

            const userRole = user.role?.toLowerCase() || '';
            const staffRoles = ['admin', 'manager', 'waiter', 'cashier'];
            const isStaff = staffRoles.includes(userRole);

            const booking = data.booking || {};
            const currentUserId = user.sub || user._id || user.id;
            const bookingCustomerId = booking.customerUser || booking.customer?.userId;
            const isOwnBooking = userRole === 'customer' && bookingCustomerId === currentUserId;

            if (!isStaff && !isOwnBooking) return;

            playNotificationSound();

            const customerName = booking.customerName || booking.guestInfo?.firstName || 'Customer';
            const tableName = booking.tableName || booking.table?.tableNumber;
            const guests = booking.guests ?? booking.numberOfGuests ?? booking.partySize;
            const slot = booking.timeSlot?.requested;
            const day = booking.date ? new Date(booking.date).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '';
            const status = data.status ? String(data.status).replace(/_/g, ' ') : '';

            const body = [
                `Customer: ${customerName}`,
                guests ? `Guests: ${guests}` : null,
                tableName ? `Table: ${tableName}` : null,
                [day, slot].filter(Boolean).length ? `Time: ${[day, slot].filter(Boolean).join(' ')}` : null,
                status ? `Status: ${status}` : null,
            ].filter(Boolean).join('\n');

            showNotification(title, body);

            toast.custom((t) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: priority === 'high' ? 'success.main' : 'info.main', color: 'white', p: 2, borderRadius: 2, boxShadow: 3, minWidth: 300, cursor: 'pointer' }} onClick={() => toast.dismiss(t.id)}>
                    <BookIcon />
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{body}</Typography>
                    </Box>
                    <IconButton size="small" sx={{ color: 'white' }}><CloseIcon /></IconButton>
                </Box>
            ), { duration: 6000, position: 'top-right' });

            const newNotif: Notification = {
                id: `${type}-${booking._id || Date.now()}`,
                timestamp: new Date(), read: false, type, title, message: body, priority, data,
            };
            setNotifications(prev => [newNotif, ...prev].slice(0, 50));
        }, [user, playNotificationSound, showNotification]);

    const handleNewBooking = useCallback(
        handleBookingEvent('New Table Booking!', 'high', 'booking'), [handleBookingEvent]);
    const handleBookingStatusUpdate = useCallback(
        handleBookingEvent('Booking Update', 'medium', 'booking-status'), [handleBookingEvent]);
    const handleBookingCheckedIn = useCallback(
        handleBookingEvent('Guest Checked In', 'high', 'booking-checkin'), [handleBookingEvent]);

    // Customer support tickets. The socket event is delivered per-connection by the
    // backend, which already applies the per-user and per-role `support` toggles from
    // notification settings. Re-filtering by a hardcoded role list here would drop
    // events for anyone an admin explicitly enabled (and for multi-role users, whose
    // JWT only carries roles[0]), so if we received it, we show it.
    const handleSupportTicketEvent = useCallback((title: string, priority: 'high' | 'medium', type: string) =>
        (data: any) => {
            console.log(`🔔 [NotificationProvider] RAW ${type} event:`, data);
            if (!user) return;

            const ticket = data.ticket || {};

            playNotificationSound();

            const ref = ticket._id ? `#${String(ticket._id).slice(-6).toUpperCase()}` : '';
            const customerName = ticket.customerDetails?.fullName || 'Customer';
            const status = data.status ? String(data.status).replace(/_/g, ' ') : '';

            const body = [
                ref ? `Ticket: ${ref}` : null,
                `Customer: ${customerName}`,
                ticket.subject ? `Subject: ${ticket.subject}` : null,
                status ? `Status: ${status}` : null,
                data.message ? `Message: ${String(data.message).slice(0, 120)}` : null,
            ].filter(Boolean).join('\n');

            showNotification(title, body);

            toast.custom((t) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: priority === 'high' ? 'warning.main' : 'info.main', color: 'white', p: 2, borderRadius: 2, boxShadow: 3, minWidth: 300, cursor: 'pointer' }} onClick={() => toast.dismiss(t.id)}>
                    <SupportIcon />
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{body}</Typography>
                    </Box>
                    <IconButton size="small" sx={{ color: 'white' }}><CloseIcon /></IconButton>
                </Box>
            ), { duration: 6000, position: 'top-right' });

            const newNotif: Notification = {
                id: `${type}-${ticket._id || Date.now()}`,
                timestamp: new Date(), read: false, type, title, message: body, priority, data,
            };
            setNotifications(prev => [newNotif, ...prev].slice(0, 50));
        }, [user, playNotificationSound, showNotification]);

    const handleNewSupportTicket = useCallback(
        handleSupportTicketEvent('New Support Ticket!', 'high', 'support-ticket'), [handleSupportTicketEvent]);
    const handleSupportTicketUpdate = useCallback(
        handleSupportTicketEvent('Support Ticket Update', 'medium', 'support-ticket-update'), [handleSupportTicketEvent]);

    const [deliveryLocations, setDeliveryLocations] = useState<Record<string, { lat: number, lng: number, timestamp: Date }>>({});

    const handleLocationUpdate = useCallback((data: { orderId: string, location: { lat: number, lng: number }, timestamp: string | Date }) => {
        setDeliveryLocations(prev => ({
            ...prev,
            [data.orderId]: {
                ...data.location,
                timestamp: new Date(data.timestamp)
            }
        }));
    }, []);

    const trackOrder = useCallback((orderId: string, lat: number, lng: number) => {
        socketService.emit('updateLocation', { orderId, lat, lng });
    }, []);

    // Effect to manage socket connection
    useEffect(() => {
        // Preload robust native sounds
        preloadNativeSounds();

        // Request permissions and create channel
        const setupNotifications = async () => {
            if (Capacitor.isNativePlatform()) {
                // Request Permission
                const permResult = await LocalNotifications.requestPermissions();
                if (permResult.display !== 'granted') {
                    console.log('🔔 [NotificationProvider] Native notification permission denied');
                }

                // Create Channel (Required for Android O+)
                await LocalNotifications.createChannel({
                    id: 'orders_v3',
                    name: 'Order Notifications V3',
                    description: 'Notifications for new orders and updates',
                    importance: 5, // High importance for heads-up notification
                    visibility: 1, // Public on lock screen
                    sound: 'notification.mp3',
                    vibration: true,
                });
                
                // Create Silent Channel for foreground local notifications (prevents double sound)
                await LocalNotifications.createChannel({
                    id: 'orders_v4_silent',
                    name: 'Order Notifications (Foreground)',
                    description: 'Silent notifications for when app is open',
                    importance: 2, // Low importance (2) guarantees NO SOUND and no audio ducking
                    visibility: 1, 
                    sound: '', // No sound
                    vibration: false,
                });

                // BACKWARD COMPATIBILITY: 
                // The production backend is still sending push notifications to the old 'orders' channel.
                // We MUST recreate the 'orders' channel here or Android will silently drop the push notifications from production!
                await LocalNotifications.createChannel({
                    id: 'orders',
                    name: 'Order Notifications (Legacy)',
                    description: 'Legacy channel for production backend',
                    importance: 5,
                    visibility: 1,
                    sound: 'notification.mp3', // Force the custom sound even if production backend says 'default'
                    vibration: true,
                });
                
                console.log('🔔 [NotificationProvider] Notification channels created');
            } else if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        };
        setupNotifications();

        // 🎵 AUDIO UNLOCK TRICK FOR ANDROID WEBVIEW 🎵
        // Android blocks autoplaying audio unless the user has interacted.
        // We unlock the audio engine on the first tap anywhere on the screen!
        const unlockAudio = () => {
            // Unlock HTMLAudioElement
            try {
                const dummy = new Audio('/sounds/notification.mp3');
                dummy.volume = 0;
                dummy.play().then(() => {
                    dummy.pause();
                    dummy.currentTime = 0;
                    console.log('✅ [NotificationProvider] HTMLAudioElement unlocked!');
                }).catch(() => {});
            } catch (e) {}

            // Unlock Web Audio API
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            ctx.resume().then(() => {
                console.log('✅ [NotificationProvider] Web Audio Context unlocked!');
                ['click', 'touchstart', 'keydown'].forEach(evt => document.removeEventListener(evt, unlockAudio));
            });
        };
        ['click', 'touchstart', 'keydown'].forEach(evt => document.addEventListener(evt, unlockAudio));
        const token = localStorage.getItem('jwt');
        if (!token || !user) {
            console.log('🔔 [NotificationProvider] No token or user, skipping socket connect');
            return;
        }

        console.log('🔌 [NotificationProvider] Initiating socket connection...');

        // Always ensure we are fresh
        if (socketService.isConnected()) {
            socketService.disconnect();
        }

        socketService.connect(token);

        // Debug connection
        setTimeout(() => {
            console.log('🔌 [NotificationProvider] Socket connected state:', socketService.isConnected());
        }, 1000);

        socketService.on('newOrder', handleNewOrder);
        socketService.on('pre_order_promoted', handlePreOrderPromoted);
        socketService.on('orderStatusUpdate', handleOrderStatusUpdate);
        socketService.on('locationUpdate', handleLocationUpdate);

        // Order close / stale events
        socketService.on('staleOrdersAlert', handleStaleOrdersAlert);
        socketService.on('autoCloseRequest', handleAutoCloseRequest);

        // Catering events
        socketService.on('newCateringOrder', handleNewCateringOrder);
        socketService.on('cateringOrderStatusUpdate', handleCateringOrderStatusUpdate);
        socketService.on('cateringOrderUpdate', handleCateringOrderUpdate);

        // Table booking events
        socketService.on('newBooking', handleNewBooking);
        socketService.on('bookingStatusUpdate', handleBookingStatusUpdate);
        socketService.on('bookingCheckedIn', handleBookingCheckedIn);

        // Customer support ticket events
        socketService.on('newSupportTicket', handleNewSupportTicket);
        socketService.on('supportTicketUpdate', handleSupportTicketUpdate);

        return () => {
            console.log('🔌 [NotificationProvider] Cleanup: removing listeners');
            socketService.off('newOrder', handleNewOrder);
            socketService.off('pre_order_promoted', handlePreOrderPromoted);
            socketService.off('orderStatusUpdate', handleOrderStatusUpdate);
            socketService.off('locationUpdate', handleLocationUpdate);

            socketService.off('staleOrdersAlert', handleStaleOrdersAlert);
            socketService.off('autoCloseRequest', handleAutoCloseRequest);

            socketService.off('newCateringOrder', handleNewCateringOrder);
            socketService.off('cateringOrderStatusUpdate', handleCateringOrderStatusUpdate);
            socketService.off('cateringOrderUpdate', handleCateringOrderUpdate);

            socketService.off('newBooking', handleNewBooking);
            socketService.off('bookingStatusUpdate', handleBookingStatusUpdate);
            socketService.off('bookingCheckedIn', handleBookingCheckedIn);

            socketService.off('newSupportTicket', handleNewSupportTicket);
            socketService.off('supportTicketUpdate', handleSupportTicketUpdate);
            // Deliberately NOT disconnecting here. This effect re-runs whenever a
            // handler identity changes (settings loading rebuilds them), and
            // tearing the socket down each time raced the reconnect, leaving a
            // connected-but-deaf socket. Disconnect happens on logout instead.
        };
    }, [user?.sub, user?.role, handleNewOrder, handleOrderStatusUpdate, handleNewCateringOrder, handleCateringOrderStatusUpdate, handleCateringOrderUpdate, handleNewBooking, handleBookingStatusUpdate, handleBookingCheckedIn, handleNewSupportTicket, handleSupportTicketUpdate]); // Re-connect only if identity changes

    // ── Subscription expiry / expired warning ─────────────────────────────
    // Derives a synthetic notification from the tenant's subscription state
    // (baked into the JWT at login) and keeps it in sync as days tick down.
    // Shows an "expiring in N days" warning when 3/2/1/0 days remain, and an
    // "expired" error once the subscription has lapsed. Staff only.
    useEffect(() => {
        const tenant: any = user && typeof (user as any).tenant === 'object' ? (user as any).tenant : null;
        const role = user?.role?.toLowerCase() || '';
        const staffRoles = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier'];

        // Only surface billing warnings to staff who can act on them.
        if (!tenant || !staffRoles.includes(role)) {
            setNotifications(prev => prev.filter(n => n.type !== 'subscription'));
            return;
        }

        const status = tenant.subscriptionStatus as string | undefined;
        const endDate = status === 'trial' ? tenant.trialEndsAt : tenant.subscriptionEndsAt;

        const build = (): Notification | null => {
            const daysRemaining = endDate
                ? Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

            const isExpired = status === 'expired' || status === 'cancelled' ||
                (['trial', 'active'].includes(status || '') && daysRemaining !== null && daysRemaining <= 0);

            if (isExpired) {
                const isTrial = status === 'trial';
                return {
                    id: 'subscription-warning',
                    timestamp: new Date(),
                    read: false,
                    type: 'subscription',
                    title: isTrial ? 'Free trial ended' : 'Subscription expired',
                    message: isTrial
                        ? 'Your free trial has ended. Please upgrade to keep using the system.'
                        : 'Your subscription has expired. Please renew to continue using the system.',
                    priority: 'high',
                    data: { subscriptionStatus: status, expired: true },
                };
            }

            // Expiring soon: warn only within the final 3 days.
            if (daysRemaining !== null && daysRemaining >= 1 && daysRemaining <= 3) {
                const dayLabel = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`;
                const isTrial = status === 'trial';
                return {
                    id: 'subscription-warning',
                    timestamp: new Date(),
                    read: false,
                    type: 'subscription',
                    title: isTrial ? 'Free trial ending soon' : 'Subscription expiring soon',
                    message: isTrial
                        ? `Your free trial expires in ${dayLabel}. Upgrade now to avoid interruption.`
                        : `Your subscription expires in ${dayLabel}. Renew now to avoid interruption.`,
                    priority: 'high',
                    data: { subscriptionStatus: status, daysRemaining },
                };
            }

            return null;
        };

        const sync = () => {
            const notif = build();
            setNotifications(prev => {
                const existing = prev.find(n => n.type === 'subscription');
                const rest = prev.filter(n => n.type !== 'subscription');
                if (!notif) return rest;
                // Preserve read state / timestamp if the message hasn't changed,
                // so re-syncs don't keep re-alerting the user.
                if (existing && existing.message === notif.message) {
                    return [existing, ...rest];
                }
                return [notif, ...rest];
            });
        };

        sync();
        // Re-evaluate hourly so the day counter rolls over without a reload.
        const interval = setInterval(sync, 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user]);

    const dismissAutoCloseRequest = useCallback(() => setAutoCloseRequest(null), []);

    // Upsert (replace-by-id) the subscription notification so refreshes don't
    // stack duplicates. A null notification clears any previously injected one.
    const upsertSubscriptionNotification = useCallback((notif: Notification | null) => {
        setNotifications(prev => {
            const withoutSub = prev.filter(n => n.id !== SUBSCRIPTION_NOTIFICATION_ID);
            if (!notif) return withoutSub;
            // Preserve the read flag if the user already dismissed the same warning.
            const existing = prev.find(n => n.id === SUBSCRIPTION_NOTIFICATION_ID);
            const merged = existing && existing.message === notif.message
                ? { ...notif, read: existing.read, timestamp: existing.timestamp }
                : notif;
            return [merged, ...withoutSub];
        });
    }, []);

    // Subscription expiry warning: fetch tenant status on login and poll daily so
    // the "expires in N days" countdown stays accurate for long-lived sessions.
    useEffect(() => {
        const role = user?.role?.toLowerCase();
        if (!user || !['admin', 'manager'].includes(role || '')) {
            upsertSubscriptionNotification(null);
            return;
        }

        let cancelled = false;
        const checkSubscription = async () => {
            try {
                const res = await tenantAPI.getCurrent();
                if (cancelled) return;
                upsertSubscriptionNotification(buildSubscriptionNotification(res.data));
            } catch (err) {
                console.warn('🔔 [NotificationProvider] Failed to fetch subscription status:', err);
            }
        };

        checkSubscription();
        const interval = setInterval(checkSubscription, MS_PER_DAY);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [user?.sub, user?.role, upsertSubscriptionNotification]);

    const clearNotifications = useCallback(() => setNotifications([]), []);
    const markAsRead = useCallback((id: string | number) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);
    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const testNotification = useCallback(() => {
        console.log('🔔 Testing notification system...');
        playNotificationSound();
        const selectedId = settings?.notification?.sound || localStorage.getItem('notificationSoundId') || 'notification';
        showNotification('Test System', 'Notifications are working!', selectedId);
        toast.success('Test Notification Works!');
        setNotifications(prev => [{
            id: 'test-' + Date.now(),
            timestamp: new Date(),
            read: false,
            type: 'system',
            title: 'Test',
            message: 'System test',
            priority: 'low'
        }, ...prev]);
    }, [playNotificationSound, showNotification]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            clearNotifications,
            markAsRead,
            markAllAsRead,
            testNotification,
            deliveryLocations,
            trackOrder,
            autoCloseRequest,
            dismissAutoCloseRequest
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
