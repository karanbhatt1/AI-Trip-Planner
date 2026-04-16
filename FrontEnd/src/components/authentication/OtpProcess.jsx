import { useState } from "react";
// import { auth } from "../firebase";
import { signInWithPhoneNumber } from "firebase/auth";

export default function OtpProcess({ phone, confirmationResult }) {
  const [otp, setOtp] = useState("");

  // ✅ Verify OTP
  const handleVerifyOtp = async () => {
  try {
    const finalConfirmation =
      confirmationResult || window.confirmationResult;

    if (!finalConfirmation) {
      alert("Session expired. Please try again.");
      return;
    }

    const result = await finalConfirmation.confirm(otp);
    const user = result.user;

    console.log("User logged in:", user);
    alert("Login successful ✅");

    await fetch("http://localhost:5000/api/auth/verify", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ token }),
});

    const token = await user.getIdToken();
    console.log("Token:", token);

  } catch (error) {
    console.error(error);
    alert("Invalid OTP ❌");
  }
};

  // 🔁 Resend OTP
  const handleResendOtp = async () => {
  try {
    const result = await signInWithPhoneNumber(
      auth,
      phone,
      window.recaptchaVerifier
    );

    alert("OTP resent 🔁");

    // store globally as fallback
    window.confirmationResult = result;

  } catch (error) {
    console.error(error);
    alert("Error resending OTP");
  }
};

  return (
    <div className="w-full h-full flex flex-col justify-center gap-4 text-center">
      <div className="mx-auto flex flex-col items-center justify-center border-2 border-teal-400 rounded-xl w-[360px] h-[360px] gap-4">

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
            className="bg-green-500 font-bold rounded p-2 cursor-pointer"
          >
            Verify OTP
          </button>

          <button
            onClick={handleResendOtp}
            className="bg-blue-300 font-bold rounded p-2 cursor-pointer"
          >
            Resend OTP
          </button>
        </section>

      </div>
    </div>
  );
}