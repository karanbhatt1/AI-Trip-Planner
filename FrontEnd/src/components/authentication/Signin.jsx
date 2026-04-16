import { useState } from "react";

export default function Signin({ 
  onSendOtp = () => {}, 
  onGoogleSignin = () => {}, 
  loading 
}) {
  const [phone, setPhone] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault(); // stop page reload
    const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;
    if (!phone) {
      alert("Please enter phone number");
      return;
    }

    if (!phoneRegex.test(phone)) {
      alert("Enter a valid Indian mobile number");
      return;
    }

    onSendOtp(phone.replace(/\D/g, ""));
  };

  return (
    <div className=" border-teal-400 border-2  rounded-2xl flex justify-center h-max">
      <form
        onSubmit={handleSubmit}
        className=" h-3/4 w-2xl justify-center form-font flex flex-col gap-4 p-2 m-3"
      >
        <section className="flex flex-col gap-1">
          <label
            htmlFor="Contact"
            className="font-[Roboto] text-lg text-slate-300"
          >
            Contact
          </label>
          <input
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
            }}
            required
            className="w-full bg-slate-900 text-white placeholder-slate-400 
          border border-slate-700 rounded-lg px-4 py-2.5
          focus:ring-2
          focus:ring-teal-400"
            id="Contact"
            type="tel"
            placeholder="+91-XXXXX-XXXXX"
          />
        </section>

        <section className="flex flex-col justify-center gap-3 p-0 m-0">
          <button
            type="submit"
            disabled={loading}
            className="font-[Roboto] p-1 cursor-pointer bg-blue-400 border-4 border-blue-950 text-xl font-bold rounded-xl text-black disabled:opacity-50"
          >
            {loading ? "Sending..." : "Signin"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (onGoogleSignin) {
                onGoogleSignin();
              } else {
                console.error("onGoogleSignin not provided");
              }
            }}
            className="
                w-full flex items-center justify-center gap-3
                border border-slate-600 rounded-lg p-2
                text-white hover:bg-slate-800 transition
                cursor-pointer
              "
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="google"
              className="w-5 h-5 cursor-pointer"
            />
            Sign in with Google
          </button>
        </section>
      </form>
    </div>
  );
}
