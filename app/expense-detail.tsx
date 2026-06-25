import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpenseContext';
import { useTheme } from '../context/ThemeContext';

const MEMBER_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { expenses, updateExpense, deleteExpense } = useExpenses();
  const { theme } = useTheme();

  const [editMode, setEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedAmount, setEditedAmount] = useState('');
  const [titleError, setTitleError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const expense = expenses.find(e => e.id === id);

  useEffect(() => {
    if (expense) {
      setEditedTitle(expense.title);
      setEditedAmount(expense.amount.toString());
    }
  }, [expense]);

  const enterEditMode = () => {
    if (!expense) return;
    setEditedTitle(expense.title);
    setEditedAmount(expense.amount.toString());
    setTitleError('');
    setAmountError('');
    setEditMode(true);
  };

  const handleSave = async () => {
    let hasError = false;
    if (!editedTitle.trim()) { setTitleError('Title is required.'); hasError = true; }
    const parsedAmount = parseFloat(editedAmount);
    if (!editedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError('Enter a valid amount greater than 0.');
      hasError = true;
    }
    if (hasError) return;

    setSaving(true);
    const result = await updateExpense(id ?? '', {
      title: editedTitle.trim(),
      amount: parsedAmount,
    });
    setSaving(false);
    if (result.success) {
      setEditMode(false);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteExpense(id ?? '');
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to delete expense.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  // ── Not Found ──────────────────────────────────────────────────────────────
  if (!expense) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={theme.grayLight} />
          <Text style={[styles.errorText, { color: theme.text }]}>Expense not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.primaryLight }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: theme.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isYourExpense = expense.paidById === user?.id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.card }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            Expense Details
          </Text>

          {isYourExpense ? (
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: theme.card }]}
              onPress={editMode ? () => setEditMode(false) : enterEditMode}
              accessibilityRole="button"
              accessibilityLabel={editMode ? 'Cancel edit' : 'Edit expense'}
            >
              <Ionicons
                name={editMode ? 'close-outline' : 'pencil'}
                size={18}
                color={theme.primary}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>

        {/* Expense Card */}
        <View style={[styles.expenseCard, { backgroundColor: theme.card }]}>
          <View style={[styles.expenseIconBox, { backgroundColor: theme.primaryLight }]}>
            <Text style={styles.expenseIcon}>{expense.categoryIcon}</Text>
          </View>

          {editMode ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[
                  styles.editTitleInput,
                  { color: theme.text, borderBottomColor: titleError ? Colors.error : theme.border },
                ]}
                value={editedTitle}
                onChangeText={t => { setEditedTitle(t); setTitleError(''); }}
                placeholder="Expense title"
                placeholderTextColor={theme.grayLight}
                accessibilityLabel="Expense title"
                returnKeyType="next"
              />
              {titleError ? <Text style={styles.fieldError}>{titleError}</Text> : null}

              <View style={styles.editAmountRow}>
                <Text style={[styles.currency, { color: theme.primary }]}>Rs.</Text>
                <TextInput
                  style={[styles.editAmountInput, { color: theme.primary }]}
                  value={editedAmount}
                  onChangeText={t => { setEditedAmount(t); setAmountError(''); }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={theme.grayLight}
                  accessibilityLabel="Expense amount"
                />
              </View>
              {amountError ? <Text style={styles.fieldError}>{amountError}</Text> : null}

              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.editSaveBtn, { backgroundColor: theme.primary }, saving && styles.disabledBtn]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#FFFFFF" />
                    : <Text style={styles.editSaveBtnText}>Save Changes</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editCancelBtn, { backgroundColor: theme.grayLighter }]}
                  onPress={() => setEditMode(false)}
                >
                  <Text style={[styles.editCancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.expenseTitle, { color: theme.text }]}>{expense.title}</Text>
              <Text style={[styles.expenseAmount, { color: theme.primary }]}>
                Rs. {expense.amount.toLocaleString('en-PK')}
              </Text>

              <View style={[styles.metaContainer, { backgroundColor: theme.inputBackground }]}>
                <View style={styles.metaGrid}>
                  <MetaItem label="Category" value={expense.category} theme={theme} />
                  <MetaItem
                    label="Date"
                    value={new Date(expense.date).toLocaleDateString('en-PK', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                    theme={theme}
                  />
                </View>
                <View style={[styles.metaDivider, { backgroundColor: theme.border }]} />
                <View style={styles.metaGrid}>
                  <MetaItem label="Paid by" value={isYourExpense ? 'You' : expense.paidByName} theme={theme} />
                  <MetaItem label="Split Type" value={expense.splitType} theme={theme} />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Participants */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Participants</Text>

        {expense.participants.length === 0 ? (
          <Text style={[styles.emptyParticipants, { color: theme.textSecondary }]}>
            No participants recorded.
          </Text>
        ) : (
          <View style={styles.participantsList}>
            {expense.participants.map((p, i) => {
              const isYou = p.memberId === user?.id;
              return (
                <View key={`${p.memberId}_${i}`} style={[styles.participantItem, { backgroundColor: theme.card }]}>
                  <View style={[styles.participantAvatar, { backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }]}>
                    <Text style={styles.participantAvatarText}>
                      {p.memberName?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={styles.participantInfo}>
                    <Text style={[styles.participantName, { color: theme.text }]}>
                      {isYou ? 'You' : p.memberName}
                    </Text>
                    <Text style={[styles.participantAmount, { color: theme.textSecondary }]}>
                      {isYou
                        ? isYourExpense ? 'Paid this expense' : `Owes Rs. ${p.amount.toLocaleString('en-PK')}`
                        : `Owes Rs. ${p.amount.toLocaleString('en-PK')}`}
                    </Text>
                  </View>
                  <View style={[
                    styles.participantStatus,
                    { backgroundColor: p.settled ? '#D1FAE5' : theme.grayLighter },
                  ]}>
                    <Text style={[
                      styles.participantStatusText,
                      { color: p.settled ? Colors.success : theme.gray },
                    ]}>
                      {p.settled ? '✓ Settled' : 'Pending'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Delete Bar — only for payer */}
      {isYourExpense && (
        <View style={[styles.bottomBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.deleteBtn, deleting && styles.disabledBtn]}
            onPress={handleDelete}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete expense"
          >
            {deleting ? (
              <ActivityIndicator color={Colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
                <Text style={styles.deleteBtnText}>Delete Expense</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────
function MetaItem({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: Fonts.sizes.xs, color: theme.textSecondary, fontWeight: '500', marginBottom: 4 }}>
        {label}
      </Text>
      <Text
        style={{ fontSize: Fonts.sizes.md, color: theme.text, fontWeight: '600', textTransform: 'capitalize' }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg,
  },
  errorText: { fontSize: Fonts.sizes.lg, fontWeight: '600' },
  backButton: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full,
  },
  backButtonText: { fontSize: Fonts.sizes.md, fontWeight: '700' },
  scroll: { padding: Spacing.lg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.lg,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 2,
  },
  headerTitle: {
    fontSize: Fonts.sizes.xl, fontWeight: '700',
    flex: 1, marginHorizontal: Spacing.sm,
  },
  expenseCard: {
    borderRadius: Radius.xxl, padding: Spacing.lg,
    alignItems: 'center', marginBottom: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  expenseIconBox: {
    width: 76, height: 76, borderRadius: Radius.xl,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  expenseIcon: { fontSize: 36 },
  expenseTitle: {
    fontSize: Fonts.sizes.xxl, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.xs,
  },
  expenseAmount: {
    fontSize: Fonts.sizes.xxxl, fontWeight: '800', marginBottom: Spacing.md,
  },
  metaContainer: {
    width: '100%', borderRadius: Radius.xl, padding: Spacing.md, marginTop: Spacing.xs,
  },
  metaGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  metaDivider: { height: 1, marginVertical: Spacing.sm },
  editContainer: { width: '100%' },
  editTitleInput: {
    fontSize: Fonts.sizes.xxl, fontWeight: '700', textAlign: 'center',
    marginBottom: Spacing.sm, paddingBottom: Spacing.sm,
    borderBottomWidth: 2, borderRadius: 0,
  },
  fieldError: { fontSize: Fonts.sizes.xs, color: Colors.error, fontWeight: '500', marginBottom: Spacing.xs, textAlign: 'center' },
  editAmountRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: Spacing.sm },
  currency: { fontSize: Fonts.sizes.xl, fontWeight: '700' },
  editAmountInput: { fontSize: Fonts.sizes.xxxl, fontWeight: '800', minWidth: 100 },
  editButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  editSaveBtn: {
    flex: 1, borderRadius: Radius.full, paddingVertical: 12, alignItems: 'center',
  },
  disabledBtn: { opacity: 0.6 },
  editSaveBtnText: { color: '#FFFFFF', fontSize: Fonts.sizes.md, fontWeight: '700' },
  editCancelBtn: { flex: 1, borderRadius: Radius.full, paddingVertical: 12, alignItems: 'center' },
  editCancelBtnText: { fontSize: Fonts.sizes.md, fontWeight: '600' },
  sectionTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', marginBottom: Spacing.md },
  emptyParticipants: { fontSize: Fonts.sizes.sm, textAlign: 'center', marginTop: Spacing.md },
  participantsList: { gap: Spacing.sm },
  participantItem: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  participantAvatar: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  participantAvatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  participantInfo: { flex: 1 },
  participantName: { fontSize: Fonts.sizes.md, fontWeight: '600', marginBottom: 2 },
  participantAmount: { fontSize: Fonts.sizes.sm },
  participantStatus: { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.full },
  participantStatusText: { fontSize: Fonts.sizes.xs, fontWeight: '600' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, paddingBottom: Spacing.xl, borderTopWidth: 1,
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2', borderRadius: Radius.full, paddingVertical: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs,
  },
  deleteBtnText: { color: Colors.error, fontSize: Fonts.sizes.md, fontWeight: '700' },
});
