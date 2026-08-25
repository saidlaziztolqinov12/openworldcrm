import { User, Group, Student, AttendanceRecord, InternalNotification, GroupActivityLog, SalaryAdvance } from '../types';
import { Firestore, collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';

export const INITIAL_SALARY_ADVANCES: SalaryAdvance[] = [];

export const INITIAL_GROUP_ACTIVITY_LOGS: GroupActivityLog[] = [];

export const INITIAL_NOTIFICATIONS: InternalNotification[] = [];

export const INITIAL_USERS: User[] = [
  {
    id: 'admin-1',
    name: 'MuhammadIso Ermatov',
    firstName: 'MuhammadIso',
    surname: 'Ermatov',
    email: 'admin@openworld.academy',
    password: 'admin123',
    role: 'super_admin',
    phone: '+998 90 123 4567',
    title: 'Director',
    subject: 'Center Administration & Academic Direction',
    avatarColor: 'bg-indigo-600',
    createdAt: '2026-01-10T08:00:00.000Z'
  }
];

export const INITIAL_GROUPS: Group[] = [];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export async function seedInitialFirestoreData(db: Firestore, force = false): Promise<boolean> {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    if (!force && !usersSnapshot.empty) {
      return false; // already seeded
    }

    const batch = writeBatch(db);

    // 1. Users
    INITIAL_USERS.forEach((user) => {
      const userRef = doc(db, 'users', user.id);
      batch.set(userRef, user);
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error seeding initial Firestore data:', error);
    return false;
  }
}
