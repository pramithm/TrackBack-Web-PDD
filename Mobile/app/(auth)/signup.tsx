import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/src/config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { userService } from '@/src/services/userService';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;
      
      // Initialize the user profile in the RTDB
      await userService.updateUserProfile(uid, {
        name: name.trim(),
        email: email.trim(),
        isProfileVerified: false,
        createdAt: new Date().toISOString()
      });

      // Redirection to profile setup happens automatically via RootLayout because user is authenticated but not profile verified.
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'An error occurred during account creation.';
      if (errMsg.includes('auth/email-already-in-use')) {
        errMsg = 'This email is already registered.';
      } else if (errMsg.includes('auth/invalid-email')) {
        errMsg = 'Please enter a valid email address.';
      } else if (errMsg.includes('auth/weak-password')) {
        errMsg = 'Password is too weak. Use at least 6 characters.';
      }
      setError(errMsg.replace('Firebase:', '').trim());
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join TrackBack to find and return items</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#D63031" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Full Name Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#636E72" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  accessibilityLabel="signup-name"
                  testID="signup-name"
                />
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#636E72" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
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

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color="#636E72" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingRight: 48 }]}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureTextEntry}
                  autoCapitalize="none"
                  autoComplete="password"
                  accessibilityLabel="signup-password"
                  testID="signup-password"
                />
                <TouchableOpacity 
                  style={styles.toggleButton} 
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                >
                  <Text style={styles.monkeyEmoji}>{secureTextEntry ? '🙈' : '🐵'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity 
              style={styles.signupBtn} 
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityLabel="signup-submit-btn"
              testID="signup-submit-btn"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.signupBtnText}>Sign Up</Text>
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
            <Ionicons name="logo-google" size={20} color="#9A2E17" />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Footer Navigation */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
              <Text style={styles.loginText}>Log In</Text>
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
    backgroundColor: '#EFF6F6',
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
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#636E72',
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
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    height: 56,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#1A1A1A',
    fontSize: 16,
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
  signupBtn: {
    height: 56,
    backgroundColor: '#9A2E17',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9A2E17',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 8,
  },
  signupBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#636E72',
    fontWeight: '600',
    fontSize: 14,
  },
  googleBtn: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  googleBtnText: {
    color: '#9A2E17',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#636E72',
    fontSize: 15,
  },
  loginText: {
    color: '#9A2E17',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
