const { GoogleAuth } = require('google-auth-library');
require('dotenv').config({ path: __dirname + '/.env' });

async function testREST() {
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
      project_id: process.env.FIREBASE_PROJECT_ID
    },
    scopes: ['https://www.googleapis.com/auth/datastore']
  });

  const client = await auth.getClient();
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/health-check`;

  try {
    const res = await client.request({ url });
    console.log("REST API Success:", res.data);
  } catch (err) {
    console.error("REST API Error:");
    console.error(err.response?.data || err.message);
  }
}

testREST().catch(console.error);
