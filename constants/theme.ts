export const Colors = {
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  primaryLight: '#DDD6FE',
  background: '#F3F4F6',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  grayLight: '#9CA3AF',
  grayLighter: '#E5E7EB',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#D1D5DB',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28, // FIX: was used by multiple screens but missing from theme
  full: 9999,
};

export const Fonts = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Light Theme
export const LightTheme = {
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  primaryLight: '#DDD6FE',
  background: '#F3F4F6',
  surface: '#FFFFFF',        // cards, modals
  card: '#FFFFFF',           // alias — profile uses theme.card
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  grayLight: '#9CA3AF',
  grayLighter: '#E5E7EB',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#D1D5DB',
  overlay: 'rgba(0, 0, 0, 0.5)',
  cardBackground: '#FFFFFF',
  inputBackground: '#F9FAFB',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  statusBar: 'dark' as 'dark' | 'light',
};

// Dark Theme
export const DarkTheme = {
  primary: '#A78BFA',
  primaryDark: '#7C3AED',
  primaryLight: '#4C1D95',
  background: '#111827',
  surface: '#1F2937',        // cards, modals
  card: '#1F2937',           // alias — profile uses theme.card
  white: '#1F2937',
  black: '#FFFFFF',
  gray: '#9CA3AF',
  grayLight: '#6B7280',
  grayLighter: '#374151',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  border: '#374151',
  overlay: 'rgba(0, 0, 0, 0.7)',
  cardBackground: '#1F2937',
  inputBackground: '#374151',
  tabBar: '#1F2937',
  tabBarBorder: '#374151',
  statusBar: 'light' as 'dark' | 'light',
};

export type AppTheme = typeof LightTheme;