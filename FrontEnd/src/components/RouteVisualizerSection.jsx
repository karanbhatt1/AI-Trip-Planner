import { MapPin, ExternalLink } from 'lucide-react';
import RoutePlanner from './RoutePlanner';

/**
 * RouteVisualizerSection Component
 * Displays route visualization with Google Maps integration
 * Can be used in trip details and saved itineraries
 */
const RouteVisualizerSection = ({ tripData, showTitle = true }) => {
  if (!tripData?.itinerary && !tripData?.places) {
    return null;
  }

  // Extract first and last places from trip data
  const getMainPlaces = () => {
    let places = [];
    
    if (tripData.places && Array.isArray(tripData.places)) {
      places = tripData.places;
    } else if (tripData.destinations && Array.isArray(tripData.destinations)) {
      places = tripData.destinations.map(dest => ({
        name: dest,
        description: `Stop: ${dest}`
      }));
    }
    
    return places;
  };

  const places = getMainPlaces();
  const firstPlace = places[0];
  const lastPlace = places[places.length - 1];

  // Generate Google Maps URL
  const generateGoogleMapsURL = () => {
    if (!firstPlace || !lastPlace) return null;

    const start = firstPlace.lat && firstPlace.lng 
      ? `${firstPlace.lat},${firstPlace.lng}`
      : encodeURIComponent(firstPlace.name || '');
    
    const end = lastPlace.lat && lastPlace.lng 
      ? `${lastPlace.lat},${lastPlace.lng}`
      : encodeURIComponent(lastPlace.name || '');

    // If we have waypoints, add them
    let waypoints = '';
    if (places.length > 2) {
      waypoints = places
        .slice(1, -1)
        .map(p => (p.lat && p.lng ? `${p.lat},${p.lng}` : encodeURIComponent(p.name)))
        .join('|');
      return `https://www.google.com/maps/dir/?api=1&origin=${start}&destination=${end}&waypoints=${waypoints}`;
    }

    return `https://www.google.com/maps/dir/?api=1&origin=${start}&destination=${end}`;
  };

  const googleMapsURL = generateGoogleMapsURL();

  return (
    <div className="mt-8 space-y-4">
      {showTitle && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Route Visualization</h2>
            <p className="text-slate-400 text-sm">AI-optimized travel route with smart checkpoints</p>
          </div>
        </div>
      )}

      {/* Google Maps Button */}
      {googleMapsURL && (
        <div className="flex gap-3">
          <a
            href={googleMapsURL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
            </svg>
            Open in Google Maps
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Route Planner Component */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-6">
        <RoutePlanner tripData={tripData} />
      </div>
    </div>
  );
};

export default RouteVisualizerSection;