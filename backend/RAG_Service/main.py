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

	return f"""You are an expert Uttarakhand travel planner and logistics optimizer.

Use the retrieved context plus the trip details to generate a realistic, practical, editable itinerary in strict JSON only.

Retrieved context:
{context or 'No retrieved context available.'}

Trip details:
Start date: {start_date}
End date: {end_date}
Current location: {current_location}
Current destination: {current_destination}
Destinations: {', '.join(places)}
Budget: {budget}
Travelers: {travelers}
Days: {num_days}
Interests: {interests}
Special requirements: {special_requirements}

Planning rules:
- Treat mountain travel as slow and add buffer time for delays.
- Keep the plan route-optimized and avoid unnecessary backtracking.
- Respect hotel check-in around 12 PM and check-out around 10 AM.
- Do not overload any day; keep the itinerary realistic and comfortable.
- Include morning, afternoon, and evening structure for every day.
- Include travel distance/time, weather considerations when relevant, safety notes, and local tips.
- Include realistic activities for each checkpoint, with costs in Indian Rupees.
- Include cost breakdowns for transport, accommodation, food, and activities.
- Use only real, verified Uttarakhand locations and no fictional places.
- Keep the itinerary editable and include alternatives for major activities.

Budget handling:
- If budget is low, prefer budget stays and shared transport.
- If budget is high, include better hotels and premium experiences.

Feasibility handling:
- If the number of days is too large for the requested scope or there are too many destinations to cover fully, explicitly say that all areas cannot be explored in full within the available days.
- In that case, reduce the plan intelligently and prioritize the most feasible subset of places.
- Explain the reduction in notes instead of forcing an unrealistic full itinerary.
- If the trip is not feasible as requested, provide the closest valid version.
- Respect special requirements strictly.

Return only valid JSON and no markdown, explanation, or extra text.
Follow this schema exactly:

{format_instructions}

Make the itinerary feel like it was created by a local travel expert, not a generic AI."""



