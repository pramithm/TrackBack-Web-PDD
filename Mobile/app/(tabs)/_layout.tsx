import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Tab configuration with icon names
const TAB_CONFIG = [
  {
    name: 'index',
    label: 'Home',
    iconFocused: 'home' as const,
    iconUnfocused: 'home-outline' as const,
    testID: 'tab-home',
  },
  {
    name: 'search',
    label: 'Search',
    iconFocused: 'search' as const,
    iconUnfocused: 'search-outline' as const,
    testID: 'tab-search',
  },
  {
    name: 'lost',
    label: 'Lost',
    iconFocused: 'warning' as const,
    iconUnfocused: 'warning-outline' as const,
    testID: 'tab-lost',
  },
  {
    name: 'found',
    label: 'Found',
    iconFocused: 'checkmark-circle' as const,
    iconUnfocused: 'checkmark-circle-outline' as const,
    testID: 'tab-found',
  },
  {
    name: 'chat',
    label: 'Chat',
    iconFocused: 'chatbubbles' as const,
    iconUnfocused: 'chatbubbles-outline' as const,
    testID: 'tab-chat',
  },
];

// Custom Tab Bar component — avoids PlatformPressable clipping issues
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.tabBarContainer, {
      bottom: Platform.OS === 'ios' ? 24 : 16,
      backgroundColor: 'rgba(255, 255, 255, 0.97)',
    }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tabConfig = TAB_CONFIG.find(t => t.name === route.name) ?? TAB_CONFIG[0];

        const iconName = isFocused ? tabConfig.iconFocused : tabConfig.iconUnfocused;
        const iconColor = isFocused ? theme.tint : theme.icon;
        const labelColor = isFocused ? theme.tint : theme.icon;

        const onPress = () => {
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            testID={tabConfig.testID}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.75}
            style={styles.tabItem}
          >
            {/* Active pill background */}
            <View style={[
              styles.iconPill,
              isFocused && {
                backgroundColor: 'rgba(52, 92, 114, 0.12)',
              }
            ]}>
              <Ionicons
                name={iconName}
                size={24}
                color={iconColor}
              />
            </View>

            {/* Label */}
            <Text
              style={[
                styles.tabLabel,
                { color: labelColor, fontWeight: isFocused ? '600' : '400' }
              ]}
              numberOfLines={1}
            >
              {tabConfig.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: Platform.OS === 'ios' ? 76 : 68,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(200, 220, 235, 0.8)',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    paddingBottom: Platform.OS === 'ios' ? 10 : 4,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconPill: {
    width: 44,
    height: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }} testID="bottom-tab-bar">
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Home' }}
        />
        <Tabs.Screen
          name="search"
          options={{ title: 'Search' }}
        />
        <Tabs.Screen
          name="lost"
          options={{ title: 'Lost' }}
        />
        <Tabs.Screen
          name="found"
          options={{ title: 'Found' }}
        />
        <Tabs.Screen
          name="chat"
          options={{ title: 'Chat' }}
        />
      </Tabs>
    </View>
  );
}
