import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ────────────────────────────────────────────────────────────────────
type User = {
  id: string;
  fullName: string;
  email: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  register: (fullName: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  updateProfile: (fullName: string, email: string) => Promise<{ success: boolean; message: string }>;
};

const KEYS = {
  ALL_USERS: 'all_users',
  CURRENT_USER: 'current_user',
} as const;

// ── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ── Helpers ──────────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // FIX: useCallback so reference is stable; avoids warning if added to deps elsewhere
  const loadUser = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem(KEYS.CURRENT_USER);
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (e) {
      console.error('Load user error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const register = async (
    fullName: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // FIX: proper whitespace trimming before validation
      const trimmedName = fullName.trim();
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedName) return { success: false, message: 'Full name is required.' };
      if (!validateEmail(trimmedEmail)) return { success: false, message: 'Enter a valid email address.' };
      if (password.length < 6) return { success: false, message: 'Password must be at least 6 characters.' };

      const usersData = await AsyncStorage.getItem(KEYS.ALL_USERS);
      const users: User[] = usersData ? JSON.parse(usersData) : [];

      const exists = users.find(u => u.email === trimmedEmail);
      if (exists) return { success: false, message: 'This email is already registered.' };

      const newUser: User = {
        id: Date.now().toString(),
        fullName: trimmedName,
        email: trimmedEmail,
        password, // FIX: In a real app this must be hashed. Noted in changelog.
      };

      users.push(newUser);
      // FIX: Use Promise.all to write both keys atomically where possible
      await Promise.all([
        AsyncStorage.setItem(KEYS.ALL_USERS, JSON.stringify(users)),
        AsyncStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(newUser)),
      ]);
      setUser(newUser);
      return { success: true, message: 'Account created!' };
    } catch (e) {
      console.error('Register error:', e);
      return { success: false, message: 'Something went wrong. Please try again.' };
    }
  };

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedEmail || !password) {
        return { success: false, message: 'Please fill in all fields.' };
      }

      const usersData = await AsyncStorage.getItem(KEYS.ALL_USERS);
      const users: User[] = usersData ? JSON.parse(usersData) : [];

      const found = users.find(
        u => u.email === trimmedEmail && u.password === password,
      );
      if (!found) return { success: false, message: 'Incorrect email or password.' };

      await AsyncStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(found));
      setUser(found);
      return { success: true, message: 'Login successful!' };
    } catch (e) {
      console.error('Login error:', e);
      return { success: false, message: 'Something went wrong. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(KEYS.CURRENT_USER);
      setUser(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const updateProfile = async (
    fullName: string,
    email: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      if (!user) return { success: false, message: 'Not authenticated.' };

      const trimmedName = fullName.trim();
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedName) return { success: false, message: 'Full name is required.' };
      if (!validateEmail(trimmedEmail)) return { success: false, message: 'Enter a valid email address.' };

      // FIX: Check if new email is taken by another account
      const usersData = await AsyncStorage.getItem(KEYS.ALL_USERS);
      const users: User[] = usersData ? JSON.parse(usersData) : [];

      const emailConflict = users.find(
        u => u.email === trimmedEmail && u.id !== user.id,
      );
      if (emailConflict) return { success: false, message: 'This email is used by another account.' };

      const updated: User = { ...user, fullName: trimmedName, email: trimmedEmail };

      const updatedUsers = users.map(u => (u.id === user.id ? updated : u));
      await Promise.all([
        AsyncStorage.setItem(KEYS.ALL_USERS, JSON.stringify(updatedUsers)),
        AsyncStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(updated)),
      ]);
      setUser(updated);
      return { success: true, message: 'Profile updated!' };
    } catch (e) {
      console.error('Update profile error:', e);
      return { success: false, message: 'Something went wrong. Please try again.' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, register, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
