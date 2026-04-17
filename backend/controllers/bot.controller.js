import {ChatGroq} from "@langchain/groq";
import { PromptTemplate } from "@langchain/core/prompts";
import * as fs from "fs";
import dotenv from "dotenv";


dotenv.config();

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
});

export const userMessageHandler = async (req, res) => {
    try {
        const { start_date, end_date, places_to_visit, budget, num_travelers, num_days } = req.body;

        if (!start_date || !end_date || !budget || !num_travelers || !num_days) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!Array.isArray(places_to_visit) || places_to_visit.length === 0) {
            return res.status(400).json({ error: "places_to_visit must be a non-empty array" });
        }

        if (JSON.stringify(req.body).length > 10000) {
            return res.status(413).json({ error: "Payload too large" });
        }

        const templateData = fs.readFileSync("./chatbot/template.json", "utf-8");
        const serializedPrompt = JSON.parse(templateData);
        const template = await PromptTemplate.deserialize(serializedPrompt);

        const chain = template.pipe(model);
        console.log("Invoking the chain with user data...");
        const result = await chain.invoke({
            start_date,
            end_date,
            places_to_visit,
            budget,
            num_travelers,
            num_days
        })
        console.log("Chain invocation completed.");
        res.json({ 'itinerary': result.content });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }

}