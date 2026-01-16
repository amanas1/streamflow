
# StreamFlow Pro - Production Blind Relay

Strict real-time communication platform built with **E2EE** and **WebRTC**.

## 🛡 Security Architecture
- **Stateless Blind Relay**: The Node.js server does not possess a database or persistent storage. It routes encrypted packets between peer sessions in RAM.
- **Client-Side Encryption**: 256-bit AES-GCM via Web Crypto API. Handshake via ECDH.
- **Ephemeral UI**: All message history is stored in React state. Refreshing the browser permanently clears all local session data.
- **Peer-to-Peer Media**: Voice and Video calls utilize RTCPeerConnection for direct encrypted streams.

## 🛠 Deployment

### 1. Hardened Relay Server
```bash
cd server
npm install
node server.js
```

### 2. Frontend
```bash
npm install
npm run dev
```

## 📱 Compliance & Permissions
- Access to **Microphone** and **Camera** is strictly for active WebRTC calls and voice messages.
- No device fingerprinting or background data collection is implemented.
