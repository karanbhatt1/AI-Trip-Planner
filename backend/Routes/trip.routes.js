import express from 'express';
import { createTrip, getUserTrips } from '../controllers/trip.controller.js';

const router = express.Router();

router.post('/create', createTrip);
router.get('/user/:userId', getUserTrips);

export default router;