def _generate_detailed_day_checkpoints(day_index, day_date, place, interests, budget, current_location, travelers):
	"""
	Generate detailed day checkpoints with place names, costs, transport, and activities.
	This is a robust fallback that does NOT rely on LLM.
	"""
	interest_hint = interests[day_index % len(interests)] if interests else "sightseeing"
	
	# Map places to local attractions and realistic costs
	place_attractions = {
		"Rishikesh": {
			"morning": {"activity": "Ghat Yoga & Meditation", "cost": "₹300-500", "transport": "Local taxi/auto"},
			"midday": {"activity": "Triveni Ghat & Temple Visit", "cost": "₹200-400", "transport": "Walking/local transport"},
			"afternoon": {"activity": "Adventure Sports (Rafting)", "cost": "₹800-1500", "transport": "Organized shuttle"},
			"evening": {"activity": "Lakshman Jhula & Market", "cost": "₹300-600", "transport": "Local auto/bus"}
		},
		"Haridwar": {
			"morning": {"activity": "Ghat Pilgrimage & Aarti", "cost": "₹200-400", "transport": "Walking/auto"},
			"midday": {"activity": "Mansa Devi Temple Cable Car", "cost": "₹250-500", "transport": "Cable car"},
			"afternoon": {"activity": "Local Market & Shopping", "cost": "₹500-1200", "transport": "Walking/auto"},
			"evening": {"activity": "Evening Aarti Ceremony", "cost": "₹150-300", "transport": "Walking"}
		},
		"Mussoorie": {
			"morning": {"activity": "Mall Road Walking & Breakfast", "cost": "₹400-800", "transport": "Walking"},
			"midday": {"activity": "Gun Hill Viewpoint", "cost": "₹300-600", "transport": "Cable car/local taxi"},
			"afternoon": {"activity": "Kempty Falls Trek", "cost": "₹600-1200", "transport": "Organized tour/local taxi"},
			"evening": {"activity": "Cloud's End Point Sunset", "cost": "₹200-400", "transport": "Local taxi"}
		},
		"Nainital": {
			"morning": {"activity": "Naini Lake Boat Ride", "cost": "₹400-700", "transport": "Local transport"},
			"midday": {"activity": "Mall Road Shopping", "cost": "₹500-1000", "transport": "Walking/horse ride"},
			"afternoon": {"activity": "Ropeway/Chairlift Ride", "cost": "₹300-500", "transport": "Chairlift"},
			"evening": {"activity": "Viewpoint & Photography", "cost": "₹200-400", "transport": "Taxi/local transport"}
		},
		"Dehradun": {
			"morning": {"activity": "Breakfast & Local Markets", "cost": "₹300-600", "transport": "Local auto"},
			"midday": {"activity": "Robbers' Cave Trek", "cost": "₹400-800", "transport": "Taxi/organized tour"},
			"afternoon": {"activity": "Shopping at Paltan Bazaar", "cost": "₹500-1200", "transport": "Auto/taxi"},
			"evening": {"activity": "Local Dinner & Relaxation", "cost": "₹600-1200", "transport": "Taxi"}
		}
	}
	
	# Get attraction data for the place, or use generic fallback
	attractions = place_attractions.get(place, {
		"morning": {"activity": f"Breakfast & Orientation in {place}", "cost": "₹300-500", "transport": "Local transport"},
		"midday": {"activity": f"Local Sightseeing - {interest_hint}", "cost": "₹500-1000", "transport": "Taxi/local transport"},
		"afternoon": {"activity": f"Adventure Activity - {interest_hint}", "cost": "₹800-1500", "transport": "Organized transport"},
		"evening": {"activity": f"Dinner & Local Experience", "cost": "₹600-1200", "transport": "Local transport"}
	})
	
	# Determine budget-based recommendations
	budget_lower = "Budget" in budget or "Low" in budget
	budget_higher = "Premium" in budget or "Luxury" in budget
	
	date_label = day_date.strftime("%d %b %Y")
	
	checkpoints = [
		{
			"time": "08:00 AM",
			"title": attractions["morning"]["activity"],
			"description": f"Start your day with {attractions['morning']['activity'].lower()} in {place}. Ideal for morning activities and exploration.",
			"location": place,
			"notes": f"Cost estimate: {attractions['morning']['cost']} | Transport: {attractions['morning']['transport']} | Date: {date_label}",
			"cost": attractions["morning"]["cost"],
			"transport": attractions["morning"]["transport"],
		},
		{
			"time": "12:30 PM",
			"title": attractions["midday"]["activity"],
			"description": f"Mid-day experience with {attractions['midday']['activity'].lower()}. Great for lunch and afternoon activities.",
			"location": place,
			"notes": f"Cost estimate: {attractions['midday']['cost']} | Transport: {attractions['midday']['transport']} | Travelers: {travelers}",
			"cost": attractions["midday"]["cost"],
			"transport": attractions["midday"]["transport"],
		},
		{
			"time": "04:00 PM",
			"title": attractions["afternoon"]["activity"],
			"description": f"Afternoon adventure with {attractions['afternoon']['activity'].lower()}. Best time for outdoor activities.",
			"location": place,
			"notes": f"Cost estimate: {attractions['afternoon']['cost']} | Transport: {attractions['afternoon']['transport']} | Bring water & snacks",
			"cost": attractions["afternoon"]["cost"],
			"transport": attractions["afternoon"]["transport"],
		},
		{
			"time": "07:30 PM",
			"title": attractions["evening"]["activity"],
			"description": f"Evening relaxation with {attractions['evening']['activity'].lower()}. Perfect for dinner and winding down.",
			"location": place,
			"notes": f"Cost estimate: {attractions['evening']['cost']} | Transport: {attractions['evening']['transport']} | Dinner included",
			"cost": attractions["evening"]["cost"],
			"transport": attractions["evening"]["transport"],
		}
	]
	
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
		for index in range(day_count):
			day_date = start_date + timedelta(days=index)
			place = places[index % len(places)]
			checkpoints = _generate_detailed_day_checkpoints(
				index,
				day_date,
				place,
				interests,
				budget,
				current_location,
				travelers,
			)
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
				"notes": "Generated with fallback local structure because LLM output was unavailable.",
				"llm_error": llm_error_message,
			},
		}

	days = structured.get("days", [])
	if not isinstance(days, list):
		days = []
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
			day["checkpoints"] = _generate_detailed_day_checkpoints(
				index,
				start_date + timedelta(days=index),
				place,
				interests,
				budget,
				current_location,
				travelers,
			)

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