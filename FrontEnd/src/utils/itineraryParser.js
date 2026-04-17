// Utility function to parse raw itinerary text into structured data
export function parseItineraryText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Remove the first line if it starts with "Based on the provided details"
  let cleanText = text;
  const lines = text.split('\n');
  if (lines[0] && lines[0].includes('Based on the provided details')) {
    cleanText = lines.slice(1).join('\n');
  }

  // Check if it's the new tabular format
  if (cleanText.includes('| Time | Activity | Description |')) {
    return parseTabularItinerary(cleanText);
  }

  // Fallback to old format
  return parseOldItinerary(cleanText);
}

// Parse the new tabular format
function parseTabularItinerary(text) {
  const days = [];
  const sections = text.split(/\*\*Day \d+:/);

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n').map(line => line.trim()).filter(line => line);

    if (lines.length === 0) continue;

    // First line should be the date
    const dateLine = lines[0];
    const dayTitle = `**Day ${i}: ${dateLine}**`;

    // Find the table start
    const tableStartIndex = lines.findIndex(line => line.includes('| Time | Activity | Description |'));
    if (tableStartIndex === -1) continue;

    const activities = [];
    let description = '';

    // Parse table rows
    for (let j = tableStartIndex + 2; j < lines.length; j++) {
      const line = lines[j];
      if (line.startsWith('|') && line.includes('|')) {
        const parts = line.split('|').map(part => part.trim()).filter(part => part);
        if (parts.length >= 3) {
          const time = parts[0].replace(/\*\*/g, '');
          const activity = parts[1].replace(/\*\*/g, '');
          const desc = parts[2];
          activities.push(`${time}: ${activity} - ${desc}`);
        }
      } else if (line && !line.startsWith('**Budget') && !line.includes('Total:')) {
        // Additional description
        description += (description ? ' ' : '') + line;
      }
    }

    days.push({
      day: dayTitle,
      activities: activities,
      description: description.trim()
    });
  }

  return days;
}

// Parse the old format (fallback)
function parseOldItinerary(text) {
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

// Function to extract place names from text
// Improved heuristic for detecting place names
export function extractPlaces(text) {
  if (!text) return [];

  const words = text.split(/\s+/);
  const places = [];

  // Common place name patterns
  const placeIndicators = ['Road', 'Street', 'Temple', 'Valley', 'Pass', 'Lake', 'River', 'Mountain', 'Hill', 'Palace', 'Fort', 'Market', 'Cafe', 'Restaurant'];

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^\w]/g, '');
    if (!word) continue;

    // Check if word looks like a place name
    const isCapitalized = word[0] === word[0].toUpperCase();
    const isLongEnough = word.length > 2;
    const notCommonWord = !['The', 'And', 'For', 'With', 'From', 'Into', 'Your', 'This', 'That', 'These', 'Those', 'Day', 'Morning', 'Afternoon', 'Evening'].includes(word);

    if (isCapitalized && isLongEnough && notCommonWord) {
      // Check if next word is also capitalized (multi-word place)
      let placeName = word;
      let j = i + 1;
      while (j < words.length && words[j][0] === words[j][0].toUpperCase() && words[j].length > 1) {
        const nextWord = words[j].replace(/[^\w]/g, '');
        if (nextWord && !['The', 'And', 'For'].includes(nextWord)) {
          placeName += ' ' + nextWord;
          j++;
        } else {
          break;
        }
      }

      // Check if it contains place indicators
      const hasPlaceIndicator = placeIndicators.some(indicator =>
        placeName.toLowerCase().includes(indicator.toLowerCase())
      );

      if (hasPlaceIndicator || placeName.split(' ').length > 1) {
        places.push(placeName);
        i = j - 1; // Skip the words we already processed
      } else if (placeName.length > 3) {
        // Single word places that are long enough
        places.push(placeName);
      }
    }
  }

  // Remove duplicates and return unique places
  return [...new Set(places)];
}

// Function to highlight places in text
export function highlightPlaces(text, places) {
  if (!text || !places.length) return text;

  let highlightedText = text;
  places.forEach(place => {
    const regex = new RegExp(`\\b${place}\\b`, 'gi');
    highlightedText = highlightedText.replace(regex, `<span class="place-highlight">${place}</span>`);
  });

  return highlightedText;
}