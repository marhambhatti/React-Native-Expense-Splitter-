/**
 * FIX: The original hook referenced Colors.light[colorName] and Colors.dark[colorName]
 * but Colors is a flat object, not nested by theme. This hook is no longer needed by
 * any screen (all screens use useTheme() directly), but kept for backwards compat.
 * It now delegates correctly to the theme system.
 */
import { useTheme } from '@/context/ThemeContext';
import { AppTheme } from '@/constants/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof AppTheme,
): string {
  const { theme, isDarkMode } = useTheme();
  const colorFromProps = isDarkMode ? props.dark : props.light;
  if (colorFromProps) return colorFromProps;
  return theme[colorName] as string;
}
