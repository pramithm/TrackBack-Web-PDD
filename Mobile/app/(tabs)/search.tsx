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
    color: '#F27A35',
    bgColor: '#FFF3EB',
  },
  {
    id: 'wallets_bags',
    name: 'Wallets & Bags',
    dbCategories: ['Wallets', 'Bags', 'Wallets & Purses'],
    icon: 'briefcase-outline',
    color: '#10B981',
    bgColor: '#E6FBF3',
  },
  {
    id: 'keys',
    name: 'Keys',
    dbCategories: ['Keys'],
    icon: 'key-outline',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
  },
  {
    id: 'pets',
    name: 'Pets',
    dbCategories: ['Pets'],
    icon: 'paw-outline',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
  {
    id: 'documents',
    name: 'Documents',
    dbCategories: ['Documents'],
    icon: 'document-text-outline',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  },
  {
    id: 'jewelry',
    name: 'Jewelry',
    dbCategories: ['Jewelry'],
    icon: 'diamond-outline',
    color: '#EC4899',
    bgColor: '#FDF2F8',
  },
  {
    id: 'clothing',
    name: 'Clothing',
    dbCategories: ['Clothing'],
    icon: 'shirt-outline',
    color: '#06B6D4',
    bgColor: '#ECFEFF',
  },
  {
    id: 'other',
    name: 'Other',
    dbCategories: ['Other'],
    icon: 'help-circle-outline',
    color: '#6B7280',
    bgColor: '#F3F4F6',
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

  // Real-time subscription to items database
  useEffect(() => {
    console.log('[SearchScreen] Subscribing to items feed...');
    const unsubscribe = itemService.subscribeToItems((fetchedItems) => {
      setItems(fetchedItems);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Compute item counts for each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; lost: number; found: number }> = {};
    
    // Initialize counts
    CATEGORY_LIST.forEach(cat => {
      counts[cat.id] = { total: 0, lost: 0, found: 0 };
    });

    items.forEach(item => {
      // Find which category config this item belongs to
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

  // Handle Logout context menu
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

  // Filter items based on search text, category config, and type
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Type Filter
      const matchesType = selectedType === 'both' || item.type === selectedType;
      if (!matchesType) return false;

      // 2. Category Filter
      if (selectedCategory) {
        const matchesCategory = selectedCategory.dbCategories.some(
          dbCat => dbCat.toLowerCase() === (item.category || '').toLowerCase()
        );
        // Fallback for "Other" category to catch unmatched categories in database
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

      // 3. Search Text Filter
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
          <Ionicons name={cat.icon as any} size={28} color={cat.color} />
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
    // Get appropriate category icon
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
              <Ionicons name={iconName as any} size={40} color="#94A3B8" />
              <Text style={styles.resultFallbackText}>{item.category}</Text>
            </View>
          )}

          {/* Type Badge */}
          <View style={[styles.badge, isLost ? styles.badgeLost : styles.badgeFound]}>
            <Text style={styles.badgeText}>
              {isLost ? 'LOST ITEM' : 'FOUND ITEM'}
            </Text>
          </View>
        </View>

        <View style={styles.resultCardBody}>
          <Text style={styles.resultCardTitle} numberOfLines={1}>{item.title}</Text>
          
          <View style={styles.resultInfoRow}>
            <Ionicons name="location-outline" size={14} color="#636E72" />
            <Text style={styles.resultInfoText} numberOfLines={1}>
              {item.location || 'Unknown Location'}
            </Text>
          </View>

          <View style={styles.resultInfoRow}>
            <Ionicons name="time-outline" size={14} color="#636E72" />
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
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="notifications-outline" size={24} color="#2D3436" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="ellipsis-vertical" size={24} color="#2D3436" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar Input Container */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search title, description, location..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#9A2E17" />
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
                <Ionicons name="arrow-back" size={20} color="#9A2E17" />
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
              <Ionicons name="search-outline" size={54} color="#94A3B8" />
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
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
    paddingTop: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
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
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1.5,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '500',
  },
  categorySubCount: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
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
    paddingBottom: 10,
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
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  resultsSubtitle: {
    fontSize: 13,
    color: '#636E72',
  },
  clearFiltersBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearFiltersText: {
    color: '#9A2E17',
    fontSize: 14,
    fontWeight: '700',
  },
  typeFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  typeFilterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeFilterPillActive: {
    backgroundColor: '#9A2E17',
    borderColor: '#9A2E17',
  },
  typeFilterPillInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  typeFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  typeFilterTextActive: {
    color: '#FFFFFF',
  },
  typeFilterTextInactive: {
    color: '#2D3436',
  },
  emptyResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyResultsSubtitle: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 20,
  },
  resultsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultCardHeader: {
    height: 150,
    backgroundColor: '#F1F5F9',
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
  resultCardBody: {
    padding: 16,
  },
  resultCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  resultInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  resultInfoText: {
    color: '#636E72',
    fontSize: 13,
  },
  detailsBtn: {
    height: 42,
    backgroundColor: '#9A2E17',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  detailsBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
