import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCv9ZQddRac5s4VAB48EsKL22cus_dDydk",
  authDomain: "astrotarot-3bc2a.firebaseapp.com",
  projectId: "astrotarot-3bc2a",
  storageBucket: "astrotarot-3bc2a.firebasestorage.app",
  messagingSenderId: "573753317402",
  appId: "1:573753317402:web:63f23b5d3599c2d4bf19a3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Auth Providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

export { app, auth, db, googleProvider, facebookProvider };
