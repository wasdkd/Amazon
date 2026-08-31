import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, LoginCredentials, RegisterCredentials } from '../types';
import * as api from '../lib/api';
import * as db from '../lib/storage';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = db.getCurrentUser();
    if (saved) {
      setUser(saved);
    }
    setLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const loggedUser = await api.loginUser(credentials);
    setUser(loggedUser);
  };

  const register = async (credentials: RegisterCredentials) => {
    const newUser = await api.registerUser(credentials);
    setUser(newUser);
  };

  const logout = () => {
    db.saveCurrentUser(null);
    setUser(null);
  };

  const updateProfile = async (updateData: Partial<User>) => {
    if (!user) return;
    const updated = await api.updateUserProfile(user.id, updateData);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}
