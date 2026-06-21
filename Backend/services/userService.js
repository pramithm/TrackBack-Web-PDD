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
    const reportedItemsRef = ref(rtdb, 'reportedItems');
    
    let reportsData = {};
    let reportedItemsData = {};
    
    const triggerCallback = () => {
      const standardReports = Object.keys(reportsData).map(key => ({
        ...reportsData[key],
        id: key
      }));
      
      const itemReports = [];
      Object.keys(reportedItemsData).forEach(itemId => {
        const itemVal = reportedItemsData[itemId];
        if (itemVal && itemVal.reports) {
          Object.keys(itemVal.reports).forEach(reporterId => {
            const reportVal = itemVal.reports[reporterId];
            itemReports.push({
              id: `reportedItems|${itemId}|${reporterId}`,
              reporterId: reporterId,
              reporterName: reportVal.reporterName || 'Anonymous User',
              reportedId: itemId,
              reportedName: `Item: ${itemVal.itemTitle || 'Unknown Item'}`,
              reason: reportVal.reason || 'Not specified',
              details: reportVal.message || reportVal.details || '',
              timestamp: reportVal.timestamp || Date.now(),
              status: reportVal.status || 'Pending'
            });
          });
        }
      });
      
      const allReports = [...standardReports, ...itemReports].sort((a, b) => b.timestamp - a.timestamp);
      callback(allReports);
    };

    const unsubReports = onValue(reportsRef, (snapshot) => {
      reportsData = snapshot.val() || {};
      triggerCallback();
    });

    const unsubReportedItems = onValue(reportedItemsRef, (snapshot) => {
      reportedItemsData = snapshot.val() || {};
      triggerCallback();
    });

    return () => {
      unsubReports();
      unsubReportedItems();
    };
  },

  updateReportStatus: async (reportId, status) => {
    try {
      if (typeof reportId === 'string' && reportId.startsWith('reportedItems|')) {
        const parts = reportId.split('|');
        if (parts.length === 3) {
          const itemId = parts[1];
          const reporterId = parts[2];
          const reportRef = ref(rtdb, `reportedItems/${itemId}/reports/${reporterId}`);
          await update(reportRef, {
            status,
            updatedAt: Date.now()
          });
          return true;
        }
      }
      const reportRef = ref(rtdb, `reports/${reportId}`);
      await update(reportRef, {
        status,
        updatedAt: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Error updating report status:', error);
      throw error;
    }
  }
};
