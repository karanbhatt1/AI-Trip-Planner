import { useEffect, useState } from 'react';
import { Sparkles, Calendar, Users, IndianRupee, MapPin, MessageCircle, Navigation } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiRequest } from '../services/apiClient';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';
import ItineraryDisplay from './ItineraryDisplay';
import RouteVisualizerSection from './RouteVisualizerSection';
import {
  flattenCheckpoints,
  normalizeStructuredItinerary,
  structuredToMarkdown,
} from '../utils/itineraryParser';

export default function TripPlannerForm() {
  const { isAuthenticated, isInitializing, token, user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelers, setTravelers] = useState('2');
  const [budgetRange, setBudgetRange] = useState('8-16k');
  const [customBudget, setCustomBudget] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedDestinations, setSelectedDestinations] = useState([]);
  const [customDestination, setCustomDestination] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [startingPosition, setStartingPosition] = useState('');
  const [startingCoordinates, setStartingCoordinates] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedTrip, setSavedTrip] = useState(null);
  const [savedTrips, setSavedTrips] = useState([]);
  const [isTripsLoading, setIsTripsLoading] = useState(false);
  const [tripsError, setTripsError] = useState('');
  const [selectedTripDetails, setSelectedTripDetails] = useState(null);
  const [latestBackendResponse, setLatestBackendResponse] = useState(null);
  const [responseView, setResponseView] = useState('summary');
  const [selectedTripView, setSelectedTripView] = useState('summary');
  const [editingTripId, setEditingTripId] = useState('');
  const [isUpdatingTrip, setIsUpdatingTrip] = useState(false);
  const [tripActionError, setTripActionError] = useState('');
  const [isItineraryGenerated, setIsItineraryGenerated] = useState(false);
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, tripId: null });
  const [toast, setToast] = useState({ isOpen: false, type: 'info', title: '', message: '' });
  const [editableSavedItinerary, setEditableSavedItinerary] = useState('');
  const [editableStructuredItinerary, setEditableStructuredItinerary] = useState(null);
  const [editTripForm, setEditTripForm] = useState({
    startDate: '',
    endDate: '',
    travelers: '1',
    budget: '',
    interests: '',
    destinations: '',
    specialRequirements: '',
  });
  const [itineraryViewMode, setItineraryViewMode] = useState('structured'); // 'structured' or 'raw'

  const formatDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const minStartDate = formatDateInput(today);

  const isValidDateInput = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const [yearPart, monthPart, dayPart] = value.split('-').map(Number);
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

  const getMinEndDate = (startDateValue) => {
    if (!startDateValue) return '';

    const start = new Date(`${startDateValue}T00:00:00`);
    start.setDate(start.getDate() + 2);
    return formatDateInput(start);
  };

  const reverseGeocodeLocation = async (latitude, longitude) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to reverse geocode location');
    }

    const data = await response.json();
    return data?.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  };

  const getCurrentLocation = async () => {
    setIsLocating(true);
    setFormError('');
    
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser. Please enter your location manually.');
      setIsLocating(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coordinates = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

        try {
          const address = await reverseGeocodeLocation(latitude, longitude);
          setStartingPosition(address);
          setStartingCoordinates(coordinates);
          setFormSuccess(`Location detected: ${address}`);
        } catch {
          setStartingPosition(coordinates);
          setStartingCoordinates(coordinates);
          setFormSuccess(`Location detected: ${coordinates}`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        let errorMsg = 'Unable to get your location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please enter your location manually or enable location access.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is unavailable. Please enter your location manually.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out. Please enter your location manually.';
        }
        setFormError(errorMsg);
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const resetPlannerForm = () => {
    setStartDate('');
    setEndDate('');
    setTravelers('2');
    setBudgetRange('8-16k');
    setCustomBudget('');
    setSelectedInterests([]);
    setSelectedDestinations([]);
    setCustomDestination('');
    setSpecialRequirements('');
    setStartingPosition('');
    setStartingCoordinates('');
    setFormError('');
    setFormSuccess('');
    setSavedTrip(null);
    setLatestBackendResponse(null);
    setResponseView('summary');
    setSelectedTripDetails(null);
    setSelectedTripView('summary');
    setEditableSavedItinerary('');
    setEditableStructuredItinerary(null);
    setIsItineraryGenerated(false);
  };

  const handleStartDateChange = (event) => {
    const nextStartDate = event.target.value;
    const nextMinEndDate = getMinEndDate(nextStartDate);
    setStartDate(nextStartDate);
    setFormError('');
    setFormSuccess('');

    if (endDate && nextStartDate && endDate < nextMinEndDate) {
      setEndDate('');
    }
  };

  const toggleSelectionWithLimit = (currentItems, value, setItems, limit, emptySelectionReset = null) => {
    setFormError('');
    setFormSuccess('');

    setItems((current) => {
      if (current.includes(value)) {
        if (emptySelectionReset) {
          emptySelectionReset(value, false);
        }
        return current.filter((item) => item !== value);
      }

      if (current.length >= limit) {
        setFormError(`You can select at most ${limit} ${limit === 4 ? 'options' : 'items'} here.`);
        return current;
      }

      if (emptySelectionReset) {
        emptySelectionReset(value, true);
      }

      return [...current, value];
    });
  };

  const toggleInterest = (value) => {
    setFormError('');
    setFormSuccess('');
    setSelectedInterests((current) => {
      if (current.includes(value)) {
        return current.filter((item) => item !== value);
      }

      if (current.length >= 4) {
        setFormError('You can select at most 4 interests.');
        return current;
      }

      return [...current, value];
    });
  };

  const toggleDestination = (place) => {
    setFormError('');
    setFormSuccess('');
    setSelectedDestinations((current) => {
      if (current.includes(place)) {
        const next = current.filter((item) => item !== place);
        if (place === 'Others') {
          setCustomDestination('');
        }
        return next;
      }

      if (current.length >= 4) {
        setFormError('You can select at most 4 preferred destinations.');
        return current;
      }

      if (place === 'Others') {
        setCustomDestination('');
      }
      return [...current, place];
    });
  };

  const handleDestinationInputChange = (value) => {
    setCustomDestination(value);
    if (!selectedDestinations.includes('Others')) {
      setSelectedDestinations((current) => {
        if (current.length >= 4) {
          setFormError('You can select at most 4 preferred destinations.');
          return current;
        }
        return [...current, 'Others'];
      });
    }
  };

  const handleOthersDestinationToggle = (place) => {
    setFormError('');
    setFormSuccess('');
    setSelectedDestinations((current) => {
      if (current.includes(place)) {
        const next = current.filter((item) => item !== place);
        setCustomDestination('');
      }
      if (current.length >= 4) {
        setFormError('You can select at most 4 preferred destinations.');
        return current;
      }

      if (place === 'Others') {
        setCustomDestination('');
      }
      return [...current, place];
    });
  };

  const toCsv = (value) => (Array.isArray(value) ? value.join(', ') : '');

  const openEditTrip = (trip) => {
    setTripActionError('');
    setSelectedTripDetails(trip);
    setSelectedTripView('details');
    setEditingTripId(trip._id);
    setEditTripForm({
      startDate: trip.startDate ? formatDateInput(new Date(trip.startDate)) : '',
      endDate: trip.endDate ? formatDateInput(new Date(trip.endDate)) : '',
      travelers: String(trip.travelers ?? 1),
      budget: trip.budget || '',
      interests: toCsv(trip.interests),
      destinations: toCsv(trip.destinations),
      specialRequirements: trip.specialRequirements || '',
    });
  };

  const updateTripInState = (updatedTrip) => {
    setSavedTrips((prevTrips) =>
      prevTrips.map((trip) => (trip._id === updatedTrip._id ? updatedTrip : trip))
    );
    if (savedTrip?._id === updatedTrip._id) {
      setSavedTrip(updatedTrip);
    }
    if (latestBackendResponse?.trip?._id === updatedTrip._id) {
      setLatestBackendResponse((prevResponse) => ({
        ...prevResponse,
        trip: updatedTrip,
      }));
    }
    setSelectedTripDetails(updatedTrip);
  };

  const getTripUpdatePayload = (trip, overrides = {}) => ({
    startDate: trip.startDate ? formatDateInput(new Date(trip.startDate)) : '',
    endDate: trip.endDate ? formatDateInput(new Date(trip.endDate)) : '',
    travelers: String(trip.travelers ?? 1),
    budget: trip.budget || '',
    interests: Array.isArray(trip.interests) ? trip.interests : [],
    destinations: Array.isArray(trip.destinations) ? trip.destinations : [],
    specialRequirements: trip.specialRequirements || '',
    ...overrides,
  });

  const saveStructuredItinerary = async (updatedStructured) => {
    if (!savedTrip?._id) {
      return;
    }

    const normalized = normalizeStructuredItinerary(updatedStructured, editableSavedItinerary);
    const markdown = structuredToMarkdown(normalized);
    const checkpoints = flattenCheckpoints(normalized);

    setEditableStructuredItinerary(normalized);
    setEditableSavedItinerary(markdown);

    try {
      const response = await apiRequest(`/api/v1/trip/${savedTrip._id}`, {
        method: 'PUT',
        token,
        body: getTripUpdatePayload(savedTrip, {
          itinerary: markdown,
          itineraryStructured: normalized,
          checkpoints,
        }),
      });

      if (response?.trip) {
        updateTripInState(response.trip);
      }

      setFormSuccess('Itinerary changes saved.');
    } catch (error) {
      if (error instanceof ApiError) {
        setTripActionError(error.message);
      } else {
        setTripActionError('Failed to save itinerary changes.');
      }
    }
  };

  const saveTripEdits = async () => {
    if (!editingTripId) {
      return;
    }

    const parsedInterests = editTripForm.interests
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const parsedDestinations = editTripForm.destinations
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!isValidDateInput(editTripForm.startDate) || !isValidDateInput(editTripForm.endDate)) {
      setTripActionError('Please enter dates in the correct YYYY-MM-DD format.');
      return;
    }

    if (new Date(editTripForm.endDate) - new Date(editTripForm.startDate) < 2 * 24 * 60 * 60 * 1000) {
      setTripActionError('The end date must be at least 2 days after the start date.');
      return;
    }

    if (!editTripForm.budget.trim()) {
      setTripActionError('Budget is required.');
      return;
    }

    if (parsedDestinations.length === 0) {
      setTripActionError('Please provide at least one destination.');
      return;
    }

    setIsUpdatingTrip(true);
    setTripActionError('');

    try {
      const response = await apiRequest(`/api/v1/trip/${editingTripId}`, {
        method: 'PUT',
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

      setFormSuccess(response?.message || 'Itinerary updated successfully.');
      setEditingTripId('');
    } catch (error) {
      if (error instanceof ApiError) {
        setTripActionError(error.message);
      } else {
        setTripActionError('Failed to update itinerary.');
      }
    } finally {
      setIsUpdatingTrip(false);
    }
  };

  const deleteTrip = async (trip) => {
    setConfirmDialog({ isOpen: true, tripId: trip._id });
  };

  const handleRegenerate = () => {
    setIsItineraryGenerated(false);
  };

  const handleSaveGeneratedItinerary = () => {
    if (!savedTrip) {
      return;
    }

    resetPlannerForm();
    setFormSuccess('Itinerary saved. The planner is ready for a new trip.');
  };

  const confirmDeleteTrip = async () => {
    const trip = savedTrips.find((t) => t._id === confirmDialog.tripId);
    if (!trip) {
      setConfirmDialog({ isOpen: false, tripId: null });
      return;
    }

    setConfirmDialog({ isOpen: false, tripId: null });

    setTripActionError('');

    try {
      await apiRequest(`/api/v1/trip/${trip._id}`, {
        method: 'DELETE',
        token,
      });

      setSavedTrips((prevTrips) => prevTrips.filter((item) => item._id !== trip._id));

      if (savedTrip?._id === trip._id) {
        setSavedTrip(null);
      }

      if (latestBackendResponse?.trip?._id === trip._id) {
        setLatestBackendResponse(null);
      }

      if (selectedTripDetails?._id === trip._id) {
        setSelectedTripDetails(null);
        setEditingTripId('');
      }

      setToast({ isOpen: true, type: 'success', title: 'Deleted', message: 'Itinerary deleted successfully.' });
    } catch (error) {
      if (error instanceof ApiError) {
        setToast({ isOpen: true, type: 'error', title: 'Delete Failed', message: error.message });
      } else {
        setToast({ isOpen: true, type: 'error', title: 'Delete Failed', message: 'Failed to delete itinerary.' });
      }
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSavedTrip(null);
    setLatestBackendResponse(null);
    setResponseView('summary');

    if (!isAuthenticated) {
      setFormError('Please sign in to use the trip planner.');
      return;
    }

    if (!startDate || !endDate) {
      setFormError('Please select both start and end dates.');
      return;
    }

    if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
      setFormError('Please enter dates in the correct DD-MM-YYYY format.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffInDays = (end - start) / (1000 * 60 * 60 * 24);

    if (diffInDays < 2) {
      setFormError('The end date must be at least 2 days after the start date.');
      return;
    }

    if (budgetRange === 'custom' && !customBudget.trim()) {
      setFormError('Please enter a custom budget range.');
      return;
    }

    const normalizedDestinations = selectedDestinations.filter(
      (destination) => destination !== 'Others'
    );

    if (selectedDestinations.includes('Others')) {
      if (!customDestination.trim()) {
        setFormError('Please enter your destination in Others.');
        return;
      }
      normalizedDestinations.push(customDestination.trim());
    }

    if (normalizedDestinations.length === 0) {
      setFormError('Please choose at least one destination.');
      return;
    }

    const saveTrip = async () => {
      setIsSubmitting(true);
      setIsGeneratingItinerary(true);

      try {
        const response = await apiRequest('/api/v1/trip/create', {
          method: 'POST',
          token,
          body: {
            startDate,
            endDate,
            travelers,
            budget: budgetRange === 'custom' ? customBudget.trim() : budgetRange,
            interests: selectedInterests.slice(0, 4),
            destinations: normalizedDestinations.slice(0, 4),
            currentDestination: normalizedDestinations[0] || customDestination.trim() || '',
            specialRequirements,
            startingPosition,
            startingCoordinates,
            currentLocation: startingPosition,
          },
        });

        setFormSuccess(response?.message || 'Trip and itinerary created successfully.');
        setLatestBackendResponse(response);
        setResponseView('summary');

        if (response?.trip) {
          const tripWithItinerary = {
            ...response.trip,
            itinerary: response.trip.itinerary || response.itinerary || '',
            itineraryStructured:
              response.trip.itineraryStructured || response.itineraryStructured || null,
          };

          setEditableSavedItinerary(tripWithItinerary.itinerary || '');
          setEditableStructuredItinerary(
            normalizeStructuredItinerary(
              tripWithItinerary.itineraryStructured,
              tripWithItinerary.itinerary || ''
            )
          );

          setSavedTrip(tripWithItinerary);
          setLatestBackendResponse((prev) => ({ ...prev, trip: tripWithItinerary }));
          setIsItineraryGenerated(true);
          setSavedTrips((prevTrips) => [
            tripWithItinerary,
            ...prevTrips.filter((trip) => trip._id !== response.trip._id),
          ]);
        }
      } catch (error) {
        if (error instanceof ApiError) {
          setFormError(error.message);
        } else {
          setFormError('Failed to save trip preferences.');
        }
      } finally {
        setIsGeneratingItinerary(false);
        setIsSubmitting(false);
      }
    };

    saveTrip();
  };

  useEffect(() => {
    const loadSavedTrips = async () => {
      if (!isAuthenticated || !token || !user?.firebaseUid) {
        setSavedTrips([]);
        return;
      }

      setIsTripsLoading(true);
      setTripsError('');

      try {
        const trips = await apiRequest(`/api/v1/trip/user/${user.firebaseUid}`, {
          token,
        });

        setSavedTrips(Array.isArray(trips) ? trips : []);
      } catch (error) {
        if (error instanceof ApiError) {
          setTripsError(error.message);
        } else {
          setTripsError('Could not load saved itineraries.');
        }
      } finally {
        setIsTripsLoading(false);
      }
    };

    loadSavedTrips();
  }, [isAuthenticated, token, user?.firebaseUid]);

  useEffect(() => {
    if (!savedTrip) {
      setEditableSavedItinerary('');
      setEditableStructuredItinerary(null);
      return;
    }

    setEditableSavedItinerary(savedTrip.itinerary || '');
    setEditableStructuredItinerary(
      normalizeStructuredItinerary(savedTrip.itineraryStructured, savedTrip.itinerary || '')
    );
  }, [savedTrip]);

  const interests = ["Adventure Sports", "Spiritual", "Nature & Wildlife", "Photography", "Trekking", "Pilgrimage", "Yoga & Wellness", "Local Culture"];
  const destinations = ["Rishikesh", "Nainital", "Mussoorie", "Haridwar", "Jim Corbett", "Auli", "Kedarnath", "Badrinath", "Valley of Flowers", "Chopta", "Others"];

  if (isInitializing) {
    return (
      <section className="py-20 bg-slate-800">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-slate-700/50 backdrop-blur-xl border border-slate-600 rounded-3xl p-10 shadow-2xl text-center text-slate-300">
            Checking your session...
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="py-20 bg-slate-800">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-slate-700/50 backdrop-blur-xl border border-slate-600 rounded-3xl p-10 shadow-2xl text-center">
            <Sparkles className="w-12 h-12 text-teal-400 mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-white">Plan Your Perfect Trip</h3>
            <p className="text-slate-300 mt-3">
              Please sign in from the top menu to unlock the trip planner.
            </p>
          </div>
        </div>
      </section>
    );
  }

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
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast({ isOpen: false, type: 'info', title: '', message: '' })}
      />
      <section className="py-20 bg-slate-800">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-8 bg-slate-700/40 backdrop-blur-xl border border-slate-600 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-xl font-semibold text-white">Your Current Saved Itineraries</h3>
            <span className="text-xs text-slate-400">{savedTrips.length} saved</span>
          </div>

          {isTripsLoading ? (
            <p className="text-slate-300 text-sm animate-pulse">Loading saved itineraries...</p>
          ) : null}

          {tripsError ? <p className="text-sm text-red-400">{tripsError}</p> : null}

          {!isTripsLoading && !tripsError && savedTrips.length === 0 ? (
            <p className="text-sm text-slate-400">No saved itineraries yet. Create one below.</p>
          ) : null}

          {!isTripsLoading && !tripsError && savedTrips.length > 0 ? (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4 min-w-max">
                {savedTrips.map((trip) => (
                  <article
                    key={trip._id}
                    className="w-72 shrink-0 rounded-xl border border-slate-600 bg-slate-900/80 p-4"
                  >
                    <p className="text-xs text-teal-300 mb-2">{trip.budget || 'Saved Trip'}</p>
                    <p className="text-sm text-slate-300">
                      {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'N/A'}
                      {' '}→{' '}
                      {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">Travelers: {trip.travelers ?? 'N/A'}</p>
                    {trip.destinations?.length ? (
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        Destinations: {trip.destinations.join(', ')}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setEditingTripId('');
                        setSelectedTripDetails(trip);
                        setSelectedTripView('details');
                      }}
                      className="mt-3 w-full rounded-lg border border-teal-500/50 bg-teal-500/10 px-3 py-2 text-sm text-teal-200 hover:bg-teal-500/20 transition cursor-pointer"
                    >
                      View Itinerary
                    </button>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditTrip(trip)}
                        className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/20 transition cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTrip(trip)}
                        className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20 transition cursor-pointer"
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

        <form onSubmit={handleSubmit} className="bg-slate-700/50 backdrop-blur-xl border border-slate-600 rounded-3xl p-10 shadow-2xl">
          <div className="text-center mb-10">
            <Sparkles className="w-12 h-12 text-teal-400 mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-white">Plan Your Perfect Trip</h3>
            <p className="text-slate-300 mt-2">Tell us your preferences and let AI craft your ideal itinerary</p>
          </div>

          {/* Form fields */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="flex items-center gap-2 text-sm text-slate-300 mb-2"><Calendar className="w-4 h-4" /> Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                min={minStartDate}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-teal-500 outline-none transition"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-slate-300 mb-2"><Calendar className="w-4 h-4" /> End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                min={getMinEndDate(startDate) || undefined}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-teal-500 outline-none transition"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-slate-300 mb-2"><Users className="w-4 h-4" /> Number of Travelers</label>
              <select
                value={travelers}
                onChange={(event) => setTravelers(event.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-teal-500"
              >
                <option value="1">1 Person</option>
                <option value="2">2 People</option>
                <option value="4">3-4 People</option>
                <option value="5">5+ People</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-slate-300 mb-2"><IndianRupee className="w-4 h-4" /> Budget Range</label>
              <select
                value={budgetRange}
                onChange={(event) => setBudgetRange(event.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-teal-500"
              >
                <option value="3-8k">Starter (3000-8000)</option>
                <option value="8-16k">Basic (8000-16000k)</option>
                <option value="Moderate (₹25k-50k)">Moderate (₹25k-50k)</option>
                <option value="custom">Custom</option>
              </select>
              {budgetRange === 'custom' ? (
                <input
                  type="text"
                  value={customBudget}
                  onChange={(event) => setCustomBudget(event.target.value)}
                  placeholder="Enter your custom budget range"
                  className="mt-3 w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-teal-500 outline-none transition"
                />
              ) : null}
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm text-slate-300 mb-4">Your Interests</label>
            <div className="flex flex-wrap gap-3">
              {interests.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleInterest(tag)}
                  className={`px-5 py-2 rounded-full text-sm transition cursor-pointer border ${
                    selectedInterests.includes(tag)
                      ? 'bg-teal-400 text-slate-950 border-teal-300 shadow-lg shadow-teal-500/20'
                      : 'bg-slate-700 border-slate-600 text-slate-200 hover:border-teal-500'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="flex items-center gap-2 text-sm text-slate-300 mb-2"><MapPin className="w-4 h-4" /> Preferred Destinations</label>
            <div className="flex flex-wrap gap-3">
              {destinations.map(place => (
                <button
                  key={place}
                  type="button"
                  onClick={() => toggleDestination(place)}
                  className={`px-4 py-2 rounded-full text-sm transition cursor-pointer border ${
                    selectedDestinations.includes(place)
                      ? 'bg-teal-400 text-slate-950 border-teal-300 shadow-lg shadow-teal-500/20'
                      : 'bg-slate-700 border-slate-600 text-slate-200 hover:border-teal-500'
                  }`}
                >
                  {place}
                </button>
              ))}
            </div>
            {selectedDestinations.includes('Others') ? (
              <input
                type="text"
                value={customDestination}
                onChange={(event) => handleDestinationInputChange(event.target.value)}
                placeholder="Enter your preferred destination"
                className="mt-3 w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-teal-500 outline-none transition"
              />
            ) : null}
          </div>

          <div className="mb-10">
            <label className="flex items-center gap-2 text-sm text-slate-300 mb-2"><MapPin className="w-4 h-4" /> Starting Position</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={startingPosition}
                onChange={(event) => setStartingPosition(event.target.value)}
                placeholder="Enter your starting location or use auto-detect"
                className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-teal-500 outline-none transition"
              />
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isLocating}
                className="flex items-center gap-2 px-4 py-3 bg-teal-500/20 border border-teal-500/50 text-teal-200 rounded-lg hover:bg-teal-500/30 transition disabled:opacity-60"
              >
                <Navigation className="w-4 h-4" />
                {isLocating ? 'Locating...' : 'Auto-detect'}
              </button>
            </div>
            {startingCoordinates ? (
              <p className="mt-2 text-xs text-slate-400">
                Coordinates: {startingCoordinates}
              </p>
            ) : null}
          </div>

          <div className="mb-10">
            <label className="flex items-center gap-2 text-sm text-slate-300 mb-2"><MessageCircle className="w-4 h-4" /> Special Requirements</label>
            <textarea
              rows={3}
              value={specialRequirements}
              onChange={(event) => setSpecialRequirements(event.target.value)}
              placeholder="E.g., wheelchair accessible, vegetarian only, etc."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-teal-500 outline-none transition resize-none"
            ></textarea>
          </div>

          {formError ? <p className="mb-4 text-sm text-red-400">{formError}</p> : null}
          {formSuccess ? <p className="mb-4 text-sm text-green-400">{formSuccess}</p> : null}

          {latestBackendResponse ? (
            <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-5 text-left">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  {/* <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 mb-1">Trip Result</p> */}
                  <h4 className="text-lg font-semibold text-white">Trip Result</h4>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 p-1">
                  {['summary', 'details'].map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setResponseView(view)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                        responseView === view
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {view === 'summary' ? 'Summary' : 'Details'}
                    </button>
                  ))}
                </div>
              </div>

              {responseView === 'summary' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Status</p>
                    <p className="text-white font-semibold">{latestBackendResponse.message || 'Saved successfully'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Trip Id</p>
                    <p className="text-white font-semibold">{latestBackendResponse.trip?._id ? latestBackendResponse.trip._id : 'N/A'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Budget</p>
                    <p className="text-white font-semibold">{latestBackendResponse.trip?.budget || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Travelers</p>
                    <p className="text-white font-semibold">{latestBackendResponse.trip?.travelers ?? 'N/A'}</p>
                  </div>
                </div>
              ) : null}

              {responseView === 'details' ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                    <p className="text-slate-500 text-sm mb-2">Selected Dates</p>
                    <p className="text-slate-200 text-sm">
                      {latestBackendResponse.trip?.startDate ? new Date(latestBackendResponse.trip.startDate).toLocaleDateString() : 'N/A'}
                      {' '}→{' '}
                      {latestBackendResponse.trip?.endDate ? new Date(latestBackendResponse.trip.endDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                      <p className="text-slate-500 text-sm mb-2">Interests</p>
                      <div className="flex flex-wrap gap-2">
                        {(latestBackendResponse.trip?.interests || []).length > 0 ? (
                          (latestBackendResponse.trip?.interests || []).slice(0, 4).map((interest) => (
                            <button
                              key={interest}
                              type="button"
                              onClick={() => setSelectedTripDetails(latestBackendResponse.trip)}
                              className="px-2.5 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-200 text-xs"
                            >
                              {interest}
                            </button>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs">None</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                      <p className="text-slate-500 text-sm mb-2">Destinations</p>
                      <div className="flex flex-wrap gap-2">
                        {(latestBackendResponse.trip?.destinations || []).length > 0 ? (
                          (latestBackendResponse.trip?.destinations || []).slice(0, 4).map((destination) => (
                            <button
                              key={destination}
                              type="button"
                              onClick={() => setSelectedTripDetails(latestBackendResponse.trip)}
                              className="px-2.5 py-1 rounded-full border border-slate-600 bg-slate-800 text-slate-200 text-xs"
                            >
                              {destination}
                            </button>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

            </div>
          ) : null}

          {savedTrip ? (
            <div className="mb-6 rounded-2xl border border-teal-500/30 bg-slate-900/70 p-5 text-left">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-xl font-semibold text-white">Your trip has been saved</h4>
                </div>
                <span className="rounded-full border border-teal-400/40 bg-teal-500/10 px-3 py-1 text-xs text-teal-200">
                  {savedTrip._id ? `Trip ID: ${savedTrip._id.slice(-6)}` : 'Saved'}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-300">
                <p><span className="text-slate-500">Dates:</span> {new Date(savedTrip.startDate).toLocaleDateString()} → {new Date(savedTrip.endDate).toLocaleDateString()}</p>
                <p><span className="text-slate-500">Travelers:</span> {savedTrip.travelers}</p>
                <p><span className="text-slate-500">Budget:</span> {savedTrip.budget}</p>
                <p><span className="text-slate-500">Created:</span> {savedTrip.createdAt ? new Date(savedTrip.createdAt).toLocaleString() : 'Just now'}</p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-slate-300">
                <div>
                  <p className="text-slate-500 mb-2">Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {(savedTrip.interests || []).slice(0, 4).map((interest) => (
                      <span key={interest} className="rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-teal-100">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-slate-500 mb-2">Destinations</p>
                  <div className="flex flex-wrap gap-2">
                    {(savedTrip.destinations || []).slice(0, 4).map((destination) => (
                      <span key={destination} className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-slate-200">
                        {destination}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {isGeneratingItinerary ? (
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <p className="text-slate-500 mb-2">Itinerary Preview</p>
                  <p className="text-slate-200 text-sm animate-pulse">Generating your personalized itinerary...</p>
                </div>
              ) : savedTrip.itinerary ? (
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-500">Itinerary Preview</p>
                    <button
                      type="button"
                      onClick={() => setItineraryViewMode(itineraryViewMode === 'structured' ? 'raw' : 'structured')}
                      className="text-xs text-teal-400 hover:text-teal-300 transition"
                    >
                      {itineraryViewMode === 'structured' ? 'Edit Raw' : 'View Structured'}
                    </button>
                  </div>
                  {itineraryViewMode === 'structured' ? (
                    <ItineraryDisplay
                      itineraryText={editableSavedItinerary}
                      itineraryStructured={editableStructuredItinerary}
                      onStructuredChange={saveStructuredItinerary}
                      currentLocation={startingPosition}
                    />
                  ) : (
                    <textarea
                      value={editableSavedItinerary}
                      onChange={(e) => setEditableSavedItinerary(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm leading-7 focus:border-teal-500 outline-none transition resize-vertical"
                      rows={8}
                      placeholder="Edit your itinerary here..."
                    />
                  )}

                  <button
                    type="button"
                    onClick={handleSaveGeneratedItinerary}
                    className="mt-4 w-full rounded-xl border border-teal-500/50 bg-teal-500/10 px-4 py-3 text-sm font-semibold text-teal-100 hover:bg-teal-500/20 transition"
                  >
                    Save Itinerary
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const section = document.getElementById('route-visualization-section');
                      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="mt-2 inline-flex items-center rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-teal-400 hover:text-teal-200 transition"
                  >
                    Go to Route Visualization
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <button type="submit" disabled={isSubmitting || isItineraryGenerated || isGeneratingItinerary} className="w-full py-5 bg-teal-500 text-slate-900 font-bold text-lg rounded-xl hover:bg-teal-400 transition shadow-lg flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed">
            <Sparkles className="w-6 h-6" />
            {isSubmitting ? 'Saving...' : isGeneratingItinerary ? 'Generating Itinerary...' : 'Generate My Itinerary'}
          </button>

          {isItineraryGenerated ? (
            <button
              type="button"
              onClick={handleRegenerate}
              className="w-full mt-3 py-5 bg-amber-500 text-slate-900 font-bold text-lg rounded-xl hover:bg-amber-400 transition shadow-lg flex items-center justify-center gap-3"
            >
              <Sparkles className="w-6 h-6" />
              Regenerate Itinerary
            </button>
          ) : null}
        </form>

        {savedTrip?.itinerary ? (
          <div id="route-visualization-section" className="mt-8">
            <RouteVisualizerSection tripData={savedTrip} showTitle={true} />
          </div>
        ) : null}
      </div>

      {selectedTripDetails ? (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto rounded-2xl border border-slate-600 bg-slate-900 p-6 md:p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Saved Itinerary</p>
                <h3 className="text-2xl font-bold text-white mt-2">{selectedTripDetails.budget || 'Trip Details'}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTripDetails(null);
                  setEditingTripId('');
                  setTripActionError('');
                }}
                className="rounded-lg border border-slate-500 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openEditTrip(selectedTripDetails)}
                className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/20 transition"
              >
                Edit Itinerary
              </button>
              <button
                type="button"
                onClick={() => deleteTrip(selectedTripDetails)}
                className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20 transition"
              >
                Delete Itinerary
              </button>
            </div>

            {tripActionError ? <p className="mb-4 text-sm text-red-400">{tripActionError}</p> : null}

            {editingTripId === selectedTripDetails._id ? (
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
                    {isUpdatingTrip ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTripId('');
                      setTripActionError('');
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
                  onClick={() => setSelectedTripView(view)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                    selectedTripView === view
                      ? 'bg-teal-500 text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {view === 'summary' ? 'Summary' : 'Details'}
                </button>
              ))}
            </div>

            {selectedTripView === 'summary' ? (
              <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-300 mb-5">
                <p><span className="text-slate-500">Start:</span> {selectedTripDetails.startDate ? new Date(selectedTripDetails.startDate).toLocaleDateString() : 'N/A'}</p>
                <p><span className="text-slate-500">End:</span> {selectedTripDetails.endDate ? new Date(selectedTripDetails.endDate).toLocaleDateString() : 'N/A'}</p>
                <p><span className="text-slate-500">Travelers:</span> {selectedTripDetails.travelers ?? 'N/A'}</p>
                <p><span className="text-slate-500">Created:</span> {selectedTripDetails.createdAt ? new Date(selectedTripDetails.createdAt).toLocaleString() : 'N/A'}</p>
              </div>
            ) : null}

            {selectedTripView === 'details' ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-slate-500 text-sm mb-2">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedTripDetails.interests || []).length > 0 ? (
                        (selectedTripDetails.interests || []).map((interest) => (
                          <span key={interest} className="px-2.5 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-200 text-xs">
                            {interest}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-500 text-sm mb-2">Destinations</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedTripDetails.destinations || []).length > 0 ? (
                        (selectedTripDetails.destinations || []).map((destination) => (
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

                {selectedTripDetails.specialRequirements ? (
                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                    <p className="text-slate-500 text-sm mb-2">Special Requirements</p>
                    <p className="text-slate-200 text-sm">{selectedTripDetails.specialRequirements}</p>
                  </div>
                ) : null}

                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-500 text-sm">Itinerary</p>
                  </div>
                  <ItineraryDisplay
                    itineraryText={selectedTripDetails.itinerary}
                    itineraryStructured={selectedTripDetails.itineraryStructured}
                    currentLocation={selectedTripDetails?.startingPosition}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
    </>
  );
}