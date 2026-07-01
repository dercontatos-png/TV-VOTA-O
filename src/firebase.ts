import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Support both Netlify production environment variables and the local JSON config file
const firebaseConfig = {
  apiKey: "AIzaSyCbV6fYASjXyHmDxvWuigMDpuDZ4eiywYE",
  authDomain: "gen-lang-client-0659424330.firebaseapp.com",
  projectId: "gen-lang-client-0659424330",
  storageBucket: "gen-lang-client-0659424330.firebasestorage.app",
  messagingSenderId: "478292464271",
  appId: "1:478292464271:web:a4e15c2cb6a10e0399d6fa",
  measurementId: "",
  firestoreDatabaseId: "ai-studio-votaocraquedocam-5173c2d6-4b3f-4de4-9904-aa0c4d1091ca",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Initialize Firestore using the designated database ID to support custom or standard instances in production
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
