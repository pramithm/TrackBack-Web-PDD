import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/store/authStore';
import { userService } from '@/src/services/userService';
import { rtdb } from '@/src/config/firebase';
import { ref, onValue, set } from 'firebase/database';

interface BlockedUser {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    const blocksRef = ref(rtdb, `blocks/${user.uid}`);
    
    const unsubscribe = onValue(blocksRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setBlockedUsers([]);
        setLoading(false);
        return;
      }

      const uids = Object.keys(data).filter(uid => data[uid] === true);
      
      try {
        const details = await Promise.all(uids.map(async (uid) => {
          try {
            const profile = await userService.getUserProfile(uid);
            return {
              uid,
              name: profile?.name || 'Blocked User',
              email: profile?.email || 'N/A',
              photoURL: profile?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${uid}`
            };
          } catch (e) {
            return {
              uid,
              name: 'Blocked User',
              email: 'N/A',
              photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${uid}`
            };
          }
        }));
        setBlockedUsers(details);
      } catch (err) {
        console.error('[BlockedUsers] Error loading blocked list:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleUnblock = async (targetUid: string, targetName: string) => {
    if (!user?.uid) return;

    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${targetName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            setActionLoading(targetUid);
            try {
              const blockRef = ref(rtdb, `blocks/${user.uid}/${targetUid}`);
              await set(blockRef, null);
              Alert.alert('Success', 'User unblocked successfully.');
            } catch (err: any) {
              Alert.alert('Error', 'Failed to unblock user: ' + err.message);
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const renderBlockedCard = ({ item }: { item: BlockedUser }) => {
    return (
      <View style={styles.card}>
        <Image source={{ uri: item.photoURL }} style={styles.avatar} />
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
        </View>
        <TouchableOpacity
          style={styles.unblockBtn}
          onPress={() => handleUnblock(item.uid, item.name)}
          disabled={actionLoading === item.uid}
        >
          {actionLoading === item.uid ? (
            <ActivityIndicator size="small" color="#B42318" />
          ) : (
            <Text style={styles.unblockBtnText}>Unblock</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#345C72" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#345C72" />
        </View>
      ) : blockedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={72} color="#8E9CA3" />
          <Text style={styles.emptyTitle}>No Blocked Users</Text>
          <Text style={styles.emptySubtitle}>
            When you block someone, they will appear in this list. They won't be able to send or receive messages with you.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderBlockedCard}
          keyExtractor={(item) => item.uid}
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
  backBtn: {
    padding: 8,
  },
  backBtnPlaceholder: {
    width: 42,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#345C72',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
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
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F0F6',
  },
  content: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#2B353A',
  },
  email: {
    fontSize: 13,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 2,
  },
  unblockBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#B42318',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unblockBtnText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#B42318',
  },
});
