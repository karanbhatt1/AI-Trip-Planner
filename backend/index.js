import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './Routes/auth.js';
import userRoutes from './Routes/user.routes.js';
import tripRoutes from './Routes/trip.routes.js';
import chatbotRoutes from './Routes/chatbot.routes.js';
import routeRoutes from './Routes/route.js';
import User from './models/user.model.js';

const app = express();
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../FrontEnd/.env') });

const port = process.env.PORT || 5000;

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is missing in environment variables');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing in environment variables');
  process.exit(1);
}

const corsOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173'];

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
});

const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use('/api', apiLimiter);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(async () => {
    console.log("MongoDB Connected successfully!");
    try {
      await User.syncIndexes();
      console.log('User indexes synchronized successfully');
    } catch (indexError) {
      console.error('Failed to synchronize user indexes', indexError);
    }
}).catch((error) => {
    console.log("Error connecting to MongoDB", error);
});

// Defining Routes
app.use('/api/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/trip', tripRoutes);
app.use('/api/v1/chatbot', chatbotLimiter, chatbotRoutes);
app.use('/api', routeRoutes);

app.listen(port, () => {
  console.log(`Server is running on Port: ${port}`);
});
