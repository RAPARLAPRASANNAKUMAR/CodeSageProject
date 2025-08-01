import React, { useState } from "react";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import { initializeApp } from "firebase/app";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDdpYpOsFQA3bA-4vbLFbYAIBOjhBEXkm0",
  authDomain: "codesage-5b38f.firebaseapp.com",
  projectId: "codesage-5b38f",
  storageBucket: "codesage-5b38f.firebasestorage.app",
  messagingSenderId: "782715883034",
  appId: "1:782715883034:web:f40ac7120f181608bd4ba3"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  // --- Google Login ---
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      alert("Google login successful!");
    } catch (error) {
      alert(error.message);
    }
  };

  // --- Phone Number Login ---
  const handlePhoneLogin = async () => {
    try {
      const recaptchaVerifier = new RecaptchaVerifier(
        "recaptcha-container",
        { size: "invisible" },
        auth
      );
      const result = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
      setConfirmationResult(result);
      alert("OTP sent!");
    } catch (error) {
      alert(error.message);
    }
  };

  // --- Verify OTP ---
  const handleVerifyOtp = async () => {
    try {
      await confirmationResult.confirm(otp);
      alert("Phone login successful!");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px", color: "white" }}>
      <h2>Login to CodeSage</h2>
      
      <button onClick={handleGoogleLogin} style={{ margin: "10px", padding: "10px" }}>
        Login with Google
      </button>

      <div style={{ marginTop: "20px" }}>
        <input
          type="text"
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ padding: "8px", margin: "5px" }}
        />
        <button onClick={handlePhoneLogin} style={{ padding: "8px" }}>
          Send OTP
        </button>
      </div>

      {confirmationResult && (
        <div style={{ marginTop: "20px" }}>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            style={{ padding: "8px", margin: "5px" }}
          />
          <button onClick={handleVerifyOtp} style={{ padding: "8px" }}>
            Verify OTP
          </button>
        </div>
      )}

      <div id="recaptcha-container"></div>
    </div>
  );
}

export default Login;
