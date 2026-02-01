import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import userRoutes from './Routes/user.routes.js';
import tripRoutes from './Routes/trip.routes.js';
import chatbotRoutes from './Routes/chatbot.routes.js';

const app = express();
dotenv.config();

const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Connected successfully!");
}).catch((error) => {
    console.log("Error connecting to MongoDB", error);
});

// Defining Routes
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/trip', tripRoutes);
app.use('/api/v1/chatbot', chatbotRoutes);

app.listen(port, () => {
  console.log(`Server is running on Port: ${port}`);
});
