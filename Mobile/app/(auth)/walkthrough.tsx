import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, CornerRadius, Shadows, Fonts } from '@/constants/theme';

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'search',
    title: 'Find What You Lost',
    subtitle: 'Easily track and recover your lost items using our AI-powered smart matching system.',
  },
  {
    icon: 'hand-left',
    title: 'Help Others',
    subtitle: 'Found an item? Upload a photo and help someone get their belongings back safely.',
  },
  {
    icon: 'shield-checkmark',
    title: 'Secure & Safe',
    subtitle: 'Communicate securely with finders. Our AI monitors chats to keep you safe from spam.',
  },
];

export default function WalkthroughScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0); // 0, 1, 2, 3 (3 is Let's Get Started)

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    setCurrentStep(3);
  };

  const renderPagination = () => {
    if (currentStep >= 3) return null;
    return (
      <View style={styles.paginationContainer}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentStep === index ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderContent = () => {
    if (currentStep < 3) {
      const slide = SLIDES[currentStep];
      return (
        <View style={styles.slideContainer}>
          {/* Skip Button */}
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={handleSkip}
            accessibilityLabel="walkthrough-skip-btn"
            testID="walkthrough-skip-btn"
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          {/* Badge Container */}
          <View style={styles.badgeContainer}>
            <View style={styles.circularBadge}>
              <Ionicons name={slide.icon} size={64} color="#FFFFFF" />
            </View>
          </View>

          {/* Texts */}
          <View style={styles.textContainer}>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
          </View>

          {/* Pagination */}
          {renderPagination()}

          {/* Next/Get Started Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.actionButtonText}>
              {currentStep === 2 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      // Step 3: Let's Get Started
      return (
        <View style={styles.slideContainer}>
          {/* Badge Container with Rocket */}
          <View style={styles.badgeContainer}>
            <View style={styles.circularBadge}>
              <Ionicons name="rocket" size={64} color="#FFFFFF" />
            </View>
          </View>

          {/* Texts */}
          <View style={styles.textContainer}>
            <Text style={styles.slideTitle}>Let's Get Started</Text>
            <Text style={styles.slideSubtitle}>
              Join the TrackBack community today and help us build a safer environment for lost items.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => router.push('/(auth)/signup' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={() => router.push('/(auth)/login' as any)}
              activeOpacity={0.8}
              accessibilityLabel="walkthrough-login-btn"
              testID="walkthrough-login-btn"
            >
              <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  slideContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: Colors.light.textMuted,
  },
  badgeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularBadge: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.buttons,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 28,
    fontFamily: Fonts.headings.bold,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  slideSubtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 30,
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
  activeDot: {
    width: 24,
    backgroundColor: Colors.light.primary,
  },
  inactiveDot: {
    width: 10,
    backgroundColor: Colors.light.border,
  },
  actionButton: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.light.primary,
    borderRadius: CornerRadius.buttons,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.buttons,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.body.bold,
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
  },
  loginButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
    borderRadius: CornerRadius.buttons,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: Colors.light.primary,
    fontSize: 18,
    fontFamily: Fonts.body.bold,
  },
});
