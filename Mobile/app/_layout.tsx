import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useNavigationContainerRef } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/store/authStore';

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
      // Redirect to profile setup if profile is not completed
      if (!user?.isProfileVerified) {
        if (segments[1] !== 'profile-setup') {
          console.log('[LayoutGuard] Redirecting to profile setup screen...');
          router.replace('/(auth)/profile-setup' as any);
        }
      } else {
        // Redirect to tabs if logged in and profile is complete
        if (inAuthGroup) {
          console.log('[LayoutGuard] Redirecting to main tabs...');
          router.replace('/(tabs)' as any);
        }
      }
    }
  }, [isAuthenticated, isInitializing, user?.isProfileVerified, segments, isNavigationReady]);

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
          backgroundColor: '#EFF6F6' 
        }}>
          <ActivityIndicator size="large" color="#9A2E17" />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProtectedLayout>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </AuthProtectedLayout>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
