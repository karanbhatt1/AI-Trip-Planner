import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import RouteMap from './RouteMap';
import RouteSidebar from './RouteSidebar';
import { apiRequest } from '../services/apiClient';

const RoutePlanner = ({ tripData, startingLocation = null, compact = false }) => {
  const [checkpoints, setCheckpoints] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate route when trip data changes
  useEffect(() => {
    if (tripData) {
      generateRoute(tripData);
    }
  }, [tripData]);

  const generateRoute = async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      // Extract places from trip data
      const places = extractPlacesFromTrip(data);

      if ((!startingLocation && places.length < 2) || (startingLocation && places.length < 1)) {
        throw new Error('Need at least 2 places to create a route');
      }

      const sourcePoint = startingLocation || places[0];
      const destinationPoint = places[places.length - 1];
      const waypointPoints = startingLocation ? places : places.slice(1, -1);

      // Call backend API to get optimized route
      const response = await apiRequest('/api/route', {
        method: 'POST',
        body: {
          source: sourcePoint,
          destination: destinationPoint,
          waypoints: waypointPoints,
          preferences: data.preferences || {}
        }
      });

      setCheckpoints(response.checkpoints);
      setRouteSummary(response.routeSummary);

    } catch (err) {
      console.error('Error generating route:', err);
      setError(err.payload?.message || err.message || 'Failed to generate route');

      // Fallback: create basic route from places
      if (data.places) {
        const fallbackCheckpoints = data.places.map((place, index) => ({
          name: place.name || place,
          lat: place.lat || getRandomLatLng().lat,
          lng: place.lng || getRandomLatLng().lng,
          description: place.description || `Stop ${index + 1}`,
          why: place.why || 'Part of your optimized route'
        }));
        setCheckpoints(fallbackCheckpoints);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const extractPlacesFromTrip = (data) => {
    // Extract places from various possible formats
    if (data.places && Array.isArray(data.places)) {
      return data.places.map(place => ({
        name: place.name || place,
        lat: place.lat,
        lng: place.lng,
        description: place.description,
        why: place.why
      }));
    }

    // Fallback: try to extract from itinerary text
    if (data.itinerary) {
      return extractPlacesFromItinerary(data.itinerary);
    }

    return [];
  };

  const extractPlacesFromItinerary = (itineraryText) => {
    // Simple regex to extract place names from itinerary
    const placeRegex = /\*\*([^*]+)\*\*/g;
    const places = [];
    let match;

    while ((match = placeRegex.exec(itineraryText)) !== null) {
      const placeName = match[1].trim();
      if (placeName && !placeName.includes('Day') && places.length < 10) {
        places.push({
          name: placeName,
          lat: getRandomLatLng().lat,
          lng: getRandomLatLng().lng,
          description: `Visit ${placeName}`,
          why: 'Recommended stop on your route'
        });
      }
    }

    return places;
  };

  const getRandomLatLng = () => {
    // Generate random coordinates around Delhi for demo purposes
    const baseLat = 28.6139;
    const baseLng = 77.2090;
    const variance = 0.5; // ~50km variance

    return {
      lat: baseLat + (Math.random() - 0.5) * variance,
      lng: baseLng + (Math.random() - 0.5) * variance
    };
  };

  const handleCheckpointClick = (index) => {
    setSelectedCheckpoint(selectedCheckpoint === index ? null : index);
  };

  const handleRefreshRoute = () => {
    if (tripData) {
      generateRoute(tripData);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center">
            <MapPin className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Route Visualization</h2>
            <p className="text-slate-400">AI-optimized travel route with checkpoints</p>
          </div>
        </div>

        <button
          onClick={handleRefreshRoute}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Route
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-red-400 font-medium">Route Generation Error</h3>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <RouteMap
            checkpoints={checkpoints}
            onCheckpointClick={handleCheckpointClick}
            selectedCheckpoint={selectedCheckpoint}
            startingLocation={startingLocation}
            mapHeight={compact ? 'h-72' : 'h-96'}
          />
        </div>

        {/* Sidebar */}
        <div className={`lg:col-span-1 ${compact ? 'hidden lg:block' : ''}`}>
          <RouteSidebar
            checkpoints={checkpoints}
            routeSummary={routeSummary}
            selectedCheckpoint={selectedCheckpoint}
            onCheckpointClick={handleCheckpointClick}
            isLoading={isLoading}
            startingLocation={startingLocation}
          />
        </div>
      </div>

      {/* Route Stats */}
      {routeSummary && !compact && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Route Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-400">{checkpoints.length}</div>
              <div className="text-slate-400 text-sm">Total Stops</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-400">{routeSummary.totalDistance}</div>
              <div className="text-slate-400 text-sm">Distance (km)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-400">{routeSummary.totalTime}</div>
              <div className="text-slate-400 text-sm">Travel Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-400">
                {routeSummary.segments ? routeSummary.segments.length : 0}
              </div>
              <div className="text-slate-400 text-sm">Route Segments</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutePlanner;