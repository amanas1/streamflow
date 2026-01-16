
# StreamFlow E2EE Integration Test

## Setup
1. **Relay Server**:
   ```bash
   cd server
   npm install
   node server.js
   ```
2. **Frontend**:
   ```bash
   npm install
   npm run dev
   ```

## Test Plan

### 1. E2EE Message Verification
1. Open Browser A (Incognito) and Browser B (Incognito).
2. Enter the same Room/RoomID.
3. Observe **Server Logs**:
   - Only `register` and `encrypted-message` events should appear.
   - Payload must be `base64` gibberish (ciphertext) + `iv`. No plaintext.
4. Verify A and B both see the decrypted message correctly.

### 2. Ephemeral Media
1. Browser A: Send a photo.
2. Browser B: Open and view the photo.
3. Wait 10 seconds.
4. Verify the photo is removed from the DOM and RAM (object URL revoked).
5. Refresh Browser B. Verify the photo is gone and cannot be fetched from the server.

### 3. WebRTC Calls
1. Connect A and B.
2. Click "Audio Call" on A.
3. Accept on B.
4. Speak. Verify sound.
5. Check Browser DevTools -> `chrome://webrtc-internals`.
   - Verify `googActiveConnection` is `true`.
   - Verify ICE candidates show `relay` type if testing behind restrictive firewall (TURN).

### 4. Mobile (iOS) Compatibility
- Open on iPhone Safari.
- Send a voice message. Verify it uses `audio/mp4` and plays correctly on Android/Chrome.
