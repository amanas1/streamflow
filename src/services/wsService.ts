
import { io, Socket } from "socket.io-client";

class WsService {
    private socket: Socket | null = null;
    private handlers: Map<string, Function[]> = new Map();

    connect(userId: string, profile?: any) {
        const serverUrl = window.location.hostname === 'localhost' 
            ? `http://${window.location.hostname}:3001`
            : window.location.origin.replace('https://', 'wss://').replace('http://', 'ws://').replace(':3000', ':3001');
            
        this.socket = io(serverUrl);
        
        this.socket.on('connect', () => {
            this.socket?.emit('register', profile || { id: userId });
        });

        // Communication Events
        // Fixed: Mapping encrypted-message to encrypted-message internal event (previously incorrectly mapped to 'message')
        this.socket.on('encrypted-message', (data) => this.emit('encrypted-message', data));
        this.socket.on('users-update', (data) => this.emit('users-update', data));
        this.socket.on('media-ready', (data) => this.emit('media-ready', data));
        
        // Added: Mapping signal socket event to internal event emitter
        this.socket.on('signal', (data) => this.emit('signal', data));

        // WebRTC Events
        this.socket.on('webrtc:offer', (data) => this.emit('webrtc:offer', data));
        this.socket.on('webrtc:answer', (data) => this.emit('webrtc:answer', data));
        this.socket.on('webrtc:ice-candidate', (data) => this.emit('webrtc:ice-candidate', data));
        this.socket.on('webrtc:hangup', (data) => this.emit('webrtc:hangup', data));
    }

    on(event: string, handler: Function) {
        const list = this.handlers.get(event) || [];
        list.push(handler);
        this.handlers.set(event, list);
    }

    private emit(event: string, data: any) {
        this.handlers.get(event)?.forEach(h => h(data));
    }

    sendEncrypted(to: string, payload: any) { this.socket?.emit('encrypted-message', { to, payload }); }
    
    // Explicit Signaling
    sendOffer(to: string, offer: any, callType: string) { this.socket?.emit('webrtc:offer', { to, offer, callType }); }
    sendAnswer(to: string, answer: any) { this.socket?.emit('webrtc:answer', { to, answer }); }
    sendIceCandidate(to: string, candidate: any) { this.socket?.emit('webrtc:ice-candidate', { to, candidate }); }
    sendHangup(to: string) { this.socket?.emit('webrtc:hangup', { to }); }

    // Fixed: Added missing refreshUserList method used in ChatService.getLiveUsers
    refreshUserList() {
        this.socket?.emit('get-users');
    }

    // Fixed: Added missing sendSignal method used in ChatService.sendCallSignal
    sendSignal(to: string, signal: any) {
        this.socket?.emit('signal', { to, signal });
    }

    async uploadMedia(to: string, mediaId: string, blob: string) {
        this.socket?.emit('media-upload', { to, mediaId, blob });
    }

    async downloadMedia(mediaId: string): Promise<string> {
        return new Promise((resolve) => {
            this.socket?.emit('media-download', mediaId, (blob: string) => resolve(blob));
        });
    }
}

export const wsService = new WsService();
