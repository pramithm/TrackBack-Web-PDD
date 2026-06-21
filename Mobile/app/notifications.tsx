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
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/store/authStore';
import { requestService, ClaimRequest } from '@/src/services/requestService';
import { chatService } from '@/src/services/chatService';
import { connectivity } from '@/src/services/connectivity';
import { errorHelper } from '@/src/services/errorHelper';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [requests, setRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal Review States
  const [selectedRequest, setSelectedRequest] = useState<ClaimRequest | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  // Subscribe to both incoming & outgoing requests
  useEffect(() => {
    if (!user) return;

    console.log('[NotificationsScreen] Listening to incoming & outgoing requests...');
    setLoading(true);

    let incomingList: ClaimRequest[] = [];
    let outgoingList: ClaimRequest[] = [];

    const updateCombinedRequests = () => {
      const combined = [...incomingList, ...outgoingList]
        .sort((a, b) => b.createdAt - a.createdAt);
      setRequests(combined);
      setLoading(false);
    };

    const unsubscribeIncoming = requestService.listenToRequests('incoming', (fetchedIncoming) => {
      incomingList = fetchedIncoming;
      updateCombinedRequests();
    });

    const unsubscribeOutgoing = requestService.listenToRequests('outgoing', (fetchedOutgoing) => {
      outgoingList = fetchedOutgoing;
      updateCombinedRequests();
    });

    return () => {
      unsubscribeIncoming();
      unsubscribeOutgoing();
    };
  }, [user]);

  const handleAccept = async (request: ClaimRequest) => {
    const isOnline = await connectivity.checkOnline();
    if (!isOnline) {
      Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection and try again.');
      return;
    }

    setActionLoading(request.id);
    try {
      // 1. Accept request in DB
      await requestService.updateRequestStatus(request.id, 'accepted');

      // 2. Automatically spawn/create a chat session
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

      // Update state in modal if active
      if (selectedRequest && selectedRequest.id === request.id) {
        setSelectedRequest({ ...selectedRequest, status: 'accepted' });
      }

      Alert.alert('Success', `You approved ${request.claimerName}'s claim. Tap Chat to discuss return.`);
    } catch (err: any) {
      console.error(err);
      const friendlyMsg = errorHelper.getFriendlyMessage(err);
      Alert.alert('Error', 'Failed to accept request: ' + friendlyMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (request: ClaimRequest) => {
    const isOnline = await connectivity.checkOnline();
    if (!isOnline) {
      Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection and try again.');
      return;
    }

    Alert.alert(
      'Reject Request',
      `Are you sure you want to reject ${request.claimerName}'s claim for "${request.itemTitle}"?`,
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

            setActionLoading(request.id);
            try {
              await requestService.updateRequestStatus(request.id, 'rejected');
              
              // Update state in modal if active
              if (selectedRequest && selectedRequest.id === request.id) {
                setSelectedRequest({ ...selectedRequest, status: 'rejected' });
              }

              Alert.alert('Success', 'The request was rejected.');
            } catch (err: any) {
              console.error(err);
              const friendlyMsg = errorHelper.getFriendlyMessage(err);
              Alert.alert('Error', 'Failed to reject request: ' + friendlyMsg);
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleChat = async (request: ClaimRequest) => {
    const isOnline = await connectivity.checkOnline();
    if (!isOnline) {
      Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection and try again.');
      return;
    }

    setActionLoading(request.id);
    setReviewModalVisible(false);
    try {
      // Spawns the exact chat room ID matching the dashboard logic
      const chatId = [request.claimerId, request.finderId].sort().join('_') + '_' + request.itemId;

      // Navigate to Chat Detail screen
      router.push(`/chat/${chatId}` as any);

      // Remove the accepted request from Notification Center list
      await requestService.clearRequests([request.id]);
    } catch (err: any) {
      console.error(err);
      const friendlyMsg = errorHelper.getFriendlyMessage(err);
      Alert.alert('Error', 'Failed to open chat: ' + friendlyMsg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearAll = () => {
    const completedRequests = requests.filter(r => r.status !== 'pending');
    if (completedRequests.length === 0) return;
    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to clear all completed/claimed notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Completed',
          style: 'destructive',
          onPress: async () => {
            const isOnline = await connectivity.checkOnline();
            if (!isOnline) {
              Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection and try again.');
              return;
            }

            setActionLoading('clear-all');
            try {
              const ids = completedRequests.map((r) => r.id);
              await requestService.clearRequests(ids);
              Alert.alert('Success', 'Completed notifications cleared.');
            } catch (err: any) {
              console.error(err);
              const friendlyMsg = errorHelper.getFriendlyMessage(err);
              Alert.alert('Error', 'Failed to clear notifications: ' + friendlyMsg);
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

  const renderNotificationCard = ({ item }: { item: ClaimRequest }) => {
    const isIncoming = item.finderId === user?.uid;
    const isPending = item.status === 'pending';
    const isAccepted = item.status === 'accepted';
    
    let titleText = '';
    let subtitleText = '';

    if (isIncoming) {
      titleText = `Incoming Claim: ${item.itemTitle}`;
      subtitleText = `From: ${item.claimerName || 'User'}`;
    } else {
      titleText = `Your Claim: ${item.itemTitle}`;
      subtitleText = `Status: ${item.status.charAt(0).toUpperCase() + item.status.slice(1)}`;
    }

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          setSelectedRequest(item);
          setReviewModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        {/* Item Image */}
        {item.itemImage ? (
          <Image source={{ uri: item.itemImage }} style={styles.itemThumb} contentFit="cover" />
        ) : (
          <View style={styles.itemThumbFallback}>
            <Ionicons name="images-outline" size={24} color="#8E9CA3" />
          </View>
        )}

        {/* Content details */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{titleText}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>{subtitleText}</Text>
          
          {/* Status Badge capsule */}
          <View style={[
            styles.statusBadge,
            isPending ? styles.badgePending : isAccepted ? styles.badgeAccepted : styles.badgeRejected
          ]}>
            <Text style={[
              styles.statusText,
              isPending ? styles.statusTextPending : isAccepted ? styles.statusTextAccepted : styles.statusTextRejected
            ]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {!isPending ? (
          <TouchableOpacity
            style={{ padding: 8 }}
            disabled={actionLoading !== null}
            onPress={async (e) => {
              e.stopPropagation();
              const isOnline = await connectivity.checkOnline();
              if (!isOnline) {
                Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection.');
                return;
              }

              setActionLoading(item.id);
              try {
                await requestService.clearRequests([item.id]);
                Alert.alert('Success', 'Notification cleared.');
              } catch (err: any) {
                const friendlyMsg = errorHelper.getFriendlyMessage(err);
                Alert.alert('Error', 'Failed to clear notification: ' + friendlyMsg);
              } finally {
                setActionLoading(null);
              }
            }}
          >
            {actionLoading === item.id ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            )}
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#8E9CA3" style={styles.chevron} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Notifications Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

        <TouchableOpacity 
          style={styles.headerBtn} 
          onPress={handleClearAll}
          disabled={!requests.some(r => r.status !== 'pending') || actionLoading !== null}
        >
          <Text style={[
            styles.clearText, 
            (!requests.some(r => r.status !== 'pending') || actionLoading !== null) && styles.clearTextDisabled
          ]}>
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Notification Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#345C72" />
        </View>
      ) : requests.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={72} color="#8E9CA3" />
          <Text style={styles.emptyTitle}>No New Notifications</Text>
          <Text style={styles.emptySubtitle}>
            When other users request to claim your found items, those requests will appear here.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderNotificationCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* DETAIL REVIEW MODAL */}
      {selectedRequest && (
        <Modal
          visible={reviewModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setReviewModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedRequest.finderId === user?.uid ? 'Review Claim Request' : 'Claim Request Status'}
                </Text>
                <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#8E9CA3" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Summary Card */}
                <View style={styles.modalItemCard}>
                  {selectedRequest.itemImage ? (
                    <Image source={{ uri: selectedRequest.itemImage }} style={styles.modalItemImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.modalItemImage, styles.modalItemFallback]}>
                      <Ionicons name="images-outline" size={24} color="#8E9CA3" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.modalItemTitle}>{selectedRequest.itemTitle}</Text>
                    <Text style={styles.modalItemTime}>{formatTime(selectedRequest.createdAt)}</Text>
                  </View>
                </View>

                {/* Sender/Recipient Info */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {selectedRequest.finderId === user?.uid ? 'From Claimant' : 'Submitted By'}
                  </Text>
                  <Text style={styles.detailValue}>{selectedRequest.claimerName}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[
                    styles.statusBadge,
                    selectedRequest.status === 'pending' ? styles.badgePending : selectedRequest.status === 'accepted' ? styles.badgeAccepted : styles.badgeRejected,
                    { marginTop: 4 }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      selectedRequest.status === 'pending' ? styles.statusTextPending : selectedRequest.status === 'accepted' ? styles.statusTextAccepted : styles.statusTextRejected
                    ]}>
                      {selectedRequest.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Answers / Verification Message */}
                <View style={styles.messageContainer}>
                  <Text style={styles.messageHeader}>VERIFICATION RESPONSES</Text>
                  <Text style={styles.messageBody}>
                    {selectedRequest.message || 'No verification message provided.'}
                  </Text>
                </View>
              </ScrollView>

              {/* Action buttons inside Modal */}
              <View style={styles.modalFooter}>
                {selectedRequest.finderId === user?.uid && selectedRequest.status === 'pending' ? (
                  <View style={styles.modalActionsRow}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalRejectBtn]}
                      onPress={() => handleReject(selectedRequest)}
                      disabled={actionLoading !== null}
                    >
                      <Text style={styles.modalRejectText}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalAcceptBtn]}
                      onPress={() => handleAccept(selectedRequest)}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === selectedRequest.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.modalAcceptText}>Accept Claim</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : selectedRequest.status === 'accepted' ? (
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalChatBtn]}
                    onPress={() => handleChat(selectedRequest)}
                    disabled={actionLoading !== null}
                  >
                    <Ionicons name="chatbubbles-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.modalChatText}>Start Chat</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalCloseBtn]}
                    onPress={() => setReviewModalVisible(false)}
                  >
                    <Text style={styles.modalCloseText}>Close</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F5FA',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EEF5',
    backgroundColor: '#FFFFFF',
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 50,
  },
  backText: {
    color: '#345C72',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#345C72',
  },
  clearText: {
    color: '#345C72',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  clearTextDisabled: {
    color: '#DDE8F0',
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
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#D3E2EC',
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#E6F0F6',
  },
  itemThumbFallback: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#E6F0F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#2B353A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  badgePending: {
    backgroundColor: '#FFF4D8',
  },
  badgeAccepted: {
    backgroundColor: '#E1EEDD',
  },
  badgeRejected: {
    backgroundColor: '#FFE2E2',
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.5,
  },
  statusTextPending: {
    color: '#A56A00',
  },
  statusTextAccepted: {
    color: '#566252',
  },
  statusTextRejected: {
    color: '#B42318',
  },
  chevron: {
    marginLeft: 'auto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43, 53, 58, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EEF5',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
  },
  modalItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0F6',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D3E2EC',
    marginBottom: 16,
  },
  modalItemImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  modalItemFallback: {
    backgroundColor: '#DDE8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItemTitle: {
    fontSize: 15,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
  },
  modalItemTime: {
    fontSize: 12,
    color: '#8E9CA3',
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 2,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#8E9CA3',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: '#2B353A',
    fontFamily: 'PlusJakartaSans-Bold',
    marginTop: 2,
  },
  messageContainer: {
    backgroundColor: '#E6F0F6',
    borderWidth: 1,
    borderColor: '#D3E2EC',
    borderRadius: 24,
    padding: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  messageHeader: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#345C72',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  messageBody: {
    fontSize: 13,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 18,
  },
  modalFooter: {
    marginTop: 12,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  modalRejectBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#B42318',
    backgroundColor: '#FFFFFF',
  },
  modalRejectText: {
    color: '#B42318',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  modalAcceptBtn: {
    flex: 2,
    backgroundColor: '#345C72',
  },
  modalAcceptText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  modalChatBtn: {
    width: '100%',
    backgroundColor: '#345C72',
  },
  modalChatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  modalCloseBtn: {
    width: '100%',
    backgroundColor: '#E6F0F6',
    borderWidth: 1,
    borderColor: '#D3E2EC',
  },
  modalCloseText: {
    color: '#345C72',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  }
});
