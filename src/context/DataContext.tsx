import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  Group,
  Student,
  AttendanceRecord,
  InternalNotification,
  MonthlyRosterStudent,
  GroupActivityLog
} from '../types';
import { db } from '../firebase.config';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  getDocs
} from 'firebase/firestore';
import {
  INITIAL_USERS,
  INITIAL_GROUPS,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_NOTIFICATIONS,
  INITIAL_GROUP_ACTIVITY_LOGS,
  seedInitialFirestoreData
} from '../lib/seedData';
import { useAuth } from './AuthContext';
import { generateUniqueStudentId } from '../utils/studentId';
import { sendTelegramMessage } from '../services/telegram';

interface DataContextType {
  users: User[];
  teachers: User[];
  groups: Group[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  notifications: InternalNotification[];
  groupActivityLogs: GroupActivityLog[];
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
  migrateMissingStudentIds: () => Promise<number>;
  sendNotification: (notif: Omit<InternalNotification, 'id' | 'createdAt' | 'read' | 'readBy'>) => Promise<string>;
  markNotificationAsRead: (id: string, userId?: string) => Promise<void>;
  markAllNotificationsAsRead: (userId?: string) => Promise<void>;
  approveTransferRequest: (notificationId: string) => Promise<void>;
  rejectTransferRequest: (notificationId: string) => Promise<void>;
  publishAnnouncement: (title: string, message: string, priority?: 'normal' | 'important' | 'urgent') => Promise<string>;
  logGroupActivity: (activity: Omit<GroupActivityLog, 'id' | 'timestamp'> & { timestamp?: string }) => Promise<string>;
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
                if (u.id === 'admin-1' || u.role === 'admin' || (u.name && u.name.includes('Sarah'))) {
                  u = {
                    ...u,
                    name: 'MuhammadIso Ermatov',
                    firstName: 'MuhammadIso',
                    surname: 'Ermatov',
                    title: 'Director',
                    role: 'admin'
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
          }
        );

        // 4. Live Sync: attendance collections (attendance_records, attendance, sessions)
        const handleAttendanceSnapshot = (snapshot: any) => {
          const itemsMap = new Map<string, AttendanceRecord>();
          snapshot.forEach((d: any) => {
            itemsMap.set(d.id, { id: d.id, ...(d.data() as Omit<AttendanceRecord, 'id'>) });
          });
          setAttendanceRecords(Array.from(itemsMap.values()));
        };
        unsubscribeAttendance = onSnapshot(query(collection(db, 'attendance_records')), handleAttendanceSnapshot);
        unsubscribeAttendance2 = onSnapshot(query(collection(db, 'attendance')), handleAttendanceSnapshot);
        unsubscribeSessions = onSnapshot(query(collection(db, 'sessions')), handleAttendanceSnapshot);

        // 5. Live Sync: notifications collection (real-time Inbox)
        unsubscribeNotifications = onSnapshot(
          query(collection(db, 'notifications')),
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

        // 6. Live Sync: group_logs collection (real-time Group Archive)
        unsubscribeLogs = onSnapshot(
          query(collection(db, 'group_logs')),
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
      unsubscribeAttendance2();
      unsubscribeSessions();
      unsubscribeNotifications();
      unsubscribeLogs();
    };
  }, []);

  const teachers = users.filter((u) => u.role === 'teacher');

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

