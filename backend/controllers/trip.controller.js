import Trip from "../models/trip.model.js";
import { generateItineraryFromPython } from "../services/itineraryGenerator.service.js";

export const createTrip = async (req, res) => {
    try {
        const { startDate, endDate, travelers, budget, interests, destinations, specialRequirements, startingPosition, startingCoordinates } = req.body;
        const userId = req.user?.uid;

        if (!userId || !startDate || !endDate || !travelers || !budget) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);
        const travelerCount = Number(travelers);

        if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
            return res.status(400).json({ error: "Invalid startDate or endDate" });
        }

        if (parsedEndDate <= parsedStartDate) {
            return res.status(400).json({ error: "endDate must be after startDate" });
        }

        if (!Number.isFinite(travelerCount) || travelerCount < 1) {
            return res.status(400).json({ error: "travelers must be a positive number" });
        }

        const numDays = Math.max(
            1,
            Math.ceil((parsedEndDate.getTime() - parsedStartDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        const itineraryResponse = await generateItineraryFromPython({
            start_date: parsedStartDate.toISOString().slice(0, 10),
            end_date: parsedEndDate.toISOString().slice(0, 10),
            places_to_visit: Array.isArray(destinations) ? destinations : [],
            current_destination: req.body?.currentDestination || (Array.isArray(destinations) ? destinations[0] : ""),
            budget,
            num_travelers: travelerCount,
            num_days: numDays,
            interests: Array.isArray(interests) ? interests : [],
            special_requirements: specialRequirements || "",
            current_location: startingPosition || "",
        });

        const trip = await Trip.create({
            userId,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            travelers: travelerCount,
            budget,
            interests,
            destinations,
            specialRequirements,
            startingPosition: startingPosition || "",
            startingCoordinates: startingCoordinates || "",
            itinerary: itineraryResponse?.itinerary || "",
            itineraryStructured: itineraryResponse?.itineraryStructured || null,
            checkpoints: Array.isArray(itineraryResponse?.checkpoints) ? itineraryResponse.checkpoints : []
        });

        res.status(201).json({
            message: "Trip created and itinerary generated successfully",
            trip,
            itinerary: trip.itinerary,
            itineraryStructured: trip.itineraryStructured,
            checkpoints: trip.checkpoints,
        });
    } catch (error) {
        console.log("Error in createTrip:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getUserTrips = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!req.user?.uid || req.user.uid !== userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const trips = await Trip.find({ userId: req.user.uid }).sort({ createdAt: -1 });
        res.status(200).json(trips);
    } catch (error) {
        console.log("Error in getUserTrips:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const updateTrip = async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.user?.uid;
        const {
            startDate,
            endDate,
            travelers,
            budget,
            interests,
            destinations,
            specialRequirements,
            startingPosition,
            startingCoordinates,
            itinerary,
            itineraryStructured,
            checkpoints,
        } = req.body;

        if (!tripId || !userId) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        const trip = await Trip.findOne({ _id: tripId, userId });
        if (!trip) {
            return res.status(404).json({ error: "Trip not found" });
        }

        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);
        const travelerCount = Number(travelers);

        if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
            return res.status(400).json({ error: "Invalid startDate or endDate" });
        }

        if (parsedEndDate <= parsedStartDate) {
            return res.status(400).json({ error: "endDate must be after startDate" });
        }

        if (!Number.isFinite(travelerCount) || travelerCount < 1) {
            return res.status(400).json({ error: "travelers must be a positive number" });
        }

        if (!budget) {
            return res.status(400).json({ error: "budget is required" });
        }

        trip.startDate = parsedStartDate;
        trip.endDate = parsedEndDate;
        trip.travelers = travelerCount;
        trip.budget = budget;
        trip.interests = Array.isArray(interests) ? interests : [];
        trip.destinations = Array.isArray(destinations) ? destinations : [];
        trip.specialRequirements = specialRequirements || "";
        if (startingPosition !== undefined) {
            trip.startingPosition = startingPosition || "";
        }
        if (startingCoordinates !== undefined) {
            trip.startingCoordinates = startingCoordinates || "";
        }
        if (typeof itinerary === "string") {
            trip.itinerary = itinerary;
        }
        if (itineraryStructured && typeof itineraryStructured === "object") {
            trip.itineraryStructured = itineraryStructured;
        }
        if (Array.isArray(checkpoints)) {
            trip.checkpoints = checkpoints;
        }

        await trip.save();

        res.status(200).json({ message: "Trip updated successfully", trip });
    } catch (error) {
        console.log("Error in updateTrip:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteTrip = async (req, res) => {
    try {
        const { tripId } = req.params;
        const userId = req.user?.uid;

        if (!tripId || !userId) {
            return res.status(400).json({ error: "Required fields are missing" });
        }

        const deletedTrip = await Trip.findOneAndDelete({ _id: tripId, userId });
        if (!deletedTrip) {
            return res.status(404).json({ error: "Trip not found" });
        }

        res.status(200).json({ message: "Trip deleted successfully" });
    } catch (error) {
        console.log("Error in deleteTrip:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
