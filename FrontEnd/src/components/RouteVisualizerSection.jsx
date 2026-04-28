import { useEffect, useMemo, useState } from 'react';
import { MapPin, ExternalLink, CloudSun, Thermometer, Wind, CalendarDays } from 'lucide-react';
import RoutePlanner from './RoutePlanner';

/**
 * RouteVisualizerSection Component
 * Displays route visualization with Google Maps integration
 * Can be used in trip details and saved itineraries
 */
const RouteVisualizerSection = ({ tripData, showTitle = true }) => {
  const openWeatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
  const [weatherRetryKey, setWeatherRetryKey] = useState(0);
  const [weatherState, setWeatherState] = useState({
    isLoading: false,
    error: '',
    destinationName: '',
    forecast: [],
  });

  if (!tripData?.itinerary && !tripData?.places) {
    return null;
  }

  const parseCoordinates = (value) => {
    if (!value || typeof value !== 'string') return null;
    const [latRaw, lngRaw] = value.split(',').map((part) => Number(part.trim()));
    if (!Number.isFinite(latRaw) || !Number.isFinite(lngRaw)) return null;
    return { lat: latRaw, lng: lngRaw };
  };

  const startingLocation = useMemo(() => {
    const coords = parseCoordinates(tripData.startingCoordinates) || parseCoordinates(tripData.startingPosition);
    if (!coords) return null;

    return {
      name: tripData.startingPosition || 'Current Location',
      lat: coords.lat,
      lng: coords.lng,
      description: 'Current user location',
    };
  }, [tripData.startingCoordinates, tripData.startingPosition]);

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

  const resolvePointForMaps = (point) => {
    if (!point) return '';
    if (point.lat && point.lng) {
      return `${point.lat},${point.lng}`;
    }
    return encodeURIComponent(point.name || '');
  };

  const getWeatherIconUrl = (iconCode) => {
    if (!iconCode) {
      return 'https://openweathermap.org/img/wn/01d@2x.png';
    }
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const formatDay = (dateIso, index) => {
    if (index === 0) return 'Today';
    const parsedDate = new Date(dateIso);
    return parsedDate.toLocaleDateString(undefined, { weekday: 'short' });
  };

  const parseDayHighlightsFromText = (itineraryText = '') => {
    if (!itineraryText || typeof itineraryText !== 'string') {
      return [];
    }

    const matches = [...itineraryText.matchAll(/\*\*Day\s+(\d+)\s*:\s*([^*\n]+)\*\*/gi)];
    return matches.map((match, index) => ({
      dayNumber: Number(match[1]) || index + 1,
      highlights: [String(match[2] || '').trim()].filter(Boolean),
    }));
  };

  const itineraryDayHighlights = useMemo(() => {
    const structuredDays = Array.isArray(tripData?.itineraryStructured?.days)
      ? tripData.itineraryStructured.days
      : [];

    if (structuredDays.length > 0) {
      return structuredDays.map((day, index) => {
        const checkpoints = Array.isArray(day?.checkpoints) ? day.checkpoints : [];
        const summary = typeof day?.summary === 'string' ? day.summary.trim() : '';

        const checkpointHighlights = checkpoints
          .map((checkpoint) => String(checkpoint?.title || '').trim())
          .filter(Boolean)
          .slice(0, 3);

        const highlights = summary ? [summary, ...checkpointHighlights] : checkpointHighlights;

        return {
          dayNumber: Number(day?.dayNumber) || index + 1,
          highlights,
        };
      });
    }

    return parseDayHighlightsFromText(tripData?.itinerary || '');
  }, [tripData?.itineraryStructured, tripData?.itinerary]);

  useEffect(() => {
    const destinationName =
      lastPlace?.name ||
      (typeof lastPlace === 'string' ? lastPlace : '') ||
      tripData?.currentDestination ||
      tripData?.destinations?.[0];

    if (!destinationName) {
      setWeatherState({ isLoading: false, error: '', destinationName: '', forecast: [] });
      return;
    }

    const fetchWeather = async () => {
      setWeatherState({ isLoading: true, error: '', destinationName, forecast: [] });

      try {
        if (!openWeatherApiKey) {
          throw new Error('Missing VITE_OPENWEATHER_API_KEY in frontend environment.');
        }

        const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(destinationName)}&limit=1&appid=${openWeatherApiKey}`);
        if (!geoResponse.ok) {
          throw new Error('Unable to geocode destination');
        }

        const geoData = await geoResponse.json();
        const geo = geoData?.[0];
        if (!Number.isFinite(geo?.lat) || !Number.isFinite(geo?.lon)) {
          throw new Error('Destination coordinates not found');
        }

        const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${geo.lat}&lon=${geo.lon}&units=metric&appid=${openWeatherApiKey}`);
        const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${geo.lat}&lon=${geo.lon}&units=metric&appid=${openWeatherApiKey}`);

        if (!weatherResponse.ok || !forecastResponse.ok) {
          throw new Error('Unable to fetch weather');
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();

        const list = Array.isArray(forecastData?.list) ? forecastData.list : [];
        if (!list.length) {
          throw new Error('Weather forecast unavailable');
        }

        const groupedByDay = {};
        for (const item of list) {
          const date = item.dt_txt?.split(' ')[0];
          if (!date) continue;

          if (!groupedByDay[date]) {
            groupedByDay[date] = [];
          }
          groupedByDay[date].push(item);
        }

        const nextSixDays = Object.keys(groupedByDay).slice(0, 6);
        const forecast = nextSixDays.map((date, index) => {
          const slots = groupedByDay[date];
          const minTemp = Math.min(...slots.map((slot) => slot.main?.temp_min ?? slot.main?.temp ?? 0));
          const maxTemp = Math.max(...slots.map((slot) => slot.main?.temp_max ?? slot.main?.temp ?? 0));

          const middaySlot =
            slots.find((slot) => String(slot.dt_txt || '').includes('12:00:00')) ||
            slots[Math.floor(slots.length / 2)];

          const weatherMain = middaySlot?.weather?.[0] || {};

          return {
            day: formatDay(date, index),
            date,
            weatherLabel: weatherMain.description || 'Variable weather',
            maxTemp,
            minTemp,
            iconCode: weatherMain.icon || '01d',
          };
        });

        const currentWeather = {
          temperature_2m: weatherData?.main?.temp,
          wind_speed_10m: weatherData?.wind?.speed,
          weatherLabel: weatherData?.weather?.[0]?.description || 'Variable weather',
          iconCode: weatherData?.weather?.[0]?.icon || '01d',
        };

        setWeatherState({
          isLoading: false,
          error: '',
          destinationName,
          forecast,
          current: currentWeather,
        });
      } catch (error) {
        setWeatherState({
          isLoading: false,
          error: error.message || 'Unable to fetch weather',
          destinationName,
          forecast: [],
        });
      }
    };

    fetchWeather();
  }, [tripData, lastPlace, weatherRetryKey, openWeatherApiKey]);

  // Generate Google Maps URL
  const generateGoogleMapsURL = () => {
    if (!firstPlace || !lastPlace) return null;

    const originPoint = startingLocation || firstPlace;
    const start = resolvePointForMaps(originPoint);
    const end = resolvePointForMaps(lastPlace);

    // If we have waypoints, add them
    let waypoints = '';
    if (places.length > 2) {
      waypoints = places
        .slice(1, -1)
        .map(resolvePointForMaps)
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

      {/* Mini Map Section */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-6">
        <div className="mb-5">
          <h3 className="text-xl font-bold text-white">Mini Map</h3>
          <p className="text-slate-400 text-sm">Route starts from your detected current location</p>
        </div>
        <RoutePlanner tripData={tripData} startingLocation={startingLocation} compact />
      </div>

      {/* Weather Section */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
            <CloudSun className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Destination Weather</h3>
            <p className="text-slate-400 text-sm">
              Current weather + next 5 days for {weatherState.destinationName || 'destination'}
            </p>
          </div>
        </div>

        {weatherState.isLoading ? (
          <p className="text-slate-300 animate-pulse">Loading weather forecast...</p>
        ) : null}

        {weatherState.error ? (
          <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
            <p className="text-sm text-amber-300">{weatherState.error}</p>
            <button
              type="button"
              onClick={() => setWeatherRetryKey((prev) => prev + 1)}
              className="mt-3 px-3 py-1.5 text-xs rounded-md border border-amber-300/40 text-amber-200 hover:bg-amber-500/20 transition"
            >
              Retry Weather Fetch
            </button>
          </div>
        ) : null}

        {!weatherState.isLoading && !weatherState.error && weatherState.current ? (
          <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-300 mb-2">Current Conditions</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-200">
                <img
                  src={getWeatherIconUrl(weatherState.current.iconCode)}
                  alt={weatherState.current.weatherLabel}
                  className="w-8 h-8"
                />
                <span className="capitalize">{weatherState.current.weatherLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <Thermometer className="w-4 h-4 text-orange-300" />
                {Math.round(weatherState.current.temperature_2m)}°C
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <Wind className="w-4 h-4 text-cyan-300" />
                {Math.round((weatherState.current.wind_speed_10m || 0) * 3.6)} km/h
              </div>
            </div>
          </div>
        ) : null}

        {!weatherState.isLoading && !weatherState.error && weatherState.forecast.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {weatherState.forecast.map((item) => (
              <article key={item.date} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                <p className="text-xs text-cyan-300 font-semibold">{item.day}</p>
                <img
                  src={getWeatherIconUrl(item.iconCode)}
                  alt={item.weatherLabel}
                  className="w-10 h-10 mt-1"
                />
                <p className="text-xs text-slate-400 mt-1 capitalize">{item.weatherLabel}</p>
                <p className="text-sm text-white mt-2">{Math.round(item.maxTemp)}° / {Math.round(item.minTemp)}°</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      {/* Day-wise Route Highlights */}
      {itineraryDayHighlights.length > 0 ? (
        <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Day-wise Route Highlights</h3>
              <p className="text-slate-400 text-sm">Structured overview: Day 1, Day 2, and so on</p>
            </div>
          </div>

          <div className="space-y-3">
            {itineraryDayHighlights.map((item) => (
              <article key={`day-highlight-${item.dayNumber}`} className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <p className="text-sm text-slate-100 leading-relaxed">
                  <span className="text-teal-300 font-semibold">Day {item.dayNumber}:</span>{' '}
                  {item.highlights.length > 0
                    ? item.highlights.join(' | ')
                    : 'Highlights will be available after itinerary generation.'}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RouteVisualizerSection;