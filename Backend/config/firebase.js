import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAe3PhCyMJigvguh3oxf1vCX_1MYvfSfMk",
  authDomain: "trackback-1c73e.firebaseapp.com",
  databaseURL: "https://trackback-1c73e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "trackback-1c73e",
  storageBucket: "trackback-1c73e.firebasestorage.app",
  messagingSenderId: "792883031609",
  appId: "1:792883031609:web:fe36fa5823b2b91ed5a7e8",
  measurementId: "G-S6WNMTSZC0"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const rtdb = getDatabase(app);

export default app;
