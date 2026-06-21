import { rtdb, auth } from '../config/firebase';
import { ref, set, push, onValue, get, update, query, orderByChild } from 'firebase/database';
import { aiService } from './aiService';

const CHATS_PATH = 'chats';
const MESSAGES_PATH = 'chatMessages';

export const chatService = {
  getOrCreateChat: async (targetUserId, item) => {
    const currentUserId = auth.currentUser.uid;
    const chatId = [currentUserId, targetUserId].sort().join('_') + '_' + item.id;
    
    const chatRef = ref(rtdb, `${CHATS_PATH}/${chatId}`);
    const snapshot = await get(chatRef);
    
    if (!snapshot.exists()) {
      const newChat = {
        id: chatId,
        participants: {
          [currentUserId]: true,
          [targetUserId]: true
        },
        participantNames: {
          [currentUserId]: auth.currentUser.displayName || 'Me',
          [targetUserId]: item.userName || item.user || 'User'
        },
        itemId: item.id,
        itemTitle: item.title,
        itemImage: item.imageUrl || item.image || '',
        lastMessage: '',
        lastMessageTime: Date.now(),
        createdAt: Date.now(),
      };
      await set(chatRef, newChat);
    }
    
    return chatId;
  },

  sendMessage: async (chatId, text, itemTitle) => {
    try {
      const currentUserId = auth.currentUser.uid;
      
      const chatRef = ref(rtdb, `${CHATS_PATH}/${chatId}`);
      const chatSnapshot = await get(chatRef);
      const chatData = chatSnapshot.val();

      if (chatData?.isBlockedByAI) {
        throw new Error('This chat has been blocked by AI moderation.');
      }

      const partnerId = Object.keys(chatData?.participants || {}).find(uid => uid !== currentUserId) || '';
      if (partnerId) {
        const blockRef1 = ref(rtdb, `blocks/${currentUserId}/${partnerId}`);
        const blockSnap1 = await get(blockRef1);
        if (blockSnap1.exists() && blockSnap1.val() === true) {
          throw new Error('You have blocked this user.');
        }

        const blockRef2 = ref(rtdb, `blocks/${partnerId}/${currentUserId}`);
        const blockSnap2 = await get(blockRef2);
        if (blockSnap2.exists() && blockSnap2.val() === true) {
          throw new Error('This user has blocked you.');
        }
      }

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
          id: newMessageRef.key,
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

      const messagesRef = ref(rtdb, `${MESSAGES_PATH}/${chatId}`);
      const newMessageRef = push(messagesRef);
      const timestamp = Date.now();
      
      const messageData = {
        id: newMessageRef.key,
        text,
        senderId: currentUserId,
        createdAt: timestamp,
      };
      
      await set(newMessageRef, messageData);
      
      await update(chatRef, {
        lastMessage: text,
        lastMessageTime: timestamp,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  listenToMessages: (chatId, callback) => {
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

  listenToChatMetadata: (chatId, callback) => {
    const chatRef = ref(rtdb, `${CHATS_PATH}/${chatId}`);
    return onValue(chatRef, (snapshot) => {
      callback(snapshot.val());
    });
  },

  listenToUserChats: (callback) => {
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
