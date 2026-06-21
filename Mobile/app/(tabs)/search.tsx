import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, logoutUser } from '@/src/store/authStore';
import { itemService, Item } from '@/src/services/itemService';
import { requestService } from '@/src/services/requestService';
import { connectivity } from '@/src/services/connectivity';
import { errorHelper } from '@/src/services/errorHelper';

interface CategoryConfig {
  id: string;
  name: string;
  dbCategories: string[];
  icon: string;
  color: string;
  bgColor: string;
}

const CATEGORY_LIST: CategoryConfig[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    dbCategories: ['Electronics'],
    icon: 'hardware-chip-outline',
    color: '#345C72',
    bgColor: '#E6F0F6',
  },
  {
    id: 'wallets_bags',
    name: 'Wallets & Bags',
    dbCategories: ['Wallets', 'Bags', 'Wallets & Purses'],
    icon: 'briefcase-outline',
    color: '#566252',
    bgColor: '#E1EEDD',
  },
  {
    id: 'keys',
    name: 'Keys',
    dbCategories: ['Keys'],
    icon: 'key-outline',
    color: '#665D53',
    bgColor: '#F3E5D8',
  },
  {
    id: 'pets',
    name: 'Pets',
    dbCategories: ['Pets'],
    icon: 'paw-outline',
    color: '#A56A00',
    bgColor: '#FFF4D8',
  },
  {
    id: 'documents',
    name: 'Documents',
    dbCategories: ['Documents'],
    icon: 'document-text-outline',
    color: '#4682B4',
    bgColor: '#E2EEF8',
  },
  {
    id: 'jewelry',
    name: 'Jewelry',
    dbCategories: ['Jewelry'],
    icon: 'diamond-outline',
    color: '#7C5454',
    bgColor: '#FFD6D6',
  },
  {
    id: 'clothing',
    name: 'Clothing',
    dbCategories: ['Clothing'],
    icon: 'shirt-outline',
    color: '#2E5B70',
    bgColor: '#EBF4F8',
  },
  {
    id: 'other',
    name: 'Other',
    dbCategories: ['Other'],
    icon: 'help-circle-outline',
    color: '#8E9CA3',
    bgColor: '#F0F5FA',
  },
];

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryConfig | null>(null);
  const [selectedType, setSelectedType] = useState<'both' | 'lost' | 'found'>('both');
  const [pendingCount, setPendingCount] = useState(0);

  // Real-time subscription to items database
  useEffect(() => {
    console.log('[SearchScreen] Subscribing to items feed...');
    const unsubscribe = itemService.subscribeToItems((fetchedItems) => {
      setItems(fetchedItems);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    console.log('[SearchScreen] Subscribing to incoming claim requests count...');
    const unsubscribe = requestService.listenToRequests('incoming', (fetchedRequests) => {
      const pending = fetchedRequests.filter(req => req.status === 'pending');
      setPendingCount(pending.length);
    });
    return unsubscribe;
  }, [user]);

  // Compute item counts for each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; lost: number; found: number }> = {};
    
    // Initialize counts
    CATEGORY_LIST.forEach(cat => {
      counts[cat.id] = { total: 0, lost: 0, found: 0 };
    });

    items.forEach(item => {
      const catConfig = CATEGORY_LIST.find(cat =>
        cat.dbCategories.some(
          dbCat => dbCat.toLowerCase() === (item.category || '').toLowerCase()
        )
      ) || CATEGORY_LIST.find(cat => cat.id === 'other');

      if (catConfig) {
        counts[catConfig.id].total += 1;
        if (item.type === 'lost') {
          counts[catConfig.id].lost += 1;
        } else if (item.type === 'found') {
          counts[catConfig.id].found += 1;
        }
      }
    });

    return counts;
  }, [items]);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of TrackBack?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            const isOnline = await connectivity.checkOnline();
            if (!isOnline) {
              Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection.');
              return;
            }
            try {
              await logoutUser();
            } catch (err: any) {
              const friendlyMsg = errorHelper.getFriendlyMessage(err);
              Alert.alert('Error', 'Failed to log out: ' + friendlyMsg);
            }
          }
        }
      ]
    );
  };

  // Filter items based on search text, category config, and type
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesType = selectedType === 'both' || item.type === selectedType;
      if (!matchesType) return false;

      if (selectedCategory) {
        const matchesCategory = selectedCategory.dbCategories.some(
          dbCat => dbCat.toLowerCase() === (item.category || '').toLowerCase()
        );
        if (selectedCategory.id === 'other') {
          const matchedAnyOther = CATEGORY_LIST.filter(c => c.id !== 'other').some(c =>
            c.dbCategories.some(
              dbCat => dbCat.toLowerCase() === (item.category || '').toLowerCase()
            )
          );
          if (!matchesCategory && matchedAnyOther) return false;
        } else if (!matchesCategory) {
          return false;
        }
      }

      if (searchText.trim().length > 0) {
        const queryStr = searchText.toLowerCase();
        const titleMatch = (item.title || '').toLowerCase().includes(queryStr);
        const descMatch = (item.description || '').toLowerCase().includes(queryStr);
        const locMatch = (item.location || '').toLowerCase().includes(queryStr);
        const catMatch = (item.category || '').toLowerCase().includes(queryStr);
        return titleMatch || descMatch || locMatch || catMatch;
      }

      return true;
    });
  }, [items, selectedCategory, searchText, selectedType]);

  const isSearchActive = searchText.trim().length > 0 || selectedCategory !== null;

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedCategory(null);
    setSelectedType('both');
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const renderCategoryCard = ({ item: cat }: { item: CategoryConfig }) => {
    const count = categoryCounts[cat.id] || { total: 0, lost: 0, found: 0 };
    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => setSelectedCategory(cat)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: cat.bgColor }]}>
          <Ionicons name={cat.icon as any} size={24} color={cat.color} />
        </View>
        <Text style={styles.categoryName}>{cat.name}</Text>
        <Text style={styles.categoryCount}>
          {count.total === 0
            ? 'No reports'
            : `${count.total} ${count.total === 1 ? 'Report' : 'Reports'}`}
        </Text>
        {count.total > 0 && (
          <Text style={styles.categorySubCount}>
            {count.lost > 0 ? `${count.lost} Lost` : ''}
            {count.lost > 0 && count.found > 0 ? ' • ' : ''}
            {count.found > 0 ? `${count.found} Found` : ''}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderResultCard = ({ item }: { item: Item }) => {
    const isLost = item.type === 'lost';
    const catConfig = CATEGORY_LIST.find(c =>
      c.dbCategories.some(
        dbCat => dbCat.toLowerCase() === (item.category || '').toLowerCase()
      )
    ) || CATEGORY_LIST.find(c => c.id === 'other');
    const iconName = catConfig ? catConfig.icon : 'help-circle-outline';

    return (
      <View style={styles.resultCard}>
        <View style={styles.resultCardHeader}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.resultCardImage} contentFit="cover" />
          ) : (
            <View style={styles.resultCardFallback}>
              <Ionicons name={iconName as any} size={40} color="#8E9CA3" />
              <Text style={styles.resultFallbackText}>{item.category}</Text>
            </View>
          )}

          {/* Type Badge */}
          <View style={[styles.badge, isLost ? styles.badgeLost : styles.badgeFound]}>
            <Text style={[styles.badgeText, isLost ? styles.badgeTextLost : styles.badgeTextFound]}>
              {isLost ? 'LOST ITEM' : 'FOUND ITEM'}
            </Text>
          </View>
        </View>

        <View style={styles.resultCardBody}>
          <Text style={styles.resultCardTitle} numberOfLines={1}>{item.title}</Text>
          
          <View style={styles.resultInfoRow}>
            <Ionicons name="location-outline" size={14} color="#56646E" />
            <Text style={styles.resultInfoText} numberOfLines={1}>
              {item.location || 'Unknown Location'}
            </Text>
          </View>

          <View style={styles.resultInfoRow}>
            <Ionicons name="time-outline" size={14} color="#56646E" />
            <Text style={styles.resultInfoText}>
              {formatDate(item.createdAt)}
            </Text>
          </View>

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
            <Ionicons name="notifications-outline" size={24} color="#56646E" />
            {pendingCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="ellipsis-vertical" size={24} color="#56646E" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar Input Container */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#8E9CA3" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search title, description, location..."
            placeholderTextColor="#8E9CA3"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={18} color="#8E9CA3" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#345C72" />
        </View>
      ) : !isSearchActive ? (
        /* CATEGORIES SCREEN STATE */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          
          <FlatList
            data={CATEGORY_LIST}
            renderItem={renderCategoryCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContainer}
          />
        </ScrollView>
      ) : (
        /* SEARCH RESULTS STATE */
        <View style={styles.resultsContainer}>
          {/* Header row with breadcrumb / result counts */}
          <View style={styles.resultsHeader}>
            <View style={styles.resultsHeaderLeft}>
              <TouchableOpacity 
                style={styles.backBtn}
                onPress={() => setSelectedCategory(null)}
              >
                <Ionicons name="arrow-back" size={20} color="#345C72" />
              </TouchableOpacity>
              <View>
                <Text style={styles.resultsTitle}>
                  {selectedCategory ? selectedCategory.name : 'Search Results'}
                </Text>
                <Text style={styles.resultsSubtitle}>
                  {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClearFilters} style={styles.clearFiltersBtn}>
              <Text style={styles.clearFiltersText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Filters: Type selector */}
          <View style={styles.typeFilterRow}>
            {(['both', 'lost', 'found'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeFilterPill,
                  selectedType === type ? styles.typeFilterPillActive : styles.typeFilterPillInactive
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text 
                  style={[
                    styles.typeFilterText, 
                    selectedType === type ? styles.typeFilterTextActive : styles.typeFilterTextInactive
                  ]}
                >
                  {type === 'both' ? 'All Items' : type === 'lost' ? 'Lost' : 'Found'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Result cards list */}
          {filteredItems.length === 0 ? (
            <View style={styles.emptyResults}>
              <Ionicons name="search-outline" size={54} color="#8E9CA3" />
              <Text style={styles.emptyResultsTitle}>No matching items</Text>
              <Text style={styles.emptyResultsSubtitle}>
                Try typing a different keyword or removing the filters.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              renderItem={renderResultCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.resultsListContent}
              showsVerticalScrollIndicator={false}
            />
          )}
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EEF5',
    backgroundColor: '#FFFFFF',
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D3E2EC',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#345C72',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#345C72',
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F5FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3EEF5',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0F6',
    borderWidth: 1,
    borderColor: '#D3E2EC',
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#2B353A',
    height: '100%',
    padding: 0,
  },
  clearIcon: {
    padding: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 110,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
    marginBottom: 16,
  },
  gridContainer: {
    gap: 12,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D3E2EC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#2B353A',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Medium',
  },
  categorySubCount: {
    fontSize: 11,
    color: '#8E9CA3',
    marginTop: 2,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  resultsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D3E2EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
  },
  resultsSubtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#56646E',
  },
  clearFiltersBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearFiltersText: {
    color: '#345C72',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  typeFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  typeFilterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  typeFilterPillActive: {
    backgroundColor: '#E0ECF4',
    borderColor: '#345C72',
  },
  typeFilterPillInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D3E2EC',
  },
  typeFilterText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  typeFilterTextActive: {
    color: '#345C72',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  typeFilterTextInactive: {
    color: '#56646E',
  },
  emptyResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 110,
  },
  emptyResultsTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyResultsSubtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#56646E',
    textAlign: 'center',
    lineHeight: 20,
  },
  resultsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#D3E2EC',
  },
  resultCardHeader: {
    height: 150,
    backgroundColor: '#E6F0F6',
    position: 'relative',
  },
  resultCardImage: {
    width: '100%',
    height: '100%',
  },
  resultCardFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultFallbackText: {
    color: '#8E9CA3',
    marginTop: 8,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeLost: {
    backgroundColor: '#FFD6D6',
    borderColor: '#EABABA',
  },
  badgeFound: {
    backgroundColor: '#E1EEDD',
    borderColor: '#C7D7BF',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.8,
  },
  badgeTextLost: {
    color: '#7C5454',
  },
  badgeTextFound: {
    color: '#566252',
  },
  resultCardBody: {
    padding: 16,
  },
  resultCardTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
    marginBottom: 8,
  },
  resultInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  resultInfoText: {
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
  },
  detailsBtn: {
    height: 42,
    backgroundColor: '#345C72',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#345C72',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  detailsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
  },
});
