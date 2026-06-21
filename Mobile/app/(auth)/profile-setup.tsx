import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, logoutUser } from '@/src/store/authStore';
import { userService } from '@/src/services/userService';
import { Colors, CornerRadius, Shadows, Fonts } from '@/constants/theme';
import { connectivity } from '@/src/services/connectivity';
import { errorHelper } from '@/src/services/errorHelper';

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function ProfileSetupScreen() {
  const { user, refreshProfile } = useAuth();
  const theme = Colors.light;
  
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [college, setCollege] = useState(user?.college || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.photoURL || null);
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [gender, setGender] = useState(user?.gender || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.name && !name) {
      setName(user.name);
    }
    if (user?.photoURL && !avatarUri) {
      setAvatarUri(user.photoURL);
    }
    if (user?.age && !age) {
      setAge(String(user.age));
    }
    if (user?.gender && !gender) {
      setGender(user.gender);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to upload profile pictures.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
    }
  };

  const handleSaveProfile = async () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedCollege = college.trim();
    const trimmedAge = age.trim();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }
    if (!trimmedPhone || trimmedPhone.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits).');
      return;
    }
    if (!trimmedCollege) {
      setError('Please enter your college or area.');
      return;
    }
    if (!trimmedAge) {
      setError('Please enter your age.');
      return;
    }
    const ageNum = parseInt(trimmedAge, 10);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      setError('Please enter a valid age (13–120).');
      return;
    }
    if (!gender) {
      setError('Please select your gender.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isOnline = await connectivity.checkOnline();
      if (!isOnline) {
        setError('Network connection unavailable. Please check your internet connection and try again.');
        setLoading(false);
        return;
      }

      let finalPhotoURL = user?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(trimmedName)}`;

      if (avatarUri && avatarUri !== user?.photoURL) {
        console.log('Uploading chosen avatar to Cloudinary...');
        try {
          finalPhotoURL = await userService.uploadProfilePicture(user!.uid, avatarUri);
        } catch (uploadErr) {
          throw new Error('Unable to upload image. Please try again.');
        }
      }

      console.log('Updating profile in Realtime Database...');
      await userService.updateUserProfile(user!.uid, {
        name: trimmedName,
        phone: trimmedPhone,
        phoneNumber: trimmedPhone,
        college: trimmedCollege,
        location: trimmedCollege, // location maps to college for backward compatibility
        age: ageNum,
        gender: gender,
        photoURL: finalPhotoURL,
        isProfileVerified: true,
      });

      console.log('Refreshing local authentication profile...');
      await refreshProfile();
      
      // RootLayout will automatically pick up the isProfileVerified change and redirect to (tabs)
    } catch (err: any) {
      console.error(err);
      const friendlyMsg = errorHelper.getFriendlyMessage(err);
      setError(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = async () => {
    // If they go back, we sign them out so they can log back in with another account
    await logoutUser();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Final Step</Text>
            <View style={{ width: 40 }} /> {/* Spacer to balance arrow back */}
          </View>

          {/* Progress Bar (3 segments — all active: this is the final step) */}
          <View style={styles.progressBar}>
            <View style={[styles.progressSegment, styles.segmentActive]} />
            <View style={[styles.progressSegment, styles.segmentActive]} />
            <View style={[styles.progressSegment, styles.segmentActive]} />
          </View>

          {/* Section title */}
          <Text style={styles.sectionTitle}>Upload Your Profile Picture</Text>
          <Text style={styles.sectionSubtitle}>This helps others recognize you. You can update it anytime.</Text>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={handlePickImage} style={styles.avatarWrapper}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={50} color={theme.textMuted} />
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={20} color="#D63031" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.textMuted}
                  value={name}
                  onChangeText={setName}
                />
                <Ionicons name="person-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor={theme.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <Ionicons name="call-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>College or Area</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Stanford University"
                  placeholderTextColor={theme.textMuted}
                  value={college}
                  onChangeText={setCollege}
                />
                <Ionicons name="location-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 21"
                  placeholderTextColor={theme.textMuted}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Ionicons name="calendar-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderSelectWrapper}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderSelectOption,
                      gender === g && styles.genderSelectOptionActive,
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text
                      style={[
                        styles.genderSelectOptionText,
                        gender === g && styles.genderSelectOptionTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={22} color={theme.primary} style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Your location helps us connect you with people in your immediate community to return lost items faster.
              </Text>
            </View>
          </View>

          {/* Save Profile Button */}
          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={handleSaveProfile}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Profile</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimerText}>
            By continuing, you agree to our community guidelines and privacy policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Fonts.headings.bold,
    color: Colors.light.text,
  },
  progressBar: {
    flexDirection: 'row',
    height: 6,
    gap: 8,
    marginVertical: 16,
  },
  progressSegment: {
    flex: 1,
    borderRadius: 3,
  },
  segmentActive: {
    backgroundColor: Colors.light.primary,
  },
  segmentInactive: {
    backgroundColor: Colors.light.divider,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: CornerRadius.cards,
    padding: 24,
    ...Shadows.cards,
    marginTop: 12,
    marginBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.light.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(214, 48, 49, 0.08)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    color: '#D63031',
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: CornerRadius.inputs,
    height: 56,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Colors.light.text,
    fontSize: 16,
    fontFamily: Fonts.body.regular,
  },
  inputIcon: {
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surfaceSecondary,
    padding: 16,
    borderRadius: CornerRadius.inputs,
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 12,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.body.regular,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  saveBtn: {
    height: 56,
    backgroundColor: Colors.light.primary,
    borderRadius: CornerRadius.buttons,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.buttons,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.body.bold,
  },
  disclaimerText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.light.textMuted,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: Fonts.headings.bold,
    color: Colors.light.text,
    marginBottom: 4,
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.light.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  genderSelectWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  genderSelectOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  genderSelectOptionActive: {
    borderColor: Colors.light.primary,
    backgroundColor: 'rgba(52, 92, 114, 0.08)',
  },
  genderSelectOptionText: {
    fontSize: 13,
    fontFamily: Fonts.body.semiBold,
    color: Colors.light.textSecondary,
  },
  genderSelectOptionTextActive: {
    color: Colors.light.primary,
  },
});
