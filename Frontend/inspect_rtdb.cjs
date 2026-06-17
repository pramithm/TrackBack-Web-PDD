const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getDatabase, ref, get } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyAe3PhCyMJigvguh3oxf1vCX_1MYvfSfMk",
  authDomain: "trackback-1c73e.firebaseapp.com",
  projectId: "trackback-1c73e",
  storageBucket: "trackback-1c73e.appspot.com",
  databaseURL: "https://trackback-1c73e-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const rtdb = getDatabase(app);

const run = async () => {
  const email = `test_${Math.floor(Math.random()*10000)}@example.com`;
  const password = "password123";

  try {
    console.log("Creating/Signing in test user...");
    let user;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      user = cred.user;
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
      } else {
        throw err;
      }
    }

    console.log("Fetching items from database...");
    const itemsRef = ref(rtdb, 'items');
    const snapshot = await get(itemsRef);
    
    if (snapshot.exists()) {
      const items = snapshot.val();
      console.log("Database Items Found:", Object.keys(items).length);
      Object.keys(items).forEach(id => {
        const item = items[id];
        if (item.type === 'found') {
          console.log(`\nItem ID: ${id}`);
          console.log("Full Item details:", JSON.stringify(item, null, 2));
        }
      });
    } else {
      console.log("No items found in database.");
    }
  } catch (error) {
    console.error("Error inspecting database:", error);
  }
};

run();
