const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get, remove } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyAe3PhCyMJigvguh3oxf1vCX_1MYvfSfMk",
  authDomain: "trackback-1c73e.firebaseapp.com",
  projectId: "trackback-1c73e",
  storageBucket: "trackback-1c73e.appspot.com",
  databaseURL: "https://trackback-1c73e-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

const runTest = async () => {
  const testId = 'test_item_123';
  const testRef = ref(rtdb, `items/${testId}`);
  
  const testData = {
    id: testId,
    title: "Test Item from Script",
    type: "found",
    category: "Keys",
    verificationQuestions: [
      { q: "What color is the keychain?", a: "Red" },
      { q: "How many keys are on it?", a: "3" }
    ],
    createdAt: Date.now()
  };

  try {
    console.log("Writing test item to database...");
    await set(testRef, testData);
    console.log("Write successful.");

    console.log("Reading test item back from database...");
    const snapshot = await get(testRef);
    if (snapshot.exists()) {
      const fetchedData = snapshot.val();
      console.log("Fetched Data:", JSON.stringify(fetchedData, null, 2));
      console.log("Type of verificationQuestions:", typeof fetchedData.verificationQuestions);
      console.log("Is array?:", Array.isArray(fetchedData.verificationQuestions));
    } else {
      console.log("Snapshot does not exist.");
    }

    console.log("Cleaning up test item...");
    await remove(testRef);
    console.log("Cleanup complete.");
  } catch (error) {
    console.error("Firebase Test Error:", error);
  }
};

runTest();
