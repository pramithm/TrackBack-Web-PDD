import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/store/authStore';
import { chatService, ChatMetadata } from '@/src/services/chatService';
import { requestService, ClaimRequest } from '@/src/services/requestService';
import { userService } from '@/src/services/userService';

const ChatCard = ({ item, currentUserId, onPress, formatTime }: { 
  item: ChatMetadata; 
  currentUserId: string; 
  onPress: () => void; 
  formatTime: (t: number) => string;
}) => {
  const partnerId = Object.keys(item.participants).find(id => id !== currentUserId) || '';
  const [partnerProfile, setPartnerProfile] = useState<any>(null);

  useEffect(() => {
    if (partnerId) {
      userService.getUserProfile(partnerId)
        .then((profile) => {
          setPartnerProfile(profile);
        })
        .catch(err => console.log('Error loading partner profile in list:', err));
    }
  }, [partnerId]);

  const partnerName = partnerProfile?.name || item.participantNames[partnerId] || 'User';
  const partnerPhoto = partnerProfile?.photoURL || null;
  const unreadCount = (item.unreadCount && item.unreadCount[currentUserId]) || 0;

  return (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {partnerPhoto ? (
        <Image source={{ uri: partnerPhoto }} style={styles.chatAvatar} contentFit="cover" />
      ) : (
        <View style={styles.chatAvatarFallback}>
          <Text style={styles.avatarLetter}>{partnerName.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.chatContent}>
        <View style={styles.chatHeaderRow}>
          <Text style={styles.partnerName} numberOfLines={1}>{partnerName}</Text>
          <Text style={styles.chatTime}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        <Text style={styles.lastMessageText} numberOfLines={1}>
          {item.lastMessage || 'No messages yet. Tap to start chatting.'}
        </Text>
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>
            {unreadCount} {unreadCount === 1 ? 'New Message' : 'New Messages'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function ChatDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Navigation Segments: 'chats' | 'claims'
  const [activeTab, setActiveTab] = useState<'chats' | 'claims'>('chats');
  
  // Claims Center Sub-tabs: 'incoming' | 'outgoing'
  const [activeSubTab, setActiveSubTab] = useState<'incoming' | 'outgoing'>('incoming');

  // Feeds data
  const [chats, setChats] = useState<ChatMetadata[]>([]);
  const [requests, setRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Subscribe to Chats List
  useEffect(() => {
    if (!user || activeTab !== 'chats') return;
    
    setLoading(true);
    console.log('[ChatTab] Subscribing to user chats...');
    const unsubscribe = chatService.listenToUserChats((fetchedChats) => {
      // Filter chats: Rejected or blocked requests must not appear in the chat list
      // By service design, chats are only spawned when claims are accepted or it's a lost item.
      const filtered = fetchedChats.filter(chat => !chat.isBlockedByAI);
      setChats(filtered);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, activeTab]);

  // Subscribe to Claims Center Requests List
  useEffect(() => {
    if (!user || activeTab !== 'claims') return;

    setLoading(true);
    console.log(`[ClaimsTab] Subscribing to ${activeSubTab} claims...`);
    const unsubscribe = requestService.listenToRequests(activeSubTab, (fetchedRequests) => {
      setRequests(fetchedRequests);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, activeTab, activeSubTab]);

  const handleApproveClaim = async (request: ClaimRequest) => {
    Alert.alert(
      'Approve Claim',
      `Are you sure you want to approve ${request.claimerName}'s claim for "${request.itemTitle}"? This will enable messaging and contact details sharing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActionLoading(request.id);
            try {
              // 1. Accept request
              await requestService.updateRequestStatus(request.id, 'accepted');
              
              // 2. Automatically spawn a chat session
              const chatId = await chatService.getOrCreateChat(request.claimerId, {
                id: request.itemId,
                title: request.itemTitle,
                imageUrl: request.itemImage || '',
                user: request.claimerName,
                userId: request.claimerId,
                description: '',
                type: 'found',
                category: 'Other',
                location: '',
                createdAt: Date.now(),
                status: 'ai-verified'
              });

              Alert.alert('Claim Approved', 'Claim approved successfully! A chat room is now active in Messages.');
              // Switch to Chats view automatically
              setActiveTab('chats');
            } catch (err: any) {
              console.error(err);
              Alert.alert('Error', 'Failed to approve claim: ' + err.message);
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleRejectClaim = async (requestId: string) => {
    Alert.alert(
      'Reject Claim',
      'Are you sure you want to reject this claim request? The chat will remain locked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(requestId);
            try {
              await requestService.updateRequestStatus(requestId, 'rejected');
              Alert.alert('Claim Rejected', 'The claim request has been rejected.');
            } catch (err: any) {
              console.error(err);
              Alert.alert('Error', 'Failed to reject claim: ' + err.message);
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderChatItem = ({ item }: { item: ChatMetadata }) => {
    return (
      <ChatCard
        item={item}
        currentUserId={user?.uid || ''}
        onPress={() => router.push(`/chat/${item.id}` as any)}
        formatTime={formatTime}
      />
    );
  };

  const renderRequestCard = ({ item }: { item: ClaimRequest }) => {
    const isIncoming = activeSubTab === 'incoming';
    const otherPartyName = isIncoming ? item.claimerName : 'Finder';
    
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestCardHeader}>
          {item.itemImage ? (
            <Image source={{ uri: item.itemImage }} style={styles.requestThumb} contentFit="cover" />
          ) : (
            <View style={styles.requestThumbFallback}>
              <Ionicons name="gift-outline" size={24} color="#94A3B8" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.requestItemTitle}>{item.itemTitle}</Text>
            <Text style={styles.requestSender}>
              {isIncoming ? `Claimant: ${otherPartyName}` : `Requested from Finder`}
            </Text>
          </View>
          <Text style={styles.requestDate}>{formatTime(item.createdAt)}</Text>
        </View>

        <View style={styles.requestMessageContainer}>
          <Text style={styles.requestMessageText} numberOfLines={5}>
            {item.message || 'No description message.'}
          </Text>
        </View>

        <View style={styles.requestFooter}>
          <View style={styles.statusBadgeWrapper}>
            <Text style={styles.statusLabel}>Status:</Text>
            <View 
              style={[
                styles.statusBadge, 
                item.status === 'accepted' ? styles.badgeSuccess : item.status === 'rejected' ? styles.badgeError : styles.badgePending
              ]}
            >
              <Text 
                style={[
                  styles.statusBadgeText, 
                  item.status === 'accepted' ? styles.statusTextSuccess : item.status === 'rejected' ? styles.statusTextError : styles.statusTextPending
                ]}
              >
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {isIncoming && item.status === 'pending' && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleRejectClaim(item.id)}
                disabled={actionLoading !== null}
              >
                {actionLoading === item.id ? (
                  <ActivityIndicator size="small" color="#B91C1C" />
                ) : (
                  <>
                    <Ionicons name="close" size={14} color="#B91C1C" style={{ marginRight: 4 }} />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => handleApproveClaim(item)}
                disabled={actionLoading !== null}
              >
                {actionLoading === item.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {item.status === 'accepted' && (
            <TouchableOpacity 
              style={styles.openChatBtn}
              onPress={async () => {
                // Find chat room ID
                const chatId = [item.claimerId, item.finderId].sort().join('_') + '_' + item.itemId;
                router.push(`/chat/${chatId}` as any);
              }}
            >
              <Ionicons name="chatbubbles-outline" size={14} color="#9A2E17" style={{ marginRight: 4 }} />
              <Text style={styles.openChatBtnText}>Open Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Segment Controls */}
      <View style={styles.topTabs}>
        <TouchableOpacity
          style={[styles.topTab, activeTab === 'chats' ? styles.topTabActive : styles.topTabInactive]}
          onPress={() => setActiveTab('chats')}
        >
          <Ionicons name="chatbubbles" size={18} color={activeTab === 'chats' ? '#9A2E17' : '#94A3B8'} style={{ marginRight: 6 }} />
          <Text style={[styles.topTabText, activeTab === 'chats' ? styles.topTabTextActive : styles.topTabTextInactive]}>
            Messages
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTab, activeTab === 'claims' ? styles.topTabActive : styles.topTabInactive]}
          onPress={() => setActiveTab('claims')}
        >
          <Ionicons name="archive" size={18} color={activeTab === 'claims' ? '#9A2E17' : '#94A3B8'} style={{ marginRight: 6 }} />
          <Text style={[styles.topTabText, activeTab === 'claims' ? styles.topTabTextActive : styles.topTabTextInactive]}>
            Claims Center
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Body */}
      <View style={{ flex: 1 }}>
        {activeTab === 'chats' ? (
          /* CHATS LIST VIEW */
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#9A2E17" />
            </View>
          ) : chats.length === 0 ? (
            <ScrollView contentContainerStyle={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Conversations</Text>
              <Text style={styles.emptySubtitle}>
                Chats will appear here after a claim request is accepted, or when you contact an owner of a lost report.
              </Text>
            </ScrollView>
          ) : (
            <FlatList
              data={chats}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : (
          /* CLAIMS CENTER VIEW */
          <View style={{ flex: 1 }}>
            {/* Sub Tabs Toggle for Received vs Outgoing claims */}
            <View style={styles.subTabs}>
              <TouchableOpacity
                style={[styles.subTab, activeSubTab === 'incoming' ? styles.subTabActive : styles.subTabInactive]}
                onPress={() => setActiveSubTab('incoming')}
              >
                <Ionicons name="download-outline" size={16} color={activeSubTab === 'incoming' ? '#FFFFFF' : '#475569'} style={{ marginRight: 6 }} />
                <Text style={[styles.subTabText, activeSubTab === 'incoming' ? styles.subTabTextActive : styles.subTabTextInactive]}>
                  Received
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTab, activeSubTab === 'outgoing' ? styles.subTabActive : styles.subTabInactive]}
                onPress={() => setActiveSubTab('outgoing')}
              >
                <Ionicons name="send-outline" size={16} color={activeSubTab === 'outgoing' ? '#FFFFFF' : '#475569'} style={{ marginRight: 6 }} />
                <Text style={[styles.subTabText, activeSubTab === 'outgoing' ? styles.subTabTextActive : styles.subTabTextInactive]}>
                  My Claims
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#9A2E17" />
              </View>
            ) : requests.length === 0 ? (
              <ScrollView contentContainerStyle={styles.emptyContainer}>
                <Ionicons name="file-tray-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Claim Requests</Text>
                <Text style={styles.emptySubtitle}>
                  {activeSubTab === 'incoming' 
                    ? "You haven't received any ownership claim requests for found items yet."
                    : "You haven't submitted any claim requests for found items yet."}
                </Text>
              </ScrollView>
            ) : (
              <FlatList
                data={requests}
                renderItem={renderRequestCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6F6',
  },
  topTabs: {
    flexDirection: 'row',
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  topTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    borderBottomWidth: 3,
  },
  topTabActive: {
    borderBottomColor: '#9A2E17',
  },
  topTabInactive: {
    borderBottomColor: 'transparent',
  },
  topTabText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  topTabTextActive: {
    color: '#9A2E17',
  },
  topTabTextInactive: {
    color: '#94A3B8',
  },
  subTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subTabActive: {
    backgroundColor: '#9A2E17',
  },
  subTabInactive: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  subTabTextActive: {
    color: '#FFFFFF',
  },
  subTabTextInactive: {
    color: '#475569',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  chatCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
  },
  chatAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  itemTitleLabel: {
    fontSize: 12,
    color: '#F27A35',
    fontWeight: '700',
    marginBottom: 2,
  },
  lastMessageText: {
    fontSize: 13,
    color: '#636E72',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  requestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  requestThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  requestThumbFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  requestSender: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '500',
  },
  requestDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  requestMessageContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
  },
  requestMessageText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  badgeError: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusTextPending: {
    color: '#D97706',
  },
  statusTextSuccess: {
    color: '#047857',
  },
  statusTextError: {
    color: '#B91C1C',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  rejectBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rejectBtnText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  openChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#9A2E17',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  openChatBtnText: {
    color: '#9A2E17',
    fontSize: 12,
    fontWeight: 'bold',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9A2E17',
  },
  unreadBadge: {
    backgroundColor: '#9A2E17',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
