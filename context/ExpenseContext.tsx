import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

// ── Types ────────────────────────────────────────────────────────────────────
export type SplitType = 'equally' | 'custom' | 'percentage';

export type ParticipantShare = {
  memberId: string;
  memberName: string;
  amount: number;
  percentage?: number;
  settled: boolean;
};

export type Expense = {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  amount: number;
  category: string;
  categoryIcon: string;
  date: string;
  paidById: string;
  paidByName: string;
  splitType: SplitType;
  participants: ParticipantShare[];
  createdAt: string;
};

export type Balance = {
  memberId: string;
  memberName: string;
  amount: number;
  owesYou: boolean;
  // FIX: added groupId so Settle Up screens can call settleUp() correctly
  groupId: string;
};

type ExpenseContextType = {
  expenses: Expense[];
  isLoading: boolean;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<{ success: boolean; message: string }>;
  updateExpense: (expenseId: string, data: Partial<Expense>) => Promise<{ success: boolean; message: string }>;
  deleteExpense: (expenseId: string) => Promise<void>;
  getGroupExpenses: (groupId: string) => Expense[];
  getBalances: (groupId: string) => Balance[];
  getOverallBalances: () => Balance[];
  getTotalOwed: () => number;
  getTotalOwe: () => number;
  settleUp: (groupId: string, memberId: string) => Promise<void>;
  refreshExpenses: () => Promise<void>;
};

