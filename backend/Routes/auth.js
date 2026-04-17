import express from 'express';
import {
  verifyAuthToken,
  getAuthProfile,
  updateAuthProfile,
  logout,
  deleteAuthAccount,
} from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/verify', verifyAuthToken);
router.get('/profile', authMiddleware, getAuthProfile);
router.put('/profile', authMiddleware, updateAuthProfile);
router.delete('/account', authMiddleware, deleteAuthAccount);
router.post('/logout', authMiddleware, logout);

export default router;