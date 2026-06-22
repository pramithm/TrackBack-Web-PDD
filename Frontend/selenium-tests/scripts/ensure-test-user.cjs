const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getDatabase, ref, set } = require('firebase/database');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAe3PhCyMJigvguh3oxf1vCX_1MYvfSfMk",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "trackback-1c73e.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "trackback-1c73e",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "trackback-1c73e.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "792883031609",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:792883031609:web:fe36fa5823b2b91ed5a7e8",
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || "https://trackback-1c73e-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const rtdb = getDatabase(app);

const run = async () => {
  const buildNum = process.env.BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER || 'local';
  const rand = Math.floor(1000 + Math.random() * 9000);

  // Retrieve raw credentials and trim whitespaces
  const rawEmail = (process.env.TEST_EMAIL || '').trim();
  const rawPassword = (process.env.TEST_PASSWORD || '').trim();

  // Enforce fallbacks for empty or invalid values
  const email = (rawEmail && rawEmail.includes('@') && !rawEmail.includes('testuser@trackback.com'))
    ? rawEmail
    : 'pramithm2174.sse@saveetha.com';
  const password = (rawPassword && rawPassword.length >= 6) ? rawPassword : 'asdf1234';

  console.log(`🔑 Debugging credentials (secure format check):`);
  console.log(`- Email length: ${email ? email.length : 0}`);
  console.log(`- Email contains @: ${email ? email.includes('@') : false}`);
  console.log(`- Password length: ${password ? password.length : 0}`);
  console.log(`- Email contains whitespace/newlines: ${/\s/.test(email)}`);
  console.log(`- Password contains whitespace/newlines: ${/\s/.test(password)}`);

  console.log(`🔑 Ensuring test user exists: ${email}`);

  try {
    let user;
    try {
      // Try to sign in first
      const cred = await signInWithEmailAndPassword(auth, email, password);
      user = cred.user;
      console.log(`👤 Signed in existing test user. UID: ${user.uid}`);
    } catch (signInErr) {
      console.error(`❌ Sign-in failed. Email verification / account issue.`);
      throw signInErr;
    }

    // Now seed/verify the profile in Realtime Database
    console.log("✍️ Seeding/verifying user profile in Realtime Database...");
    const profileRef = ref(rtdb, `users/${user.uid}`);
    const profileData = {
      name: "Test User",
      phone: "9876543210",
      phoneNumber: "9876543210",
      isProfileVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await set(profileRef, profileData);
    console.log("✅ Profile successfully seeded and verified!");

    // Save credentials to test-credentials.json in the workspace root
    const fs = require('fs');
    const path = require('path');
    const credsPath = path.resolve(__dirname, '../../../test-credentials.json');
    fs.writeFileSync(credsPath, JSON.stringify({ email, password }, null, 2), 'utf8');
    console.log(`💾 Saved credentials to: ${credsPath}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding test user:", error);
    process.exit(1);
  }
};

run();
