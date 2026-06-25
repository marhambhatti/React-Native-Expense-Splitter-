import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { GroupProvider } from '../context/GroupContext';
import { ExpenseProvider } from '../context/ExpenseContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

SplashScreen.preventAutoHideAsync();

// Auth guard — login check karega
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // Onboarding AsyncStorage se check karo
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('onboarding_done');
        setOnboardingDone(!!value);
      } catch (e) {
        console.error('Onboarding check error:', e);
        setOnboardingDone(false);
      }
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (isLoading || onboardingDone === null) return;

    const currentSegment = segments[0];
    const isOnboardingScreen = currentSegment === undefined;
    const isAuthScreen = currentSegment === 'login' || currentSegment === 'register';

    if (!onboardingDone && !isOnboardingScreen) {
      router.replace('/');
    } else if (onboardingDone && !user && !isAuthScreen) {
      router.replace('/login');
    } else if (user && (isAuthScreen || isOnboardingScreen)) {
      router.replace('/(tabs)/home');
    }
  }, [user, isLoading, onboardingDone, segments]);

  useEffect(() => {
    if (!isLoading && onboardingDone !== null) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, onboardingDone]);

  if (isLoading || onboardingDone === null) return null;

  return <>{children}</>;
}

// Separate component so ThemeContext is accessible inside RootLayout
function AppContent() {
  const { isDarkMode } = useTheme();

  return (
    <>
      <StatusBar
        style={isDarkMode ? 'light' : 'dark'}
        backgroundColor={isDarkMode ? '#1F2937' : '#8B5CF6'}
      />
      <AuthProvider>
        <GroupProvider>
          <ExpenseProvider>
            <AuthGate>
              <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="group-detail" options={{ presentation: 'card' }} />
                <Stack.Screen name="expense-detail" options={{ presentation: 'card' }} />
                {/* FIX: suppress the stale nested group-detail route from appearing in the stack */}
                <Stack.Screen name="group/group/group-detail" options={{ headerShown: false }} />
              </Stack>
            </AuthGate>
          </ExpenseProvider>
        </GroupProvider>
      </AuthProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}