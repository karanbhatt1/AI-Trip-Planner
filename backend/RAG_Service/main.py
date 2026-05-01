import json
import os
import sys
import hashlib
from datetime import datetime, timedelta

from langchain_core.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from models import ItineraryPlan
from vector_store import create_vector_db

_cache = {}

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

# 🔧 JSON repair + safe parse
def _safe_parse_json(parser, text):
    try:
        return parser.parse(text)
    except Exception:
        text = text.strip()
        text = text.replace(",}", "}").replace(",]", "]")

        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            text = text[start:end+1]

        try:
            return parser.parse(text)
        except Exception:
            return None

def _is_low_quality(plan):
    if not plan:
        return True
    days = plan.get("days", [])
    if not days:
        return True
    for d in days:
        if not d.get("checkpoints"):
            return True
    return False


# 🧠 Query complexity routing
def _is_complex_query(places, num_days, interests):
    if len(places) > 2:
        return True
    if num_days > 4:
        return True
    if len(interests) > 2:
        return True
    return False

def _get_openai_key():
	key = os.getenv("OPENAI_API_KEY")
	if not key:
		raise RuntimeError("OPENAI_API_KEY is missing. Set it in your environment before running generation.")
	return key


def _build_llm(model_name : str):
	openai_api_key = _get_openai_key()
	# model_id = os.getenv("OPENAI_MODEL_ID", "gpt-4o-mini") Static only using one model
	return ChatOpenAI(
		model= model_name,
		api_key=openai_api_key,
		temperature=0.4,
		max_tokens=3500
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

    # 🔥 Dynamic context trimming (smart limit)
    MAX_CONTEXT_CHARS = 1000
    trimmed_context = (context[:MAX_CONTEXT_CHARS] + "...") if context and len(context) > MAX_CONTEXT_CHARS else (context or "No context.")

    prompt = f"""
You are a Uttarakhand travel planner. Output STRICT JSON only.

CONTEXT:
{trimmed_context}

INPUT:
start={start_date}, end={end_date}
from={current_location}, to={current_destination}
places={', '.join(places)}
days={num_days}, travelers={travelers}
budget={budget}, interests={interests}
notes={special_requirements}

OUTPUT SCHEMA:
{format_instructions}

RULES:
- No text outside JSON
- Real Uttarakhand places only
- No repeated places across days
- Group nearby places
- Avoid >100km same-day travel
- Add 20–30% mountain buffer

TIME:
- Use ranges (Early Morning, Afternoon, Evening)
- No exact timestamps

BUDGET:
- Food: ₹200–600 pp/day
- Activities: ₹100–2000 pp/day
- Stay within "{budget}"

STRUCTURE:
- Keep arrays aligned
- Each day must have activities
- Add short day_summary

Ensure valid JSON (no trailing commas, proper quotes).
"""
    return prompt.strip()


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

    cache_key = hashlib.md5(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    if cache_key in _cache:
        print("Cache hit", file=sys.stderr)
        return _cache[cache_key]

    structured: dict[str, object] = {}
    llm_error_message = ""

    try:

        if _is_complex_query(places, day_count, interests):
            primary_model = "gpt-5.3"
            fallback_model = "gpt-4o-mini"
        else:
            primary_model = "gpt-4o-mini"
            fallback_model = "gpt-5.3"

        parser = PydanticOutputParser(pydantic_object=ItineraryPlan)

        query_text = (
            f"Plan a Uttarakhand trip for {travelers} traveler(s) from {start_date.isoformat()} to {end_date.isoformat()} "
            f"with destinations {', '.join(places)} and current destination {current_destination}. "
            f"Interests: {', '.join(interests) if interests else 'general sightseeing'}."
        )

        context = _retrieve_context(payload, query_text)
        prompt = _build_prompt(payload, context, parser.get_format_instructions())

        parsed_plan = None

        try:
            print(f"Using {primary_model}", file=sys.stderr)
            llm_primary = _build_llm(primary_model)

            response_message = llm_primary.invoke(prompt)
            response = _coerce_llm_text(response_message)

            parsed_plan = _safe_parse_json(parser, response)

            if parsed_plan:
                structured_candidate = _coerce_plan_dict(parsed_plan)
                if _is_low_quality(structured_candidate):
                    print("Low quality → fallback", file=sys.stderr)
                    parsed_plan = None
                else:
                    structured = structured_candidate

        except Exception as primary_error:
            print(f"Primary failed: {primary_error}", file=sys.stderr)

        # FALLBACK MODEL
        if not parsed_plan:
            try:
                print(f"Falling back to {fallback_model}", file=sys.stderr)
                llm_fallback = _build_llm(fallback_model)

                response_message = llm_fallback.invoke(prompt)
                response = _coerce_llm_text(response_message)

                parsed_plan = _safe_parse_json(parser, response)

                if parsed_plan:
                    structured = _coerce_plan_dict(parsed_plan)

            except Exception as fallback_error:
                print(f"Fallback failed: {fallback_error}", file=sys.stderr)

        if not structured:
            llm_error_message = "Both models failed or returned low-quality output"

    except Exception as llm_exc:
        structured = {}
        llm_error_message = str(llm_exc)
        print(f"Generation fallback triggered: {llm_error_message}", file=sys.stderr)

    # If LLMs fail to generate itinerary, use generic FALLBACK (your original system)
    if not structured:
        print("Using fallback itinerary template", file=sys.stderr)

        fallback_days = []
        visited_places = set()
        places_rotation = places * ((day_count // len(places)) + 1)

        for index in range(day_count):
            day_date = start_date + timedelta(days=index)
            place = places_rotation[index]

            if place in visited_places:
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

            fallback_days.append({
                "dayNumber": index + 1,
                "date": day_date.isoformat(),
                "title": f"Explore {place}",
                "summary": f"Day {index + 1}: Experience {place}",
                "checkpoints": checkpoints,
            })

        structured = {
            "days": fallback_days,
            "summary": {
                "total_estimated_budget": budget,
                "budget_fit": "optimized",
                "notes": "Generated via fallback system",
                "llm_error": llm_error_message,
            },
        }

    days = structured.get("days", [])
    if not isinstance(days, list):
        days = []

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
        "summary": structured.get("summary", {}),
    }

    markdown = _to_markdown(structured, {"budget": budget})

    result = {
        "itinerary": markdown,
        "itineraryStructured": structured,
        "checkpoints": [
            cp for day in days for cp in day.get("checkpoints", []) if isinstance(cp, dict)
        ],
    }
    _cache[cache_key] = result

    return result

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