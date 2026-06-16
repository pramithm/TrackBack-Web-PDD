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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/store/authStore';
import { itemService } from '@/src/services/itemService';

const CATEGORIES = ['Electronics', 'Wallets', 'Keys', 'Bags', 'Pets', 'Documents', 'Jewelry', 'Clothing', 'Other'];

export default function LostReportScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Electronics');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');

  // Publishing State
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  // Sync phone number when user profile loads
  useEffect(() => {
    if (user?.phone && !phoneNumber) {
      setPhoneNumber(user.phone);
    }
  }, [user]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need photo library permissions to upload an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
  };

  const detectLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
        },
        (err) => {
          console.log(err);
          Alert.alert('Location Error', 'Unable to fetch current location. Please type it manually.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      Alert.alert('Location Error', 'Geolocation services not supported. Please type location manually.');
    }
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      // Step 1: Image is optional for lost items, so we can proceed
      setStep(2);
    } else if (step === 2) {
      if (!title.trim()) {
        setError('Please enter an item title.');
        return;
      }
      if (!description.trim()) {
        setError('Please enter a description.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!location.trim()) {
        setError('Please enter a location.');
        return;
      }
      if (!phoneNumber.trim() || phoneNumber.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handlePublishReport = async () => {
    if (!user) return;
    setPublishing(true);
    setError('');

    try {
      const itemData = {
        title: title.trim(),
        type: 'lost' as const,
        category: selectedCategory,
        description: description.trim(),
        location: location.trim(),
        phoneNumber: phoneNumber.trim(),
        userId: user.uid,
        user: user.name || 'Anonymous User',
        image: imageUri || undefined,
      };

      const result = await itemService.addItem(itemData);

      if (result.success) {
        Alert.alert('Success', 'Your lost report has been successfully published!');
        // Reset form and navigate back to Home Feed index
        resetForm();
        router.replace('/(tabs)/' as any);
      } else {
        setError(result.error || 'Failed to submit report. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      setError('An error occurred during submission: ' + (err.message || err));
    } finally {
      setPublishing(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setImageUri(null);
    setTitle('');
    setSelectedCategory('Electronics');
    setDescription('');
    setLocation('');
    setPhoneNumber(user?.phone || '');
    setError('');
  };

  const renderStepIndicator = () => {
    const totalSteps = 4;
    return (
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
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Report Lost Item</Text>
          {step > 1 && (
            <TouchableOpacity onPress={resetForm} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderStepIndicator()}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {error.length > 0 && (
            <View style={styles.errorAlert}>
              <Ionicons name="alert-circle-outline" size={18} color="#D63031" style={{ marginRight: 8 }} />
              <Text style={styles.errorAlertText}>{error}</Text>
            </View>
          )}

          {/* STEP 1: UPLOAD IMAGE */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Step 1: Upload Photo (Optional)</Text>
              <Text style={styles.stepDesc}>
                Uploading an image of your lost item helps other users identify it much faster.
              </Text>

              {!imageUri ? (
                <TouchableOpacity style={styles.uploadBox} onPress={handlePickImage} activeOpacity={0.7}>
                  <Ionicons name="cloud-upload-outline" size={48} color="#F27A35" />
                  <Text style={styles.uploadBoxText}>Click to upload image</Text>
                  <Text style={styles.uploadBoxSubtext}>PNG, JPG or WEBP up to 5MB</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.previewCard}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={handleRemoveImage}>
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* STEP 2: DETAILS */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Step 2: Tell us about the item</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Item Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Black Leather Wallet"
                  placeholderTextColor="#94A3B8"
                  value={title}
                  onChangeText={(t) => { setTitle(t); setError(''); }}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryPill, isSelected ? styles.pillActive : styles.pillInactive]}
                        onPress={() => setSelectedCategory(cat)}
                      >
                        <Text style={[styles.pillText, isSelected ? styles.pillTextActive : styles.pillTextInactive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Describe unique details e.g. scratches, brand, keychains, contents..."
                  placeholderTextColor="#94A3B8"
                  value={description}
                  onChangeText={(d) => { setDescription(d); setError(''); }}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          )}

          {/* STEP 3: LOCATION & CONTACT */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Step 3: Where and how to reach?</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location / Last Seen Area</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Near CCD Cafe, Airport Terminal 1"
                  placeholderTextColor="#94A3B8"
                  value={location}
                  onChangeText={(l) => { setLocation(l); setError(''); }}
                />
                <TouchableOpacity style={styles.locationBtn} onPress={detectLocation}>
                  <Ionicons name="location" size={16} color="#F27A35" style={{ marginRight: 6 }} />
                  <Text style={styles.locationBtnText}>Detect My Location</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Mobile Number</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="#94A3B8"
                    value={phoneNumber}
                    onChangeText={(num) => { setPhoneNumber(num); setError(''); }}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>
            </View>
          )}

          {/* STEP 4: REVIEW & PUBLISH */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Step 4: Review & Publish</Text>
              
              <View style={styles.reviewCard}>
                {imageUri && (
                  <Image source={{ uri: imageUri }} style={styles.reviewImage} contentFit="cover" />
                )}
                
                <View style={styles.reviewContent}>
                  <View style={styles.reviewHeaderRow}>
                    <Text style={styles.reviewTitle}>{title}</Text>
                    <View style={styles.reviewTypeBadge}>
                      <Text style={styles.reviewTypeBadgeText}>LOST</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.reviewCategory}>Category: {selectedCategory}</Text>
                  
                  <View style={styles.reviewDivider} />
                  
                  <Text style={styles.reviewDescTitle}>DESCRIPTION</Text>
                  <Text style={styles.reviewDesc}>{description}</Text>

                  <View style={styles.reviewDivider} />

                  <View style={styles.reviewInfoRow}>
                    <Ionicons name="location-outline" size={16} color="#636E72" />
                    <Text style={styles.reviewInfoText}>Last Seen: {location}</Text>
                  </View>

                  <View style={styles.reviewInfoRow}>
                    <Ionicons name="call-outline" size={16} color="#636E72" />
                    <Text style={styles.reviewInfoText}>Contact: +91 {phoneNumber}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footerBar}>
          {step > 1 ? (
            <TouchableOpacity 
              style={styles.backBtn} 
              onPress={handlePrevStep}
              disabled={publishing}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {step < 4 ? (
            <TouchableOpacity 
              style={styles.nextBtn} 
              onPress={handleNextStep}
            >
              <Text style={styles.nextBtnText}>Next Step</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ) : (
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
                  <Text style={styles.nextBtnText}>Publish Report</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9A2E17',
  },
  resetBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resetBtnText: {
    color: '#F27A35',
    fontWeight: '700',
    fontSize: 14,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    height: 4,
    backgroundColor: '#E2E8F0',
    width: '100%',
  },
  stepIndicatorSegment: {
    flex: 1,
    height: '100%',
  },
  indicatorSegmentActive: {
    backgroundColor: '#F27A35',
  },
  indicatorSegmentInactive: {
    backgroundColor: '#E2E8F0',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorAlertText: {
    color: '#D63031',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
    marginBottom: 24,
  },
  uploadBox: {
    height: 200,
    borderWidth: 2,
    borderColor: '#F27A35',
    borderStyle: 'dashed',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadBoxText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginTop: 12,
  },
  uploadBoxSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  previewCard: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1A1A1A',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  pillTextInactive: {
    color: '#2D3436',
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFF5EB',
    borderWidth: 1,
    borderColor: '#FFE2CC',
  },
  locationBtnText: {
    color: '#F27A35',
    fontSize: 13,
    fontWeight: '600',
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countryCodeBox: {
    width: 64,
    height: 48,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#475569',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F1F5F9',
  },
  reviewContent: {
    padding: 16,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 12,
  },
  reviewTypeBadge: {
    backgroundColor: '#FFedd5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  reviewTypeBadgeText: {
    color: '#F27A35',
    fontSize: 10,
    fontWeight: '900',
  },
  reviewCategory: {
    fontSize: 13,
    color: '#636E72',
    fontWeight: '600',
    marginBottom: 12,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  reviewDescTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  reviewDesc: {
    fontSize: 14,
    color: '#2D3436',
    lineHeight: 20,
  },
  reviewInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  reviewInfoText: {
    fontSize: 13,
    color: '#636E72',
    fontWeight: '500',
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    height: 48,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: 'bold',
  },
  nextBtn: {
    height: 48,
    paddingHorizontal: 24,
    backgroundColor: '#F27A35',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
