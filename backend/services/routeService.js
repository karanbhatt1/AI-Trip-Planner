// No longer need geolib - using Haversine formula instead

// Sample places database (in a real app, this would come from a database or external API)
const SAMPLE_PLACES = [
  {
    name: 'Delhi',
    lat: 28.6139,
    lng: 77.2090,
    description: 'Capital city of India',
    category: 'city',
    popularity: 10
  },
  {
    name: 'Agra',
    lat: 27.1767,
    lng: 78.0081,
    description: 'Home to the Taj Mahal',
    category: 'historical',
    popularity: 9
  },
  {
    name: 'Jaipur',
    lat: 26.9124,
    lng: 75.7873,
    description: 'Pink City of India',
    category: 'historical',
    popularity: 8
  },
  {
    name: 'Murthal',
    lat: 29.0167,
    lng: 77.0667,
    description: 'Famous for parathas and dhabas',
    category: 'food',
    popularity: 6
  },
  {
    name: 'Panipat',
    lat: 29.3909,
    lng: 76.9635,
    description: 'Historical city with Mughal heritage',
    category: 'historical',
    popularity: 5
  },
  {
    name: 'Nainital',
    lat: 29.3919,
    lng: 79.4542,
    description: 'Lake city in Uttarakhand',
    category: 'nature',
    popularity: 7
  },
  {
    name: 'Rishikesh',
    lat: 30.0869,
    lng: 78.2676,
    description: 'Adventure capital of India',
    category: 'adventure',
    popularity: 8
  }
];

