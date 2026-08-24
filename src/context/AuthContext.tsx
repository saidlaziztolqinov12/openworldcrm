import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../lib/seedData';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
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
        return JSON.parse(saved);
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

    let regListener: any;
    let actionListener: any;

    if (Capacitor.isNativePlatform()) {
      import('@capacitor/push-notifications').then(({ PushNotifications }) => {
        PushNotifications.requestPermissions().then((result) => {
          if (result.receive === 'granted') {
            PushNotifications.register();
          }
        });
        
        PushNotifications.addListener('registration', async (token) => {
          if (token && token.value && currentUser && currentUser.id) {
            try {
              await updateDoc(doc(db, 'users', currentUser.id), {
                fcmToken: token.value,
                fcmTokenUpdatedAt: new Date()
              });
            } catch (e) {
              console.warn('Failed to save FCM token to Firestore:', e);
            }
          }
        }).then((listener) => {
          regListener = listener;
        });

        PushNotifications.addListener('pushNotificationActionPerformed', () => {
          window.location.href = '/inbox';
        }).then((listener) => {
          actionListener = listener;
        });
      }).catch((err) => {
        console.warn('Failed to load PushNotifications plugin:', err);
      });
    } else {
      console.log('Push notifications registration skipped: running on web browser.');
    }

    return () => {
      if (regListener && typeof regListener.remove === 'function') {
        regListener.remove();
      }
      if (actionListener && typeof actionListener.remove === 'function') {
        actionListener.remove();
      }
    };
  }, [currentUser]);

  const loginAs = (user: User) => {
    const sanitizedUser = { ...user };
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

    // Accounts come from Firestore. INITIAL_USERS is seed data only and must
    // never take part in authentication: leaving it here meant a teacher
    // deleted in the admin panel could still sign in forever.
    const combinedUsers = registeredUsers.length > 0 ? registeredUsers : INITIAL_USERS;
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

    // No fallback password: a user document without a password field must not
    // authenticate on a shared default.
    if (!matchedUser.password || trimmedPassword !== matchedUser.password) {
      return {
        success: false,
        message: 'Incorrect password. Please verify your credentials and try again.'
      };
    }

    const sanitizedUser = { ...matchedUser };

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
