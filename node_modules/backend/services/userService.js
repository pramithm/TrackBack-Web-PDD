import { rtdb, auth } from '../config/firebase';
import { ref, set, get, update } from 'firebase/database';
import { cloudinaryService } from './cloudinaryService';

const USERS_PATH = 'users';

export const userService = {
  getUserProfile: async (uid) => {
    try {
      const userRef = ref(rtdb, `${USERS_PATH}/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        return { id: snapshot.key, ...snapshot.val() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  },

  updateUserProfile: async (uid, data) => {
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

  uploadProfilePicture: async (uid, file) => {
    try {
      const downloadURL = await cloudinaryService.uploadImage(file);
      const userRef = ref(rtdb, `${USERS_PATH}/${uid}`);
      await update(userRef, {
        photoURL: downloadURL
      });
      return downloadURL;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  },

  blockUser: async (targetUid) => {
    const user = auth.currentUser;
    if (!user) return;
    const blockRef = ref(rtdb, `blocks/${user.uid}/${targetUid}`);
    await set(blockRef, true);
  },

  unblockUser: async (targetUid) => {
    const user = auth.currentUser;
    if (!user) return;
    const blockRef = ref(rtdb, `blocks/${user.uid}/${targetUid}`);
    await set(blockRef, null);
  },

  isUserBlocked: async (targetUid) => {
    const user = auth.currentUser;
    if (!user) return false;
    const blockRef = ref(rtdb, `blocks/${user.uid}/${targetUid}`);
    const snapshot = await get(blockRef);
    return snapshot.exists();
  }
};