// Simple TSP-like optimization using nearest neighbor algorithm
function optimizeRoute(points) {
  if (points.length <= 2) return points;

  const optimized = [points[0]]; // Start with first point
  const remaining = [...points.slice(1)];

  while (remaining.length > 0) {
    const lastPoint = optimized[optimized.length - 1];
    let nearestIndex = 0;
    let minDistance = calculateDistance(lastPoint, remaining[0]);

    // Find nearest remaining point
    for (let i = 1; i < remaining.length; i++) {
      const distance = calculateDistance(lastPoint, remaining[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    // Add nearest point to optimized route
    optimized.push(remaining[nearestIndex]);
    remaining.splice(nearestIndex, 1);
  }

  return optimized;
}

// Helper function to calculate distance between two points
function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Calculate route segments with distances and times
function calculateRouteSegments(checkpoints) {
  const segments = [];
  let totalDistance = 0;

  for (let i = 0; i < checkpoints.length - 1; i++) {
    const from = checkpoints[i];
    const to = checkpoints[i + 1];

    // Calculate distance using Haversine formula
    const distance = calculateDistance(from, to);
    totalDistance += distance;

    // Estimate travel time (assuming average speed of 60 km/h for highways)
    const timeHours = distance / 60;
    const timeString = timeHours < 1
      ? `${Math.round(timeHours * 60)} min`
      : `${timeHours.toFixed(1)} hrs`;

    segments.push({
      from: from.name,
      to: to.name,
      distance: distance.toFixed(1),
      time: timeString,
      distanceRaw: distance
    });
  }

  return { segments, totalDistance: totalDistance.toFixed(1) };
}

// Generate AI-optimized checkpoints between source and destination
function generateAICheckpoints(source, destination, preferences = {}) {
  const { budget = 'medium', interests = [], maxStops = 5 } = preferences;

  // Find relevant places based on interests and route
  let relevantPlaces = SAMPLE_PLACES.filter(place => {
    // Filter by interests if specified
    if (interests.length > 0) {
      return interests.some(interest =>
        place.category.toLowerCase().includes(interest.toLowerCase()) ||
        place.description.toLowerCase().includes(interest.toLowerCase())
      );
    }
    return true;
  });

  // Sort by popularity and proximity to route
  relevantPlaces.sort((a, b) => {
    const aDistance = Math.min(
      calculateDistance(a, source),
      calculateDistance(a, destination)
    );

    const bDistance = Math.min(
      calculateDistance(b, source),
      calculateDistance(b, destination)
    );

    // Prefer closer places, then more popular ones
    return (aDistance * 0.7 + (10 - a.popularity) * 1000) -
           (bDistance * 0.7 + (10 - b.popularity) * 1000);
  });

  // Limit number of checkpoints
  const checkpoints = relevantPlaces.slice(0, Math.min(maxStops, relevantPlaces.length));

  return checkpoints.map((place, index) => ({
    ...place,
    why: generateWhyText(place, index + 1, preferences)
  }));
}

function generateWhyText(place, position, preferences) {
  const reasons = [
    `Popular ${place.category} destination along your route`,
    `Highly rated spot for ${preferences.interests?.join(' and ') || 'travelers'}`,
    `Perfect stopover point ${position} on your journey`,
    `Recommended by fellow travelers for its ${place.category} experience`,
    `Strategic location to break up your long drive`
  ];

  return reasons[Math.floor(Math.random() * reasons.length)];
}

// Main route optimization function
export async function getOptimizedRoute(source, destination, waypoints = [], preferences = {}) {
  try {
    // Convert string inputs to coordinate objects if needed
    const sourcePoint = typeof source === 'string'
      ? findPlaceByName(source) || { name: source, lat: 28.6139, lng: 77.2090 }
      : source;

    const destPoint = typeof destination === 'string'
      ? findPlaceByName(destination) || { name: destination, lat: 27.1767, lng: 78.0081 }
      : destination;

    // Convert waypoints
    const waypointPoints = waypoints.map(wp =>
      typeof wp === 'string' ? findPlaceByName(wp) || createWaypointFromString(wp) : wp
    );

    // Generate AI checkpoints if no waypoints provided
    let allPoints = [sourcePoint];
    if (waypointPoints.length === 0) {
      const aiCheckpoints = generateAICheckpoints(sourcePoint, destPoint, preferences);
      allPoints = allPoints.concat(aiCheckpoints);
    } else {
      allPoints = allPoints.concat(waypointPoints);
    }
    allPoints.push(destPoint);

    // Remove duplicates
    allPoints = allPoints.filter((point, index, self) =>
      index === self.findIndex(p => p.name === point.name)
    );

    // Optimize route order using TSP-like algorithm
    const optimizedPoints = optimizeRoute(allPoints);

    // Calculate route segments
    const { segments, totalDistance } = calculateRouteSegments(optimizedPoints);

    // Calculate total time
    const totalTimeHours = segments.reduce((total, segment) => {
      const timeMatch = segment.time.match(/(\d+(?:\.\d+)?)\s*(min|hrs?)/);
      if (timeMatch) {
        const value = parseFloat(timeMatch[1]);
        const unit = timeMatch[2];
        return total + (unit.startsWith('hr') ? value : value / 60);
      }
      return total;
    }, 0);

    const totalTime = totalTimeHours < 1
      ? `${Math.round(totalTimeHours * 60)} min`
      : `${totalTimeHours.toFixed(1)} hrs`;

    return {
      checkpoints: optimizedPoints.map((point, index) => ({
        name: point.name,
        lat: point.lat,
        lng: point.lng,
        description: point.description || `Stop ${index + 1} on your route`,
        why: point.why || `Optimized stop ${index + 1}`
      })),
      routeSummary: {
        totalDistance,
        totalTime,
        segments,
        optimization: 'AI-optimized using nearest neighbor algorithm'
      }
    };

  } catch (error) {
    console.error('Error in getOptimizedRoute:', error);
    throw new Error('Failed to optimize route');
  }
}

function findPlaceByName(name) {
  return SAMPLE_PLACES.find(place =>
    place.name.toLowerCase() === name.toLowerCase()
  );
}

function createWaypointFromString(name) {
  // Create a basic waypoint with random coordinates near Delhi
  const baseLat = 28.6139;
  const baseLng = 77.2090;
  const variance = 0.5;

  return {
    name,
    lat: baseLat + (Math.random() - 0.5) * variance,
    lng: baseLng + (Math.random() - 0.5) * variance,
    description: `Waypoint: ${name}`,
    why: 'Custom waypoint added to route'
  };
}