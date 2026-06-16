import { rtdb } from '../config/firebase';
import { ref, set, get, update } from 'firebase/database';
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
  email?: string | null;
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
  }
};
