const admin = require('firebase-admin');
require('dotenv').config({ path: __dirname + '/.env' });

async function test() {
  console.log("Using Project:", process.env.FIREBASE_PROJECT_ID);
  
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

  const db = admin.firestore();
  
  try {
    console.log("Attempting to read from default database...");
    await db.collection('health-check').limit(1).get();
    console.log("Success! Database exists and is reachable.");
  } catch (error) {
    console.error("Full Error Object:", error);
    console.error("Error Code:", error.code);
    console.error("Error Details:", error.details);
  }
}

test().catch(console.error);
