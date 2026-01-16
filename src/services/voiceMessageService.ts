
import { wsService } from './wsService';
import { cryptoService } from './cryptoService';

class VoiceMessageService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];

    async startRecording() {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Standard check for cross-browser compatibility (iOS Safari vs others)
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        
        this.mediaRecorder = new MediaRecorder(stream, { mimeType });
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) this.audioChunks.push(event.data);
        };

        this.mediaRecorder.start();
    }

    async stopAndSend(toUserId: string) {
        return new Promise<void>((resolve) => {
            if (!this.mediaRecorder) return resolve();

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks);
                const reader = new FileReader();
                
                reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    const mediaId = `vmsg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    
                    // Encrypt the fact that we have media for this user
                    const encryptedNotice = await cryptoService.encrypt(toUserId, JSON.stringify({
                        type: 'voice-message',
                        mediaId
                    }));
                    
                    // Send media to relay
                    await wsService.uploadMedia(toUserId, mediaId, base64);
                    // Notify peer via E2EE
                    wsService.sendEncrypted(toUserId, encryptedNotice);
                    
                    this.mediaRecorder?.stream.getTracks().forEach(t => t.stop());
                    resolve();
                };
                
                reader.readAsDataURL(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }
}

export const voiceMessageService = new VoiceMessageService();
