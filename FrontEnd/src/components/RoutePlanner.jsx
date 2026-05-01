import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import RouteMap from './RouteMap';
import RouteSidebar from './RouteSidebar';
import { apiRequest } from '../services/apiClient';

const RoutePlanner = ({ tripData, startingLocation = null, compact = false, stackedLayout = false, mapHeight }) => {
  const [checkpoints, setCheckpoints] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tripData) {
      generateRoute(tripData);
    }
  }, [tripData]);

  const isMeaningfulLabel = (value) => {
    const label = String(value || '').trim();
    if (!label) return false;

    const lower = label.toLowerCase();
    const invalidLabels = [
      'day',
      'morning',
      'afternoon',
      'evening',
      'night',
      'breakfast',
      'lunch',
      'dinner',
      'arrival',
      'departure',
      'travel',
      'rest',
    ];

    return !invalidLabels.some((token) => lower === token || lower.startsWith(`${token} `) || lower.includes(` ${token}`));
  };

  const normalizeCheckpoint = (checkpoint) => {
    if (!checkpoint) return null;

    const name = checkpoint.location || checkpoint.title || checkpoint.name || checkpoint.description || '';
    const trimmedName = String(name).trim();

    if (!trimmedName || !isMeaningfulLabel(trimmedName)) {
      return null;
    }

    const lat = Number(checkpoint.lat);
    const lng = Number(checkpoint.lng);
    const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

    return {
      name: trimmedName,
      lat: hasCoordinates ? lat : undefined,
      lng: hasCoordinates ? lng : undefined,
      description: checkpoint.description || checkpoint.notes || '',
      why: checkpoint.why || 'Verified route checkpoint',
    };
  };

  const flattenStructuredCheckpoints = (days = []) => {
    const checkpointsList = [];

    for (const day of days) {
      const dayCheckpoints = Array.isArray(day?.checkpoints) ? day.checkpoints : [];
      for (const checkpoint of dayCheckpoints) {
        const normalized = normalizeCheckpoint(checkpoint);
        if (normalized) {
          checkpointsList.push(normalized);
        }
      }
    }

    return checkpointsList;
  };

  const extractPlacesFromTrip = (data) => {
    const directCheckpoints = Array.isArray(data?.checkpoints)
      ? data.checkpoints.map(normalizeCheckpoint).filter(Boolean)
      : [];

    if (directCheckpoints.length > 0) {
      return directCheckpoints;
    }

    const structuredCheckpoints = Array.isArray(data?.itineraryStructured?.days)
      ? flattenStructuredCheckpoints(data.itineraryStructured.days)
      : [];

    if (structuredCheckpoints.length > 0) {
      return structuredCheckpoints;
    }

    if (Array.isArray(data?.destinations)) {
      return data.destinations
        .map((destination) => normalizeCheckpoint({ title: destination, location: destination, description: `Visit ${destination}` }))
        .filter(Boolean);
    }

    return [];
  };

  const generateRoute = async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      const places = extractPlacesFromTrip(data);

      if ((!startingLocation && places.length < 2) || (startingLocation && places.length < 1)) {
        throw new Error('Need at least 2 real checkpoints to create a route');
      }

      const sourcePoint = startingLocation || places[0];
      const destinationPoint = places[places.length - 1];
      const waypointPoints = startingLocation ? places : places.slice(1, -1);

      const response = await apiRequest('/api/route', {
        method: 'POST',
        body: {
          source: sourcePoint,
          destination: destinationPoint,
          waypoints: waypointPoints,
          preferences: {
            ...(data.preferences || {}),
            mode: 'driving',
          },
        },
      });

      setCheckpoints(Array.isArray(response.checkpoints) ? response.checkpoints : []);
      setRouteSummary(response.routeSummary || null);
    } catch (err) {
      console.error('Error generating route:', err);
      setError(err.payload?.message || err.message || 'Failed to generate route');
      setCheckpoints([]);
      setRouteSummary(null);
    } finally {
      setIsLoading(false);
    }
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

      <div className={stackedLayout ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
        <div className={stackedLayout ? 'w-full' : 'lg:col-span-2'}>
          <RouteMap
            checkpoints={checkpoints}
            onCheckpointClick={handleCheckpointClick}
            selectedCheckpoint={selectedCheckpoint}
            startingLocation={startingLocation}
            mapHeight={mapHeight || (compact ? 'h-80' : 'h-[32rem]')}
          />
        </div>

        <div className={`${stackedLayout ? 'w-full' : `lg:col-span-1 ${compact ? 'hidden lg:block' : ''}`}`}>
          <RouteSidebar
            checkpoints={checkpoints}
            routeSummary={routeSummary}
            selectedCheckpoint={selectedCheckpoint}
            onCheckpointClick={handleCheckpointClick}
            isLoading={isLoading}
            startingLocation={startingLocation}
            fullWidth={stackedLayout}
          />
        </div>
      </div>

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
