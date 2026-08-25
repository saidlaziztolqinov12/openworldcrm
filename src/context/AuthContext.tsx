import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../lib/initialData';
import { formatAuthLogin } from '../lib/authUtils';
import { setPersistence, browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isTeacher: boolean;
  isLoading: boolean;
  loginAs: (user: User) => void;
  loginWithCredentials: (
    email: string,
    password: string,
    registeredUsers?: User[]
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'openworld_active_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (userData.id === 'admin-1' || userData.email?.includes('admin')) {
              userData.role = 'super_admin';
              userData.name = 'MuhammadIso Ermatov';
              userData.firstName = 'MuhammadIso';
              userData.surname = 'Ermatov';
              userData.title = 'Director';
            }
            setCurrentUser({ uid: firebaseUser.uid, ...userData });
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error in onAuthStateChanged:', error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
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
    if (sanitizedUser.id === 'admin-1' || sanitizedUser.email === 'admin@center.com') {
      sanitizedUser.role = 'super_admin';
      sanitizedUser.name = 'MuhammadIso Ermatov';
      sanitizedUser.firstName = 'MuhammadIso';
      sanitizedUser.surname = 'Ermatov';
      sanitizedUser.title = 'Director';
    }
    setCurrentUser(sanitizedUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(sanitizedUser));
  };

  const loginWithCredentials = async (
    loginInput: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    const trimmedInput = loginInput.trim();
    const trimmedPassword = password.trim();

    if (!trimmedInput || !trimmedPassword) {
      return { success: false, message: 'Please enter both username and password.' };
    }

    try {
      const authEmail = formatAuthLogin(trimmedInput);
      const userCredential = await signInWithEmailAndPassword(auth, authEmail, trimmedPassword);
      const uid = userCredential.user.uid;

      // Fetch user profile and role by Auth UID
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found in database.');
      }

      const userData = userDoc.data() as User;
      if (userData.id === 'admin-1' || userData.email?.includes('admin')) {
        userData.role = 'super_admin';
        userData.name = 'MuhammadIso Ermatov';
        userData.firstName = 'MuhammadIso';
        userData.surname = 'Ermatov';
        userData.title = 'Director';
      }

      setCurrentUser(userData);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userData));
      return { success: true };
    } catch (err: any) {
      console.error('Firebase Auth login error:', err);
      let msg = 'Invalid username or password.';
      const code = err?.code || '';
      if (code === 'auth/user-disabled') {
        msg = 'User account disabled.';
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
        msg = 'Invalid username or password.';
      } else if (err?.message) {
        msg = err.message;
      }
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase sign out error:', e);
    }
    setCurrentUser(null);
    sessionStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    sessionStorage.removeItem('edupulse_active_user');
    localStorage.removeItem('edupulse_active_user');
  };

  const role = currentUser?.role || null;
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isTeacher = role === 'teacher';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        isAdmin,
        isSuperAdmin,
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

