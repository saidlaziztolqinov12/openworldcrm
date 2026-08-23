import React, { useState, useMemo } from 'react';
import { Group, Student } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Search,
  UserCheck,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Send,
  ArrowRight,
  GraduationCap,
  ShieldAlert,
  UserPlus
} from 'lucide-react';

interface AddExistingStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGroup?: Group;
  groupId?: string;
  onSuccess?: () => void;
}

export const AddExistingStudentModal: React.FC<AddExistingStudentModalProps> = ({
  isOpen,
  onClose,
  currentGroup: propCurrentGroup,
  groupId,
  onSuccess
}) => {
  const { students, groups, notifications, transferStudent, sendNotification } = useData();
  const { currentUser, isAdmin } = useAuth();

  const currentGroup = propCurrentGroup || groups.find((g) => g.id === groupId) || {
    id: groupId || '',
    name: 'Selected Cohort',
    schedule: '',
    teacherName: 'Assigned Instructor'
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [studentToEnrollConfirm, setStudentToEnrollConfirm] = useState<Student | null>(null);
  const [studentToTransferConfirm, setStudentToTransferConfirm] = useState<{
    student: Student;
    assignedGroup: Group;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingTransferRequestStudentIds, setPendingTransferRequestStudentIds] = useState<Set<string>>(
    new Set()
  );

  // Filter students across global database matching search query
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      // If empty, show recent unassigned students first, followed by other students
      return [...students].sort((a, b) => {
        const aUnassigned = !a.groupId || a.groupId === null;
        const bUnassigned = !b.groupId || b.groupId === null;
        if (aUnassigned && !bUnassigned) return -1;
        if (!aUnassigned && bUnassigned) return 1;
        return `${a.firstName} ${a.surname}`.localeCompare(`${b.firstName} ${b.surname}`);
      });
    }

    return students.filter((s) => {
      const fullName = `${s.firstName} ${s.surname}`.toLowerCase();
      const phone = s.parentPhone || '';
      return fullName.includes(q) || phone.includes(q);
    });
  }, [students, searchQuery]);

  if (!isOpen) return null;

  // Confirm Enrollment Action
  const handleConfirmEnrollment = async () => {
    if (!studentToEnrollConfirm) return;
    setIsProcessing(true);
    try {
      await transferStudent(studentToEnrollConfirm.id, currentGroup.id);
      setFeedback({
        type: 'success',
        text: `Enrolled ${studentToEnrollConfirm.firstName} ${studentToEnrollConfirm.surname} into ${currentGroup.name} successfully!`
      });
      setStudentToEnrollConfirm(null);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setFeedback(null);
      }, 3500);
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'error',
        text: 'Failed to enroll student into cohort.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Transfer Request
  const handleSendTransferRequest = async () => {
    if (!studentToTransferConfirm) return;
    const { student, assignedGroup } = studentToTransferConfirm;
    setIsProcessing(true);

    const requestingTeacherName = currentUser?.name || 'Requesting Instructor';
    const studentFullName = `${student.firstName} ${student.surname}`;

    try {
      // Targeted inbox routing: Route notification to specific assigned teacher's Inbox
      await sendNotification({
        recipientId: assignedGroup.teacherId || 'admin-1',
        recipientRole: 'teacher',
        senderId: currentUser?.id || 'teacher',
        senderName: requestingTeacherName,
        senderRole: currentUser?.role || 'teacher',
        type: 'TRANSFER_REQUEST',
        title: `Student Transfer Request: ${studentFullName}`,
        message: `${requestingTeacherName} requests to transfer ${studentFullName} from ${assignedGroup.name} to ${currentGroup.name}.`,
        studentId: student.id,
        studentName: studentFullName,
        groupId: assignedGroup.id,
        sourceGroupId: assignedGroup.id,
        currentGroupId: assignedGroup.id,
        currentGroupName: assignedGroup.name,
        targetGroupId: currentGroup.id,
        targetGroupName: currentGroup.name,
        requestingTeacherId: currentUser?.id || 'teacher',
        targetTeacherId: assignedGroup.teacherId || 'admin-1',
        status: 'PENDING',
        priority: 'important'
      });

      setPendingTransferRequestStudentIds((prev) => new Set([...prev, student.id]));
      setFeedback({
        type: 'success',
        text: `Transfer request sent to ${assignedGroup.teacherName} for ${studentFullName}.`
      });
      setStudentToTransferConfirm(null);
      setTimeout(() => {
        setFeedback(null);
      }, 4000);
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'error',
        text: 'Failed to dispatch transfer request notification.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Add Existing Student to Cohort
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enrolling into: <strong className="text-indigo-600 dark:text-indigo-400">{currentGroup.name}</strong> ({currentGroup.schedule})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`px-6 py-3 border-b text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Search Input */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search global directory by student name or parent phone number..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-5 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
          {searchResults.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <UserPlus className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold">No students found matching "{searchQuery}"</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                You can enroll a brand new student via the "Enroll New Student" form.
              </p>
            </div>
          ) : (
            searchResults.map((student) => {
              const isUnassigned = !student.groupId || student.groupId === null || student.groupId === '';
              const isAlreadyInThisGroup = student.groupId === currentGroup.id;
              const assignedGroup = !isUnassigned && !isAlreadyInThisGroup
                ? groups.find((g) => g.id === student.groupId)
                : null;
              const hasPendingRequest =
                pendingTransferRequestStudentIds.has(student.id) ||
                notifications.some(
                  (n) =>
                    n.studentId === student.id &&
                    (n.type === 'TRANSFER_REQUEST' || n.type === 'transfer_request') &&
                    (n.status === 'PENDING' || n.status === 'pending')
                );

              return (
                <div
                  key={student.id}
                  className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {student.firstName} {student.surname}
                      </h4>

                      {/* Cohort Status Indicator Badge */}
                      {isUnassigned ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Not assigned to any group
                        </span>
                      ) : isAlreadyInThisGroup ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Enrolled in this cohort
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Currently assigned to {assignedGroup?.name || 'Another Group'} (Teacher: {assignedGroup?.teacherName || 'Assigned Instructor'})
                        </span>
                      )}
                    </div>

                    {/* Metadata details: Phone & DOB */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{student.parentPhone || 'No Phone'}</span>
                      </div>
                      {student.birthDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            DOB: {new Date(student.birthDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="shrink-0 flex items-center gap-2 sm:self-center">
                    {isUnassigned ? (
                      /* Status A: Unassigned -> Active "Add to Cohort" button */
                      <button
                        onClick={() => setStudentToEnrollConfirm(student)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add to Cohort</span>
                      </button>
                    ) : isAlreadyInThisGroup ? (
                      <span className="text-xs font-medium text-slate-400 dark:text-slate-500 py-1.5 px-3">
                        Already Enrolled
                      </span>
                    ) : (
                      /* Status B: Assigned Elsewhere -> HIDE Add button & display "Request Transfer" */
                      <button
                        onClick={() => {
                          if (assignedGroup) {
                            setStudentToTransferConfirm({ student, assignedGroup });
                          }
                        }}
                        disabled={hasPendingRequest}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                          hasPendingRequest
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 shadow-xs hover:-translate-y-0.5'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{hasPendingRequest ? 'Transfer Requested' : 'Request Transfer'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>
            Showing {searchResults.length} of {students.length} students
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* ================= CONFIRMATION DIALOG: TEACHER COHORT ENROLLMENT ================= */}
      {studentToEnrollConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <UserPlus className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Confirm Cohort Enrollment
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to enroll{' '}
                <strong className="text-slate-900 dark:text-white">
                  {studentToEnrollConfirm.firstName} {studentToEnrollConfirm.surname}
                </strong>{' '}
                into <strong className="text-indigo-600 dark:text-indigo-400">{currentGroup.name}</strong>?
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Student:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {studentToEnrollConfirm.firstName} {studentToEnrollConfirm.surname}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Destination Group:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {currentGroup.name} ({currentGroup.schedule})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Instructor:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentGroup.teacherName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStudentToEnrollConfirm(null)}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEnrollment}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? 'Enrolling...' : 'Confirm Enrollment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFIRMATION DIALOG: REQUEST TRANSFER FROM OTHER TEACHER ================= */}
      {studentToTransferConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Request Student Transfer
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Send an automated request to{' '}
                <strong className="text-slate-900 dark:text-white">
                  {studentToTransferConfirm.assignedGroup.teacherName}
                </strong>{' '}
                to transfer{' '}
                <strong className="text-slate-900 dark:text-white">
                  {studentToTransferConfirm.student.firstName} {studentToTransferConfirm.student.surname}
                </strong>{' '}
                from{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {studentToTransferConfirm.assignedGroup.name}
                </strong>{' '}
                into{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {currentGroup.name}
                </strong>?
              </p>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-xs space-y-1.5 text-amber-900 dark:text-amber-200">
              <p className="font-semibold text-[11px] text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                Targeted Notification Routing:
              </p>
              <p className="italic text-[11px] text-slate-700 dark:text-slate-300">
                "{currentUser?.name || 'Instructor'} requests to transfer{' '}
                {studentToTransferConfirm.student.firstName} {studentToTransferConfirm.student.surname} from{' '}
                {studentToTransferConfirm.assignedGroup.name} to {currentGroup.name}."
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStudentToTransferConfirm(null)}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTransferRequest}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Sending...' : 'Send Request'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
