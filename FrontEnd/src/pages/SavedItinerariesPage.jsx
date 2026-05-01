import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import ConfirmDialog from "../components/ConfirmDialog";
import Toast from "../components/Toast";
import RouteVisualizerSection from "../components/RouteVisualizerSection";
import ItineraryDisplay from "../components/ItineraryDisplay";
import {
  flattenCheckpoints,
  normalizeStructuredItinerary,
  structuredToMarkdown,
} from "../utils/itineraryParser";

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString();
}

export default function SavedItinerariesPage() {
  const { user, token, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedView, setSelectedView] = useState("summary");
  const [editingTripId, setEditingTripId] = useState("");
  const [isUpdatingTrip, setIsUpdatingTrip] = useState(false);
  const [tripActionError, setTripActionError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, tripId: null });
  const [toast, setToast] = useState({ isOpen: false, type: 'info', title: '', message: '' });
  const [editableStructuredItinerary, setEditableStructuredItinerary] = useState(null);
  const [editableSavedItinerary, setEditableSavedItinerary] = useState("");
  const [editTripForm, setEditTripForm] = useState({
    startDate: "",
    endDate: "",
    travelers: "1",
    budget: "",
    interests: "",
    destinations: "",
    specialRequirements: "",
  });

  const formatDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isValidDateInput = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const [yearPart, monthPart, dayPart] = value.split("-").map(Number);
    if (!yearPart || !monthPart || !dayPart) {
      return false;
    }

    const parsed = new Date(`${value}T00:00:00`);
    return (
      parsed.getFullYear() === yearPart &&
      parsed.getMonth() + 1 === monthPart &&
      parsed.getDate() === dayPart
    );
  };

  const toCsv = (value) => (Array.isArray(value) ? value.join(", ") : "");

  const getTripUpdatePayload = (trip, overrides = {}) => ({
    startDate: trip.startDate ? formatDateInput(new Date(trip.startDate)) : "",
    endDate: trip.endDate ? formatDateInput(new Date(trip.endDate)) : "",
    travelers: String(trip.travelers ?? 1),
    budget: trip.budget || "",
    interests: Array.isArray(trip.interests) ? trip.interests : [],
    destinations: Array.isArray(trip.destinations) ? trip.destinations : [],
    specialRequirements: trip.specialRequirements || "",
    ...overrides,
  });

  const saveStructuredItinerary = async (updatedStructured) => {
    if (!selectedTrip?._id) {
      return;
    }

    const normalized = normalizeStructuredItinerary(updatedStructured, editableSavedItinerary);
    const markdown = structuredToMarkdown(normalized);
    const checkpoints = flattenCheckpoints(normalized);

    setEditableStructuredItinerary(normalized);
    setEditableSavedItinerary(markdown);

    try {
      const response = await apiRequest(`/api/v1/trip/${selectedTrip._id}`, {
        method: "PUT",
        token,
        body: getTripUpdatePayload(selectedTrip, {
          itinerary: markdown,
          itineraryStructured: normalized,
          checkpoints,
        }),
      });

      if (response?.trip) {
        updateTripInState(response.trip);
      }

      setTripActionError("");
    } catch (err) {
      setTripActionError(err.message || "Failed to save itinerary changes.");
    }
  };

  useEffect(() => {
    const loadTrips = async () => {
      setIsLoading(true);
      setError("");

      try {
        let activeUser = user;
        if (!activeUser) {
          activeUser = await refreshProfile();
        }

        if (!activeUser?.firebaseUid) {
          setError("User id is missing. Please sign in again.");
          setTrips([]);
          return;
        }

        const response = await apiRequest(`/api/v1/trip/user/${activeUser.firebaseUid}`, {
          token,
        });

        setTrips(Array.isArray(response) ? response : []);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await logout({ notifyBackend: false });
          navigate("/");
          return;
        }

        setError(err.message || "Failed to load saved itineraries.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTrips();
  }, [user, token, refreshProfile, logout, navigate]);

  const openTrip = (trip) => {
    setSelectedTrip(trip);
    setSelectedView("summary");
    setTripActionError("");
    setEditableSavedItinerary(trip.itinerary || "");
    setEditableStructuredItinerary(
      normalizeStructuredItinerary(trip.itineraryStructured, trip.itinerary || "")
    );
  };

  const closeTrip = () => {
    setSelectedTrip(null);
    setEditingTripId("");
    setTripActionError("");
    setEditableSavedItinerary("");
    setEditableStructuredItinerary(null);
  };

  const openEditTrip = (trip) => {
    setSelectedTrip(trip);
    setSelectedView("details");
    setTripActionError("");
    setEditingTripId(trip._id);
    setEditableSavedItinerary(trip.itinerary || "");
    setEditableStructuredItinerary(
      normalizeStructuredItinerary(trip.itineraryStructured, trip.itinerary || "")
    );
    setEditTripForm({
      startDate: trip.startDate ? formatDateInput(new Date(trip.startDate)) : "",
      endDate: trip.endDate ? formatDateInput(new Date(trip.endDate)) : "",
      travelers: String(trip.travelers ?? 1),
      budget: trip.budget || "",
      interests: toCsv(trip.interests),
      destinations: toCsv(trip.destinations),
      specialRequirements: trip.specialRequirements || "",
    });
  };

  const updateTripInState = (updatedTrip) => {
    setTrips((prevTrips) =>
      prevTrips.map((trip) => (trip._id === updatedTrip._id ? updatedTrip : trip))
    );
    setSelectedTrip(updatedTrip);
  };

  const saveTripEdits = async () => {
    if (!editingTripId) {
      return;
    }

    const parsedInterests = editTripForm.interests
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const parsedDestinations = editTripForm.destinations
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!isValidDateInput(editTripForm.startDate) || !isValidDateInput(editTripForm.endDate)) {
      setTripActionError("Please enter dates in the correct YYYY-MM-DD format.");
      return;
    }

    if (new Date(editTripForm.endDate) - new Date(editTripForm.startDate) < 2 * 24 * 60 * 60 * 1000) {
      setTripActionError("The end date must be at least 2 days after the start date.");
      return;
    }

    if (!editTripForm.budget.trim()) {
      setTripActionError("Budget is required.");
      return;
    }

    if (parsedDestinations.length === 0) {
      setTripActionError("Please provide at least one destination.");
      return;
    }

    setIsUpdatingTrip(true);
    setTripActionError("");

    try {
      const response = await apiRequest(`/api/v1/trip/${editingTripId}`, {
        method: "PUT",
        token,
        body: {
          startDate: editTripForm.startDate,
          endDate: editTripForm.endDate,
          travelers: editTripForm.travelers,
          budget: editTripForm.budget.trim(),
          interests: parsedInterests,
          destinations: parsedDestinations,
          specialRequirements: editTripForm.specialRequirements.trim(),
        },
      });

      if (response?.trip) {
        updateTripInState(response.trip);
      }

      setEditingTripId("");
    } catch (err) {
      setTripActionError(err.message || "Failed to update itinerary.");
    } finally {
      setIsUpdatingTrip(false);
    }
  };

  const deleteTrip = async (trip) => {
    setConfirmDialog({ isOpen: true, tripId: trip._id });
  };

  const confirmDeleteTrip = async () => {
    const trip = trips.find((t) => t._id === confirmDialog.tripId);
    if (!trip) {
      setConfirmDialog({ isOpen: false, tripId: null });
      return;
    }

    setConfirmDialog({ isOpen: false, tripId: null });

    setTripActionError("");

    try {
      await apiRequest(`/api/v1/trip/${trip._id}`, {
        method: "DELETE",
        token,
      });

      setTrips((prevTrips) => prevTrips.filter((item) => item._id !== trip._id));

      if (selectedTrip?._id === trip._id) {
        setSelectedTrip(null);
        setEditingTripId("");
      }

      setToast({ isOpen: true, type: 'success', title: 'Deleted', message: 'Itinerary deleted successfully.' });
    } catch (err) {
      setToast({ isOpen: true, type: 'error', title: 'Delete Failed', message: err.message || "Failed to delete itinerary." });
    }
  };

  return (
    <>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Itinerary"
        message="Delete this itinerary permanently? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={confirmDeleteTrip}
        onCancel={() => setConfirmDialog({ isOpen: false, tripId: null })}
      />
      <Toast
        isOpen={toast.isOpen}
        title={toast.title}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ isOpen: false, type: 'info', title: '', message: '' })}
      />
      <div className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Saved Itineraries</h1>
            <p className="text-slate-400 mt-2">Review all trips you have planned and saved.</p>
          </div>
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-lg border border-teal-500 text-teal-300 hover:bg-teal-500/10 transition"
          >
            Back to Dashboard
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-8 text-slate-300 animate-pulse">
            Loading your saved itineraries...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-300 mb-6">
            {error}
          </div>
        ) : null}

        {!isLoading && !error && trips.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-8 text-center">
            <p className="text-slate-300">No saved itineraries yet.</p>
            <p className="text-slate-500 mt-2">Create a trip from the home page planner and it will appear here.</p>
            <Link
              to="/"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-teal-500 text-slate-900 font-semibold hover:bg-teal-400 transition"
            >
              Plan a Trip
            </Link>
          </div>
        ) : null}

        {!isLoading && !error && trips.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
            {trips.map((trip) => (
              <article key={trip._id} className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold truncate">{trip.budget || "Trip"}</h2>
                  <span className="text-xs text-slate-400">{trip.travelers ?? "N/A"} pax</span>
                </div>

                <p className="text-sm text-slate-300">
                  {formatDate(trip.startDate)} → {formatDate(trip.endDate)}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(trip.destinations || []).slice(0, 3).map((destination) => (
                    <span key={destination} className="px-2.5 py-1 rounded-full border border-slate-600 bg-slate-800 text-slate-200 text-xs">
                      {destination}
                    </span>
                  ))}
                  {(trip.destinations || []).length > 3 ? (
                    <span className="px-2.5 py-1 rounded-full border border-slate-600 bg-slate-800 text-slate-200 text-xs">
                      +{trip.destinations.length - 3} more
                    </span>
                  ) : null}
                </div>

                <ItineraryDisplay
                  itineraryText={trip.itinerary}
                  itineraryStructured={trip.itineraryStructured}
                  initialExpandedDays={new Set()}
                  className="mt-4"
                  readOnly
                  currentLocation={trip?.startingPosition}
                />

                <button
                  type="button"
                  onClick={() => openTrip(trip)}
                  className="mt-4 w-full rounded-lg border border-teal-500/50 bg-teal-500/10 px-3 py-2 text-sm text-teal-200 hover:bg-teal-500/20 transition cursor-pointer"
                >
                  View Full Itinerary & Route
                </button>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openEditTrip(trip)}
                    className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/20 transition"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTrip(trip)}
                    className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20 transition"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
            </div>
          </div>
        ) : null}
      </div>

      {selectedTrip ? (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto rounded-2xl border border-slate-600 bg-slate-900 p-6 md:p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Saved Itinerary</p>
                <h3 className="text-2xl font-bold text-white mt-2">{selectedTrip.budget || 'Trip Details'}</h3>
              </div>
              <button
                type="button"
                onClick={closeTrip}
                className="rounded-lg border border-slate-500 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openEditTrip(selectedTrip)}
                className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/20 transition"
              >
                Edit Itinerary
              </button>
              <button
                type="button"
                onClick={() => deleteTrip(selectedTrip)}
                className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20 transition"
              >
                Delete Itinerary
              </button>
              <div className="flex-1">
                <p className="text-slate-500 text-sm mb-2">Itinerary Preview</p>
                <div className="text-slate-200 text-sm leading-7 whitespace-pre-wrap bg-slate-950/60 p-3 rounded-lg border border-slate-700 max-h-48 overflow-y-auto">
                  {selectedTrip.itinerary ? selectedTrip.itinerary.substring(0, 300) + '...' : 'No itinerary available'}
                </div>
              </div>
            </div>

            {tripActionError ? <p className="mb-4 text-sm text-red-400">{tripActionError}</p> : null}

            {editingTripId === selectedTrip._id ? (
              <div className="mb-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4 space-y-4">
                <h4 className="text-sm font-semibold text-white">Edit Itinerary</h4>

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="date"
                    value={editTripForm.startDate}
                    onChange={(event) => setEditTripForm((prev) => ({ ...prev, startDate: event.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  />
                  <input
                    type="date"
                    value={editTripForm.endDate}
                    onChange={(event) => setEditTripForm((prev) => ({ ...prev, endDate: event.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  />
                  <input
                    type="number"
                    min="1"
                    value={editTripForm.travelers}
                    onChange={(event) => setEditTripForm((prev) => ({ ...prev, travelers: event.target.value }))}
                    placeholder="Travelers"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  />
                  <input
                    type="text"
                    value={editTripForm.budget}
                    onChange={(event) => setEditTripForm((prev) => ({ ...prev, budget: event.target.value }))}
                    placeholder="Budget"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  />
                </div>

                <input
                  type="text"
                  value={editTripForm.interests}
                  onChange={(event) => setEditTripForm((prev) => ({ ...prev, interests: event.target.value }))}
                  placeholder="Interests (comma-separated)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                />

                <input
                  type="text"
                  value={editTripForm.destinations}
                  onChange={(event) => setEditTripForm((prev) => ({ ...prev, destinations: event.target.value }))}
                  placeholder="Destinations (comma-separated)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                />

                <textarea
                  rows={3}
                  value={editTripForm.specialRequirements}
                  onChange={(event) => setEditTripForm((prev) => ({ ...prev, specialRequirements: event.target.value }))}
                  placeholder="Special requirements"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white resize-none"
                ></textarea>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isUpdatingTrip}
                    onClick={saveTripEdits}
                    className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/20 transition disabled:opacity-60"
                  >
                    {isUpdatingTrip ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTripId("");
                      setTripActionError("");
                    }}
                    className="rounded-lg border border-slate-500 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 transition"
                  >
                    Cancel Edit
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 p-1 mb-5 w-fit">
              {['summary', 'details'].map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setSelectedView(view)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                    selectedView === view
                      ? 'bg-teal-500 text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {view === 'summary' ? 'Summary' : 'Details'}
                </button>
              ))}
            </div>

            {selectedView === 'summary' ? (
              <div className="space-y-4 mb-5">
                <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-300">
                  <p><span className="text-slate-500">Start:</span> {selectedTrip.startDate ? new Date(selectedTrip.startDate).toLocaleDateString() : 'N/A'}</p>
                  <p><span className="text-slate-500">End:</span> {selectedTrip.endDate ? new Date(selectedTrip.endDate).toLocaleDateString() : 'N/A'}</p>
                  <p><span className="text-slate-500">Travelers:</span> {selectedTrip.travelers ?? 'N/A'}</p>
                  <p><span className="text-slate-500">Created:</span> {selectedTrip.createdAt ? new Date(selectedTrip.createdAt).toLocaleString() : 'N/A'}</p>
                </div>

                <ItineraryDisplay
                  itineraryText={editableSavedItinerary}
                  itineraryStructured={editableStructuredItinerary}
                  className="mt-2"
                  readOnly
                  currentLocation={selectedTrip?.startingPosition}
                />
              </div>
            ) : null}

            {selectedView === 'details' ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                    <p className="text-slate-500 text-sm mb-2">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedTrip.interests || []).length > 0 ? (
                        (selectedTrip.interests || []).map((interest) => (
                          <span key={interest} className="px-2.5 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-200 text-xs">
                            {interest}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                    <p className="text-slate-500 text-sm mb-2">Destinations</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedTrip.destinations || []).length > 0 ? (
                        (selectedTrip.destinations || []).map((destination) => (
                          <span key={destination} className="px-2.5 py-1 rounded-full border border-slate-600 bg-slate-800 text-slate-200 text-xs">
                            {destination}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedTrip.specialRequirements ? (
                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                    <p className="text-slate-500 text-sm mb-2">Special Requirements</p>
                    <p className="text-slate-200 text-sm">{selectedTrip.specialRequirements}</p>
                  </div>
                ) : null}

                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <p className="text-slate-500 text-sm mb-2">Itinerary</p>
                  <ItineraryDisplay
                    itineraryText={editableSavedItinerary}
                    itineraryStructured={editableStructuredItinerary}
                    onStructuredChange={saveStructuredItinerary}
                  />
                </div>
                
                {/* Route Visualization Section */}
                {selectedTrip.itinerary && (
                  <RouteVisualizerSection tripData={selectedTrip} showTitle={true} />
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      </div>
    </>  
  );
}
