import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/src/config/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useAuth, logoutUser } from '@/src/store/authStore';
import { Colors, CornerRadius, Shadows, Fonts } from '@/constants/theme';
import { connectivity } from '@/src/services/connectivity';
import { errorHelper } from '@/src/services/errorHelper';

export default function EmailVerificationScreen() {
  const router = useRouter();
  const { user, reloadUser } = useAuth();
  const theme = Colors.light;

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load a generic welcome/success message first
  useEffect(() => {
    setSuccess(
      'A verification email has been sent to your email address. Please verify your email before accessing all features of Track Back.'
    );
  }, []);

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [cooldown]);

  const ensureOnline = async (): Promise<boolean> => {
    const online = await connectivity.checkOnline();
    if (!online) {
      setError('No internet connection. Please check your network and try again.');
    }
    return online;
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError('');
    setSuccess('');
    setResending(true);

    try {
      if (!(await ensureOnline())) return;

      const currentUser = auth.currentUser;
      if (currentUser) {
        await sendEmailVerification(currentUser);
        setSuccess('A new verification email has been sent!');
        setCooldown(60); // 60-second cooldown protection
      } else {
        setError('No authenticated user found. Please sign in again.');
      }
    } catch (err: any) {
      console.error('[Verification] Error resending email:', err);
      const friendlyMsg = errorHelper.getFriendlyMessage(err);
      setError(friendlyMsg);
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!(await ensureOnline())) return;

      await reloadUser?.();

      const currentUser = auth.currentUser;
      if (currentUser && currentUser.emailVerified) {
        setSuccess('Email verified successfully! Redirecting...');
        // LayoutGuard will automatically route the user to Profile Setup or Tabs.
      } else {
        setError(
          'Your email address has not been verified yet. Please check your inbox and click the verification link.'
        );
      }
    } catch (err: any) {
      console.error('[Verification] Error reloading user:', err);
      const friendlyMsg = errorHelper.getFriendlyMessage(err);
      setError(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logoutUser();
      // LayoutGuard will redirect to welcome/login.
    } catch (err) {
      console.error('[Verification] Error signing out:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-open-outline" size={64} color={theme.primary} />
          </View>

          <Text style={styles.title}>Verify Your Email</Text>

          {/* Email badge */}
          {user?.email && (
            <View style={styles.emailBadge}>
              <Ionicons name="at-outline" size={16} color={theme.textSecondary} />
              <Text style={styles.emailText}>{user.email}</Text>
            </View>
          )}

          {/* Messages */}
          {!!error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#D63031" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!!success && !error && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#00B894" />
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}

          {/* Action buttons */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleCheckVerification}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={20} color="#fff" style={styles.btnIcon} />
                <Text style={styles.primaryBtnText}>I've Verified My Email</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineBtn, (resending || cooldown > 0) && styles.btnDisabled]}
            onPress={handleResend}
            disabled={resending || cooldown > 0}
            activeOpacity={0.8}
          >
            {resending ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Ionicons
                  name="send-outline"
                  size={18}
                  color={theme.primary}
                  style={styles.btnIcon}
                />
                <Text style={styles.outlineBtnText}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={theme.textMuted} style={styles.btnIcon} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: CornerRadius.cards,
    padding: 32,
    alignItems: 'center',
    ...Shadows.cards,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(52, 92, 114, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.headings.bold,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  emailText: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: Colors.light.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(214, 48, 49, 0.08)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    width: '100%',
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    width: '100%',
  },
  successText: {
    color: '#00B894',
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    flex: 1,
    lineHeight: 20,
  },
  primaryBtn: {
    height: 56,
    backgroundColor: Colors.light.primary,
    borderRadius: CornerRadius.buttons,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
    ...Shadows.buttons,
    marginBottom: 16,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.body.bold,
  },
  outlineBtn: {
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
    borderRadius: CornerRadius.buttons,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
    marginBottom: 24,
  },
  outlineBtnText: {
    color: Colors.light.primary,
    fontSize: 15,
    fontFamily: Fonts.body.semiBold,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  signOutText: {
    color: Colors.light.textMuted,
    fontSize: 15,
    fontFamily: Fonts.body.bold,
  },
  btnIcon: {
    marginRight: 8,
  },
  btnDisabled: {
    opacity: 0.55,
  },
});
