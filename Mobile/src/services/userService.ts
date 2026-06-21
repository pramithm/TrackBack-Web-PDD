import { rtdb, auth } from '../config/firebase';
import { ref, set, get, update, push } from 'firebase/database';
import { cloudinaryService } from './cloudinaryService';

const USERS_PATH = 'users';

export interface UserProfile {
  id?: string;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  college?: string;
  photoURL?: string;
  isProfileVerified?: boolean;
  isEmailVerified?: boolean;
  emailVerified?: boolean;
  isPhoneVerified?: boolean;
  email?: string | null;
  age?: number;
  gender?: string;
  location?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const userService = {
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const userRef = ref(rtdb, `${USERS_PATH}/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        return { id: snapshot.key || uid, ...snapshot.val() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  },

  updateUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<boolean> => {
    try {
      const userRef = ref(rtdb, `${USERS_PATH}/${uid}`);
      await update(userRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  uploadProfilePicture: async (uid: string, fileUri: string): Promise<string> => {
    try {
      const downloadURL = await cloudinaryService.uploadImage(fileUri);
      if (downloadURL) {
        const userRef = ref(rtdb, `${USERS_PATH}/${uid}`);
        await update(userRef, {
          photoURL: downloadURL
        });
      }
      return downloadURL;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  },

  reportUser: async (reportedUid: string, reportedName: string, reason: string, details: string = ''): Promise<boolean> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      let reporterName = 'Anonymous User';
      try {
        const reporterProfileRef = ref(rtdb, `${USERS_PATH}/${currentUser.uid}`);
        const reporterSnap = await get(reporterProfileRef);
        if (reporterSnap.exists()) {
          reporterName = reporterSnap.val().name || 'User';
        }
      } catch (e) {
        console.error('Error fetching reporter details:', e);
      }

      const reportsRef = ref(rtdb, 'reports');
      const newReportRef = push(reportsRef);
      const timestamp = Date.now();

      await set(newReportRef, {
        id: newReportRef.key,
        reporterId: currentUser.uid,
        reporterName: reporterName,
        reportedId: reportedUid,
        reportedName: reportedName || 'Reported User',
        reason: reason,
        details: details,
        timestamp: timestamp,
        status: 'Pending'
      });
      return true;
    } catch (error) {
      console.error('Error reporting user:', error);
      throw error;
    }
  }
};
