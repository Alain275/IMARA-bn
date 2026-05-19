import admin from 'firebase-admin';

let initialized = false;

export function initFirebase() {
  if (initialized) return admin;
  // Support both FB_* and FIREBASE_* env names
  const projectId = process.env.FB_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FB_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  const databaseURL = process.env.FB_DATABASE_URL || process.env.FIREBASE_DATABASE_URL;
  if (!projectId || !clientEmail || !privateKey || !databaseURL) {
    console.warn('[firebaseAdmin] Missing Firebase env, skipping init');
    return null;
  }
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    databaseURL,
  });
  initialized = true;
  return admin;
}

export function getFirebaseDb() {
  const app = initFirebase();
  if (!app) return null;
  return app.database();
}






