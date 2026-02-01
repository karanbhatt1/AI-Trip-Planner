import Trip from "../models/trip.model.js";

export const createTrip = async (req, res) => {
    try {
        const { userId, startDate, endDate, travelers, budget, interests, destinations, specialRequirements } = req.body;

        if (!userId || !startDate || !endDate || !travelers || !budget) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        const trip = await Trip.create({
            userId,
            startDate,
            endDate,
            travelers,
            budget,
            interests,
            destinations,
            specialRequirements,
            itinerary: "AI-generated itinerary will be added here" // Placeholder for AI integration
        });

        res.status(201).json({ message: "Trip created successfully", trip });
    } catch (error) {
        console.log("Error in createTrip:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getUserTrips = async (req, res) => {
    try {
        const { userId } = req.params;
        const trips = await Trip.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(trips);
    } catch (error) {
        console.log("Error in getUserTrips:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
