// Route Planner Integration Guide

/**
 * INTEGRATION IN TRIP PLANNER FORM
 * 
 * The RoutePlanner component is automatically integrated in the trip details view.
 * When a user views a saved itinerary, the map appears below the itinerary.
 */

// ============= STEP 1: ADD COMPONENT TO FORM =============

// In TripPlannerForm.jsx (already added)
// import RoutePlanner from './RoutePlanner';

// In the saved trip section (around line 870):
// {savedTrip?.itinerary && (
//   <div className="mt-8">
//     <RoutePlanner tripData={savedTrip} />
//   </div>
// )}

// ============= STEP 2: USAGE EXAMPLES =============

/**
 * Example 1: Using with Backend Trip Data
 */
const exampleBackendTrip = {
  _id: '123abc',
  startDate: '2026-04-17',
  endDate: '2026-04-20',
  travelers: 2,
  budget: '8-16k',
  interests: ['historical', 'food'],
  destinations: ['Delhi', 'Agra', 'Jaipur'],
  itinerary: `Your Planned itinerary is...`,
  // Places will be extracted from itinerary automatically
};

/**
 * Example 2: Using with Pre-defined Places
 */
const exampleWithPlaces = {
  startDate: '2026-04-17',
  endDate: '2026-04-20',
  travelers: 2,
  budget: '8-16k',
  interests: ['historical'],
  destinations: ['Delhi', 'Agra'],
  places: [
    {
      name: 'Delhi',
      lat: 28.6139,
      lng: 77.2090,
      description: 'Capital city',
      why: 'Starting point'
    },
    {
      name: 'Agra',
      lat: 27.1767,
      lng: 78.0081,
      description: 'Taj Mahal',
      why: 'Famous historical site'
    }
  ]
};

// ============= STEP 3: API USAGE =============

/**
 * Making requests to the Route API
 */

import apiClient from '../services/apiClient';

// Method 1: Using the component (automatic)
// The component handles this internally

// Method 2: Manual API call
async function generateRoute() {
  try {
    const response = await apiClient.post('/api/route', {
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
        interests: ['historical', 'food'],
        maxStops: 5
      }
    });

    console.log('Route data:', response.data);
    // Output: { checkpoints: [...], routeSummary: {...} }
  } catch (error) {
    console.error('Route generation failed:', error);
  }
}

// ============= STEP 4: CUSTOMIZATION =============

/**
 * Props for RoutePlanner Component
 */
const routePlannerProps = {
  // Required: Trip data with itinerary or places
  tripData: {
    // One of these must be provided:
    itinerary: String,        // Will be parsed for places
    places: Array,            // Pre-parsed places array
    
    // Optional: Used for context
    preferences: {
      budget: String,
      interests: Array
    }
  }
};

/**
 * Customize RouteMap Component
 */
const routeMapProps = {
  checkpoints: [              // Array of checkpoint objects
    {
      name: String,
      lat: Number,
      lng: Number,
      description: String,
      why: String
    }
  ],
  onCheckpointClick: Function, // (index) => void
  selectedCheckpoint: Number   // Index of selected checkpoint
};

/**
 * Customize RouteSidebar Component
 */
const routeSidebarProps = {
  checkpoints: Array,
  routeSummary: {
    totalDistance: String,     // e.g., "356.3"
    totalTime: String,         // e.g., "5.9 hrs"
    segments: [
      {
        from: String,
        to: String,
        distance: String,
        time: String
      }
    ]
  },
  selectedCheckpoint: Number,
  onCheckpointClick: Function,
  isLoading: Boolean
};

// ============= STEP 5: STYLING & THEMING =============

/**
 * Customize Colors
 * Edit src/index.css to change:
 * - Marker colors (colors array in RouteMap.jsx)
 * - Map theme (leaflet-container, leaflet-popup-content-wrapper)
 * - Sidebar colors (Tailwind classes in RouteSidebar.jsx)
 */

// Current color scheme:
const colorScheme = {
  markerColors: [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899'  // pink
  ],
  mapBackground: '#1e293b',
  popupBackground: '#334155',
  highlightColor: '#14b8a6', // teal
  textColor: '#f1f5f9'
};

// ============= STEP 6: ERROR HANDLING =============

