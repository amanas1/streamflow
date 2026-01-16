
import { socketService } from './socketService';

class WebRtcService {
    private pc: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private config: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };

    onRemoteStream: ((stream: MediaStream) => void) | null = null;
    onCallStateChange: ((state: string) => void) | null = null;

    private cleanup() {
        this.localStream?.getTracks().forEach(t => t.stop());
        this.pc?.close();
        this.pc = null;
        this.localStream = null;
    }

    async initiateCall(to: string, type: 'audio' | 'video'): Promise<MediaStream> {
        this.cleanup();
        this.localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: type === 'video' 
        });
        
        this.pc = new RTCPeerConnection(this.config);
        this.localStream.getTracks().forEach(t => this.pc?.addTrack(t, this.localStream!));

        this.pc.onicecandidate = (e) => {
            if (e.candidate) socketService.sendSignal(to, { candidate: e.candidate }, 'ice');
        };

        this.pc.ontrack = (e) => {
            if (this.onRemoteStream) this.onRemoteStream(e.streams[0]);
        };

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        socketService.sendSignal(to, { sdp: offer }, type);

        return this.localStream;
    }

    async handleSignal(from: string, data: any) {
        if (data.sdp) {
            if (data.sdp.type === 'offer') {
                this.localStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true, 
                    video: true // Callee prepares for either
                });
                
                this.pc = new RTCPeerConnection(this.config);
                this.localStream.getTracks().forEach(t => this.pc?.addTrack(t, this.localStream!));
                
                this.pc.onicecandidate = (e) => {
                    if (e.candidate) socketService.sendSignal(from, { candidate: e.candidate }, 'ice');
                };

                this.pc.ontrack = (e) => {
                    if (this.onRemoteStream) this.onRemoteStream(e.streams[0]);
                };

                await this.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                const answer = await this.pc.createAnswer();
                await this.pc.setLocalDescription(answer);
                socketService.sendSignal(from, { sdp: answer }, 'answer');
            } else {
                await this.pc?.setRemoteDescription(new RTCSessionDescription(data.sdp));
            }
        } else if (data.candidate) {
            await this.pc?.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    }

    hangup(to?: string) {
        if (to) socketService.sendSignal(to, {}, 'hangup');
        this.cleanup();
        if (this.onCallStateChange) this.onCallStateChange('ended');
    }
}

export const webrtcService = new WebRtcService();
