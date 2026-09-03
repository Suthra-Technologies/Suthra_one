import { io, Socket } from 'socket.io-client';
import { apiBaseUrl } from './api';

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Function[]> = new Map();

    connect(token: string) {
        if (this.socket?.connected) {
            // Already live. Re-bind any listeners registered while the socket was
            // being torn down and rebuilt, otherwise the connection stays open
            // but deaf and no events are ever delivered.
            this.rebindListeners();
            return;
        }

        const wsUrl = import.meta.env.VITE_SOCKET_URL || (apiBaseUrl ? apiBaseUrl.replace(/\/api\/?$/, '') : 'http://localhost:5006');

        // A user with several roles only wants the notifications of the role they
        // are currently acting as, so the active role travels with the handshake.
        const activeRole =
            typeof window !== 'undefined' ? localStorage.getItem('activeRole') : null;

        this.socket = io(`${wsUrl}/events`, {
            auth: { token, activeRole },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
            console.log('WebSocket connected');
        });

        this.socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
        });

        this.rebindListeners();
    }

    /**
     * Attach every registered callback to the current socket, replacing any
     * existing binding so a callback is never subscribed twice.
     */
    private rebindListeners() {
        if (!this.socket) return;
        this.listeners.forEach((callbacks, event) => {
            callbacks.forEach(callback => {
                this.socket?.off(event, callback as any);
                this.socket?.on(event, callback as any);
            });
        });
    }

    /**
     * Tell the server which role the user is now acting as, so notification
     * filtering follows a role switch without dropping the connection.
     */
    setActiveRole(role: string | null) {
        this.socket?.emit('setActiveRole', { role });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        const callbacks = this.listeners.get(event)!;
        if (!callbacks.includes(callback)) {
            callbacks.push(callback);
        }

        if (this.socket) {
            // off-then-on so a repeated registration cannot fire twice.
            this.socket.off(event, callback as any);
            this.socket.on(event, callback as any);
        }
    }

    off(event: string, callback?: Function) {
        if (callback) {
            const callbacks = this.listeners.get(event) || [];
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
            this.socket?.off(event, callback as any);
        } else {
            this.listeners.delete(event);
            this.socket?.off(event);
        }
    }

    emit(event: string, data: any) {
        this.socket?.emit(event, data);
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export const socketService = new SocketService();
