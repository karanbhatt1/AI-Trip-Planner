import { useState } from 'react';
import RoutePlanner from '../components/RoutePlanner';

const RouteDemo = () => {
  const [sampleTrip, setSampleTrip] = useState({
    startDate: '2026-04-17',
    endDate: '2026-04-20',
    travelers: 2,
    budget: '8-16k',
    interests: ['historical', 'food', 'nature'],
    destinations: ['Delhi', 'Agra', 'Jaipur'],
    itinerary: `Your Planned itinerary is

**Day 1: 2026-04-17**

| Time | Activity | Description |
|------|----------|-------------|
| **8:00 AM** | **Delhi Arrival and Breakfast** | Arrive in Delhi and start the day with a delicious breakfast at a local café |
| **9:30 AM** | **Red Fort Visit** | Explore the magnificent Red Fort, a UNESCO World Heritage Site |
| **1:30 PM** | **Lunch at Local Restaurant** | Enjoy authentic Indian cuisine at a local restaurant |
| **3:00 PM** | **India Gate and Rajpath** | Visit India Gate and walk along the beautiful Rajpath |
| **6:00 PM** | **Connaught Place Shopping** | Stroll through Connaught Place for shopping and street food |

**Day 2: 2026-04-18**

| Time | Activity | Description |
|------|----------|-------------|
| **8:00 AM** | **Breakfast at Hotel** | Enjoy a hearty breakfast at your hotel |
| **9:30 AM** | **Drive to Agra** | Depart for Agra (approximately 3-4 hours drive) |
| **1:30 PM** | **Lunch in Agra** | Have lunch at a local restaurant in Agra |
| **3:00 PM** | **Taj Mahal Visit** | Explore the iconic Taj Mahal, one of the Seven Wonders of the World |
| **6:00 PM** | **Agra Fort** | Visit Agra Fort, another magnificent Mughal structure |

**Day 3: 2026-04-19**

| Time | Activity | Description |
|------|----------|-------------|
| **8:00 AM** | **Breakfast in Agra** | Enjoy breakfast at your hotel in Agra |
| **9:30 AM** | **Drive to Jaipur** | Depart for Jaipur (approximately 4-5 hours drive) |
| **2:30 PM** | **Lunch in Jaipur** | Have lunch at a local restaurant in Jaipur |
| **4:00 PM** | **Amber Fort Visit** | Explore Amber Fort, a stunning hilltop fort |
| **7:00 PM** | **Jaipur City Palace** | Visit the beautiful City Palace of Jaipur |

**Day 4: 2026-04-20**

| Time | Activity | Description |
|------|----------|-------------|
| **8:00 AM** | **Breakfast in Jaipur** | Enjoy breakfast at your hotel |
| **9:30 AM** | **Hawa Mahal and Jantar Mantar** | Visit Hawa Mahal and the astronomical observatory Jantar Mantar |
| **12:00 PM** | **Local Markets** | Explore the vibrant markets of Jaipur |
| **2:00 PM** | **Lunch** | Have lunch at a local restaurant |
| **4:00 PM** | **Departure** | Depart for your onward journey |

**Budget Breakdown:**

* Accommodation (3 nights): ₹6,000 - ₹12,000 (₹2,000 - ₹4,000 per night)
* Food and beverages: ₹4,000 - ₹8,000 (₹1,000 - ₹2,000 per day)
* Transportation: ₹3,000 - ₹6,000 (including local travel and inter-city transfers)
* Activities and entrance fees: ₹2,000 - ₹4,000
* Total: ₹15,000 - ₹30,000`
  });

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">AI Route Visualization Demo</h1>
          <p className="text-slate-400 text-lg">
            Experience our AI-powered route planning with interactive maps, optimized checkpoints, and smart travel insights.
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Sample Trip Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Route:</span>
              <span className="text-white ml-2">Delhi → Agra → Jaipur</span>
            </div>
            <div>
              <span className="text-slate-500">Duration:</span>
              <span className="text-white ml-2">4 Days</span>
            </div>
            <div>
              <span className="text-slate-500">Travelers:</span>
              <span className="text-white ml-2">2 People</span>
            </div>
          </div>
        </div>

        <RoutePlanner tripData={sampleTrip} />

        <div className="mt-12 bg-slate-800/60 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4">Features Demonstrated</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="text-teal-400 font-medium">🗺️ Interactive Map</h4>
              <p className="text-slate-300 text-sm">Leaflet-powered map with custom markers and route visualization</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-teal-400 font-medium">🤖 AI Optimization</h4>
              <p className="text-slate-300 text-sm">TSP-inspired algorithm for optimal route planning</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-teal-400 font-medium">⏱️ Travel Times</h4>
              <p className="text-slate-300 text-sm">Real-time distance and time calculations between stops</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-teal-400 font-medium">📍 Smart Checkpoints</h4>
              <p className="text-slate-300 text-sm">AI-generated stops based on interests and preferences</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-teal-400 font-medium">💡 Place Insights</h4>
              <p className="text-slate-300 text-sm">Hover and click for detailed place information</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-teal-400 font-medium">📊 Route Stats</h4>
              <p className="text-slate-300 text-sm">Comprehensive statistics and budget breakdown</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteDemo;