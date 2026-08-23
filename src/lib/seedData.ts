import { User, Group, Student, AttendanceRecord, InternalNotification, GroupActivityLog } from '../types';
import { Firestore, collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';

export const INITIAL_GROUP_ACTIVITY_LOGS: GroupActivityLog[] = [
  // Group 1: IELTS Mastery 7.5+
  {
    id: 'log-101',
    groupId: 'group-1',
    actorId: 'admin-1',
    actorName: 'MuhammadIso Ermatov (Director)',
    actionType: 'GROUP_CREATED',
    description: 'Created cohort "IELTS Mastery 7.5+" with schedule Mon/Wed/Fri 10:00 AM - 11:30 AM',
    timestamp: '2026-02-01T08:00:00.000Z'
  },
  {
    id: 'log-102',
    groupId: 'group-1',
    actorId: 'admin-1',
    actorName: 'MuhammadIso Ermatov (Director)',
    actionType: 'TEACHER_ASSIGNED',
    description: 'Assigned Instructor Alex Rivera to cohort',
    timestamp: '2026-02-01T08:05:00.000Z'
  },
  {
    id: 'log-103',
    groupId: 'group-1',
    actorId: 'teacher-1',
    actorName: 'Alex Rivera',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Daniel Kim into cohort',
    timestamp: '2026-02-01T09:15:00.000Z'
  },
  {
    id: 'log-104',
    groupId: 'group-1',
    actorId: 'teacher-1',
    actorName: 'Alex Rivera',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Sophia Martinez into cohort',
    timestamp: '2026-02-01T09:20:00.000Z'
  },
  {
    id: 'log-105',
    groupId: 'group-1',
    actorId: 'teacher-1',
    actorName: 'Alex Rivera',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Arjun Patel into cohort',
    timestamp: '2026-02-02T10:00:00.000Z'
  },
  {
    id: 'log-106',
    groupId: 'group-1',
    actorId: 'teacher-1',
    actorName: 'Alex Rivera',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Emma Wilson into cohort',
    timestamp: '2026-02-03T11:30:00.000Z'
  },
  {
    id: 'log-107',
    groupId: 'group-1',
    actorId: 'teacher-1',
    actorName: 'Alex Rivera',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Liam Chen into cohort',
    timestamp: '2026-02-05T14:00:00.000Z'
  },
  {
    id: 'log-108',
    groupId: 'group-1',
    actorId: 'teacher-1',
    actorName: 'Alex Rivera',
    actionType: 'CUSTOM_NOTE',
    description: 'Completed Mid-Term IELTS Listening and Task 2 Essay diagnostics with class average of 7.2 band',
    timestamp: '2026-08-18T12:00:00.000Z'
  },
  {
    id: 'log-109',
    groupId: 'group-1',
    actorId: 'teacher-1',
    actorName: 'Alex Rivera',
    actionType: 'CUSTOM_NOTE',
    description: 'Submitted weekly lesson logs and performance marks for speaking drills',
    timestamp: '2026-08-20T16:45:00.000Z'
  },

  // Group 2: General English B2
  {
    id: 'log-201',
    groupId: 'group-2',
    actorId: 'admin-1',
    actorName: 'MuhammadIso Ermatov (Director)',
    actionType: 'GROUP_CREATED',
    description: 'Created cohort "General English B2" with schedule Tue/Thu 04:00 PM - 06:00 PM',
    timestamp: '2026-02-05T09:00:00.000Z'
  },
  {
    id: 'log-202',
    groupId: 'group-2',
    actorId: 'admin-1',
    actorName: 'MuhammadIso Ermatov (Director)',
    actionType: 'TEACHER_ASSIGNED',
    description: 'Assigned Instructor Alex Rivera to cohort',
    timestamp: '2026-02-05T09:10:00.000Z'
  },
  {
    id: 'log-203',
    groupId: 'group-2',
    actorId: 'teacher-1',
    actorName: 'Alex Rivera',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Mia Johnson into cohort',
    timestamp: '2026-02-05T10:00:00.000Z'
  },
  {
    id: 'log-204',
    groupId: 'group-2',
    actorId: 'teacher-1',
    actorName: 'Alex Rivera',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Lucas Silva into cohort',
    timestamp: '2026-02-06T11:00:00.000Z'
  },
  {
    id: 'log-205',
    groupId: 'group-2',
    actorId: 'teacher-1',
    actorName: 'Alex Rivera',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Zoe Kowalski into cohort',
    timestamp: '2026-02-07T14:30:00.000Z'
  },
  {
    id: 'log-206',
    groupId: 'group-2',
    actorId: 'teacher-1',
    actorName: 'Alex Rivera',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Noah Gomez into cohort',
    timestamp: '2026-02-08T09:00:00.000Z'
  },
  {
    id: 'log-207',
    groupId: 'group-2',
    actorId: 'teacher-1',
    actorName: 'Alex Rivera',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Chloe Dupont into cohort',
    timestamp: '2026-02-08T09:30:00.000Z'
  },
  {
    id: 'log-208',
    groupId: 'group-2',
    actorId: 'teacher-1',
    actorName: 'Alex Rivera',
    actionType: 'CUSTOM_NOTE',
    description: 'Grammar review on relative clauses completed with full attendance',
    timestamp: '2026-08-19T17:00:00.000Z'
  },

  // Group 3: Young Pioneers STEM Math
  {
    id: 'log-301',
    groupId: 'group-3',
    actorId: 'admin-1',
    actorName: 'MuhammadIso Ermatov (Director)',
    actionType: 'GROUP_CREATED',
    description: 'Created cohort "Young Pioneers STEM Math" with schedule Mon/Wed/Fri 03:30 PM - 05:00 PM',
    timestamp: '2026-02-10T10:00:00.000Z'
  },
  {
    id: 'log-302',
    groupId: 'group-3',
    actorId: 'admin-1',
    actorName: 'MuhammadIso Ermatov (Director)',
    actionType: 'TEACHER_ASSIGNED',
    description: 'Assigned Instructor Elena Rostova to cohort',
    timestamp: '2026-02-10T10:05:00.000Z'
  },
  {
    id: 'log-303',
    groupId: 'group-3',
    actorId: 'teacher-2',
    actorName: 'Elena Rostova',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Ethan Brooks into cohort',
    timestamp: '2026-02-10T11:00:00.000Z'
  },
  {
    id: 'log-304',
    groupId: 'group-3',
    actorId: 'teacher-2',
    actorName: 'Elena Rostova',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Ava Tanaka into cohort',
    timestamp: '2026-02-10T11:15:00.000Z'
  },
  {
    id: 'log-305',
    groupId: 'group-3',
    actorId: 'teacher-2',
    actorName: 'Elena Rostova',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Olivia Wright into cohort',
    timestamp: '2026-02-11T14:00:00.000Z'
  },
  {
    id: 'log-306',
    groupId: 'group-3',
    actorId: 'teacher-2',
    actorName: 'Elena Rostova',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Gabriel Rossi into cohort',
    timestamp: '2026-02-12T15:20:00.000Z'
  },
  {
    id: 'log-307',
    groupId: 'group-3',
    actorId: 'teacher-2',
    actorName: 'Elena Rostova',
    actionType: 'STUDENT_ENROLLED',
    description: 'Enrolled student Maya Patel into cohort',
    timestamp: '2026-02-15T09:40:00.000Z'
  },
  {
    id: 'log-308',
    groupId: 'group-3',
    actorId: 'teacher-2',
    actorName: 'Elena Rostova',
    actionType: 'CUSTOM_NOTE',
    description: 'Applied robotics logic session conducted in Lab 4 with 100% active project completion',
    timestamp: '2026-08-20T11:00:00.000Z'
  }
];

export const INITIAL_NOTIFICATIONS: InternalNotification[] = [
  {
    id: 'notif-1',
    recipientId: 'GLOBAL',
    recipientRole: 'all',
    senderId: 'admin-1',
    senderName: 'MuhammadIso Ermatov (Director)',
    senderRole: 'admin',
    type: 'ANNOUNCEMENT',
    status: 'READ',
    title: 'Center-Wide IELTS Mock Examination Schedule',
    message: 'All instructors please note: Monthly IELTS and STEM diagnostic mock tests are scheduled for the final Saturday of this month. Please ensure all student attendance logs and mid-term marks are submitted by Friday evening.',
    priority: 'important',
    read: false,
    readBy: [],
    createdAt: '2026-08-18T09:00:00.000Z'
  },
  {
    id: 'notif-2',
    recipientId: 'teacher-1',
    recipientRole: 'teacher',
    senderId: 'teacher-2',
    senderName: 'Elena Rostova',
    senderRole: 'teacher',
    type: 'TRANSFER_REQUEST',
    title: 'Student Transfer Request',
    message: 'Elena Rostova requests to transfer Sophia Martinez from IELTS Mastery 7.5+ into Young Pioneers STEM Math.',
    studentId: 'student-102',
    studentName: 'Sophia Martinez',
    groupId: 'group-1',
    sourceGroupId: 'group-1',
    currentGroupId: 'group-1',
    currentGroupName: 'IELTS Mastery 7.5+',
    targetGroupId: 'group-3',
    targetGroupName: 'Young Pioneers STEM Math',
    requestingTeacherId: 'teacher-2',
    targetTeacherId: 'teacher-1',
    status: 'PENDING',
    priority: 'important',
    read: false,
    readBy: [],
    createdAt: '2026-08-19T14:20:00.000Z'
  },
  {
    id: 'notif-3',
    recipientId: 'teacher-2',
    recipientRole: 'teacher',
    senderId: 'admin-1',
    senderName: 'MuhammadIso Ermatov (Director)',
    senderRole: 'admin',
    type: 'SYSTEM',
    status: 'READ',
    title: 'STEM Curriculum Room Assignment',
    message: 'Young Pioneers STEM Math will be conducted in Lab 4 starting next Monday. Please review room key distribution.',
    priority: 'normal',
    read: false,
    readBy: [],
    createdAt: '2026-08-20T10:15:00.000Z'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'admin-1',
    name: 'MuhammadIso Ermatov',
    firstName: 'MuhammadIso',
    surname: 'Ermatov',
    email: 'admin@center.com',
    password: 'admin123',
    role: 'admin',
    phone: '+998 90 123 4567',
    title: 'Director',
    subject: 'Center Administration & Academic Direction',
    avatarColor: 'bg-indigo-600',
    createdAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'teacher-1',
    name: 'Alex Rivera',
    firstName: 'Alex',
    surname: 'Rivera',
    email: 'alex.rivera@openworld.edu',
    password: 'teacher123',
    role: 'teacher',
    phone: '+998 91 234 5678',
    title: 'Mr.',
    subject: 'English & IELTS',
    avatarColor: 'bg-indigo-500',
    createdAt: '2026-01-15T09:00:00.000Z'
  },
  {
    id: 'teacher-2',
    name: 'Elena Rostova',
    firstName: 'Elena',
    surname: 'Rostova',
    email: 'elena.rostova@openworld.edu',
    password: 'teacher123',
    role: 'teacher',
    phone: '+998 93 345 6789',
    title: 'Ms.',
    subject: 'STEM & Mathematics',
    avatarColor: 'bg-indigo-700',
    createdAt: '2026-02-01T10:00:00.000Z'
  }
];

export const INITIAL_GROUPS: Group[] = [
  {
    id: 'group-1',
    name: 'IELTS Mastery 7.5+',
    schedule: 'Mon/Wed/Fri 10:00 AM - 11:30 AM',
    teacherId: 'teacher-1',
    teacherName: 'Alex Rivera',
    archived: false,
    createdAt: '2026-02-01T08:00:00.000Z'
  },
  {
    id: 'group-2',
    name: 'General English B2',
    schedule: 'Tue/Thu 04:00 PM - 06:00 PM',
    teacherId: 'teacher-1',
    teacherName: 'Alex Rivera',
    archived: false,
    createdAt: '2026-02-05T09:00:00.000Z'
  },
  {
    id: 'group-3',
    name: 'Young Pioneers STEM Math',
    schedule: 'Mon/Wed/Fri 03:30 PM - 05:00 PM',
    teacherId: 'teacher-2',
    teacherName: 'Elena Rostova',
    archived: false,
    createdAt: '2026-02-10T10:00:00.000Z'
  }
];

export const INITIAL_STUDENTS: Student[] = [
  // Group 1: IELTS Mastery (5 students)
  {
    id: 'student-101',
    groupId: 'group-1',
    firstName: 'Daniel',
    surname: 'Kim',
    parentPhone: '+998 90 901 2345',
    birthDate: '2008-04-12',
    notes: 'Aiming for 8.0 in Speaking. Great academic vocabulary.',
    enrolledDate: '2026-02-01',
    status: 'active'
  },
  {
    id: 'student-102',
    groupId: 'group-1',
    firstName: 'Sophia',
    surname: 'Martinez',
    parentPhone: '+998 91 902 3456',
    birthDate: '2007-11-20',
    notes: 'Needs extra practice on Task 1 graph summaries.',
    enrolledDate: '2026-02-01',
    status: 'active'
  },
  {
    id: 'student-103',
    groupId: 'group-1',
    firstName: 'Arjun',
    surname: 'Patel',
    parentPhone: '+998 93 903 4567',
    birthDate: '2008-01-15',
    notes: 'Strong reading score (8.5 mock). Target university in UK.',
    enrolledDate: '2026-02-02',
    status: 'active'
  },
  {
    id: 'student-104',
    groupId: 'group-1',
    firstName: 'Emma',
    surname: 'Wilson',
    parentPhone: '+998 94 904 5678',
    birthDate: '2008-09-08',
    notes: 'Very communicative. Parent requested monthly progress report.',
    enrolledDate: '2026-02-03',
    status: 'active'
  },
  {
    id: 'student-105',
    groupId: 'group-1',
    firstName: 'Liam',
    surname: 'Chen',
    parentPhone: '+998 97 905 6789',
    birthDate: '2007-06-30',
    notes: 'Excellent grammar fundamentals.',
    enrolledDate: '2026-02-05',
    status: 'active'
  },

  // Group 2: General English B2 (5 students)
  {
    id: 'student-201',
    groupId: 'group-2',
    firstName: 'Mia',
    surname: 'Johnson',
    parentPhone: '+998 90 801 1122',
    birthDate: '2009-03-14',
    notes: 'High participation during conversation circles.',
    enrolledDate: '2026-02-05',
    status: 'active'
  },
  {
    id: 'student-202',
    groupId: 'group-2',
    firstName: 'Lucas',
    surname: 'Silva',
    parentPhone: '+998 91 802 2233',
    birthDate: '2009-12-05',
    notes: 'Improving phrasal verbs usage.',
    enrolledDate: '2026-02-06',
    status: 'active'
  },
  {
    id: 'student-203',
    groupId: 'group-2',
    firstName: 'Zoe',
    surname: 'Kowalski',
    parentPhone: '+998 93 803 3344',
    birthDate: '2010-02-18',
    notes: 'Fast learner, transferred from B1 with honors.',
    enrolledDate: '2026-02-07',
    status: 'active'
  },
  {
    id: 'student-204',
    groupId: 'group-2',
    firstName: 'Noah',
    surname: 'Gomez',
    parentPhone: '+998 95 804 4455',
    birthDate: '2009-07-22',
    notes: 'Arrives early for vocabulary warm-ups.',
    enrolledDate: '2026-02-08',
    status: 'active'
  },
  {
    id: 'student-205',
    groupId: 'group-2',
    firstName: 'Chloe',
    surname: 'Dupont',
    parentPhone: '+998 97 805 5566',
    birthDate: '2009-10-10',
    notes: 'Excels in listening comprehension drills.',
    enrolledDate: '2026-02-08',
    status: 'active'
  },

  // Group 3: Young Pioneers STEM Math (5 students)
  {
    id: 'student-301',
    groupId: 'group-3',
    firstName: 'Ethan',
    surname: 'Zhao',
    parentPhone: '+998 90 701 9988',
    birthDate: '2011-05-19',
    notes: 'Top scorer in AMC 8 mock contest.',
    enrolledDate: '2026-02-10',
    status: 'active'
  },
  {
    id: 'student-302',
    groupId: 'group-3',
    firstName: 'Maya',
    surname: 'Al-Mansoor',
    parentPhone: '+998 91 702 8877',
    birthDate: '2011-08-25',
    notes: 'Passionate about number theory and geometry proofs.',
    enrolledDate: '2026-02-10',
    status: 'active'
  },
  {
    id: 'student-303',
    groupId: 'group-3',
    firstName: 'Oliver',
    surname: 'Nygard',
    parentPhone: '+998 93 703 7766',
    birthDate: '2012-01-03',
    notes: 'Gifted algebra intuition.',
    enrolledDate: '2026-02-11',
    status: 'active'
  },
  {
    id: 'student-304',
    groupId: 'group-3',
    firstName: 'Aria',
    surname: 'Takahashi',
    parentPhone: '+998 94 704 6655',
    birthDate: '2011-11-14',
    notes: 'Very meticulous in problem-solving steps.',
    enrolledDate: '2026-02-12',
    status: 'active'
  },
  {
    id: 'student-305',
    groupId: 'group-3',
    firstName: 'Benjamin',
    surname: 'Becker',
    parentPhone: '+998 98 705 5544',
    birthDate: '2012-04-01',
    notes: 'Loves robotics logic and combinatorial puzzles.',
    enrolledDate: '2026-02-12',
    status: 'active'
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-101',
    groupId: 'group-1',
    teacherId: 'teacher-1',
    date: '2026-08-15',
    topicCovered: 'IELTS Academic Writing Task 2 - Thesis Formulation & Body Cohesion',
    notes: 'Mock essays collected for grading. High focus.',
    statusMap: {
      'student-101': 'present',
      'student-102': 'present',
      'student-103': 'present',
      'student-104': 'present',
      'student-105': 'present'
    },
    marksMap: {
      'student-101': 90,
      'student-102': 85,
      'student-103': 95,
      'student-104': 78,
      'student-105': 88
    },
    commentsMap: {
      'student-101': 'Did excellent thesis formulation in practice essay.',
      'student-102': 'Solid progress on coherence, needs paragraph linkers.',
      'student-103': 'Outstanding argument development and vocabulary.',
      'student-104': 'Joined late, completed introductory paragraph.',
      'student-105': 'Very good essay structure and grammar accuracy.'
    },
    createdAt: '2026-08-15T11:35:00.000Z'
  },
  {
    id: 'att-102',
    groupId: 'group-1',
    teacherId: 'teacher-1',
    date: '2026-08-18',
    topicCovered: 'Full Speaking Mock Test (Part 1, 2, 3) & Fluency Diagnostics',
    notes: 'Assigned audio recording homework due Friday.',
    statusMap: {
      'student-101': 'present',
      'student-102': 'absent',
      'student-103': 'present',
      'student-104': 'present',
      'student-105': 'absent'
    },
    marksMap: {
      'student-101': 92,
      'student-102': 0,
      'student-103': 96,
      'student-104': 82,
      'student-105': 0
    },
    commentsMap: {
      'student-101': 'Demonstrated Band 8.0 speaking fluency and idioms.',
      'student-102': 'Absent from speaking test; makeup session scheduled.',
      'student-103': 'Flawless pronunciation and topic expansion.',
      'student-104': 'Good effort on Part 2 cue card, work on pacing.',
      'student-105': 'Excused absence; needs to submit recorded audio.'
    },
    createdAt: '2026-08-18T11:30:00.000Z'
  },
  {
    id: 'att-201',
    groupId: 'group-2',
    teacherId: 'teacher-1',
    date: '2026-08-14',
    topicCovered: 'Conditionals in Context (Zero, 1st, 2nd & Mixed Clauses)',
    notes: 'Interactive pair debate on environmental solutions.',
    statusMap: {
      'student-201': 'present',
      'student-202': 'present',
      'student-203': 'present',
      'student-204': 'present',
      'student-205': 'present'
    },
    marksMap: {
      'student-201': 88,
      'student-202': 84,
      'student-203': 95,
      'student-204': 80,
      'student-205': 75
    },
    commentsMap: {
      'student-201': 'Great debate participation using 2nd conditionals.',
      'student-202': 'Completed workbook exercises accurately.',
      'student-203': 'Perfect score on mixed conditional quiz.',
      'student-204': 'Good effort; review third conditional formula.',
      'student-205': 'Incomplete homework, completed in class.'
    },
    createdAt: '2026-08-14T18:05:00.000Z'
  },
  {
    id: 'att-301',
    groupId: 'group-3',
    teacherId: 'teacher-2',
    date: '2026-08-16',
    topicCovered: 'Modular Arithmetic and Prime Factorization in Olympiad Competitions',
    notes: 'Students tackled 12 hard problems. Group competition.',
    statusMap: {
      'student-301': 'present',
      'student-302': 'present',
      'student-303': 'present',
      'student-304': 'present',
      'student-305': 'present'
    },
    marksMap: {
      'student-301': 100,
      'student-302': 94,
      'student-303': 98,
      'student-304': 92,
      'student-305': 90
    },
    commentsMap: {
      'student-301': 'Solved all 12 Olympiad problems flawlessly.',
      'student-302': 'Exceptional logic in prime factorization proof.',
      'student-303': 'Top speed in modular arithmetic challenge.',
      'student-304': 'Very neat analytical write-up.',
      'student-305': 'Great teamwork during group problem set.'
    },
    createdAt: '2026-08-16T17:05:00.000Z'
  }
];

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

    // 2. Groups (starts empty as requested)
    // INITIAL_GROUPS.forEach((group) => {
    //   const groupRef = doc(db, 'groups', group.id);
    //   batch.set(groupRef, group);
    // });

    // 3. Students (starts empty as requested)
    // INITIAL_STUDENTS.forEach((student) => {
    //   const studentRef = doc(db, 'students', student.id);
    //   batch.set(studentRef, student);
    // });

    // 4. Attendance (starts empty as requested)
    // INITIAL_ATTENDANCE.forEach((record) => {
    //   const attRef = doc(db, 'attendance_records', record.id);
    //   batch.set(attRef, record);
    // });

    // 5. Notifications (starts empty as requested)
    // INITIAL_NOTIFICATIONS.forEach((notif) => {
    //   const notifRef = doc(db, 'notifications', notif.id);
    //   batch.set(notifRef, notif);
    // });

    // 6. Group Activity Logs (group_logs)
    INITIAL_GROUP_ACTIVITY_LOGS.forEach((log) => {
      const logRef = doc(db, 'group_logs', log.id);
      batch.set(logRef, log);
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error seeding initial Firestore data:', error);
    return false;
  }
}
