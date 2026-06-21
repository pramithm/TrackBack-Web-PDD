import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/store/authStore';
import { itemService, Item } from '@/src/services/itemService';
import { connectivity } from '@/src/services/connectivity';
import { errorHelper } from '@/src/services/errorHelper';

const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF', border: '#CBD5E1' },
  { name: 'Silver', hex: '#E2E8F0', border: '#CBD5E1' },
  { name: 'Grey', hex: '#6B7280' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Yellow', hex: '#F59E0B' },
  { name: 'Brown', hex: '#78350F' },
  { name: 'Gold', hex: '#D97706' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Purple', hex: '#8B5CF6' }
];

const QUICK_CATEGORIES = [
  { id: 'wallet', name: 'wallet', icon: 'wallet-outline', iconBg: '#FFF1F2', iconColor: '#F43F5E' },
  { id: 'phone', name: 'phone', icon: 'phone-portrait-outline', iconBg: '#EEF2FF', iconColor: '#4F46E5' },
  { id: 'keys', name: 'keys', icon: 'key-outline', iconBg: '#FEF3C7', iconColor: '#D97706' },
  { id: 'ID', name: 'ID', icon: 'card-outline', iconBg: '#F3E8FF', iconColor: '#9333EA' },
  { id: 'bag', name: 'bag', icon: 'briefcase-outline', iconBg: '#FFF7ED', iconColor: '#C2410C' },
  { id: 'electronics', name: 'electronics', icon: 'laptop-outline', iconBg: '#ECFDF5', iconColor: '#059669' },
];

export default function LostReportScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // step: 0 = Home (Create New Report / View History), 1 to 5 = Lost wizard steps
  const [step, setStep] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [userReports, setUserReports] = useState<Item[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form Fields
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [description, setDescription] = useState('');
  const [uniqueIdentifier, setUniqueIdentifier] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Location & Time Fields
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [autoAddress, setAutoAddress] = useState('2G8+CWH , Kuthambakkam, Tamil Nadu'); // default matching Figma
  const [buildingName, setBuildingName] = useState('');
  const [floorRoom, setFloorRoom] = useState('');
  const [dateLost, setDateLost] = useState('');
  const [timeLost, setTimeLost] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');

  // UI Modals
  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  // Publishing State
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill date and time
  useEffect(() => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    const timeStr = today.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    setDateLost(dateStr);
    setTimeLost(timeStr);
  }, []);

  useEffect(() => {
    if (showHistory && user) {
      setHistoryLoading(true);
      setError('');
      itemService.getItemsByUser(user.uid)
        .then((items) => {
          const lostItems = items.filter(item => item.type === 'lost');
          setUserReports(lostItems);
        })
        .catch((err) => {
          console.error('[LostReportScreen] Error fetching history:', err);
          setError(errorHelper.getFriendlyMessage(err));
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    }
  }, [showHistory, user]);

  const handlePickImage = async (useCamera: boolean = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permissions are required to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Media library permissions are required to pick a photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0].uri) {
        setImageUri(result.assets[0].uri);
        setError('');
      }
    } catch (err) {
      console.error('Error selecting image:', err);
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
  };

  const detectLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lon } = position.coords;
          setLatitude(lat);
          setLongitude(lon);
          setAutoAddress('2G8+CWH , Kuthambakkam, Tamil Nadu');
          Alert.alert('Location Detected', 'GPS Location loaded: Kuthambakkam, Tamil Nadu');
        },
        (err) => {
          console.log(err);
          // Fallback to demo coordinates
          setLatitude(13.0118);
          setLongitude(79.9575);
          setAutoAddress('2G8+CWH , Kuthambakkam, Tamil Nadu');
          Alert.alert('Location Detected', 'GPS Location loaded: Kuthambakkam, Tamil Nadu');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      setLatitude(13.0118);
      setLongitude(79.9575);
      setAutoAddress('2G8+CWH , Kuthambakkam, Tamil Nadu');
      Alert.alert('Location Detected', 'GPS Location loaded: Kuthambakkam, Tamil Nadu');
    }
  };

  const handlePublishReport = async () => {
    if (!user) return;
    setPublishing(true);
    setError('');

    try {
      const isOnline = await connectivity.checkOnline();
      if (!isOnline) {
        setError('Network connection unavailable. Please check your internet connection and try again.');
        setPublishing(false);
        return;
      }

      const locString = buildingName.trim() + (floorRoom.trim() ? `, ${floorRoom.trim()}` : '');
      const finalLocation = locString || autoAddress || 'Unknown location';
      const categoryToSave = customCategory.trim() || selectedCategory;

      const itemData = {
        title: title.trim(),
        type: 'lost' as const,
        category: categoryToSave,
        color: selectedColor,
        uniqueIdentifier: uniqueIdentifier.trim(),
        description: description.trim() + (additionalDetails.trim() ? `\n\nAdditional Details: ${additionalDetails.trim()}` : ''),
        location: finalLocation,
        phoneNumber: user.phone || '9989439387',
        userId: user.uid,
        user: user.name || 'Anonymous User',
        image: imageUri || undefined,
        date: dateLost + ' ' + timeLost
      };

      const result = await itemService.addItem(itemData);

      if (result.success) {
        Alert.alert('Success', 'Your lost report has been successfully published!');
        resetForm();
        router.replace('/(tabs)/' as any);
      } else {
        setError(errorHelper.getFriendlyMessage(result.error));
      }
    } catch (err: any) {
      console.error(err);
      setError(errorHelper.getFriendlyMessage(err));
    } finally {
      setPublishing(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setShowHistory(false);
    setSelectedCategory('');
    setCustomCategory('');
    setTitle('');
    setSelectedColor('');
    setDescription('');
    setUniqueIdentifier('');
    setImageUri(null);
    setBuildingName('');
    setFloorRoom('');
    setAdditionalDetails('');
    setError('');
  };

  const getCategoryIcon = (categoryName: string): any => {
    const matched = QUICK_CATEGORIES.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    return matched ? matched.icon : 'help-circle-outline';
  };

  const renderStepIndicator = () => {
    if (step === 0) return null;
    const totalSteps = 5;
    const progressPercent = Math.round((step / totalSteps) * 100);
    
    return (
      <View style={styles.indicatorWrapper}>
        <View style={styles.stepHeaderRow}>
          <Text style={styles.stepIndicatorText}>STEP {step} OF {totalSteps}</Text>
          <Text style={styles.stepIndicatorLabel}>{progressPercent}% Complete</Text>
        </View>
        <View style={styles.stepIndicatorContainer}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.stepIndicatorSegment, 
                i + 1 <= step ? styles.indicatorSegmentActive : styles.indicatorSegmentInactive
              ]} 
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.headerBar}>
          {showHistory ? (
            <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.backBtnHeader}>
              <Ionicons name="arrow-back" size={24} color="#345C72" />
            </TouchableOpacity>
          ) : step > 0 ? (
            <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtnHeader}>
              <Ionicons name="arrow-back" size={24} color="#345C72" />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.headerTitle}>
            {showHistory ? 'History' : step > 0 ? 'Report Lost Item' : 'TrackBack'}
          </Text>
          {step > 0 && (
            <TouchableOpacity onPress={resetForm} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderStepIndicator()}

        {/* STEP 0: DASHBOARD / WELCOME HOME */}
        {step === 0 && !showHistory && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.mainWelcomeTitle}>Lost Something?</Text>
            <Text style={styles.mainWelcomeSubtitle}>
              Choose an option below to manage your lost reports or create a new one.
            </Text>

            <View style={styles.illustrationWrapper}>
              <Image 
                source={require('../../assets/images/bearded_man_illustration.png')} 
                style={styles.welcomeIllustration} 
                contentFit="contain" 
              />
            </View>

            <View style={styles.homeButtonsContainer}>
              <TouchableOpacity 
                style={styles.menuCard} 
                onPress={() => setStep(1)}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="add" size={24} color="#EF4444" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Create New Report</Text>
                  <Text style={styles.menuDesc}>Submit a new lost item to the community</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8E9CA3" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuCard} 
                onPress={() => setShowHistory(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="list-outline" size={24} color="#F97316" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>View History</Text>
                  <Text style={styles.menuDesc}>Check your previously uploaded lost items</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8E9CA3" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoNoteBox}>
              <Ionicons name="information-circle-outline" size={20} color="#636E72" />
              <Text style={styles.infoNoteText}>
                Multiple reports allow you to track different items simultaneously.
              </Text>
            </View>
          </ScrollView>
        )}

        {/* VIEW HISTORY LIST VIEW */}
        {showHistory && (
          <View style={{ flex: 1 }}>
            {historyLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#345C72" />
              </View>
            ) : userReports.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="archive-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No History Yet</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't reported any lost items yet. Once you do, they will appear here.
                </Text>
              </View>
            ) : (
              <FlatList
                data={userReports}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.historyCard}
                    onPress={() => {
                      router.push({
                        pathname: '/details/[id]',
                        params: { id: item.id }
                      } as any);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.historyCardHeader}>
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.historyThumb} contentFit="cover" />
                      ) : (
                        <View style={styles.historyThumbFallback}>
                          <Ionicons name={getCategoryIcon(item.category)} size={24} color="#8E9CA3" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyTitle}>{item.title}</Text>
                        <Text style={styles.historyMeta}>Category: {item.category}</Text>
                        <Text style={styles.historyDate}>Reported: {new Date(item.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#8E9CA3" />
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        {/* STEPPED WIZARD */}
        {step > 0 && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {error.length > 0 && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle-outline" size={18} color="#D63031" style={{ marginRight: 8 }} />
                <Text style={styles.errorAlertText}>{error}</Text>
              </View>
            )}

            {/* STEP 1: SELECT CATEGORY */}
            {step === 1 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Report Lost Item</Text>
                <Text style={styles.stepDesc}>
                  We're here to help you reunite with your belongings. First, let's identify what you've lost so we can narrow down the search.
                </Text>

                <Text style={[styles.inputLabel, { marginBottom: 12 }]}>Quick Select Category</Text>
                <View style={styles.categoryGrid}>
                  {QUICK_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase() && !customCategory;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryCard, 
                          isSelected && styles.categoryCardSelected
                        ]}
                        onPress={() => {
                          setSelectedCategory(cat.name);
                          setCustomCategory('');
                          setError('');
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.categoryCircle, { backgroundColor: cat.iconBg }]}>
                          <Ionicons name={cat.icon as any} size={22} color={cat.iconColor} />
                        </View>
                        <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={[styles.inputGroup, { marginTop: 24 }]}>
                  <TextInput
                     style={styles.customCategoryInput}
                    placeholder="Something else Type Here?"
                    placeholderTextColor="#8E9CA3"
                    value={customCategory}
                    onChangeText={(text) => {
                      setCustomCategory(text);
                      setSelectedCategory('');
                      setError('');
                    }}
                  />
                </View>
              </View>
            )}

            {/* STEP 2: ITEM DETAILS */}
            {step === 2 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Item Details</Text>
                <Text style={styles.stepDesc}>
                  Provide specific details to help our community identify and return your missing item.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Item Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Ear pods"
                    placeholderTextColor="#8E9CA3"
                    value={title}
                    onChangeText={(t) => { setTitle(t); setError(''); }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Color</Text>
                  <TouchableOpacity 
                    style={styles.colorPickerTrigger}
                    onPress={() => setColorPickerVisible(true)}
                  >
                    {selectedColor ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={[
                          styles.selectedColorCircle, 
                          { backgroundColor: COLORS.find(c => c.name === selectedColor)?.hex || '#CCCCCC' },
                          selectedColor === 'White' && { borderWidth: 1, borderColor: '#CBD5E1' }
                        ]} />
                        <Text style={styles.colorPickerText}>{selectedColor}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.colorPickerText, { color: '#8E9CA3' }]}>Pick Color</Text>
                    )}
                    <Ionicons name="chevron-forward" size={18} color="#8E9CA3" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Short Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Lost at library"
                    placeholderTextColor="#8E9CA3"
                    value={description}
                    onChangeText={(d) => { setDescription(d); setError(''); }}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.inputLabel}>Unique Identifier</Text>
                    <Text style={styles.mandatoryLabel}>Mandatory *</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Black mark on the item"
                    placeholderTextColor="#8E9CA3"
                    value={uniqueIdentifier}
                    onChangeText={(idText) => { setUniqueIdentifier(idText); setError(''); }}
                  />
                  <Text style={styles.helperText}>
                    This helps us verify ownership without publicly sharing sensitive info.
                  </Text>
                </View>

                <View style={[styles.infoNoteBox, { marginTop: 12 }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#D97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoNoteText, { fontWeight: 'bold', color: '#B45309' }]}>Privacy First</Text>
                    <Text style={styles.infoNoteText}>
                      Specific identifiers are only visible to verified community moderators during the match process.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* STEP 3: REFERENCE PHOTO */}
            {step === 3 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Add Reference Photo</Text>
                <Text style={styles.stepDesc}>
                  A photo helps the community identify your item more quickly and accurately.
                </Text>

                {!imageUri ? (
                  <View style={styles.uploadOptionsBox}>
                    <TouchableOpacity 
                      style={styles.pickerBox} 
                      onPress={() => handlePickImage(true)} 
                      activeOpacity={0.7}
                    >
                      <Ionicons name="camera-outline" size={36} color="#345C72" />
                      <Text style={styles.pickerBoxText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.pickerBox} 
                      onPress={() => handlePickImage(false)} 
                      activeOpacity={0.7}
                    >
                      <Ionicons name="image-outline" size={36} color="#345C72" />
                      <Text style={styles.pickerBoxText}>Upload Gallery</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.previewContainer}>
                    <View style={styles.previewImageCard}>
                      <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
                      <TouchableOpacity style={styles.removeImageBtn} onPress={handleRemoveImage}>
                        <Ionicons name="trash" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.verifiedSafeBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.verifiedSafeText}>Photo Added</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* STEP 4: CONTACT & LOST INFORMATION */}
            {step === 4 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Where did you lose it?</Text>
                <Text style={styles.stepDesc}>
                  Pinpointing the location helps us narrow down the search area with our community.
                </Text>

                {/* Map Viewport Placeholder */}
                <View style={styles.mapCardViewport}>
                  <View style={styles.mapActionsOverlay}>
                    <TouchableOpacity style={styles.mapOverlayBtn} onPress={detectLocation}>
                      <Ionicons name="pin" size={20} color="#2D3436" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="map-outline" size={40} color="#8E9CA3" />
                    <TouchableOpacity style={styles.selectOnMapBtn}>
                      <Ionicons name="map" size={14} color="#475569" style={{ marginRight: 4 }} />
                      <Text style={styles.selectOnMapText}>Select on map</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* GPS trigger */}
                <View style={styles.landmarkGroup}>
                  <Text style={styles.inputLabel}>Last Known Location</Text>
                  <View style={styles.detectedLocationBox}>
                    <Ionicons name="location" size={20} color="#345C72" style={{ marginRight: 8 }} />
                    <Text style={{ flex: 1, color: '#1A1A1A', fontSize: 14, fontWeight: '500' }} numberOfLines={2}>
                      {autoAddress}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.useCurrentLocationBtn} onPress={detectLocation}>
                    <Ionicons name="locate-outline" size={14} color="#345C72" style={{ marginRight: 4 }} />
                    <Text style={styles.useCurrentLocationText}>Use current location</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dateTimeRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Building Name</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Library"
                      placeholderTextColor="#8E9CA3"
                      value={buildingName}
                      onChangeText={setBuildingName}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Floor/Room</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="3rd floor"
                      placeholderTextColor="#8E9CA3"
                      value={floorRoom}
                      onChangeText={setFloorRoom}
                    />
                  </View>
                </View>

                <View style={styles.dateTimeRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Date Lost</Text>
                    <TextInput
                      style={styles.textInput}
                      value={dateLost}
                      onChangeText={setDateLost}
                      placeholder="10/24/2023"
                      placeholderTextColor="#8E9CA3"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Approx. Time</Text>
                    <TextInput
                      style={styles.textInput}
                      value={timeLost}
                      onChangeText={setTimeLost}
                      placeholder="02:30 PM"
                      placeholderTextColor="#8E9CA3"
                    />
                  </View>
                </View>

                {/* Pre-filled Contact Info */}
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.inputLabel}>Your Name</Text>
                    <View style={styles.verifiedTag}>
                      <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                      <Text style={styles.verifiedTagText}>Verified</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.disabledInput]}
                    value={user?.name || 'Maredukonda Pramith'}
                    editable={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.inputLabel}>Your Phone Number</Text>
                    <View style={styles.verifiedTag}>
                      <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                      <Text style={styles.verifiedTagText}>Verified</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.disabledInput]}
                    value={user?.phone || '9989439387'}
                    editable={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Additional Details (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea, { height: 80 }]}
                    placeholder="e.g. Near window bench..."
                    placeholderTextColor="#8E9CA3"
                    value={additionalDetails}
                    onChangeText={setAdditionalDetails}
                    multiline
                  />
                </View>
              </View>
            )}

            {/* STEP 5: FINAL REVIEW & PUBLISH */}
            {step === 5 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Final Review & Publish</Text>
                <Text style={styles.stepDesc}>
                  Double-check the details below before publishing your report to the community.
                </Text>

                <View style={styles.reviewCard}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.reviewImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.reviewImage, styles.reviewImageFallback]}>
                      <Ionicons name="images-outline" size={48} color="#8E9CA3" />
                      <Text style={{ color: '#8E9CA3', marginTop: 8, fontWeight: '700' }}>No Reference Photo</Text>
                    </View>
                  )}

                  <View style={styles.reviewContent}>
                    <Text style={styles.reviewSectionTitle}>ITEM DETAILS</Text>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Category</Text>
                      <Text style={styles.reviewValue}>{customCategory.trim() || selectedCategory}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Item Name</Text>
                      <Text style={styles.reviewValue}>{title}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Color</Text>
                      <Text style={styles.reviewValue}>{selectedColor || 'Not Specified'}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Description</Text>
                      <Text style={styles.reviewValue}>{description}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Unique Identifier</Text>
                      <Text style={[styles.reviewValue, { color: '#345C72', fontWeight: 'bold' }]}>
                        {uniqueIdentifier}
                      </Text>
                    </View>

                    <View style={styles.reviewDivider} />

                    <Text style={styles.reviewSectionTitle}>LOCATION & TIME</Text>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Lost Location</Text>
                      <Text style={styles.reviewValue}>
                        {[autoAddress, buildingName, floorRoom].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Lost Date & Time</Text>
                      <Text style={styles.reviewValue}>{dateLost} at {timeLost}</Text>
                    </View>

                    <View style={styles.reviewDivider} />

                    <Text style={styles.reviewSectionTitle}>CONTACT DETAILS</Text>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Reporter Name</Text>
                      <Text style={styles.reviewValue}>{user?.name || 'Maredukonda Pramith'}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Phone Number</Text>
                      <Text style={styles.reviewValue}>+91 {user?.phone || '9989439387'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* STEPPER ACTION FOOTER */}
        {step > 0 && (
          <View style={styles.footerBar}>
            <TouchableOpacity 
              style={styles.backBtn} 
              onPress={() => {
                setError('');
                if (step === 1) {
                  setStep(0);
                } else {
                  setStep(step - 1);
                }
              }}
              disabled={publishing}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>

            {step === 1 && (
              <TouchableOpacity 
                style={[
                  styles.nextBtn, 
                  (!selectedCategory && !customCategory.trim()) && styles.btnDisabled
                ]} 
                onPress={() => {
                  if (!selectedCategory && !customCategory.trim()) {
                    setError('Please select a category or type a custom one.');
                    return;
                  }
                  setStep(2);
                }}
                disabled={!selectedCategory && !customCategory.trim()}
              >
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}

            {step === 2 && (
              <TouchableOpacity 
                style={[
                  styles.nextBtn, 
                  (!title.trim() || !uniqueIdentifier.trim()) && styles.btnDisabled
                ]} 
                onPress={() => {
                  if (!title.trim()) {
                    setError('Please enter item name.');
                    return;
                  }
                  if (!uniqueIdentifier.trim()) {
                    setError('Unique Identifier is mandatory.');
                    return;
                  }
                  setStep(3);
                }}
                disabled={!title.trim() || !uniqueIdentifier.trim()}
              >
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}

            {step === 3 && (
              <View style={{ flex: 1, flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                {!imageUri && (
                  <TouchableOpacity 
                    style={[styles.backBtn, { borderWidth: 0 }]} 
                    onPress={() => {
                      setError('');
                      setStep(4);
                    }}
                  >
                    <Text style={[styles.backBtnText, { color: '#345C72' }]}>Skip for now</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.nextBtn, !imageUri && styles.btnDisabled]} 
                  onPress={() => {
                    if (!imageUri) {
                      setError('Please upload a photo or tap Skip.');
                      return;
                    }
                    setStep(4);
                  }}
                  disabled={!imageUri}
                >
                  <Text style={styles.nextBtnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            )}

            {step === 4 && (
              <TouchableOpacity 
                style={styles.nextBtn} 
                onPress={() => {
                  setStep(5);
                }}
              >
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}

            {step === 5 && (
              <TouchableOpacity 
                style={[styles.nextBtn, { backgroundColor: '#10B981' }]} 
                onPress={handlePublishReport}
                disabled={publishing}
              >
                {publishing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.nextBtnText}>Publish Lost Report</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* COLOR PICKER MODAL */}
        <Modal
          visible={colorPickerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setColorPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Color</Text>
                <TouchableOpacity onPress={() => setColorPickerVisible(false)}>
                  <Ionicons name="close" size={24} color="#475569" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.colorGrid}>
                {COLORS.map((col) => (
                  <TouchableOpacity
                    key={col.name}
                    style={styles.colorCell}
                    onPress={() => {
                      setSelectedColor(col.name);
                      setColorPickerVisible(false);
                      setError('');
                    }}
                  >
                    <View style={[
                      styles.colorBadge, 
                      { backgroundColor: col.hex },
                      col.border ? { borderWidth: 1, borderColor: col.border } : null
                    ]} />
                    <Text style={styles.colorNameLabel}>{col.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EEF5',
    backgroundColor: '#FFFFFF',
  },
  backBtnHeader: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#345C72',
  },
  resetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resetBtnText: {
    color: '#345C72',
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
  },
  indicatorWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EEF5',
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepIndicatorText: {
    fontSize: 11,
    color: '#8E9CA3',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  stepIndicatorLabel: {
    fontSize: 12,
    color: '#345C72',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    height: 4,
    backgroundColor: '#E6F0F6',
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
    gap: 4,
  },
  stepIndicatorSegment: {
    flex: 1,
    height: '100%',
  },
  indicatorSegmentActive: {
    backgroundColor: '#345C72',
  },
  indicatorSegmentInactive: {
    backgroundColor: '#E6F0F6',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE2E2',
    padding: 12,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE2E2',
  },
  errorAlertText: {
    color: '#B42318',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  mainWelcomeTitle: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
    marginBottom: 8,
  },
  mainWelcomeSubtitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#56646E',
    lineHeight: 22,
    marginBottom: 24,
  },
  illustrationWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  welcomeIllustration: {
    width: '100%',
    height: 220,
    borderRadius: 24,
  },
  homeButtonsContainer: {
    gap: 16,
    marginBottom: 28,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D3E2EC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#2B353A',
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#56646E',
  },
  infoNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0F6',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D3E2EC',
    gap: 8,
  },
  infoNoteText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#56646E',
    flex: 1,
    lineHeight: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#56646E',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#2B353A',
    marginBottom: 8,
  },
  mandatoryLabel: {
    fontSize: 12,
    color: '#8E9CA3',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  textInput: {
    backgroundColor: '#E6F0F6',
    borderWidth: 1,
    borderColor: '#D3E2EC',
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#2B353A',
  },
  disabledInput: {
    backgroundColor: '#DDE8F0',
    color: '#8E9CA3',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D3E2EC',
  },
  categoryCardSelected: {
    borderColor: '#345C72',
    borderWidth: 2,
    backgroundColor: '#E0ECF4',
  },
  categoryCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#56646E',
    textTransform: 'capitalize',
  },
  categoryNameSelected: {
    color: '#345C72',
  },
  customCategoryInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D3E2EC',
    borderStyle: 'dashed',
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#2B353A',
    textAlign: 'center',
  },
  colorPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E6F0F6',
    borderWidth: 1,
    borderColor: '#D3E2EC',
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 16,
  },
  colorPickerText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#2B353A',
  },
  selectedColorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#8E9CA3',
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 6,
  },
  uploadOptionsBox: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  pickerBox: {
    flex: 1,
    height: 120,
    borderWidth: 1.5,
    borderColor: '#345C72',
    borderStyle: 'dashed',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pickerBoxText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#345C72',
  },
  previewContainer: {
    gap: 16,
  },
  previewImageCard: {
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E6F0F6',
    borderWidth: 1,
    borderColor: '#D3E2EC',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(43, 53, 58, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedSafeBadge: {
    height: 44,
    backgroundColor: '#E1EEDD',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  verifiedSafeText: {
    color: '#566252',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  mapCardViewport: {
    height: 180,
    backgroundColor: '#E6F0F6',
    borderRadius: 24,
    marginBottom: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D3E2EC',
  },
  mapActionsOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  mapOverlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  selectOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#D3E2EC',
    marginTop: 8,
  },
  selectOnMapText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#56646E',
  },
  landmarkGroup: {
    marginBottom: 20,
  },
  detectedLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D3E2EC',
    marginBottom: 8,
  },
  useCurrentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  useCurrentLocationText: {
    fontSize: 12,
    color: '#345C72',
    fontFamily: 'PlusJakartaSans-Bold',
    textDecorationLine: 'underline',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedTagText: {
    fontSize: 12,
    color: '#566252',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D3E2EC',
  },
  reviewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E6F0F6',
  },
  reviewContent: {
    padding: 20,
  },
  reviewImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewSectionTitle: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#8E9CA3',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 6,
  },
  reviewRow: {
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 12,
    color: '#8E9CA3',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  reviewValue: {
    fontSize: 14,
    color: '#2B353A',
    fontFamily: 'PlusJakartaSans-Bold',
    marginTop: 2,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#E3EEF5',
    marginVertical: 14,
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E3EEF5',
    backgroundColor: '#FFFFFF',
    gap: 12,
    marginBottom: Platform.OS === 'ios' ? 100 : 84,
  },
  backBtn: {
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D3E2EC',
  },
  backBtnText: {
    color: '#56646E',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  nextBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#345C72',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  btnDisabled: {
    backgroundColor: '#DDE8F0',
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
    paddingBottom: 80,
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
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#56646E',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
  },
  historyCard: {
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
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyThumb: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  historyThumbFallback: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#E6F0F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 15,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
  },
  historyMeta: {
    fontSize: 12,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 2,
  },
  historyDate: {
    fontSize: 11,
    color: '#8E9CA3',
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 2,
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
    width: '85%',
    maxHeight: '70%',
    padding: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 20,
  },
  colorCell: {
    width: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0F6',
    borderWidth: 1,
    borderColor: '#D3E2EC',
    borderRadius: 16,
    padding: 10,
    gap: 10,
  },
  colorBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorNameLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#56646E',
  }
});
