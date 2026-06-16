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
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/store/authStore';
import { itemService, Item } from '@/src/services/itemService';
import { aiService, ExpectedQA } from '@/src/services/aiService';

const CATEGORIES = ['Electronics', 'Wallets', 'Keys', 'Bags', 'Pets', 'Documents', 'Jewelry', 'Clothing', 'Other'];

export default function FoundReportScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Step state: 1 = Home screen, 2 = Basic Details, 3 = Upload/AI Verify, 4 = Location/Time
  const [step, setStep] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  const [userReports, setUserReports] = useState<Item[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Electronics');
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // Verification questions (finder verification setup)
  const [questions, setQuestions] = useState<ExpectedQA[]>([
    { q: 'What is the brand of the item?', a: '' },
    { q: 'Are there any specific scratches or markings?', a: '' },
    { q: 'What is the primary color of the item?', a: '' }
  ]);

  // Screen 4 Location & Time Fields
  const [buildingName, setBuildingName] = useState('');
  const [floorRoom, setFloorRoom] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [autoAddress, setAutoAddress] = useState('22G8+CWH , Kuthambakkam, Tamil Nadu'); // default matching Figma
  const [dateFound, setDateFound] = useState('');
  const [timeFound, setTimeFound] = useState('');

  // AI Moderation & Verification States
  const [imageVerified, setImageVerified] = useState(false);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [moderationError, setModerationError] = useState('');
  const [questionsLoading, setQuestionsLoading] = useState(false);
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
    setDateFound(dateStr);
    setTimeFound(timeStr);
  }, []);

  // Fetch history when user requests history subview
  useEffect(() => {
    if (showHistory && user) {
      setHistoryLoading(true);
      itemService.getItemsByUser(user.uid)
        .then((items) => {
          const foundItems = items.filter(item => item.type === 'found');
          setUserReports(foundItems);
        })
        .catch((err) => {
          console.error('[FoundReportScreen] Error fetching history:', err);
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
        setImageVerified(false);
        setModerationError('');
      }
    } catch (err) {
      console.error('Error selecting image:', err);
    }
  };

  const handleVerifyImage = async () => {
    if (!imageUri) return;

    setModerationLoading(true);
    setModerationError('');
    setError('');

    try {
      console.log('[FoundReport] Launching Gemini Image moderation...');
      const res = await aiService.moderateImage(imageUri);
      
      if (res.verified) {
        setImageVerified(true);
        Alert.alert('Image Verified', 'The image is verified safe for publishing!');
      } else {
        setImageVerified(false);
        setModerationError(res.reason || 'Image is blocked by safety moderation rules (e.g. human face detected).');
      }
    } catch (err: any) {
      console.error(err);
      setModerationError('Image moderation analysis failed. Please try again.');
    } finally {
      setModerationLoading(false);
    }
  };

  const handleAutoGenerateQuestions = async () => {
    if (!imageUri) {
      Alert.alert('Photo Required', 'Please select and verify a photo first.');
      return;
    }
    if (!imageVerified) {
      Alert.alert('Verify Photo', 'Please click "Verify Image" to confirm the photo is safe before generating questions.');
      return;
    }

    setQuestionsLoading(true);
    try {
      console.log('[FoundReport] Requesting AI questions...');
      const generated = await aiService.generateQuestions(imageUri);
      if (generated && generated.length > 0) {
        setQuestions(generated);
      }
    } catch (err) {
      console.error('Failed to generate AI questions', err);
      Alert.alert('Error', 'Failed to generate questions. You can still input them manually.');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleQuestionChange = (index: number, field: 'q' | 'a', value: string) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    if (questions.length >= 5) {
      Alert.alert('Limit Reached', 'You can add a maximum of 5 questions.');
      return;
    }
    setQuestions([...questions, { q: '', a: '' }]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      Alert.alert('Required', 'At least one verification question is required.');
      return;
    }
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  const handleQuickSelect = (name: string, category: string) => {
    setTitle(name);
    setSelectedCategory(category);
  };

  const handleRemoveImage = () => {
    setImageUri(null);
    setImageVerified(false);
    setModerationError('');
  };

  const detectLocation = () => {
    if (Platform.OS === 'web') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            setLatitude(lat);
            setLongitude(lon);
            setAutoAddress(`Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`);
            Alert.alert('Location Detected', 'Your current GPS coordinates have been loaded.');
          },
          () => {
            Alert.alert('Location Error', 'Unable to fetch coordinates. Typing landmark is fine.');
          }
        );
      }
    } else {
      // Mocking native location detection for clean flow in simulator
      setLatitude(13.0034);
      setLongitude(80.0024);
      setAutoAddress('22G8+CWH , Kuthambakkam, Tamil Nadu');
      Alert.alert('Location Detected', 'GPS Location loaded: Kuthambakkam, Tamil Nadu');
    }
  };

  const handlePublishReport = async () => {
    if (!user) return;
    setPublishing(true);
    setError('');

    try {
      const locString = buildingName.trim() + (floorRoom.trim() ? `, ${floorRoom.trim()}` : '');
      const finalLocation = locString || autoAddress || 'Unknown location';
      
      const itemData = {
        title: title.trim(),
        type: 'found' as const,
        category: selectedCategory,
        description: `Found ${title.trim()} at ${finalLocation}.`,
        location: finalLocation,
        phoneNumber: user.phone || '9999999999',
        userId: user.uid,
        user: user.name || 'Anonymous User',
        image: imageUri || undefined,
        verificationQuestions: questions.filter(q => q.q.trim().length > 0 && q.a.trim().length > 0),
        date: dateFound + ' ' + timeFound
      };

      const result = await itemService.addItem(itemData);

      if (result.success) {
        Alert.alert('Success', 'Your found report has been successfully published!');
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
    setShowHistory(false);
    setImageUri(null);
    setImageVerified(false);
    setTitle('');
    setSelectedCategory('Electronics');
    setBuildingName('');
    setFloorRoom('');
    setQuestions([
      { q: 'What is the brand of the item?', a: '' },
      { q: 'Are there any specific scratches or markings?', a: '' },
      { q: 'What is the primary color of the item?', a: '' }
    ]);
    setModerationError('');
    setError('');
  };

  // Validation checks for Screen 3
  const isImageValid = imageVerified && imageUri !== null;
  const isQuestionsValid = questions.length > 0 && questions.every(q => q.q.trim().length > 0 && q.a.trim().length > 0);
  const isScreen3Valid = isImageValid && isQuestionsValid;

  const renderStepIndicator = () => {
    if (step === 1) return null;
    const totalSteps = 3;
    const currentIndicatorStep = step - 1; // Step 2 (Details) -> 1, Step 3 (Upload) -> 2, Step 4 (Location) -> 3
    const stepLabel = currentIndicatorStep === 1 ? 'Identity' : currentIndicatorStep === 2 ? 'Verification' : 'Location';

    return (
      <View style={styles.indicatorWrapper}>
        <View style={styles.stepHeaderRow}>
          <Text style={styles.stepIndicatorText}>Step {currentIndicatorStep} of {totalSteps}</Text>
          <Text style={styles.stepIndicatorLabel}>{stepLabel}</Text>
        </View>
        <View style={styles.stepIndicatorContainer}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.stepIndicatorSegment,
                i < currentIndicatorStep ? styles.indicatorSegmentActive : styles.indicatorSegmentInactive
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  if (showHistory) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtnHeader} onPress={() => setShowHistory(false)}>
            <Ionicons name="arrow-back" size={24} color="#9A2E17" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Found Reports</Text>
          <View style={{ width: 44 }} />
        </View>

        {historyLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#9A2E17" />
          </View>
        ) : userReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Published Reports</Text>
            <Text style={styles.emptySubtitle}>You haven't submitted any found item reports yet.</Text>
          </View>
        ) : (
          <FlatList
            data={userReports}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.historyThumb} contentFit="cover" />
                  ) : (
                    <View style={styles.historyThumbFallback}>
                      <Ionicons name="gift-outline" size={20} color="#94A3B8" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>{item.title}</Text>
                    <Text style={styles.historyMeta}>Category: {item.category} | {item.location}</Text>
                    <Text style={styles.historyDate}>Reported: {new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.headerBar}>
          {step > 1 && (
            <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtnHeader}>
              <Ionicons name="arrow-back" size={24} color="#9A2E17" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>
            {step === 1 ? 'Found Report' : 'Report Found Item'}
          </Text>
          {step > 1 ? (
            <TouchableOpacity onPress={resetForm} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
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

          {/* SCREEN 1: FOUND REPORT HOME */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.mainWelcomeTitle}>Found Something?</Text>
              <Text style={styles.mainWelcomeSubtitle}>
                Choose an option below to manage your found reports or create a new one.
              </Text>

              {/* Illustration */}
              <View style={styles.illustrationWrapper}>
                <Image
                  source={require('@/assets/images/bearded_man_illustration.png')}
                  style={styles.welcomeIllustration}
                  contentFit="contain"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.homeButtonsContainer}>
                <TouchableOpacity
                  style={styles.menuCard}
                  onPress={() => setStep(2)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="add" size={24} color="#9A2E17" />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>Create New Report</Text>
                    <Text style={styles.menuDesc}>Submit a new found item to the community</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuCard}
                  onPress={() => setShowHistory(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: '#FFF3EB' }]}>
                    <Ionicons name="list" size={24} color="#F27A35" />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>View History</Text>
                    <Text style={styles.menuDesc}>Check your previously uploaded found items</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>
              </View>

              {/* Bottom Info Note */}
              <View style={styles.infoNoteBox}>
                <Ionicons name="information-circle-outline" size={20} color="#636E72" />
                <Text style={styles.infoNoteText}>
                  Multiple reports allow you to track different items simultaneously.
                </Text>
              </View>
            </View>
          )}

          {/* SCREEN 2: BASIC ITEM DETAILS */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>What did you find?</Text>
              <Text style={styles.stepDesc}>
                Provide a few details to help the owner identify their lost belonging and bring it home safely.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Item Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Blue ink pen, keys, wallet"
                  placeholderTextColor="#94A3B8"
                  value={title}
                  onChangeText={(t) => { setTitle(t); setError(''); }}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Category</Text>
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

              {/* Quick Select Type Tag Buttons */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quick Select Type</Text>
                <View style={styles.tagsContainer}>
                  <TouchableOpacity
                    style={styles.tagBtn}
                    onPress={() => handleQuickSelect('Wallet', 'Wallets')}
                  >
                    <Text style={styles.tagText}>👛 wallet</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tagBtn}
                    onPress={() => handleQuickSelect('Phone', 'Electronics')}
                  >
                    <Text style={styles.tagText}>📱 phone</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tagBtn}
                    onPress={() => handleQuickSelect('Keys', 'Keys')}
                  >
                    <Text style={styles.tagText}>🔑 keys</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tagBtn}
                    onPress={() => handleQuickSelect('ID Card', 'Documents')}
                  >
                    <Text style={styles.tagText}>🪪 ID</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tagBtn}
                    onPress={() => handleQuickSelect('Bag', 'Bags')}
                  >
                    <Text style={styles.tagText}>👜 bag</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tagBtn}
                    onPress={() => handleQuickSelect('Laptop', 'Electronics')}
                  >
                    <Text style={styles.tagText}>💻 electronics</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bottom Card illustration */}
              <View style={styles.accuracyIllustrationCard}>
                <Image
                  source={require('@/assets/images/bearded_man_illustration.png')}
                  style={styles.accuracyIllustration}
                  contentFit="contain"
                />
                <Text style={styles.accuracyText}>Accuracy helps reuniting faster</Text>
              </View>
            </View>
          )}

          {/* SCREEN 3: UPLOAD AND VERIFY ITEM */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Upload Found Item Photo</Text>
              <Text style={styles.stepDesc}>
                A clear photo helps the owner identify their item quickly. Try to capture unique details or serial numbers.
              </Text>

              {/* Camera & Gallery Pickers */}
              <View style={styles.uploadButtonsRow}>
                <TouchableOpacity
                  style={styles.pickerBox}
                  onPress={() => handlePickImage(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera-outline" size={28} color="#9A2E17" />
                  <Text style={styles.pickerBoxText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pickerBox}
                  onPress={() => handlePickImage(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="image-outline" size={28} color="#9A2E17" />
                  <Text style={styles.pickerBoxText}>Gallery</Text>
                </TouchableOpacity>
              </View>

              {/* Selected Image Info & Verification */}
              {imageUri && (
                <View style={styles.uploadedContainer}>
                  <View style={styles.previewCard}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
                    {!moderationLoading && (
                      <TouchableOpacity style={styles.removeImageBtn} onPress={handleRemoveImage}>
                        <Ionicons name="trash" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.fileDetailRow}>
                    <Ionicons name="document-attach-outline" size={16} color="#475569" />
                    <Text style={styles.fileNameText} numberOfLines={1}>FoundItem_Photo.jpg</Text>
                    {imageVerified && <Ionicons name="checkmark-circle" size={16} color="#047857" style={{ marginLeft: 6 }} />}
                  </View>

                  {/* Verify Action Button */}
                  {!imageVerified ? (
                    <TouchableOpacity
                      style={[styles.verifyButton, moderationLoading && styles.btnDisabled]}
                      onPress={handleVerifyImage}
                      disabled={moderationLoading}
                    >
                      {moderationLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                          <Text style={styles.verifyButtonText}>Verify Image</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.verifiedSafeBadge}>
                      <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.verifiedSafeText}>Verified Safe</Text>
                    </View>
                  )}

                  {moderationError.length > 0 && (
                    <View style={[styles.aiStatusCard, styles.aiStatusError]}>
                      <Ionicons name="alert-circle" size={20} color="#B91C1C" style={{ marginRight: 8 }} />
                      <Text style={styles.aiStatusTextError}>{moderationError}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* VERIFICATION QUESTIONS */}
              <View style={styles.verificationQuestionsSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Verification Questions</Text>
                  {questionsLoading && <ActivityIndicator size="small" color="#9A2E17" />}
                </View>
                <Text style={styles.sectionSubtitle}>
                  Set questions to help confirm the owner's identity. At least one pair is required.
                </Text>

                {questions.map((q, idx) => (
                  <View key={idx} style={styles.questionSlotCard}>
                    <View style={styles.questionSlotHeader}>
                      <Text style={styles.questionSlotNum}>QUESTION {idx + 1}</Text>
                      {questions.length > 1 && (
                        <TouchableOpacity onPress={() => handleRemoveQuestion(idx)}>
                          <Ionicons name="close-circle" size={20} color="#D63031" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <TextInput
                      style={[styles.textInput, { marginBottom: 10, fontWeight: '600' }]}
                      placeholder="e.g. What is the brand of the item?"
                      placeholderTextColor="#94A3B8"
                      value={q.q}
                      onChangeText={(val) => handleQuestionChange(idx, 'q', val)}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Expected answer (e.g. Inxi, Parker, No markings)"
                      placeholderTextColor="#94A3B8"
                      value={q.a}
                      onChangeText={(val) => handleQuestionChange(idx, 'a', val)}
                    />
                  </View>
                ))}

                <View style={styles.questionsControlRow}>
                  <TouchableOpacity style={styles.addQuestionSlotBtn} onPress={handleAddQuestion}>
                    <Ionicons name="add" size={16} color="#9A2E17" style={{ marginRight: 4 }} />
                    <Text style={styles.addQuestionSlotText}>Add Question</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.autoQuestionsBtn}
                    onPress={handleAutoGenerateQuestions}
                    disabled={questionsLoading}
                  >
                    <Ionicons name="sparkles" size={16} color="#9A2E17" style={{ marginRight: 6 }} />
                    <Text style={styles.autoQuestionsText}>Auto-generate Questions</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Tips */}
              <View style={styles.tipsBox}>
                <View style={styles.tipsHeader}>
                  <Ionicons name="bulb-outline" size={18} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={styles.tipsTitle}>Quick Tips</Text>
                </View>
                <Text style={styles.tipBullet}>• Ensure good natural lighting.</Text>
                <Text style={styles.tipBullet}>• Include the brand or distinctive markings.</Text>
                <Text style={styles.tipBullet}>• Avoid photos with personal information visible.</Text>
              </View>
            </View>
          )}

          {/* SCREEN 4: LOCATION AND TIME DETAILS */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Found Location</Text>
              <Text style={styles.stepDesc}>
                We've auto-detected where you found the item. Please verify if this is correct.
              </Text>

              {/* Map Placeholder Viewport */}
              <View style={styles.mapCardViewport}>
                <View style={styles.mapActionsOverlay}>
                  <TouchableOpacity style={styles.mapOverlayBtn} onPress={detectLocation}>
                    <Ionicons name="pin" size={20} color="#2D3436" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mapOverlayBtn}>
                    <Ionicons name="map-outline" size={20} color="#2D3436" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Auto detect button */}
              <TouchableOpacity
                style={styles.autoDetectButton}
                onPress={detectLocation}
              >
                <Ionicons name="location-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.autoDetectButtonText}>Auto-detect my current location</Text>
              </TouchableOpacity>

              {/* Landmark Landmark Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Building Name / Landmark</Text>
                <View style={styles.iconInputRow}>
                  <Ionicons name="business-outline" size={20} color="#94A3B8" style={styles.inputFieldIcon} />
                  <TextInput
                    style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                    placeholder="e.g. Central Library"
                    placeholderTextColor="#94A3B8"
                    value={buildingName}
                    onChangeText={setBuildingName}
                  />
                </View>
              </View>

              {/* Floor/Room Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Floor / Room No.</Text>
                <View style={styles.iconInputRow}>
                  <Ionicons name="enter-outline" size={20} color="#94A3B8" style={styles.inputFieldIcon} />
                  <TextInput
                    style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                    placeholder="e.g. 2nd floor, Room 302"
                    placeholderTextColor="#94A3B8"
                    value={floorRoom}
                    onChangeText={setFloorRoom}
                  />
                </View>
              </View>

              {/* Auto Detected Location display */}
              <View style={styles.detectedLocationBox}>
                <View style={styles.detectedCircleIcon}>
                  <Ionicons name="location" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.detectedLabel}>Auto-detected Location</Text>
                  <Text style={styles.detectedAddress}>{autoAddress}</Text>
                </View>
                <TouchableOpacity onPress={detectLocation}>
                  <Text style={styles.changeAddressLink}>Change</Text>
                </TouchableOpacity>
              </View>

              {/* WHEN WAS IT FOUND */}
              <Text style={[styles.sectionTitle, { marginTop: 12, marginBottom: 12 }]}>WHEN WAS IT FOUND?</Text>
              
              <View style={styles.dateTimeRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Date Found</Text>
                  <View style={styles.iconInputRow}>
                    <Ionicons name="calendar-outline" size={18} color="#94A3B8" style={styles.inputFieldIcon} />
                    <TextInput
                      style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                      value={dateFound}
                      onChangeText={setDateFound}
                      placeholder="MM/DD/YYYY"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Approx. Time</Text>
                  <View style={styles.iconInputRow}>
                    <Ionicons name="time-outline" size={18} color="#94A3B8" style={styles.inputFieldIcon} />
                    <TextInput
                      style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                      value={timeFound}
                      onChangeText={setTimeFound}
                      placeholder="hh:mm A"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.notWhereIFoundBtn} onPress={detectLocation}>
                <Text style={styles.notWhereIFoundText}>This is not where I found it</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Swipe for steps indicators / footer */}
        {step > 1 && (
          <View style={styles.swipeHintContainer}>
            <Text style={styles.swipeHintText}>← Swipe for steps →</Text>
          </View>
        )}

        {/* Footer Actions */}
        {step > 1 && (
          <View style={styles.footerBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setStep(step - 1)}
              disabled={publishing}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>

            {step === 2 && (
              <TouchableOpacity
                style={[styles.nextBtn, !title.trim() && styles.btnDisabled]}
                onPress={() => {
                  if (!title.trim()) {
                    setError('Please enter an item title first.');
                    return;
                  }
                  setStep(3);
                }}
                disabled={!title.trim()}
              >
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}

            {step === 3 && (
              <TouchableOpacity
                style={[styles.nextBtn, !isScreen3Valid && styles.btnDisabled]}
                onPress={() => {
                  if (!isImageValid) {
                    setError('Please upload and verify the found item photo.');
                    return;
                  }
                  if (!isQuestionsValid) {
                    setError('Please fill in at least one verification question and answer.');
                    return;
                  }
                  setStep(4);
                }}
                disabled={!isScreen3Valid}
              >
                <Text style={styles.nextBtnText}>Confirm and Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}

            {step === 4 && (
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
        )}
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
  backBtnHeader: {
    padding: 6,
    marginRight: 8,
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
    color: '#9A2E17',
    fontWeight: '700',
    fontSize: 14,
  },
  indicatorWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepIndicatorText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  stepIndicatorLabel: {
    fontSize: 12,
    color: '#9A2E17',
    fontWeight: 'bold',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    height: 4,
    backgroundColor: '#E2E8F0',
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
    backgroundColor: '#9A2E17',
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
  mainWelcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  mainWelcomeSubtitle: {
    fontSize: 15,
    color: '#636E72',
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
    borderRadius: 20,
  },
  homeButtonsContainer: {
    gap: 16,
    marginBottom: 28,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
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
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 13,
    color: '#636E72',
  },
  infoNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 8,
  },
  infoNoteText: {
    fontSize: 12,
    color: '#636E72',
    flex: 1,
    lineHeight: 16,
  },
  stepTitle: {
    fontSize: 22,
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
    backgroundColor: '#9A2E17',
    borderColor: '#9A2E17',
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  accuracyIllustrationCard: {
    backgroundColor: '#E5EFF0',
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  accuracyIllustration: {
    width: '100%',
    height: 120,
    marginBottom: 10,
  },
  accuracyText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#475569',
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  pickerBox: {
    flex: 1,
    height: 90,
    borderWidth: 1.5,
    borderColor: '#9A2E17',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  pickerBoxText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#9A2E17',
  },
  uploadedContainer: {
    marginBottom: 24,
    gap: 12,
  },
  previewCard: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  fileNameText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  },
  verifyButton: {
    height: 44,
    backgroundColor: '#F28C38',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  verifiedSafeBadge: {
    height: 44,
    backgroundColor: '#10B981',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  verifiedSafeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  aiStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiStatusError: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  aiStatusTextError: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  verificationQuestionsSection: {
    marginTop: 12,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#636E72',
    marginBottom: 16,
  },
  questionSlotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  questionSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionSlotNum: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9A2E17',
    letterSpacing: 0.5,
  },
  questionsControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },
  addQuestionSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9A2E17',
  },
  addQuestionSlotText: {
    color: '#9A2E17',
    fontSize: 12,
    fontWeight: 'bold',
  },
  autoQuestionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9A2E17',
    backgroundColor: '#FFF5F5',
  },
  autoQuestionsText: {
    color: '#9A2E17',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tipsBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginTop: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D97706',
  },
  tipBullet: {
    fontSize: 13,
    color: '#B45309',
    lineHeight: 18,
    marginBottom: 4,
  },
  mapCardViewport: {
    height: 180,
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    marginBottom: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapActionsOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  mapOverlayBtn: {
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
    elevation: 3,
  },
  autoDetectButton: {
    height: 48,
    backgroundColor: '#9A2E17',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 20,
  },
  autoDetectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  iconInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputFieldIcon: {
    paddingHorizontal: 12,
  },
  detectedLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  detectedCircleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9A2E17',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectedLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  detectedAddress: {
    fontSize: 13,
    color: '#2D3436',
    fontWeight: 'bold',
    marginTop: 2,
  },
  changeAddressLink: {
    color: '#9A2E17',
    fontSize: 13,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  notWhereIFoundBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  notWhereIFoundText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  swipeHintContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  swipeHintText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  backBtn: {
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: 'bold',
  },
  nextBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#9A2E17',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  historyThumbFallback: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  historyMeta: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  historyDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  }
});
