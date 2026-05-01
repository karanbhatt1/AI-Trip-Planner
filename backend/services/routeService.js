const MAPBOX_TOKEN =
  process.env.MAPBOX_TOKEN ||
  process.env.MAPBOX_ACCESS_TOKEN ||
  process.env.VITE_MAPBOX_TOKEN ||
  process.env.VITE_MAPBOX_API_KEY;

function isValidCoordinatePoint(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lng);
}

function normalizeInputPoint(point, fallbackName = '') {
  if (!point) {
    return null;
  }

  if (typeof point === 'string') {
    const trimmed = point.trim();
    return trimmed ? { name: trimmed } : null;
  }

  if (isValidCoordinatePoint(point)) {
    return {
      name: point.name || point.location || fallbackName || 'Location',
      lat: point.lat,
      lng: point.lng,
    };
  }

  const name = point.name || point.location || point.title || fallbackName;
  return name ? { name: String(name).trim() } : null;
}

function getMapboxQuery(point) {
  if (!point) {
    return '';
  }

  if (typeof point === 'string') {
    return point.trim();
  }

  return String(point.name || point.location || point.title || '').trim();
}

async function geocodePoint(point, index = 0) {
  const normalized = normalizeInputPoint(point, `Stop ${index + 1}`);
  if (!normalized) {
    return null;
  }

  if (isValidCoordinatePoint(normalized)) {
    return normalized;
  }

  const query = getMapboxQuery(normalized);
  if (!query) {
    return null;
  }

  if (!MAPBOX_TOKEN) {
    throw new Error('MAPBOX_TOKEN is not configured on the backend.');
  }

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=IN&limit=1&access_token=${MAPBOX_TOKEN}`
  );

  if (!response.ok) {
    throw new Error(`Failed to geocode location: ${query}`);
  }

  const data = await response.json();
  const feature = data?.features?.[0];
  if (!feature?.geometry?.coordinates || feature.geometry.coordinates.length < 2) {
    return null;
  }

  return {
    name: feature.place_name || query,
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0],
  };
}

function formatDuration(durationSeconds) {
  const totalMinutes = Math.round(durationSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = totalMinutes / 60;
  return `${hours.toFixed(1)} hrs`;
}

function buildRouteSummary(route, orderedPoints) {
  const legs = Array.isArray(route?.legs) ? route.legs : [];
  const segments = legs.map((leg, index) => ({
    from: orderedPoints[index]?.name || `Stop ${index + 1}`,
    to: orderedPoints[index + 1]?.name || `Stop ${index + 2}`,
    distance: (leg.distance / 1000).toFixed(1),
    time: formatDuration(leg.duration),
    distanceRaw: leg.distance / 1000,
  }));

  return {
    totalDistance: (route.distance / 1000).toFixed(1),
    totalTime: formatDuration(route.duration),
    segments,
    optimization: 'Mapbox optimized route',
  };
}

function buildCheckpointList(orderedPoints, routeWaypoints = []) {
  return orderedPoints.map((point, index) => ({
    name: point.name,
    lat: point.lat,
    lng: point.lng,
    description: index === 0
      ? 'Starting point of your route'
      : index === orderedPoints.length - 1
        ? 'Destination point of your route'
        : `Verified checkpoint ${index + 1}`,
    why: routeWaypoints[index]?.name ? `Verified via Mapbox: ${routeWaypoints[index].name}` : 'Verified via Mapbox',
  }));
}

async function fetchMapboxJson(url, failureLabel) {
  const response = await fetch(url);
  const bodyText = await response.text();

  if (!response.ok) {
    let message = `${failureLabel} failed.`;
    try {
      const parsed = JSON.parse(bodyText);
      message = parsed?.message || parsed?.error || message;
    } catch {
      if (bodyText) {
        message = bodyText;
      }
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return bodyText ? JSON.parse(bodyText) : {};
}

export async function getOptimizedRoute(source, destination, waypoints = [], preferences = {}) {
  if (!MAPBOX_TOKEN) {
    throw new Error('MAPBOX_TOKEN is not configured on the backend.');
  }

  const sourcePoint = await geocodePoint(source, 0);
  const destinationPoint = await geocodePoint(destination, 1);

  if (!sourcePoint || !destinationPoint) {
    throw new Error('Source and destination must be valid, verifiable locations.');
  }

  const verifiedWaypoints = [];
  for (let index = 0; index < waypoints.length; index += 1) {
    const verified = await geocodePoint(waypoints[index], index + 2);
    if (verified) {
      verifiedWaypoints.push(verified);
    }
  }

  const orderedPoints = [sourcePoint, ...verifiedWaypoints, destinationPoint];
  if (orderedPoints.length < 2) {
    throw new Error('Need at least a source and destination to create a route.');
  }

  const coordinates = orderedPoints.map((point) => `${point.lng},${point.lat}`).join(';');
  const mapboxUrl =
    `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinates}` +
    `?source=first&destination=last&roundtrip=false&geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;

  let data;
  let trip;

  try {
    data = await fetchMapboxJson(mapboxUrl, 'Mapbox route optimization');
    trip = data?.trips?.[0];
    if (!trip) {
      throw new Error('Mapbox did not return a valid optimized route.');
    }
  } catch (optimizationError) {
    const directionsUrl =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}` +
      `?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;

    try {
      data = await fetchMapboxJson(directionsUrl, 'Mapbox directions fallback');
      trip = data?.routes?.[0];
      if (!trip) {
        throw new Error('Mapbox did not return a valid route.');
      }
    } catch (fallbackError) {
      throw new Error(
        `Mapbox route optimization failed: ${optimizationError.message}. Fallback directions also failed: ${fallbackError.message}`
      );
    }
  }

  const waypointOrder = Array.isArray(data?.waypoints)
    ? [...data.waypoints].sort((left, right) => (left.waypoint_index ?? 0) - (right.waypoint_index ?? 0))
    : [];

  const routePointsByIndex = waypointOrder.length > 0
    ? waypointOrder.map((waypoint, index) => ({
        name: waypoint?.name || orderedPoints[index]?.name || `Stop ${index + 1}`,
        lat: waypoint?.location?.[1] ?? orderedPoints[index]?.lat,
        lng: waypoint?.location?.[0] ?? orderedPoints[index]?.lng,
      }))
    : orderedPoints;

  return {
    checkpoints: buildCheckpointList(routePointsByIndex, routePointsByIndex),
    routeSummary: buildRouteSummary(trip, routePointsByIndex),
    routeGeometry: trip.geometry,
    preferences,
  };
}
