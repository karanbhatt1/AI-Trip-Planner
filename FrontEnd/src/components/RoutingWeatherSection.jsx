import { useEffect, useState } from 'react';
import { Cloud, Droplets, Eye, MapPin, Navigation, Wind } from 'lucide-react';
import MapBoxRoute from './MapBoxRoute';

/**
 * Separate Routing & Weather Section
 * Displays route information and weather forecast below the trip planning form
 * Includes:
 * - MapBox-based route visualization
 * - Location verification
 * - Weather forecast
 * - Cost estimates
 */
export default function RoutingWeatherSection({ tripData, checkpoints = [] }) {
  const [weather, setWeather] = useState({});
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [verifiedLocations, setVerifiedLocations] = useState({});

  /**
   * Fetch weather for destinations
   * Using OpenWeather API (free tier)
   */
  useEffect(() => {
    const fetchWeather = async () => {
      if (!checkpoints || checkpoints.length === 0) return;

      setWeatherLoading(true);
      const weatherData = {};

      try {
        for (const checkpoint of checkpoints) {
          const location = checkpoint.location || checkpoint.title;
          if (!location) continue;

          try {
            // Use OpenWeather Geocoding API (free, no key required for first 1000 calls)
            const geoResponse = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                location + ', Uttarakhand, India'
              )}&format=json&limit=1`,
              {
                headers: {
                  'User-Agent': 'TripPlanner',
                },
              }
            );

            if (!geoResponse.ok) continue;

            const geoData = await geoResponse.json();
            if (geoData.length === 0) continue;

            const { lat, lon } = geoData[0];

            // Fetch weather using Open-Meteo API (free, no key required)
            const weatherResponse = await fetch(
              `https://api.open-meteo.com/v1/forecast?` +
              `latitude=${lat}&longitude=${lon}&` +
              `current=temperature_2m,weather_code,relative_humidity_2m,apparent_temperature&` +
              `timezone=auto`
            );

            if (!weatherResponse.ok) continue;

            const weatherJson = await weatherResponse.json();
            if (weatherJson.current) {
              weatherData[location] = {
                temperature: weatherJson.current.temperature_2m,
                humidity: weatherJson.current.relative_humidity_2m,
                weatherCode: weatherJson.current.weather_code,
                apparentTemp: weatherJson.current.apparent_temperature,
              };
            }
          } catch {
            // Continue with other locations if one fails
          }
        }

        setWeather(weatherData);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [checkpoints]);

  const getWeatherDescription = (code) => {
    // WMO Weather interpretation codes
    const codes = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail',
    };
    return codes[code] || 'Unknown';
  };

  if (!tripData && checkpoints.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-slate-900/50">
      <div className="max-w-4xl mx-auto px-6">
        <div className="space-y-8">
          {/* Route Section */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Navigation className="w-6 h-6 text-teal-400" />
              Route Optimization & Verification
            </h2>
            <MapBoxRoute
              checkpoints={checkpoints}
              onVerifiedLocations={setVerifiedLocations}
              onRouteData={setRouteData}
            />
          </div>

          {/* Weather Section */}
          {Object.keys(weather).length > 0 ? (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Cloud className="w-6 h-6 text-blue-400" />
                Weather Forecast
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(weather).map(([location, data]) => (
                  <div
                    key={location}
                    className="rounded-xl border border-slate-700 bg-slate-900/60 p-5 hover:border-slate-600 transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-white">{location}</h3>
                          <p className="text-xs text-slate-400 mt-1">
                            {getWeatherDescription(data.weatherCode)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-slate-800/50 p-3">
                        <p className="text-xs text-slate-400 mb-1">Temperature</p>
                        <p className="text-lg font-bold text-white">{data.temperature}°C</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Feels: {data.apparentTemp}°C
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-800/50 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Droplets className="w-4 h-4 text-blue-400" />
                          <p className="text-xs text-slate-400">Humidity</p>
                        </div>
                        <p className="text-lg font-bold text-white">{data.humidity}%</p>
                      </div>
                    </div>

                    {/* Weather advisory */}
                    {data.weatherCode >= 61 && (
                      <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2">
                        <p className="text-xs text-yellow-200">
                          ⚠ Rain expected. Pack waterproofing and adjust outdoor activities.
                        </p>
                      </div>
                    )}
                    {data.weatherCode >= 71 && (
                      <div className="mt-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2">
                        <p className="text-xs text-blue-200">
                          ❄ Snow possible. Check trail conditions and bring appropriate gear.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : weatherLoading ? (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-8 text-center">
              <p className="text-slate-300 animate-pulse">Loading weather information...</p>
            </div>
          ) : null}

          {/* Summary */}
          {routeData ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
              <h3 className="font-semibold text-white mb-3">Trip Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Total Distance</p>
                  <p className="text-sm font-semibold text-emerald-300">{routeData.distance}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Estimated Duration</p>
                  <p className="text-sm font-semibold text-emerald-300">{routeData.duration}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Transport Cost</p>
                  <p className="text-sm font-semibold text-emerald-300">{routeData.estimatedCost}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Verified Locations</p>
                  <p className="text-sm font-semibold text-emerald-300">
                    {Object.keys(verifiedLocations).length} of {checkpoints.length}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
