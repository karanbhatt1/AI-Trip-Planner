import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";

export default function EditProfilePage() {
  const { user, updateProfile, deleteAccount, logout } = useAuth();
  const navigate = useNavigate();

  const initialValues = useMemo(
    () => ({
      name: user?.username || "",
      phone: user?.phone || "",
      email: user?.email || "",
      profilePicture: user?.profilePicture || "",
    }),
    [user]
  );

  const [formData, setFormData] = useState(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setFormData(initialValues);
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size should be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setFormData((prev) => ({ ...prev, profilePicture: result }));
      setError("");
      setSuccess("Profile photo selected. Save changes to apply.");
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setFormData((prev) => ({ ...prev, profilePicture: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
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

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "This will permanently delete your account and saved trips. Do you want to continue?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setIsDeleting(true);

    try {
      await deleteAccount();
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await logout({ notifyBackend: false });
        navigate("/");
        return;
      }
      setError(err.message || "Failed to delete account.");
    } finally {
      setIsDeleting(false);
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
          <div className="flex items-center gap-4">
            {formData.profilePicture ? (
              <img
                src={formData.profilePicture}
                alt="Profile preview"
                className="w-16 h-16 rounded-full object-cover border border-teal-400"
              />
            ) : (
              <div className="w-16 h-16 rounded-full border border-slate-600 bg-slate-800 flex items-center justify-center text-xl text-slate-300">
                {formData.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}

            <div className="flex-1">
              <label htmlFor="profileUpload" className="block text-sm text-slate-300 mb-2">
                Upload Profile Photo
              </label>
              <input
                id="profileUpload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-teal-500 file:text-slate-900 file:font-semibold hover:file:bg-teal-400"
              />
            </div>
          </div>

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
            <label htmlFor="phone" className="block text-sm text-slate-300 mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+919999999999"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-slate-300 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={clearPhoto}
              className="px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:border-slate-400 transition"
            >
              Remove Current Photo
            </button>
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

        <div className="mt-8 border-t border-slate-700 pt-6">
          <h2 className="text-lg font-semibold text-red-300">Danger Zone</h2>
          <p className="text-sm text-slate-400 mt-1">
            Deleting your account is permanent and will remove your saved trips.
          </p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="mt-4 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
