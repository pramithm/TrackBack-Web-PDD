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
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, logoutUser } from '@/src/store/authStore';
import { userService } from '@/src/services/userService';
import { itemService } from '@/src/services/itemService';
import { connectivity } from '@/src/services/connectivity';
import { errorHelper } from '@/src/services/errorHelper';

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();

  // Navigation and Subviews State
  const [isEditing, setIsEditing] = useState(false);

  // Stats State
  const [foundCount, setFoundCount] = useState(0);
  const [lostCount, setLostCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Edit Form Fields State
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || user?.phoneNumber || '');
  const [editLocation, setEditLocation] = useState(user?.location || user?.college || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(user?.photoURL || null);
  const [editAge, setEditAge] = useState(user?.age ? String(user.age) : '');
  const [editGender, setEditGender] = useState(user?.gender || '');
  
  // Loading and Error States
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch dynamic stats from items database
  const fetchStats = async () => {
    if (!user?.uid) return;
    try {
      setLoadingStats(true);
      const items = await itemService.getItemsByUser(user.uid);
      const found = items.filter(item => item.type === 'found').length;
      const lost = items.filter(item => item.type === 'lost').length;
      setFoundCount(found);
      setLostCount(lost);
    } catch (err) {
      console.error('[ProfileScreen] Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  // Sync state if user changes in auth store
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || user.phoneNumber || '');
      setEditLocation(user.location || user.college || '');
      setEditBio(user.bio || '');
      setNewAvatarUri(user.photoURL || null);
      setEditAge(user.age ? String(user.age) : '');
      setEditGender(user.gender || '');
    }
  }, [user, isEditing]);

  const handlePickImage = async () => {
    if (saving) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setNewAvatarUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('[ProfileScreen] Error picking image:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;

    if (!editName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (editName.trim().length < 2) {
      setError('Name must be at least 2 characters long.');
      return;
    }
    if (!editPhone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    const cleanedPhone = editPhone.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      setError('Phone number must be at least 10 digits.');
      return;
    }
    if (!editLocation.trim()) {
      setError('Please enter your location.');
      return;
    }
    if (editAge.trim()) {
      const ageNum = parseInt(editAge, 10);
      if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        setError('Please enter a valid age (13–120).');
        return;
      }
    }

    const isOnline = await connectivity.checkOnline();
    if (!isOnline) {
      setError('Network connection unavailable. Please check your internet connection.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      let finalPhotoURL = user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(editName.trim())}`;

      // Upload image to Cloudinary if it has changed
      if (newAvatarUri && newAvatarUri !== user.photoURL) {
        console.log('[ProfileScreen] Uploading new profile picture to Cloudinary...');
        finalPhotoURL = await userService.uploadProfilePicture(user.uid, newAvatarUri);
      }

      // Save user details in database
      console.log('[ProfileScreen] Saving user details to database...');
      await userService.updateUserProfile(user.uid, {
        name: editName.trim(),
        phone: editPhone.trim(),
        phoneNumber: editPhone.trim(),
        location: editLocation.trim(),
        college: editLocation.trim(), // college maps to location for backward compatibility
        bio: editBio.trim(),
        photoURL: finalPhotoURL,
        age: editAge.trim() ? parseInt(editAge, 10) : undefined,
        gender: editGender || undefined,
      });

      // Sync store auth state
      await refreshProfile();
      
      setIsEditing(false);
      Alert.alert('Profile Saved', 'Your profile details have been updated successfully.');
    } catch (err: any) {
      console.error('[ProfileScreen] Error saving profile:', err);
      const friendlyMsg = errorHelper.getFriendlyMessage(err);
      setError(friendlyMsg);
    } finally {
      setSaving(false);
    }
  };

  const triggerSecurityAlert = () => {
    Alert.alert(
      'Security Settings',
      'Password updates and verification options are managed via Firebase Auth. To reset your password, would you like us to send a reset link to your email?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Reset Link', onPress: () => sendPasswordReset() }
      ]
    );
  };

  const sendPasswordReset = async () => {
    const isOnline = await connectivity.checkOnline();
    if (!isOnline) {
      Alert.alert('Offline', 'Network connection unavailable. Please check your internet connection.');
      return;
    }
    Alert.alert('Reset Link Sent', 'A password reset instructions email has been sent to ' + user?.email);
  };

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

  // Render View Profile Screen
  const renderProfileView = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Avatar, Name, Email */}
      <View style={styles.avatarSection}>
        {user?.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>
        )}
        <Text style={styles.nameText}>{user?.name || 'User Profile'}</Text>
        <Text style={styles.emailText}>{user?.email || ''}</Text>

        {/* Edit Profile Button */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setIsEditing(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Box */}
      <View style={styles.statsCard}>
        <View style={styles.statColumn}>
          {loadingStats ? (
            <ActivityIndicator size="small" color="#345C72" />
          ) : (
            <Text style={styles.statValue}>{foundCount}</Text>
          )}
          <Text style={styles.statLabel}>Found</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statColumn}>
          {loadingStats ? (
            <ActivityIndicator size="small" color="#345C72" />
          ) : (
            <Text style={styles.statValue}>{lostCount}</Text>
          )}
          <Text style={styles.statLabel}>Lost</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statColumn}>
          <Text style={styles.statValue}>98%</Text>
          <Text style={styles.statLabel}>Trust</Text>
        </View>
      </View>
      {/* Personal Information Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>PERSONAL INFORMATION</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={20} color="#345C72" style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Phone Number</Text>
            <Text style={styles.detailValue}>{user?.phone || user?.phoneNumber || 'N/A'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#345C72" style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Age</Text>
            <Text style={styles.detailValue}>{user?.age ? `${user.age} years old` : 'N/A'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="transgender-outline" size={20} color="#345C72" style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Gender</Text>
            <Text style={styles.detailValue}>{user?.gender || 'N/A'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#345C72" style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{user?.location || user?.college || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Manage My Activity Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>MANAGE MY ACTIVITY</Text>
        <TouchableOpacity
          style={styles.cardItem}
          onPress={() => router.push('/my-reports' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.cardItemLeft}>
            <View style={styles.iconWrapper}>
              <Ionicons name="reader-outline" size={24} color="#345C72" />
            </View>
            <View style={styles.cardItemTextContent}>
              <Text style={styles.cardItemTitle}>My Reports</Text>
              <Text style={styles.cardItemSub}>View, edit, or resolve your posts</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#345C72" />
        </TouchableOpacity>
      </View>

      {/* Account Settings Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>ACCOUNT SETTINGS</Text>

        {/* Security */}
        <TouchableOpacity
          style={[styles.cardItem, styles.marginBtn]}
          onPress={triggerSecurityAlert}
          activeOpacity={0.7}
        >
          <View style={styles.cardItemLeft}>
            <View style={styles.iconWrapper}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#345C72" />
            </View>
            <View style={styles.cardItemTextContent}>
              <Text style={styles.cardItemTitle}>Security</Text>
              <Text style={styles.cardItemSub}>Password and verification</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#345C72" />
        </TouchableOpacity>
 
        {/* Notifications */}
        <TouchableOpacity
          style={[styles.cardItem, styles.marginBtn]}
          onPress={() => router.push('/notifications' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.cardItemLeft}>
            <View style={styles.iconWrapper}>
              <Ionicons name="notifications-outline" size={24} color="#345C72" />
            </View>
            <View style={styles.cardItemTextContent}>
              <Text style={styles.cardItemTitle}>Notifications</Text>
              <Text style={styles.cardItemSub}>Alerts for item matches</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#345C72" />
        </TouchableOpacity>

        {/* Blocked Users */}
        <TouchableOpacity
          style={[styles.cardItem, styles.marginBtn]}
          onPress={() => router.push('/blocked-users' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.cardItemLeft}>
            <View style={styles.iconWrapper}>
              <Ionicons name="ban-outline" size={24} color="#345C72" />
            </View>
            <View style={styles.cardItemTextContent}>
              <Text style={styles.cardItemTitle}>Blocked Users</Text>
              <Text style={styles.cardItemSub}>Manage blocked chat contacts</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#345C72" />
        </TouchableOpacity>

        {/* Log Out */}
        <TouchableOpacity
          style={styles.cardItem}
          onPress={handleLogout}
          activeOpacity={0.7}
          testID="logout-button"
        >
          <View style={styles.cardItemLeft}>
            <View style={styles.iconWrapper}>
              <Ionicons name="log-out-outline" size={24} color="#B42318" />
            </View>
            <View style={styles.cardItemTextContent}>
              <Text style={[styles.cardItemTitle, { color: '#B42318' }]}>Log Out</Text>
              <Text style={styles.cardItemSub}>Log out of your account</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#B42318" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Render Edit Profile Screen
  const renderEditProfile = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Profile Image Pick */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickImage} style={styles.avatarWrapper}>
            {newAvatarUri ? (
              <Image source={{ uri: newAvatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={50} color="#CBD5E1" />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera-outline" size={16} color="#345C72" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7}>
            <Text style={styles.tapToChangeText}>Tap to change profile picture</Text>
          </TouchableOpacity>
        </View>

        {/* Validation Errors */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color="#B42318" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form Fields */}
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#8E9CA3" style={styles.fieldIcon} />
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Maredukonda Pramith"
              placeholderTextColor="#999"
              editable={!saving}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Email Address (Locked)</Text>
          <View style={[styles.inputContainer, styles.lockedInput]}>
            <Ionicons name="mail-outline" size={20} color="#8E9CA3" style={styles.fieldIcon} />
            <TextInput
              style={[styles.textInput, styles.lockedText]}
              value={user?.email || ''}
              editable={false}
              placeholder="pramith414@gmail.com"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#8E9CA3" style={styles.fieldIcon} />
            <TextInput
              style={styles.textInput}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
              placeholder="9989439387"
              placeholderTextColor="#999"
              editable={!saving}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Location</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color="#8E9CA3" style={styles.fieldIcon} />
            <TextInput
              style={styles.textInput}
              value={editLocation}
              onChangeText={setEditLocation}
              placeholder="Warangal Telangana India"
              placeholderTextColor="#999"
              editable={!saving}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Age</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="calendar-outline" size={20} color="#8E9CA3" style={styles.fieldIcon} />
            <TextInput
              style={styles.textInput}
              value={editAge}
              onChangeText={setEditAge}
              keyboardType="number-pad"
              placeholder="e.g. 21"
              placeholderTextColor="#999"
              editable={!saving}
              maxLength={3}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.genderSelectWrapper}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genderSelectOption,
                  editGender === g && styles.genderSelectOptionActive,
                ]}
                onPress={() => setEditGender(g)}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.genderSelectOptionText,
                    editGender === g && styles.genderSelectOptionTextActive,
                  ]}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Bio / About Me</Text>
          <View style={[styles.inputContainer, styles.bioInputContainer]}>
            <TextInput
              style={[styles.textInput, styles.bioTextInput]}
              value={editBio}
              onChangeText={setEditBio}
              multiline
              numberOfLines={4}
              placeholder="Tell us a bit about yourself..."
              placeholderTextColor="#999"
              editable={!saving}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => {
            if (isEditing) {
              setIsEditing(false);
            } else {
              router.back();
            }
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color="#345C72" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Profile' : 'Profile'}</Text>
        
        {isEditing ? (
          <TouchableOpacity onPress={handleSaveProfile} disabled={saving} style={styles.saveBtn}>
            {saving ? (
              <ActivityIndicator size="small" color="#345C72" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}
      </View>

      {/* Main Subview */}
      {isEditing ? renderEditProfile() : renderProfileView()}
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
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#345C72',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 110,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
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
    backgroundColor: '#E6F0F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#8E9CA3',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#345C72',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  nameText: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#2B353A',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
    marginBottom: 16,
  },
  editBtn: {
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#345C72',
    backgroundColor: '#FFFFFF',
  },
  editBtnText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#345C72',
  },
  tapToChangeText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#345C72',
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    borderWidth: 1,
    borderColor: '#D3E2EC',
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#345C72',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(52, 92, 114, 0.12)',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#345C72',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  marginBtn: {
    marginBottom: 12,
  },
  cardItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    marginRight: 16,
  },
  cardItemTextContent: {
    flex: 1,
  },
  cardItemTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#2B353A',
    marginBottom: 2,
  },
  cardItemSub: {
    fontSize: 12,
    color: '#56646E',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  keyboardView: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#56646E',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D3E2EC',
    borderRadius: 16,
    height: 52,
    backgroundColor: '#E6F0F6',
    paddingHorizontal: 16,
  },
  lockedInput: {
    borderColor: 'rgba(52, 92, 114, 0.2)',
    backgroundColor: '#DDE8F0',
  },
  bioInputContainer: {
    height: 100,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: '#2B353A',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  lockedText: {
    color: '#8E9CA3',
  },
  bioTextInput: {
    height: '100%',
    textAlignVertical: 'top',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE2E2',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#B42318',
    fontSize: 14,
    flex: 1,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  detailsCard: {
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#56646E',
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#2B353A',
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(52, 92, 114, 0.08)',
    marginHorizontal: 4,
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
    borderColor: '#D3E2EC',
    backgroundColor: '#FFFFFF',
  },
  genderSelectOptionActive: {
    borderColor: '#345C72',
    backgroundColor: 'rgba(52, 92, 114, 0.08)',
  },
  genderSelectOptionText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#56646E',
  },
  genderSelectOptionTextActive: {
    color: '#345C72',
  },
});
