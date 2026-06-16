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
      Alert.alert('Error', 'Failed to accept request: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (request: ClaimRequest) => {
    Alert.alert(
      'Reject Request',
      `Are you sure you want to reject ${request.claimerName}'s claim for "${request.itemTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
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
              Alert.alert('Error', 'Failed to reject request: ' + err.message);
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleChat = async (request: ClaimRequest) => {
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
      Alert.alert('Error', 'Failed to open chat: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearAll = () => {
    if (requests.length === 0) return;
    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to clear all notifications from the center?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('clear-all');
            try {
              const ids = requests.map((r) => r.id);
              await requestService.clearRequests(ids);
              Alert.alert('Success', 'Notifications cleared.');
            } catch (err: any) {
              console.error(err);
              Alert.alert('Error', 'Failed to clear notifications: ' + err.message);
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
            <Ionicons name="images-outline" size={24} color="#94A3B8" />
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

        <Ionicons name="chevron-forward" size={20} color="#94A3B8" style={styles.chevron} />
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
          disabled={requests.length === 0 || actionLoading !== null}
        >
          <Text style={[styles.clearText, requests.length === 0 && styles.clearTextDisabled]}>
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Notification Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#9A2E17" />
        </View>
      ) : requests.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={72} color="#94A3B8" />
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
                  <Ionicons name="close" size={24} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Summary Card */}
                <View style={styles.modalItemCard}>
                  {selectedRequest.itemImage ? (
                    <Image source={{ uri: selectedRequest.itemImage }} style={styles.modalItemImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.modalItemImage, styles.modalItemFallback]}>
                      <Ionicons name="images-outline" size={24} color="#94A3B8" />
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
    backgroundColor: '#EFF6F6',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 50,
  },
  backText: {
    color: '#9A2E17',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#9A2E17',
  },
  clearText: {
    color: '#9A2E17',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearTextDisabled: {
    color: '#CBD5E1',
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
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  itemThumbFallback: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
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
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  badgePending: {
    backgroundColor: '#FFEBE3',
  },
  badgeAccepted: {
    backgroundColor: '#E6FBF3',
  },
  badgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusTextPending: {
    color: '#EA580C',
  },
  statusTextAccepted: {
    color: '#047857',
  },
  statusTextRejected: {
    color: '#B91C1C',
  },
  chevron: {
    marginLeft: 'auto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
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
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  modalItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  modalItemFallback: {
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalItemTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '700',
    marginTop: 2,
  },
  messageContainer: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  messageHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9A2E17',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  messageBody: {
    fontSize: 13,
    color: '#475569',
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
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  modalRejectBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
  },
  modalRejectText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalAcceptBtn: {
    flex: 2,
    backgroundColor: '#10B981',
  },
  modalAcceptText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalChatBtn: {
    width: '100%',
    backgroundColor: '#9A2E17',
  },
  modalChatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCloseText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: 'bold',
  }
});
