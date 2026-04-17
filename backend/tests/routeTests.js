/**
 * Route Planning API - Test Utilities
 * Use these scripts to test the route API endpoints
 */

// ============= API ENDPOINTS =============

const API_BASE_URL = 'http://localhost:5000/api';

// ============= TEST CASES =============

/**
 * Test Case 1: Delhi to Agra with Historical Interests
 */
const testCase1 = {
  name: 'Delhi to Agra - Historical Route',
  request: {
    source: {
      name: 'Delhi',
      lat: 28.6139,
      lng: 77.2090
    },
    destination: {
      name: 'Agra',
      lat: 27.1767,
      lng: 78.0081
    },
    preferences: {
      budget: 'medium',
      interests: ['historical'],
      maxStops: 5
    }
  }
};

/**
 * Test Case 2: Pune to Goa - Beach Route
 */
const testCase2 = {
  name: 'Pune to Goa - Adventure Route',
  request: {
    source: {
      name: 'Pune',
      lat: 18.5204,
      lng: 73.8567
    },
    destination: {
      name: 'Goa',
      lat: 15.4909,
      lng: 73.8278
    },
    preferences: {
      budget: 'high',
      interests: ['adventure', 'nature'],
      maxStops: 4
    }
  }
};

/**
 * Test Case 3: Delhi Golden Triangle - All interests
 */
const testCase3 = {
  name: 'Delhi Golden Triangle Full Tour',
  request: {
    source: {
      name: 'Delhi',
      lat: 28.6139,
      lng: 77.2090
    },
    destination: {
      name: 'Jaipur',
      lat: 26.9124,
      lng: 75.7873
    },
    waypoints: [
      {
        name: 'Agra',
        lat: 27.1767,
        lng: 78.0081
      }
    ],
    preferences: {
      budget: 'medium',
      interests: ['historical', 'food', 'nature'],
      maxStops: 6
    }
  }
};

// ============= HELPER FUNCTIONS =============

/**
 * Format route response for display
 */
function formatRouteResponse(data) {
  console.log('\n=== ROUTE OPTIMIZATION RESULT ===\n');
  console.log(`Total Distance: ${data.routeSummary.totalDistance} km`);
  console.log(`Total Time: ${data.routeSummary.totalTime}`);
  console.log(`Stops: ${data.checkpoints.length}\n`);
  
  console.log('CHECKPOINTS:');
  data.checkpoints.forEach((cp, idx) => {
    console.log(`${idx + 1}. ${cp.name}`);
    console.log(`   Location: ${cp.lat.toFixed(4)}, ${cp.lng.toFixed(4)}`);
    console.log(`   Info: ${cp.description}`);
    console.log(`   Why: ${cp.why}\n`);
  });

  console.log('ROUTE SEGMENTS:');
  data.routeSummary.segments.forEach((seg, idx) => {
    console.log(`${idx + 1}. ${seg.from} → ${seg.to}`);
    console.log(`   Distance: ${seg.distance} km`);
    console.log(`   Time: ${seg.time}\n`);
  });
}

/**
 * Calculate route statistics
 */
function calculateStats(data) {
  const stats = {
    totalCheckpoints: data.checkpoints.length,
    totalDistance: parseFloat(data.routeSummary.totalDistance),
    averageDistanceBetweenStops: 
      parseFloat(data.routeSummary.totalDistance) / (data.checkpoints.length - 1),
    routeEfficiency: data.routeSummary.optimization,
    estimatedCost: {
      fuel: (parseFloat(data.routeSummary.totalDistance) / 8 * 8).toFixed(2), // ₹8 per km
      lodging: (data.checkpoints.length - 1) * 2000,
      food: (data.checkpoints.length - 1) * 1000
    }
  };
  return stats;
}

/**
 * Display route on map
 */
function displayRouteStats(data) {
  const stats = calculateStats(data);
  console.log('\n=== ROUTE STATISTICS ===\n');
  console.log(`Number of Stops: ${stats.totalCheckpoints}`);
  console.log(`Total Distance: ${stats.totalDistance} km`);
  console.log(`Avg Distance/Stop: ${stats.averageDistanceBetweenStops.toFixed(1)} km`);
  console.log(`Optimization Method: ${stats.routeEfficiency}`);
  console.log(`\nEstimated Costs:`);
  console.log(`  Fuel: ₹${stats.estimatedCost.fuel}`);
  console.log(`  Lodging: ₹${stats.estimatedCost.lodging}`);
  console.log(`  Food: ₹${stats.estimatedCost.food}`);
  console.log(`  Total: ₹${
    parseFloat(stats.estimatedCost.fuel) + 
    stats.estimatedCost.lodging + 
    stats.estimatedCost.food
  }\n`);
}

// ============= EXPORT FOR TESTING =============

module.exports = {
  testCase1,
  testCase2,
  testCase3,
  formatRouteResponse,
  calculateStats,
  displayRouteStats,
  API_BASE_URL
};