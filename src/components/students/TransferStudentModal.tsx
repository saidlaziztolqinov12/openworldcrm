import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Group } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowRightLeft,
  X,
  GraduationCap,
  FileText,
  AlertCircle,
  CheckCircle2,
  Send,
  UserCheck,
  ShieldAlert
} from 'lucide-react';

interface TransferStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
  currentGroupId?: string;
  onSuccess?: () => void;
}

export const TransferStudentModal: React.FC<TransferStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  currentGroupId,
  onSuccess
}) => {
  const { groups, students, transferStudent, sendNotification } = useData();
  const { currentUser, isAdmin } = useAuth();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(student?.id || '');
  const [targetGroupId, setTargetGroupId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active student record
  const activeStudent = student || students.find((s) => s.id === selectedStudentId);
  const originGroupId = activeStudent?.groupId || currentGroupId || '';
  const originGroup = groups.find((g) => g.id === originGroupId);

  // Available destination groups (excluding the origin group)
  const destinationGroups = groups.filter(
    (g) => !g.archived && g.id !== originGroupId
  );

  useEffect(() => {
    if (student) {
      setSelectedStudentId(student.id);
    }
    if (destinationGroups.length > 0 && !targetGroupId) {
      setTargetGroupId(destinationGroups[0].id);
    }
    setError(null);
    setSuccessMessage(null);
  }, [student, isOpen, originGroupId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) {
      setError('Please choose a student to transfer.');
      return;
    }
    if (!targetGroupId) {
      setError('Please select a destination cohort.');
      return;
    }
    if (targetGroupId === originGroupId) {
      setError('The destination group must be different from the current group.');
      return;
    }

    const targetGroup = groups.find((g) => g.id === targetGroupId);
    const studentFullName = `${activeStudent.firstName} ${activeStudent.surname}`;

    setIsSubmitting(true);
    setError(null);

    try {
      if (isAdmin) {
        // Admins can execute direct immediate transfer with historical scoping preserved
        await transferStudent(activeStudent.id, targetGroupId);
        setSuccessMessage(`Successfully transferred ${studentFullName} to ${targetGroup?.name || 'new cohort'}.`);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      } else {
        // Teachers submit a formal transfer request to the Administration
        await sendNotification({
          type: 'transfer_request',
          title: `Transfer Request: ${studentFullName}`,
          message: `${currentUser?.name || 'Teacher'} has requested to transfer student ${studentFullName} from "${originGroup?.name || 'Current Group'}" to "${targetGroup?.name || 'Destination Group'}". Reason: ${reason.trim() || 'Level/Schedule adjustment'}`,
          senderId: currentUser?.id || 'teacher',
          senderName: currentUser?.name || 'Teacher',
          senderRole: 'teacher',
          recipientId: 'admin',
          recipientRole: 'admin',
          studentId: activeStudent.id,
          studentName: studentFullName,
          currentGroupId: originGroupId,
          currentGroupName: originGroup?.name || 'Current Group',
          targetGroupId: targetGroupId,
          targetGroupName: targetGroup?.name || 'Destination Group',
          status: 'pending',
          priority: 'important'
        });

        setSuccessMessage(`Transfer request submitted to administration for ${studentFullName}.`);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1400);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to process student transfer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isAdmin ? 'Transfer Student Cohort' : 'Request Student Transfer'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAdmin
                  ? 'Reassign student cohort while preserving past attendance isolation'
                  : 'Submit a transfer proposal to administration'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Student Selection (if not fixed) */}
          {!student && (
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Select Student to Transfer
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">-- Choose Student --</option>
                {students.map((s) => {
                  const grp = groups.find((g) => g.id === s.groupId);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.surname} ({grp ? grp.name : 'Unassigned'})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Active Student Card */}
          {activeStudent && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                  {activeStudent.firstName.charAt(0)}
                  {activeStudent.surname.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {activeStudent.firstName} {activeStudent.surname}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Current Group: <strong className="text-slate-700 dark:text-slate-300">{originGroup?.name || 'Unassigned'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Destination Cohort Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Destination Cohort / Group *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <GraduationCap className="w-4 h-4" />
              </div>
              <select
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">-- Choose Destination Group --</option>
                {destinationGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.schedule}) — Teacher: {g.teacherName}
                  </option>
                ))}
              </select>
            </div>
            {destinationGroups.length === 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                No other active groups available for transfer.
              </p>
            )}
          </div>

          {/* Transfer Reason / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Transfer Reason & Academic Notes
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Promoted to Advanced IELTS track due to rapid progress in writing."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Historical Scoping Notice */}
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Strict Historical Retention Safeguard:</span>
              <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                Past attendance records remain permanently scoped to the originating group. The student will appear in the destination group from today forward.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !targetGroupId}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                'Processing...'
              ) : isAdmin ? (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Execute Transfer</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Request to Admin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
