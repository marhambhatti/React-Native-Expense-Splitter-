import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useGroups } from '../../context/GroupContext';
import { useExpenses, SplitType } from '../../context/ExpenseContext';
import { useTheme } from '../../context/ThemeContext';

const CATEGORIES = [
  { id: '1', label: 'Food',          icon: 'fast-food-outline' },
  { id: '2', label: 'Rent',          icon: 'home-outline' },
  { id: '3', label: 'Travel',        icon: 'airplane-outline' },
  { id: '4', label: 'Utilities',     icon: 'flash-outline' },
  { id: '5', label: 'Entertainment', icon: 'film-outline' },
  { id: '6', label: 'Shopping',      icon: 'cart-outline' },
  { id: '7', label: 'Healthcare',    icon: 'medkit-outline' },
  { id: '8', label: 'Other',         icon: 'wallet-outline' },
] as const;

const SPLIT_TYPES = ['Equally', 'Custom', 'Percentage'] as const;
type SplitTypeLabel = typeof SPLIT_TYPES[number];
const MEMBER_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId?: string }>();
  const { user } = useAuth();
  const { groups } = useGroups();
  const { addExpense } = useExpenses();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('1');
  const [selectedSplit, setSelectedSplit] = useState<SplitTypeLabel>('Equally');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    params.groupId && groups.some(g => g.id === params.groupId)
      ? params.groupId
      : (groups[0]?.id ?? ''),
  );
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentGroup = useMemo(
    () => groups.find(g => g.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  const handleGroupChange = useCallback((groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedParticipantIds([]);
    setCustomAmounts({});
    setErrors(e => ({ ...e, group: '', participants: '' }));
  }, []);

  const toggleParticipant = useCallback((id: string) => {
    setSelectedParticipantIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
    setErrors(e => ({ ...e, participants: '' }));
  }, []);

  const selectAll = () => {
    if (currentGroup) setSelectedParticipantIds(currentGroup.members.map(m => m.id));
    setErrors(e => ({ ...e, participants: '' }));
  };

  const deselectAll = () => setSelectedParticipantIds([]);

  const totalAmount = parseFloat(amount) || 0;
  const participantCount = selectedParticipantIds.length;

  const equalShare = useMemo(() => {
    if (participantCount === 0 || totalAmount === 0) return 0;
    return totalAmount / participantCount;
  }, [totalAmount, participantCount]);

  const customTotal = useMemo(() =>
    selectedParticipantIds.reduce((sum, id) => sum + (parseFloat(customAmounts[id] ?? '0') || 0), 0),
    [customAmounts, selectedParticipantIds],
  );

  const remainingAmount = Math.max(0, totalAmount - customTotal);

  const getParticipantAmount = (memberId: string): number => {
    if (selectedSplit === 'Equally') return equalShare;
    const raw = parseFloat(customAmounts[memberId] ?? '0') || 0;
    return selectedSplit === 'Percentage' ? (raw / 100) * totalAmount : raw;
  };

  const getParticipantDisplayHint = (memberId: string): string => {
    if (!selectedParticipantIds.includes(memberId)) return 'Not included';
    if (selectedSplit === 'Equally') return totalAmount > 0 ? `Rs. ${equalShare.toFixed(2)}` : 'Select an amount';
    const raw = parseFloat(customAmounts[memberId] ?? '0') || 0;
    if (selectedSplit === 'Percentage') return `${raw}% = Rs. ${((raw / 100) * totalAmount).toFixed(2)}`;
    return raw > 0 ? `Rs. ${raw.toFixed(2)}` : 'Enter amount';
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required.';
    if (!totalAmount || totalAmount <= 0) newErrors.amount = 'Enter a valid amount.';
    if (!selectedGroupId) newErrors.group = 'Select a group.';
    if (participantCount === 0) newErrors.participants = 'Select at least one participant.';

    if (totalAmount > 0 && participantCount > 0 && selectedSplit !== 'Equally') {
      if (selectedSplit === 'Percentage') {
        const totalPct = selectedParticipantIds.reduce((s, id) => s + (parseFloat(customAmounts[id] ?? '0') || 0), 0);
        if (Math.abs(totalPct - 100) > 0.1)
          newErrors.split = `Percentages must add up to 100% (currently ${totalPct.toFixed(1)}%).`;
      } else {
        const diff = Math.abs(customTotal - totalAmount);
        if (diff > 0.01)
          newErrors.split = `Custom amounts must add up to Rs. ${totalAmount.toFixed(2)} (currently Rs. ${customTotal.toFixed(2)}).`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const category = CATEGORIES.find(c => c.id === selectedCategory)!;
    const participants = selectedParticipantIds.map(id => {
      const member = currentGroup!.members.find(m => m.id === id)!;
      const memberAmount = getParticipantAmount(id);
      return {
        memberId: member.id,
        memberName: member.name,
        amount: parseFloat(memberAmount.toFixed(2)),
        ...(selectedSplit === 'Percentage' ? { percentage: parseFloat(customAmounts[id] ?? '0') || 0 } : {}),
        settled: false,
      };
    });

    setSaving(true);
    const result = await addExpense({
      groupId: selectedGroupId,
      groupName: currentGroup!.name,
      title: title.trim(),
      amount: totalAmount,
      category: category.label,
      categoryIcon: category.icon,
      date: new Date().toISOString(),
      paidById: user!.id,
      paidByName: user!.fullName,
      splitType: selectedSplit.toLowerCase() as SplitType,
      participants,
    });
    setSaving(false);

    if (result.success) {
      Alert.alert('Saved', 'Expense added successfully.', [
        { text: 'Add Another', onPress: () => { setTitle(''); setAmount(''); setSelectedParticipantIds([]); setCustomAmounts({}); } },
        { text: 'Done', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const noGroups = groups.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.grayLighter }]} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Add Expense</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving || noGroups} accessibilityRole="button">
            {saving
              ? <ActivityIndicator color={theme.primary} />
              : <Text style={[styles.saveText, { color: noGroups ? theme.grayLight : theme.primary }]}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scroll} 
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Title + Amount Card ── */}
          <View style={[styles.titleCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Expense Title</Text>
            <TextInput
              style={[styles.titleInput, { color: theme.text, borderBottomColor: errors.title ? Colors.error : theme.border }]}
              placeholder="Dinner, taxi, groceries..."
              placeholderTextColor={theme.grayLight}
              value={title}
              onChangeText={t => { setTitle(t); if (errors.title) setErrors(e => ({ ...e, title: '' })); }}
              textAlign="center"
              returnKeyType="next"
            />
            {errors.title ? <Text style={styles.fieldError}>{errors.title}</Text> : null}

            <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>Total Amount</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.currency, { color: theme.primary }]}>Rs.</Text>
              <TextInput
                style={[styles.amountInput, { color: errors.amount ? Colors.error : theme.primary }]}
                placeholder="0"
                placeholderTextColor={theme.grayLight}
                value={amount}
                onChangeText={t => { setAmount(t); if (errors.amount) setErrors(e => ({ ...e, amount: '' })); }}
                keyboardType="decimal-pad"
                maxLength={9}
              />
            </View>
            {errors.amount ? <Text style={styles.fieldError}>{errors.amount}</Text> : null}
          </View>

          {/* ── Group Selection ── */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Group</Text>
            {noGroups ? (
              <View style={[styles.noGroupBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="people-outline" size={24} color={theme.grayLight} />
                <Text style={[styles.noGroupText, { color: theme.textSecondary }]}>Create a group first in the Groups tab.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
                {groups.map(g => {
                  const isSelected = selectedGroupId === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.chip, { backgroundColor: isSelected ? theme.primaryLight : theme.card, borderColor: isSelected ? theme.primary : theme.border }]}
                      onPress={() => handleGroupChange(g.id)}
                    >
                      <Ionicons name="folder-outline" size={16} color={isSelected ? theme.primary : theme.textSecondary} />
                      <Text style={[styles.chipText, { color: isSelected ? theme.primary : theme.textSecondary }]}>{g.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            {errors.group ? <Text style={styles.fieldError}>{errors.group}</Text> : null}
          </View>

          {/* ── Category Selection ── */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, { backgroundColor: isSelected ? theme.primaryLight : theme.card, borderColor: isSelected ? theme.primary : theme.border }]}
                    onPress={() => setSelectedCategory(cat.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={cat.icon as any} size={16} color={isSelected ? theme.primary : theme.textSecondary} />
                    <Text style={[styles.chipText, { color: isSelected ? theme.primary : theme.textSecondary }]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Paid By ── */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Paid By</Text>
            <View style={[styles.paidByRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.paidAvatar, { backgroundColor: MEMBER_COLORS[0] }]}>
                <Text style={styles.paidAvatarText}>{user?.fullName?.[0]?.toUpperCase() ?? 'Y'}</Text>
              </View>
              <Text style={[styles.paidByText, { color: theme.text }]}>{user?.fullName ?? 'You'}</Text>
              <Ionicons name="lock-closed-outline" size={16} color={theme.grayLight} />
            </View>
          </View>

          {/* ── Split Type ── */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Split Type</Text>
            <View style={[styles.splitRow, { backgroundColor: theme.grayLighter }]}>
              {SPLIT_TYPES.map(type => {
                const isSelected = selectedSplit === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.splitBtn, isSelected && { backgroundColor: theme.primary }]}
                    onPress={() => { setSelectedSplit(type); setCustomAmounts({}); setErrors(e => ({ ...e, split: '' })); }}
                  >
                    <Text style={[styles.splitBtnText, { color: isSelected ? '#FFFFFF' : theme.textSecondary }]}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedSplit !== 'Equally' && totalAmount > 0 && participantCount > 0 && (
              <View style={[styles.splitSummaryRow, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.splitSummaryLabel, { color: theme.primary }]}>
                  {selectedSplit === 'Percentage'
                    ? `Total %: ${selectedParticipantIds.reduce((s, id) => s + (parseFloat(customAmounts[id] ?? '0') || 0), 0).toFixed(1)}% of 100%`
                    : `Assigned: Rs. ${customTotal.toFixed(2)} / Rs. ${totalAmount.toFixed(2)} (Remaining: Rs. ${remainingAmount.toFixed(2)})`}
                </Text>
              </View>
            )}
            {errors.split ? <Text style={[styles.fieldError, { marginTop: Spacing.xs }]}>{errors.split}</Text> : null}
          </View>

          {/* ── Participants ── */}
          <View style={styles.participantsHeader}>
            <Text style={[styles.sectionLabel, { color: theme.text, marginBottom: 0 }]}>Participants</Text>
            <View style={styles.participantActions}>
              <TouchableOpacity onPress={selectAll}>
                <Text style={[styles.selectAll, { color: theme.primary }]}>Select All</Text>
              </TouchableOpacity>
              {participantCount > 0 && (
                <TouchableOpacity onPress={deselectAll}>
                  <Text style={[styles.selectAll, { color: Colors.error }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!currentGroup || currentGroup.members.length === 0 ? (
            <View style={[styles.noGroupBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.noGroupText, { color: theme.textSecondary }]}>Select a group above.</Text>
            </View>
          ) : (
            <View style={styles.participantsList}>
              {currentGroup.members.map((m, i) => {
                const selected = selectedParticipantIds.includes(m.id);
                const isYou = m.id === user?.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.participantRow, { backgroundColor: theme.card, borderColor: selected ? theme.primary : theme.border }]}
                    onPress={() => toggleParticipant(m.id)}
                    activeOpacity={0.8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <View style={[styles.participantAvatar, { backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }]}>
                      <Text style={styles.participantAvatarText}>{m.name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <View style={styles.participantInfo}>
                      <Text style={[styles.participantName, { color: theme.text }]}>{isYou ? `${m.name} (You)` : m.name}</Text>
                      <Text style={[styles.participantAmount, { color: theme.textSecondary }]}>{getParticipantDisplayHint(m.id)}</Text>
                    </View>
                    {selected && selectedSplit !== 'Equally' && (
                      <TextInput
                        style={[styles.customAmountInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                        placeholder={selectedSplit === 'Percentage' ? '%' : '0.00'}
                        placeholderTextColor={theme.grayLight}
                        keyboardType="decimal-pad"
                        value={customAmounts[m.id] ?? ''}
                        onChangeText={val => { setCustomAmounts(prev => ({ ...prev, [m.id]: val })); setErrors(e => ({ ...e, split: '' })); }}
                        onPressIn={(e) => e.stopPropagation()} // Prevents toggling checkbox when typing
                      />
                    )}
                    <View style={[styles.checkbox, { backgroundColor: selected ? theme.primary : theme.card, borderColor: selected ? theme.primary : theme.border }]}>
                      {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {errors.participants ? <Text style={styles.fieldError}>{errors.participants}</Text> : null}

        </ScrollView>

        {/* ── Save Action Bar ── */}
        <View style={[styles.bottomBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.primary }, (saving || noGroups) && styles.disabledBtn]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving || noGroups}
          >
            {saving
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.saveButtonText}>{noGroups ? 'Create a Group First' : 'Save Expense'}</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, zIndex: 10,
  },
  closeBtn: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700' },
  saveText: { fontSize: Fonts.sizes.md, fontWeight: '700' },
  
  // Padding bottom ensures we can scroll completely past the absolute bottom bar
  scroll: { padding: Spacing.lg, paddingBottom: 110 }, 
  
  sectionContainer: { marginBottom: Spacing.lg },
  
  titleCard: {
    borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  inputLabel: { fontSize: Fonts.sizes.sm, fontWeight: '600', marginBottom: Spacing.sm, alignSelf: 'flex-start' },
  titleInput: {
    fontSize: Fonts.sizes.xl, fontWeight: '700', width: '100%', textAlign: 'center',
    marginBottom: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: 1.5,
  },
  fieldError: { fontSize: Fonts.sizes.xs, color: Colors.error, fontWeight: '600', marginTop: 4, alignSelf: 'flex-start' },
  amountLabel: { fontSize: Fonts.sizes.sm, fontWeight: '600', marginBottom: Spacing.sm },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  currency: { fontSize: Fonts.sizes.xl, fontWeight: '700', marginTop: 4 },
  amountInput: { fontSize: 44, fontWeight: '800', minWidth: 120, textAlign: 'center', padding: 0 },
  
  sectionLabel: { fontSize: Fonts.sizes.md, fontWeight: '700', marginBottom: Spacing.sm },
  hScrollContent: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.lg },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  chipText: { fontSize: Fonts.sizes.sm, fontWeight: '600' },
  
  noGroupBox: {
    borderRadius: Radius.md, padding: Spacing.xl, alignItems: 'center',
    borderWidth: 1.5, borderStyle: 'dashed', gap: Spacing.sm,
  },
  noGroupText: { fontSize: Fonts.sizes.sm, textAlign: 'center', fontWeight: '500' },
  
  paidByRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.md, padding: Spacing.md,
    gap: Spacing.sm, borderWidth: 1,
  },
  paidAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  paidAvatarText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  paidByText: { flex: 1, fontSize: Fonts.sizes.md, fontWeight: '600' },
  
  splitRow: { flexDirection: 'row', borderRadius: Radius.md, padding: 4 },
  splitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.sm },
  splitBtnText: { fontSize: Fonts.sizes.sm, fontWeight: '600' },
  splitSummaryRow: { borderRadius: Radius.md, padding: Spacing.sm, marginTop: Spacing.sm },
  splitSummaryLabel: { fontSize: Fonts.sizes.xs, fontWeight: '600', textAlign: 'center' },
  
  participantsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  participantActions: { flexDirection: 'row', gap: Spacing.md },
  selectAll: { fontSize: Fonts.sizes.sm, fontWeight: '600' },
  participantsList: { gap: Spacing.sm },
  participantRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.md,
    borderWidth: 1.5,
  },
  participantAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  participantAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  participantInfo: { flex: 1, justifyContent: 'center' },
  participantName: { fontSize: Fonts.sizes.md, fontWeight: '700', marginBottom: 4 },
  participantAmount: { fontSize: Fonts.sizes.sm, fontWeight: '500' },
  customAmountInput: {
    width: 80, borderWidth: 1, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    fontSize: Fonts.sizes.sm, textAlign: 'center', fontWeight: '600'
  },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  
  disabledBtn: { opacity: 0.6 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.lg,
    borderTopWidth: 1, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
saveButton: {
    borderRadius: Radius.full, 
    paddingVertical: 16, 
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 10, // Ensures it doesn't get squished at the bottom of the screen
    // Enhanced Shadows
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 6, 
    elevation: 6, 
  },
  saveButtonText: { color: '#FFFFFF', fontSize: Fonts.sizes.lg, fontWeight: '700' },
});