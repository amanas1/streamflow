
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Configuration uses process.env.API_KEY or a placeholder for development
const firebaseConfig = {
  apiKey: process.env.API_KEY || "PLACEHOLDER_API_KEY",
  authDomain: "streamflow-pro.firebaseapp.com",
  databaseURL: "https://streamflow-pro-default-rtdb.firebaseio.com",
  projectId: "streamflow-pro",
  storageBucket: "streamflow-pro.appspot.com",
  messagingSenderId: "00000000000",
  appId: "1:00000000000:web:00000000000000"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app); // For Wallet/Credits (Persistent)
export const rtdb = getDatabase(app); // For Chat Signals (Ephemeral)
