import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { theme } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) =>
    setErrors(prev => ({ ...prev, [field]: '' }));

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Full name is required.';
    if (!EMAIL_REGEX.test(email.trim())) newErrors.email = 'Enter a valid email address.';
    if (password.length < 6) newErrors.password = 'Password must be at least 6 characters.';
    if (password !== confirm) newErrors.confirm = 'Passwords do not match.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    const result = await register(fullName.trim(), email.trim(), password);
    setLoading(false);
    if (result.success) {
      router.replace('/(tabs)/home');
    } else {
      setErrors({ email: result.message });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={[styles.logoBox, { backgroundColor: theme.primary }]}>
              <Ionicons name="wallet" size={36} color="#FFFFFF" />
            </View>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Start splitting bills with ease.
          </Text>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>

            {/* Full Name */}
            <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: theme.inputBackground, borderColor: errors.fullName ? Colors.error : theme.border },
            ]}>
              <Ionicons name="person-outline" size={18} color={theme.grayLight} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="John Doe"
                placeholderTextColor={theme.grayLight}
                value={fullName}
                onChangeText={t => { setFullName(t); clearError('fullName'); }}
                autoCapitalize="words"
                returnKeyType="next"
                accessibilityLabel="Full name"
              />
            </View>
            {errors.fullName ? <ErrorText msg={errors.fullName} /> : null}

            {/* Email */}
            <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: theme.inputBackground, borderColor: errors.email ? Colors.error : theme.border },
            ]}>
              <Ionicons name="mail-outline" size={18} color={theme.grayLight} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="name@example.com"
                placeholderTextColor={theme.grayLight}
                value={email}
                onChangeText={t => { setEmail(t); clearError('email'); }}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                accessibilityLabel="Email address"
              />
            </View>
            {errors.email ? <ErrorText msg={errors.email} /> : null}

            {/* Password */}
            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: theme.inputBackground, borderColor: errors.password ? Colors.error : theme.border },
            ]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.grayLight} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Min 6 characters"
                placeholderTextColor={theme.grayLight}
                value={password}
                onChangeText={t => { setPassword(t); clearError('password'); clearError('confirm'); }}
                secureTextEntry={!showPassword}
                returnKeyType="next"
                accessibilityLabel="Password"
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
            {errors.password ? <ErrorText msg={errors.password} /> : null}

            {/* Confirm Password */}
            <Text style={[styles.label, { color: theme.text }]}>Confirm Password</Text>
            <View style={[
              styles.inputWrapper,
              { backgroundColor: theme.inputBackground, borderColor: errors.confirm ? Colors.error : theme.border },
            ]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.grayLight} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Repeat password"
                placeholderTextColor={theme.grayLight}
                value={confirm}
                onChangeText={t => { setConfirm(t); clearError('confirm'); }}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                accessibilityLabel="Confirm password"
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(v => !v)}
                activeOpacity={0.7}
                accessibilityLabel={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.grayLight}
                />
              </TouchableOpacity>
            </View>
            {errors.confirm ? <ErrorText msg={errors.confirm} /> : null}

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }, loading && styles.disabledBtn]}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.primaryButtonText}>Create Account →</Text>
              }
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.grayLight }]}>OR</Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialButton, { borderColor: theme.border, backgroundColor: theme.card }]}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Coming Soon', 'Google sign-in will be available in a future update.')}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                <Ionicons name="logo-google" size={18} color="#DB4437" />
                <Text style={[styles.socialText, { color: theme.text }]}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialButton, { borderColor: theme.border, backgroundColor: theme.card }]}
                activeOpacity={0.7}
                onPress={() => Alert.alert('Coming Soon', 'Apple sign-in will be available in a future update.')}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
              >
                <Ionicons name="logo-apple" size={18} color={theme.text} />
                <Text style={[styles.socialText, { color: theme.text }]}>Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View style={styles.bottomRow}>
              <Text style={[styles.bottomText, { color: theme.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/login')} accessibilityRole="link">
                <Text style={[styles.linkText, { color: theme.primary }]}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ErrorText({ msg }: { msg: string }) {
  return (
    <View style={errorStyles.row} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={12} color={Colors.error} />
      <Text style={errorStyles.text}>{msg}</Text>
    </View>
  );
}
const errorStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, marginBottom: 2 },
  text: { fontSize: Fonts.sizes.xs, color: Colors.error, fontWeight: '500' },
});

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
  primaryButton: {
    borderRadius: Radius.full, paddingVertical: 16, alignItems: 'center',
    marginTop: Spacing.lg, marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 4,
  },
  disabledBtn: { opacity: 0.6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: Fonts.sizes.lg, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md, gap: Spacing.sm },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: Fonts.sizes.sm, fontWeight: '500' },
  socialRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  socialButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1.5,
  },
  socialText: { fontSize: Fonts.sizes.sm, fontWeight: '600' },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: Spacing.xs },
  bottomText: { fontSize: Fonts.sizes.sm },
  linkText: { fontSize: Fonts.sizes.sm, fontWeight: '700' },
});
