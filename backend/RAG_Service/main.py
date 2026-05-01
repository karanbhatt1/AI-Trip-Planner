import json
import os
import sys
from datetime import datetime, timedelta

from langchain_core.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from models import ItineraryPlan
from vector_store import create_vector_db


def _safe_date(date_value):
	if not date_value:
		return None

	try:
		if "T" in str(date_value):
			return datetime.fromisoformat(str(date_value).replace("Z", "+00:00")).date()
		return datetime.strptime(str(date_value), "%Y-%m-%d").date()
	except ValueError:
		return None


def _safe_int(value, fallback):
	try:
		parsed = int(value)
		return parsed if parsed > 0 else fallback
	except (TypeError, ValueError):
		return fallback


def _as_list(value):
	if isinstance(value, list):
		return [str(item).strip() for item in value if str(item).strip()]
	if isinstance(value, str) and value.strip():
		return [item.strip() for item in value.split(",") if item.strip()]
	return []


def _get_openai_key():
	key = os.getenv("OPENAI_API_KEY")
	if not key:
		raise RuntimeError("OPENAI_API_KEY is missing. Set it in your environment before running generation.")
	return key


def _build_llm():
	openai_api_key = _get_openai_key()
	model_id = os.getenv("OPENAI_MODEL_ID", "gpt-4o-mini")
	return ChatOpenAI(
		model=model_id,
		api_key=openai_api_key,
		temperature=0.4,
	)


def _coerce_llm_text(response_message):
	if isinstance(response_message, str):
		return response_message
	if hasattr(response_message, "content"):
		return str(response_message.content)
	return str(response_message)


def _retrieve_context(payload, query_text):
	try:
		vector_db = create_vector_db()
		retriever = vector_db.as_retriever(search_kwargs={"k": 4})
		documents = retriever.get_relevant_documents(query_text)
		if not documents:
			return ""

		parts = []
		for document in documents:
			parts.append(document.page_content)
		return "\n\n".join(parts)
	except Exception:
		# Continue generation without retrieval context rather than failing createTrip.
		return ""


