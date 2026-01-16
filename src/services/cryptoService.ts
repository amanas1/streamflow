
export class CryptoService {
    private keyPair: CryptoKeyPair | null = null;
    private sessions: Map<string, CryptoKey> = new Map(); // targetUserId -> derivedKey

    async init() {
        this.keyPair = await window.crypto.subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveKey"]
        );
    }

    async getPublicKey(): Promise<string> {
        if (!this.keyPair) await this.init();
        const exported = await window.crypto.subtle.exportKey("spki", this.keyPair!.publicKey);
        return btoa(String.fromCharCode(...new Uint8Array(exported)));
    }

    async deriveSessionKey(peerPublicKeyB64: string, userId: string) {
        if (!this.keyPair) await this.init();
        const peerKeyBuffer = Uint8Array.from(atob(peerPublicKeyB64), c => c.charCodeAt(0));
        const peerPublicKey = await window.crypto.subtle.importKey(
            "spki", peerKeyBuffer, { name: "ECDH", namedCurve: "P-256" }, false, []
        );

        const derivedKey = await window.crypto.subtle.deriveKey(
            { name: "ECDH", public: peerPublicKey },
            this.keyPair!.privateKey,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        this.sessions.set(userId, derivedKey);
    }

    async encrypt(userId: string, data: string): Promise<any> {
        const key = this.sessions.get(userId);
        if (!key) throw new Error("No secure session");

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(data);
        const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

        return {
            ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
            iv: btoa(String.fromCharCode(...iv))
        };
    }

    async decrypt(userId: string, encrypted: { ciphertext: string, iv: string }): Promise<string> {
        const key = this.sessions.get(userId);
        if (!key) throw new Error("No secure session");

        const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
        const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0));
        const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);

        return new TextDecoder().decode(decrypted);
    }
}

export const cryptoService = new CryptoService();