const ExpenseContext = createContext<ExpenseContextType | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────
export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // FIX: stable storage key via useCallback — avoids stale closure on user
  const getStorageKey = useCallback(() => {
    if (!user?.id) return null;
    return `expenses_${user.id}`;
  }, [user?.id]);

  const loadExpenses = useCallback(async () => {
    const key = getStorageKey();
    if (!key) return;
    try {
      setIsLoading(true);
      const data = await AsyncStorage.getItem(key);
      setExpenses(data ? JSON.parse(data) : []);
    } catch (e) {
      console.error('Load expenses error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [getStorageKey]);

  // FIX: user dependency is correct — reload when user changes (login/logout)
  useEffect(() => {
    if (user) {
      loadExpenses();
    } else {
      setExpenses([]);
    }
  }, [user, loadExpenses]);

  const saveExpenses = async (updated: Expense[]) => {
    const key = getStorageKey();
    if (!key) return;
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    setExpenses(updated);
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const addExpense = async (
    expenseData: Omit<Expense, 'id' | 'createdAt'>,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      if (!expenseData.title.trim()) return { success: false, message: 'Title is required.' };
      if (expenseData.amount <= 0) return { success: false, message: 'Amount must be greater than 0.' };
      if (expenseData.participants.length === 0) return { success: false, message: 'Select at least one participant.' };

      // FIX: Validate that participant amounts sum correctly for custom/percentage splits
      if (expenseData.splitType !== 'equally') {
        const participantTotal = expenseData.participants.reduce((s, p) => s + p.amount, 0);
        const diff = Math.abs(participantTotal - expenseData.amount);
        if (diff > 0.01) {
          return { success: false, message: 'Participant amounts do not add up to the total.' };
        }
      }

      const newExpense: Expense = {
        ...expenseData,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      };

      const updated = [newExpense, ...expenses];
      await saveExpenses(updated);
      return { success: true, message: 'Expense added!' };
    } catch (e) {
      console.error('Add expense error:', e);
      return { success: false, message: 'Something went wrong. Please try again.' };
    }
  };

  const updateExpense = async (
    expenseId: string,
    data: Partial<Expense>,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // FIX: validate title and amount before updating
      if (data.title !== undefined && !data.title.trim()) {
        return { success: false, message: 'Title cannot be empty.' };
      }
      if (data.amount !== undefined && data.amount <= 0) {
        return { success: false, message: 'Amount must be greater than 0.' };
      }

      // FIX: check expense actually exists
      const exists = expenses.find(e => e.id === expenseId);
      if (!exists) return { success: false, message: 'Expense not found.' };

      const updated = expenses.map(e => (e.id === expenseId ? { ...e, ...data } : e));
      await saveExpenses(updated);
      return { success: true, message: 'Expense updated!' };
    } catch (e) {
      console.error('Update expense error:', e);
      return { success: false, message: 'Something went wrong. Please try again.' };
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      const updated = expenses.filter(e => e.id !== expenseId);
      await saveExpenses(updated);
    } catch (e) {
      console.error('Delete expense error:', e);
    }
  };

  // ── Queries ────────────────────────────────────────────────────────────────

  const getGroupExpenses = (groupId: string): Expense[] =>
    expenses.filter(e => e.groupId === groupId);

  /**
   * Calculates per-member net balances for a single group.
   * FIX: Balance entries now include groupId so callers can invoke settleUp().
   * FIX: Aggregated net per member (not one entry per transaction) to avoid
   *       duplicate entries when the same pair shares multiple expenses.
   */
  const getBalances = (groupId: string): Balance[] => {
    const groupExpenses = getGroupExpenses(groupId);
    const balanceMap: Record<string, Balance> = {};

    groupExpenses.forEach(expense => {
      expense.participants.forEach(p => {
        if (p.settled) return;

        if (expense.paidById === user?.id && p.memberId !== user?.id) {
          if (!balanceMap[p.memberId]) {
            balanceMap[p.memberId] = {
              memberId: p.memberId,
              memberName: p.memberName,
              amount: 0,
              owesYou: true,
              groupId,
            };
          }
          balanceMap[p.memberId].amount += p.amount;
        }

        if (expense.paidById !== user?.id && p.memberId === user?.id) {
          const payerId = expense.paidById;
          if (!balanceMap[payerId]) {
            balanceMap[payerId] = {
              memberId: payerId,
              memberName: expense.paidByName,
              amount: 0,
              owesYou: false,
              groupId,
            };
          }
          balanceMap[payerId].amount += p.amount;
        }
      });
    });

    return Object.values(balanceMap).filter(b => b.amount > 0.005); // ignore floating-point dust
  };

  /**
   * Calculates net balances across all groups.
   * FIX: Now merges same-member balances across groups into net values and
   *      includes a groupId (the group with the largest outstanding amount)
   *      so settle buttons work correctly.
   */
  const getOverallBalances = (): Balance[] => {
    // memberId -> { owed, owes, representativeGroupId }
    const netMap: Record<
      string,
      { memberName: string; net: number; groupId: string; bestAmount: number }
    > = {};

    expenses.forEach(expense => {
      expense.participants.forEach(p => {
        if (p.settled) return;

        const updateNet = (
          key: string,
          name: string,
          delta: number,
          gId: string,
          absAmount: number,
        ) => {
          if (!netMap[key]) {
            netMap[key] = { memberName: name, net: 0, groupId: gId, bestAmount: 0 };
          }
          netMap[key].net += delta;
          // Track group with biggest contribution as the representative
          if (absAmount > netMap[key].bestAmount) {
            netMap[key].bestAmount = absAmount;
            netMap[key].groupId = gId;
          }
        };

        if (expense.paidById === user?.id && p.memberId !== user?.id) {
          updateNet(p.memberId, p.memberName, p.amount, expense.groupId, p.amount);
        }
        if (expense.paidById !== user?.id && p.memberId === user?.id) {
          updateNet(expense.paidById, expense.paidByName, -p.amount, expense.groupId, p.amount);
        }
      });
    });

    return Object.entries(netMap)
      .filter(([, v]) => Math.abs(v.net) > 0.005)
      .map(([memberId, v]) => ({
        memberId,
        memberName: v.memberName,
        amount: Math.abs(v.net),
        owesYou: v.net > 0,
        groupId: v.groupId,
      }));
  };

  const getTotalOwed = (): number =>
    getOverallBalances()
      .filter(b => b.owesYou)
      .reduce((sum, b) => sum + b.amount, 0);

  const getTotalOwe = (): number =>
    getOverallBalances()
      .filter(b => !b.owesYou)
      .reduce((sum, b) => sum + b.amount, 0);

  /**
   * Marks all shared expenses between the current user and memberId in groupId as settled.
   * FIX: passing empty memberId ('') was a bug — added guard.
   */
  const settleUp = async (groupId: string, memberId: string) => {
    if (!groupId || !memberId) {
      console.warn('settleUp called with invalid args', { groupId, memberId });
      return;
    }
    try {
      const updated = expenses.map(expense => {
        if (expense.groupId !== groupId) return expense;

        const updatedParticipants = expense.participants.map(p => {
          const isRelevant =
            (expense.paidById === user?.id && p.memberId === memberId) ||
            (expense.paidById === memberId && p.memberId === user?.id);
          return isRelevant ? { ...p, settled: true } : p;
        });

        return { ...expense, participants: updatedParticipants };
      });

      await saveExpenses(updated);
    } catch (e) {
      console.error('Settle up error:', e);
    }
  };

  const refreshExpenses = async () => {
    await loadExpenses();
  };

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        isLoading,
        addExpense,
        updateExpense,
        deleteExpense,
        getGroupExpenses,
        getBalances,
        getOverallBalances,
        getTotalOwed,
        getTotalOwe,
        settleUp,
        refreshExpenses,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useExpenses must be used within ExpenseProvider');
  return ctx;
}