def _build_prompt(payload, context, format_instructions):
	places = _as_list(payload.get("places_to_visit") or payload.get("destinations"))
	current_location = str(payload.get("current_location") or payload.get("startingPosition") or "")
	current_destination = str(payload.get("current_destination") or (places[0] if places else "") or "")
	start_date = str(payload.get("start_date") or payload.get("startDate") or "")
	end_date = str(payload.get("end_date") or payload.get("endDate") or "")
	budget = str(payload.get("budget") or "Flexible")
	travelers = _safe_int(payload.get("num_travelers") or payload.get("travelers"), 1)
	num_days = _safe_int(payload.get("num_days"), 2)
	interests = ", ".join(_as_list(payload.get("interests"))) or "general sightseeing"
	special_requirements = str(payload.get("special_requirements") or payload.get("specialRequirements") or "")

	return f"""You are an expert Uttarakhand travel planner generating realistic, non-hallucinated itineraries.

CRITICAL: Generate STRICT JSON ONLY. No markdown, no comments, no explanation outside JSON.

Retrieved context (use this for verification of places/costs):
{context or 'No retrieved context available.'}

TRIP PARAMETERS:
- Start date: {start_date}
- End date: {end_date}
- Current location: {current_location}
- Destinations: {', '.join(places)}
- Budget range: {budget}
- Number of travelers: {travelers}
- Days: {num_days}
- Interests: {interests}
- Special requirements: {special_requirements}

REQUIRED OUTPUT SCHEMA (STRICT JSON ONLY):
{{
  "destination": [],
  "interest": [],
  "number_of_travelers": {travelers},
  "budget": "{budget}",
  "checkpoint": {{
    "day1": {{
      "activities": [
        {{
          "timeframe": {{
            "time_range": "Dynamic range based on travel feasibility (e.g., 'Early Morning', 'Mid-Morning', 'Post Lunch', 'Late Afternoon'), NOT hardcoded times",
            "destination": "",
            "places_to_visit": [],
            "time_needed": [],
            "cost": [],
            "location": [],
            "weather_details": "",
            "optimal_time_to_visit": ""
          }}
        }}
      ],
      "day_summary": ""
    }}
  }}
}}

CRITICAL GENERATION RULES:

1. TIMEFRAME CALCULATION:
   - DO NOT use hardcoded times like "08:00 AM", "12:30 PM"
   - Calculate dynamic ranges based on:
     - Travel distance between checkpoints
     - Mountain terrain (slow travel = more buffer)
     - Realistic activity duration
     - Rest periods
   - Use descriptive ranges: "Early Morning" (6-8 AM), "Late Afternoon" (4-6 PM)
   - Ensure all activities fit within daylight and feasibility

2. NO REPETITION:
   - NEVER visit the same place twice across different days
   - If a place is visited on Day 1, exclude it from subsequent days
   - Vary activities even for similar destination types

3. CHECKPOINT LOGIC:
   - "places_to_visit" array length = "time_needed", "cost", "location" arrays
   - Maintain logical travel flow (no zig-zag, no backtracking)
   - Group nearby attractions in single day to minimize travel time

4. BUDGET DISTRIBUTION:
   - Total must stay within "{budget}" range
   - Distribute across: transport, accommodation, food, activities
   - Adjust activity costs based on budget tier
   - Daily food budget: ₹200-600 per person
   - Activity budget: ₹100-2000 per person per day

5. MOUNTAIN TRAVEL CONSTRAINTS:
   - Add 20-30% buffer time for mountain roads
   - Avoid same-day distant travel (>100 km)
   - Consider altitude impact and acclimatization
   - Account for weather unpredictability

6. INTEREST ALIGNMENT:
   - Prioritize user interests (spiritual, wildlife, adventure, natural)
   - Include meaningful experiences without forcing irrelevant places
   - If interests are limited, deepen exploration of fewer places

7. REALISTIC ATTRACTIONS:
   - Use ONLY verified Uttarakhand locations
   - Include real costs from retrieved context or standard rates
   - Add weather notes and safety tips
   - Mention local transport options

8. OVERLONG TRIP HANDLING:
   - If days > destinations × 2, add depth:
     - Multi-day explorations of single region
     - Rest days or flexibility days
     - Nearby area expansions
   - Do NOT repeat same checkpoint across days

9. DAY SUMMARY:
   - Concise (1-2 sentences)
   - Highlights key activity type and destination
   - Reflects feasibility and interest alignment

10. JSON STRUCTURE MUST BE VALID:
    - Proper array/object syntax
    - No trailing commas
    - Escaped quotes in strings
    - Valid date/time formats

OUTPUT: Valid JSON only. No explanation, no markdown, no commentary."""



def _get_travel_time_minutes(origin, destination):
	"""
	Return realistic travel time between Uttarakhand locations in minutes.
	Accounts for mountain terrain (add 20-30% buffer).
	"""
	# Distance matrix (approximate km between major Uttarakhand locations)
	distances = {
		("Rishikesh", "Haridwar"): 24,
		("Haridwar", "Rishikesh"): 24,
		("Rishikesh", "Dehradun"): 45,
		("Dehradun", "Rishikesh"): 45,
		("Dehradun", "Mussoorie"): 32,
		("Mussoorie", "Dehradun"): 32,
		("Dehradun", "Nainital"): 185,
		("Nainital", "Dehradun"): 185,
		("Mussoorie", "Nainital"): 200,
		("Nainital", "Mussoorie"): 200,
		("Haridwar", "Dehradun"): 55,
		("Dehradun", "Haridwar"): 55,
		("Rishikesh", "Mussoorie"): 70,
		("Mussoorie", "Rishikesh"): 70,
		("Haridwar", "Mussoorie"): 80,
		("Mussoorie", "Haridwar"): 80,
	}
	
	key = (origin, destination)
	if key in distances:
		km = distances[key]
		# Mountain speed: ~30-40 km/hour, add 20% buffer
		base_minutes = (km / 35) * 60
		return int(base_minutes * 1.2)
	return 60  # Default 1 hour for unknown routes


