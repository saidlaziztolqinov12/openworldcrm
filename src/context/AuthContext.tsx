import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../lib/seedData';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      sessionStorage.removeItem('edupulse_active_user');
      localStorage.removeItem('edupulse_active_user');
      sessionStorage.removeItem(LOCAL_STORAGE_USER_KEY);

      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
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
    return null;
  });

  useEffect(() => {
    // Set Firebase auth persistence to local storage
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Firebase persistence warning:', err);
    });

    // Simulate short check for auth state restoration
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const setupPushNotifications = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const permResult = await PushNotifications.requestPermissions();
          if (permResult.receive === 'granted') {
            await PushNotifications.register();
          }
        }
      } catch (err) {
        console.warn('Push notifications permission/register error:', err);
      }
    };

    setupPushNotifications();

    let regListener: any;
    let actionListener: any;

    try {
      if (Capacitor.isNativePlatform() || PushNotifications) {
        regListener = PushNotifications.addListener('registration', async (token) => {
          if (token && token.value && currentUser) {
            try {
              await setDoc(
                doc(db, 'users', currentUser.id),
                { fcmToken: token.value },
                { merge: true }
              );
            } catch (e) {
              console.warn('Failed to save FCM token to Firestore:', e);
            }
          }
        });

        actionListener = PushNotifications.addListener('pushNotificationActionPerformed', () => {
          window.dispatchEvent(new CustomEvent('navigate-to-inbox'));
        });
      }
    } catch (e) {
      console.warn('Push notifications listener setup warning:', e);
    }

    return () => {
      if (regListener) regListener.remove();
      if (actionListener) actionListener.remove();
    };
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
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(sanitizedUser));
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
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(adminUser));
      return { success: true };
    }

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
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(sanitizedUser));
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
        isLoading,
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
