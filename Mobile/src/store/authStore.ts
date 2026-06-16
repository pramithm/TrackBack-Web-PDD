import { useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { userService, UserProfile } from '../services/userService';

export interface AuthUser extends UserProfile {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
}

let state: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitializing: true,
};

const listeners = new Set<(s: AuthState) => void>();

const updateState = (updates: Partial<AuthState>) => {
  state = { ...state, ...updates };
  listeners.forEach((l) => l(state));
};

// Listen to firebase auth changes
console.log('[AuthStore] Registering onAuthStateChanged listener...');
onAuthStateChanged(auth, async (firebaseUser) => {
  console.log('[AuthStore] onAuthStateChanged fired. User:', firebaseUser?.uid || 'null');
  if (firebaseUser) {
    try {
      console.log('[AuthStore] Fetching profile for UID:', firebaseUser.uid);
      const profile = await userService.getUserProfile(firebaseUser.uid);
      console.log('[AuthStore] Profile fetched:', profile);
      if (profile) {
        updateState({
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            ...profile,
          },
          isAuthenticated: true,
          isInitializing: false,
        });
      } else {
        console.log('[AuthStore] No profile found in DB for UID:', firebaseUser.uid);
        updateState({
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            isProfileVerified: false,
          },
          isAuthenticated: true,
          isInitializing: false,
        });
      }
    } catch (e) {
      console.error('[AuthStore] Error loading user profile:', e);
      updateState({
        user: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          isProfileVerified: false,
        },
        isAuthenticated: true,
        isInitializing: false,
      });
    }
  } else {
    console.log('[AuthStore] No user authenticated.');
    updateState({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
    });
  }
});

export const useAuth = () => {
  const [currState, setCurrState] = useState<AuthState>(state);

  useEffect(() => {
    listeners.add(setCurrState);
    // Sync current state in case it changed before mount
    setCurrState(state);
    return () => {
      listeners.delete(setCurrState);
    };
  }, []);

  return {
    ...currState,
    refreshProfile: async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const profile = await userService.getUserProfile(currentUser.uid);
        if (profile) {
          updateState({
            user: {
              uid: currentUser.uid,
              email: currentUser.email,
              emailVerified: currentUser.emailVerified,
              ...profile,
            },
          });
        }
      }
    },
  };
};
export const logoutUser = async () => {
  await auth.signOut();
};
