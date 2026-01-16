
import { auth, db, rtdb } from '../firebaseConfig';
import { signInAnonymously as firebaseSignInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment, runTransaction, onSnapshot } from "firebase/firestore";
import { ref, push, onChildAdded, remove, serverTimestamp, query, limitToLast, set } from "firebase/database";
import { UserProfile, ChatMessage, ChatSession, ChatRequest } from '../types';

export const COSTS = {
    CONNECTION: 5,
    AI_MATCH: 10,
    PHOTO_REVEAL: 2,
    PREMIUM_MSG: 1
};

export const chatService = {
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

    signInAnonymously: async (): Promise<UserProfile> => {
        return chatService.initializeUser();
    },

    sendMessage: async (sessionId: string, senderId: string, text?: string, image?: string, audio?: string) => {
        const signalRef = ref(rtdb, `signals/${sessionId}/messages`);
        await push(signalRef, {
            senderId,
            text: text || null,
            image: image || null,
            audio: audio || null,
            timestamp: serverTimestamp()
        });
        return { id: `temp_${Date.now()}`, sessionId, senderId, text, image, audioBase64: audio, timestamp: Date.now(), read: false } as ChatMessage;
    },

    subscribeToSession: (sessionId: string, onMessage: (msg: ChatMessage) => void) => {
        const signalRef = ref(rtdb, `signals/${sessionId}/messages`);
        const q = query(signalRef, limitToLast(1));
        return onChildAdded(q, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            remove(snapshot.ref);
            onMessage({
                id: snapshot.key || Date.now().toString(),
                sessionId,
                senderId: data.senderId,
                text: data.text,
                image: data.image,
                audioBase64: data.audio,
                timestamp: Date.now(),
                read: false
            });
        });
    },

    // CALL SIGNALING IMPROVED
    sendCallSignal: async (sessionId: string, senderId: string, signal: any) => {
        const callSignalRef = ref(rtdb, `signals/${sessionId}/calls`);
        await push(callSignalRef, {
            ...signal,
            senderId,
            timestamp: serverTimestamp()
        });
    },

    subscribeToCallSignals: (sessionId: string, onSignal: (signal: any) => void) => {
        const callSignalRef = ref(rtdb, `signals/${sessionId}/calls`);
        return onChildAdded(callSignalRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                remove(snapshot.ref);
                onSignal(data);
            }
        });
    },

    getMyChats: (userId: string) => [] as ChatSession[],
    getIncomingKnocks: (userId: string) => [] as ChatRequest[],
    sendKnock: async (from: UserProfile, to: UserProfile) => true,
    acceptRequest: (requestId: string, currentUserId: string, partnerId: string) => ({ 
        id: `chat_${[currentUserId, partnerId].sort().join('_')}`, 
        participants: [currentUserId, partnerId], 
        lastActivity: Date.now() 
    } as ChatSession),
    rejectRequest: (requestId: string) => {},
    getMessages: (sessionId: string) => [] as ChatMessage[],
};

async function ensureUserProfile(user: User): Promise<UserProfile> {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) return snap.data() as UserProfile;
    const newProfile: UserProfile = {
        id: user.uid, name: `User-${user.uid.substring(0, 5)}`, avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${user.uid}`,
        credits: 10, isAnonymous: true, country: 'Unknown', city: 'Unknown', age: 18, gender: 'other', status: 'online',
        safetyLevel: 'green', blockedUsers: [], bio: 'New user', hasAgreedToRules: false,
        filters: { minAge: 18, maxAge: 99, countries: [], languages: [], genders: ['any'], soundEnabled: true }
    };
    await setDoc(userRef, newProfile);
    return newProfile;
}
