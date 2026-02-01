import { PromptTemplate } from "@langchain/core/prompts";
import * as fs from "fs";

// 1. Define the template
const template = `
            You are an AI trip planner for the uttarakhand India that helps users create personalized travel itineraries based on their preferences.
            You are given with the following details about the trip:
            Start date of the trip: {start_date}
            End date of the trip: {end_date}
            Places to visit: {places_to_visit}
            Budget of the trip: {budget}
            Total number of travelers: {num_travelers}
            number of days: {num_days}

            You have to make the itinerary in the following format:
            Day 1:
            - Morning: 
            - Afternoon: 
            - Evening:
            Day 2: ....
            Make sure to include popular tourist attractions, local experiences, and dining options within the specified budget.
            Provide a brief description of each activity and its location.
            Ensure the itinerary is well-structured and easy to follow.
            And also ensure that the itinerary is optimized for the number of days provided.
            Make sure that they have everything budget friendly and enjoyable.
    `;

// 2. Instantiate the PromptTemplate
const promptTemplate = new PromptTemplate({
  inputVariables: ["start_date", "end_date", "places_to_visit", "budget", "num_travelers", "num_days"],
  template: template,
});

// 3. Save the template to a JSON file
// LangChain.js templates can be serialized to an object
const serializedPrompt = JSON.stringify(promptTemplate.serialize(), null, 2);
fs.writeFileSync("template.json", serializedPrompt);

console.log("Template saved to template.json");