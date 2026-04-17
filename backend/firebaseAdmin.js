import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const keyPath = process.env.FIREBASE_ADMIN_KEY_PATH || path.join(__dirname, 'firebaseAdminKey.json');

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;