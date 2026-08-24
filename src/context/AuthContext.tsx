import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  signOut
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isLoading: boolean;
  loginWithCredentials: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message?: string }>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Turn a Firebase Auth error into something a person can act on. The raw
 * codes ("auth/invalid-credential") are not useful to a teacher.
 */
const describeAuthError = (code: string): string => {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Ask the director to re-enable it.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Could not reach the server. Check your connection.';
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      // The single most likely first-deploy mistake, and impossible to guess
      // from Firebase's own wording ("CONFIGURATION_NOT_FOUND").
      return 'Email sign-in is not enabled for this project yet. Enable Authentication → Email/Password in the Firebase Console.';
    case 'auth/weak-password':
      return 'Choose a longer password (at least 8 characters).';
    case 'auth/requires-recent-login':
      return 'For security, sign out and back in before changing your password.';
    default:
      return 'Could not complete the request. Please try again.';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Keep the session across reloads. Firebase Auth owns it now — the app no
    // longer stores a user object (or a password) in localStorage, where the
    // role could simply be edited to 'admin'.
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Firebase persistence warning:', err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }
      try {
        // The profile — including the role — is read from Firestore, keyed by
        // the Auth UID. Firestore rules check the same document, so the client
        // cannot grant itself a role.
        const snapshot = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!snapshot.exists()) {
          console.error('Signed-in user has no profile document:', firebaseUser.uid);
          await signOut(auth);
          setCurrentUser(null);
          return;
        }
        const data = snapshot.data() as Omit<User, 'id'>;
        setCurrentUser({ ...data, id: firebaseUser.uid, email: firebaseUser.email || data.email });
      } catch (error) {
        console.error('Could not load the signed-in user profile:', error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

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
          if (token?.value && currentUser?.id) {
            try {
              await updateDoc(doc(db, 'users', currentUser.id), {
                fcmToken: token.value,
                fcmTokenUpdatedAt: new Date().toISOString()
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
      if (regListener?.remove) regListener.remove();
      if (actionListener?.remove) actionListener.remove();
    };
  }, [currentUser?.id]);

  const loginWithCredentials = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      return { success: false, message: 'Please enter both email and password.' };
    }
    try {
      // onAuthStateChanged above loads the profile and sets currentUser.
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: describeAuthError(error?.code) };
    }
  };

  const sendPasswordReset = async (
    email: string
  ): Promise<{ success: boolean; message?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      return { success: false, message: 'Enter your email address first.' };
    }
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: describeAuthError(error?.code) };
    }
  };

  const changePassword = async (
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!auth.currentUser) return { success: false, message: 'You are not signed in.' };
    if (newPassword.length < 8) {
      return { success: false, message: 'Choose a password of at least 8 characters.' };
    }
    try {
      await updatePassword(auth.currentUser, newPassword);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: describeAuthError(error?.code) };
    }
  };

  const logout = async (): Promise<void> => {
    // Clear the FCM token so notifications stop following a device that has
    // been handed to somebody else.
    if (currentUser?.id) {
      try {
        await updateDoc(doc(db, 'users', currentUser.id), { fcmToken: null });
      } catch {
        // Signing out matters more than tidying the token.
      }
    }
    await signOut(auth);
    setCurrentUser(null);
  };

  const role = currentUser?.role || null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        isAdmin: role === 'admin',
        isTeacher: role === 'teacher',
        isLoading,
        loginWithCredentials,
        sendPasswordReset,
        changePassword,
        logout
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
