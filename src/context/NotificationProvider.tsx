import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { socketService } from '../services/socket.service';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { Box, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon, Restaurant as RestaurantIcon } from '@mui/icons-material';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import { getSoundSrc, getSoundConfig, preloadNativeSounds } from '../utils/notificationSounds';
import { NativeAudio } from '@capacitor-community/native-audio';
import { useSettings } from './SettingsContext';
import { autoPrintOrder } from '../utils/autoPrintOrder';

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

    const playNotificationSound = useCallback(() => {
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

        // --- NATIVE AUDIO PLAYER (Robust for Android/iOS) ---
        if (Capacitor.isNativePlatform()) {
            const config = getSoundConfig(selectedId);
            
            // Start looping the sound
            NativeAudio.loop({ assetId: config.id }).catch((err) => {
                console.warn('NativeAudio loop failed, falling back to play:', err);
                NativeAudio.play({ assetId: config.id }).catch(() => {});
                
                // Fallback interval just in case loop is not supported
                manualLoopRef.current = setInterval(() => {
                    NativeAudio.play({ assetId: config.id }).catch(() => {});
                }, 3000);
            });

            // Auto-stop after the configured duration
            soundTimeoutRef.current = setTimeout(() => {
                if (manualLoopRef.current) {
                    clearInterval(manualLoopRef.current);
                    manualLoopRef.current = null;
                }
                NativeAudio.stop({ assetId: config.id }).catch(() => {});
            }, durationMs);

            return;
        }

        // --- WEB BROWSER AUDIO PLAYER ---
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

    const showNotification = useCallback(async (title: string, body: string) => {
        console.log('🔔 [NotificationProvider] Requesting to show notification:', title);

        // NATIVE MOBILE NOTIFICATION
        if (Capacitor.isNativePlatform()) {
            try {
                await LocalNotifications.schedule({
                    notifications: [
                        {
                            title: title,
                            body: body,
                            id: new Date().getTime(),
                            schedule: { at: new Date(Date.now() + 100) }, // Schedule slightly in future
                            sound: 'notification.mp3',
                            channelId: 'orders_v2', // Critical for Android 8+
                            smallIcon: 'ic_stat_icon_config_sample', // Ensure this or a default exists
                            actionTypeId: '',
                            extra: null
                        }
                    ]
                });
                console.log('🔔 [NotificationProvider] Native notification scheduled');
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
                new Notification(title, { body, icon: '/logo.png' });
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

    const handleNewOrder = useCallback((data: any) => {
        console.log('🔔 [NotificationProvider] RAW newOrder event:', data);

        if (!user) {
            console.log('🔕 [NotificationProvider] No active user, skipping notification');
            return;
        }

        const userRole = user.role?.toLowerCase() || '';
        console.log(`🔔 [NotificationProvider] Processing for user role: ${userRole}`);

        // Staff roles that should be notified of ALL new orders
        const staffRoles = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier', 'superadmin'];

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

        // Play sound
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

        console.log(`✅ [NotificationProvider] Showing notification: ${title}`);

        // Show OS / Native Notification
        showNotification(title, body);

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
        const staffRoles = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier', 'superadmin'];
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
        const isStaff = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier', 'superadmin'].includes(userRole);
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
        const staffRoles = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier', 'superadmin'];
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
        if (!['admin', 'manager', 'superadmin', 'kitchen', 'kitchen_staff'].includes(userRole)) return;

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
        const staffRoles = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier', 'superadmin'];
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
        const staffRoles = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier', 'superadmin'];
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
        const staffRoles = ['admin', 'manager', 'kitchen', 'kitchen_staff', 'waiter', 'cashier', 'superadmin'];
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
                    id: 'orders_v2',
                    name: 'Order Notifications',
                    description: 'Notifications for new orders and updates',
                    importance: 5, // High importance for heads-up notification
                    visibility: 1, // Public on lock screen
                    sound: 'notification.mp3', // Make sure this matches file in res/raw if custom
                    vibration: true,
                });
                console.log('🔔 [NotificationProvider] Notification channel created');
            } else if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        };
        setupNotifications();

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
            // Optional: disconnect on unmount? Better to keep it alive? 
            // Usually disconnecting is safer to prevent duplicate handlers if remounted.
            socketService.disconnect();
        };
    }, [user?.sub, user?.role, handleNewOrder, handleOrderStatusUpdate, handleNewCateringOrder, handleCateringOrderStatusUpdate, handleCateringOrderUpdate]); // Re-connect only if identity changes

    const dismissAutoCloseRequest = useCallback(() => setAutoCloseRequest(null), []);

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
        showNotification('Test System', 'Notifications are working!');
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
