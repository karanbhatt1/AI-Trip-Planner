import mongoose from "mongoose";

const tripSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    travelers: {
        type: Number,
        required: true
    },
    budget: {
        type: String,
        required: true
    },
    interests: [{
        type: String
    }],
    destinations: [{
        type: String
    }],
    specialRequirements: {
        type: String
    },
    itinerary: {
        type: String // AI-generated itinerary
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Trip = mongoose.model("Trip", tripSchema);
export default Trip;
