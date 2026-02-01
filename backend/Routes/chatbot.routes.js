import express from 'express';
import { userMessageHandler } from '../controllers/bot.controller.js';

const router = express.Router();

router.post('/chat', userMessageHandler);
export default router;