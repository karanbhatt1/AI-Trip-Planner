import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../services/apiClient";
import { apiRequest } from "../services/apiClient";
import ItineraryDisplay from "../components/ItineraryDisplay";

function getInitials(name, email) {
  const base = name || email || "U";
  const parts = base.split(" ").filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

export default function DashboardPage() {
  const { user, token, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentTrips, setRecentTrips] = useState([]);
  const [expandedTripId, setExpandedTripId] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setError("");

      try {
        await refreshProfile();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await logout({ notifyBackend: false });
          navigate("/");
          return;
        }
        setError(err.message || "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [refreshProfile, logout, navigate]);

  useEffect(() => {
    const loadRecentTrips = async () => {
      if (!user?.firebaseUid || !token) {
        return;
      }

      try {
        const response = await apiRequest(`/api/v1/trip/user/${user.firebaseUid}`, { token });
        setRecentTrips(Array.isArray(response) ? response.slice(0, 3) : []);
      } catch {
        setRecentTrips([]);
      }
    };

    loadRecentTrips();
  }, [user?.firebaseUid, token]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-300 animate-pulse">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:justify-between">
            <div className="flex items-center gap-4">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt="Profile"
                  className="w-18 h-18 rounded-full object-cover border border-teal-400"
                />
              ) : (
                <div className="w-18 h-18 rounded-full bg-teal-500/20 border border-teal-400 text-teal-300 flex items-center justify-center font-bold text-xl">
                  {getInitials(user?.username, user?.email)}
                </div>
              )}

              <div>
                <p className="text-slate-400 text-sm">Welcome back</p>
                <h1 className="text-2xl font-bold">{user?.username || "Traveler"}</h1>
                <p className="text-slate-300">{user?.email || "No email available"}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                to="/"
                className="px-4 py-2 rounded-lg border border-slate-500 text-slate-300 hover:bg-slate-500/10 transition"
              >
                Home
              </Link>
              <Link
                to="/profile/edit"
                className="px-4 py-2 rounded-lg border border-teal-500 text-teal-300 hover:bg-teal-500/10 transition"
              >
                Edit Profile
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-500/90 hover:bg-red-500 text-white transition cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {error ? (
              <p className="md:col-span-3 text-sm text-red-400">{error}</p>
            ) : null}
            <Link
              to="/"
              className="p-4 rounded-xl border border-slate-700 hover:border-teal-500 transition bg-slate-800/60"
            >
              <h3 className="font-semibold text-lg">Explore Destinations</h3>
              <p className="text-sm text-slate-400 mt-1">Discover new places and plan your next itinerary.</p>
            </Link>

            <Link
              to="/"
              className="p-4 rounded-xl border border-slate-700 hover:border-teal-500 transition bg-slate-800/60"
            >
              <h3 className="font-semibold text-lg">Plan a New Trip</h3>
              <p className="text-sm text-slate-400 mt-1">Use AI planner with your budget, dates, and preferences.</p>
            </Link>

            <Link
              to="/dashboard/itineraries"
              className="p-4 rounded-xl border border-slate-700 hover:border-teal-500 transition bg-slate-800/60"
            >
              <h3 className="font-semibold text-lg">Saved Itineraries</h3>
              <p className="text-sm text-slate-400 mt-1">See every trip you have already saved.</p>
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold">Recent Saved Itineraries</h2>
                <p className="text-sm text-slate-400 mt-1">Open a trip to review its day cards and edit checkpoints.</p>
              </div>
              <Link
                to="/dashboard/itineraries"
                className="px-4 py-2 rounded-lg border border-teal-500 text-teal-300 hover:bg-teal-500/10 transition"
              >
                View All
              </Link>
            </div>

            {recentTrips.length > 0 ? (
              <div className="space-y-4">
                {recentTrips.map((trip) => {
                  const destinationName = trip.destinations?.[0] || "Saved itinerary";
                  const isExpanded = expandedTripId === trip._id;

                  return (
                    <article
                      key={trip._id}
                      className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 hover:border-teal-500 transition"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedTripId(isExpanded ? "" : trip._id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs text-teal-300 mb-2">{trip.budget || "Trip"}</p>
                            <h3 className="font-semibold text-white text-lg">{destinationName}</h3>
                            <p className="text-xs text-slate-400 mt-2">
                              {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : "N/A"} → {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : "N/A"}
                            </p>
                          </div>
                          <span className="text-xs px-3 py-1 rounded-full border border-slate-600 text-slate-300">
                            {isExpanded ? "Collapse" : "Expand"}
                          </span>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="mt-4 border-t border-slate-700 pt-4">
                          <ItineraryDisplay
                            itineraryText={trip.itinerary}
                            itineraryStructured={trip.itineraryStructured}
                            className="mt-0"
                            readOnly
                            initialExpandedDays={new Set()}
                          />
                          <Link
                            to="/dashboard/itineraries"
                            className="mt-4 inline-flex px-4 py-2 rounded-lg border border-teal-500 text-teal-300 hover:bg-teal-500/10 transition"
                          >
                            Open itinerary
                          </Link>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No saved itineraries yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
