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
import { requestService, ClaimRequest } from '@/src/services/requestService';
import { chatService } from '@/src/services/chatService';
import { userService } from '@/src/services/userService';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [requests, setRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [claimerProfiles, setClaimerProfiles] = useState<Record<string, string>>({});

  // Subscribe to incoming requests
  useEffect(() => {
    if (!user) return;

    console.log('[NotificationsScreen] Listening to incoming requests...');
    const unsubscribe = requestService.listenToRequests('incoming', (fetchedRequests) => {
      // Only display requests that are pending or accepted
      const activeRequests = fetchedRequests.filter(
        (req) => req.status === 'pending' || req.status === 'accepted'
      );
      setRequests(activeRequests);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Fetch claimer profile images asynchronously
  useEffect(() => {
    const fetchMissingProfiles = async () => {
      const uidsToFetch = requests
        .map((r) => r.claimerId)
        .filter((uid) => uid && !claimerProfiles[uid]);

      if (uidsToFetch.length === 0) return;

      const uniqueUids = Array.from(new Set(uidsToFetch));
      const updates: Record<string, string> = {};

      await Promise.all(
        uniqueUids.map(async (uid) => {
          try {
            const profile = await userService.getUserProfile(uid);
            updates[uid] = profile?.photoURL || '';
          } catch (err) {
            console.error('[NotificationsScreen] Error fetching profile for:', uid, err);
            updates[uid] = '';
          }
        })
      );

      setClaimerProfiles((prev) => ({ ...prev, ...updates }));
    };

    fetchMissingProfiles();
  }, [requests, claimerProfiles]);

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
    const isPending = item.status === 'pending';
    const profileUrl = claimerProfiles[item.claimerId];
    const isBusy = actionLoading === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {/* User Profile Image */}
          {profileUrl ? (
            <Image source={{ uri: profileUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{item.claimerName?.charAt(0) || 'U'}</Text>
            </View>
          )}

          {/* User & Request Metadata */}
          <View style={styles.cardMeta}>
            <View style={styles.row}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.claimerName}
              </Text>
              <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
            </View>
            <Text style={styles.itemRef} numberOfLines={1}>
              For item: {item.itemTitle}
            </Text>
          </View>
        </View>

        {/* Request Message */}
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>
            {item.message || 'No description message.'}
          </Text>
        </View>

        {/* Responsive Card Action Buttons */}
        {isPending ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.rejectBtn]}
              onPress={() => handleReject(item)}
              disabled={actionLoading !== null}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#475569" />
              ) : (
                <>
                  <Ionicons name="close" size={16} color="#475569" style={{ marginRight: 6 }} />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.acceptBtn]}
              onPress={() => handleAccept(item)}
              disabled={actionLoading !== null}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.btn, styles.chatBtn]}
            onPress={() => handleChat(item)}
            disabled={actionLoading !== null}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="chatbubbles-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.chatBtnText}>Chat</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Notifications Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#9A2E17" />
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
    padding: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
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
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#9A2E17',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  cardMeta: {
    flex: 1,
    marginLeft: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  itemRef: {
    fontSize: 13,
    color: '#F27A35',
    fontWeight: '600',
    marginTop: 2,
  },
  messageBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  messageText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rejectBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: 'bold',
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#F28C38',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  chatBtn: {
    width: '100%',
    backgroundColor: '#9A2E17',
  },
  chatBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
