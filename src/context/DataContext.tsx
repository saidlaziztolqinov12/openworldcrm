import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  Group,
  Student,
  AttendanceRecord,
  InternalNotification,
  MonthlyRosterStudent,
  GroupActivityLog,
  SalaryAdvance,
  StudentPayment,
  Installment
} from '../types';
import { db } from '../firebase.config';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '../lib/firebase';
import { formatAuthLogin } from '../lib/authUtils';
import { getLocalDate, getLocalMonth } from '../lib/dateUtils';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  addDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import {
  INITIAL_USERS,
  INITIAL_GROUPS,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_NOTIFICATIONS,
  INITIAL_GROUP_ACTIVITY_LOGS,
  INITIAL_SALARY_ADVANCES,
  seedInitialFirestoreData
} from '../lib/initialData';
import { useAuth } from './AuthContext';
import { generateUniqueStudentId } from '../utils/studentId';
import { sendTelegramMessage } from '../services/telegram';
import { formatAttendanceNotification } from '../lib/sms';

interface DataContextType {
  users: User[];
  teachers: User[];
  admins: User[];
  groups: Group[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  notifications: InternalNotification[];
  groupActivityLogs: GroupActivityLog[];
  salaryAdvances: SalaryAdvance[];
  studentPayments: StudentPayment[];
  loading: boolean;
  isOnline: boolean;
  addGroup: (group: Omit<Group, 'id' | 'createdAt'>) => Promise<string>;
  updateGroup: (id: string, group: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  archiveGroup: (id: string, archived: boolean) => Promise<void>;
  reassignTeacher: (groupId: string, teacherId: string, teacherName: string) => Promise<void>;
  addStudent: (student: Omit<Student, 'id'>) => Promise<string>;
  updateStudent: (id: string, student: Partial<Student>) => Promise<void>;
  transferStudent: (studentId: string, newGroupId: string | null) => Promise<void>;
  removeStudentFromGroup: (id: string) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  saveAttendanceRecord: (record: Omit<AttendanceRecord, 'id' | 'createdAt'> & { id?: string }) => Promise<string>;
  deleteAttendanceRecord: (id: string) => Promise<void>;
  addTeacher: (teacher: Omit<User, 'id' | 'createdAt'>) => Promise<string>;
  updateTeacher: (id: string, teacher: Partial<User>) => Promise<void>;
  deleteTeacher: (id: string) => Promise<void>;
  addAdmin: (admin: Omit<User, 'id' | 'createdAt' | 'role'>) => Promise<string>;
  migrateMissingStudentIds: () => Promise<number>;
  sendNotification: (notif: Omit<InternalNotification, 'id' | 'createdAt' | 'read' | 'readBy'>) => Promise<string>;
  markNotificationAsRead: (id: string, userId?: string) => Promise<void>;
  updateNotificationStatus: (notificationId: string, status: 'accepted' | 'declined' | 'read') => Promise<void>;
  resolveTeacherRequest: (notificationId: string, status: 'accepted' | 'declined' | 'read') => Promise<void>;
  markAllNotificationsAsRead: (userId?: string) => Promise<void>;
  approveTransferRequest: (notificationId: string) => Promise<void>;
  rejectTransferRequest: (notificationId: string) => Promise<void>;
  publishAnnouncement: (title: string, message: string, priority?: 'normal' | 'important' | 'urgent') => Promise<string>;
  logGroupActivity: (activity: Omit<GroupActivityLog, 'id' | 'timestamp'> & { timestamp?: string }) => Promise<string>;
  addSalaryAdvance: (advance: Omit<SalaryAdvance, 'id' | 'createdAt'>) => Promise<string>;
  updateSalaryAdvance: (id: string, advance: Partial<SalaryAdvance>) => Promise<void>;
  deleteSalaryAdvance: (id: string) => Promise<void>;
  recordStudentPayment: (data: { studentId: string; studentName: string; groupId: string; groupName: string; monthYear: string; amount: number; method: 'Cash' | 'Card / Bank Transfer' | 'Payme / Click' | 'Other'; date: string; note?: string; monthlyFee?: number }) => Promise<void>;
  deleteStudentPaymentInstallment: (docId: string, installmentId: string) => Promise<void>;
  updateStudentMonthlyFee: (docId: string, monthlyFee: number, studentData?: { studentId: string; studentName: string; groupId: string; groupName: string; monthYear: string }) => Promise<void>;
  resetDatabaseToDefaults: () => Promise<void>;
  getGroupStudents: (groupId: string) => Student[];
  getGroupAttendanceRecords: (groupId: string) => AttendanceRecord[];
  getGroupActivityLogs: (groupId: string) => GroupActivityLog[];
  getMonthlyAttendanceRoster: (groupId: string, yearMonth: string) => MonthlyRosterStudent[];
  getMonthlyLessonsCount: (groupId: string, yearMonth?: string) => number;
}


const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [groupActivityLogs, setGroupActivityLogs] = useState<GroupActivityLog[]>(INITIAL_GROUP_ACTIVITY_LOGS);
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvance[]>(INITIAL_SALARY_ADVANCES);
  const [studentPayments, setStudentPayments] = useState<StudentPayment[]>(() => {
    try {
      const cached = localStorage.getItem('cached_student_payments');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Initialize and listen to Firestore in real-time
  useEffect(() => {
    let unsubscribeUsers = () => {};
    let unsubscribeGroups = () => {};
    let unsubscribeStudents = () => {};
    let unsubscribeAttendance = () => {};
    let unsubscribeAttendance2 = () => {};
    let unsubscribeSessions = () => {};
    let unsubscribeNotifications = () => {};
    let unsubscribeLogs = () => {};
    let unsubscribeSalaryAdvances = () => {};
    let unsubscribeStudentPayments = () => {};

    if (!currentUser) {
      setLoading(false);
      return () => {};
    }

    const setupListeners = async () => {
      try {
        // Auto-seed Firestore on initial connect if users collection is empty
        try {
          const snapshot = await getDocs(collection(db, 'users'));
          if (snapshot.empty) {
            await seedInitialFirestoreData(db, false);
          }
        } catch (e) {
          console.warn('Firestore initial connection/seed notice:', e);
        }

        // 1. Live Sync: users collection
        unsubscribeUsers = onSnapshot(
          query(collection(db, 'users')),
          (snapshot) => {
            if (!snapshot.empty) {
              const items: User[] = [];
              snapshot.forEach((d) => {
                const data = d.data() as Omit<User, 'id'>;
                let u: User = { id: d.id, ...data };
                if (u.id === 'admin-1' || u.email === 'admin@center.com' || (u.name && u.name.includes('Sarah'))) {
                  u = {
                    ...u,
                    name: 'MuhammadIso Ermatov',
                    firstName: 'MuhammadIso',
                    surname: 'Ermatov',
                    title: 'Director',
                    role: 'super_admin'
                  };
                }
                items.push(u);
              });
              setUsers(items);
            }
            setIsOnline(true);
          },
          (err) => {
            console.warn('Users listener notice:', err);
            setIsOnline(false);
          }
        );

        // 2. Live Sync: groups collection
        unsubscribeGroups = onSnapshot(
          query(collection(db, 'groups')),
          (snapshot) => {
            const items: Group[] = [];
            snapshot.forEach((d) => items.push({ id: d.id, ...(d.data() as Omit<Group, 'id'>) }));
            setGroups(items);
          },
          (err) => {
            console.warn('Groups listener notice:', err);
            setGroups([]);
          }
        );

        // 3. Live Sync: students collection
        unsubscribeStudents = onSnapshot(
          query(collection(db, 'students')),
          (snapshot) => {
            const items: Student[] = [];
            snapshot.forEach((d) => items.push({ id: d.id, ...(d.data() as Omit<Student, 'id'>) }));
            setStudents(items);
          },
          (err) => {
            console.warn('Students listener notice:', err);
            setStudents([]);
          }
        );

        // 4. Live Sync: attendance collection (attendance_records)
        const handleAttendanceSnapshot = (snapshot: any) => {
          const itemsMap = new Map<string, AttendanceRecord>();
          snapshot.forEach((d: any) => {
            itemsMap.set(d.id, { id: d.id, ...(d.data() as Omit<AttendanceRecord, 'id'>) });
          });
          setAttendanceRecords(Array.from(itemsMap.values()));
        };
        const handleAttendanceError = (err: any) => {
          console.warn('Attendance listener notice:', err);
        };
        unsubscribeAttendance = onSnapshot(query(collection(db, 'attendance_records')), handleAttendanceSnapshot, handleAttendanceError);

        // 5. Live Sync: notifications collection (real-time Inbox) scoped to user or GLOBAL
        const userRecipientIds = Array.from(
          new Set([currentUser.uid, currentUser.id, 'GLOBAL'].filter(Boolean) as string[])
        );
        unsubscribeNotifications = onSnapshot(
          query(
            collection(db, 'notifications'),
            where('recipientId', 'in', userRecipientIds)
          ),
          (snapshot) => {
            const items: InternalNotification[] = [];
            snapshot.forEach((d) => {
              const notif = { id: d.id, ...(d.data() as Omit<InternalNotification, 'id'>) };
              if (notif.senderName && notif.senderName.includes('Sarah')) {
                notif.senderName = notif.senderName.replace(/Sarah\s*Jenkins/gi, 'MuhammadIso Ermatov');
              }
              items.push(notif);
            });
            // Sort newest first
            items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setNotifications(items);
            setLoading(false);
          },
          (err) => {
            console.warn('Notifications listener notice:', err);
            setLoading(false);
          }
        );

        // 6. Live Sync: group_logs collection (real-time Group Archive) limited to 50 ordered by timestamp desc
        unsubscribeLogs = onSnapshot(
          query(
            collection(db, 'group_logs'),
            orderBy('timestamp', 'desc'),
            limit(50)
          ),
          (snapshot) => {
            if (!snapshot.empty) {
              const items: GroupActivityLog[] = [];
              snapshot.forEach((d) => {
                const log = { id: d.id, ...(d.data() as Omit<GroupActivityLog, 'id'>) };
                if (log.actorName && log.actorName.includes('Sarah')) {
                  log.actorName = log.actorName.replace(/Sarah\s*Jenkins/gi, 'MuhammadIso Ermatov');
                }
                items.push(log);
              });
              items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              setGroupActivityLogs(items);
            }
          },
          (err) => {
            console.warn('Group logs listener notice:', err);
          }
        );

        // 7. Live Sync: salary_advances collection (only if super_admin)
        if (currentUser.role === 'super_admin') {
          unsubscribeSalaryAdvances = onSnapshot(
            query(collection(db, 'salary_advances')),
            (snapshot) => {
              const items: SalaryAdvance[] = [];
              snapshot.forEach((d) => {
                items.push({ id: d.id, ...(d.data() as Omit<SalaryAdvance, 'id'>) });
              });
              items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              setSalaryAdvances(items);
            },
            (err) => {
              console.warn('Salary advances listener notice:', err);
            }
          );
        }

        // 8. Live Sync: student_payments collection
        unsubscribeStudentPayments = onSnapshot(
          query(collection(db, 'student_payments')),
          (snapshot) => {
            const items: StudentPayment[] = [];
            snapshot.forEach((d) => {
              items.push({ id: d.id, ...(d.data() as Omit<StudentPayment, 'id'>) });
            });
            setStudentPayments(items);
          },
          (err) => {
            console.warn('Student payments listener notice:', err);
          }
        );
      } catch (e) {
        console.warn('Firestore connection notice:', e);
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      unsubscribeUsers();
      unsubscribeGroups();
      unsubscribeStudents();
      unsubscribeAttendance();
      unsubscribeNotifications();
      unsubscribeLogs();
      unsubscribeSalaryAdvances();
      unsubscribeStudentPayments();
    };
  }, [currentUser]);

  const teachers = users.filter((u) => u.role === 'teacher');
  const admins = users.filter((u) => u.role === 'admin' || u.role === 'super_admin');

  const cleanFirestoreData = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(cleanFirestoreData);
    }
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanFirestoreData(val);
      }
    }
    return cleaned;
  };

  const recordStudentPayment = async (data: {
    studentId: string;
    studentName: string;
    groupId: string;
    groupName: string;
    monthYear: string;
    amount: number;
    method: 'Cash' | 'Card / Bank Transfer' | 'Payme / Click' | 'Other';
    date: string;
    note?: string;
    monthlyFee?: number;
  }) => {
    const docId = `${data.studentId}_${data.monthYear}`;
    const recordRef = doc(db, 'student_payments', data.monthYear, 'records', data.studentId);
    const parentRef = doc(db, 'student_payments', data.monthYear);

    let existingInstallments: Installment[] = [];
    let currentTotalPaid = 0;
    let fee = data.monthlyFee ?? 500000;

    try {
      const docSnap = await getDoc(recordRef);
      if (docSnap.exists()) {
        const docData = docSnap.data();
        existingInstallments = Array.isArray(docData.installments) ? docData.installments : [];
        currentTotalPaid = Number(docData.totalPaid || 0);
        fee = Number(docData.monthlyFee || data.monthlyFee || 500000);
      } else {
        const existingLocal = studentPayments.find((p) => p.id === docId);
        if (existingLocal) {
          existingInstallments = existingLocal.installments || [];
          currentTotalPaid = existingLocal.totalPaid || 0;
          fee = existingLocal.monthlyFee || fee;
        }
      }
    } catch (err) {
      console.warn('Error reading existing payment doc:', err);
    }

    const newInstallment: Installment = {
      id: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      amount: Number(data.amount),
      method: data.method || 'Cash',
      date: data.date,
      note: data.note?.trim() || 'No note',
      recordedById: currentUser?.id || 'admin-1',
      recordedByName: currentUser?.name || 'Administrator',
      createdAt: new Date().toISOString()
    };

    const updatedInstallments = [...existingInstallments, newInstallment];
    const newTotalPaid = currentTotalPaid + Number(data.amount);

    let newStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (newTotalPaid >= fee) {
      newStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newStatus = 'partial';
    }

    const updatedPaymentRecord: StudentPayment = {
      id: docId,
      studentId: data.studentId,
      studentName: data.studentName,
      groupId: data.groupId,
      groupName: data.groupName,
      monthYear: data.monthYear,
      monthlyFee: fee,
      totalPaid: newTotalPaid,
      status: newStatus,
      installments: updatedInstallments,
      updatedAt: new Date().toISOString()
    };

    setStudentPayments((prev) => {
      const idx = prev.findIndex((p) => p.id === docId);
      let next: StudentPayment[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = updatedPaymentRecord;
      } else {
        next = [...prev, updatedPaymentRecord];
      }
      try {
        localStorage.setItem('cached_student_payments', JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      const payload = {
        studentId: data.studentId,
        studentName: data.studentName,
        groupId: data.groupId || '',
        groupName: data.groupName || '',
        monthlyFee: fee,
        totalPaid: newTotalPaid,
        status: newStatus,
        installments: updatedInstallments,
        updatedAt: serverTimestamp()
      };

      await setDoc(recordRef, cleanFirestoreData(payload), { merge: true });
      await setDoc(parentRef, { lastUpdated: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('Firestore write notice for recordStudentPayment:', e);
      throw e;
    }
  };

  const deleteStudentPaymentInstallment = async (docId: string, installmentId: string) => {
    const monthYear = docId.slice(-7);
    const studentId = docId.slice(0, -8);
    const recordRef = doc(db, 'student_payments', monthYear, 'records', studentId);

    let existingInstallments: Installment[] = [];
    let studentName = '';
    let groupId = '';
    let groupName = '';
    let monthlyFee = 500000;

    try {
      const docSnap = await getDoc(recordRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        existingInstallments = Array.isArray(data.installments) ? data.installments : [];
        studentName = data.studentName || '';
        groupId = data.groupId || '';
        groupName = data.groupName || '';
        monthlyFee = Number(data.monthlyFee || 500000);
      } else {
        const existingLocal = studentPayments.find((p) => p.id === docId);
        if (existingLocal) {
          existingInstallments = existingLocal.installments || [];
          studentName = existingLocal.studentName;
          groupId = existingLocal.groupId;
          groupName = existingLocal.groupName;
          monthlyFee = existingLocal.monthlyFee;
        }
      }
    } catch (e) {
      console.warn('Error fetching record for deletion:', e);
    }

    const installments = existingInstallments.filter((i) => i.id !== installmentId);
    const totalPaid = installments.reduce((sum, i) => sum + i.amount, 0);

    let status: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (totalPaid >= monthlyFee) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    const updatedPaymentRecord: StudentPayment = {
      id: docId,
      studentId,
      studentName,
      groupId,
      groupName,
      monthYear,
      monthlyFee,
      totalPaid,
      status,
      installments,
      updatedAt: new Date().toISOString()
    };

    setStudentPayments((prev) => {
      const idx = prev.findIndex((p) => p.id === docId);
      let next: StudentPayment[];
      if (idx >= 0) {
        next = [...prev];
        if (installments.length === 0) {
          next.splice(idx, 1);
        } else {
          next[idx] = updatedPaymentRecord;
        }
      } else {
        next = [...prev, updatedPaymentRecord];
      }
      try {
        localStorage.setItem('cached_student_payments', JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      const parentRef = doc(db, 'student_payments', monthYear);
      if (installments.length === 0) {
        await deleteDoc(recordRef);
      } else {
        const payload = {
          studentId,
          studentName,
          groupId,
          groupName,
          monthlyFee,
          totalPaid,
          status,
          installments,
          updatedAt: serverTimestamp()
        };
        await setDoc(recordRef, cleanFirestoreData(payload), { merge: true });
      }
      await setDoc(parentRef, { lastUpdated: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('Firestore delete installment notice:', e);
      throw e;
    }
  };

  const updateStudentMonthlyFee = async (
    docId: string,
    monthlyFee: number,
    studentData?: { studentId: string; studentName: string; groupId: string; groupName: string; monthYear: string }
  ) => {
    const monthYear = studentData?.monthYear || docId.slice(-7);
    const studentId = studentData?.studentId || docId.slice(0, -8);
    const recordRef = doc(db, 'student_payments', monthYear, 'records', studentId);

    let installments: Installment[] = [];
    let totalPaid = 0;
    let studentName = studentData?.studentName || '';
    let groupId = studentData?.groupId || '';
    let groupName = studentData?.groupName || '';

    try {
      const docSnap = await getDoc(recordRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        installments = Array.isArray(data.installments) ? data.installments : [];
        totalPaid = Number(data.totalPaid || 0);
        studentName = studentName || data.studentName || '';
        groupId = groupId || data.groupId || '';
        groupName = groupName || data.groupName || '';
      } else {
        const existingLocal = studentPayments.find((p) => p.id === docId);
        if (existingLocal) {
          installments = existingLocal.installments || [];
          totalPaid = existingLocal.totalPaid || 0;
          studentName = studentName || existingLocal.studentName;
          groupId = groupId || existingLocal.groupId;
          groupName = groupName || existingLocal.groupName;
        }
      }
    } catch (e) {
      console.warn('Error fetching record for monthly fee update:', e);
    }

    let status: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (totalPaid >= monthlyFee) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    const updatedPaymentRecord: StudentPayment = {
      id: docId,
      studentId,
      studentName,
      groupId,
      groupName,
      monthYear,
      monthlyFee,
      totalPaid,
      status,
      installments,
      updatedAt: new Date().toISOString()
    };

    setStudentPayments((prev) => {
      const idx = prev.findIndex((p) => p.id === docId);
      let next: StudentPayment[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = updatedPaymentRecord;
      } else {
        next = [...prev, updatedPaymentRecord];
      }
      try {
        localStorage.setItem('cached_student_payments', JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      const parentRef = doc(db, 'student_payments', monthYear);
      const payload = {
        studentId,
        studentName,
        groupId,
        groupName,
        monthlyFee: Number(monthlyFee),
        totalPaid,
        status,
        installments,
        updatedAt: serverTimestamp()
      };

      await setDoc(recordRef, cleanFirestoreData(payload), { merge: true });
      await setDoc(parentRef, { lastUpdated: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('Firestore update monthly fee notice:', e);
      throw e;
    }
  };


  const addAdmin = async (adminData: Omit<User, 'id' | 'createdAt' | 'role'> & { username?: string; password?: string }): Promise<string> => {
    const loginInput = adminData.username || adminData.email || adminData.name;
    const formattedLoginEmail = formatAuthLogin(loginInput);
    let newUid = `admin-${Date.now()}`;

    try {
      const secondaryApp = initializeApp(firebaseConfig, `SecondaryAuth_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      const newCredentials = await createUserWithEmailAndPassword(secondaryAuth, formattedLoginEmail, adminData.password || 'admin123');
      newUid = newCredentials.user.uid;
      await signOut(secondaryAuth);
    } catch (e) {
      console.warn('Secondary auth creation notice:', e);
    }

    const newAdmin: User = {
      ...adminData,
      uid: newUid,
      id: newUid,
      username: (adminData.username || loginInput).trim().toLowerCase(),
      email: formattedLoginEmail,
      role: 'admin',
      avatarColor: adminData.avatarColor || 'bg-purple-600',
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', newUid), {
      ...newAdmin,
      createdAt: serverTimestamp()
    });
    setUsers((prev) => [...prev, newAdmin]);
    return newUid;
  };

  const addSalaryAdvance = async (advanceData: Omit<SalaryAdvance, 'id' | 'createdAt'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'salary_advances'), {
      ...advanceData,
      createdAt: serverTimestamp()
    });
    const id = docRef.id;
    const newAdvance: SalaryAdvance = {
      ...advanceData,
      id,
      createdAt: new Date().toISOString()
    };
    setSalaryAdvances((prev) => [newAdvance, ...prev]);
    return id;
  };

  const updateSalaryAdvance = async (id: string, advanceData: Partial<SalaryAdvance>): Promise<void> => {
    const existing = salaryAdvances.find((a) => a.id === id);
    const payload = {
      ...advanceData,
      createdById: existing?.createdById || advanceData.createdById,
      createdByName: existing?.createdByName || advanceData.createdByName,
      createdAt: existing?.createdAt || advanceData.createdAt,
      updatedAt: serverTimestamp()
    };
    await updateDoc(doc(db, 'salary_advances', id), payload);
    setSalaryAdvances((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              ...advanceData,
              createdById: existing?.createdById || a.createdById,
              createdByName: existing?.createdByName || a.createdByName,
              createdAt: existing?.createdAt || a.createdAt,
              updatedAt: new Date().toISOString()
            }
          : a
      )
    );
  };

  const deleteSalaryAdvance = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'salary_advances', id));
    setSalaryAdvances((prev) => prev.filter((a) => a.id !== id));
  };


  const logGroupActivity = async (
    activity: Omit<GroupActivityLog, 'id' | 'timestamp'> & { timestamp?: string }
  ): Promise<string> => {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newLog: GroupActivityLog = {
      ...activity,
      id,
      timestamp: activity.timestamp || new Date().toISOString()
    };

    setGroupActivityLogs((prev) => [newLog, ...prev]);
    try {
      await setDoc(doc(db, 'group_logs', id), newLog);
    } catch (e) {
      console.warn('Firestore write notice for group_logs:', e);
    }
    return id;
  };

  const addGroup = async (groupData: Omit<Group, 'id' | 'createdAt'>): Promise<string> => {
    const id = `group-${Date.now()}`;
    const newGroup: Group = {
      ...groupData,
      id,
      archived: false,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'groups', id), newGroup);
    setGroups((prev) => [...prev, newGroup]);

    // Auto-log group creation activity in group_logs
    const actorId = currentUser?.id || 'admin-1';
    const actorName = currentUser?.name || 'Center Administration';

    await logGroupActivity({
      groupId: id,
      actorId,
      actorName,
      actionType: 'GROUP_CREATED',
      description: `Created cohort "${newGroup.name}" with schedule ${newGroup.schedule}`
    });

    if (newGroup.teacherName) {
      await logGroupActivity({
        groupId: id,
        actorId,
        actorName,
        actionType: 'TEACHER_ASSIGNED',
        description: `Assigned Instructor ${newGroup.teacherName} to cohort`
      });
    }

    return id;
  };

  const updateGroup = async (id: string, groupData: Partial<Group>): Promise<void> => {
    const prevGroup = groups.find((g) => g.id === id);
    await updateDoc(doc(db, 'groups', id), groupData);
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...groupData } : g)));

    // If teacher was updated or assigned
    if (groupData.teacherName && prevGroup && groupData.teacherName !== prevGroup.teacherName) {
      const actorId = currentUser?.id || 'admin-1';
      const actorName = currentUser?.name || 'Center Administration';
      await logGroupActivity({
        groupId: id,
        actorId,
        actorName,
        actionType: 'TEACHER_ASSIGNED',
        description: `Assigned Instructor ${groupData.teacherName} to cohort`
      });
    }
  };

  const archiveGroup = async (id: string, archived: boolean): Promise<void> => {
    await updateGroup(id, { archived });
  };

  const deleteGroup = async (groupId: string): Promise<void> => {
    // 1. Unassign all students currently assigned to this group (set groupId to null)
    const affectedStudents = students.filter((s) => s.groupId === groupId);

    for (const student of affectedStudents) {
      await updateDoc(doc(db, 'students', student.id), {
        groupId: null,
        previousGroupId: groupId,
        status: 'active'
      });
    }

    // 2. Delete group from Firestore
    await deleteDoc(doc(db, 'groups', groupId));

    // 3. Update local state
    setStudents((prev) =>
      prev.map((s) =>
        s.groupId === groupId
          ? { ...s, groupId: null, previousGroupId: groupId, status: 'active' }
          : s
      )
    );
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const reassignTeacher = async (groupId: string, teacherId: string, teacherName: string): Promise<void> => {
    await updateGroup(groupId, { teacherId, teacherName });
    const actorId = currentUser?.id || 'admin-1';
    const actorName = currentUser?.name || 'Center Administration';

    await logGroupActivity({
      groupId,
      actorId,
      actorName,
      actionType: 'TEACHER_ASSIGNED',
      description: `Assigned Instructor ${teacherName} to cohort`
    });
  };

  const addStudent = async (studentData: Omit<Student, 'id'>): Promise<string> => {
    const id = `student-${Date.now()}`;
    const studentId = studentData.studentId || generateUniqueStudentId(students);
    const newStudent: Student = {
      ...studentData,
      id,
      studentId,
      status: studentData.status || 'active'
    };

    await setDoc(doc(db, 'students', id), newStudent);
    setStudents((prev) => [...prev, newStudent]);

    // Auto-log student enrollment if assigned directly to a group
    if (newStudent.groupId) {
      const actorId = currentUser?.id || 'staff';
      const actorName = currentUser?.name || 'Staff Member';
      await logGroupActivity({
        groupId: newStudent.groupId,
        actorId,
        actorName,
        actionType: 'STUDENT_ENROLLED',
        description: `Enrolled student ${newStudent.firstName} ${newStudent.surname} into cohort`
      });
    }

    return id;
  };

  const migrateMissingStudentIds = async (): Promise<number> => {
    let count = 0;
    const currentStudents = [...students];
    const updatedStudents = currentStudents.map((s) => {
      if (!s.studentId || s.studentId.length !== 5 || isNaN(Number(s.studentId))) {
        const newId = generateUniqueStudentId(currentStudents);
        s.studentId = newId;
        count++;
        return { ...s, studentId: newId };
      }
      return s;
    });

    if (count > 0) {
      for (const s of updatedStudents) {
        await updateDoc(doc(db, 'students', s.id), { studentId: s.studentId });
      }
      setStudents(updatedStudents);
    }
    return count;
  };

  const updateStudent = async (id: string, studentData: Partial<Student>): Promise<void> => {
    await updateDoc(doc(db, 'students', id), studentData);
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...studentData } : s)));
  };

  const transferStudent = async (studentId: string, newGroupId: string | null): Promise<void> => {
    const targetStudent = students.find((s) => s.id === studentId);
    const previousGroupId = targetStudent?.groupId || null;
    const prevGroup = groups.find((g) => g.id === previousGroupId);
    const newGroup = groups.find((g) => g.id === newGroupId);
    const studentName = targetStudent ? `${targetStudent.firstName} ${targetStudent.surname}` : 'Student';

    const updatePayload: Partial<Student> = {
      previousGroupId: previousGroupId,
      groupId: newGroupId,
      transferDate: new Date().toISOString(),
      status: 'active'
    };

    await updateDoc(doc(db, 'students', studentId), updatePayload);
    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, ...updatePayload } : s)));

    const actorId = currentUser?.id || 'staff';
    const actorName = currentUser?.name || 'Staff Member';

    // 1. If enrolled into newGroupId
    if (newGroupId) {
      const enrollDesc = prevGroup
        ? `Enrolled student ${studentName} into cohort (transferred from ${prevGroup.name})`
        : `Enrolled student ${studentName} into cohort`;

      await logGroupActivity({
        groupId: newGroupId,
        actorId,
        actorName,
        actionType: 'STUDENT_ENROLLED',
        description: enrollDesc
      });
    }

    // 2. If student had a previousGroupId
    if (previousGroupId && previousGroupId !== newGroupId) {
      if (newGroupId && newGroup) {
        // Transferred out to another specific cohort
        await logGroupActivity({
          groupId: previousGroupId,
          actorId,
          actorName,
          actionType: 'STUDENT_TRANSFERRED_OUT',
          description: `Student ${studentName} transferred out to ${newGroup.name}`
        });
      } else if (!newGroupId) {
        // Removed/unassigned from cohort roster
        await logGroupActivity({
          groupId: previousGroupId,
          actorId,
          actorName,
          actionType: 'STUDENT_REMOVED',
          description: `Removed student ${studentName} from cohort roster`
        });
      }
    }
  };

  const removeStudentFromGroup = async (id: string): Promise<void> => {
    await transferStudent(id, null);
  };

  const deleteStudent = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'students', id));
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const saveAttendanceRecord = async (
    record: Omit<AttendanceRecord, 'id' | 'createdAt'> & { id?: string }
  ): Promise<string> => {
    const existing = attendanceRecords.find(
      (r) => r.groupId === record.groupId && r.date === record.date
    );

    const recordId = record.id || existing?.id || doc(collection(db, 'attendance_records')).id;
    const cleanedRecords = (record.records || []).map((s) => ({
      studentId: s.studentId || '',
      studentName: s.studentName || '',
      status: s.status || 'present'
    }));

    const sanitizedPayload: AttendanceRecord = {
      id: recordId,
      groupId: record.groupId || '',
      groupName: record.groupName || '',
      teacherId: record.teacherId || '',
      date: record.date || getLocalDate(),
      lessonNumber: record.lessonNumber || 1,
      records: cleanedRecords,
      statusMap: record.statusMap || {},
      marksMap: record.marksMap || {},
      commentsMap: record.commentsMap || {},
      topicCovered: record.topicCovered || '',
      notes: record.notes || '',
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    await setDoc(doc(db, 'attendance_records', recordId), sanitizedPayload);

    setAttendanceRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === recordId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = sanitizedPayload;
        return next;
      }
      return [...prev, sanitizedPayload];
    });

    // Trigger Telegram notifications for students with telegramChatId / parentTelegramId
    const dateStr = sanitizedPayload.date;
    const statusMap = sanitizedPayload.statusMap || {};
    const commentsMap = sanitizedPayload.commentsMap || {};

    for (const [studentId, status] of Object.entries(statusMap)) {
      const student = students.find((s) => s.id === studentId);
      if (student && (student.telegramChatId || student.parentTelegramId)) {
        const chatId = student.telegramChatId || student.parentTelegramId;
        const score = sanitizedPayload.marksMap?.[studentId];
        const comment = commentsMap[studentId] || '';
        const studentName = `${student.firstName} ${student.surname}`;
        const text = formatAttendanceNotification(studentName, dateStr, status, score, comment);
        
        sendTelegramMessage(chatId, text).catch((err) => {
          console.error('Failed to send Telegram message:', err);
        });
      }
    }
    return recordId;
  };

  const deleteAttendanceRecord = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'attendance_records', id));
    setAttendanceRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const addTeacher = async (teacherData: Omit<User, 'id' | 'createdAt'> & { username?: string; password?: string }): Promise<string> => {
    const loginInput = teacherData.username || teacherData.email || teacherData.name;
    const formattedLoginEmail = formatAuthLogin(loginInput);
    let newUid = `teacher-${Date.now()}`;

    try {
      const secondaryApp = initializeApp(firebaseConfig, `SecondaryAuth_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      const newCredentials = await createUserWithEmailAndPassword(secondaryAuth, formattedLoginEmail, teacherData.password || 'teacher123');
      newUid = newCredentials.user.uid;
      await signOut(secondaryAuth);
    } catch (e) {
      console.warn('Secondary auth creation notice:', e);
    }

    const newTeacher: User = {
      ...teacherData,
      uid: newUid,
      id: newUid,
      username: (teacherData.username || loginInput).trim().toLowerCase(),
      email: formattedLoginEmail,
      role: 'teacher',
      avatarColor: teacherData.avatarColor || 'bg-indigo-600',
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', newUid), {
      ...newTeacher,
      createdAt: serverTimestamp()
    });
    setUsers((prev) => [...prev, newTeacher]);
    return newUid;
  };

  const updateTeacher = async (id: string, teacherData: Partial<User>): Promise<void> => {
    await updateDoc(doc(db, 'users', id), teacherData);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...teacherData } : u)));
  };

  const deleteTeacher = async (id: string): Promise<void> => {
    await updateDoc(doc(db, 'users', id), {
      status: 'inactive',
      isActive: false,
      updatedAt: serverTimestamp()
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: 'inactive', isActive: false } : u))
    );
  };

  // Notification methods
  const sendNotification = async (
    notifData: Omit<InternalNotification, 'id' | 'createdAt' | 'read' | 'readBy'>
  ): Promise<string> => {
    const id = `notif-${Date.now()}`;
    const newNotif: InternalNotification = {
      ...notifData,
      id,
      read: false,
      readBy: [],
      createdAt: new Date().toISOString()
    };

    setNotifications((prev) => [newNotif, ...prev]);
    try {
      await setDoc(doc(db, 'notifications', id), newNotif);

      // Trigger push notification via absolute API_BASE
      if (notifData.recipientId) {
        const apiBase = (typeof window !== 'undefined' && window.location?.origin && window.location.origin.startsWith('http'))
          ? window.location.origin
          : ((import.meta as any).env?.VITE_API_BASE_URL || 'https://ais-dev-g3246sj4v3smwahqwra5jh-1047176565098.asia-southeast1.run.app');
        await fetch(`${apiBase}/api/send-push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientUserId: notifData.recipientId,
            title: notifData.title || "🔔 New Request Received",
            body: notifData.message || `${notifData.senderName || 'Instructor'} sent you a request: ${notifData.title}`,
            data: { route: '/inbox' }
          })
        });
      }
    } catch (e) {
      console.warn('Firestore write or push dispatch notice for sendNotification:', e);
    }
    return id;
  };

  const markNotificationAsRead = async (id: string, userId?: string): Promise<void> => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const readBy = n.readBy ? [...n.readBy] : [];
        if (userId && !readBy.includes(userId)) {
          readBy.push(userId);
        }
        return { ...n, read: true, readBy };
      })
    );

    try {
      const current = notifications.find((n) => n.id === id);
      const readBy = current?.readBy ? [...current.readBy] : [];
      if (userId && !readBy.includes(userId)) {
        readBy.push(userId);
      }
      await setDoc(doc(db, 'notifications', id), { read: true, readBy }, { merge: true });
    } catch (e) {
      console.warn('Firestore update notice for markNotificationAsRead:', e);
    }
  };

  const updateNotificationStatus = async (
    notificationId: string,
    status: 'accepted' | 'declined' | 'read'
  ): Promise<void> => {
    const dbStatus = status === 'accepted' ? 'APPROVED' : status === 'declined' ? 'REJECTED' : 'READ';
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, status: dbStatus as any, read: true } : n))
    );
    try {
      await setDoc(doc(db, 'notifications', notificationId), { status: dbStatus, read: true }, { merge: true });
    } catch (e) {
      console.warn('Firestore update notice for updateNotificationStatus:', e);
      throw e;
    }
  };

  const resolveTeacherRequest = updateNotificationStatus;

  const markAllNotificationsAsRead = async (userId?: string): Promise<void> => {
    const targetUserId = userId || currentUser?.id;
    setNotifications((prev) =>
      prev.map((n) => {
        const isTarget = !targetUserId || n.recipientId === targetUserId || n.recipientId === 'GLOBAL' || n.recipientId === 'all_teachers' || n.recipientId === 'all' || n.recipientRole === 'all';
        if (!isTarget) return n;

        const readBy = n.readBy ? [...n.readBy] : [];
        if (targetUserId && !readBy.includes(targetUserId)) {
          readBy.push(targetUserId);
        }
        return { ...n, read: true, readBy };
      })
    );

    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        const isTarget = !targetUserId || n.recipientId === targetUserId || n.recipientId === 'GLOBAL' || n.recipientId === 'all_teachers' || n.recipientId === 'all' || n.recipientRole === 'all';
        if (!isTarget) return;

        const readBy = n.readBy ? [...n.readBy] : [];
        if (targetUserId && !readBy.includes(targetUserId)) {
          readBy.push(targetUserId);
        }
        const ref = doc(db, 'notifications', n.id);
        batch.set(ref, { read: true, readBy }, { merge: true });
      });
      await batch.commit();
    } catch (e) {
      console.warn('Firestore update notice for markAllNotificationsAsRead:', e);
      throw e;
    }
  };

  const approveTransferRequest = async (notificationId: string): Promise<void> => {
    const notif = notifications.find((n) => n.id === notificationId);
    if (!notif) return;
    if (notif.status && notif.status !== 'PENDING') return;

    const studentId = notif.studentId;
    const sourceGroupId = notif.sourceGroupId || notif.currentGroupId || notif.groupId;
    const targetGroupId = notif.targetGroupId;
    const requestingTeacherId = notif.requestingTeacherId || notif.senderId;
    const targetTeacherId = notif.targetTeacherId || notif.recipientId;

    const targetStudent = students.find((s) => s.id === studentId);
    const studentName =
      notif.studentName ||
      (targetStudent ? `${targetStudent.firstName} ${targetStudent.surname}` : 'Student');

    const sourceGroup = groups.find((g) => g.id === sourceGroupId);
    const targetGroup = groups.find((g) => g.id === targetGroupId);

    const sourceGroupName = sourceGroup?.name || notif.currentGroupName || 'Previous Cohort';
    const targetGroupName = targetGroup?.name || notif.targetGroupName || 'Target Cohort';

    const teacherAName = sourceGroup?.teacherName || currentUser?.name || 'Instructor';
    const teacherBName = targetGroup?.teacherName || notif.senderName || 'Instructor';

    // 1. Direct Transfer Execution: Update student's groupId to targetGroupId
    if (studentId && targetGroupId) {
      const updatePayload: Partial<Student> = {
        groupId: targetGroupId,
        previousGroupId: sourceGroupId || undefined,
        transferDate: new Date().toISOString(),
        status: 'active'
      };

      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, ...updatePayload } : s))
      );

      try {
        await setDoc(doc(db, 'students', studentId), updatePayload, { merge: true });
      } catch (e) {
        console.warn('Firestore update notice for student transfer:', e);
      }
    }

    // 2. Automatically log events in group_logs
    if (sourceGroupId) {
      await logGroupActivity({
        groupId: sourceGroupId,
        actorId: currentUser?.id || targetTeacherId || 'teacher',
        actorName: teacherAName,
        actionType: 'STUDENT_TRANSFERRED_OUT',
        description: `${studentName} transferred out to ${targetGroupName} (Teacher: ${teacherBName})`
      });
    }

    if (targetGroupId) {
      await logGroupActivity({
        groupId: targetGroupId,
        actorId: requestingTeacherId || 'teacher',
        actorName: teacherBName,
        actionType: 'STUDENT_TRANSFERRED_IN',
        description: `${studentName} transferred in from ${sourceGroupName} (Teacher: ${teacherAName})`
      });
    }

    // 3. Mark notification as approved
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, status: 'APPROVED', read: true } : n
      )
    );

    try {
      await setDoc(doc(db, 'notifications', notificationId), {
        status: 'APPROVED',
        read: true
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore update notice for notification approval:', e);
    }

    // 4. Send automated inbox notification to Teacher A (requesting teacher)
    if (requestingTeacherId) {
      await sendNotification({
        recipientId: requestingTeacherId,
        recipientRole: 'teacher',
        senderId: notif.recipientId || currentUser?.id || 'admin-1',
        senderName: teacherBName,
        senderRole: currentUser?.role || 'system',
        type: 'SYSTEM',
        title: 'Student Offer Accepted',
        message: `✅ ${teacherBName} accepted student ${studentName} into group ${targetGroupName}.`,
        studentId: studentId,
        studentName: studentName,
        targetGroupId: targetGroupId,
        targetGroupName: targetGroupName,
        status: 'APPROVED',
        priority: 'important'
      });
    }
  };

  const rejectTransferRequest = async (notificationId: string): Promise<void> => {
    const notif = notifications.find((n) => n.id === notificationId);
    if (!notif) return;

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, status: 'REJECTED', read: true } : n
      )
    );

    try {
      await setDoc(doc(db, 'notifications', notificationId), {
        status: 'REJECTED',
        read: true
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore update notice for notification rejection:', e);
    }

    const student = students.find((s) => s.id === notif.studentId);
    const studentName =
      notif.studentName ||
      (student ? `${student.firstName} ${student.surname}` : 'Student');
    const targetGroupName = notif.targetGroupName || notif.currentGroupName || 'the cohort';
    const rejectingTeacherName = currentUser?.name || 'Instructor';

    if (notif.senderId) {
      await sendNotification({
        recipientId: notif.senderId,
        recipientRole: 'teacher',
        senderId: notif.recipientId || currentUser?.id || 'admin-1',
        senderName: rejectingTeacherName,
        senderRole: currentUser?.role || 'system',
        type: 'SYSTEM',
        title: 'Student Offer Declined',
        message: `❌ ${rejectingTeacherName} declined the offer for student ${studentName} to join ${targetGroupName}.`,
        studentId: notif.studentId,
        studentName: studentName,
        status: 'REJECTED',
        priority: 'normal'
      });
    }
  };

  const publishAnnouncement = async (
    title: string,
    message: string,
    priority: 'normal' | 'important' | 'urgent' = 'normal'
  ): Promise<string> => {
    return await sendNotification({
      recipientId: 'GLOBAL',
      recipientRole: 'all',
      senderId: 'admin-broadcast',
      senderName: currentUser?.name || 'MuhammadIso Ermatov (Director)',
      senderRole: 'admin',
      type: 'ANNOUNCEMENT',
      title,
      message,
      priority,
      status: 'READ'
    });
  };

  const resetDatabaseToDefaults = async (): Promise<void> => {
    setLoading(true);
    setUsers(INITIAL_USERS);
    setGroups(INITIAL_GROUPS);
    setStudents(INITIAL_STUDENTS);
    setAttendanceRecords(INITIAL_ATTENDANCE);
    setNotifications(INITIAL_NOTIFICATIONS);
    setGroupActivityLogs(INITIAL_GROUP_ACTIVITY_LOGS);
    try {
      await seedInitialFirestoreData(db, true);
    } catch (e) {
      console.warn('Reset database notice:', e);
    }
    setLoading(false);
  };

  // Strictly active currently enrolled students in this group
  const getGroupStudents = useCallback((groupId: string): Student[] => {
    return students.filter((s) => s.groupId === groupId && s.status !== 'inactive');
  }, [students]);

  // Strictly records for this group
  const getGroupAttendanceRecords = useCallback((groupId: string): AttendanceRecord[] => {
    return attendanceRecords
      .filter((r) => r.groupId === groupId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceRecords]);

  // Strictly activity logs for this group
  const getGroupActivityLogs = useCallback((groupId: string): GroupActivityLog[] => {
    return groupActivityLogs
      .filter((l) => l.groupId === groupId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [groupActivityLogs]);

  // Dynamic Historical Retention on Monthly Sheets (Condition A, Condition B, Condition C)
  const getMonthlyAttendanceRoster = useCallback(
    (groupId: string, yearMonth: string): MonthlyRosterStudent[] => {
      const groupMonthRecords = attendanceRecords.filter(
        (r) => r.groupId === groupId && r.date.startsWith(yearMonth)
      );

      const rosterMap = new Map<string, MonthlyRosterStudent>();

      // Condition A: Display all students actively enrolled in the group
      students.forEach((student) => {
        if (student.groupId === groupId && student.status !== 'inactive') {
          rosterMap.set(student.id, {
            ...student,
            isHistoricalLeft: false
          });
        }
      });

      // Condition B: Display an unassigned or transferred student ONLY IF they have at least 1 attendance record in this group during that specific Month & Year
      students.forEach((student) => {
        if (student.groupId !== groupId || !student.groupId) {
          const matchingRecordsInMonth = groupMonthRecords.filter((r) => {
            const st = r.statusMap?.[student.id];
            return st === 'present' || st === 'absent' || st === 'late';
          });

          if (matchingRecordsInMonth.length > 0) {
            const dates = matchingRecordsInMonth.map((r) => r.date).sort();
            const lastDate = dates[dates.length - 1];

            rosterMap.set(student.id, {
              ...student,
              isHistoricalLeft: true,
              lastAttendanceDateInGroupInMonth: lastDate
            });
          }
        }
      });

      // Sort: Active students first alphabetically, then historical departed students
      return Array.from(rosterMap.values()).sort((a, b) => {
        if (a.isHistoricalLeft !== b.isHistoricalLeft) {
          return a.isHistoricalLeft ? 1 : -1;
        }
        return `${a.firstName} ${a.surname}`.localeCompare(`${b.firstName} ${b.surname}`);
      });
    },
    [students, attendanceRecords]
  );

  const getMonthlyLessonsCount = useCallback((groupId: string, yearMonth?: string): number => {
    const targetYM = yearMonth || new Date().toISOString().substring(0, 7);
    return attendanceRecords.filter(
      (r) => r.groupId === groupId && r.date.startsWith(targetYM)
    ).length;
  }, [attendanceRecords]);

  return (
    <DataContext.Provider
      value={{
        users,
        teachers,
        admins,
        groups,
        students,
        attendanceRecords,
        notifications,
        groupActivityLogs,
        salaryAdvances,
        studentPayments,
        loading,
        isOnline,
        addGroup,
        updateGroup,
        deleteGroup,
        archiveGroup,
        reassignTeacher,
        addStudent,
        updateStudent,
        transferStudent,
        removeStudentFromGroup,
        deleteStudent,
        saveAttendanceRecord,
        deleteAttendanceRecord,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addAdmin,
        migrateMissingStudentIds,
        sendNotification,
        markNotificationAsRead,
        updateNotificationStatus,
        resolveTeacherRequest,
        markAllNotificationsAsRead,
        approveTransferRequest,
        rejectTransferRequest,
        publishAnnouncement,
        logGroupActivity,
        addSalaryAdvance,
        updateSalaryAdvance,
        deleteSalaryAdvance,
        recordStudentPayment,
        deleteStudentPaymentInstallment,
        updateStudentMonthlyFee,
        resetDatabaseToDefaults,
        getGroupStudents,
        getGroupAttendanceRecords,
        getGroupActivityLogs,
        getMonthlyAttendanceRoster,
        getMonthlyLessonsCount
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
