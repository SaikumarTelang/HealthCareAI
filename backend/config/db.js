const admin = require('firebase-admin');
const mockDb = require('../utils/mockDb');

const connectDB = async () => {
  try {
    // Force use of mock DB if explicitly requested or if Firebase credentials look placeholder
    if (process.env.USE_MOCK_DB === 'true' || !process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_CLIENT_EMAIL.includes('your-service-account')) {
      console.log('Using Mock In-Memory Database');
      return mockDb;
    }

    if (admin.apps.length === 0) {
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (privateKey) {
        privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        })
      });
      console.log(`Firebase Admin SDK Connected: ${process.env.FIREBASE_PROJECT_ID}`);
    }
    
    const db = admin.firestore();
    // Test connection with a simple request to verify API is enabled
    try {
      await db.collection('health-check').limit(1).get();
      db.FieldValue = admin.firestore.FieldValue;
      return db;
    } catch (apiError) {
      if (apiError.message.includes('PERMISSION_DENIED') || apiError.message.includes('Firestore API has not been used')) {
        console.warn('--- FIRESTORE API NOT ENABLED ---');
        console.warn('Falling back to In-Memory Database to keep app functional.');
        console.warn('Please enable Firestore in your Google Cloud Console.');
        mockDb.FieldValue = mockDb.firestore.FieldValue;
        return mockDb;
      }
      throw apiError;
    }
  } catch (error) {
    console.error(`Firebase Error: ${error.message}. Falling back to Mock DB.`);
    mockDb.FieldValue = mockDb.firestore.FieldValue;
    return mockDb;
  }
};

module.exports = connectDB;
