// Import Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDdpYpOsFQA3bA-4vbLFbYAIBOjhBEXkm0",
  authDomain: "codesage-5b38f.firebaseapp.com",
  projectId: "codesage-5b38f",
  storageBucket: "codesage-5b38f.firebasestorage.app",
  messagingSenderId: "782715883034",
  appId: "1:782715883034:web:f40ac7120f181608bd4ba3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Google Login function
export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

// Phone OTP setup
export const setUpRecaptcha = (number) => {
  const recaptchaVerifier = new RecaptchaVerifier("recaptcha-container", {}, auth);
  return signInWithPhoneNumber(auth, number, recaptchaVerifier);
};
