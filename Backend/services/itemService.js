import { rtdb, auth } from '../config/firebase';
import { ref, push, set, onValue, get, query, orderByChild, equalTo } from 'firebase/database';
import { cloudinaryService } from './cloudinaryService';

const ITEMS_PATH = 'items';

export const itemService = {
  uploadImage: async (file) => {
    return await cloudinaryService.uploadImage(file);
  },

  addItem: async (itemData) => {
    console.log('addItem (RTDB) started for:', itemData.title);
    const cleanData = { ...itemData };
    let finalImageUrl = '';

    try {
      if (cleanData.image) {
        if (typeof cleanData.image === 'string' && cleanData.image.startsWith('http')) {
          finalImageUrl = cleanData.image;
        } else {
          console.log('Attempting Cloudinary upload...');
          finalImageUrl = await itemService.uploadImage(cleanData.image);
        }
      }
    } catch (imageError) {
      console.error('IMAGE UPLOAD FAILED:', imageError);
      return { 
        success: false, 
        error: 'Failed to upload image. Please check your internet connection and try again.' 
      };
    }

    delete cleanData.image;

    try {
      console.log('Saving to Realtime Database...');
      const itemsRef = ref(rtdb, ITEMS_PATH);
      const newItemRef = push(itemsRef);
      
      const completeData = {
        ...cleanData,
        imageUrl: finalImageUrl,
        createdAt: Date.now(),
        status: 'ai-verified',
        id: newItemRef.key,
        phoneNumber: itemData.phoneNumber || '',
        user: itemData.user || 'Anonymous User'
      };

      await set(newItemRef, completeData);
      console.log('RTDB Save Success! Key:', newItemRef.key);
      return { success: true, id: newItemRef.key };
    } catch (rtdbError) {
      console.error('RTDB SAVE FAILED:', rtdbError);
      return { success: false, error: 'Database Error: ' + rtdbError.message };
    }
  },

  subscribeToItems: (callback) => {
    const itemsRef = ref(rtdb, ITEMS_PATH);
    return onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }
      
      const items = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a, b) => b.createdAt - a.createdAt);
      
      callback(items);
    }, (error) => {
      console.error('Error in items subscription: ', error);
    });
  },

  getAllItems: async () => {
    try {
      const itemsRef = ref(rtdb, ITEMS_PATH);
      const snapshot = await get(itemsRef);
      const data = snapshot.val();
      
      if (!data) return [];
      
      return Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error fetching items: ', error);
      return [];
    }
  },

  getItemsByUser: async (userId) => {
    try {
      const itemsRef = ref(rtdb, ITEMS_PATH);
      const userItemsQuery = query(itemsRef, orderByChild('userId'), equalTo(userId));
      const snapshot = await get(userItemsQuery);
      const data = snapshot.val();
      
      if (!data) return [];
      
      return Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error fetching items by user: ', error);
      return [];
    }
  },

  getItemsByType: async (type) => {
    try {
      const itemsRef = ref(rtdb, ITEMS_PATH);
      const typeQuery = query(itemsRef, orderByChild('type'), equalTo(type));
      const snapshot = await get(typeQuery);
      const data = snapshot.val();
      
      if (!data) return [];
      
      return Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error fetching items by type: ', error);
      return [];
    }
  },

  reportItem: async (itemId, itemTitle, itemType, reason, message) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const userRef = ref(rtdb, `users/${currentUser.uid}`);
      const userSnap = await get(userRef);
      const userData = userSnap.exists() ? userSnap.val() : {};
      const reporterName = userData.name || userData.displayName || currentUser.displayName || 'Anonymous User';

      await set(ref(rtdb, `reportedItems/${itemId}/itemId`), itemId);
      await set(ref(rtdb, `reportedItems/${itemId}/itemTitle`), itemTitle);
      await set(ref(rtdb, `reportedItems/${itemId}/itemType`), itemType);
      await set(ref(rtdb, `reportedItems/${itemId}/reports/${currentUser.uid}`), {
        reporterName,
        timestamp: Date.now(),
        reason: reason || 'Not specified',
        message: message || ''
      });

      return { success: true };
    } catch (error) {
      console.error('Error reporting item:', error);
      return { success: false, error: error.message };
    }
  }
};