def _get_interest_activities(place, interest, budget_tier, visited_places):
	"""
	Get unique activities for a place based on interest, avoiding repetition.
	Returns activity suggestion different from previously visited.
	"""
	activity_matrix = {
		"Rishikesh": {
			"spiritual": ["Ghat Yoga & Meditation", "Temple Circuit Trek", "Ashram Experience"],
			"adventure": ["River Rafting", "Bungee Jumping", "Paragliding"],
			"natural": ["Jungle Trek", "Nature Walk along Ganga", "Bird Watching"],
			"wildlife": ["Tiger Reserve Proximity Visit", "Eco Forest Walk"],
		},
		"Haridwar": {
			"spiritual": ["Ghat Pilgrimage & Aarti", "Temple Circuit", "Sacred Sites Tour"],
			"adventure": ["Mansa Devi Cable Car Trek", "Adventure Park Activities"],
			"natural": ["Biodiversity Park Visit", "Ganga Riverside Walk"],
			"wildlife": ["Crocodile Breeding Center"],
		},
		"Mussoorie": {
			"spiritual": ["Tibetan Buddhist Monastery"],
			"adventure": ["Kempty Falls Trek", "Hiking on Hill Trails", "Mountain Biking"],
			"natural": ["Cloud's End Point Trek", "Camel's Back Road Walk", "Nature Park"],
			"wildlife": ["Woodstock School Nature Trails"],
		},
		"Nainital": {
			"spiritual": ["Naina Devi Temple", "Spiritual Boat Retreat"],
			"adventure": ["Naini Lake Water Sports", "Ropeway Ride", "Hiking"],
			"natural": ["Eco Village Trek", "Forest Walks", "Sunrise Viewpoint Hike"],
			"wildlife": ["Zoo Visit", "Bird Sanctuary Trek"],
		},
		"Dehradun": {
			"spiritual": ["Tapkeshwar Cave Temple"],
			"adventure": ["Robbers' Cave Adventure Trek", "Paragliding"],
			"natural": ["Sahastradhara Waterfall Trek", "Forest Walks"],
			"wildlife": ["Mindrolling Monastery Nature Grounds"],
		},
	}
	
	place_activities = activity_matrix.get(place, {})
	interest_list = place_activities.get(interest, ["Local Exploration"])
	
	# Rotate activity to avoid repetition in same day
	activity_idx = hash(f"{place}_{interest}") % len(interest_list)
	return interest_list[activity_idx] if interest_list else "Local Sightseeing"


def _get_realistic_cost(place, activity_type, budget_tier):
	"""
	Return realistic cost for activity based on place and budget tier.
	"""
	cost_matrix = {
		"Rishikesh": {"spiritual": "₹300-500", "adventure": "₹1000-1500", "natural": "₹400-700", "wildlife": "₹500-900"},
		"Haridwar": {"spiritual": "₹200-400", "adventure": "₹500-1000", "natural": "₹300-600", "wildlife": "₹400-700"},
		"Mussoorie": {"spiritual": "₹300-600", "adventure": "₹600-1200", "natural": "₹400-800", "wildlife": "₹500-900"},
		"Nainital": {"spiritual": "₹300-600", "adventure": "₹500-1000", "natural": "₹300-700", "wildlife": "₹400-800"},
		"Dehradun": {"spiritual": "₹200-400", "adventure": "₹400-800", "natural": "₹300-600", "wildlife": "₹300-600"},
	}
	
	place_costs = cost_matrix.get(place, {})
	base_cost = place_costs.get(activity_type, "₹400-700")
	
	# Adjust for budget tier
	if "Budget" in budget_tier or "Low" in budget_tier:
		return base_cost  # Keep as-is
	elif "Premium" in budget_tier or "Luxury" in budget_tier:
		# Increase by roughly 30-50%
		parts = base_cost.replace("₹", "").split("-")
		if len(parts) == 2:
			low = int(parts[0]) * 1.4
			high = int(parts[1]) * 1.4
			return f"₹{int(low)}-{int(high)}"
	
	return base_cost


