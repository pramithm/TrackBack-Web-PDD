import { initializeApp } from "firebase/app";
// @ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

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
