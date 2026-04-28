from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI
from vector_store import create_vector_db
import json

def load_prompt_template():
    with open("E:\\pbl\\MajorProject\\Trip-Planner1\\Trip-Planner\\Trip-Planner\\backend\\Templates\\itienarytemplate.txt", "r", encoding="utf-8") as f:
        return f.read()


def get_prompt():
    template = load_prompt_template()

    prompt = PromptTemplate(
        template=template,
        input_variables=[
            "context",
            "start_date",
            "end_date",
            "places_to_visit",
            "budget",
            "num_travelers",
            "num_days",
            "current_location"
        ]
    )

    return prompt


def generate_itinerary(chain, user_input):
    response = chain.invoke(user_input)
    return response


def parse_output(response):
    try:
        return json.loads(response)
    except:
        print("Invalid JSON from LLM")
        return None