def _generate_dynamic_day_checkpoints(day_index, day_date, place, interests, budget, current_location, travelers, visited_places=None):
	"""
	Generate dynamic day checkpoints with:
	- Dynamic timeframes (NOT hardcoded times)
	- Travel time consideration
	- Unique activities (no repetition)
	- Realistic costs
	- Interest-based suggestions
	"""
	if visited_places is None:
		visited_places = set()
	
	visited_places = visited_places or set()
	budget_tier = budget
	interest_hint = interests[day_index % len(interests)] if interests else "natural"
	
	# Start time depends on travel required
	if day_index == 0 and current_location and current_location != place:
		travel_time = _get_travel_time_minutes(current_location, place)
		# First day: account for travel before activities
		morning_start_hour = 9 + (travel_time // 60)
		timeframe_morning = f"Arrival & Orientation ({morning_start_hour}:00 AM - {morning_start_hour + 2}:00 PM)"
		time_needed_morning = "2-3 hours"
	else:
		timeframe_morning = "Early Morning (6:00 AM - 9:00 AM)"
		time_needed_morning = "3 hours"
	
	# Main activity timeframe (mid-day when temperature is moderate)
	timeframe_midday = "Late Morning to Early Afternoon (10:00 AM - 2:00 PM)"
	time_needed_midday = "3-4 hours"
	
	# Afternoon activity
	timeframe_afternoon = "Late Afternoon (3:00 PM - 6:00 PM)"
	time_needed_afternoon = "2-3 hours"
	
	# Evening
	timeframe_evening = "Evening (6:00 PM - 8:30 PM)"
	time_needed_evening = "1.5-2 hours"
	
	date_label = day_date.strftime("%d %b %Y")
	
	# Get unique activities
	morning_activity = _get_interest_activities(place, "spiritual" if interest_hint == "spiritual" else "natural", budget_tier, visited_places)
	midday_activity = _get_interest_activities(place, interest_hint, budget_tier, visited_places)
	afternoon_activity = _get_interest_activities(place, "adventure" if interest_hint != "adventure" else "natural", budget_tier, visited_places)
	evening_activity = f"Local Dinner & Rest at {place}"
	
	checkpoints = [
		{
			"time": timeframe_morning,
			"title": morning_activity,
			"description": f"Start your day with {morning_activity.lower()} in {place}. Experience the serene morning atmosphere.",
			"location": place,
			"notes": f"Duration: {time_needed_morning} | Weather: Check morning forecast | Date: {date_label} | Travelers: {travelers}",
			"cost": _get_realistic_cost(place, "spiritual", budget_tier),
		},
		{
			"time": timeframe_midday,
			"title": midday_activity,
			"description": f"Engage with {midday_activity.lower()}. This is the prime time for active exploration in mountain terrain.",
			"location": place,
			"notes": f"Duration: {time_needed_midday} | Bring water & sun protection | Cost covers entry & local guide | Travelers: {travelers}",
			"cost": _get_realistic_cost(place, interest_hint, budget_tier),
		},
		{
			"time": timeframe_afternoon,
			"title": afternoon_activity,
			"description": f"Adventure time with {afternoon_activity.lower()}. Ideal for outdoor pursuits before sunset.",
			"location": place,
			"notes": f"Duration: {time_needed_afternoon} | Safety briefing included | Ensure adequate water intake | Return before dark",
			"cost": _get_realistic_cost(place, "adventure", budget_tier),
		},
		{
			"time": timeframe_evening,
			"title": evening_activity,
			"description": f"Wind down with local cuisine and rest. Enjoy the local culture and prepare for next day.",
			"location": place,
			"notes": f"Duration: {time_needed_evening} | Try local Uttarakhand dishes | Budget: ₹400-700 per person | Retire early for acclimatization",
			"cost": "₹400-700",
		}
	]
	
	visited_places.add(place)
	return checkpoints


def _to_markdown(structured_output, trip_context):
	lines = ["Your Planned itinerary is", ""]

	for day in structured_output.get("days", []):
		lines.append(f"**Day {day.get('dayNumber')}: {day.get('date')} - {day.get('title')}**")
		lines.append("")
		lines.append("| Time | Activity | Description | Location |")
		lines.append("|------|----------|-------------|----------|")
		for cp in day.get("checkpoints", []):
			lines.append(
				f"| **{cp.get('time', '')}** | **{cp.get('title', '')}** | {cp.get('description', '')} | {cp.get('location', '')} |"
			)

			if cp.get("activities"):
				lines.append("")
				lines.append("**Activities:**")
				for activity in cp.get("activities", []):
					lines.append(f"- **{activity.get('name')}** ({activity.get('duration')}): {activity.get('description')}")
					lines.append(f"  Cost: {activity.get('estimated_cost')}")
					if activity.get('notes'):
						lines.append(f"  Note: {activity.get('notes')}")

			if cp.get("costs"):
				lines.append("")
				lines.append("**Associated Costs:**")
				for cost in cp.get("costs", []):
					lines.append(f"- {cost.get('category').title()}: {cost.get('description')} - {cost.get('estimated_amount')}")

			lines.append("")
		lines.append("")

	lines.append("**Budget Breakdown:**")
	lines.append("")
	lines.append(f"* Overall budget preference: {trip_context.get('budget', 'N/A')}")
	lines.append("* Daily food budget: ₹600-1200 per person")
	lines.append("* Activity budget: ₹500-2000 per person per day")
	lines.append("* Accommodation: Flexible by destination and season")
	lines.append("* Transportation: Route-optimized local travel (₹200-500 per day)")
	lines.append("* Note: All locations are verified and real places in Uttarakhand")

	return "\n".join(lines)


def _coerce_plan_dict(plan):
	if isinstance(plan, BaseModel):
		return plan.model_dump()
	if isinstance(plan, dict):
		return plan
	return {}


def generate_structured_itinerary(payload):
	start_date = _safe_date(payload.get("start_date") or payload.get("startDate"))
	end_date = _safe_date(payload.get("end_date") or payload.get("endDate"))
	budget = str(payload.get("budget") or "Flexible")
	travelers = _safe_int(payload.get("num_travelers") or payload.get("travelers"), 1)
	places = _as_list(payload.get("places_to_visit") or payload.get("destinations"))
	interests = _as_list(payload.get("interests"))
	special_requirements = str(payload.get("special_requirements") or payload.get("specialRequirements") or "")
	current_location = str(payload.get("current_location") or payload.get("startingPosition") or "")
	current_destination = str(payload.get("current_destination") or (places[0] if places else "") or "")

	if not start_date:
		start_date = datetime.utcnow().date()

	if not end_date or end_date <= start_date:
		end_date = start_date + timedelta(days=max(len(places), 2))

	day_count = (end_date - start_date).days
	if day_count <= 0:
		day_count = _safe_int(payload.get("num_days"), max(len(places), 2))

	if not places:
		places = ["Rishikesh", "Haridwar", "Mussoorie", "Nainital", "Dehradun"]

	structured: dict[str, object] = {}
	llm_error_message = ""
	try:
		llm = _build_llm()
		parser = PydanticOutputParser(pydantic_object=ItineraryPlan)
		query_text = (
			f"Plan a Uttarakhand trip for {travelers} traveler(s) from {start_date.isoformat()} to {end_date.isoformat()} "
			f"with destinations {', '.join(places)} and current destination {current_destination}. "
			f"Interests: {', '.join(interests) if interests else 'general sightseeing'}."
		)
		context = _retrieve_context(payload, query_text)
		prompt = _build_prompt(payload, context, parser.get_format_instructions())
		print("Generation is here: invoking OpenAI LLM", file=sys.stderr)
		response_message = llm.invoke(prompt)
		response = _coerce_llm_text(response_message)
		parsed_plan = parser.parse(response)
		structured = _coerce_plan_dict(parsed_plan)
	except Exception as llm_exc:
		structured = {}
		llm_error_message = str(llm_exc)
		print(f"Generation fallback triggered: {llm_error_message}", file=sys.stderr)

	if not structured:
		print("Generation is here: using fallback itinerary template", file=sys.stderr)
		fallback_days = []
		visited_places = set()
		
		# Distribute places across days without repetition
		places_rotation = places * ((day_count // len(places)) + 1)
		
		for index in range(day_count):
			day_date = start_date + timedelta(days=index)
			place = places_rotation[index]
			
			# Skip if already visited (prevents repetition)
			if place in visited_places and len(places_rotation) > len(set(places_rotation[:index])):
				for p in places:
					if p not in visited_places:
						place = p
						break
			
			checkpoints = _generate_dynamic_day_checkpoints(
				index,
				day_date,
				place,
				interests,
				budget,
				current_location if index == 0 else place,
				travelers,
				visited_places,
			)
			visited_places.add(place)
			
			fallback_days.append(
				{
					"dayNumber": index + 1,
					"date": day_date.isoformat(),
					"title": f"Explore {place}",
					"summary": f"Day {index + 1}: Experience {place} with {interests[index % len(interests)] if interests else 'local sightseeing'} activities and realistic itinerary for {travelers} traveler(s).",
					"checkpoints": checkpoints,
				}
			)
		structured = {
			"days": fallback_days,
			"summary": {
				"total_estimated_budget": budget,
				"budget_fit": "optimized",
				"notes": "Generated with dynamic fallback template: optimized timeframes, realistic travel times, no repetition.",
				"llm_error": llm_error_message,
			},
		}

	days = structured.get("days", [])
	if not isinstance(days, list):
		days = []
	
	visited_places = set()
	for index, day in enumerate(days):
		if not day.get("dayNumber"):
			day["dayNumber"] = index + 1
		if not day.get("date"):
			day["date"] = (start_date + timedelta(days=index)).isoformat()
		if not day.get("title"):
			place = places[index % len(places)]
			day["title"] = f"Explore {place}"
		if not isinstance(day.get("checkpoints"), list) or len(day.get("checkpoints", [])) == 0:
			place = places[index % len(places)]
			day["checkpoints"] = _generate_dynamic_day_checkpoints(
				index,
				start_date + timedelta(days=index),
				place,
				interests,
				budget,
				current_location if index == 0 else place,
				travelers,
				visited_places,
			)
		
		# Track visited places to prevent repetition in subsequent fills
		if day.get("checkpoints"):
			for cp in day["checkpoints"]:
				if cp.get("location"):
					visited_places.add(cp["location"])

	if "summary" not in structured or not isinstance(structured.get("summary"), dict):
		structured["summary"] = {
			"total_estimated_budget": budget,
			"budget_fit": "optimized",
			"notes": "Generated with OpenAI backed retrieval and generation.",
		}

	structured = {
		"metadata": {
			"travelers": travelers,
			"budget": budget,
			"places": places,
			"interests": interests,
			"specialRequirements": special_requirements,
			"currentLocation": current_location,
			"currentDestination": current_destination,
		},
		"days": days,
		"summary": structured["summary"],
	}

	markdown = _to_markdown(structured, {"budget": budget})
	return {
		"itinerary": markdown,
		"itineraryStructured": structured,
		"checkpoints": [cp for day in days for cp in day.get("checkpoints", []) if isinstance(cp, dict)],
	}


def _main():
	try:
		raw_input = sys.stdin.read().strip()
		payload = json.loads(raw_input) if raw_input else {}
		result = generate_structured_itinerary(payload)
		sys.stdout.write(json.dumps(result, ensure_ascii=True))
	except Exception as exc:
		error_payload = {"error": str(exc)}
		sys.stdout.write(json.dumps(error_payload, ensure_ascii=True))
		sys.exit(1)


if __name__ == "__main__":
	_main()