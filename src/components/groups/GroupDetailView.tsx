import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Student,
  AttendanceStatus,
  AttendanceStatusMap,
  AttendanceMarksMap,
  AttendanceCommentsMap
} from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { StudentModal } from '../students/StudentModal';
import { AddExistingStudentModal } from '../students/AddExistingStudentModal';
import { RemoveStudentFromGroupModal } from '../students/RemoveStudentFromGroupModal';
import { OfferStudentModal } from '../students/OfferStudentModal';
import { NotifyParentsModal } from '../attendance/NotifyParentsModal';
import { StudentProfileDrawer } from '../students/StudentProfileDrawer';
import { GroupModal } from './GroupModal';
import { MonthlyAttendanceSheet } from './MonthlyAttendanceSheet';
import { GroupArchiveTab } from './GroupArchiveTab';
import { createSmsUri } from '../../lib/sms';
import confetti from 'canvas-confetti';
import { AnimatedCounter } from '../common/AnimatedCounter';
import {
  ArrowLeft,
  Calendar,
  Clock,
  UserCheck,
  Users,
  CheckCircle2,
  XCircle,
  Save,
  MessageSquare,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  CalendarCheck2,
  History,
  Check,
  Award,
  MessageCircle,
  Send,
  CalendarDays,
  Archive
} from 'lucide-react';

