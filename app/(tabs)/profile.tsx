import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, TextInput, Modal, ActivityIndicator, Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useGroups } from '../../context/GroupContext';
import { useExpenses } from '../../context/ExpenseContext';
import { useTheme } from '../../context/ThemeContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SETTINGS = [
  { id: '1', icon: 'card-outline',              label: 'Payment Methods',  subtitle: 'Manage your payment options',  hasArrow: true  },
  { id: '2', icon: 'cash-outline',              label: 'Currency Settings',  subtitle: 'Rs. PKR',                      hasArrow: true  },
  { id: '3', icon: 'notifications-outline',     label: 'Notifications',      subtitle: 'Manage alerts and reminders',  hasArrow: false },
  { id: '4', icon: 'shield-checkmark-outline',  label: 'Privacy & Security', subtitle: 'Password, 2FA, data settings', hasArrow: true  },
  { id: '5', icon: 'help-circle-outline',       label: 'Help & Support',     subtitle: 'FAQs, contact us',             hasArrow: true  },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const { groups } = useGroups();
  const { expenses } = useExpenses();
  const { isDarkMode, theme, toggleTheme } = useTheme();

  const [notificationsOn, setNotificationsOn] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Search state ───────────────────────────────────────────────────────────
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const q = searchQuery.trim().toLowerCase();

  const searchedGroups = useMemo(() => {
    if (!q) return [];
    return groups.filter(g => g.name.toLowerCase().includes(q));
  }, [groups, q]);

  const searchedExpenses = useMemo(() => {
    if (!q) return [];
    return expenses.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.groupName.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q),
    );
  }, [expenses, q]);

  const hasSearchResults = searchedGroups.length > 0 || searchedExpenses.length > 0;

  const openSearch = () => setSearchActive(true);
  const closeSearch = () => { setSearchActive(false); setSearchQuery(''); };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const openEditModal = () => {
    setEditName(user?.fullName ?? '');
    setEditEmail(user?.email ?? '');
    setNameError('');
    setEmailError('');
    setEditModal(true);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ],
    );
  };

  const handleSaveProfile = async () => {
    let hasError = false;
    if (!editName.trim()) { setNameError('Name is required.'); hasError = true; }
    if (!EMAIL_REGEX.test(editEmail.trim())) { setEmailError('Enter a valid email.'); hasError = true; }
    if (hasError) return;

    setSaving(true);
    try {
      const result = await updateProfile(editName.trim(), editEmail.trim());
      setSaving(false);

      if (result && result.success) {
        setEditModal(false);
        Alert.alert('✓ Updated', 'Your profile has been updated.');
      } else {
        setEmailError(result?.message || 'Failed to update profile.');
      }
    } catch (error) {
      setSaving(false);
      setEmailError('An unexpected error occurred. Please try again.');
    }
  };

  const handleSettingPress = (id: string, label: string, hasArrow: boolean) => {
    if (!hasArrow) return;

    switch (id) {
      case '1': // Payment Methods
        Alert.alert('Payment Methods', 'Payment management is currently excluded from this build.');
        break;
      case '2': // Currency Settings
        Alert.alert('Currency Settings', 'Your default currency is securely locked to Rs. PKR.');
        break;
      case '4': // Privacy & Security
        Alert.alert('Privacy & Security', 'Your data is encrypted. Additional security configurations will be available soon.');
        break;
      case '5': // Help & Support
        Alert.alert(
          'Help & Support',
          'How would you like to contact our support team?',
          [
            {
              text: 'Email Support',
              onPress: () => Linking.openURL('mailto:bhattiibrand7@gmail.com')
            },
            {
              text: 'Call Us',
              onPress: () => Linking.openURL('tel:+923459725016')
            },
            { 
              text: 'Cancel', 
              style: 'cancel' 
            }
          ]
        );
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, searchActive && styles.headerSearch]}>
        {searchActive ? (
          <View style={[styles.inlineSearch, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Ionicons name="search" size={16} color={theme.grayLight} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search groups or expenses..."
              placeholderTextColor={theme.grayLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
              accessibilityLabel="Search"
            />
            <TouchableOpacity onPress={closeSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={theme.grayLight} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: theme.card }]}
              onPress={openSearch}
              accessibilityRole="button"
              accessibilityLabel="Search groups and expenses"
            >
              <Ionicons name="search" size={20} color={theme.text} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Search Results Panel ── */}
        {searchActive && q.length > 0 && (
          <View style={styles.searchResults}>
            {!hasSearchResults ? (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={40} color={theme.grayLight} />
                <Text style={[styles.noResultsText, { color: theme.textSecondary }]}>
                  No results for "{searchQuery}"
                </Text>
              </View>
            ) : (
              <>
                {searchedGroups.length > 0 && (
                  <>
                    <Text style={[styles.searchSectionLabel, { color: theme.grayLight }]}>GROUPS</Text>
                    {searchedGroups.map(g => (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.searchRow, { backgroundColor: theme.card }]}
                        activeOpacity={0.8}
                        onPress={() => {
                          closeSearch();
                          router.push({ pathname: '/group-detail', params: { id: g.id } });
                        }}
                      >
                        <View style={[styles.searchIcon, { backgroundColor: theme.primaryLight }]}>
                          <Text style={{ fontSize: 20 }}>{g.emoji}</Text>
                        </View>
                        <View style={styles.searchInfo}>
                          <Text style={[styles.searchTitle, { color: theme.text }]}>{g.name}</Text>
                          <Text style={[styles.searchSub, { color: theme.textSecondary }]}>
                            {g.members.length} members
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.grayLight} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {searchedExpenses.length > 0 && (
                  <>
                    <Text style={[styles.searchSectionLabel, { color: theme.grayLight, marginTop: Spacing.md }]}>
                      EXPENSES
                    </Text>
                    {searchedExpenses.map(e => (
                      <TouchableOpacity
                        key={e.id}
                        style={[styles.searchRow, { backgroundColor: theme.card }]}
                        activeOpacity={0.8}
                        onPress={() => {
                          closeSearch();
                          router.push({ pathname: '/expense-detail', params: { id: e.id } });
                        }}
                      >
                        <View style={[styles.searchIcon, { backgroundColor: theme.primaryLight }]}>
                          <Text style={{ fontSize: 20 }}>{e.categoryIcon}</Text>
                        </View>
                        <View style={styles.searchInfo}>
                          <Text style={[styles.searchTitle, { color: theme.text }]}>{e.title}</Text>
                          <Text style={[styles.searchSub, { color: theme.textSecondary }]}>
                            {e.groupName} · Rs. {e.amount.toLocaleString('en-PK')}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.grayLight} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* ── Normal profile content ── */}
        {!(searchActive && q.length > 0) && (
          <>
        <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: theme.primary, borderColor: theme.primaryLight }]}>
              <Text style={styles.avatarText}>
                {user?.fullName?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editBadge, { backgroundColor: theme.card, borderColor: theme.primaryLight }]}
              onPress={openEditModal}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <Ionicons name="pencil" size={12} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.profileName, { color: theme.text }]}>{user?.fullName ?? 'User'}</Text>
          <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email ?? ''}</Text>

          {/* Stats */}
          <View style={[styles.statsRow, { backgroundColor: theme.background }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>{groups.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Groups</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>{expenses.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Expenses</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>
                {expenses.filter(e => e.participants.every(p => p.settled)).length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Settled</Text>
            </View>
          </View>
        </View>

        {/* Total Expenses Card */}
        <View style={[styles.savedCard, { backgroundColor: theme.primary }]}>
          <View>
            <Text style={styles.savedLabel}>Total Expenses Logged</Text>
            <Text style={styles.savedAmount}>Rs. {totalExpenses.toLocaleString('en-PK')}</Text>
          </View>
          <View style={styles.savedIconBox}>
            <Ionicons name="wallet-outline" size={26} color="#FFF" />
          </View>
        </View>

        {/* Dark Mode Toggle */}
        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={toggleTheme}
          activeOpacity={0.8}
          accessibilityRole="switch"
          accessibilityState={{ checked: isDarkMode }}
          accessibilityLabel={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight + '50' }]}>
              <MaterialCommunityIcons
                name={isDarkMode ? 'weather-night' : 'white-balance-sunny'}
                size={24}
                color={theme.primary}
              />
            </View>
            <Text style={[styles.optionText, { color: theme.text }]}>
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={isDarkMode ? 'toggle-switch' : 'toggle-switch-off-outline'}
            size={40}
            color={isDarkMode ? theme.primary : theme.grayLight}
          />
        </TouchableOpacity>

        {/* Settings List */}
        <Text style={[styles.sectionLabel, { color: theme.grayLight }]}>ACCOUNT SETTINGS</Text>
        <View style={[styles.settingsCard, { backgroundColor: theme.card }]}>
          {SETTINGS.map((item, index) => (
            <View key={item.id}>
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={() => handleSettingPress(item.id, item.label, item.hasArrow)}
                accessibilityRole={item.hasArrow ? 'button' : undefined}
                accessibilityLabel={item.label}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIconBox, { backgroundColor: theme.primaryLight + '30' }]}>
                    <Ionicons name={item.icon as any} size={20} color={theme.primary} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{item.label}</Text>
                    <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
                  </View>
                </View>
                {item.id === '3' ? (
                  <Switch
                    value={notificationsOn}
                    onValueChange={setNotificationsOn}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#FFF"
                    accessibilityRole="switch"
                    accessibilityState={{ checked: notificationsOn }}
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={theme.grayLight} />
                )}
              </TouchableOpacity>
              {index < SETTINGS.length - 1 && (
                <View style={[styles.settingDivider, { backgroundColor: theme.border }]} />
              )}
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: theme.card, borderColor: theme.error }]}
          onPress={handleLogout}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Ionicons name="log-out-outline" size={22} color={theme.error} />
          <Text style={[styles.logoutText, { color: theme.error }]}>Logout</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: theme.grayLight }]}>Version 1.0.0 · Expense Splitter</Text>
        <View style={{ height: 20 }} />
        </>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditModal(false)}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Profile</Text>

            <Text style={[styles.modalLabel, { color: theme.text }]}>Full Name</Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: theme.background, color: theme.text, borderColor: nameError ? theme.error : theme.border },
              ]}
              value={editName}
              onChangeText={t => { setEditName(t); setNameError(''); }}
              placeholder="Your full name"
              placeholderTextColor={theme.grayLight}
              accessibilityLabel="Full name"
            />
            {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}

            <Text style={[styles.modalLabel, { color: theme.text }]}>Email</Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: theme.background, color: theme.text, borderColor: emailError ? theme.error : theme.border },
              ]}
              value={editEmail}
              onChangeText={t => { setEditEmail(t); setEmailError(''); }}
              placeholder="your@email.com"
              placeholderTextColor={theme.grayLight}
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel="Email address"
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={() => setEditModal(false)}
                accessibilityRole="button"
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary }, saving && styles.disabledBtn]}
                onPress={handleSaveProfile}
                disabled={saving}
                accessibilityRole="button"
              >
                {saving
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.saveBtnText}>Save ✓</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  headerSearch: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  headerTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800' },
  searchBtn: {
    width: 42, height: 42, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  inlineSearch: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: Fonts.sizes.md, paddingVertical: 2 },
  searchResults: { marginBottom: Spacing.md },
  searchSectionLabel: {
    fontSize: Fonts.sizes.xs, fontWeight: '700', letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  searchIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  searchInfo: { flex: 1 },
  searchTitle: { fontSize: Fonts.sizes.md, fontWeight: '600', marginBottom: 2 },
  searchSub: { fontSize: Fonts.sizes.xs },
  noResults: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  noResultsText: { fontSize: Fonts.sizes.md, fontWeight: '500' },
  scroll: { padding: Spacing.lg },
  profileCard: {
    borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  avatarContainer: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#FFF' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  profileName: { fontSize: Fonts.sizes.xl, fontWeight: '800', marginBottom: 4 },
  profileEmail: { fontSize: Fonts.sizes.sm, marginBottom: Spacing.lg },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    borderRadius: Radius.lg, padding: Spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: Fonts.sizes.xxl, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: Fonts.sizes.xs, fontWeight: '500', textAlign: 'center' },
  statDivider: { width: 1, height: 40 },
  savedCard: {
    borderRadius: Radius.xl, padding: Spacing.lg,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  savedLabel: { fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  savedAmount: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: '#FFF' },
  savedIconBox: {
    width: 52, height: 52, borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  optionCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.lg,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconContainer: { width: 40, height: 40, borderRadius: Radius.full, justifyContent: 'center', alignItems: 'center' },
  optionText: { fontSize: Fonts.sizes.md, fontWeight: '600' },
  sectionLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.sm },
  settingsCard: {
    borderRadius: Radius.xl, marginBottom: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  settingIconBox: { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: Fonts.sizes.md, fontWeight: '600', marginBottom: 2 },
  settingSubtitle: { fontSize: Fonts.sizes.xs },
  settingDivider: { height: 1, marginLeft: Spacing.md + 38 + Spacing.md },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderRadius: Radius.xl, paddingVertical: 16,
    marginBottom: Spacing.md, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  logoutText: { fontSize: Fonts.sizes.lg, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: Fonts.sizes.xs, marginBottom: Spacing.sm },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.lg, paddingBottom: Spacing.xxl },
  modalTitle: { fontSize: Fonts.sizes.xl, fontWeight: '800', marginBottom: Spacing.lg, textAlign: 'center' },
  modalLabel: { fontSize: Fonts.sizes.sm, fontWeight: '600', marginBottom: Spacing.xs, marginTop: Spacing.sm },
  modalInput: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: Fonts.sizes.md, borderWidth: 1.5 },
  fieldError: { fontSize: Fonts.sizes.xs, color: '#EF4444', fontWeight: '500', marginTop: 3 },
  modalButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.full, borderWidth: 1.5, alignItems: 'center' },
  cancelBtnText: { fontSize: Fonts.sizes.md, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.full, alignItems: 'center', elevation: 4 },
  saveBtnText: { fontSize: Fonts.sizes.md, fontWeight: '700', color: '#FFF' },
  disabledBtn: { opacity: 0.6 },
});