import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Radius, Fonts, Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useGroups } from '../../context/GroupContext';
import { useExpenses } from '../../context/ExpenseContext';
import { useTheme } from '../../context/ThemeContext';

const MEMBER_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { groups } = useGroups();
  const { expenses, getTotalOwed, getTotalOwe } = useExpenses();
  const { theme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);

  const recentGroups = groups.slice(0, 5);
  const recentActivity = expenses.slice(0, 5);

  const formatAmount = (amount: number) => amount.toLocaleString('en-PK');

  // ── Search Logic ───────────────────────────────────────────────────────────
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return [];
    return groups.filter(g => g.name.toLowerCase().includes(normalizedQuery));
  }, [groups, normalizedQuery]);

  const filteredExpenses = useMemo(() => {
    if (!normalizedQuery) return [];
    return expenses.filter(e =>
      e.title.toLowerCase().includes(normalizedQuery) ||
      e.groupName.toLowerCase().includes(normalizedQuery) ||
      e.category.toLowerCase().includes(normalizedQuery) ||
      e.paidByName.toLowerCase().includes(normalizedQuery)
    );
  }, [expenses, normalizedQuery]);

  const hasResults = filteredGroups.length > 0 || filteredExpenses.length > 0;

  const openSearch = () => setSearchActive(true);
  const closeSearch = () => { 
    setSearchActive(false); 
    setSearchQuery(''); 
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* ── Search Navigation Bar ── */}
      {searchActive && (
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.grayLight} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search groups, expenses..."
            placeholderTextColor={theme.grayLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            accessibilityLabel="Search Directory"
          />
          <TouchableOpacity onPress={closeSearch} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close-circle" size={22} color={theme.grayLight} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Standard Header ── */}
        {!searchActive && (
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.primary }]}>Expense Splitter</Text>
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: theme.card }]}
              onPress={openSearch}
              accessibilityRole="button"
              accessibilityLabel="Open Search Directory"
            >
              <Ionicons name="search" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Search Results Render ── */}
        {searchActive && normalizedQuery.length > 0 && (
          <View style={styles.searchResults}>
            {!hasResults ? (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={48} color={theme.grayLight} />
                <Text style={[styles.noResultsText, { color: theme.textSecondary }]}>
                  No matching records for "{searchQuery}"
                </Text>
              </View>
            ) : (
              <>
                {filteredGroups.length > 0 && (
                  <>
                    <Text style={[styles.searchSectionLabel, { color: theme.grayLight }]}>ACTIVE GROUPS</Text>
                    {filteredGroups.map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.searchResultRow, { backgroundColor: theme.card }]}
                        onPress={() => {
                          closeSearch();
                          router.push({ pathname: '/group-detail', params: { id: g.id } });
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.searchResultIcon, { backgroundColor: theme.primaryLight }]}>
                           <Ionicons name={(g as any).icon || 'folder-outline'} size={20} color={theme.primary} />
                        </View>
                        <View style={styles.searchResultInfo}>
                          <Text style={[styles.searchResultTitle, { color: theme.text }]}>{g.name}</Text>
                          <Text style={[styles.searchResultSub, { color: theme.textSecondary }]}>
                            {g.members.length} active members
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.grayLight} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {filteredExpenses.length > 0 && (
                  <>
                    <Text style={[styles.searchSectionLabel, { color: theme.grayLight, marginTop: Spacing.md }]}>
                      LOGGED EXPENSES
                    </Text>
                    {filteredExpenses.map(e => {
                      const isOwed = e.paidById === user?.id;
                      return (
                        <TouchableOpacity
                          key={e.id}
                          style={[styles.searchResultRow, { backgroundColor: theme.card }]}
                          onPress={() => {
                            closeSearch();
                            router.push({ pathname: '/expense-detail', params: { id: e.id } });
                          }}
                          activeOpacity={0.8}
                        >
                          {/* FIX: Changed e.icon to e.categoryIcon */}
                          <View style={[styles.searchResultIcon, { backgroundColor: theme.primaryLight }]}>
                            <Ionicons name={(e.categoryIcon as any) || 'receipt-outline'} size={20} color={theme.primary} />
                          </View>
                          <View style={styles.searchResultInfo}>
                            <Text style={[styles.searchResultTitle, { color: theme.text }]}>{e.title}</Text>
                            <Text style={[styles.searchResultSub, { color: theme.textSecondary }]}>
                              {e.groupName} · {isOwed ? 'You financed' : `Financed by ${e.paidByName}`}
                            </Text>
                          </View>
                          <Text style={[
                            styles.searchResultAmount,
                            { color: isOwed ? Colors.success : Colors.error },
                          ]}>
                            Rs. {e.amount.toLocaleString('en-PK')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* ── Dashboard Content ── */}
        {!(searchActive && normalizedQuery.length > 0) && (
          <>
            {/* Balance Overview */}
            <View style={styles.balanceRow}>
              <View style={[styles.balanceCard, { backgroundColor: theme.success + '15' }]}>
                <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Receivables</Text>
                <Text style={[styles.balanceAmount, { color: theme.success }]}>
                  Rs. {formatAmount(getTotalOwed())}
                </Text>
              </View>
              <View style={[styles.balanceCard, { backgroundColor: theme.error + '15' }]}>
                <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Payables</Text>
                <Text style={[styles.balanceAmount, { color: theme.error }]}>
                  Rs. {formatAmount(getTotalOwe())}
                </Text>
              </View>
            </View>

            {/* Active Groups Widget */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Workspaces</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/groups')}>
                <Text style={[styles.viewAll, { color: theme.primary }]}>View Directory →</Text>
              </TouchableOpacity>
            </View>

            {recentGroups.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.card }]}>
                <Ionicons name="folder-open-outline" size={48} color={theme.primary} style={styles.emptyIcon} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Active Workspaces</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Initialize your first group to get started.</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.groupsScroll}
              >
                {recentGroups.map((group) => {
                  const balances = expenses
                    .filter(e => e.groupId === group.id)
                    .reduce((acc, exp) => exp.paidById === user?.id ? acc + exp.amount : acc, 0);
                  const isOwed = balances > 0;

                  return (
                    <TouchableOpacity
                      key={group.id}
                      style={[styles.groupCard, { backgroundColor: theme.card }]}
                      activeOpacity={0.85}
                      onPress={() => router.push({ pathname: '/group-detail', params: { id: group.id } })}
                    >
                      <View style={[styles.groupIconBox, { backgroundColor: theme.primaryLight }]}>
                        <Ionicons name={(group as any).icon || 'folder-outline'} size={22} color={theme.primary} />
                      </View>
                      <Text style={[styles.groupName, { color: theme.text }]} numberOfLines={1}>{group.name}</Text>
                      <View style={styles.groupMembersRow}>
                        <Text style={[styles.groupMembers, { color: theme.textSecondary }]}>
                          {group.members.length} Users
                        </Text>
                        <View style={styles.avatarRow}>
                          {group.members.slice(0, 3).map((m, i) => (
                            <View
                              key={m.id}
                              style={[
                                styles.avatar,
                                {
                                  backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length],
                                  marginLeft: i > 0 ? -8 : 0,
                                  zIndex: 3 - i,
                                  borderColor: theme.card,
                                }
                              ]}
                            >
                              <Text style={styles.avatarText}>{m.name[0]?.toUpperCase()}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      <Text style={[styles.groupBalance, { color: isOwed ? theme.success : theme.error }]}>
                        {isOwed ? '+' : '-'} Rs. {formatAmount(Math.abs(balances))}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Transaction Ledger */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Transaction Ledger</Text>
            </View>

            {recentActivity.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.card }]}>
                <Ionicons name="receipt-outline" size={48} color={theme.primary} style={styles.emptyIcon} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Transactions</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Record your first financial entry.</Text>
              </View>
            ) : (
              <View style={styles.activityList}>
                {recentActivity.map(item => {
                  const isOwed = item.paidById === user?.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.activityCard, { backgroundColor: theme.card }]}
                      activeOpacity={0.85}
                      onPress={() => router.push({ pathname: '/expense-detail', params: { id: item.id } })}
                    >
                      <View style={[styles.activityIconBox, { backgroundColor: theme.primaryLight }]}>
                        <Ionicons name={(item.categoryIcon as any) || 'cash-outline'} size={20} color={theme.primary} />
                      </View>
                      <View style={styles.activityInfo}>
                        <Text style={[styles.activityTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.activityGroup, { color: theme.textSecondary }]}>
                          Financed by {isOwed ? 'you' : item.paidByName} · {item.groupName}
                        </Text>
                      </View>
                      <View style={styles.activityRight}>
                        <Text style={[styles.activityAmount, { color: isOwed ? theme.success : theme.error }]}>
                          {isOwed ? '+' : '-'} Rs. {formatAmount(item.amount)}
                        </Text>
                        <Text style={[styles.activityType, { color: theme.grayLight }]}>
                          {isOwed ? 'RECEIVABLE' : 'PAYABLE'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* ── Floating Action Button ── */}
      {!searchActive && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/(tabs)/add-expense')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Record New Transaction"
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.lg },

  // ── Search Navigation ──────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: Fonts.sizes.md, paddingVertical: 8 },
  searchResults: { marginBottom: Spacing.md },
  searchSectionLabel: {
    fontSize: Fonts.sizes.xs, fontWeight: '700', letterSpacing: 1.2,
    marginBottom: Spacing.sm, paddingLeft: 4,
  },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  searchResultIcon: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  searchResultInfo: { flex: 1 },
  searchResultTitle: { fontSize: Fonts.sizes.md, fontWeight: '600', marginBottom: 4 },
  searchResultSub: { fontSize: Fonts.sizes.xs },
  searchResultAmount: { fontSize: Fonts.sizes.sm, fontWeight: '700' },
  noResults: { alignItems: 'center', paddingVertical: Spacing.xxl * 2, gap: Spacing.md },
  noResultsText: { fontSize: Fonts.sizes.md, fontWeight: '500' },

  // ── Header Configuration ───────────────────────────────────────────────────
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.xl,
  },
  headerTitle: { fontSize: Fonts.sizes.xl, fontWeight: '800', letterSpacing: -0.5 },
  searchBtn: {
    width: 44, height: 44, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },

  // ── Balance Widgets ────────────────────────────────────────────────────────
  balanceRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  balanceCard: {
    flex: 1, borderRadius: Radius.lg, padding: Spacing.lg,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  balanceLabel: { fontSize: Fonts.sizes.xs, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceAmount: { fontSize: Fonts.sizes.lg, fontWeight: '800' },

  // ── Section Layouts ────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.md, paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', letterSpacing: -0.3 },
  viewAll: { fontSize: Fonts.sizes.sm, fontWeight: '600' },

  // ── Group Cards ────────────────────────────────────────────────────────────
  groupsScroll: { gap: Spacing.md, paddingRight: Spacing.lg, marginBottom: Spacing.xl },
  groupCard: {
    width: 150, borderRadius: Radius.lg, padding: Spacing.md,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  groupIconBox: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  groupName: { fontSize: Fonts.sizes.md, fontWeight: '700', marginBottom: 6 },
  groupMembersRow: { marginBottom: 8 },
  groupMembers: { fontSize: Fonts.sizes.xs, marginBottom: 6, fontWeight: '500' },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  avatarText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  groupBalance: { fontSize: Fonts.sizes.sm, fontWeight: '700' },

  // ── Transaction Ledger ─────────────────────────────────────────────────────
  activityList: { gap: Spacing.md },
  activityCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.md,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  activityIconBox: {
    width: 48, height: 48, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', marginBottom: 4 },
  activityGroup: { fontSize: Fonts.sizes.xs, fontWeight: '500' },
  activityRight: { alignItems: 'flex-end' },
  activityAmount: { fontSize: Fonts.sizes.md, fontWeight: '800', marginBottom: 4 },
  activityType: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },

  // ── Empty States ───────────────────────────────────────────────────────────
  emptyBox: {
    borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center',
    marginBottom: Spacing.xl,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  emptyIcon: { marginBottom: Spacing.md },
  emptyTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', marginBottom: 6 },
  emptyText: { fontSize: Fonts.sizes.sm, textAlign: 'center' },

  // ── Floating Action Button ─────────────────────────────────────────────────
 // ── Floating Action Button ─────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    // CHANGE THIS VALUE: Use 24 for a standard screen, or ~90 if it's hiding behind a bottom tab bar!
    bottom: 74, 
    right: 24, // Use a hardcoded pixel value here for consistent edge alignment
    width: 60, 
    height: 60, 
    borderRadius: 30,
    alignItems: 'center', 
    justifyContent: 'center',
    zIndex: 999, // Crucial: Forces it to stay on top of all ScrollView elements
    elevation: 8, // Slightly stronger shadow for Android
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, // Slightly darker shadow for iOS
    shadowRadius: 8,
  },
});