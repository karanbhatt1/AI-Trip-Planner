import express from 'express';
import { registerUser, getUserProfile } from '../controllers/user.controller.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.get('/profile/:userId', authMiddleware, getUserProfile);

export default router;
