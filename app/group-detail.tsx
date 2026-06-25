import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useGroups } from '../context/GroupContext';
import { useExpenses } from '../context/ExpenseContext';
import { useTheme } from '../context/ThemeContext';

const MEMBER_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
const EMOJIS = ['🏠', '✈️', '🍔', '⚡', '🎉', '📚', '🏋️', '🎮', '🎵', '🚗', '💼', '🏖️'];

export default function GroupDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { groups, addMember, updateGroup, deleteGroup } = useGroups();
  const { getGroupExpenses, getBalances, settleUp } = useExpenses();
  const { theme } = useTheme();

  // ── Add member modal ───────────────────────────────────────────────────────
  const [addMemberVisible, setAddMemberVisible] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [adding, setAdding] = useState(false);

  // ── Settle state ───────────────────────────────────────────────────────────
  const [settling, setSettling] = useState<string | null>(null);

  // ── Search state ───────────────────────────────────────────────────────────
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Settings modal ─────────────────────────────────────────────────────────
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const groupId = id ?? '';
  const group = groups.find(g => g.id === groupId);
  const expenses = getGroupExpenses(groupId);
  const balances = getBalances(groupId);

  // ── Filtered expenses for search ───────────────────────────────────────────
  const q = searchQuery.trim().toLowerCase();
  const displayedExpenses = useMemo(() => {
    if (!q) return expenses;
    return expenses.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.paidByName.toLowerCase().includes(q),
    );
  }, [expenses, q]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const resetAddMember = useCallback(() => {
    setMemberName('');
    setMemberEmail('');
    setNameError('');
    setEmailError('');
    setAddMemberVisible(false);
  }, []);

  const handleAddMember = async () => {
    let hasError = false;
    if (!memberName.trim()) { setNameError('Name is required.'); hasError = true; }
    if (!memberEmail.trim() || !memberEmail.includes('@')) {
      setEmailError('Enter a valid email.'); hasError = true;
    }
    if (hasError) return;

    setAdding(true);
    const result = await addMember(groupId, memberName.trim(), memberEmail.trim());
    setAdding(false);
    if (result.success) {
      resetAddMember();
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleSettleUp = (memberId: string, displayName: string) => {
    Alert.alert('Settle Up', `Settle all balances with ${displayName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Settle',
        onPress: async () => {
          setSettling(memberId);
          await settleUp(groupId, memberId);
          setSettling(null);
        },
      },
    ]);
  };

  const handleSettleAll = () => {
    if (balances.length === 0) {
      Alert.alert('All Settled', 'No pending balances in this group.');
      return;
    }
    Alert.alert('Settle All Balances', 'Settle every pending balance in this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Settle All',
        onPress: async () => {
          setSettling('all');
          for (const b of balances) await settleUp(groupId, b.memberId);
          setSettling(null);
        },
      },
    ]);
  };

  // ── Search ─────────────────────────────────────────────────────────────────

  const openSearch = () => setSearchActive(true);
  const closeSearch = () => { setSearchActive(false); setSearchQuery(''); };

  // ── Settings ───────────────────────────────────────────────────────────────

  const openSettings = () => {
    if (!group) return;
    setEditName(group.name);
    setEditEmoji(group.emoji);
    setEditNameError('');
    setSettingsVisible(true);
  };

  const handleSaveSettings = async () => {
    if (!editName.trim()) { setEditNameError('Group name is required.'); return; }
    setSavingSettings(true);
    await updateGroup(groupId, editName.trim(), editEmoji);
    setSavingSettings(false);
    setSettingsVisible(false);
  };

  const handleDeleteGroup = () => {
    setSettingsVisible(false);
    // Small delay so modal closes cleanly before alert
    setTimeout(() => {
      Alert.alert(
        'Delete Group',
        `Permanently delete "${group?.name}"?\n\nThis cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteGroup(groupId);
              router.back();
            },
          },
        ],
      );
    }, 300);
  };

  // ── Not Found ──────────────────────────────────────────────────────────────
  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={theme.grayLight} />
          <Text style={[styles.errorText, { color: theme.text }]}>Group not found</Text>
          <TouchableOpacity
            style={[styles.goBackBtn, { backgroundColor: theme.primaryLight }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.goBackText, { color: theme.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalOwed = balances.filter(b => b.owesYou).reduce((s, b) => s + b.amount, 0);
  const totalOwe  = balances.filter(b => !b.owesYou).reduce((s, b) => s + b.amount, 0);
  const netBalance = totalOwed - totalOwe;
  const isSettlingAll = settling === 'all';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>

      {/* ── Search bar ── */}
      {searchActive && (
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.grayLight} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search expenses..."
            placeholderTextColor={theme.grayLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          <TouchableOpacity onPress={closeSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={20} color={theme.grayLight} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main content area */}
      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: theme.card }]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {group.name}
            </Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: searchActive ? theme.primaryLight : theme.card }]}
                onPress={searchActive ? closeSearch : openSearch}
                accessibilityRole="button"
                accessibilityLabel={searchActive ? 'Close search' : 'Search expenses'}
              >
                <Ionicons
                  name={searchActive ? 'close' : 'search'}
                  size={20}
                  color={searchActive ? theme.primary : theme.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: theme.card }]}
                onPress={openSettings}
                accessibilityRole="button"
                accessibilityLabel="Group settings"
              >
                <Ionicons name="settings-outline" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Search empty/no-results state ── */}
          {searchActive && q.length > 0 && displayedExpenses.length === 0 && (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={40} color={theme.grayLight} />
              <Text style={[styles.noResultsText, { color: theme.textSecondary }]}>
                No expenses match "{searchQuery}"
              </Text>
            </View>
          )}

          {/* ── Members row (hidden during search) ── */}
          {!searchActive && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersScroll}>
              {group.members.map((m, i) => (
                <View key={m.id} style={styles.memberItem}>
                  <View style={[styles.memberAvatar, { backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }]}>
                    <Text style={styles.memberAvatarText}>{m.name?.[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>
                    {m.id === user?.id ? 'You' : m.name}
                  </Text>
                </View>
              ))}
              <TouchableOpacity style={styles.memberItem} onPress={() => setAddMemberVisible(true)}>
                <View style={[styles.addMemberAvatar, { backgroundColor: theme.grayLighter, borderColor: theme.border }]}>
                  <Ionicons name="person-add-outline" size={20} color={theme.gray} />
                </View>
                <Text style={[styles.memberName, { color: theme.gray }]}>Add</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ── Balance Card (hidden during search) ── */}
          {!searchActive && (
            <View style={[styles.balanceCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>GROUP BALANCE</Text>
              <Text style={[styles.balanceAmount, { color: netBalance >= 0 ? Colors.success : Colors.error }]}>
                {netBalance >= 0 ? '+' : ''} Rs. {Math.abs(netBalance).toLocaleString('en-PK')}
              </Text>
              <View style={[styles.balanceBadge, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.balanceBadgeText, { color: theme.primary }]}>Overall Owed</Text>
              </View>

              {(totalOwed + totalOwe) > 0 && (
                <View style={[styles.progressBar, { backgroundColor: theme.grayLighter }]}>
                  <View style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(totalOwed / (totalOwed + totalOwe) * 100, 100)}%`,
                      backgroundColor: netBalance >= 0 ? Colors.success : Colors.error,
                    },
                  ]} />
                </View>
              )}

              {balances.length > 0 ? (
                <View style={styles.balanceDetails}>
                  {balances.slice(0, 4).map(b => (
                    <View key={b.memberId} style={styles.balanceDetailItem}>
                      <Text style={[styles.balanceDetailName, { color: theme.text }]}>{b.memberName}</Text>
                      <View style={styles.balanceDetailRight}>
                        <Text style={[
                          styles.balanceDetailAmount,
                          { color: b.owesYou ? Colors.success : Colors.error },
                        ]}>
                          {b.owesYou ? '+' : '-'} Rs. {b.amount.toLocaleString('en-PK')}
                        </Text>
                        <TouchableOpacity
                          style={[styles.miniSettleBtn, { backgroundColor: theme.primaryLight }]}
                          onPress={() => handleSettleUp(b.memberId, b.memberName)}
                          disabled={settling === b.memberId}
                        >
                          {settling === b.memberId
                            ? <ActivityIndicator size="small" color={theme.primary} />
                            : <Text style={[styles.miniSettleText, { color: theme.primary }]}>Settle</Text>
                          }
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.allSettledText, { color: Colors.success }]}>✓ All settled up!</Text>
              )}
            </View>
          )}

          {/* ── Expenses section ── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {searchActive && q ? `Results (${displayedExpenses.length})` : 'Expenses'}
            </Text>
            {!searchActive && (
              <TouchableOpacity onPress={openSearch}>
                <Text style={[styles.seeAll, { color: theme.primary }]}>Search ›</Text>
              </TouchableOpacity>
            )}
          </View>

          {displayedExpenses.length === 0 && (!searchActive || q.length === 0) ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.card }]}>
              <Ionicons name="receipt-outline" size={48} color={theme.grayLight} style={{ marginBottom: Spacing.sm }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Expenses Yet</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Tap + to add the first expense.</Text>
            </View>
          ) : (
            <View style={styles.expensesList}>
              {displayedExpenses.map(expense => {
                const isYours = expense.paidById === user?.id;
                return (
                  <TouchableOpacity
                    key={expense.id}
                    style={[styles.expenseCard, { backgroundColor: theme.card }]}
                    activeOpacity={0.85}
                    onPress={() => router.push({ pathname: '/expense-detail', params: { id: expense.id } })}
                    accessibilityRole="button"
                  >
                    <View style={[styles.expenseIconBox, { backgroundColor: theme.primaryLight }]}>
                      <Text style={styles.expenseIcon}>{expense.categoryIcon}</Text>
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={[styles.expenseTitle, { color: theme.text }]} numberOfLines={1}>
                        {expense.title}
                      </Text>
                      <Text style={[styles.expenseMeta, { color: theme.textSecondary }]}>
                        Paid by {isYours ? 'you' : expense.paidByName}
                        {' · '}
                        {new Date(expense.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.expenseRight}>
                      <Text style={[styles.expenseAmount, { color: theme.text }]}>
                        Rs. {expense.amount.toLocaleString('en-PK')}
                      </Text>
                      <View style={[
                        styles.expenseTag,
                        { backgroundColor: isYours ? theme.primaryLight : theme.grayLighter },
                      ]}>
                        <Text style={[
                          styles.expenseTagText,
                          { color: isYours ? theme.primary : theme.gray },
                        ]}>
                          {isYours ? 'Your expense' : 'Shared'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => router.push({ pathname: '/(tabs)/add-expense', params: { groupId: group.id } })}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Add expense"
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── Settle Up Bar ── */}
      <View style={[styles.bottomBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.settleUpBtn,
            { backgroundColor: balances.length === 0 ? theme.grayLighter : theme.primary },
            (isSettlingAll || balances.length === 0) && styles.disabledBtn,
          ]}
          onPress={handleSettleAll}
          disabled={isSettlingAll || balances.length === 0}
          accessibilityRole="button"
        >
          {isSettlingAll ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.settleRow}>
              <Ionicons name="checkmark-done-circle-outline" size={24} color={balances.length === 0 ? theme.textSecondary : '#FFFFFF'} />
              <Text style={[styles.settleUpBtnText, { color: balances.length === 0 ? theme.textSecondary : '#FFFFFF' }]}>
                {balances.length === 0 ? 'All Settled ✓' : 'Settle Up'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Add Member Modal ── */}
      <Modal visible={addMemberVisible} transparent animationType="slide" onRequestClose={resetAddMember}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={resetAddMember}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Member</Text>

            <Text style={[styles.modalLabel, { color: theme.text }]}>Name</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: nameError ? Colors.error : theme.border }]}
              placeholder="Member name"
              placeholderTextColor={theme.grayLight}
              value={memberName}
              onChangeText={t => { setMemberName(t); setNameError(''); }}
              accessibilityLabel="Member name"
            />
            {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}

            <Text style={[styles.modalLabel, { color: theme.text }]}>Email</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: emailError ? Colors.error : theme.border }]}
              placeholder="member@example.com"
              placeholderTextColor={theme.grayLight}
              value={memberEmail}
              onChangeText={t => { setMemberEmail(t); setEmailError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel="Member email"
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={resetAddMember}>
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primary }, adding && styles.disabledBtn]}
                onPress={handleAddMember}
                disabled={adding}
              >
                {adding ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.addBtnText}>Add Member</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Settings Modal ── */}
      <Modal visible={settingsVisible} transparent animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={() => setSettingsVisible(false)}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            {/* Title row */}
            <View style={styles.settingsHeader}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>Group Settings</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={theme.grayLight} />
              </TouchableOpacity>
            </View>

            {/* Emoji picker */}
            <Text style={[styles.modalLabel, { color: theme.text }]}>Group Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              <View style={styles.emojiRow}>
                {EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[
                      styles.emojiBtn,
                      { backgroundColor: theme.grayLighter, borderColor: 'transparent' },
                      editEmoji === e && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
                    ]}
                    onPress={() => setEditEmoji(e)}
                  >
                    <Text style={styles.emojiOption}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Group name */}
            <Text style={[styles.modalLabel, { color: theme.text }]}>Group Name</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                  borderColor: editNameError ? Colors.error : theme.border,
                },
              ]}
              placeholder="e.g. Trip to Murree"
              placeholderTextColor={theme.grayLight}
              value={editName}
              onChangeText={t => { setEditName(t); setEditNameError(''); }}
              accessibilityLabel="Group name"
            />
            {editNameError ? <Text style={styles.fieldError}>{editNameError}</Text> : null}

            {/* Save button */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={() => setSettingsVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primary }, savingSettings && styles.disabledBtn]}
                onPress={handleSaveSettings}
                disabled={savingSettings}
              >
                {savingSettings
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.addBtnText}>Save Changes</Text>
                }
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={[styles.settingsDivider, { backgroundColor: theme.border }]} />

            {/* Delete group */}
            <TouchableOpacity
              style={[styles.deleteGroupBtn, { backgroundColor: '#FEE2E2' }]}
              onPress={handleDeleteGroup}
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={styles.deleteGroupText}>Delete Group</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  errorText: { fontSize: Fonts.sizes.lg, fontWeight: '600' },
  goBackBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  goBackText: { fontSize: Fonts.sizes.md, fontWeight: '700' },

  // ── Search bar ────────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: Fonts.sizes.md, paddingVertical: 6 },
  noResults: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  noResultsText: { fontSize: Fonts.sizes.md, fontWeight: '500' },

  // ── Scroll / layout ───────────────────────────────────────────────────────
  scroll: { padding: Spacing.lg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.lg,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 2,
  },
  headerTitle: { fontSize: Fonts.sizes.xl, fontWeight: '700', flex: 1, marginLeft: Spacing.md },
  headerIcons: { flexDirection: 'row', gap: Spacing.sm },

  // ── Members ───────────────────────────────────────────────────────────────
  membersScroll: { gap: Spacing.md, paddingRight: Spacing.md, marginBottom: Spacing.lg },
  memberItem: { alignItems: 'center' },
  memberAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs,
  },
  memberAvatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  memberName: { fontSize: Fonts.sizes.xs, fontWeight: '500', maxWidth: 60 },
  addMemberAvatar: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderStyle: 'dashed', marginBottom: Spacing.xs,
  },

  // ── Balance card ──────────────────────────────────────────────────────────
  balanceCard: {
    borderRadius: Radius.xxl, padding: Spacing.lg, marginBottom: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  balanceLabel: { fontSize: Fonts.sizes.sm, fontWeight: '500', marginBottom: Spacing.xs },
  balanceAmount: { fontSize: Fonts.sizes.xxxl, fontWeight: '800', marginBottom: Spacing.sm },
  balanceBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: Radius.full, alignSelf: 'flex-start', marginBottom: Spacing.md,
  },
  balanceBadgeText: { fontSize: Fonts.sizes.xs, fontWeight: '600' },
  progressBar: { height: 8, borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.md },
  progressFill: { height: '100%' },
  balanceDetails: { gap: Spacing.sm },
  balanceDetailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceDetailName: { fontSize: Fonts.sizes.sm, fontWeight: '500', flex: 1 },
  balanceDetailRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  balanceDetailAmount: { fontSize: Fonts.sizes.sm, fontWeight: '700' },
  miniSettleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  miniSettleText: { fontSize: Fonts.sizes.xs, fontWeight: '700' },
  allSettledText: { fontSize: Fonts.sizes.sm, fontWeight: '600', textAlign: 'center' },

  // ── Expenses list ─────────────────────────────────────────────────────────
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700' },
  seeAll: { fontSize: Fonts.sizes.sm, fontWeight: '600' },
  expensesList: { gap: Spacing.sm },
  expenseCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  expenseIconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  expenseIcon: { fontSize: 20 },
  expenseInfo: { flex: 1 },
  expenseTitle: { fontSize: Fonts.sizes.md, fontWeight: '600', marginBottom: 2 },
  expenseMeta: { fontSize: Fonts.sizes.xs },
  expenseRight: { alignItems: 'flex-end' },
  expenseAmount: { fontSize: Fonts.sizes.md, fontWeight: '700', marginBottom: 4 },
  expenseTag: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  expenseTagText: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  emptyBox: {
    borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', marginBottom: 4 },
  emptyText: { fontSize: Fonts.sizes.sm },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute', bottom: Spacing.lg, right: Spacing.lg,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 10,
  },

  // ── Bottom bar ────────────────────────────────────────────────────────────
  bottomBar: {
    left: 0, right: 0,
    padding: Spacing.lg, paddingBottom: Spacing.xxl, borderTopWidth: 1,
  },
  settleUpBtn: {
    borderRadius: Radius.full, paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  disabledBtn: { opacity: 0.6 },
  settleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settleUpBtnText: { fontSize: Fonts.sizes.lg, fontWeight: '700' },

  // ── Modals ────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    padding: Spacing.lg, paddingBottom: Spacing.xxl,
  },
  modalTitle: { fontSize: Fonts.sizes.xl, fontWeight: '700', marginBottom: Spacing.lg, textAlign: 'center' },
  modalLabel: { fontSize: Fonts.sizes.sm, fontWeight: '600', marginBottom: Spacing.xs, marginTop: Spacing.sm },
  modalInput: {
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: Fonts.sizes.md, borderWidth: 1.5,
  },
  fieldError: { fontSize: Fonts.sizes.xs, color: Colors.error, fontWeight: '500', marginTop: 3 },
  modalButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.full, borderWidth: 1.5, alignItems: 'center' },
  cancelBtnText: { fontSize: Fonts.sizes.md, fontWeight: '600' },
  addBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.full, alignItems: 'center', elevation: 4 },
  addBtnText: { fontSize: Fonts.sizes.md, fontWeight: '700', color: '#FFFFFF' },

  // ── Settings modal specifics ──────────────────────────────────────────────
  settingsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emojiRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.sm },
  emojiBtn: {
    width: 48, height: 48, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  emojiOption: { fontSize: 22 },
  settingsDivider: { height: 1, marginVertical: Spacing.lg },
  deleteGroupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderRadius: Radius.full, paddingVertical: 14,
  },
  deleteGroupText: { color: Colors.error, fontSize: Fonts.sizes.md, fontWeight: '700' },
});