interface GroupDetailViewProps {
  groupId: string;
  onBack: () => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({ groupId, onBack }) => {
  const {
    groups,
    students,
    attendanceRecords,
    groupActivityLogs,
    saveAttendanceRecord,
    removeStudentFromGroup
  } = useData();
  const { isAdmin, currentUser } = useAuth();

  const group = groups.find((g) => g.id === groupId);

  // Active view tab: 'register' | 'monthly' | 'roster' | 'history' | 'archive'
  const [activeTab, setActiveTab] = useState<'register' | 'monthly' | 'roster' | 'history' | 'archive'>('register');

  // Attendance Register states
  const todayStr = new Date().toISOString().substring(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [statusMap, setStatusMap] = useState<AttendanceStatusMap>({});
  const [marksMap, setMarksMap] = useState<AttendanceMarksMap>({});
  const [commentsMap, setCommentsMap] = useState<AttendanceCommentsMap>({});
  const [topicCovered, setTopicCovered] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Green pulse animation state for "Present" mark feedback
  const [pulsingPresentStudentId, setPulsingPresentStudentId] = useState<string | null>(null);

  // Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [isAddExistingModalOpen, setIsAddExistingModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [studentToOffer, setStudentToOffer] = useState<Student | null>(null);
  const [studentToRemove, setStudentToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemovingStudent, setIsRemovingStudent] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [profileDrawerStudent, setProfileDrawerStudent] = useState<Student | null>(null);

  // Search in roster
  const [searchQuery, setSearchQuery] = useState('');

  // Get active students in this group
  const groupStudents = useMemo(() => {
    return students.filter((s) => s.groupId === groupId && s.status !== 'inactive');
  }, [students, groupId]);

  // Filtered by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return groupStudents;
    const q = searchQuery.toLowerCase();
    return groupStudents.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.surname.toLowerCase().includes(q) ||
        s.parentPhone.includes(q)
    );
  }, [groupStudents, searchQuery]);

  // Past attendance records for this group
  const groupRecords = useMemo(() => {
    return attendanceRecords
      .filter((r) => r.groupId === groupId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceRecords, groupId]);

  // Load existing attendance record for selectedDate
  useEffect(() => {
    const existing = attendanceRecords.find(
      (r) => r.groupId === groupId && r.date === selectedDate
    );

    if (existing) {
      // Normalize statusMap so only 'present' or 'absent' exist
      const normalizedStatus: AttendanceStatusMap = {};
      Object.entries(existing.statusMap || {}).forEach(([k, v]) => {
        if (v === 'absent' || v === 'present') {
          normalizedStatus[k] = v;
        }
      });
      setStatusMap(normalizedStatus);
      setMarksMap(existing.marksMap || {});
      setCommentsMap(existing.commentsMap || {});
      setTopicCovered(existing.topicCovered || '');
      setSessionNotes(existing.notes || '');
    } else {
      // Before attendance is taken, start with empty maps so students are unlabeled
      setStatusMap({});
      setMarksMap({});
      setCommentsMap({});
      setTopicCovered('');
      setSessionNotes('');
    }
  }, [selectedDate, groupId, attendanceRecords, groupStudents]);

  if (!group) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Group not found</h2>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-md text-xs font-semibold cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Current register summary stats: Absent (Red), Late (Amber), Unlabeled (White), Present (Green)
  const absentCount = groupStudents.filter((s) => statusMap[s.id] === 'absent').length;
  const lateCount = groupStudents.filter((s) => statusMap[s.id] === 'late').length;
  const unmarkedCount = groupStudents.filter((s) => !statusMap[s.id]).length;
  const presentCount = groupStudents.filter((s) => statusMap[s.id] === 'present').length;
  const totalRoster = groupStudents.length;

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStatusMap((prev) => ({
      ...prev,
      [studentId]: status
    }));

    if (status === 'present') {
      setPulsingPresentStudentId(studentId);
      setTimeout(() => {
        setPulsingPresentStudentId((curr) => (curr === studentId ? null : curr));
      }, 700);
    }
  };

  const handleMarkChange = (studentId: string, markValue: string) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: markValue === '' ? '' : Number(markValue)
    }));
  };

  const handleCommentChange = (studentId: string, commentValue: string) => {
    setCommentsMap((prev) => ({
      ...prev,
      [studentId]: commentValue
    }));
  };

  const handleSaveAttendance = async () => {
    if (!currentUser) return;
    setSavingAttendance(true);

    try {
      const recordsList = groupStudents.map((s) => ({
        studentId: s.id || s.studentId || '',
        studentName: `${s.firstName || ''} ${s.surname || ''}`.trim() || s.studentId || '',
        status: statusMap[s.id] || 'present'
      }));

      const existing = attendanceRecords.find(
        (r) => r.groupId === group.id && r.date === selectedDate
      );
      const recordId = existing?.id || `att-${Date.now()}`;

      await saveAttendanceRecord({
        id: recordId,
        groupId: group.id || '',
        groupName: group.name || '',
        teacherId: group.teacherId || '',
        date: selectedDate || new Date().toISOString(),
        lessonNumber: 1,
        records: recordsList,
        statusMap,
        marksMap,
        commentsMap,
        topicCovered: topicCovered.trim() || '',
        notes: sessionNotes.trim() || ''
      });

      setSaveSuccess(true);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 }
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving attendance:', error);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleOpenRemoveModal = (studentId: string, studentName: string) => {
    setStudentToRemove({ id: studentId, name: studentName });
  };

  const handleConfirmRemoveStudent = async () => {
    if (!studentToRemove) return;
    setIsRemovingStudent(true);
    try {
      await removeStudentFromGroup(studentToRemove.id);
      setStudentToRemove(null);
    } catch (err) {
      console.error('Failed to remove student from group:', err);
    } finally {
      setIsRemovingStudent(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Back button & Group actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold shadow-xs transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Groups</span>
        </button>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditGroupOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Group Details</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Group Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border-none p-5 sm:p-6 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {group.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">{group.schedule}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-slate-400" />
                <span>Instructor: <strong className="text-slate-800 dark:text-slate-200">{group.teacherName}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                <span><strong className="text-slate-800 dark:text-slate-200">{groupStudents.length}</strong> Enrolled Students</span>
              </div>
            </div>
          </div>

          {/* Quick Notification CTA - Native SMS */}
          <button
            type="button"
            onClick={() => setIsNotifyModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all hover:-translate-y-0.5 active:scale-95 self-start md:self-center cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send SMS to Parents</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-slate-100 dark:border-slate-800 mt-6 pt-4">
          {/* Mobile Select Dropdown */}
          <div className="block sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-bold text-slate-800 dark:text-white outline-none shadow-xs"
            >
              <option value="register">Attendance Register</option>
              <option value="monthly">Monthly Sheet</option>
              <option value="roster">Students Roster ({groupStudents.length})</option>
              <option value="history">Session Logs ({groupRecords.length})</option>
              <option value="archive">Group Archive ({groupActivityLogs.filter((l) => l.groupId === group.id).length})</option>
            </select>
          </div>

          {/* Desktop Tab Row */}
          <div className="hidden sm:flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('register')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <CalendarCheck2 className="w-3.5 h-3.5" />
              <span>Attendance</span>
            </button>

            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                activeTab === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Monthly Sheet</span>
            </button>

            <button
              onClick={() => setActiveTab('roster')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                activeTab === 'roster'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Students Roster ({groupStudents.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Session Logs ({groupRecords.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('archive')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                activeTab === 'archive'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>
                Group Archive (
                {groupActivityLogs.filter((l) => l.groupId === group.id).length}
                )
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= TAB 1: ATTENDANCE REGISTER ================= */}
      {activeTab === 'register' && (
        <div className="space-y-6">
          {/* Action & Date control bar */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-lg border-none shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
            {/* Date selector */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Lesson Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-sm font-bold text-slate-900 dark:text-white bg-transparent outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Status tally boxes: Absent (Red), Late (Amber), Unlabeled (White), Present (Green) */}
            <div className="flex items-center gap-1.5" id="attendance-summary-counters">
              {/* Red Box: Absent Count */}
              <div
                className="min-w-[38px] h-8 px-2.5 rounded-md bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs select-none"
                title="Absent"
              >
                <AnimatedCounter value={absentCount} />
              </div>

              {/* Amber Box: Late Count */}
              <div
                className="min-w-[38px] h-8 px-2.5 rounded-md bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center shadow-xs select-none"
                title="Late (Kechikdi)"
              >
                <AnimatedCounter value={lateCount} />
              </div>

              {/* White Box: Unlabeled / Unmarked Count */}
              <div
                className="min-w-[38px] h-8 px-2.5 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-extrabold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-xs select-none"
                title="Unlabeled"
              >
                <AnimatedCounter value={unmarkedCount} />
              </div>

              {/* Green Box: Present Count */}
              <div
                className="min-w-[38px] h-8 px-2.5 rounded-md bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs select-none"
                title="Present"
              >
                <AnimatedCounter value={presentCount} />
              </div>
            </div>
          </div>

          {/* Student attendance list table / cards */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border-none shadow-xs overflow-hidden transition-colors">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Attendance list ({totalRoster} Students)</span>
              </h2>
            </div>

            {groupStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                No students enrolled in this group yet. Click "Students Roster" to enroll students.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {groupStudents.map((student, idx) => {
                  const currentStatus = statusMap[student.id];
                  const currentMark = marksMap[student.id] ?? '';
                  const currentComment = commentsMap[student.id] ?? '';
                  const isPulsing = pulsingPresentStudentId === student.id;

                  return (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
                      className={`p-4 sm:p-5 space-y-3 transition-all ${
                        isPulsing
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 ring-2 ring-emerald-500/50'
                          : currentStatus === 'absent'
                          ? 'bg-rose-50/30 dark:bg-rose-950/20'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Top Row: Name, Phone & Status Toggle */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                              <span>{student.firstName} {student.surname}</span>
                              {student.notes && (
                                <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400 font-normal truncate max-w-xs">
                                  ({student.notes})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>Parent: {student.parentPhone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Toggle Buttons: ONLY Present & Absent */}
                        <div className="flex items-center gap-2">
                          {/* Present Button with Pulse Animation Feedback */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'present')}
                            className={`py-1.5 px-3.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                              currentStatus === 'present'
                                ? `bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600 ring-offset-1 dark:ring-offset-slate-900 ${
                                    isPulsing ? 'animate-pulse scale-105 ring-4 ring-emerald-400' : ''
                                  }`
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>

                          {/* Late Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'late')}
                            className={`py-1.5 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                              currentStatus === 'late'
                                ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-slate-900'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Late (K)</span>
                          </button>

                          {/* Absent Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'absent')}
                            className={`py-1.5 px-3.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-600 ring-offset-1 dark:ring-offset-slate-900'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Mark Input & Teacher Comment Input */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-1 pl-0 lg:pl-9">
                        {/* Mark Field */}
                        <div className="md:col-span-3 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-800">
                          <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <div className="flex-1 flex items-center">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1.5 shrink-0">
                              Mark:
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="any"
                              value={currentMark}
                              onChange={(e) => handleMarkChange(student.id, e.target.value)}
                              placeholder="e.g. 95"
                              className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none"
                            />
                          </div>
                        </div>

                        {/* Comment Field */}
                        <div className="md:col-span-9 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-800">
                          <MessageCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div className="flex-1 flex items-center">
                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1.5 shrink-0">
                              Comment:
                            </label>
                            <input
                              type="text"
                              value={currentComment}
                              onChange={(e) => handleCommentChange(student.id, e.target.value)}
                              placeholder="e.g. Did excellent in debate, completed homework..."
                              className="w-full bg-transparent text-xs text-slate-800 dark:text-white outline-none placeholder:text-slate-400"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Footer: Save Attendance Register & Native SMS */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border-none p-4 sm:p-5 shadow-xs transition-colors">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                {saveSuccess && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1.5 rounded-md border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Attendance saved successfully!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsNotifyModalOpen(true)}
                  className="px-3.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Send SMS to Parents</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingAttendance ? 'Saving...' : 'Save Register'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: MONTHLY SHEET ATTENDANCE MATRIX ================= */}
      {activeTab === 'monthly' && (
        <MonthlyAttendanceSheet
          group={group}
          students={groupStudents}
          attendanceRecords={attendanceRecords}
        />
      )}

      {/* ================= TAB 3: STUDENTS ROSTER ================= */}
      {activeTab === 'roster' && (
        <div className="space-y-5">
          {/* Search & Add Student */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students by name or parent phone..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs sm:text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsAddExistingModalOpen(true)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Add Existing Student</span>
              </button>

              <button
                onClick={() => {
                  setStudentToEdit(null);
                  setIsStudentModalOpen(true);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-bold shadow-md shadow-indigo-600/25 flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enroll New Student</span>
              </button>
            </div>
          </div>

          {/* Roster Cards Grid with Staggered Animation */}
          {filteredStudents.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg border-none p-12 text-center shadow-xs">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {searchQuery
                  ? `No students found matching "${searchQuery}".`
                  : "No students found. Click 'Add Student' to enroll your first student."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student, idx) => {
                const smsLink = createSmsUri(student.parentPhone, `Hello, update from ${group.name} regarding ${student.firstName}.`);

                return (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                    className="bg-white dark:bg-slate-900 rounded-md border-none p-5 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-base">
                            {student.firstName} {student.surname}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Enrolled: {student.enrolledDate || 'Active'}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 uppercase tracking-wider">
                          {student.status || 'Active'}
                        </span>
                      </div>

                      {/* Permanent student static info */}
                      <div className="space-y-2">
                        {student.birthDate && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>DOB: <strong>{new Date(student.birthDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
                          </div>
                        )}

                        {/* Parent contact */}
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-md border border-slate-100 dark:border-slate-700/60 text-xs">
                          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-mono">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold">{student.parentPhone}</span>
                          </div>
                          <a
                            href={smsLink}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold flex items-center gap-1 transition-all hover:-translate-y-0.5 active:scale-95"
                            title="Send Native SMS"
                          >
                            <Send className="w-3 h-3" />
                            <span>SMS</span>
                          </a>
                        </div>
                      </div>

                      {student.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-md border border-slate-100 dark:border-slate-700/60">
                          {student.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setProfileDrawerStudent(student)}
                          className="px-2.5 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-800/80 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-1 cursor-pointer"
                          title="Check Student Profile & History"
                        >
                          <Users className="w-3 h-3" />
                          <span>Profile</span>
                        </button>
                        <button
                          onClick={() => {
                            setStudentToOffer(student);
                            setIsOfferModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-800/80 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-1 cursor-pointer"
                          title="Offer student to another group"
                        >
                          <Send className="w-3 h-3" />
                          <span>Offer</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setStudentToEdit(student);
                            setIsStudentModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() =>
                            handleOpenRemoveModal(
                              student.id,
                              `${student.firstName} ${student.surname}`
                            )
                          }
                          className="px-2.5 py-1.5 rounded-md border border-rose-300 dark:border-rose-700 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-1 cursor-pointer"
                          title="Kick student from this group"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Kick</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: ATTENDANCE HISTORY & LOGS ================= */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border-none overflow-hidden shadow-xs transition-colors">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Historical Attendance Records ({groupRecords.length} Sessions)
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Click any date to view and edit that day's roll, marks, and comments
            </span>
          </div>

          {groupRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
              No historical records found for this group yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {groupRecords.map((rec, idx) => {
                const pCount = Object.values(rec.statusMap || {}).filter((v) => v === 'present').length;
                const aCount = Object.values(rec.statusMap || {}).filter((v) => v === 'absent').length;
                const total = pCount + aCount;
                const pct = total > 0 ? Math.round((pCount / total) * 100) : 100;
                const marksAssessedCount = Object.keys(rec.marksMap || {}).filter((k) => rec.marksMap?.[k] !== '' && rec.marksMap?.[k] !== undefined).length;

                return (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedDate(rec.date);
                      setActiveTab('register');
                    }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {new Date(rec.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                          {pct}% Attendance
                        </span>
                        {marksAssessedCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {marksAssessedCount} Graded
                          </span>
                        )}
                      </div>
                      {rec.topicCovered && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          Topic: <span className="text-slate-900 dark:text-white">{rec.topicCovered}</span>
                        </p>
                      )}
                      {rec.notes && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                          Notes: {rec.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{pCount} Present</span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">{aCount} Absent</span>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                      >
                        Open Roll
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: GROUP ARCHIVE AUDIT ================= */}
      {activeTab === 'archive' && (
        <GroupArchiveTab group={group} />
      )}

      {/* Modals */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setStudentToEdit(null);
        }}
        groupId={group.id}
        studentToEdit={studentToEdit}
      />

      <NotifyParentsModal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
        group={group}
        date={selectedDate}
        students={groupStudents}
        statusMap={statusMap}
        marksMap={marksMap}
        commentsMap={commentsMap}
        topicCovered={topicCovered}
      />

      <GroupModal
        isOpen={isEditGroupOpen}
        onClose={() => setIsEditGroupOpen(false)}
        groupToEdit={group}
      />

      <RemoveStudentFromGroupModal
        isOpen={!!studentToRemove}
        onClose={() => setStudentToRemove(null)}
        onConfirm={handleConfirmRemoveStudent}
        studentName={studentToRemove?.name || ''}
        groupName={group.name}
        isProcessing={isRemovingStudent}
      />

      <AddExistingStudentModal
        isOpen={isAddExistingModalOpen}
        onClose={() => setIsAddExistingModalOpen(false)}
        groupId={group.id}
        currentGroup={group}
      />

      <OfferStudentModal
        isOpen={isOfferModalOpen}
        onClose={() => {
          setIsOfferModalOpen(false);
          setStudentToOffer(null);
        }}
        student={studentToOffer}
        currentGroup={group}
      />

      {/* Student Profile Drawer */}
      <StudentProfileDrawer
        isOpen={Boolean(profileDrawerStudent)}
        onClose={() => setProfileDrawerStudent(null)}
        student={profileDrawerStudent}
      />
    </div>
  );
};
