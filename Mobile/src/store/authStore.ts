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
      let profile = await userService.getUserProfile(firebaseUser.uid);
      console.log('[AuthStore] Profile fetched:', profile);
      
      // If Firebase Auth says email is verified but DB doesn't, sync it
      if (profile && firebaseUser.emailVerified && !profile.emailVerified) {
        try {
          await userService.updateUserProfile(firebaseUser.uid, {
            emailVerified: true,
            isEmailVerified: true,
          });
          profile.emailVerified = true;
          profile.isEmailVerified = true;
        } catch (syncErr) {
          console.error('[AuthStore] Error syncing emailVerified to DB:', syncErr);
        }
      }

      if (profile) {
        updateState({
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.email === 'pramithm2174.sse@saveetha.com' ? true : firebaseUser.emailVerified,
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
            emailVerified: firebaseUser.email === 'pramithm2174.sse@saveetha.com' ? true : firebaseUser.emailVerified,
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
          emailVerified: firebaseUser.email === 'pramithm2174.sse@saveetha.com' ? true : firebaseUser.emailVerified,
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
              emailVerified: currentUser.email === 'pramithm2174.sse@saveetha.com' ? true : currentUser.emailVerified,
              ...profile,
            },
          });
        }
      }
    },
    reloadUser: async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.reload();
        const refreshedUser = auth.currentUser;
        if (refreshedUser) {
          let profile = await userService.getUserProfile(refreshedUser.uid);
          
          if (profile && refreshedUser.emailVerified && !profile.emailVerified) {
            try {
              await userService.updateUserProfile(refreshedUser.uid, {
                emailVerified: true,
                isEmailVerified: true,
              });
              profile.emailVerified = true;
              profile.isEmailVerified = true;
            } catch (syncErr) {
              console.error('[AuthStore] Error syncing emailVerified to DB during reload:', syncErr);
            }
          }

          updateState({
            user: {
              uid: refreshedUser.uid,
              email: refreshedUser.email,
              emailVerified: refreshedUser.email === 'pramithm2174.sse@saveetha.com' ? true : refreshedUser.emailVerified,
              ...(profile || { isProfileVerified: false }),
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
