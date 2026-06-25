import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius, Fonts } from '../../constants/theme';
import { useGroups } from '../../context/GroupContext';
import { useExpenses } from '../../context/ExpenseContext';
import { useTheme } from '../../context/ThemeContext';

const MEMBER_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

const GROUP_ICONS = [
  { id: 'home', name: 'home-outline' },
  { id: 'airplane', name: 'airplane-outline' },
  { id: 'fast-food', name: 'fast-food-outline' },
  { id: 'flash', name: 'flash-outline' },
  { id: 'film', name: 'film-outline' },
  { id: 'book', name: 'book-outline' },
  { id: 'barbell', name: 'barbell-outline' },
  { id: 'game-controller', name: 'game-controller-outline' },
] as const;

export default function GroupsScreen() {
  const router = useRouter();
  const { groups, createGroup, deleteGroup, isLoading } = useGroups();
  const { getBalances, settleUp } = useExpenses();
  const { theme } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('home-outline');
  const [creating, setCreating] = useState(false);

  const totalOwed = groups.reduce((sum, g) => {
    const balances = getBalances(g.id);
    return sum + balances.filter(b => b.owesYou).reduce((s, b) => s + b.amount, 0);
  }, 0);

  const totalOwe = groups.reduce((sum, g) => {
    const balances = getBalances(g.id);
    return sum + balances.filter(b => !b.owesYou).reduce((s, b) => s + b.amount, 0);
  }, 0);

  const handleCreate = async () => {
    if (!newGroupName.trim()) { 
      Alert.alert('Required Information', 'Please enter a group name.'); 
      return; 
    }
    setCreating(true);
    const result = await createGroup(newGroupName.trim(), selectedIcon);
    setCreating(false);
    if (result.success) { 
      setModalVisible(false); 
      setNewGroupName(''); 
      setSelectedIcon('home-outline'); 
    } else {
      Alert.alert('Execution Error', result.message);
    }
  };

  const handleDelete = (groupId: string, groupName: string) => {
    Alert.alert('Delete Group', `Are you sure you want to permanently delete "${groupName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Group', style: 'destructive', onPress: () => deleteGroup(groupId) },
    ]);
  };

  const handleSettle = (groupId: string, memberId: string, memberName: string) => {
    Alert.alert('Settle Balance', `Confirm account settlement with ${memberName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Settle Balance', onPress: () => settleUp(groupId, memberId) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Groups</Text>
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: theme.primary }]} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Total Balance Card */}
        <View style={[styles.totalBalanceCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.totalBalanceLabel}>TOTAL NET BALANCE</Text>
          <Text style={styles.totalBalanceAmount}>Rs. {(totalOwed - totalOwe).toLocaleString('en-PK')}</Text>
          <View style={styles.totalBalanceBadge}>
            <Text style={styles.totalBalanceBadgeText}>Consolidated Portfolio</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Active Groups</Text>

        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
        ) : groups.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={48} color={theme.grayLight} style={{ marginBottom: Spacing.sm }} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Groups Found</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Select the addition button above to generate a new group workspace.</Text>
          </View>
        ) : (
          groups.map((group) => {
            const balances = getBalances(group.id);
            const owedBalance = balances.filter(b => b.owesYou).reduce((s, b) => s + b.amount, 0);
            const oweBalance = balances.filter(b => !b.owesYou).reduce((s, b) => s + b.amount, 0);

            return (
              <TouchableOpacity
                key={group.id}
                style={[styles.groupCard, { backgroundColor: theme.card }]}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/group-detail', params: { id: group.id } })}
                onLongPress={() => handleDelete(group.id, group.name)}
              >
                <View style={styles.groupLeft}>
                  <View style={[styles.groupIconBox, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name={(group.emoji || 'home-outline') as any} size={22} color={theme.primary} />
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={[styles.groupName, { color: theme.text }]}>{group.name}</Text>
                    <View style={styles.avatarRow}>
                      {group.members.slice(0, 3).map((m, i) => (
                        <View key={m.id} style={[styles.avatar, { backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length], marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i, borderColor: theme.card }]}>
                          <Text style={styles.avatarText}>{m.name[0]?.toUpperCase()}</Text>
                        </View>
                      ))}
                      {group.members.length > 3 && (
                        <View style={[styles.avatar, styles.avatarExtra, { marginLeft: -8, backgroundColor: theme.grayLighter, borderColor: theme.card }]}>
                          <Text style={[styles.avatarExtraText, { color: theme.gray }]}>+{group.members.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.groupRight}>
                  {owedBalance > 0 ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.balanceText, { color: theme.success }]}>You are owed</Text>
                      <Text style={[styles.balanceAmount, { color: theme.success }]}>Rs. {owedBalance.toLocaleString('en-PK')}</Text>
                    </View>
                  ) : oweBalance > 0 ? (
                    <TouchableOpacity style={[styles.settleBtn, { backgroundColor: theme.primaryLight }]} onPress={() => { const b = balances.find(b => !b.owesYou); if (b) handleSettle(group.id, b.memberId, b.memberName); }}>
                      <Text style={[styles.settleBtnText, { color: theme.primary }]}>Settle Up</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.settledBadge}>
                      <Ionicons name="checkmark-circle-outline" size={14} color={theme.success} />
                      <Text style={[styles.settledText, { color: theme.success }]}>Settled</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: theme.overlay }]} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Create Workspace Group</Text>
            
            <Text style={[styles.modalLabel, { color: theme.text }]}>Select Workspace Identifier Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.iconRow}>
                {GROUP_ICONS.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={[styles.iconSelectionBtn, { backgroundColor: theme.grayLighter, borderColor: 'transparent' }, selectedIcon === item.name && { borderColor: theme.primary, backgroundColor: theme.primaryLight }]} 
                    onPress={() => setSelectedIcon(item.name)}
                  >
                    <Ionicons name={item.name} size={22} color={selectedIcon === item.name ? theme.primary : theme.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.modalLabel, { color: theme.text }]}>Group Workspace Title</Text>
            <TextInput 
              style={[styles.modalInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]} 
              placeholder='e.g., Corporate Office, Travel Sync' 
              placeholderTextColor={theme.grayLight} 
              value={newGroupName} 
              onChangeText={setNewGroupName} 
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setModalVisible(false)}>
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalCreateBtn, { backgroundColor: theme.primary }, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.createBtnText}>Confirm and Create</Text>}
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
  scroll: { padding: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  headerTitle: { fontSize: Fonts.sizes.xxl, fontWeight: '700' },
  createBtn: { width: 42, height: 42, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  totalBalanceCard: { borderRadius: 20, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg, elevation: 4 },
  totalBalanceLabel: { fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 4 },
  totalBalanceAmount: { fontSize: Fonts.sizes.xxxl, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  totalBalanceBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  totalBalanceBadgeText: { fontSize: Fonts.sizes.xs, color: '#FFFFFF', fontWeight: '600' },
  sectionTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', marginBottom: Spacing.sm },
  groupCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, elevation: 2 },
  groupLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  groupIconBox: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  groupInfo: { flex: 1 },
  groupName: { fontSize: Fonts.sizes.md, fontWeight: '700', marginBottom: 6 },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  avatarExtra: {},
  avatarExtraText: { fontSize: 9, fontWeight: '700' },
  groupRight: { alignItems: 'flex-end' },
  balanceText: { fontSize: Fonts.sizes.xs, fontWeight: '500', marginBottom: 2 },
  balanceAmount: { fontSize: Fonts.sizes.md, fontWeight: '800' },
  settleBtn: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  settleBtnText: { fontSize: Fonts.sizes.sm, fontWeight: '700' },
  settledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  settledText: { fontSize: Fonts.sizes.sm, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, paddingBottom: Spacing.xxl },
  modalTitle: { fontSize: Fonts.sizes.xl, fontWeight: '700', marginBottom: Spacing.lg, textAlign: 'center' },
  modalLabel: { fontSize: Fonts.sizes.sm, fontWeight: '600', marginBottom: Spacing.sm },
  iconRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, paddingRight: Spacing.lg },
  iconSelectionBtn: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  modalInput: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: Fonts.sizes.md, borderWidth: 1.5, marginBottom: Spacing.lg },
  modalButtons: { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.full, borderWidth: 1.5, alignItems: 'center' },
  cancelBtnText: { fontSize: Fonts.sizes.md, fontWeight: '600' },
  modalCreateBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.full, alignItems: 'center', elevation: 4 },
  createBtnText: { fontSize: Fonts.sizes.md, fontWeight: '700', color: '#FFFFFF' },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', marginBottom: 4 },
  emptyText: { fontSize: Fonts.sizes.sm, textAlign: 'center' },
});