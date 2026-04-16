import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";

export default function EditProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const initialValues = useMemo(
    () => ({
      name: user?.username || "",
      profilePicture: user?.profilePicture || "",
    }),
    [user]
  );

  const [formData, setFormData] = useState(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const payload = {
        name: formData.name,
        profilePicture: formData.profilePicture || null,
      };

      await updateProfile(payload);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await logout({ notifyBackend: false });
        navigate("/");
        return;
      }
      setError(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <div className="max-w-2xl mx-auto bg-slate-900/80 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <Link
            to="/dashboard"
            className="text-sm text-teal-300 hover:text-teal-200 transition"
          >
            Back to Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm text-slate-300 mb-2">
              Name
            </label>
            <input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              minLength={2}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label htmlFor="profilePicture" className="block text-sm text-slate-300 mb-2">
              Profile Picture URL (optional)
            </label>
            <input
              id="profilePicture"
              name="profilePicture"
              type="url"
              value={formData.profilePicture}
              onChange={handleChange}
              placeholder="https://example.com/photo.jpg"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 outline-none focus:border-teal-400"
            />
          </div>

          {error ? <p className="text-red-400 text-sm">{error}</p> : null}
          {success ? <p className="text-green-400 text-sm">{success}</p> : null}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-lg bg-teal-500 text-slate-900 font-semibold py-3 hover:bg-teal-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
