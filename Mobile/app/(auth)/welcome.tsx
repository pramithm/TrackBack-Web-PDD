import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, CornerRadius, Shadows, Fonts } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = Colors.light;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Container */}
        <View style={styles.logoContainer}>
          <View style={styles.pinBg}>
            <Ionicons name="location" size={48} color={theme.primary} />
          </View>
          <Text style={styles.logoText}>TrackBack</Text>
        </View>

        {/* Welcome Text Section */}
        <View style={styles.headingContainer}>
          <Text style={styles.title}>Welcome to Track Back App</Text>
          <View style={styles.underline} />
          <Text style={styles.subtitle}>
            "Where you can find your missing items and help others reunite with theirs."
          </Text>
        </View>

        {/* Feature Icons Section */}
        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="search" size={28} color={theme.primary} />
            </View>
            <Text style={styles.featureLabel}>Find</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="hand-left" size={28} color={theme.primary} />
            </View>
            <Text style={styles.featureLabel}>Help</Text>
          </View>
        </View>

        {/* Bottom Button */}
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(auth)/walkthrough' as any)}
          activeOpacity={0.8}
          accessibilityLabel="welcome-get-started-btn"
          testID="welcome-get-started-btn"
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  pinBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(52, 92, 114, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  logoText: {
    fontSize: 34,
    fontFamily: Fonts.headings.bold,
    color: Colors.light.primary,
    letterSpacing: 0.5,
  },
  headingContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.headings.bold,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 36,
  },
  underline: {
    width: 40,
    height: 3,
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 48,
    width: '100%',
    marginVertical: 20,
  },
  featureItem: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.cards,
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 15,
    fontFamily: Fonts.body.semiBold,
    color: Colors.light.text,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.light.primary,
    borderRadius: CornerRadius.buttons,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.buttons,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.body.bold,
  },
});
