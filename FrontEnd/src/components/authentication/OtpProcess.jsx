import { useState } from "react";
import { auth } from "../../firebase";
import { signInWithPhoneNumber } from "firebase/auth";
import { ApiError, apiRequest } from "../../services/apiClient";

export default function OtpProcess({ phone, confirmationResult, onSessionToken }) {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");

  // ✅ Verify OTP
  const handleVerifyOtp = async () => {
  setIsVerifying(true);
  setError("");
  try {
    const finalConfirmation =
      confirmationResult || window.confirmationResult;

    if (!finalConfirmation) {
      alert("Session expired. Please try again.");
      return;
    }

    const result = await finalConfirmation.confirm(otp);
    const user = result.user;
    const token = await user.getIdToken();

    console.log("User logged in:", user);

    const data = await apiRequest("/api/auth/verify", {
      method: "POST",
      body: { token },
    });

    if (data.sessionToken) {
      await onSessionToken?.(data.sessionToken);
    }

    console.log("Token:", token);

  } catch (error) {
    console.error(error);
    if (error instanceof ApiError) {
      setError(error.message || "OTP verification failed");
      return;
    }
    setError(error.message || "Invalid OTP");
  } finally {
    setIsVerifying(false);
  }
};

  // 🔁 Resend OTP
  const handleResendOtp = async () => {
  setIsResending(true);
  setError("");
  try {
    const result = await signInWithPhoneNumber(
      auth,
      phone,
      window.recaptchaVerifier
    );

    // store globally as fallback
    window.confirmationResult = result;

  } catch (error) {
    console.error(error);
    setError("Error resending OTP");
  } finally {
    setIsResending(false);
  }
};

  return (
    <div className="w-full h-full flex flex-col justify-center gap-4 text-center">
      <div className="mx-auto flex flex-col items-center justify-center border-2 border-teal-400 rounded-xl w-90 h-90 gap-4">

        <p className="text-white">OTP sent to {phone}</p>

        <section className="flex justify-center">
          <input
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="bg-slate-800 text-white p-2 rounded m-2 h-10 w-3/4 text-center"
          />
        </section>

        <section className="flex flex-row justify-center gap-4">
          <button
            onClick={handleVerifyOtp}
            disabled={isVerifying}
            className="bg-green-500 font-bold rounded p-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isVerifying ? "Verifying..." : "Verify OTP"}
          </button>

          <button
            onClick={handleResendOtp}
            disabled={isResending}
            className="bg-blue-300 font-bold rounded p-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isResending ? "Sending..." : "Resend OTP"}
          </button>
        </section>

        {error ? <p className="text-sm text-red-400 px-4">{error}</p> : null}

      </div>
    </div>
  );
}