import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={{ flex: 1 }} testID="bottom-tab-bar">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.tint,
          tabBarInactiveTintColor: '#687076',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            height: Platform.OS === 'ios' ? 88 : 72,
            paddingBottom: Platform.OS === 'ios' ? 28 : 12,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          }
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarTestID: 'tab-home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons size={24} name={focused ? "home" : "home-outline"} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarTestID: 'tab-search',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons size={24} name={focused ? "search" : "search-outline"} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="lost"
          options={{
            title: 'Lost Report',
            tabBarTestID: 'tab-lost',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons size={24} name={focused ? "warning" : "warning-outline"} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="found"
          options={{
            title: 'Found Report',
            tabBarTestID: 'tab-found',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons size={24} name={focused ? "checkmark-circle" : "checkmark-circle-outline"} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarTestID: 'tab-chat',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons size={24} name={focused ? "chatbubbles" : "chatbubbles-outline"} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
