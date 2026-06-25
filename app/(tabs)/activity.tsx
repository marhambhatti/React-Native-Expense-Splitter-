import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useExpenses } from '../../context/ExpenseContext';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

const FILTERS = ['All', 'Owed to You', 'You Owe', 'Settled'] as const;
type Filter = typeof FILTERS[number];
const MEMBER_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

export default function ActivityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { expenses, getOverallBalances, getTotalOwed, getTotalOwe, settleUp } = useExpenses();
  const { theme } = useTheme();

  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [activeTab, setActiveTab] = useState<'activity' | 'settle'>('activity');
  const [settling, setSettling] = useState<string | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Filter + search logic ──────────────────────────────────────────────────
  const q = searchQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    return expenses.filter(item => {
      const isOwed = item.paidById === user?.id;
      const isSettled = item.participants.every(p => p.settled);

      // Filter tab
      let passesFilter = true;
      if (activeFilter === 'Owed to You') passesFilter = isOwed && !isSettled;
      else if (activeFilter === 'You Owe') passesFilter = !isOwed && !isSettled;
      else if (activeFilter === 'Settled') passesFilter = isSettled;

      if (!passesFilter) return false;

      // Search query
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.groupName.toLowerCase().includes(q) ||
        item.paidByName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [expenses, activeFilter, user, q]);

  const overallBalances = getOverallBalances();
  const owedToYou = overallBalances.filter(b => b.owesYou);
  const youOwe = overallBalances.filter(b => !b.owesYou);
  const netBalance = getTotalOwed() - getTotalOwe();

  const handleSettle = (groupId: string, memberId: string, memberName: string) => {
    if (!groupId) { Alert.alert('Error', 'Could not determine group for this balance.'); return; }
    Alert.alert('Settle Up', `Settle all balances with ${memberName}?`, [
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

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === now.toDateString())
        return `Today, ${date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`;
      if (date.toDateString() === yesterday.toDateString())
        return `Yesterday, ${date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`;
      return date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return isoString; }
  };

  const openSearch = () => setSearchActive(true);
  const closeSearch = () => { setSearchActive(false); setSearchQuery(''); };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        {searchActive ? (
          // ── Inline search bar ──
          <View style={[styles.inlineSearch, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Ionicons name="search" size={16} color={theme.grayLight} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search by title, group, payer..."
              placeholderTextColor={theme.grayLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            <TouchableOpacity onPress={closeSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={theme.grayLight} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Activity</Text>
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: theme.card }]}
              onPress={openSearch}
              accessibilityRole="button"
              accessibilityLabel="Search activity"
            >
              <Ionicons name="search" size={20} color={theme.text} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Tab Toggle — hidden during search */}
      {!searchActive && (
        <View style={[styles.tabToggle, { backgroundColor: theme.grayLighter }]}>
          {(['activity', 'settle'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && { backgroundColor: theme.card }]}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab }}
            >
              <Text style={[
                styles.tabBtnText,
                { color: activeTab === tab ? theme.primary : theme.textSecondary },
                activeTab === tab && styles.tabBtnTextActive,
              ]}>
                {tab === 'activity' ? 'Activity' : 'Settle Up'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Activity tab (or search results) */}
      {(activeTab === 'activity' || searchActive) ? (
        <>
          {/* Filter chips — hidden during active search query */}
          {!searchActive && (
            <View style={styles.filtersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
                {FILTERS.map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterChip, {
                      backgroundColor: activeFilter === f ? theme.primary : theme.card,
                      borderColor: activeFilter === f ? theme.primary : theme.border,
                    }]}
                    onPress={() => setActiveFilter(f)}
                  >
                    <Text style={[styles.filterText, { color: activeFilter === f ? '#FFFFFF' : theme.textSecondary }]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Search result count badge */}
          {searchActive && q.length > 0 && (
            <View style={[styles.searchResultBadge, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.searchResultBadgeText, { color: theme.primary }]}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{searchQuery}"
              </Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons
                  name={searchActive ? 'search-outline' : 'folder-open-outline'}
                  size={48}
                  color={theme.grayLight}
                />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  {searchActive ? 'No results' : 'No Activity'}
                </Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {searchActive
                    ? `Nothing matches "${searchQuery}"`
                    : activeFilter === 'All' ? 'Add your first expense to see activity.' : `No expenses match "${activeFilter}".`
                  }
                </Text>
              </View>
            ) : (
              filtered.map(item => {
                const isOwed = item.paidById === user?.id;
                const isSettled = item.participants.every(p => p.settled);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.activityCard, { backgroundColor: theme.card }]}
                    onPress={() => router.push({ pathname: '/expense-detail', params: { id: item.id } })}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                  >
                    <View style={[styles.iconBox, { backgroundColor: isSettled ? theme.grayLighter : theme.primaryLight }]}>
                      <Text style={styles.activityIcon}>{item.categoryIcon}</Text>
                    </View>
                    <View style={styles.activityMid}>
                      <Text style={[styles.activityTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                      <Text style={[styles.activityGroup, { color: theme.textSecondary }]} numberOfLines={1}>
                        {isOwed ? 'Paid by you' : `Paid by ${item.paidByName}`}{' · '}{item.groupName}
                      </Text>
                      <Text style={[styles.activityDate, { color: theme.grayLight }]}>{formatDate(item.date)}</Text>
                    </View>
                    <View style={styles.activityRight}>
                      {isSettled ? (
                        <View style={[styles.settledBadge, { backgroundColor: theme.grayLighter }]}>
                          <Text style={[styles.settledBadgeText, { color: theme.textSecondary }]}>Settled</Text>
                        </View>
                      ) : (
                        <>
                          <Text style={[styles.activityAmount, { color: isOwed ? Colors.success : Colors.error }]}>
                            {isOwed ? '+' : '-'} Rs. {Math.abs(item.amount).toLocaleString('en-PK')}
                          </Text>
                          <Text style={[styles.activityType, { color: theme.grayLight }]}>
                            {isOwed ? 'OWED TO YOU' : 'YOU OWE'}
                          </Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        </>
      ) : (
        /* Settle Up tab */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={[styles.settleSummary, { backgroundColor: theme.card }]}>
            <Text style={[styles.settleSummaryTitle, { color: theme.textSecondary }]}>Net Balance</Text>
            <Text style={[styles.settleSummaryAmount, {
              color: netBalance > 0 ? Colors.success : netBalance < 0 ? Colors.error : theme.text,
            }]}>
              {netBalance > 0 ? '+ ' : netBalance < 0 ? '- ' : ''}Rs. {Math.abs(netBalance).toLocaleString('en-PK')}
            </Text>
            <Text style={[styles.settleSummaryNote, {
              color: netBalance > 0 ? Colors.success : netBalance < 0 ? Colors.error : theme.textSecondary,
            }]}>
              {netBalance > 0 ? 'You are owed overall 🎉' : netBalance < 0 ? 'You owe overall' : 'All settled up! 🤝'}
            </Text>
          </View>

          {owedToYou.length > 0 && (
            <>
              <Text style={[styles.settleGroupLabel, { color: theme.grayLight }]}>
                THEY OWE YOU · {owedToYou.length} {owedToYou.length === 1 ? 'Person' : 'People'}
              </Text>
              {owedToYou.map((b, i) => (
                <View key={`owed_${b.memberId}_${i}`} style={[styles.settleCard, { backgroundColor: theme.card }]}>
                  <View style={[styles.settleAvatar, { backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }]}>
                    <Text style={styles.settleAvatarText}>{b.memberName?.[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View style={styles.settleInfo}>
                    <Text style={[styles.settleName, { color: theme.text }]}>{b.memberName} owes you</Text>
                    <Text style={[styles.settleAmount, { color: Colors.success }]}>Rs. {b.amount.toLocaleString('en-PK')}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.markSettledBtn, settling === b.memberId && styles.disabledBtn]}
                    onPress={() => handleSettle(b.groupId, b.memberId, b.memberName)}
                    disabled={settling === b.memberId}
                  >
                    {settling === b.memberId
                      ? <ActivityIndicator size="small" color={Colors.success} />
                      : <Text style={styles.markSettledText}>Mark Settled</Text>
                    }
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {youOwe.length > 0 && (
            <>
              <Text style={[styles.settleGroupLabel, { color: theme.grayLight, marginTop: Spacing.lg }]}>
                YOU OWE · {youOwe.length} {youOwe.length === 1 ? 'Person' : 'People'}
              </Text>
              {youOwe.map((b, i) => (
                <View key={`owe_${b.memberId}_${i}`} style={[styles.settleCard, { backgroundColor: theme.card }]}>
                  <View style={[styles.settleAvatar, { backgroundColor: MEMBER_COLORS[(i + 2) % MEMBER_COLORS.length] }]}>
                    <Text style={styles.settleAvatarText}>{b.memberName?.[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View style={styles.settleInfo}>
                    <Text style={[styles.settleName, { color: theme.text }]}>You owe {b.memberName}</Text>
                    <Text style={[styles.settleAmount, { color: Colors.error }]}>Rs. {b.amount.toLocaleString('en-PK')}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.settleNowBtn, { backgroundColor: theme.primaryLight }, settling === b.memberId && styles.disabledBtn]}
                    onPress={() => handleSettle(b.groupId, b.memberId, b.memberName)}
                    disabled={settling === b.memberId}
                  >
                    {settling === b.memberId
                      ? <ActivityIndicator size="small" color={theme.primary} />
                      : <Text style={[styles.settleNowText, { color: theme.primary }]}>Settle Now</Text>
                    }
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {owedToYou.length === 0 && youOwe.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-circle-outline" size={56} color={Colors.success} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>All Settled!</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>You have no outstanding balances.</Text>
            </View>
          )}

          <View style={styles.settleFooter}>
            <Ionicons name="bulb-outline" size={20} color={theme.primary} />
            <Text style={[styles.settleFooterText, { color: theme.textSecondary }]}>Resolving balances builds trust</Text>
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  headerTitle: { fontSize: Fonts.sizes.xxl, fontWeight: '800' },
  searchBtn: {
    width: 42, height: 42, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  // ── Inline search bar (replaces header row) ───────────────────────────────
  inlineSearch: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: Fonts.sizes.md, paddingVertical: 2 },
  searchResultBadge: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full, alignSelf: 'flex-start',
  },
  searchResultBadgeText: { fontSize: Fonts.sizes.xs, fontWeight: '700' },
  tabToggle: {
    flexDirection: 'row', marginHorizontal: Spacing.lg,
    borderRadius: Radius.md, padding: 4, marginBottom: Spacing.sm,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.sm },
  tabBtnText: { fontSize: Fonts.sizes.sm, fontWeight: '600' },
  tabBtnTextActive: { fontWeight: '700' },
  filtersContainer: { height: 48, marginBottom: Spacing.sm },
  filtersRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: Spacing.md, height: 36, borderRadius: Radius.full,
    borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
  },
  filterText: { fontSize: Fonts.sizes.sm, fontWeight: '600' },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  activityCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  iconBox: { width: 46, height: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  activityIcon: { fontSize: 20 },
  activityMid: { flex: 1 },
  activityTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', marginBottom: 2 },
  activityGroup: { fontSize: Fonts.sizes.xs, marginBottom: 2 },
  activityDate: { fontSize: Fonts.sizes.xs },
  activityRight: { alignItems: 'flex-end' },
  activityAmount: { fontSize: Fonts.sizes.md, fontWeight: '700', marginBottom: 2 },
  activityType: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  settledBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  settledBadgeText: { fontSize: Fonts.sizes.xs, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700' },
  emptyText: { fontSize: Fonts.sizes.sm, textAlign: 'center' },
  settleSummary: {
    borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  settleSummaryTitle: { fontSize: Fonts.sizes.sm, fontWeight: '500', marginBottom: 4 },
  settleSummaryAmount: { fontSize: Fonts.sizes.xxxl, fontWeight: '800', marginBottom: 4 },
  settleSummaryNote: { fontSize: Fonts.sizes.sm, fontWeight: '600' },
  settleGroupLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.sm },
  settleCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  settleAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  settleAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  settleInfo: { flex: 1 },
  settleName: { fontSize: Fonts.sizes.md, fontWeight: '600', marginBottom: 2 },
  settleAmount: { fontSize: Fonts.sizes.md, fontWeight: '800' },
  markSettledBtn: { backgroundColor: '#D1FAE5', paddingHorizontal: Spacing.sm, paddingVertical: 8, borderRadius: Radius.md },
  markSettledText: { fontSize: Fonts.sizes.xs, color: Colors.success, fontWeight: '700' },
  settleNowBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 8, borderRadius: Radius.md },
  settleNowText: { fontSize: Fonts.sizes.xs, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
  settleFooter: { alignItems: 'center', marginTop: Spacing.xl, gap: Spacing.sm, flexDirection: 'row', justifyContent: 'center' },
  settleFooterText: { fontSize: Fonts.sizes.sm, fontWeight: '500' },
});