/**
 * Handling Common Errors
 */

// 1. No places to display
if (!checkpoints || checkpoints.length === 0) {
  // Component shows: "No route to display"
}

// 2. API errors
try {
  const route = await apiClient.post('/api/route', data);
} catch (error) {
  const errorMessage = error.response?.data?.message || 
                      error.message || 
                      'Failed to generate route';
  console.error(errorMessage);
  // Component shows error banner with message
}

// 3. Invalid coordinates
// Component validates and shows fallback message

// ============= STEP 7: TESTING =============

/**
 * Test Scenarios
 */

// Scenario 1: Basic route
const test1 = {
  source: { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
  destination: { name: 'Agra', lat: 27.1767, lng: 78.0081 }
};

// Scenario 2: With waypoints
const test2 = {
  source: { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
  destination: { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  waypoints: [
    { name: 'Agra', lat: 27.1767, lng: 78.0081 }
  ]
};

// Scenario 3: With preferences
const test3 = {
  source: { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
  destination: { name: 'Goa', lat: 15.4909, lng: 73.8278 },
  preferences: {
    budget: 'high',
    interests: ['beach', 'adventure'],
    maxStops: 6
  }
};

// ============= STEP 8: ADVANCED FEATURES =============

/**
 * Feature: Extract Places from Itinerary
 * The component automatically extracts place names from markdown
 */
const itineraryText = `Your Planned itinerary is

**Day 1: 2026-04-17**

**Delhi Arrival and Breakfast** - Start at Delhi
**Naini Lake Boat Ride** - Visit Naini Lake in Nainital
**Rishikesh Visit** - Explore Rishikesh

**Day 2: 2026-04-18**

**Agra Fort** - See the magnificent Agra Fort
**Taj Mahal** - Visit the iconic Taj Mahal
`;

// Automatically extracted places:
// - Delhi
// - Nainital (from "Naini Lake")
// - Rishikesh
// - Agra
// - (Taj Mahal - not primary place)

/**
 * Feature: Interactive Selection
 * Users can click on checkpoints to:
 * - Highlight on map
 * - View full details
 * - Get AI explanation ("why this checkpoint")
 */

const checkpoint = {
  name: 'Panipat',
  lat: 29.3909,
  lng: 76.9635,
  description: 'Historical city with Mughal heritage',
  category: 'historical',
  why: 'Popular historical destination along your route'
};

// When clicked:
// 1. Marker highlights on map
// 2. Sidebar scrolls to checkpoint
// 3. Popup shows full information
// 4. AI explanation displayed

// ============= STEP 9: PERFORMANCE OPTIMIZATION =============

/**
 * Tips for Better Performance
 */

// 1. Lazy load the map component
const RoutePlannerLazy = React.lazy(() => import('./RoutePlanner'));

// 2. Memoize calculations
const memoizedRoute = useMemo(() => 
  generateRoute(tripData), 
  [tripData]
);

// 3. Virtualize long checkpoint lists
// For >100 checkpoints, use react-window

// 4. Debounce marker clicks
const debouncedOnClick = debounce(onCheckpointClick, 300);

// ============= STEP 10: DEPLOYMENT =============

/**
 * Prerequisites for Production
 */

// 1. Environment variables
// - API_URL pointing to backend
// - Map tile server configured
// - Error logging service

// 2. Performance monitoring
// - Route generation time tracked
// - Map render performance measured
// - API response times logged

// 3. Security
// - Input validation on coordinates
// - Rate limiting on API requests
// - CORS configured properly

// 4. Testing
// - Unit tests for distance calculations
// - Integration tests for API calls
// - E2E tests for full workflow

/**
 * Production Checklist
 */
const productionChecklist = [
  '✅ All env variables configured',
  '✅ Error handling tested',
  '✅ Performance optimized',
  '✅ Mobile responsive tested',
  '✅ Browser compatibility verified',
  '✅ Accessibility standards met',
  '✅ Documentation complete',
  '✅ Rate limiting enabled',
  '✅ API authentication configured',
  '✅ Monitoring and logging set up'
];

export {
  exampleBackendTrip,
  exampleWithPlaces,
  generateRoute,
  colorScheme,
  test1,
  test2,
  test3,
  checkpoint,
  productionChecklist
};