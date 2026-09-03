import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

export interface Notification {
  id: number;
  timestamp: Date;
  read: boolean;
  type: string;
  title: string;
  message: string;
  priority: string;
  data?: any;
}

export interface SocketContextType {
  socket: Socket | null;
  isConnected: () => boolean;
  getSocketId: () => string | null;
  emit: (event: string, data: any) => void;
  emitOrderUpdate: (orderData: any) => void;
  emitKOTUpdate: (kotData: any) => void;
  emitTableUpdate: (tableData: any) => void;
  emitInventoryAlert: (inventoryData: any) => void;
  emitMenuUpdate: (menuData: any) => void;
  emitPaymentUpdate: (paymentData: any) => void;
  emitSystemNotification: (message: string, type?: string, targetRoles?: string[] | null) => void;
  notifications: Notification[];
  unreadCount: number;
  markNotificationAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (notificationId: number) => void;
  getWaiterNameById: (waiters: any[], waiterId: string) => string;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);
  const { user, token, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user && token) {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const derivedFromApi = apiUrl.replace(/\/api\/?$/i, '');
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const serverUrl = (import.meta.env.VITE_SOCKET_URL || derivedFromApi || origin || 'http://localhost:5006').replace(/\/$/, '');
      socketRef.current = io(`${serverUrl}/events`, {
        auth: {
          token,
          userId: user._id,
          role: user.role,
          restaurantId: import.meta.env.VITE_RESTAURANT_ID || 'default',
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 15000,
        timeout: 10000,
      });
      const socket = socketRef.current;
      socket.on('connect', () => {
        addNotification({
          type: 'system',
          title: 'System Connected',
          message: 'Real-time notifications are now active',
          priority: 'low',
          data: { socketId: socket.id },
        });
        socket.emit('join-role-room', {
          userId: user._id,
          role: user.role,
          restaurantId: 'default',
        });
      });
      socket.on('disconnect', () => { });
      const lastErrorShownRef = { current: 0 };
      socket.on('connect_error', () => {
        const now = Date.now();
        if (now - lastErrorShownRef.current > 15000) {
          lastErrorShownRef.current = now;
          // toast.error('Connection error. Real-time updates may not work.');
        }
      });
      setupEventHandlers(socket);
      return () => {
        if (socket) {
          try {
            socket.removeAllListeners(); // Cleanup listeners first
            socket.disconnect();
          } catch (err) {
            console.warn("Failed to disconnect socket cleanly", err);
          }
          socketRef.current = null;
        }
      };
    }
  }, [user, token]);

  useEffect(() => {
    const apiErrorHandler = (event: any) => {
      if (event.detail && event.detail.status === 500) {
        toast.error('System error: Unable to load settings. Please contact support.');
      }
    };
    window.addEventListener('apiError', apiErrorHandler);
    return () => {
      window.removeEventListener('apiError', apiErrorHandler);
    };
  }, []);

  const addNotification = (notification: Partial<Notification>) => {
    const newNotification: Notification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      read: false,
      type: notification.type || '',
      title: notification.title || '',
      message: notification.message || '',
      priority: notification.priority || 'low',
      data: notification.data,
    };
    setNotifications((prev) => [newNotification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  };

    const setupEventHandlers = (socket: Socket) => {
    socket.on('newOrder', (data) => {
      const order = data.order || data;
      // toast.success(`New order received: ${order.orderNumber}`);
      addNotification({
        type: 'order',
        title: 'New Order',
        message: `Order ${order.orderNumber} has been placed`,
        priority: 'high',
        data: order,
      });
      window.dispatchEvent(new CustomEvent('newOrder', { detail: order }));
    });

    socket.on('orderStatusUpdate', (data) => {
      const order = data.order || data;
      // toast.success(`Order ${order.orderNumber} status updated to ${data.status}`);
      addNotification({
        type: 'order_status',
        title: 'Order Status Updated',
        message: `Order ${order.orderNumber} is now ${data.status}`,
        priority: 'medium',
        data: order,
      });
      window.dispatchEvent(new CustomEvent('orderStatusUpdate', { detail: order }));
    });

    socket.on('paymentStatus', (data) => {
      const orderRef = data.orderNumber ? ` for order ${data.orderNumber}` : '';
      let title = 'Payment Update';
      let message = data.status ? `Payment ${data.status}` : 'Payment status update';
      let priority: 'low' | 'medium' | 'high' = 'medium';

      if (data.event === 'refund_failed') {
        title = 'Refund Failed';
        message = `Refund${orderRef} did not go through${data.error ? `: ${data.error}` : ''}. Please retry or refund manually.`;
        priority = 'high';
      } else if (data.event === 'refund_succeeded' || data.event === 'payment_refunded') {
        title = 'Refund Processed';
        message = `Refund${orderRef} was processed successfully.`;
      }

      addNotification({
        type: 'payment',
        title,
        message,
        priority,
        data,
      });
      window.dispatchEvent(new CustomEvent('paymentStatus', { detail: data }));
    });

    // Stock shortages. The toast, sound and bell entry are owned by
    // NotificationProvider, which listens for these same events — this only
    // re-broadcasts them as a window event so the dashboard can refresh its
    // standing warning immediately instead of waiting for the next poll.
    const handleStockAlert = (data: any) => {
      window.dispatchEvent(new CustomEvent('inventoryStockAlert', { detail: data }));
    };

    socket.on('inventoryLowStock', handleStockAlert);
    socket.on('inventoryCriticalStock', handleStockAlert);

    socket.on('auth_error', () => {
      toast.error('Authentication session expired. Please login again.');
      logout();
    });
    // Additional event handlers can be added here
  };

  const emit = (event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  };

  const emitOrderUpdate = (orderData: any) => emit('order-status-update', orderData);
  const emitKOTUpdate = (kotData: any) => emit('kot-item-ready', kotData);
  const emitTableUpdate = (tableData: any) => emit('table-status-change', tableData);
  const emitInventoryAlert = (inventoryData: any) => emit('low-stock-alert', inventoryData);
  const emitMenuUpdate = (menuData: any) => emit('menu-item-unavailable', menuData);
  const emitPaymentUpdate = (paymentData: any) => emit('payment-received', paymentData);
  const emitSystemNotification = (message: string, type = 'info', targetRoles: string[] | null = null) => {
    emit('system-notification', { message, type, targetRoles });
  };

  const isConnected = () => socketRef.current?.connected || false;
  const markNotificationAsRead = (notificationId: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };
  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };
  const removeNotification = (notificationId: number) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === notificationId);
      const updated = prev.filter((n) => n.id !== notificationId);
      if (notification && !notification.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return updated;
    });
  };
  const getSocketId = () => socketRef.current?.id || null;
  const getWaiterNameById = (waiters: any[], waiterId: string) => {
    const waiter = waiters.find((w) => w._id === waiterId);
    return waiter ? `${waiter.firstName} ${waiter.lastName}` : 'Unassigned';
  };

  const value: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    getSocketId,
    emit,
    emitOrderUpdate,
    emitKOTUpdate,
    emitTableUpdate,
    emitInventoryAlert,
    emitMenuUpdate,
    emitPaymentUpdate,
    emitSystemNotification,
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
    getWaiterNameById,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
