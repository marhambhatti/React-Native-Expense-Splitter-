import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Colors, Spacing, Radius, Fonts } from '../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!password) { setError('Password is required.'); return; }
    setLoading(true);
    setError('');
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      router.replace('/(tabs)/home');
    } else {
      setError(result.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={[styles.logoBox, { backgroundColor: theme.primary }]}>
              <Ionicons name="wallet" size={36} color="#FFFFFF" />
            </View>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Login to manage your shared expenses.
          </Text>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            {/* Email */}
            <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Ionicons name="mail-outline" size={18} color={theme.grayLight} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="name@example.com"
                placeholderTextColor={theme.grayLight}
                value={email}
                onChangeText={t => { setEmail(t); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Email address"
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.grayLight} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="••••••••"
                placeholderTextColor={theme.grayLight}
                value={password}
                onChangeText={t => { setPassword(t); setError(''); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                accessibilityLabel="Password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                activeOpacity={0.7}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.grayLight}
                />
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorRow} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }, loading && styles.disabledBtn]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Login"
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.primaryButtonText}>Login</Text>
              }
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword} accessibilityRole="button">
              <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.grayLight }]}>OR</Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </View>

            {/* Register Link */}
            <View style={styles.bottomRow}>
              <Text style={[styles.bottomText, { color: theme.textSecondary }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/register')} accessibilityRole="link">
                <Text style={[styles.linkText, { color: theme.primary }]}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.lg, alignItems: 'center' },
  logoContainer: { marginTop: Spacing.xl, marginBottom: Spacing.lg },
  logoBox: {
    width: 72, height: 72, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 6,
  },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.xs },
  subtitle: { fontSize: Fonts.sizes.md, textAlign: 'center', marginBottom: Spacing.lg },
  card: {
    width: '100%', borderRadius: Radius.xxl, padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, marginBottom: Spacing.xl,
  },
  label: { fontSize: Fonts.sizes.sm, fontWeight: '600', marginBottom: Spacing.xs, marginTop: Spacing.sm },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.md, paddingHorizontal: Spacing.md,
    paddingVertical: 12, borderWidth: 1.5, gap: Spacing.sm,
  },
  input: { flex: 1, fontSize: Fonts.sizes.md },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  errorText: { fontSize: Fonts.sizes.xs, color: Colors.error, fontWeight: '500' },
  primaryButton: {
    borderRadius: Radius.full, paddingVertical: 16, alignItems: 'center',
    marginTop: Spacing.lg, marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 4,
  },
  disabledBtn: { opacity: 0.6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: Fonts.sizes.lg, fontWeight: '700' },
  forgotPassword: { alignItems: 'center', marginBottom: Spacing.md },
  forgotPasswordText: { fontSize: Fonts.sizes.sm, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md, gap: Spacing.sm },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: Fonts.sizes.sm, fontWeight: '500' },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: Spacing.xs },
  bottomText: { fontSize: Fonts.sizes.sm },
  linkText: { fontSize: Fonts.sizes.sm, fontWeight: '700' },
});
