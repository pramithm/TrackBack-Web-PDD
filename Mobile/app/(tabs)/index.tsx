import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Modal, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, logoutUser } from '@/src/store/authStore';
import { itemService, Item } from '@/src/services/itemService';
import { requestService } from '@/src/services/requestService';

const CATEGORIES = ['All', 'Electronics', 'Wallets', 'Keys', 'Bags', 'Pets', 'Documents', 'Jewelry', 'Clothing', 'Other'];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Sort States
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<'both' | 'lost' | 'found'>('both');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Report Modal States
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingItem, setReportingItem] = useState<Item | null>(null);
  const [reportReason, setReportReason] = useState('Spam / Fake Post');

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    console.log('[HomeScreen] Subscribing to items feed...');
    const unsubscribe = itemService.subscribeToItems((fetchedItems) => {
      setItems(fetchedItems);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    console.log('[HomeScreen] Subscribing to incoming claim requests count...');
    const unsubscribe = requestService.listenToRequests('incoming', (fetchedRequests) => {
      const pending = fetchedRequests.filter(req => req.status === 'pending');
      setPendingCount(pending.length);
    });
    return unsubscribe;
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of TrackBack?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: async () => await logoutUser() }
      ]
    );
  };

  const submitReport = async () => {
    if (!reportingItem) return;
    try {
      const res = await itemService.reportItem(
        reportingItem.id,
        reportingItem.title,
        reportingItem.type,
        reportReason,
        'Reported from mobile home feed.'
      );
      if (res.success) {
        Alert.alert('Report Submitted', 'Thank you. We will investigate this report shortly.');
      } else {
        Alert.alert('Error', res.error || 'Failed to submit report.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to report.');
    } finally {
      setReportModalVisible(false);
      setReportingItem(null);
    }
  };

  // Filter and Sort items
  const filteredItems = items
    .filter(item => {
      const matchesType = selectedType === 'both' || item.type === selectedType;
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesType && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return b.createdAt - a.createdAt;
      } else {
        return a.createdAt - b.createdAt;
      }
    });

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

  const renderItemCard = ({ item }: { item: Item }) => {
    const isLost = item.type === 'lost';
    
    return (
      <View style={styles.card}>
        {/* Card Image Header */}
        <View style={styles.cardHeader}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.cardImage} contentFit="cover" />
          ) : (
            <View style={styles.cardImageFallback}>
              <Ionicons name={getCategoryIcon(item.category)} size={48} color="#94A3B8" />
              <Text style={styles.fallbackText}>{item.category}</Text>
            </View>
          )}

          {/* Type Badge */}
          <View style={[styles.badge, isLost ? styles.badgeLost : styles.badgeFound]}>
            <Text style={styles.badgeText}>
              {isLost ? 'LOST ITEM' : 'FOUND ITEM'}
            </Text>
          </View>

          {/* Floating Report Fraud Button */}
          <TouchableOpacity 
            style={styles.reportBtn} 
            onPress={() => {
              setReportingItem(item);
              setReportModalVisible(true);
            }}
          >
            <Ionicons name="shield-outline" size={18} color="#D63031" />
          </TouchableOpacity>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          
          {/* Location Info */}
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#636E72" />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.location || 'Unknown Location'}
            </Text>
          </View>

          {/* Date Info */}
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#636E72" />
            <Text style={styles.infoText}>
              {formatDate(item.createdAt)}
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity 
            style={styles.detailsBtn}
            onPress={() => router.push(`/details/${item.id}` as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.detailsBtnText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleLogout} style={styles.avatarWrapper}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{user?.name?.charAt(0) || 'U'}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TrackBack</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => router.push('/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={24} color="#2D3436" />
            {pendingCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="ellipsis-vertical" size={24} color="#2D3436" />
          </TouchableOpacity>
        </View>
      </View>

      {/* subheader for filters and title */}
      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>Recent Reports</Text>
        <TouchableOpacity 
          style={styles.filterBtn}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options-outline" size={24} color="#9A2E17" />
        </TouchableOpacity>
      </View>

      {/* Feed List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#9A2E17" />
        </View>
      ) : filteredItems.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Reports Found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your filters or checking back later.</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItemCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FILTER MODAL SHEET */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={28} color="#2D3436" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetContent}>
              {/* Report Type */}
              <View style={styles.sheetSection}>
                <Text style={styles.sectionLabel}>Report Type</Text>
                <View style={styles.pillsRow}>
                  {(['both', 'lost', 'found'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.pill,
                        selectedType === type ? styles.pillActive : styles.pillInactive,
                      ]}
                      onPress={() => setSelectedType(type)}
                    >
                      <Text style={[styles.pillText, selectedType === type ? styles.pillTextActive : styles.pillTextInactive]}>
                        {type === 'both' ? 'Both' : type === 'lost' ? 'Lost Items' : 'Found Items'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Categories */}
              <View style={styles.sheetSection}>
                <Text style={styles.sectionLabel}>Categories</Text>
                <View style={styles.pillsWrap}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.pill,
                        selectedCategory === cat ? styles.pillActive : styles.pillInactive,
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={[styles.pillText, selectedCategory === cat ? styles.pillTextActive : styles.pillTextInactive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sort By */}
              <View style={styles.sheetSection}>
                <Text style={styles.sectionLabel}>Sort By</Text>
                <View style={styles.sortCard}>
                  <TouchableOpacity 
                    style={styles.sortOption}
                    onPress={() => setSortBy('newest')}
                  >
                    <Text style={[styles.sortText, sortBy === 'newest' && styles.sortTextActive]}>Newest First</Text>
                    {sortBy === 'newest' && <Ionicons name="checkmark" size={20} color="#F27A35" />}
                  </TouchableOpacity>
                  <View style={styles.sortDivider} />
                  <TouchableOpacity 
                    style={styles.sortOption}
                    onPress={() => setSortBy('oldest')}
                  >
                    <Text style={[styles.sortText, sortBy === 'oldest' && styles.sortTextActive]}>Oldest First</Text>
                    {sortBy === 'oldest' && <Ionicons name="checkmark" size={20} color="#F27A35" />}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.sheetActions}>
              <TouchableOpacity 
                style={styles.resetBtn}
                onPress={() => {
                  setSelectedType('both');
                  setSelectedCategory('All');
                  setSortBy('newest');
                }}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.applyBtn}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* REPORT MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Report Item</Text>
            <Text style={styles.dialogSubtitle}>
              Please select the reason you want to report "{reportingItem?.title}":
            </Text>

            <View style={styles.reasonsList}>
              {['Spam / Fake Post', 'Inappropriate Content', 'Fraud Attempt', 'Item Already Returned'].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={styles.reasonOption}
                  onPress={() => setReportReason(reason)}
                >
                  <View style={styles.radioOuter}>
                    {reportReason === reason && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.reasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.dialogActions}>
              <TouchableOpacity 
                style={styles.dialogCancel}
                onPress={() => {
                  setReportModalVisible(false);
                  setReportingItem(null);
                }}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dialogReport}
                onPress={submitReport}
              >
                <Text style={styles.dialogReportText}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  avatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#9A2E17',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#9A2E17',
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    padding: 4,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  subTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    height: 180,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#94A3B8',
    marginTop: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
  },
  badgeLost: {
    backgroundColor: '#F27A35',
  },
  badgeFound: {
    backgroundColor: '#9A2E17',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  reportBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    color: '#636E72',
    fontSize: 14,
  },
  detailsBtn: {
    height: 48,
    backgroundColor: '#9A2E17',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  detailsBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sheetSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: '#F27A35',
    borderColor: '#F27A35',
  },
  pillInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  pillTextInactive: {
    color: '#2D3436',
  },
  sortCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sortText: {
    fontSize: 15,
    color: '#2D3436',
    fontWeight: '500',
  },
  sortTextActive: {
    color: '#F27A35',
    fontWeight: 'bold',
  },
  sortDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resetBtn: {
    flex: 1,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#9A2E17',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#9A2E17',
    fontSize: 16,
    fontWeight: 'bold',
  },
  applyBtn: {
    flex: 2,
    height: 52,
    backgroundColor: '#9A2E17',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dialogBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  dialogSubtitle: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
    marginBottom: 20,
  },
  reasonsList: {
    gap: 12,
    marginBottom: 24,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9A2E17',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9A2E17',
  },
  reasonText: {
    fontSize: 15,
    color: '#2D3436',
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  dialogCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dialogCancelText: {
    color: '#636E72',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dialogReport: {
    backgroundColor: '#D63031',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  dialogReportText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