    setGroups((prev) => [...prev, newGroup]);
    try {
      await setDoc(doc(db, 'groups', id), newGroup);
    } catch (e) {
      console.warn('Firestore write notice for addGroup:', e);
    }

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
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...groupData } : g)));
    try {
      await updateDoc(doc(db, 'groups', id), groupData);
    } catch (e) {
      console.warn('Firestore write notice for updateGroup:', e);
    }

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

    setStudents((prev) =>
      prev.map((s) =>
        s.groupId === groupId
          ? { ...s, groupId: null, previousGroupId: groupId, status: 'active' }
          : s
      )
    );

    for (const student of affectedStudents) {
      try {
        await updateDoc(doc(db, 'students', student.id), {
          groupId: null,
          previousGroupId: groupId,
          status: 'active'
        });
      } catch (e) {
        console.warn(`Firestore update notice for student ${student.id}:`, e);
      }
    }

    // 2. Delete group from local state
    setGroups((prev) => prev.filter((g) => g.id !== groupId));

    // 3. Delete group from Firestore
    try {
      await deleteDoc(doc(db, 'groups', groupId));
    } catch (e) {
      console.warn(`Firestore delete notice for group ${groupId}:`, e);
    }
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

    setStudents((prev) => [...prev, newStudent]);
    try {
      await setDoc(doc(db, 'students', id), newStudent);
    } catch (e) {
      console.warn('Firestore write notice for addStudent:', e);
    }

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
      setStudents(updatedStudents);
      for (const s of updatedStudents) {
        try {
          await updateDoc(doc(db, 'students', s.id), { studentId: s.studentId });
        } catch (e) {
          console.warn('Firestore migration notice for student:', s.id, e);
        }
      }
    }
    return count;
  };

  const updateStudent = async (id: string, studentData: Partial<Student>): Promise<void> => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...studentData } : s)));
    try {
      await updateDoc(doc(db, 'students', id), studentData);
    } catch (e) {
      console.warn('Firestore write notice for updateStudent:', e);
    }
  };

  const transferStudent = async (studentId: string, newGroupId: string | null): Promise<void> => {
    const targetStudent = students.find((s) => s.id === studentId);
    const previousGroupId = targetStudent?.groupId || undefined;
    const prevGroup = groups.find((g) => g.id === previousGroupId);
    const newGroup = groups.find((g) => g.id === newGroupId);
    const studentName = targetStudent ? `${targetStudent.firstName} ${targetStudent.surname}` : 'Student';

    const updatePayload: Partial<Student> = {
      previousGroupId: previousGroupId,
      groupId: newGroupId,
      transferDate: new Date().toISOString(),
      status: 'active'
    };

    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, ...updatePayload } : s)));
    try {
      await updateDoc(doc(db, 'students', studentId), updatePayload);
    } catch (e) {
      console.warn('Firestore write notice for transferStudent:', e);
    }

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
    setStudents((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (e) {
      console.warn('Firestore delete notice for deleteStudent:', e);
    }
  };

  const saveAttendanceRecord = async (
    record: Omit<AttendanceRecord, 'id' | 'createdAt'> & { id?: string }
  ): Promise<string> => {
    const existing = attendanceRecords.find(
      (r) => r.groupId === record.groupId && r.date === record.date
    );

    const recordId = record.id || existing?.id || `att-${Date.now()}`;
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
      date: record.date || new Date().toISOString(),
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

    setAttendanceRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === recordId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = sanitizedPayload;
        return next;
      }
      return [...prev, sanitizedPayload];
    });

    try {
      await setDoc(doc(db, 'attendance', recordId), sanitizedPayload);
      await setDoc(doc(db, 'attendance_records', recordId), sanitizedPayload);
      await setDoc(doc(db, 'sessions', recordId), sanitizedPayload);

      // Trigger Telegram notifications for students with telegramChatId / parentTelegramId
      const dateStr = sanitizedPayload.date;
      const statusMap = sanitizedPayload.statusMap || {};
      const commentsMap = sanitizedPayload.commentsMap || {};

      for (const [studentId, status] of Object.entries(statusMap)) {
        const student = students.find((s) => s.id === studentId);
        if (student && (student.telegramChatId || student.parentTelegramId)) {
          const chatId = student.telegramChatId || student.parentTelegramId;
          const statusText = status === 'present' ? '✅ Present' : status === 'late' ? '⚠️ Kechikib keldi (Late)' : '❌ Absent';
          const comment = commentsMap[studentId] || '';
          const studentName = `${student.firstName} ${student.surname}`;
          const text = `🔔 <b>Open World Academy — Attendance Update</b>\n\n<b>Student:</b> ${studentName}\n<b>Date:</b> ${dateStr}\n<b>Status:</b> ${statusText}\n${comment ? `<b>Note:</b> ${comment}` : ''}`;
          
          sendTelegramMessage(chatId, text).catch((err) => {
            console.error('Failed to send Telegram message:', err);
          });
        }
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
    }
    return recordId;
  };

  const deleteAttendanceRecord = async (id: string): Promise<void> => {
    setAttendanceRecords((prev) => prev.filter((r) => r.id !== id));
    try {
      await deleteDoc(doc(db, 'attendance_records', id));
    } catch (e) {
      console.warn('Firestore delete notice for deleteAttendanceRecord:', e);
    }
  };

  const addTeacher = async (teacherData: Omit<User, 'id' | 'createdAt'>): Promise<string> => {
    const id = `teacher-${Date.now()}`;
    const newTeacher: User = {
      ...teacherData,
      id,
      role: 'teacher',
      avatarColor: teacherData.avatarColor || 'bg-indigo-600',
      createdAt: new Date().toISOString()
    };

    setUsers((prev) => [...prev, newTeacher]);
    try {
      await setDoc(doc(db, 'users', id), newTeacher);
    } catch (e) {
      console.warn('Firestore write notice for addTeacher:', e);
    }
    return id;
  };

  const updateTeacher = async (id: string, teacherData: Partial<User>): Promise<void> => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...teacherData } : u)));
    try {
      await updateDoc(doc(db, 'users', id), teacherData);
    } catch (e) {
      console.warn('Firestore write notice for updateTeacher:', e);
    }
  };

  const deleteTeacher = async (id: string): Promise<void> => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (e) {
      console.warn('Firestore delete notice for deleteTeacher:', e);
    }
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
    } catch (e) {
      console.warn('Firestore write notice for sendNotification:', e);
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

  const markAllNotificationsAsRead = async (userId?: string): Promise<void> => {
    setNotifications((prev) =>
      prev.map((n) => {
        const readBy = n.readBy ? [...n.readBy] : [];
        if (userId && !readBy.includes(userId)) {
          readBy.push(userId);
        }
        return { ...n, read: true, readBy };
      })
    );

    try {
      notifications.forEach(async (n) => {
        const readBy = n.readBy ? [...n.readBy] : [];
        if (userId && !readBy.includes(userId)) {
          readBy.push(userId);
        }
        await setDoc(doc(db, 'notifications', n.id), { read: true, readBy }, { merge: true });
      });
    } catch (e) {
      console.warn('Firestore update notice for markAllNotificationsAsRead:', e);
    }
  };

  const approveTransferRequest = async (notificationId: string): Promise<void> => {
    const notif = notifications.find((n) => n.id === notificationId);
    if (!notif) return;

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
            return st === 'present' || st === 'absent';
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
        groups,
        students,
        attendanceRecords,
        notifications,
        groupActivityLogs,
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
        migrateMissingStudentIds,
        sendNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        approveTransferRequest,
        rejectTransferRequest,
        publishAnnouncement,
        logGroupActivity,
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
