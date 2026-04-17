import express from 'express';
import { getOptimizedRoute } from '../services/routeService.js';

const router = express.Router();

// GET /api/route - Get optimized route with checkpoints
router.post('/route', async (req, res) => {
  try {
    const { source, destination, waypoints, preferences } = req.body;

    // Validate input
    if (!source || !destination) {
      return res.status(400).json({
        error: 'Source and destination are required'
      });
    }

    // Get optimized route
    const routeData = await getOptimizedRoute(source, destination, waypoints, preferences);

    res.json(routeData);
  } catch (error) {
    console.error('Route API error:', error);
    res.status(500).json({
      error: 'Failed to generate route',
      message: error.message
    });
  }
});

export default router;