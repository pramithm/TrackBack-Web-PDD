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
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '@/src/store/authStore';
import { chatService, ChatMessage, ChatMetadata } from '@/src/services/chatService';

export default function ChatDetailScreen() {
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [metadata, setMetadata] = useState<ChatMetadata | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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
      // Scroll to bottom when messages load
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      unsubMeta();
      unsubMessages();
    };
  }, [chatId]);

  const handleSendMessage = async () => {
    if (!chatId || !inputText.trim() || !metadata) return;

    setSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    try {
      await chatService.sendMessage(chatId, textToSend, metadata.itemTitle);
      // Clear input and scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      console.error(err);
      // Alerts the user if message is blocked by AI moderator
      Alert.alert('Moderation Alert', err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const getPartnerName = () => {
    if (!metadata || !user) return 'User';
    const partnerId = Object.keys(metadata.participants).find(uid => uid !== user.uid) || '';
    return metadata.participantNames[partnerId] || 'User';
  };

  const renderMessageBubble = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.uid;
    const isSystem = item.isSystem || item.senderId === 'SYSTEM';

    if (isSystem) {
      const isLock = item.text.includes('locked') || item.text.includes('locked.');
      return (
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
      );
    }

    return (
      <View style={[styles.messageBubbleWrapper, isMe ? styles.messageMe : styles.messagePartner]}>
        <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubblePartner]}>
          <Text style={[styles.messageText, isMe ? styles.textMe : styles.textPartner]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isMe ? styles.timeMe : styles.timePartner]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#9A2E17" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#2D3436" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerPartnerName} numberOfLines={1}>{getPartnerName()}</Text>
          <Text style={styles.headerItemTitle} numberOfLines={1}>Item: {metadata?.itemTitle || 'Loading...'}</Text>
        </View>

        {metadata?.itemImage ? (
          <Image source={{ uri: metadata.itemImage }} style={styles.headerThumb} contentFit="cover" />
        ) : (
          <View style={styles.headerThumbFallback}>
            <Ionicons name="chatbubbles-outline" size={18} color="#9A2E17" />
          </View>
        )}
      </View>

      {/* Keyboard Area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Chat Feed */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageBubble}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input Bar or Block Banner */}
        {metadata?.isBlockedByAI ? (
          <View style={styles.blockedBanner}>
            <Ionicons name="ban-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.blockedBannerText}>
              This chat is permanently locked due to moderation violations.
            </Text>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Discuss returning the item..."
              placeholderTextColor="#94A3B8"
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
    backgroundColor: '#EFF6F6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6F6',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerPartnerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  headerItemTitle: {
    fontSize: 12,
    color: '#F27A35',
    fontWeight: '700',
    marginTop: 2,
  },
  headerThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerThumbFallback: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  feedContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    width: '100%',
  },
  messageMe: {
    justifyContent: 'flex-end',
  },
  messagePartner: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: '#9A2E17',
    borderBottomRightRadius: 2,
  },
  bubblePartner: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  textMe: {
    color: '#FFFFFF',
  },
  textPartner: {
    color: '#2D3436',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeMe: {
    color: '#FCA5A5',
  },
  timePartner: {
    color: '#94A3B8',
  },
  systemMessageWrapper: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  systemWarning: {
    backgroundColor: '#FFFCF0',
    borderColor: '#FEEBC8',
  },
  systemLock: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FED7D7',
  },
  systemMessageText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    maxHeight: 100,
    color: '#1A1A1A',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9A2E17',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#FCA5A5',
  },
  blockedBannerText: {
    color: '#B91C1C',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});
