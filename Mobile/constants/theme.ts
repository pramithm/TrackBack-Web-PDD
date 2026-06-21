import { Platform } from 'react-native';

// Premium Quiet Luxury Colors (Sky Blue Family)
export const Colors = {
  light: {
    background: '#F0F5FA',       // Soft, light sky-blue background
    surface: '#FFFFFF',          // Primary surface
    surfaceSecondary: '#E6F0F6', // Secondary surface (inputs, panels)
    surfaceHover: '#DDE8F0',     // Pressed/Active button state
    text: '#2B353A',             // Slate charcoal primary text
    textSecondary: '#56646E',    // Slate-blue gray for descriptions
    textMuted: '#8E9CA3',        // Muted gray-blue
    primary: '#345C72',          // Deep steel/sky blue accent (Primary Accent)
    primaryAccentHover: '#284859',
    primaryContainer: '#E0ECF4',  // Light sky blue highlighted container
    border: '#D3E2EC',           // Muted border outline
    divider: '#E3EEF5',          // Division line
    tint: '#345C72',
    icon: '#8E9CA3',
    tabIconDefault: '#8E9CA3',
    tabIconSelected: '#345C72',
    
    // Status colors
    statusFoundBg: '#E1EEDD',
    statusFoundText: '#566252',
    statusFoundBorder: '#C7D7BF',
    
    statusLostBg: '#FFD6D6',
    statusLostText: '#7C5454',
    statusLostBorder: '#EABABA',

    statusVerifiedBg: '#E1EEDD',
    statusVerifiedText: '#566252',

    statusPendingBg: '#FFF4D8',
    statusPendingText: '#A56A00',

    statusRejectedBg: '#FFE2E2',
    statusRejectedText: '#B42318',
  },
  // Keep dark mapping aligned for smooth rendering fallback
  dark: {
    background: '#12161A',
    surface: '#1C2126',
    surfaceSecondary: '#242B32',
    surfaceHover: '#2E363E',
    text: '#ECF0F2',
    textSecondary: '#A5B2BC',
    textMuted: '#6B7A84',
    primary: '#5085A5',
    primaryAccentHover: '#6599B9',
    primaryContainer: '#2D3E4A',
    border: '#2C353E',
    divider: '#242C33',
    tint: '#5085A5',
    icon: '#6B7A84',
    tabIconDefault: '#6B7A84',
    tabIconSelected: '#5085A5',
    
    // Status fallback
    statusFoundBg: '#2C3D30',
    statusFoundText: '#A3BFA0',
    statusFoundBorder: '#3C5241',
    
    statusLostBg: '#3D2C2C',
    statusLostText: '#BFA0A0',
    statusLostBorder: '#523C3C',

    statusVerifiedBg: '#2C3D30',
    statusVerifiedText: '#A3BFA0',

    statusPendingBg: '#3D382C',
    statusPendingText: '#BFB5A0',

    statusRejectedBg: '#3D2C2C',
    statusRejectedText: '#BFA0A0',
  }
};

// Premium Corner Radii Design System
export const CornerRadius = {
  cards: 24,
  images: 24,
  buttons: 16,
  inputs: 16,
  badges: 999,
  bottomNavigation: 28,
  modalSheets: 32,
};

// Premium Ambient Shadow System (Avoid harsh shadows)
export const Shadows = {
  cards: {
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 2, // Android soft shadow fallback
  },
  buttons: {
    shadowColor: '#345C72',
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 3,
  },
  floating: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 30,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 5,
  },
};

// Typography font family mapping configuration loaded dynamically in _layout.tsx
export const Fonts = {
  headings: {
    bold: 'Manrope-Bold',
    semiBold: 'Manrope-SemiBold',
    regular: 'Manrope-Regular',
  },
  body: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  }
};
