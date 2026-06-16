import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/store/authStore';
import { itemService, Item } from '@/src/services/itemService';

export default function MyReportsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [reports, setReports] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    
    console.log('[MyReportsScreen] Fetching reports for user:', user.uid);
    setLoading(true);
    itemService.getItemsByUser(user.uid)
      .then((fetchedItems) => {
        setReports(fetchedItems);
      })
      .catch((err) => {
        console.error('[MyReportsScreen] Error fetching user reports:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Electronics': return 'hardware-chip-outline';
      case 'Wallets': return 'wallet-outline';
      case 'Keys': return 'key-outline';
      case 'Bags': return 'briefcase-outline';
      case 'Pets': return 'paw-outline';
      case 'Documents': return 'document-text-outline';
      case 'Jewelry': return 'diamond-outline';
      case 'Clothing': return 'shirt-outline';
      default: return 'help-circle-outline';
    }
  };

  const renderReportCard = ({ item }: { item: Item }) => {
    const isLost = item.type === 'lost';
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/details/${item.id}` as any)}
        activeOpacity={0.8}
      >
        {/* Left Side: Image / Fallback */}
        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} contentFit="cover" />
          ) : (
            <View style={styles.imageFallback}>
              <Ionicons name={getCategoryIcon(item.category)} size={24} color="#94A3B8" />
            </View>
          )}
        </View>

        {/* Center: Details */}
        <View style={styles.cardDetails}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.badge, isLost ? styles.badgeLost : styles.badgeFound]}>
              <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text style={styles.infoText} numberOfLines={1}>{item.location || 'Unknown Location'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.infoText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        {/* Right Side: Chevron */}
        <Ionicons name="chevron-forward" size={18} color="#9A2E17" style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#2D3436" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      {/* Reports List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#9A2E17" />
        </View>
      ) : reports.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Ionicons name="reader-outline" size={64} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Reports Found</Text>
          <Text style={styles.emptySubtitle}>You haven't reported any lost or found items yet.</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReportCard}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(154, 46, 23, 0.08)',
    backgroundColor: '#EFF6F6',
  },
  backBtn: {
    padding: 8,
  },
  backBtnPlaceholder: {
    width: 42,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: '#F1F5F9',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeLost: {
    backgroundColor: '#FEE2E2',
  },
  badgeFound: {
    backgroundColor: '#D1FAE5',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
});
