import { rtdb, auth } from '../config/firebase';
import { ref, push, set, onValue, get, query, orderByChild, equalTo } from 'firebase/database';
import { cloudinaryService } from './cloudinaryService';

const ITEMS_PATH = 'items';

export interface Item {
  id: string;
  title: string;
  description: string;
  type: 'lost' | 'found';
  category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  date?: string;
  imageUrl?: string;
  createdAt: number;
  status: string;
  phoneNumber?: string;
  user: string;
  userId: string;
  verificationQuestions?: { q: string; a: string }[];
}

export const itemService = {
  uploadImage: async (fileUri: string): Promise<string> => {
    return await cloudinaryService.uploadImage(fileUri);
  },

  addItem: async (itemData: Omit<Item, 'id' | 'createdAt' | 'status' | 'imageUrl'> & { image?: string }): Promise<{ success: boolean; id?: string; error?: string }> => {
    console.log('[itemService] addItem started for:', itemData.title);
    const cleanData = { ...itemData };
    let finalImageUrl = '';

    try {
      if (cleanData.image) {
        if (cleanData.image.startsWith('http')) {
          finalImageUrl = cleanData.image;
        } else {
          console.log('[itemService] Attempting Cloudinary upload for local uri:', cleanData.image);
          finalImageUrl = await itemService.uploadImage(cleanData.image);
        }
      }
    } catch (imageError: any) {
      console.error('[itemService] Image upload failed:', imageError);
      return { 
        success: false, 
        error: 'Failed to upload image: ' + (imageError.message || imageError)
      };
    }

    delete cleanData.image;

    try {
      console.log('[itemService] Saving to Realtime Database...');
      const itemsRef = ref(rtdb, ITEMS_PATH);
      const newItemRef = push(itemsRef);
      
      const completeData = {
        ...cleanData,
        imageUrl: finalImageUrl,
        createdAt: Date.now(),
        status: cleanData.type === 'found' ? 'ai-verified' : 'active',
        id: newItemRef.key,
        phoneNumber: itemData.phoneNumber || '',
        user: itemData.user || 'Anonymous User'
      };

      await set(newItemRef, completeData);
      console.log('[itemService] RTDB Save Success! Key:', newItemRef.key);
      return { success: true, id: newItemRef.key || undefined };
    } catch (rtdbError: any) {
      console.error('[itemService] RTDB Save failed:', rtdbError);
      return { success: false, error: 'Database Error: ' + rtdbError.message };
    }
  },

  subscribeToItems: (callback: (items: Item[]) => void) => {
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

  getAllItems: async (): Promise<Item[]> => {
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

  getItemsByUser: async (userId: string): Promise<Item[]> => {
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

  getItemsByType: async (type: 'lost' | 'found'): Promise<Item[]> => {
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

  reportItem: async (itemId: string, itemTitle: string, itemType: string, reason?: string, message?: string) => {
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
    } catch (error: any) {
      console.error('Error reporting item:', error);
      return { success: false, error: error.message };
    }
  }
};
