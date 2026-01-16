
import { auth, db, rtdb } from '../firebaseConfig';
import { signInAnonymously as firebaseSignInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment, runTransaction, onSnapshot } from "firebase/firestore";
import { ref, push, onChildAdded, remove, serverTimestamp, query, limitToLast } from "firebase/database";
import { UserProfile, ChatMessage, ChatSession, ChatRequest } from '../types';

// COST CONFIGURATION (USD cents equivalent, stored as integer credits)
export const COSTS = {
    CONNECTION: 5,
    AI_MATCH: 10,
    PHOTO_REVEAL: 2,
    PREMIUM_MSG: 1
};

let currentUserCache: UserProfile | null = null;

export const chatService = {
    // 1. AUTHENTICATION & WALLET
    // Creates a persistent wallet in Firestore, but anonymous Auth
    initializeUser: (): Promise<UserProfile> => {
        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                unsubscribe();
                if (firebaseUser) {
                    const profile = await ensureUserProfile(firebaseUser);
                    resolve(profile);
                } else {
                    try {
                        const cred = await firebaseSignInAnonymously(auth);
                        const profile = await ensureUserProfile(cred.user);
                        resolve(profile);
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        });
    },

    // Legacy alias for ChatPanel compatibility
    signInAnonymously: async (): Promise<UserProfile> => {
        return chatService.initializeUser();
    },

    // Listen to Wallet Balance Changes
    subscribeToWallet: (userId: string, callback: (credits: number) => void) => {
        return onSnapshot(doc(db, "users", userId), (doc) => {
            if (doc.exists()) {
                callback(doc.data().credits || 0);
            }
        });
    },

    // 2. SIGNALING (RTDB) - MESSAGES
    // Sends a message to the Relay. It does NOT store it permanently.
    sendMessage: async (sessionId: string, senderId: string, text?: string, image?: string, audio?: string) => {
        const signalRef = ref(rtdb, `signals/${sessionId}`);
        
        // Push payload to Relay
        // In a real production app, Cloud Functions would listen to this 'push',
        // forward it to the recipient via FCM or WebSocket, and then DELETE it immediately.
        // Here we simulate the relay by pushing to RTDB.
        
        await push(signalRef, {
            senderId,
            text: text || null,
            image: image || null, // Base64, ephemeral
            audio: audio || null,
            timestamp: serverTimestamp()
        });
        
        // Return dummy message for local optimisitic UI
        return {
            id: `temp_${Date.now()}`,
            sessionId,
            senderId,
            text,
            image, // Use 'image' property for ChatPanel compatibility
            audioBase64: audio,
            timestamp: Date.now(),
            read: false
        } as ChatMessage;
    },

    // Subscribe to incoming signals
    subscribeToSession: (sessionId: string, onMessage: (msg: ChatMessage) => void) => {
        const signalRef = ref(rtdb, `signals/${sessionId}`);
        const q = query(signalRef, limitToLast(1)); // Only care about new stuff

        return onChildAdded(q, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // CLIENT SIDE DELETION REQUEST
            // We ask the server to remove this node now that we've received it.
            // This ensures "Zero Storage" policy compliance.
            remove(snapshot.ref).catch(() => {}); 

            const msg: ChatMessage = {
                id: snapshot.key || Date.now().toString(),
                sessionId,
                senderId: data.senderId,
                text: data.text,
                imageBase64: data.image,
                image: data.image, // For compatibility
                audioBase64: data.audio,
                timestamp: Date.now(),
                expiresAt: Date.now() + (data.image ? 10000 : 3600000), // 10s for image, 1hr for text
            };
            onMessage(msg);
        });
    },

    // 3. TRANSACTIONS (Firestore)
    // Deducts credits securely
    deductCredits: async (userId: string, amount: number, action: string): Promise<boolean> => {
        const userRef = doc(db, "users", userId);
        
        try {
            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(userRef);
                if (!sfDoc.exists()) throw new Error("User does not exist!");

                const newBalance = (sfDoc.data().credits || 0) - amount;
                if (newBalance < 0) {
                    throw new Error("Insufficient Funds");
                }

                transaction.update(userRef, { credits: newBalance });
                
                // Optional: Add to audit log (not chat log!)
                // const auditRef = doc(collection(db, "audit_logs"));
                // transaction.set(auditRef, { userId, action, cost: amount, timestamp: serverTimestamp() });
            });
            return true;
        } catch (e) {
            console.error("Transaction failed: ", e);
            return false;
        }
    },

    // Mock "Buy Credits" (In production, this would be a Stripe Webhook)
    topUpWallet: async (userId: string, amount: number) => {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            credits: increment(amount)
        });
    },

    // Legacy Support (Stubs with correct signatures)
    getMyChats: (userId: string) => [] as ChatSession[],
    getIncomingKnocks: (userId: string) => [] as ChatRequest[],
    sendKnock: async (from: UserProfile, to: UserProfile) => true,
    acceptRequest: (requestId: string, currentUserId: string, partnerId: string) => ({ 
        id: 'demo_session', 
        participants: [currentUserId, partnerId], 
        lastActivity: Date.now(),
        updatedAt: Date.now(),
        lastMessage: null 
    } as ChatSession),
    rejectRequest: (requestId: string) => {},
    getMessages: (sessionId: string) => [] as ChatMessage[],
    simulateIncomingKnock: (botUser: UserProfile, targetUserId: string) => {}
};

// Internal Helper
async function ensureUserProfile(user: User): Promise<UserProfile> {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        const data = snap.data() as UserProfile;
        currentUserCache = data;
        return data;
    } else {
        const newProfile: UserProfile = {
            id: user.uid,
            name: `User-${user.uid.substring(0, 5)}`,
            avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${user.uid}`,
            credits: 10, // Starting bonus
            isAnonymous: true,
            country: 'Unknown',
            city: 'Unknown',
            age: 18,
            gender: 'other',
            status: 'online',
            safetyLevel: 'green',
            blockedUsers: [],
            bio: 'Crypto-native user',
            hasAgreedToRules: false,
            filters: { minAge: 18, maxAge: 99, countries: [], languages: [], genders: ['any'], soundEnabled: true }
        };
        await setDoc(userRef, newProfile);
        currentUserCache = newProfile;
        return newProfile;
    }
}
