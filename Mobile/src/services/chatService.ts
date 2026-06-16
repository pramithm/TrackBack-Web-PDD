import { rtdb, auth } from '../config/firebase';
import { ref, set, push, onValue, get, update } from 'firebase/database';
import { aiService } from './aiService';
import { Item } from './itemService';

const CHATS_PATH = 'chats';
const MESSAGES_PATH = 'chatMessages';

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: number;
  isSystem?: boolean;
  seen?: boolean;
}

export interface ChatMetadata {
  id: string;
  participants: Record<string, boolean>;
  participantNames: Record<string, string>;
  itemId: string;
  itemTitle: string;
  itemImage: string;
  lastMessage: string;
  lastMessageTime: number;
  createdAt: number;
  warningCount?: number;
  isBlockedByAI?: boolean;
  unreadCount?: Record<string, number>;
}

export const chatService = {
  getOrCreateChat: async (targetUserId: string, item: Item): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const currentUserId = user.uid;
    const chatId = [currentUserId, targetUserId].sort().join('_') + '_' + item.id;
    
    const chatRef = ref(rtdb, `${CHATS_PATH}/${chatId}`);
    const snapshot = await get(chatRef);
    
    if (!snapshot.exists()) {
      const newChat: ChatMetadata = {
        id: chatId,
        participants: {
          [currentUserId]: true,
          [targetUserId]: true
        },
        participantNames: {
          [currentUserId]: user.displayName || 'Me',
          [targetUserId]: item.user || 'User'
        },
        itemId: item.id,
        itemTitle: item.title,
        itemImage: item.imageUrl || '',
        lastMessage: '',
        lastMessageTime: Date.now(),
        createdAt: Date.now(),
      };
      await set(chatRef, newChat);
    }
    
    return chatId;
  },

  sendMessage: async (chatId: string, text: string, itemTitle?: string): Promise<void> => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const currentUserId = user.uid;
      
      const chatRef = ref(rtdb, `${CHATS_PATH}/${chatId}`);
      const chatSnapshot = await get(chatRef);
      const chatData = chatSnapshot.val() as ChatMetadata | null;

      if (chatData?.isBlockedByAI) {
        throw new Error('This chat has been blocked by AI moderation.');
      }

      // Moderate chat message using Gemini AI
      const analysis = await aiService.analyzeChatMessage(text, itemTitle || chatData?.itemTitle || "the item");

      if (!analysis.isAppropriate) {
        const currentWarnings = chatData?.warningCount || 0;
        const newWarnings = currentWarnings + 1;
        const isNowBlocked = newWarnings >= 5;

        const messagesRef = ref(rtdb, `${MESSAGES_PATH}/${chatId}`);
        const newMessageRef = push(messagesRef);
        const timestamp = Date.now();
        
        const systemMessage = isNowBlocked 
          ? `🚫 SYSTEM: Chat permanently locked. 5 warnings reached for abusive/off-topic behavior.`
          : `⚠️ SYSTEM WARNING (${newWarnings}/5): A message was blocked for being abusive or off-topic. Reason: ${analysis.reason}. Please use the app correctly.`;

        await set(newMessageRef, {
          id: newMessageRef.key || '',
          text: systemMessage,
          senderId: 'SYSTEM',
          createdAt: timestamp,
          isSystem: true
        });

        await update(chatRef, {
          warningCount: newWarnings,
          isBlockedByAI: isNowBlocked,
          lastMessage: systemMessage,
          lastMessageTime: timestamp,
        });

        throw new Error(isNowBlocked ? 'Chat permanently locked.' : `Message blocked by AI: ${analysis.reason}`);
      }

      const partnerId = Object.keys(chatData?.participants || {}).find(uid => uid !== currentUserId) || '';

      const messagesRef = ref(rtdb, `${MESSAGES_PATH}/${chatId}`);
      const newMessageRef = push(messagesRef);
      const timestamp = Date.now();
      
      const messageData: ChatMessage = {
        id: newMessageRef.key || '',
        text,
        senderId: currentUserId,
        createdAt: timestamp,
        seen: false
      };
      
      await set(newMessageRef, messageData);
      
      const partnerUnreadCount = (chatData?.unreadCount && chatData.unreadCount[partnerId]) || 0;

      await update(chatRef, {
        lastMessage: text,
        lastMessageTime: timestamp,
        [`unreadCount/${partnerId}`]: partnerUnreadCount + 1
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  clearUnreadCount: async (chatId: string, userId: string): Promise<void> => {
    try {
      const chatRef = ref(rtdb, `${CHATS_PATH}/${chatId}`);
      await update(chatRef, {
        [`unreadCount/${userId}`]: 0
      });
    } catch (error) {
      console.error('Error clearing unread count:', error);
    }
  },

  markMessagesAsSeen: async (chatId: string, partnerId: string): Promise<void> => {
    try {
      const messagesRef = ref(rtdb, `${MESSAGES_PATH}/${chatId}`);
      const snapshot = await get(messagesRef);
      const data = snapshot.val();
      if (!data) return;

      const updates: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        const msg = data[key];
        if (msg.senderId === partnerId && !msg.seen) {
          updates[`${key}/seen`] = true;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(messagesRef, updates);
      }
    } catch (error) {
      console.error('Error marking messages as seen:', error);
    }
  },

  listenToMessages: (chatId: string, callback: (messages: ChatMessage[]) => void) => {
    const messagesRef = ref(rtdb, `${MESSAGES_PATH}/${chatId}`);
    return onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }
      
      const messages = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      })).sort((a, b) => a.createdAt - b.createdAt);
      
      callback(messages);
    });
  },

  listenToChatMetadata: (chatId: string, callback: (metadata: ChatMetadata | null) => void) => {
    const chatRef = ref(rtdb, `${CHATS_PATH}/${chatId}`);
    return onValue(chatRef, (snapshot) => {
      callback(snapshot.val());
    });
  },

  listenToUserChats: (callback: (chats: ChatMetadata[]) => void) => {
    const user = auth.currentUser;
    if (!user) return () => {};
    const currentUserId = user.uid;
    const chatsRef = ref(rtdb, CHATS_PATH);
    
    return onValue(chatsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }
      
      const chats = Object.keys(data)
        .filter(key => data[key].participants && data[key].participants[currentUserId])
        .map(key => ({
          ...data[key],
          id: key
        }))
        .sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        
      callback(chats);
    });
  }
};
