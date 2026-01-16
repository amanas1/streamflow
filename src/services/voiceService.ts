
class VoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4' // iOS Fallback
      };
      
      this.mediaRecorder = new MediaRecorder(stream, options);
      this.chunks = [];
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      
      this.mediaRecorder.start();
    } catch (err) {
      console.error("Voice recording failed:", err);
      throw err;
    }
  }

  async stopRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) return reject("No active recording");

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Cleanup tracks
          this.mediaRecorder?.stream.getTracks().forEach(t => t.stop());
          this.mediaRecorder = null;
          resolve(base64data);
        };
      };

      this.mediaRecorder.stop();
    });
  }
}

export const voiceService = new VoiceService();
