
import { io, Socket } from "socket.io-client";

class SocketService {
    private socket: Socket | null = null;
    private handlers: Map<string, Set<Function>> = new Map();

    connect(userId: string, profile: any) {
        const endpoint = window.location.hostname === 'localhost' 
            ? 'http://localhost:3001' 
            : window.location.origin.replace('http', 'ws').replace(':3000', ':3001');

        this.socket = io(endpoint, {
            transports: ['websocket'],
            reconnection: true
        });

        this.socket.on('connect', () => {
            this.socket?.emit('register', profile);
        });

        // Relay Handlers
        this.socket.on('global:user-list', (users) => this.emit('users-updated', users));
        this.socket.on('message:receive', (data) => this.emit('new-message', data));
        this.socket.on('webrtc:signal', (data) => this.emit('webrtc-signal', data));
    }

    on(event: string, callback: Function) {
        if (!this.handlers.has(event)) this.handlers.set(event, new Set());
        this.handlers.get(event)?.add(callback);
    }

    private emit(event: string, data: any) {
        this.handlers.get(event)?.forEach(cb => cb(data));
    }

    sendEncrypted(to: string, payload: any) {
        this.socket?.emit('message:send', { to, payload });
    }

    sendSignal(to: string, signal: any, callType?: string) {
        this.socket?.emit('webrtc:signal', { to, signal, callType });
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }
}

export const socketService = new SocketService();
