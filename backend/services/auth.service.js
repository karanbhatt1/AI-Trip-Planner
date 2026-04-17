import jwt from 'jsonwebtoken';
import admin from '../firebaseAdmin.js';
import User from '../models/user.model.js';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

export const verifyFirebaseIdToken = async (firebaseToken) => {
  // Trust Firebase Admin SDK to validate signature and token claims.
  const decoded = await admin.auth().verifyIdToken(firebaseToken);

  return {
    uid: decoded.uid,
    email: decoded.email || null,
    name: decoded.name || null,
    phone: decoded.phone_number || null,
    picture: decoded.picture || null,
  };
};

export const createOrUpdateUserFromFirebase = async (firebaseUser) => {
  const now = new Date();

  const defaultUsername =
    firebaseUser.name ||
    (firebaseUser.email ? firebaseUser.email.split('@')[0] : `user_${firebaseUser.uid.slice(0, 8)}`);

  const setFields = {
    username: defaultUsername,
    lastLoginAt: now,
  };

  if (firebaseUser.email) {
    setFields.email = firebaseUser.email;
  }

  if (firebaseUser.phone) {
    setFields.phone = firebaseUser.phone;
  }

  if (firebaseUser.picture) {
    setFields.profilePicture = firebaseUser.picture;
  }

  // Upsert user by Firebase UID and always refresh login timestamp.
  const user = await User.findOneAndUpdate(
    { firebaseUid: firebaseUser.uid },
    {
      $set: setFields,
      $setOnInsert: {
        createdAt: now,
      },
    },
    { new: true, upsert: true }
  );

  return user;
};

export const createSessionToken = (payload) => {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  // Keep JWT payload minimal to reduce sensitive data exposure.
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifySessionToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};
