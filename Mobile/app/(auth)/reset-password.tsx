import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/src/config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Colors, CornerRadius, Shadows, Fonts } from '@/constants/theme';
import { connectivity } from '@/src/services/connectivity';
import { errorHelper } from '@/src/services/errorHelper';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const theme = Colors.light;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
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

      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert(
        'Success',
        'Password reset link sent to your email.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login' as any)
          }
        ]
      );
    } catch (err: any) {
      console.error(err);
      const friendlyMsg = errorHelper.getFriendlyMessage(err);
      setError(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#D63031" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Form Field */}
          <View style={styles.form}>
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
                />
              </View>
            </View>

            {/* Send Reset Link Button */}
            <TouchableOpacity 
              style={styles.resetBtn} 
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.resetBtnText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Back Link */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login' as any)}>
              <Text style={styles.backLinkText}>Back to Log In</Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'center',
    paddingVertical: 40,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(52, 92, 114, 0.08)',
    marginBottom: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.headings.bold,
    color: Colors.light.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.light.textSecondary,
    lineHeight: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(214, 48, 49, 0.08)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  errorText: {
    color: '#D63031',
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    flex: 1,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 28,
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
  resetBtn: {
    height: 56,
    backgroundColor: Colors.light.primary,
    borderRadius: CornerRadius.buttons,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.buttons,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.body.bold,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  backLinkText: {
    color: Colors.light.primary,
    fontSize: 16,
    fontFamily: Fonts.body.bold,
  },
});
