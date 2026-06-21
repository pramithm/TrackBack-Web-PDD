import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/store/authStore';
import { chatService, ChatMessage, ChatMetadata } from '@/src/services/chatService';
import { userService } from '@/src/services/userService';
import { rtdb } from '@/src/config/firebase';
import { ref, onValue, set } from 'firebase/database';
import { connectivity } from '@/src/services/connectivity';
import { errorHelper } from '@/src/services/errorHelper';

export default function ChatDetailScreen() {
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [metadata, setMetadata] = useState<ChatMetadata | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isPartnerBlocked, setIsPartnerBlocked] = useState(false);
  const [amIBlocked, setAmIBlocked] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Subscribe to chat metadata & messages
  useEffect(() => {
    if (!chatId) return;

    console.log('[ChatDetail] Subscribing to chat details for:', chatId);
    
    // Listen to metadata
    const unsubMeta = chatService.listenToChatMetadata(chatId, (data) => {
      setMetadata(data);
    });

    // Listen to message list
    const unsubMessages = chatService.listenToMessages(chatId, (fetchedMessages) => {
      setMessages(fetchedMessages);
      setLoading(false);
      
      // Auto scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      unsubMeta();
      unsubMessages();
    };
  }, [chatId]);

  // If this chat is in the cleared chats list, restore/unclear it because the user is currently viewing it.
  useEffect(() => {
    if (chatId && user) {
      AsyncStorage.getItem(`clearedChats_${user.uid}`)
        .then((stored) => {
          if (stored) {
            try {
              const currentMap = JSON.parse(stored);
              if (currentMap[chatId]) {
                delete currentMap[chatId];
                AsyncStorage.setItem(`clearedChats_${user.uid}`, JSON.stringify(currentMap));
              }
            } catch (e) {
              console.error('Error clearing storage key in detail:', e);
            }
          }
        })
        .catch((e) => console.log('Error reading storage in detail:', e));
    }
  }, [chatId, user]);

  // Fetch partner profile dynamically
  useEffect(() => {
    if (metadata && user) {
      const partnerId = Object.keys(metadata.participants).find(uid => uid !== user.uid) || '';
      if (partnerId) {
        userService.getUserProfile(partnerId)
          .then((profile) => {
            setPartnerProfile(profile);
          })
          .catch((err) => {
            console.error('[ChatDetail] Error loading partner profile:', err);
          });
      }
    }
  }, [metadata, user]);

  // Subscribe to block statuses in real time
  useEffect(() => {
    if (!metadata || !user) return;
    const partnerId = Object.keys(metadata.participants).find(uid => uid !== user.uid) || '';
    if (!partnerId) return;

    const blockRef1 = ref(rtdb, `blocks/${user.uid}/${partnerId}`);
    const unsub1 = onValue(blockRef1, (snap) => {
      setIsPartnerBlocked(snap.val() === true);
    });

    const blockRef2 = ref(rtdb, `blocks/${partnerId}/${user.uid}`);
    const unsub2 = onValue(blockRef2, (snap) => {
      setAmIBlocked(snap.val() === true);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [metadata, user]);

  // Handle read receipts & clear unread count
  useEffect(() => {
    if (!chatId || !user) return;

    // Clear current user's unread count
    chatService.clearUnreadCount(chatId, user.uid);

    if (metadata) {
      const partnerId = Object.keys(metadata.participants).find(uid => uid !== user.uid) || '';
      if (partnerId) {
        chatService.markMessagesAsSeen(chatId, partnerId);
      }
    }
  }, [chatId, user, metadata, messages.length]);

  const handleSendMessage = async () => {
    if (!chatId || !inputText.trim() || !metadata) return;

    const isOnline = await connectivity.checkOnline();
    if (!isOnline) {
      Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection.');
      return;
    }

    setSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    try {
      await chatService.sendMessage(chatId, textToSend, metadata.itemTitle);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      console.error('[ChatDetail] Error sending message:', err);
      const friendlyMsg = errorHelper.getFriendlyMessage(err);
      Alert.alert('Message Failed', friendlyMsg);
      setInputText(textToSend); // Restore text on failure so user doesn't lose it
    } finally {
      setSending(false);
    }
  };

  const getPartnerName = () => {
    if (partnerProfile?.name) return partnerProfile.name;
    if (!metadata || !user) return 'User';
    const partnerId = Object.keys(metadata.participants).find(uid => uid !== user.uid) || '';
    return metadata.participantNames[partnerId] || 'User';
  };

  const isPartnerOnline = () => {
    // Return true by default as offline indicator isn't actively set in DB
    return partnerProfile?.isOnline !== false;
  };

  const isSameDay = (t1: number, t2: number) => {
    const d1 = new Date(t1);
    const d2 = new Date(t2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const getDateSeparatorText = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const renderMessageBubble = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.senderId === user?.uid;
    const isSystem = item.isSystem || item.senderId === 'SYSTEM';

    // Date separator logic
    const showDateSeparator = index === 0 || !isSameDay(messages[index - 1].createdAt, item.createdAt);

    if (isSystem) {
      const isLock = item.text.includes('locked') || item.text.includes('locked.');
      return (
        <View key={item.id}>
          {showDateSeparator && (
            <View style={styles.dateSeparatorWrapper}>
              <View style={styles.dateSeparatorLine} />
              <Text style={styles.dateSeparatorText}>{getDateSeparatorText(item.createdAt)}</Text>
              <View style={styles.dateSeparatorLine} />
            </View>
          )}
          <View style={[styles.systemMessageWrapper, isLock ? styles.systemLock : styles.systemWarning]}>
            <Ionicons 
              name={isLock ? "ban-outline" : "warning-outline"} 
              size={18} 
              color={isLock ? "#C53030" : "#D69E2E"} 
              style={{ marginRight: 8 }} 
            />
            <Text style={[styles.systemMessageText, { color: isLock ? "#9B2C2C" : "#975A16" }]}>
              {item.text}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View key={item.id}>
        {showDateSeparator && (
          <View style={styles.dateSeparatorWrapper}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>{getDateSeparatorText(item.createdAt)}</Text>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}
        
        <View style={[styles.messageBubbleWrapper, isMe ? styles.messageMe : styles.messagePartner]}>
          <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubblePartner]}>
            <Text style={[styles.messageText, isMe ? styles.textMe : styles.textPartner]}>
              {item.text}
            </Text>
            
            {/* Timestamp & Read receipts inline under the text */}
            <View style={styles.bubbleFooter}>
              <Text style={[styles.messageTime, isMe ? styles.timeMe : styles.timePartner]}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {isMe && (
                <View style={styles.receiptWrapper}>
                  {item.seen ? (
                    <Ionicons name="checkmark-done" size={15} color="#3B82F6" />
                  ) : (
                    <Ionicons name="checkmark" size={15} color="#FCA5A5" />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyChatState = () => {
    const photo = metadata?.itemImage || null;
    const name = metadata?.itemTitle || 'Item';
    
    return (
      <ScrollView contentContainerStyle={styles.emptyChatContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.emptyChatCard}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.emptyChatAvatar} />
          ) : (
            <View style={styles.emptyChatAvatarFallback}>
              <Text style={styles.emptyChatLetter}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          
          <Text style={styles.emptyChatTitle}>Start a conversation</Text>
          <Text style={styles.emptyChatSubtitle}>
            This chat was created after a successful claim request. Discuss securely to plan meeting up and returning the item safely.
          </Text>
        </View>
      </ScrollView>
    );
  };

  const handleShowOptions = () => {
    if (!metadata || !user) return;
    const partnerId = Object.keys(metadata.participants).find(uid => uid !== user.uid) || '';
    if (!partnerId) return;

    Alert.alert(
      'Chat Options',
      'Choose an action below:',
      [
        {
          text: isPartnerBlocked ? 'Unblock User' : 'Block User',
          onPress: handleBlockToggle,
        },
        {
          text: 'Report User',
          onPress: handleReportUser,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        }
      ]
    );
  };

  const handleBlockToggle = async () => {
    if (!metadata || !user) return;
    const partnerId = Object.keys(metadata.participants).find(uid => uid !== user.uid) || '';
    if (!partnerId) return;

    const isOnline = await connectivity.checkOnline();
    if (!isOnline) {
      Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection.');
      return;
    }

    try {
      if (isPartnerBlocked) {
        const blockRef = ref(rtdb, `blocks/${user.uid}/${partnerId}`);
        await set(blockRef, null);
        Alert.alert('Success', 'User unblocked successfully.');
      } else {
        Alert.alert(
          'Block User',
          `Are you sure you want to block ${getPartnerName()}? You will not be able to send or receive messages.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: async () => {
                const isOnlineStill = await connectivity.checkOnline();
                if (!isOnlineStill) {
                  Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection.');
                  return;
                }
                try {
                  const blockRef = ref(rtdb, `blocks/${user.uid}/${partnerId}`);
                  await set(blockRef, true);
                  Alert.alert('Success', 'User blocked successfully.');
                } catch (err: any) {
                  console.error(err);
                  const friendlyMsg = errorHelper.getFriendlyMessage(err);
                  Alert.alert('Error', 'Failed to block user: ' + friendlyMsg);
                }
              }
            }
          ]
        );
      }
    } catch (err: any) {
      console.error(err);
      const friendlyMsg = errorHelper.getFriendlyMessage(err);
      Alert.alert('Error', 'Failed to update block state: ' + friendlyMsg);
    }
  };

  const handleReportUser = () => {
    if (!metadata || !user) return;
    const partnerId = Object.keys(metadata.participants).find(uid => uid !== user.uid) || '';
    if (!partnerId) return;

    Alert.alert(
      'Report User',
      'Select a reason for reporting this user:',
      [
        {
          text: 'Spam listings',
          onPress: () => submitUserReport('Spam listings'),
        },
        {
          text: 'Offensive language/Abuse',
          onPress: () => submitUserReport('Offensive language/Abuse'),
        },
        {
          text: 'Incorrect information',
          onPress: () => submitUserReport('Incorrect information'),
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const submitUserReport = async (reason: string) => {
    if (!metadata || !user) return;
    const partnerId = Object.keys(metadata.participants).find(uid => uid !== user.uid) || '';
    if (!partnerId) return;

    const isOnline = await connectivity.checkOnline();
    if (!isOnline) {
      Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection.');
      return;
    }

    try {
      const partnerName = getPartnerName();
      await userService.reportUser(partnerId, partnerName, reason, 'Reported from chat detail screen.');
      Alert.alert('Success', 'Thank you. We have received your report.');
    } catch (err: any) {
      console.error(err);
      const friendlyMsg = errorHelper.getFriendlyMessage(err);
      Alert.alert('Error', 'Failed to report user: ' + friendlyMsg);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#345C72" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Premium Chat Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#345C72" />
        </TouchableOpacity>

        {/* Dynamic Item avatar for privacy */}
        {metadata?.itemImage ? (
          <Image source={{ uri: metadata.itemImage }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarFallback}>
            <Text style={styles.headerAvatarLetter}>{(metadata?.itemTitle || 'I').charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerPartnerName} numberOfLines={1}>{metadata?.itemTitle || 'Chat'}</Text>
          
          {/* Online status indicator */}
          <View style={styles.statusIndicatorRow}>
            <View style={[styles.statusDot, isPartnerOnline() ? styles.statusDotOnline : styles.statusDotOffline]} />
            <Text style={styles.statusText}>{isPartnerOnline() ? 'Online' : 'Offline'}</Text>
          </View>
        </View>

        {/* Small floating preview badge for item details on the right */}
        {metadata?.itemImage ? (
          <TouchableOpacity style={styles.headerItemDetails} onPress={() => router.push(`/details/${metadata.itemId}` as any)}>
            <Image source={{ uri: metadata.itemImage }} style={styles.headerThumb} contentFit="cover" />
          </TouchableOpacity>
        ) : null}

        {/* Options ellipsis-vertical button */}
        {metadata && (
          <TouchableOpacity style={{ padding: 8, marginLeft: 4 }} onPress={handleShowOptions}>
            <Ionicons name="ellipsis-vertical" size={22} color="#345C72" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tuned KeyboardAvoidingView for smooth inputs */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 95 : 0}
      >
        {/* Chat Feed */}
        {messages.length === 0 ? (
          renderEmptyChatState()
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageBubble}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.feedContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Input Bar or Block Banner */}
        {metadata?.isBlockedByAI ? (
          <View style={styles.blockedBanner}>
            <Ionicons name="ban-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.blockedBannerText}>
              This chat is permanently locked due to moderation violations.
            </Text>
          </View>
        ) : (isPartnerBlocked || amIBlocked) ? (
          <View style={[styles.blockedBanner, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="shield-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={[styles.blockedBannerText, { color: '#EF4444' }]}>
              {isPartnerBlocked 
                ? 'You have blocked this user. Unblock them to message.' 
                : 'This user has blocked you. Messaging is disabled.'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Discuss returning the item..."
              placeholderTextColor="#8E9CA3"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F5FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F5FA',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3EEF5',
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E6F0F6',
    marginRight: 10,
  },
  headerAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0ECF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#345C72',
  },
  headerAvatarLetter: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#345C72',
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerPartnerName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#2B353A',
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusDotOnline: {
    backgroundColor: '#10B981',
  },
  statusDotOffline: {
    backgroundColor: '#8E9CA3',
  },
  statusText: {
    fontSize: 11,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  headerItemDetails: {
    padding: 4,
  },
  headerThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E6F0F6',
    borderWidth: 1,
    borderColor: '#D3E2EC',
  },
  feedContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 14,
    width: '100%',
  },
  messageMe: {
    justifyContent: 'flex-end',
  },
  messagePartner: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: '#345C72',
    borderBottomRightRadius: 4,
  },
  bubblePartner: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#D3E2EC',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  textMe: {
    color: '#FFFFFF',
  },
  textPartner: {
    color: '#2B353A',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  timeMe: {
    color: '#DDE8F0',
  },
  timePartner: {
    color: '#8E9CA3',
  },
  receiptWrapper: {
    alignSelf: 'flex-end',
  },
  systemMessageWrapper: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    marginVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  systemWarning: {
    backgroundColor: '#FFF4D8',
    borderColor: '#E3EEF5',
  },
  systemLock: {
    backgroundColor: '#FFE2E2',
    borderColor: '#FFE2E2',
  },
  systemMessageText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    flex: 1,
    lineHeight: 18,
  },
  dateSeparatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(52, 92, 114, 0.08)',
  },
  dateSeparatorText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#8E9CA3',
    paddingHorizontal: 12,
    backgroundColor: '#F0F5FA',
  },
  emptyChatContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyChatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#D3E2EC',
  },
  emptyChatAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  emptyChatAvatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0ECF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#345C72',
  },
  emptyChatLetter: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#345C72',
  },
  emptyChatTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyChatSubtitle: {
    fontSize: 13,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
    textAlign: 'center',
    lineHeight: 19,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E3EEF5',
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#E6F0F6',
    borderWidth: 1,
    borderColor: '#D3E2EC',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    maxHeight: 110,
    color: '#2B353A',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#345C72',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#DDE8F0',
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE2E2',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#FFE2E2',
  },
  blockedBannerText: {
    color: '#B42318',
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    textAlign: 'center',
  },
});
