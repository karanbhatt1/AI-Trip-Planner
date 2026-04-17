import { verifySessionToken } from '../services/auth.service.js';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const decoded = verifySessionToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired' });
    }

    return res.status(401).json({ error: 'Invalid session' });
  }
};

export default authMiddleware;