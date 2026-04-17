import ItineraryDisplay from './ItineraryDisplay';

const sampleItinerary = `Your Planned itinerary is

**Day 1: 2026-04-17**

| Time | Activity | Description |
|------|----------|-------------|
| **8:00 AM** | **Nainital Arrival and Breakfast** | Arrive in Nainital and start the day with a delicious breakfast at a local café, Hotel Madhuban (₹200 - ₹300 per person) |
| **9:30 AM** | **Naini Lake Boat Ride** | Enjoy a serene boat ride on Naini Lake, a picturesque twin-lake in the heart of Nainital (₹200 - ₹300 per person) |
| **11:30 AM** | **Tiffin Top Visit** | Explore Tiffin Top, also known as Dorothy's Seat, a popular picnic spot offering stunning views of Nainital (Free, ₹0) |
| **1:30 PM** | **Lunch at a Local Restaurant** | Savor local cuisine at a restaurant like The Mall, serving a range of Indian and Chinese dishes (₹300 - ₹500 per person) |
| **3:00 PM** | **Mall Road Shopping** | Stroll along Mall Road, a bustling shopping street lined with shops, cafes, and restaurants (Free, ₹0) |
| **6:00 PM** | **Sunset at Naini Lake** | Witness a breathtaking sunset over Naini Lake, a perfect spot to relax and unwind (Free, ₹0) |

**Day 2: 2026-04-18**

| Time | Activity | Description |
|------|----------|-------------|
| **8:00 AM** | **Breakfast at Hotel** | Enjoy a hearty breakfast at Hotel Madhuban (₹200 - ₹300 per person) |
| **9:30 AM** | **Nanda Devi Temple Visit** | Visit the Nanda Devi Temple, a revered shrine dedicated to the goddess Nanda Devi (Free, ₹0) |
| **11:30 AM** | **Snow View Point** | Explore Snow View Point, offering panoramic views of Nanda Devi peak and the Himalayas (₹50 - ₹100 per person) |
| **1:00 PM** | **Lunch at a Local Restaurant** | Enjoy a meal at a restaurant like The Snow View, serving a range of Indian and Continental dishes (₹300 - ₹500 per person) |
| **2:30 PM** | **Governor's House Visit** | Visit the Governor's House, a stunning example of colonial architecture (Free, ₹0) |
| **4:30 PM** | **Spa and Relaxation** | Treat yourself to a rejuvenating spa session at a local spa, like the Nainital Spa (₹500 - ₹1000 per person) |

**Day 3: 2026-04-19**

| Time | Activity | Description |
|------|----------|-------------|
| **8:00 AM** | **Breakfast at Hotel** | Enjoy a delicious breakfast at Hotel Madhuban (₹200 - ₹300 per person) |
| **9:30 AM** | **Khurpa Tal Visit** | Explore Khurpa Tal, a scenic lake and popular picnic spot (Free, ₹0) |
| **11:30 AM** | **Land of Dreams Visit** | Visit the Land of Dreams, a beautiful garden with a range of attractions (₹100 - ₹200 per person) |
| **1:30 PM** | **Lunch at a Local Restaurant** | Enjoy a meal at a restaurant like The Khurpa, serving a range of Indian and Chinese dishes (₹300 - ₹500 per person) |
| **3:00 PM** | **Departure** | Depart for the airport or your next destination (₹0) |

**Budget Breakdown:**

* Accommodation (2 nights): ₹2,000 - ₹4,000 (₹1,000 - ₹2,000 per night)
* Food and beverages: ₹3,000 - ₹6,000 (₹1,000 - ₹2,000 per day)
* Transportation: ₹1,000 - ₹2,000 (depending on the mode of transportation)
* Activities and entrance fees: ₹1,500 - ₹3,000 (₹500 - ₹1,000 per day)
* Total: ₹7,500 - ₹15,000`;

export default function ItineraryDemo() {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-900 min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-8">AI Itinerary Display Demo</h1>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-600">
        <h2 className="text-xl font-semibold text-white mb-4">Structured Itinerary</h2>
        <ItineraryDisplay itineraryText={sampleItinerary} />
      </div>

      <div className="mt-8 bg-slate-800 rounded-xl p-6 border border-slate-600">
        <h2 className="text-xl font-semibold text-white mb-4">Raw Text Input</h2>
        <pre className="text-slate-300 text-sm whitespace-pre-wrap bg-slate-900 p-4 rounded-lg border border-slate-700">
          {sampleItinerary}
        </pre>
      </div>
    </div>
  );
}