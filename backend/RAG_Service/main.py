
import json
import os
import sys
from datetime import datetime, timedelta

from langchain_core.output_parsers import PydanticOutputParser
from langchain_groq import ChatGroq
from pydantic import BaseModel, SecretStr

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


def _get_groq_key():
	key = os.getenv("GROQ_API_KEY")
	if not key:
		raise RuntimeError("GROQ_API_KEY is missing. Set it in your environment before running generation.")
	return key


def _build_llm():
	groq_api_key = _get_groq_key()
	model_id = os.getenv("GROQ_MODEL_ID", "llama-3.3-70b-versatile")
	return ChatGroq(
		model=model_id,
		api_key=SecretStr(groq_api_key),
		temperature=0.7,
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

	return (
		"You are an expert Uttarakhand travel planner. Use the retrieved context and the user trip details to "
		"produce realistic, editable itinerary JSON only.\n\n"
		f"Retrieved context:\n{context or 'No retrieved context available.'}\n\n"
		f"Start date: {start_date}\n"
		f"End date: {end_date}\n"
		f"Current location: {current_location}\n"
		f"Current destination: {current_destination}\n"
		f"Destinations: {', '.join(places)}\n"
		f"Budget: {budget}\n"
		f"Travelers: {travelers}\n"
		f"Days: {num_days}\n"
		f"Interests: {interests}\n"
		f"Special requirements: {special_requirements}\n\n"
		"Return only JSON that satisfies the schema below. "
		"Do not wrap the JSON in markdown fences or add commentary.\n\n"
		f"{format_instructions}\n\n"
		"Make the itinerary realistic, budget-aware, and optimized around the current destination."
	)


def _generate_day_checkpoints(day_index, day_date, place, interests, budget):
	interest_hint = interests[day_index % len(interests)] if interests else "Local exploration"
	date_label = day_date.strftime("%d %b %Y")

	return [
		{
			"time": "08:00 AM",
			"title": f"Breakfast and Briefing in {place}",
			"description": f"Start with local breakfast and quick orientation for day {day_index + 1}.",
			"location": place,
			"notes": f"Keep this within {budget} budget preference.",
		},
		{
			"time": "11:00 AM",
			"title": f"{interest_hint} Experience",
			"description": f"Focused activity around {interest_hint.lower()} with photo stops and local stories.",
			"location": place,
			"notes": "Carry water and maintain flexible timing for weather.",
		},
		{
			"time": "03:30 PM",
			"title": "Scenic Checkpoint",
			"description": f"Leisure walk and viewpoint session around {place}.",
			"location": place,
			"notes": "Ideal time for relaxed exploration and short breaks.",
		},
		{
			"time": "07:00 PM",
			"title": "Dinner and Day Wrap-up",
			"description": f"Try regional dinner and plan next day highlights.",
			"location": place,
			"notes": f"Date: {date_label}",
		},
	]


def _to_markdown(structured_output, trip_context):
	lines = ["Your Planned itinerary is", ""]

	for day in structured_output.get("days", []):
		lines.append(f"**Day {day.get('dayNumber')}: {day.get('date')} - {day.get('title')}**")
		lines.append("")
		lines.append("| Time | Activity | Description |")
		lines.append("|------|----------|-------------|")
		for cp in day.get("checkpoints", []):
			lines.append(
				f"| **{cp.get('time', '')}** | **{cp.get('title', '')}** | {cp.get('description', '')} ({cp.get('location', '')}) |"
			)
		lines.append("")

	lines.append("**Budget Breakdown:**")
	lines.append("")
	lines.append(f"* Estimated budget range: {trip_context.get('budget', 'N/A')}")
	lines.append("* Accommodation: Flexible by destination and season")
	lines.append("* Food and beverages: Local dining + cafe mix")
	lines.append("* Transportation: Route-optimized local travel")
	lines.append("* Activities and entry fees: Based on selected interests")

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
		places = ["Rishikesh", "Haridwar", "Mussoorie","Nainital", "Dehradun"]

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
		print("Generation is here: invoking Groq LLM", file=sys.stderr)
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
			fallback_days.append(
				{
					"dayNumber": index + 1,
					"date": day_date.isoformat(),
					"title": f"Explore {place}",
					"summary": f"A balanced day in {place} designed for {travelers} traveler(s).",
					"checkpoints": _generate_day_checkpoints(index, day_date, place, interests, budget),
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
		if not isinstance(day.get("checkpoints"), list):
			place = places[index % len(places)]
			day["checkpoints"] = _generate_day_checkpoints(index, start_date + timedelta(days=index), place, interests, budget)

	if "summary" not in structured or not isinstance(structured.get("summary"), dict):
		structured["summary"] = {
			"total_estimated_budget": budget,
			"budget_fit": "optimized",
			"notes": "Generated with Groq backed retrieval and generation.",
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

