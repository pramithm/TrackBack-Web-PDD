import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useNavigationContainerRef } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/store/authStore';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();
  const rootNavigationRef = useNavigationContainerRef();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    const unsubscribe = rootNavigationRef?.addListener('state', () => {
      console.log('[LayoutGuard] Navigation state changed. Ready:', rootNavigationRef?.isReady());
      setIsNavigationReady(true);
    });

    if (rootNavigationRef?.isReady()) {
      setIsNavigationReady(true);
    }

    return unsubscribe;
  }, [rootNavigationRef]);

  useEffect(() => {
    console.log('[LayoutGuard] State check - isInitializing:', isInitializing, 'isNavigationReady:', isNavigationReady, 'isAuthenticated:', isAuthenticated, 'segments:', segments);
    if (isInitializing || !isNavigationReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated) {
      // Redirect to welcome if trying to access protected screens
      if (!inAuthGroup) {
        console.log('[LayoutGuard] Redirecting to welcome onboarding...');
        router.replace('/(auth)/welcome' as any);
      }
    } else {
      // Redirect to email verification if not verified
      if (!user?.emailVerified) {
        if (segments[1] !== 'email-verification') {
          console.log('[LayoutGuard] Redirecting to email verification screen...');
          router.replace('/(auth)/email-verification' as any);
        }
      } else if (!user?.isProfileVerified) {
        // Redirect to profile setup if profile is not completed
        if (segments[1] !== 'profile-setup') {
          console.log('[LayoutGuard] Redirecting to profile setup screen...');
          router.replace('/(auth)/profile-setup' as any);
        }
      } else {
        // Redirect to tabs if logged in, email verified, and profile complete
        if (inAuthGroup) {
          console.log('[LayoutGuard] Redirecting to main tabs...');
          router.replace('/(tabs)' as any);
        }
      }
    }
  }, [isAuthenticated, isInitializing, user?.emailVerified, user?.isProfileVerified, segments, isNavigationReady]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {isInitializing && (
        <View style={{ 
          position: 'absolute', 
          top: 0, 
          bottom: 0, 
          left: 0, 
          right: 0, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: '#F0F5FA' 
        }}>
          <ActivityIndicator size="large" color="#345C72" />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  const [fontsLoaded, fontError] = useFonts({
    // Load Ionicons using both the spread AND explicit key to guarantee correct registration
    ...Ionicons.font,
    'Ionicons': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),

    // Keep alias for backwards compatibility with hardcoded font families
    'PlayfairDisplay-Regular': require('../assets/fonts/Manrope-Regular.ttf'),
    'PlayfairDisplay-SemiBold': require('../assets/fonts/Manrope-SemiBold.ttf'),
    'PlayfairDisplay-Bold': require('../assets/fonts/Manrope-Bold.ttf'),
    'PlusJakartaSans-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'PlusJakartaSans-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('../assets/fonts/Inter-Bold.ttf'),

    // Supported new names
    'Manrope-Regular': require('../assets/fonts/Manrope-Regular.ttf'),
    'Manrope-SemiBold': require('../assets/fonts/Manrope-SemiBold.ttf'),
    'Manrope-Bold': require('../assets/fonts/Manrope-Bold.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F5FA' }}>
        <ActivityIndicator size="large" color="#345C72" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProtectedLayout>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="blocked-users" options={{ headerShown: false }} />
          <Stack.Screen name="my-reports" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </AuthProtectedLayout>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
