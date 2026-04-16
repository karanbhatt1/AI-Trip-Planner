import { useState, useEffect } from "react";
import Signin from "./Signin";
import OtpProcess from "./OtpProcess";
// Import the initialized auth from your firebase.js
import { auth, googleProvider } from "../../firebase";
import {
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function AuthModal({ onClose }) {
  const [step, setStep] = useState("signin");
  const [phone, setPhone] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { loginWithSessionToken } = useAuth();
  const navigate = useNavigate();

  const completeLogin = async (sessionToken) => {
    await loginWithSessionToken(sessionToken);
    onClose();
    navigate('/dashboard');
  };

  // ✅ Initialize Recaptcha
  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) return window.recaptchaVerifier;

    try {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container", // Ensure this ID exists in the HTML below
        {
          size: "invisible",
          callback: () => console.log("reCAPTCHA verified"),
          "expired-callback": () => {
            window.recaptchaVerifier?.clear();
            window.recaptchaVerifier = null;
          },
        },
      );
      return window.recaptchaVerifier;
    } catch (error) {
      console.error("Recaptcha Setup Error:", error);
      return null;
    }
  };

  // ✅ Google Sign-in
  const handleGoogleSignin = async () => {
    try {
      setError("");
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();
      const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to verify sign-in");
      }

      if (data.sessionToken) {
        await completeLogin(data.sessionToken);
      }

      console.log("Welcome:", result.user.displayName);
    } catch (error) {
      console.error("Google Auth Error:", error);
      setError(error.message || "Google sign-in failed");
    }
  };

  // ✅ Phone OTP logic
  const handleSendOtp = async (number) => {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const appVerifier = setupRecaptcha();
      if (!appVerifier) throw new Error("Recaptcha initialization failed");

      const formattedPhone = number.startsWith("+") ? number : `+91${number}`;

      const result = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        appVerifier,
      );

      setConfirmationResult(result);
      setPhone(formattedPhone);
      setStep("otp");
    } catch (error) {
      console.error("OTP Error:", error);
      setError(error.message || "Failed to send OTP. Check console.");
      // Reset recaptcha on failure so user can try again
      window.recaptchaVerifier?.clear();
      window.recaptchaVerifier = null;
    } finally {
      setLoading(false);
    }
  };

  // Prevent scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative bg-slate-900/95 border border-teal-400/30 rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col">
        {/* Branding */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Plan <span className="text-teal-400">•</span> Pack{" "}
            <span className="text-teal-400">•</span> Go
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Your AI Travel Companion
          </p>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        {step === "signin" ? (
          <Signin
            loading={loading}
            onGoogleSignin={handleGoogleSignin}
            onSendOtp={handleSendOtp}
          />
        ) : (
          <OtpProcess
            phone={phone}
            confirmationResult={confirmationResult}
            onSessionToken={completeLogin}
          />
        )}

        {error ? <p className="text-sm text-red-400 mt-3 text-center">{error}</p> : null}

        {/* ✅ Container MUST be outside conditional rendering to stay in DOM */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}
