import { io, Socket } from 'socket.io-client';

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Function[]> = new Map();

    connect(token: string) {
        if (this.socket?.connected) {
            return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5006';
        const wsUrl = import.meta.env.VITE_SOCKET_URL || (typeof apiUrl === 'string' ? apiUrl.replace('/api', '') : 'http://localhost:5006');

        this.socket = io(`${wsUrl}/events`, {
            auth: { token },
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

        // Set up event listeners
        this.listeners.forEach((callbacks, event) => {
            callbacks.forEach(callback => {
                this.socket?.on(event, callback as any);
            });
        });
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
        this.listeners.get(event)?.push(callback);

        if (this.socket) {
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
