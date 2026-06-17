import { initializeApp } from "firebase/app";
// @ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_API_KEY) || "AIzaSyAe3PhCyMJigvguh3oxf1vCX_1MYvfSfMk",
  authDomain: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN) || "trackback-1c73e.firebaseapp.com",
  databaseURL: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_DATABASE_URL) || "https://trackback-1c73e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_PROJECT_ID) || "trackback-1c73e",
  storageBucket: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET) || "trackback-1c73e.firebasestorage.app",
  messagingSenderId: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) || "792883031609",
  appId: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_APP_ID) || "1:792883031609:web:fe36fa5823b2b91ed5a7e8",
  measurementId: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID) || "G-S6WNMTSZC0"
};

const app = initializeApp(firebaseConfig);

let firebaseAuth;

if (Platform.OS === 'web') {
  firebaseAuth = getAuth(app);
} else {
  // @ts-ignore
  if (typeof getReactNativePersistence === 'function') {
    firebaseAuth = initializeAuth(app, {
      // @ts-ignore
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } else {
    firebaseAuth = getAuth(app);
  }
}

export const auth = firebaseAuth;
export const rtdb = getDatabase(app);

export default app;
