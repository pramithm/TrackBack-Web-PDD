import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/src/config/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { userService } from '@/src/services/userService';
import { Colors, CornerRadius, Shadows, Fonts } from '@/constants/theme';
import { connectivity } from '@/src/services/connectivity';
import { errorHelper } from '@/src/services/errorHelper';

// ─── Constants ────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 3;
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

// ─── Helper: Progress bar ──────────────────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.progressBar}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressSegment,
            i < step ? styles.segmentActive : styles.segmentInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SignupScreen() {
  const router = useRouter();
  const theme = Colors.light;

  // Wizard step (1–3)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1 — Basic Info
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2 — Account Details (Email & Password)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // ── Network check helper ────────────────────────────────────────────────────
  const ensureOnline = async (): Promise<boolean> => {
    const online = await connectivity.checkOnline();
    if (!online) {
      setError('No internet connection. Please check your network and try again.');
    }
    return online;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 Validation
  // ═══════════════════════════════════════════════════════════════════════════
  const handleStep1 = () => {
    clearMessages();
    if (!name.trim()) return setError('Please enter your full name.');
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 120)
      return setError('Please enter a valid age (13–120).');
    if (!gender) return setError('Please select your gender.');
    if (!location.trim()) return setError('Please enter your city or area.');
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length < 10) return setError('Please enter a valid phone number (at least 10 digits).');
    setStep(2);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 Validation
  // ═══════════════════════════════════════════════════════════════════════════
  const handleStep2 = () => {
    clearMessages();
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(trimmedEmail)) return setError('Please enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(password)) return setError('Password must include at least one uppercase letter.');
    if (!/[0-9]/.test(password)) return setError('Password must include at least one number.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setStep(3);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — Create Account & Trigger Verification
  // ═══════════════════════════════════════════════════════════════════════════
  const handleCreateAccount = async () => {
    clearMessages();
    setLoading(true);
    try {
      if (!(await ensureOnline())) return;

      const trimmedEmail = email.trim().toLowerCase();
      
      // 1. Create account in Firebase Auth
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      } catch (authErr: any) {
        console.error('[Signup] Auth error:', authErr);
        setError(errorHelper.getFriendlyMessage(authErr));
        setLoading(false);
        return;
      }

      const user = userCredential.user;

      // 2. Set default profile avatar
      const defaultAvatar = gender.toLowerCase() === 'female'
        ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundColor=ffd5dc`
        : `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;

      // 3. Write user profile info to RTDB (marked isProfileVerified as true)
      try {
        await userService.updateUserProfile(user.uid, {
          name: name.trim(),
          email: trimmedEmail,
          age: parseInt(age, 10),
          gender,
          location: location.trim(),
          phone: phone.trim(),
          phoneNumber: phone.trim(),
          photoURL: defaultAvatar,
          isProfileVerified: true,
          emailVerified: false,
          isEmailVerified: false,
          createdAt: new Date().toISOString(),
        });
      } catch (dbErr: any) {
        console.error('[Signup] DB profile save error:', dbErr);
        // Do not block signup if profile save fails, but log it
      }

      // 4. Send Firebase Email Verification
      try {
        await sendEmailVerification(user);
      } catch (emailErr: any) {
        console.error('[Signup] sendEmailVerification error:', emailErr);
        // Do not block user flow since they can resend from the email-verification screen
      }

      // Note: LayoutGuard will capture the auth status, notice emailVerified is false,
      // and redirect them to /(auth)/email-verification automatically.
    } catch (err: any) {
      console.error('[Signup] General signup error:', err);
      const friendlyMsg = errorHelper.getFriendlyMessage(err);
      setError(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const renderFeedback = () => (
    <>
      {!!error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={18} color="#D63031" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {!!success && !error && (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#00B894" />
          <Text style={styles.successText}>{success}</Text>
        </View>
      )}
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP RENDERERS
  // ═══════════════════════════════════════════════════════════════════════════

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepSubtitle}>Tell us a bit about yourself to get started.</Text>
      {renderFeedback()}

      {/* Full Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Full Name</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g. Jordan Smith"
            placeholderTextColor={theme.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
            accessibilityLabel="signup-name"
            testID="signup-name"
          />
        </View>
      </View>

      {/* Age */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Age</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="calendar-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Your age"
            placeholderTextColor={theme.textMuted}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={3}
            returnKeyType="next"
            accessibilityLabel="signup-age"
            testID="signup-age"
          />
        </View>
      </View>

      {/* Gender */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderGrid}>
          {GENDERS.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderOption, gender === g && styles.genderOptionActive]}
              onPress={() => setGender(g)}
              activeOpacity={0.7}
              accessibilityLabel={`gender-${g.toLowerCase().replace(/\s/g, '-')}`}
              testID={`gender-${g.toLowerCase().replace(/\s/g, '-')}`}
            >
              <Text style={[styles.genderOptionText, gender === g && styles.genderOptionTextActive]}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Location */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>City / Area</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="location-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g. New York"
            placeholderTextColor={theme.textMuted}
            value={location}
            onChangeText={setLocation}
            returnKeyType="next"
            accessibilityLabel="signup-location"
            testID="signup-location"
          />
        </View>
      </View>

      {/* Phone Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="call-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g. +1 (555) 000-0000"
            placeholderTextColor={theme.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="done"
            accessibilityLabel="signup-phone"
            testID="signup-phone"
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={handleStep1}
        activeOpacity={0.85}
        accessibilityLabel="step1-continue"
        testID="step1-continue"
      >
        <Text style={styles.primaryBtnText}>Continue</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Account Details</Text>
      <Text style={styles.stepSubtitle}>Enter your email and create a secure password.</Text>
      {renderFeedback()}

      {/* Email */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            placeholderTextColor={theme.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            accessibilityLabel="signup-email"
            testID="signup-email"
          />
        </View>
      </View>

      {/* Password */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="key-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { paddingRight: 48 }]}
            placeholder="Create a strong password"
            placeholderTextColor={theme.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            accessibilityLabel="signup-password"
            testID="signup-password"
          />
          <TouchableOpacity style={styles.toggleButton} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Password strength hints */}
      <View style={styles.strengthHints}>
        {[
          { label: 'At least 8 characters', ok: password.length >= 8 },
          { label: 'One uppercase letter', ok: /[A-Z]/.test(password) },
          { label: 'One number', ok: /[0-9]/.test(password) },
        ].map((hint) => (
          <View key={hint.label} style={styles.hintRow}>
            <Ionicons
              name={hint.ok ? 'checkmark-circle' : 'ellipse-outline'}
              size={15}
              color={hint.ok ? '#00B894' : theme.textMuted}
            />
            <Text style={[styles.hintText, hint.ok && styles.hintTextOk]}>{hint.label}</Text>
          </View>
        ))}
      </View>

      {/* Confirm Password */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { paddingRight: 48 }]}
            placeholder="Re-enter your password"
            placeholderTextColor={theme.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            accessibilityLabel="signup-confirm-password"
            testID="signup-confirm-password"
          />
          <TouchableOpacity style={styles.toggleButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={handleStep2}
        activeOpacity={0.85}
        accessibilityLabel="step2-continue"
        testID="step2-continue"
      >
        <Text style={styles.primaryBtnText}>Continue</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Review & Create Account</Text>
      <Text style={styles.stepSubtitle}>Everything looks good! Review your details below.</Text>
      {renderFeedback()}

      <View style={styles.reviewCard}>
        {[
          { icon: 'person-outline', label: 'Full Name', value: name },
          { icon: 'calendar-outline', label: 'Age', value: age },
          { icon: 'transgender-outline', label: 'Gender', value: gender },
          { icon: 'location-outline', label: 'Location', value: location },
          { icon: 'mail-outline', label: 'Email', value: email.trim().toLowerCase() },
          { icon: 'call-outline', label: 'Phone', value: phone },
        ].map((row) => (
          <View key={row.label} style={styles.reviewRow}>
            <Ionicons name={row.icon as any} size={18} color={theme.primary} style={styles.reviewIcon} />
            <View>
              <Text style={styles.reviewLabel}>{row.label}</Text>
              <Text style={styles.reviewValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, loading && styles.btnDisabled]}
        onPress={handleCreateAccount}
        disabled={loading}
        activeOpacity={0.85}
        accessibilityLabel="create-account-btn"
        testID="create-account-btn"
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="rocket-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>Create My Account</Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );

  const stepRenderers = [renderStep1, renderStep2, renderStep3];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            {step > 1 ? (
              <TouchableOpacity
                onPress={() => { clearMessages(); setStep(step - 1); }}
                style={styles.backBtn}
                accessibilityLabel="back-btn"
                testID="back-btn"
              >
                <Ionicons name="arrow-back" size={22} color={theme.text} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login' as any)}
                style={styles.backBtn}
                accessibilityLabel="to-login-btn"
                testID="to-login-btn"
              >
                <Ionicons name="arrow-back" size={22} color={theme.text} />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>Create Account</Text>
            <Text style={styles.headerStep}>{step}/{TOTAL_STEPS}</Text>
          </View>

          {/* Progress Bar */}
          <ProgressBar step={step} total={TOTAL_STEPS} />

          {/* Step Content */}
          <View style={styles.stepContent}>
            {stepRenderers[step - 1]?.()}
          </View>

          {/* Footer link to login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)} accessibilityLabel="go-to-login" testID="go-to-login">
              <Text style={styles.loginText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    ...Shadows.cards,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.headings.bold,
    color: Colors.light.text,
  },
  headerStep: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: Colors.light.textMuted,
    minWidth: 36,
    textAlign: 'right',
  },
  progressBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  segmentActive: {
    backgroundColor: Colors.light.primary,
  },
  segmentInactive: {
    backgroundColor: Colors.light.divider,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 26,
    fontFamily: Fonts.headings.bold,
    color: Colors.light.text,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 15,
    fontFamily: Fonts.body.regular,
    color: Colors.light.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  // Feedback
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(214, 48, 49, 0.08)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#D63031',
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    flex: 1,
    lineHeight: 20,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 184, 148, 0.08)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    color: '#00B894',
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    flex: 1,
    lineHeight: 20,
  },
  // Inputs
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: CornerRadius.inputs,
    height: 56,
    ...Shadows.cards,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Colors.light.text,
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    paddingRight: 16,
  },
  toggleButton: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  // Gender picker
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genderOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  genderOptionActive: {
    borderColor: Colors.light.primary,
    backgroundColor: `${Colors.light.primary}15`,
  },
  genderOptionText: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: Colors.light.textSecondary,
  },
  genderOptionTextActive: {
    color: Colors.light.primary,
  },
  // Password hints
  strengthHints: {
    gap: 6,
    marginTop: -8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintText: {
    fontSize: 13,
    fontFamily: Fonts.body.regular,
    color: Colors.light.textMuted,
  },
  hintTextOk: {
    color: '#00B894',
  },
  // Review card
  reviewCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: CornerRadius.cards,
    padding: 20,
    ...Shadows.cards,
    marginBottom: 16,
    gap: 14,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewIcon: {
    width: 24,
  },
  reviewLabel: {
    fontSize: 12,
    fontFamily: Fonts.body.semiBold,
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewValue: {
    fontSize: 15,
    fontFamily: Fonts.body.semiBold,
    color: Colors.light.text,
  },
  // Buttons
  primaryBtn: {
    height: 56,
    backgroundColor: Colors.light.primary,
    borderRadius: CornerRadius.buttons,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    ...Shadows.buttons,
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: Fonts.body.bold,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontFamily: Fonts.body.regular,
  },
  loginText: {
    color: Colors.light.primary,
    fontSize: 15,
    fontFamily: Fonts.body.bold,
  },
});
