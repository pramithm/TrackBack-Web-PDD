import { rtdb, auth } from '../config/firebase';
import { ref, push, set, get, query, orderByChild, equalTo, onValue, update } from 'firebase/database';
import { Item } from './itemService';

const REQUESTS_PATH = 'requests';

export interface ClaimRequest {
  id: string;
  itemId: string;
  itemTitle: string;
  itemImage: string;
  finderId: string;
  claimerId: string;
  claimerName: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  updatedAt?: number;
}

export const requestService = {
  sendClaimRequest: async (item: Item, message: string = ''): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const requestsRef = ref(rtdb, REQUESTS_PATH);
      const newRequestRef = push(requestsRef);

      const requestData: ClaimRequest = {
        id: newRequestRef.key || '',
        itemId: item.id,
        itemTitle: item.title,
        itemImage: item.imageUrl || '',
        finderId: item.userId,
        claimerId: user.uid,
        claimerName: user.displayName || 'User',
        message: message,
        status: 'pending',
        createdAt: Date.now(),
      };

      await set(newRequestRef, requestData);
      return { success: true, id: newRequestRef.key || undefined };
    } catch (error: any) {
      console.error('Error sending claim request: ', error);
      return { success: false, error: error.message };
    }
  },

  getRequests: async (type: 'incoming' | 'outgoing' = 'incoming'): Promise<ClaimRequest[]> => {
    try {
      const user = auth.currentUser;
      if (!user) return [];

      const field = type === 'incoming' ? 'finderId' : 'claimerId';
      const requestsRef = ref(rtdb, REQUESTS_PATH);
      const userRequestsQuery = query(requestsRef, orderByChild(field), equalTo(user.uid));
      
      const snapshot = await get(userRequestsQuery);
      const data = snapshot.val();
      
      if (!data) return [];
      
      return Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error fetching requests: ', error);
      return [];
    }
  },

  listenToRequests: (type: 'incoming' | 'outgoing' = 'incoming', callback: (requests: ClaimRequest[]) => void) => {
    const user = auth.currentUser;
    if (!user) return () => {};

    const field = type === 'incoming' ? 'finderId' : 'claimerId';
    const requestsRef = ref(rtdb, REQUESTS_PATH);
    const userRequestsQuery = query(requestsRef, orderByChild(field), equalTo(user.uid));

    return onValue(userRequestsQuery, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }
      
      const requests = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a, b) => b.createdAt - a.createdAt);
      
      callback(requests);
    });
  },

  updateRequestStatus: async (requestId: string, status: 'accepted' | 'rejected'): Promise<{ success: boolean; error?: string }> => {
    try {
      const requestRef = ref(rtdb, `${REQUESTS_PATH}/${requestId}`);
      await update(requestRef, { 
        status,
        updatedAt: Date.now() 
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error updating request status: ', error);
      return { success: false, error: error.message };
    }
  },

  getClaimStatus: async (itemId: string): Promise<'pending' | 'accepted' | 'rejected' | null> => {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      const requestsRef = ref(rtdb, REQUESTS_PATH);
      const itemRequestsQuery = query(requestsRef, orderByChild('itemId'), equalTo(itemId));
      
      const snapshot = await get(itemRequestsQuery);
      const data = snapshot.val();
      
      if (!data) return null;
      
      const userRequest = Object.values(data).find((req: any) => req.claimerId === user.uid) as any;
      return userRequest ? userRequest.status : null;
    } catch (error) {
      console.error('Error checking claim status: ', error);
      return null;
    }
  },
  
  clearRequests: async (requestIds: string[]): Promise<{ success: boolean; error?: string }> => {
    try {
      const updates: Record<string, null> = {};
      requestIds.forEach(id => {
        updates[`${REQUESTS_PATH}/${id}`] = null;
      });
      await update(ref(rtdb), updates);
      return { success: true };
    } catch (error: any) {
      console.error('Error clearing requests: ', error);
      return { success: false, error: error.message };
    }
  }
};
