import { useState } from 'react';
import { ChevronDown, ChevronRight, MapPin, Calendar, Clock, Info } from 'lucide-react';
import { extractPlaces, highlightPlaces } from '../utils/itineraryParser';

export default function ItineraryDisplay({ itineraryText, className = '' }) {
  const [expandedDays, setExpandedDays] = useState(new Set([0])); // First day expanded by default
  const [selectedPlace, setSelectedPlace] = useState(null);

  if (!itineraryText) {
    return (
      <div className={`text-center py-8 text-slate-400 ${className}`}>
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No itinerary available</p>
      </div>
    );
  }

  // Parse the itinerary text
  const days = parseItineraryText(itineraryText);

  if (!days.length) {
    return (
      <div className={`text-slate-200 p-4 rounded-lg bg-slate-800/50 ${className}`}>
        <pre className="whitespace-pre-wrap text-sm leading-relaxed">{itineraryText}</pre>
      </div>
    );
  }

  const toggleDay = (index) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDays(newExpanded);
  };

  const handlePlaceClick = (place) => {
    setSelectedPlace(selectedPlace === place ? null : place);
  };

  // Parse budget breakdown if present
  const budgetSection = text.match(/\*\*Budget Breakdown:\*\*([\s\S]*?)$/);
  const budgetItems = budgetSection ? budgetSection[1].split('\n').filter(line => line.trim().startsWith('*')).map(line => line.trim().substring(1).trim()) : [];

  return (
    <div className={`space-y-6 ${className}`}>
      {days.map((day, index) => (
        <DayCard
          key={index}
          day={day}
          isExpanded={expandedDays.has(index)}
          onToggle={() => toggleDay(index)}
          onPlaceClick={handlePlaceClick}
          selectedPlace={selectedPlace}
        />
      ))}

      {budgetItems.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-600 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <span className="text-green-400 font-bold text-lg">₹</span>
            </div>
            Budget Breakdown
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {budgetItems.map((item, index) => {
              const [category, amount] = item.split(': ');
              return (
                <div key={index} className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <span className="text-slate-300 text-sm">{category}</span>
                  <span className="text-green-400 font-semibold">{amount}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedPlace && (
        <PlaceInfoCard
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}

function DayCard({ day, isExpanded, onToggle, onPlaceClick, selectedPlace }) {
  const allPlaces = extractPlaces(`${day.day} ${day.activities.join(' ')} ${day.description}`);

  const renderHighlightedText = (text, places) => {
    if (!places.length) return text;

    let result = text;
    places.forEach(place => {
      const regex = new RegExp(`\\b${place}\\b`, 'gi');
      result = result.replace(regex, `<span class="place-highlight" data-place="${place}">${place}</span>`);
    });
    return result;
  };

  const handleTextClick = (e) => {
    const placeElement = e.target.closest('.place-highlight');
    if (placeElement) {
      const place = placeElement.getAttribute('data-place');
      onPlaceClick(place);
    }
  };

  // Parse activities for tabular display
  const parseActivity = (activity) => {
    const timeMatch = activity.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM)?):\s*(.+?)\s*-\s*(.+)$/);
    if (timeMatch) {
      return {
        time: timeMatch[1],
        activity: timeMatch[2],
        description: timeMatch[3]
      };
    }
    return {
      time: '',
      activity: activity,
      description: ''
    };
  };

  const parsedActivities = day.activities.map(parseActivity);

  // Clean day title by removing markdown bold syntax
  const cleanDayTitle = day.day.replace(/\*\*/g, '');

  return (
    <div className="bg-slate-800/60 border border-slate-600 rounded-xl overflow-hidden transition-all duration-300 hover:border-slate-500 hover:shadow-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-700/30 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center">
            <Calendar className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white group-hover:text-teal-100 transition-colors">
              <span
                dangerouslySetInnerHTML={{ __html: renderHighlightedText(cleanDayTitle, allPlaces) }}
                onClick={handleTextClick}
              />
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {parsedActivities.length} activities planned
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm text-slate-400">
              {parsedActivities.length > 0 ? `${parsedActivities[0].time} - ${parsedActivities[parsedActivities.length - 1].time || 'End'}` : ''}
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-6 h-6 text-slate-400 group-hover:text-teal-400 transition-colors" />
          ) : (
            <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-teal-400 transition-colors" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-slate-700/50">
          <div className="mt-6">
            <div className="overflow-x-auto rounded-lg border border-slate-600/50 shadow-lg">
              <table className="itinerary-table">
                <thead>
                  <tr>
                    <th className="text-left py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Time
                      </div>
                    </th>
                    <th className="text-left py-4 px-6">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Activity
                      </div>
                    </th>
                    <th className="text-left py-4 px-6">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedActivities.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-700/30 last:border-b-0">
                      <td className="py-5 px-6 text-teal-300 font-bold text-sm align-top min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-teal-400 rounded-full flex-shrink-0"></div>
                          {item.time}
                        </div>
                      </td>
                      <td className="py-5 px-6 text-slate-200 font-medium align-top">
                        <span
                          dangerouslySetInnerHTML={{ __html: renderHighlightedText(item.activity.replace(/\*\*/g, ''), allPlaces) }}
                          onClick={handleTextClick}
                          className="cursor-pointer hover:text-teal-200 transition-colors"
                        />
                      </td>
                      <td className="py-5 px-6 text-slate-200 text-sm align-top leading-relaxed">
                        <span
                          dangerouslySetInnerHTML={{ __html: renderHighlightedText(item.description, allPlaces) }}
                          onClick={handleTextClick}
                          className="cursor-pointer hover:text-slate-100 transition-colors"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {day.description && (
            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
              <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Additional Notes
              </h4>
              <p
                className="text-slate-200 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderHighlightedText(day.description, allPlaces) }}
                onClick={handleTextClick}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlaceInfoCard({ place, onClose }) {
  // Mock place information - in a real app, this would come from an API
  const placeInfo = {
    description: `${place} is a beautiful destination known for its scenic beauty and cultural significance.`,
    bestTime: "October to June",
    activities: ["Sightseeing", "Photography", "Local cuisine"],
    tips: ["Carry water", "Wear comfortable shoes", "Respect local customs"]
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-teal-400" />
            <h3 className="text-lg font-semibold text-white">{place}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <p className="text-slate-200">{placeInfo.description}</p>

          <div>
            <span className="text-slate-400">Best time to visit:</span>
            <span className="text-slate-200 ml-2">{placeInfo.bestTime}</span>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Popular activities:</span>
            <div className="flex flex-wrap gap-1">
              {placeInfo.activities.map((activity, idx) => (
                <span key={idx} className="px-2 py-1 bg-teal-500/20 text-teal-300 rounded text-xs">
                  {activity}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Travel tips:</span>
            <ul className="text-slate-200 space-y-1">
              {placeInfo.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-teal-400 mt-1">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import the parser function
function parseItineraryText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const days = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  let currentDay = null;
  let currentActivities = [];
  let currentDescription = '';

  for (const line of lines) {
    // Check if line starts with "Day X:" (case insensitive)
    const dayMatch = line.match(/^Day\s+(\d+):?\s*(.*)$/i);
    if (dayMatch) {
      // Save previous day if exists
      if (currentDay) {
        days.push({
          day: currentDay,
          activities: currentActivities,
          description: currentDescription.trim()
        });
      }

      // Start new day
      currentDay = line;
      currentActivities = [];
      currentDescription = '';
    } else if (line.startsWith('-')) {
      // This is an activity
      const activity = line.substring(1).trim();
      if (activity) {
        currentActivities.push(activity);
      }
    } else if (currentDay && line) {
      // This is description text
      currentDescription += (currentDescription ? ' ' : '') + line;
    }
  }

  // Don't forget the last day
  if (currentDay) {
    days.push({
      day: currentDay,
      activities: currentActivities,
      description: currentDescription.trim()
    });
  }

  return days;
}