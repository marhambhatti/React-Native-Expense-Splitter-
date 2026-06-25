import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export type Member = {
  id: string;
  name: string;
  email: string;
};

export type Group = {
  id: string;
  name: string;
  emoji: string;
  members: Member[];
  createdBy: string;
  createdAt: string;
  totalExpenses: number;
};

type GroupContextType = {
  groups: Group[];
  isLoading: boolean;
  createGroup: (name: string, emoji: string) => Promise<{ success: boolean; message: string }>;
  deleteGroup: (groupId: string) => Promise<void>;
  updateGroup: (groupId: string, name: string, emoji: string) => Promise<void>;
  addMember: (groupId: string, name: string, email: string) => Promise<{ success: boolean; message: string }>;
  removeMember: (groupId: string, memberId: string) => Promise<void>;
  getGroup: (groupId: string) => Group | undefined;
  refreshGroups: () => Promise<void>;
};

const GroupContext = createContext<GroupContextType | null>(null);

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadGroups();
    } else {
      setGroups([]);
    }
  }, [user]);

  const getStorageKey = () => `groups_${user?.id}`;

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const data = await AsyncStorage.getItem(getStorageKey());
      if (data) {
        setGroups(JSON.parse(data));
      } else {
        setGroups([]);
      }
    } catch (e) {
      console.error('Load groups error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveGroups = async (updatedGroups: Group[]) => {
    await AsyncStorage.setItem(getStorageKey(), JSON.stringify(updatedGroups));
    setGroups(updatedGroups);
  };

  const createGroup = async (
    name: string,
    emoji: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      if (!name.trim()) {
        return { success: false, message: 'Group name is required!' };
      }

      const exists = groups.find(
        (g) => g.name.toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        return { success: false, message: 'Group with this name already exists!' };
      }

      const newGroup: Group = {
        id: Date.now().toString(),
        name: name.trim(),
        emoji,
        members: [
          {
            id: user!.id,
            name: user!.fullName,
            email: user!.email,
          },
        ],
        createdBy: user!.id,
        createdAt: new Date().toISOString(),
        totalExpenses: 0,
      };

      const updated = [newGroup, ...groups];
      await saveGroups(updated);
      return { success: true, message: 'Group created!' };
    } catch (e) {
      return { success: false, message: 'Something went wrong!' };
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const updated = groups.filter((g) => g.id !== groupId);
      await saveGroups(updated);

      // Group ki expenses bhi delete karo
      await AsyncStorage.removeItem(`expenses_${user?.id}_${groupId}`);
    } catch (e) {
      console.error('Delete group error:', e);
    }
  };

  const updateGroup = async (
    groupId: string,
    name: string,
    emoji: string
  ) => {
    try {
      const updated = groups.map((g) =>
        g.id === groupId ? { ...g, name, emoji } : g
      );
      await saveGroups(updated);
    } catch (e) {
      console.error('Update group error:', e);
    }
  };

  const addMember = async (
    groupId: string,
    name: string,
    email: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      if (!name.trim() || !email.trim()) {
        return { success: false, message: 'Name and email are required!' };
      }

      const group = groups.find((g) => g.id === groupId);
      if (!group) {
        return { success: false, message: 'Group not found!' };
      }

      const memberExists = group.members.find(
        (m) => m.email.toLowerCase() === email.toLowerCase()
      );
      if (memberExists) {
        return { success: false, message: 'Member already in group!' };
      }

      const newMember: Member = {
        id: Date.now().toString(),
        name: name.trim(),
        email: email.trim(),
      };

      const updated = groups.map((g) =>
        g.id === groupId
          ? { ...g, members: [...g.members, newMember] }
          : g
      );
      await saveGroups(updated);
      return { success: true, message: 'Member added!' };
    } catch (e) {
      return { success: false, message: 'Something went wrong!' };
    }
  };

  const removeMember = async (groupId: string, memberId: string) => {
    try {
      const updated = groups.map((g) =>
        g.id === groupId
          ? { ...g, members: g.members.filter((m) => m.id !== memberId) }
          : g
      );
      await saveGroups(updated);
    } catch (e) {
      console.error('Remove member error:', e);
    }
  };

  const getGroup = (groupId: string) => {
    return groups.find((g) => g.id === groupId);
  };

  const refreshGroups = async () => {
    await loadGroups();
  };

  return (
    <GroupContext.Provider
      value={{
        groups,
        isLoading,
        createGroup,
        deleteGroup,
        updateGroup,
        addMember,
        removeMember,
        getGroup,
        refreshGroups,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroups() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error('useGroups must be used within GroupProvider');
  return ctx;
}