export type UserRole = 'admin' | 'teacher';

export interface User {
  id: string;
  name: string;
  firstName?: string;
  surname?: string;
  email: string;
  role: UserRole;
  phone: string;
  title?: string;
  subject?: string;
  password?: string;
  avatarColor?: string;
  createdAt?: string;
}

export interface Group {
  id: string;
  name: string;
  schedule: string;
  teacherId: string;
  teacherName: string;
  archived?: boolean;
  createdAt?: string;
  level?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceStatusMap {
  [studentId: string]: AttendanceStatus;
}

export interface AttendanceMarksMap {
  [studentId: string]: number | string;
}

export interface AttendanceCommentsMap {
  [studentId: string]: string;
}

export interface AttendanceRecord {
  id: string;
  groupId: string;
  groupName?: string;
  teacherId: string;
  studentId?: string; // Explicit individual student tracking if scoped
  date: string; // YYYY-MM-DD
  lessonNumber?: number;
  records?: Array<{
    studentId: string;
    studentName: string;
    status: string;
  }>;
  statusMap: AttendanceStatusMap;
  marksMap?: AttendanceMarksMap;
  commentsMap?: AttendanceCommentsMap;
  topicCovered?: string;
  notes?: string;
  updatedAt?: string;
  createdAt?: string;
}

export type StudentStatus = 'active' | 'inactive' | 'transferred';

export interface Student {
  id: string;
  studentId?: string; // 5-digit unique ID (10000-99999)
  groupId: string | null;
  firstName: string;
  surname: string;
  parentPhone: string;
  birthDate?: string;
  notes?: string;
  enrolledDate: string;
  status?: StudentStatus;
  previousGroupId?: string;
  transferDate?: string;
  telegramChatId?: string;
  parentTelegramId?: string;
}

export interface AttendanceStats {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number; // Percentage (0-100)
}

export type NotificationType =
  | 'TRANSFER_REQUEST'
  | 'STUDENT_OFFER'
  | 'ANNOUNCEMENT'
  | 'SYSTEM'
  | 'transfer_request'
  | 'student_offer'
  | 'announcement'
  | 'system';

export type NotificationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'READ'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'read'
  | 'completed';

export interface InternalNotification {
  id: string;
  senderId: string; // ID of the teacher or admin who initiated it
  recipientId: string; // Specific teacher ID, or "GLOBAL" for admin broadcasts
  studentId?: string; // Optional, for transfer actions
  groupId?: string; // Optional group reference
  type: NotificationType;
  status?: NotificationStatus;
  createdAt: string; // Timestamp ISO string

  // Informative Display Metadata
  title: string;
  message: string;
  senderName?: string;
  senderRole?: UserRole | 'system';
  recipientRole?: 'admin' | 'teacher' | 'all';
  studentName?: string;
  targetGroupId?: string;
  targetGroupName?: string;
  sourceGroupId?: string;
  currentGroupId?: string;
  currentGroupName?: string;
  requestingTeacherId?: string;
  targetTeacherId?: string;
  priority?: 'normal' | 'important' | 'urgent';
  read?: boolean;
  readBy?: string[]; // Array of user IDs who marked read
}

export interface MonthlyRosterStudent extends Student {
  isHistoricalLeft?: boolean;
  lastAttendanceDateInGroupInMonth?: string;
}

export type GroupActivityActionType =
  | 'GROUP_CREATED'
  | 'TEACHER_ASSIGNED'
  | 'STUDENT_ENROLLED'
  | 'STUDENT_TRANSFERRED_IN'
  | 'STUDENT_REMOVED'
  | 'STUDENT_TRANSFERRED_OUT'
  | 'TRANSFER_APPROVED'
  | 'CUSTOM_NOTE';

export interface GroupActivityLog {
  id: string;
  groupId: string;
  actorId: string; // ID of the teacher or admin who performed the action
  actorName: string;
  actionType: GroupActivityActionType;
  description: string; // e.g., "Assigned Teacher [Name] to cohort", "Enrolled student [Name]", "Approved transfer request for [Name] to [Target Group]"
  timestamp: string; // ISO timestamp string
}

