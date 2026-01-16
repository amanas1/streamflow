
import { io, Socket } from 'socket.io-client';
import { UserProfile, ChatMessage } from '../types';
import { cryptoService } from './cryptoService';

/**
 * EPHEMERAL CHAT SERVICE
 * POLICY: No local persistence. No database. No history recovery.
 * HISTORY LIFE: Browser RAM only. Wiped on F5.
 */
class ChatService {
  private socket: Socket | null = null;
  private messageListeners: Set<(msg: ChatMessage) => void> = new Set();
  private presenceListeners: Set<(users: UserProfile[]) => void> = new Set();
  
  // Volatile cache (RAM only)
  private memoryHistory: Map<string, ChatMessage[]> = new Map();

  async init(user: UserProfile) {
    if (this.socket) return;
    
    await cryptoService.init();
    const endpoint = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001' 
      : `wss://${window.location.host.replace(':3000', ':3001')}`;

    this.socket = io(endpoint, { transports: ['websocket'] });

    this.socket.on('connect', () => {
      this.socket?.emit('presence:join', user);
    });

    this.socket.on('presence:list', (users: UserProfile[]) => {
      this.presenceListeners.forEach(cb => cb(users));
    });

    this.socket.on('relay:payload', async (data: { from: string, payload: any }) => {
      const { from, payload } = data;

      if (payload.type === 'handshake') {
        await cryptoService.deriveSessionKey(payload.publicKey, from);
        if (payload.isInitiator) {
          const myKey = await cryptoService.getPublicKey();
          this.socket?.emit('relay:payload', { 
            to: from, 
            payload: { type: 'handshake', publicKey: myKey, isInitiator: false } 
          });
        }
        return;
      }

      try {
        const decrypted = await cryptoService.decrypt(from, payload);
        const content = JSON.parse(decrypted);
        const msg: ChatMessage = {
          id: Math.random().toString(36).substring(7),
          sessionId: from,
          senderId: from,
          text: content.text,
          audioBase64: content.audio,
          timestamp: Date.now(),
          read: false
        };
        this.addToMemory(from, msg);
        this.messageListeners.forEach(cb => cb(msg));
      } catch (e) {
        // E2EE fail usually means key mismatch or session reset
      }
    });
  }

  private addToMemory(partnerId: string, msg: ChatMessage) {
    const existing = this.memoryHistory.get(partnerId) || [];
    this.memoryHistory.set(partnerId, [...existing, msg]);
  }

  async startSecureSession(targetId: string) {
    const pubKey = await cryptoService.getPublicKey();
    this.socket?.emit('relay:payload', {
      to: targetId,
      payload: { type: 'handshake', publicKey: pubKey, isInitiator: true }
    });
  }

  async sendMessage(to: string, senderId: string, text?: string, audio?: string) {
    const rawPayload = JSON.stringify({ text, audio });
    const encrypted = await cryptoService.encrypt(to, rawPayload);
    
    this.socket?.emit('relay:payload', { to, payload: encrypted });

    const msg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sessionId: to,
      senderId: senderId,
      text: text,
      audioBase64: audio,
      timestamp: Date.now(),
      read: true
    };
    this.addToMemory(to, msg);
    return msg;
  }

  getMemoryHistory(partnerId: string): ChatMessage[] {
    return this.memoryHistory.get(partnerId) || [];
  }

  subscribeToMessages(cb: (msg: ChatMessage) => void) {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  subscribeToPresence(cb: (users: UserProfile[]) => void) {
    this.presenceListeners.add(cb);
    return () => this.presenceListeners.delete(cb);
  }

  onSignal(cb: (data: any) => void) {
    this.socket?.on('signal:exchange', cb);
  }

  sendSignal(to: string, signal: any, type: string) {
    this.socket?.emit('signal:exchange', { to, signal, type });
  }

  // Knocking is just a handshake initiator
  async sendKnock(from: UserProfile, to: UserProfile): Promise<boolean> {
      await this.startSecureSession(to.id);
      return true;
  }
}

export const chatService = new ChatService();
