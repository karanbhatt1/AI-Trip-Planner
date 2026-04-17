import User from '../models/user.model.js';
import Trip from '../models/trip.model.js';
import {
  verifyFirebaseIdToken,
  createOrUpdateUserFromFirebase,
  createSessionToken,
} from '../services/auth.service.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export const verifyAuthToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Firebase token is required' });
    }

    // 1) Verify Firebase ID token and normalize profile details.
    const firebaseUser = await verifyFirebaseIdToken(token);
    // 2) Create first-time users or update returning user's login timestamp.
    const dbUser = await createOrUpdateUserFromFirebase(firebaseUser);

    // 3) Issue short payload session JWT for backend-authenticated routes.
    const sessionToken = createSessionToken({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
    });

    return res.status(200).json({
      success: true,
      sessionToken,
      user: {
        id: dbUser._id,
        uid: firebaseUser.uid,
        email: dbUser.email,
        phone: dbUser.phone,
        username: dbUser.username,
        profilePicture: dbUser.profilePicture,
        lastLoginAt: dbUser.lastLoginAt,
      },
    });
  } catch (error) {
    const errorCode = typeof error?.code === 'string' ? error.code : '';
    if (errorCode.startsWith('auth/')) {
      return res.status(401).json({ error: 'Invalid Firebase token' });
    }

    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getAuthProfile = async (req, res) => {
  try {
    // req.user comes from JWT middleware verification.
    const user = await User.findOne({ firebaseUid: req.user.uid }).select(
      '_id firebaseUid email username phone profilePicture lastLoginAt createdAt'
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      user,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const logout = async (_req, res) => {
  // JWT is stateless. Client should delete token from storage.
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully. Remove token on client side.',
  });
};

export const updateAuthProfile = async (req, res) => {
  try {
    const { name, profilePicture, phone, email } = req.body;
    const updates = {};
    const unsets = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters' });
      }
      updates.username = name.trim();
    }

    if (profilePicture !== undefined) {
      if (profilePicture !== null && typeof profilePicture !== 'string') {
        return res.status(400).json({ error: 'profilePicture must be a URL string or null' });
      }

      if (typeof profilePicture === 'string' && profilePicture.length > 0) {
        const isHttpUrl = /^https?:\/\//i.test(profilePicture);
        const isDataImage = /^data:image\//i.test(profilePicture);

        if (!isHttpUrl && !isDataImage) {
          return res.status(400).json({ error: 'profilePicture must be an image URL or data:image string' });
        }

        updates.profilePicture = profilePicture;
      } else {
        unsets.profilePicture = 1;
      }
    }

    if (phone !== undefined) {
      if (phone === null || phone === '') {
        unsets.phone = 1;
      } else if (typeof phone !== 'string' || !PHONE_REGEX.test(phone.trim())) {
        return res.status(400).json({ error: 'phone must be a valid international number' });
      } else {
        updates.phone = phone.trim();
      }
    }

    if (email !== undefined) {
      if (email === null || email === '') {
        unsets.email = 1;
      } else if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        return res.status(400).json({ error: 'email must be a valid email address' });
      } else {
        updates.email = email.trim().toLowerCase();
      }
    }

    if (Object.keys(updates).length === 0 && Object.keys(unsets).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    const updateDoc = {};
    if (Object.keys(updates).length > 0) {
      updateDoc.$set = updates;
    }
    if (Object.keys(unsets).length > 0) {
      updateDoc.$unset = unsets;
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      updateDoc,
      { new: true }
    ).select('_id firebaseUid email username phone profilePicture lastLoginAt createdAt');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(409).json({ error: `${duplicateField} is already in use` });
    }

    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const deleteAuthAccount = async (req, res) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findOneAndDelete({ firebaseUid: uid });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await Trip.deleteMany({ userId: uid });

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
