import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAMnq56brn4IE3TCd_M1-_KvjOGSu7gamI",
  authDomain: "healthcare-24c0c.firebaseapp.com",
  projectId: "healthcare-24c0c",
  storageBucket: "healthcare-24c0c.firebasestorage.app",
  messagingSenderId: "916308799962",
  appId: "1:916308799962:web:3cbbb52a290f45ac0950e3",
  measurementId: "G-PTL8PPTWZ2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
