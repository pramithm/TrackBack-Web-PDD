import { rtdb, auth } from '../config/firebase';
import { ref, set, get, update, push, onValue } from 'firebase/database';
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
  },

  reportUser: async (reportedUid, reportedName, reason, details = '') => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    let reporterName = 'Anonymous User';
    try {
      const reporterProfileRef = ref(rtdb, `${USERS_PATH}/${user.uid}`);
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
      reporterId: user.uid,
      reporterName: reporterName,
      reportedId: reportedUid,
      reportedName: reportedName || 'Reported User',
      reason: reason,
      details: details,
      timestamp: timestamp,
      status: 'Pending' // 'Pending' | 'Reviewed' | 'Resolved'
    });
    return true;
  },

  reportItem: async (itemId, itemTitle, reason, details = '') => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    let reporterName = 'Anonymous User';
    try {
      const reporterProfileRef = ref(rtdb, `${USERS_PATH}/${user.uid}`);
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
      reporterId: user.uid,
      reporterName: reporterName,
      reportedId: itemId,
      reportedName: `Item: ${itemTitle}`,
      reason: reason,
      details: details,
      timestamp: timestamp,
      status: 'Pending'
    });
    return true;
  },

  listenToReports: (callback) => {
    const reportsRef = ref(rtdb, 'reports');
    return onValue(reportsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }
      const reports = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a, b) => b.timestamp - a.timestamp);
      callback(reports);
    });
  },

  updateReportStatus: async (reportId, status) => {
    const reportRef = ref(rtdb, `reports/${reportId}`);
    await update(reportRef, {
      status,
      updatedAt: Date.now()
    });
    return true;
  }
};
