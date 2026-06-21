import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/store/authStore';
import { chatService, ChatMetadata } from '@/src/services/chatService';
import { requestService, ClaimRequest } from '@/src/services/requestService';
import { connectivity } from '@/src/services/connectivity';
import { errorHelper } from '@/src/services/errorHelper';

const ChatCard = ({ item, currentUserId, onPress, formatTime }: { 
  item: ChatMetadata; 
  currentUserId: string; 
  onPress: () => void; 
  formatTime: (t: number) => string;
}) => {
  const itemTitle = item.itemTitle || 'Item';
  const itemImage = item.itemImage || null;
  const unreadCount = (item.unreadCount && item.unreadCount[currentUserId]) || 0;

  return (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {itemImage ? (
        <Image source={{ uri: itemImage }} style={styles.chatAvatar} contentFit="cover" />
      ) : (
        <View style={styles.chatAvatarFallback}>
          <Text style={styles.avatarLetter}>{itemTitle.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.chatContent}>
        <View style={styles.chatHeaderRow}>
          <Text style={styles.partnerName} numberOfLines={1}>{itemTitle}</Text>
          <Text style={styles.chatTime}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        <Text style={styles.lastMessageText} numberOfLines={1}>
          {item.lastMessage || 'No messages yet. Tap to start chatting.'}
        </Text>
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>
            {unreadCount} {unreadCount === 1 ? 'New' : 'New'}
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

  // Cleared Chats States
  const [clearedMap, setClearedMap] = useState<Record<string, number>>({});
  const [isSelectingForClear, setIsSelectingForClear] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);

  // Load cleared chats from AsyncStorage on load/mount
  useEffect(() => {
    if (user) {
      AsyncStorage.getItem(`clearedChats_${user.uid}`)
        .then((stored) => {
          try {
            setClearedMap(stored ? JSON.parse(stored) : {});
          } catch {
            setClearedMap({});
          }
        })
        .catch(() => setClearedMap({}));
    }
  }, [user]);

  const saveClearedMap = async (newMap: Record<string, number>) => {
    if (!user) return;
    try {
      setClearedMap(newMap);
      await AsyncStorage.setItem(`clearedChats_${user.uid}`, JSON.stringify(newMap));
    } catch (e) {
      console.error('Error saving cleared chats:', e);
    }
  };

  const handleClearAll = async () => {
    const now = Date.now();
    const updatedMap = { ...clearedMap };
    chats.forEach((chat) => {
      updatedMap[chat.id] = now;
    });
    await saveClearedMap(updatedMap);
    setIsSelectingForClear(false);
    setSelectedChatIds([]);
    Alert.alert('Success', 'All chats cleared locally.');
  };

  const handleClearSelected = async () => {
    if (selectedChatIds.length === 0) return;
    const now = Date.now();
    const updatedMap = { ...clearedMap };
    selectedChatIds.forEach((id) => {
      updatedMap[id] = now;
    });
    await saveClearedMap(updatedMap);
    setIsSelectingForClear(false);
    setSelectedChatIds([]);
    Alert.alert('Success', 'Selected chats cleared locally.');
  };

  const handleChatPress = async (chatId: string) => {
    if (isSelectingForClear) {
      if (selectedChatIds.includes(chatId)) {
        setSelectedChatIds(selectedChatIds.filter((id) => id !== chatId));
      } else {
        setSelectedChatIds([...selectedChatIds, chatId]);
      }
    } else {
      if (clearedMap[chatId]) {
        const updatedMap = { ...clearedMap };
        delete updatedMap[chatId];
        await saveClearedMap(updatedMap);
      }
      router.push(`/chat/${chatId}` as any);
    }
  };

  const handleClearChatsPress = () => {
    Alert.alert(
      'Clear Chats',
      'Choose an option to clear chats locally:',
      [
        {
          text: 'Clear All Conversations',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Clear All Chats',
              'Are you sure you want to clear all conversations from your view? Messages will not be deleted from the database.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear All', style: 'destructive', onPress: handleClearAll }
              ]
            );
          }
        },
        {
          text: 'Select Conversations to Clear',
          onPress: () => {
            setIsSelectingForClear(true);
            setSelectedChatIds([]);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

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
    const isOnline = await connectivity.checkOnline();
    if (!isOnline) {
      Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection.');
      return;
    }

    Alert.alert(
      'Approve Claim',
      `Are you sure you want to approve ${request.claimerName}'s claim for "${request.itemTitle}"? This will enable messaging and contact details sharing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            const isOnlineStill = await connectivity.checkOnline();
            if (!isOnlineStill) {
              Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection.');
              return;
            }

            setActionLoading(request.id);
            try {
              // 1. Accept request
              await requestService.updateRequestStatus(request.id, 'accepted');
              
              // 2. Automatically spawn a chat session
              await chatService.getOrCreateChat(request.claimerId, {
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
              const friendlyMsg = errorHelper.getFriendlyMessage(err);
              Alert.alert('Error', 'Failed to approve claim: ' + friendlyMsg);
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleRejectClaim = async (requestId: string) => {
    const isOnline = await connectivity.checkOnline();
    if (!isOnline) {
      Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection.');
      return;
    }

    Alert.alert(
      'Reject Claim',
      'Are you sure you want to reject this claim request? The chat will remain locked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            const isOnlineStill = await connectivity.checkOnline();
            if (!isOnlineStill) {
              Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection.');
              return;
            }

            setActionLoading(requestId);
            try {
              await requestService.updateRequestStatus(requestId, 'rejected');
              Alert.alert('Claim Rejected', 'The claim request has been rejected.');
            } catch (err: any) {
              console.error(err);
              const friendlyMsg = errorHelper.getFriendlyMessage(err);
              Alert.alert('Error', 'Failed to reject claim: ' + friendlyMsg);
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
    const isSelected = selectedChatIds.includes(item.id);
    return (
      <View style={styles.chatCardWrapper}>
        {isSelectingForClear && (
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => {
              if (isSelected) {
                setSelectedChatIds(selectedChatIds.filter((id) => id !== item.id));
              } else {
                setSelectedChatIds([...selectedChatIds, item.id]);
              }
            }}
          >
            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
              {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <ChatCard
            item={item}
            currentUserId={user?.uid || ''}
            onPress={() => handleChatPress(item.id)}
            formatTime={formatTime}
          />
        </View>
      </View>
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
              <Ionicons name="gift-outline" size={24} color="#8E9CA3" />
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
              <Ionicons name="chatbubbles-outline" size={14} color="#345C72" style={{ marginRight: 4 }} />
              <Text style={styles.openChatBtnText}>Open Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const visibleChats = chats.filter((chat) => {
    const clearedAt = clearedMap[chat.id];
    if (!clearedAt) return true;
    return chat.lastMessageTime > clearedAt;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Segment Controls */}
      <View style={styles.topTabs}>
        <View style={{ flexDirection: 'row', flex: 1 }}>
          <TouchableOpacity
            style={[styles.topTab, activeTab === 'chats' ? styles.topTabActive : styles.topTabInactive]}
            onPress={() => {
              if (isSelectingForClear) {
                setIsSelectingForClear(false);
                setSelectedChatIds([]);
              }
              setActiveTab('chats');
            }}
          >
            <Ionicons name="chatbubbles" size={18} color={activeTab === 'chats' ? '#345C72' : '#8E9CA3'} style={{ marginRight: 6 }} />
            <Text style={[styles.topTabText, activeTab === 'chats' ? styles.topTabTextActive : styles.topTabTextInactive]}>
              Messages
            </Text>
          </TouchableOpacity>
 
          <TouchableOpacity
            style={[styles.topTab, activeTab === 'claims' ? styles.topTabActive : styles.topTabInactive]}
            onPress={() => {
              if (isSelectingForClear) {
                setIsSelectingForClear(false);
                setSelectedChatIds([]);
              }
              setActiveTab('claims');
            }}
          >
            <Ionicons name="archive" size={18} color={activeTab === 'claims' ? '#345C72' : '#8E9CA3'} style={{ marginRight: 6 }} />
            <Text style={[styles.topTabText, activeTab === 'claims' ? styles.topTabTextActive : styles.topTabTextInactive]}>
              Claims Center
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'chats' && visibleChats.length > 0 && !isSelectingForClear && (
          <TouchableOpacity 
            style={styles.headerTrashBtn} 
            onPress={handleClearChatsPress}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Selection Mode Header Banner */}
      {isSelectingForClear && activeTab === 'chats' && (
        <View style={styles.clearSelectionHeader}>
          <Text style={styles.clearSelectionTitle}>
            Clear chats locally ({selectedChatIds.length} selected)
          </Text>
          <TouchableOpacity onPress={() => {
            setIsSelectingForClear(false);
            setSelectedChatIds([]);
          }}>
            <Text style={styles.clearSelectionCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Body */}
      <View style={{ flex: 1 }}>
        {activeTab === 'chats' ? (
          /* CHATS LIST VIEW */
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#345C72" />
            </View>
          ) : visibleChats.length === 0 ? (
            <ScrollView contentContainerStyle={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={64} color="#8E9CA3" />
              <Text style={styles.emptyTitle}>No Conversations</Text>
              <Text style={styles.emptySubtitle}>
                Chats will appear here after a claim request is accepted, or when you contact an owner of a lost report.
              </Text>
            </ScrollView>
          ) : (
            <FlatList
              data={visibleChats}
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
                <Ionicons name="download-outline" size={16} color={activeSubTab === 'incoming' ? '#FFFFFF' : '#56646E'} style={{ marginRight: 6 }} />
                <Text style={[styles.subTabText, activeSubTab === 'incoming' ? styles.subTabTextActive : styles.subTabTextInactive]}>
                  Received
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTab, activeSubTab === 'outgoing' ? styles.subTabActive : styles.subTabInactive]}
                onPress={() => setActiveSubTab('outgoing')}
              >
                <Ionicons name="send-outline" size={16} color={activeSubTab === 'outgoing' ? '#FFFFFF' : '#56646E'} style={{ marginRight: 6 }} />
                <Text style={[styles.subTabText, activeSubTab === 'outgoing' ? styles.subTabTextActive : styles.subTabTextInactive]}>
                  My Claims
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#345C72" />
              </View>
            ) : requests.length === 0 ? (
              <ScrollView contentContainerStyle={styles.emptyContainer}>
                <Ionicons name="file-tray-outline" size={64} color="#8E9CA3" />
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

      {/* Selection Mode Footer Banner */}
      {isSelectingForClear && activeTab === 'chats' && (
        <View style={styles.clearSelectionFooter}>
          <TouchableOpacity 
            style={[styles.clearFooterBtn, styles.clearAllBtn]} 
            onPress={handleClearAll}
          >
            <Text style={styles.clearAllBtnText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.clearFooterBtn, styles.clearSelectedBtn, selectedChatIds.length === 0 && styles.clearSelectedBtnDisabled]} 
            onPress={handleClearSelected}
            disabled={selectedChatIds.length === 0}
          >
            <Text style={styles.clearSelectedBtnText}>Clear Selected</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F5FA',
  },
  topTabs: {
    flexDirection: 'row',
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EEF5',
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
    borderBottomColor: '#345C72',
  },
  topTabInactive: {
    borderBottomColor: 'transparent',
  },
  topTabText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  topTabTextActive: {
    color: '#345C72',
  },
  topTabTextInactive: {
    color: '#8E9CA3',
  },
  subTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EEF5',
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subTabActive: {
    backgroundColor: '#345C72',
  },
  subTabInactive: {
    backgroundColor: '#F5F8FA',
    borderWidth: 1,
    borderColor: '#D3E2EC',
  },
  subTabText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  subTabTextActive: {
    color: '#FFFFFF',
  },
  subTabTextInactive: {
    color: '#56646E',
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
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
  },
  chatCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D3E2EC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F0F6',
  },
  chatAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0ECF4',
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
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#2B353A',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 11,
    color: '#8E9CA3',
    fontFamily: 'PlusJakartaSans-Medium',
  },
  itemTitleLabel: {
    fontSize: 12,
    color: '#345C72',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 2,
  },
  lastMessageText: {
    fontSize: 13,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D3E2EC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
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
    borderRadius: 12,
    backgroundColor: '#E6F0F6',
  },
  requestThumbFallback: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E0ECF4',
    borderWidth: 1,
    borderColor: '#D3E2EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestItemTitle: {
    fontSize: 16,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
  },
  requestSender: {
    fontSize: 12,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Medium',
  },
  requestDate: {
    fontSize: 11,
    color: '#8E9CA3',
    fontFamily: 'PlusJakartaSans-Medium',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  requestMessageContainer: {
    backgroundColor: '#E6F0F6',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D3E2EC',
    marginBottom: 14,
  },
  requestMessageText: {
    fontSize: 13,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
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
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#2B353A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePending: {
    backgroundColor: '#FFF4D8',
  },
  badgeSuccess: {
    backgroundColor: '#E1EEDD',
  },
  badgeError: {
    backgroundColor: '#FFE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.3,
  },
  statusTextPending: {
    color: '#A56A00',
  },
  statusTextSuccess: {
    color: '#566252',
  },
  statusTextError: {
    color: '#B42318',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  rejectBtn: {
    backgroundColor: '#FFE2E2',
    borderWidth: 1,
    borderColor: '#FFE2E2',
  },
  rejectBtnText: {
    color: '#B42318',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  approveBtn: {
    backgroundColor: '#345C72',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  openChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#345C72',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  openChatBtnText: {
    color: '#345C72',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  avatarLetter: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#345C72',
  },
  unreadBadge: {
    backgroundColor: '#345C72',
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
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerTrashBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: '100%',
  },
  clearSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  clearSelectionTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#475569',
  },
  clearSelectionCancel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#64748B',
  },
  clearSelectionFooter: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  clearFooterBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearAllBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  clearAllBtnText: {
    color: '#475569',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  clearSelectedBtn: {
    backgroundColor: '#EF4444',
  },
  clearSelectedBtnDisabled: {
    backgroundColor: '#FCA5A5',
  },
  clearSelectedBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  chatCardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    paddingRight: 8,
    paddingLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#8E9CA3',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
});
