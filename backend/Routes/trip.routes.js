import express from 'express';
import { createTrip, getUserTrips, updateTrip, deleteTrip } from '../controllers/trip.controller.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create', authMiddleware, createTrip);
router.get('/user/:userId', authMiddleware, getUserTrips);
router.put('/:tripId', authMiddleware, updateTrip);
router.delete('/:tripId', authMiddleware, deleteTrip);

export default router;
