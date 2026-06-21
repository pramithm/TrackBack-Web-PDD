import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/src/config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Colors, CornerRadius, Shadows, Fonts } from '@/constants/theme';
import { connectivity } from '@/src/services/connectivity';
import { errorHelper } from '@/src/services/errorHelper';

export default function LoginScreen() {
  const router = useRouter();
  const theme = Colors.light;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      setError('Please fill in all required fields.');
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

      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      // Auth state listener in authStore will trigger and redirect user automatically
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
          <View style={styles.header}>
            <Text style={styles.title} accessibilityLabel="welcome-title" testID="welcome-title">Welcome Back</Text>
            <Text style={styles.subtitle}>Log in to find your lost items</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer} accessibilityLabel="auth-error" testID="auth-error">
              <Ionicons name="alert-circle-outline" size={20} color="#D63031" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Email Field */}
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
                  accessibilityLabel="email-input"
                  testID="email-input"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingRight: 48 }]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureTextEntry}
                  autoCapitalize="none"
                  autoComplete="password"
                  accessibilityLabel="password-input"
                  testID="password-input"
                />
                <TouchableOpacity 
                  style={styles.toggleButton} 
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                >
                  <Text style={styles.monkeyEmoji}>{secureTextEntry ? '🙈' : '🐵'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity 
              style={styles.forgotContainer} 
              onPress={() => router.push('/(auth)/reset-password' as any)}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity 
              style={styles.loginBtn} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityLabel="login-button"
              testID="login-button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>Log In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Login (Mock) */}
          <TouchableOpacity 
            style={styles.googleBtn}
            onPress={() => alert('Google authentication is not configured for mobile locally.')}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color={theme.primary} />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity 
              onPress={() => router.push('/(auth)/signup' as any)}
              accessibilityLabel="signup-button"
              testID="signup-button"
            >
              <Text style={styles.signupText}>Sign Up</Text>
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
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.headings.bold,
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.light.textSecondary,
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
    position: 'relative',
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
  monkeyEmoji: {
    fontSize: 20,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: 28,
  },
  forgotText: {
    color: Colors.light.primary,
    fontFamily: Fonts.body.bold,
    fontSize: 14,
  },
  loginBtn: {
    height: 56,
    backgroundColor: Colors.light.primary,
    borderRadius: CornerRadius.buttons,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.buttons,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.body.bold,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.divider,
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.light.textMuted,
    fontFamily: Fonts.body.semiBold,
    fontSize: 14,
  },
  googleBtn: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: CornerRadius.buttons,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    ...Shadows.cards,
  },
  googleBtnText: {
    color: Colors.light.primary,
    fontSize: 16,
    fontFamily: Fonts.body.bold,
  },
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
  signupText: {
    color: Colors.light.primary,
    fontSize: 15,
    fontFamily: Fonts.body.bold,
  },
});
