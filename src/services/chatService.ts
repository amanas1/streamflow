
import { auth, db, rtdb } from '../firebaseConfig';
import { signInAnonymously as firebaseSignInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment, runTransaction, onSnapshot, collection, query, where, getDocs, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { ref, push, onChildAdded, remove, serverTimestamp as rtdbTimestamp, query as rtdbQuery, limitToLast } from "firebase/database";
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

    // 1. SAVE PROFILE TO CLOUD
    updateUserProfile: async (userId: string, data: Partial<UserProfile>) => {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            ...data,
            lastSeen: Date.now(),
            status: 'online'
        });
    },

    // 2. LIVE DISCOVERY FROM FIRESTORE
    getLiveUsers: async (currentUserId: string): Promise<UserProfile[]> => {
        const usersRef = collection(db, "users");
        // Show users active in the last 10 minutes
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        const q = query(
            usersRef, 
            where("lastSeen", ">", tenMinutesAgo),
            orderBy("lastSeen", "desc"),
            limit(20)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(doc => doc.data() as UserProfile)
            .filter(user => user.id !== currentUserId);
    },

    // 3. MESSAGING & CALL SIGNALS (RTDB)
    sendMessage: async (sessionId: string, senderId: string, text?: string, image?: string, audio?: string) => {
        const signalRef = ref(rtdb, `signals/${sessionId}/messages`);
        await push(signalRef, {
            senderId,
            text: text || null,
            image: image || null,
            audio: audio || null,
            timestamp: rtdbTimestamp()
        });
    },

    subscribeToSession: (sessionId: string, onMessage: (msg: ChatMessage) => void) => {
        const signalRef = ref(rtdb, `signals/${sessionId}/messages`);
        const q = rtdbQuery(signalRef, limitToLast(1));
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

    sendCallSignal: async (sessionId: string, senderId: string, signal: any) => {
        const callSignalRef = ref(rtdb, `signals/${sessionId}/calls`);
        await push(callSignalRef, {
            ...signal,
            senderId,
            timestamp: rtdbTimestamp()
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

    acceptRequest: (currentUserId: string, partnerId: string) => ({ 
        id: `chat_${[currentUserId, partnerId].sort().join('_')}`, 
        participants: [currentUserId, partnerId], 
        lastActivity: Date.now() 
    } as ChatSession),
    
    getMyChats: (userId: string) => [] as ChatSession[],
    getIncomingKnocks: (userId: string) => [] as ChatRequest[],
    sendKnock: async (from: UserProfile, to: UserProfile) => true,
    rejectRequest: (requestId: string) => {},
    getMessages: (sessionId: string) => [] as ChatMessage[],
};

async function ensureUserProfile(user: User): Promise<UserProfile> {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
        const data = snap.data() as UserProfile;
        // Update presence on every init
        await updateDoc(userRef, { lastSeen: Date.now(), status: 'online' });
        return data;
    }
    // Fix: lastSeen is now properly defined in the UserProfile interface within types.ts
    const newProfile: UserProfile = {
        id: user.uid, name: `Guest-${user.uid.substring(0, 5)}`, avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${user.uid}`,
        credits: 10, isAnonymous: true, country: 'Unknown', city: 'Unknown', age: 18, gender: 'other', status: 'online',
        safetyLevel: 'green', blockedUsers: [], bio: 'New user', hasAgreedToRules: false, lastSeen: Date.now(),
        filters: { minAge: 18, maxAge: 99, countries: [], languages: [], genders: ['any'], soundEnabled: true }
    };
    await setDoc(userRef, newProfile);
    return newProfile;
}
