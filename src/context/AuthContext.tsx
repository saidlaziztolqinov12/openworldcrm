import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../lib/seedData';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isTeacher: boolean;
  loginAs: (user: User) => void;
  loginWithCredentials: (
    email: string,
    password: string,
    registeredUsers?: User[]
  ) => { success: boolean; message?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'openworld_active_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always start with strict login (null user) unless session is active
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      // Clean up legacy keys if any
      sessionStorage.removeItem('edupulse_active_user');
      localStorage.removeItem('edupulse_active_user');

      const saved = sessionStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'admin' || parsed.id === 'admin-1' || (parsed.name && parsed.name.includes('Sarah')))) {
          parsed.name = 'MuhammadIso Ermatov';
          parsed.firstName = 'MuhammadIso';
          parsed.surname = 'Ermatov';
          parsed.title = 'Director';
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    // Return null so user is always presented with the strict Login Screen
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  }, [currentUser]);

  const loginAs = (user: User) => {
    const sanitizedUser = { ...user };
    if (sanitizedUser.role === 'admin' || sanitizedUser.id === 'admin-1' || (sanitizedUser.name && sanitizedUser.name.includes('Sarah'))) {
      sanitizedUser.name = 'MuhammadIso Ermatov';
      sanitizedUser.firstName = 'MuhammadIso';
      sanitizedUser.surname = 'Ermatov';
      sanitizedUser.title = 'Director';
    }
    setCurrentUser(sanitizedUser);
  };

  const loginWithCredentials = (
    email: string,
    password: string,
    registeredUsers: User[] = []
  ): { success: boolean; message?: string } => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return { success: false, message: 'Please enter both email and password.' };
    }

    // 1. Check hardcoded Default Admin login (admin@center.com / admin / admin123)
    if (
      (trimmedEmail === 'admin@center.com' || trimmedEmail === 'admin' || trimmedEmail === 'director' || trimmedEmail === 'admin@openworld.edu' || trimmedEmail === 'admin@edupulse.edu') &&
      trimmedPassword === 'admin123'
    ) {
      const foundAdmin = registeredUsers.find((u) => u.role === 'admin');
      const adminUser: User = {
        ...(foundAdmin || INITIAL_USERS[0]),
        name: 'MuhammadIso Ermatov',
        firstName: 'MuhammadIso',
        surname: 'Ermatov',
        title: 'Director',
        role: 'admin'
      };
      setCurrentUser(adminUser);
      return { success: true };
    }

    // 2. Check registered users (from Firestore / DataContext or INITIAL_USERS)
    const combinedUsers = [...registeredUsers, ...INITIAL_USERS];
    const matchedUser = combinedUsers.find(
      (u) =>
        u.email.toLowerCase() === trimmedEmail ||
        u.name.toLowerCase() === trimmedEmail ||
        (u.firstName && u.firstName.toLowerCase() === trimmedEmail)
    );

    if (!matchedUser) {
      return {
        success: false,
        message: 'No account found with this login. Please check your spelling.'
      };
    }

    // Verify password if specified on the user record, or default seed passwords
    const validPassword = matchedUser.password || 'teacher123';
    if (trimmedPassword !== validPassword) {
      return {
        success: false,
        message: 'Incorrect password. Please verify your credentials and try again.'
      };
    }

    const sanitizedUser = { ...matchedUser };
    if (sanitizedUser.role === 'admin' || sanitizedUser.id === 'admin-1' || (sanitizedUser.name && sanitizedUser.name.includes('Sarah'))) {
      sanitizedUser.name = 'MuhammadIso Ermatov';
      sanitizedUser.firstName = 'MuhammadIso';
      sanitizedUser.surname = 'Ermatov';
      sanitizedUser.title = 'Director';
    }

    setCurrentUser(sanitizedUser);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    sessionStorage.removeItem('edupulse_active_user');
    localStorage.removeItem('edupulse_active_user');
  };

  const role = currentUser?.role || null;
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        isAdmin,
        isTeacher,
        loginAs,
        loginWithCredentials,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
