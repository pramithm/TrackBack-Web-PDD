import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Container */}
        <View style={styles.logoContainer}>
          <View style={styles.pinBg}>
            <Ionicons name="location" size={48} color="#9A2E17" />
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
              <Ionicons name="search" size={28} color="#F27A35" />
            </View>
            <Text style={styles.featureLabel}>Find</Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="hand-left" size={28} color="#9A2E17" />
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
    backgroundColor: '#EFF6F6',
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
    backgroundColor: 'rgba(154, 46, 23, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#9A2E17',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  logoText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#9A2E17',
    letterSpacing: 0.5,
  },
  headingContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 36,
  },
  underline: {
    width: 60,
    height: 4,
    backgroundColor: '#F27A35',
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#636E72',
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
  },
  button: {
    width: '100%',
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
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
