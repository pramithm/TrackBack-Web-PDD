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
  const email = process.env.TEST_EMAIL || 'testuser@trackback.com';
  const password = process.env.TEST_PASSWORD || 'TestPass@123';

  console.log(`🔑 Ensuring test user exists: ${email}`);

  try {
    let user;
    try {
      // Try to create the user first
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      user = cred.user;
      console.log(`👤 Created new test user in Firebase Auth. UID: ${user.uid}`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        // User already exists, sign in to retrieve their UID
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
        console.log(`👤 Test user already exists. Signed in successfully. UID: ${user.uid}`);
      } else {
        throw err;
      }
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
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding test user:", error);
    process.exit(1);
  }
};

run();
