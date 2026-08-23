import React from 'react';
import { UserMinus, AlertTriangle, X } from 'lucide-react';

interface RemoveStudentFromGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  studentName: string;
  groupName?: string;
  isProcessing?: boolean;
}

export const RemoveStudentFromGroupModal: React.FC<RemoveStudentFromGroupModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  studentName,
  groupName,
  isProcessing = false
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="remove-student-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-student-title"
    >
      <div
        id="remove-student-modal-container"
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150 transition-colors"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs shrink-0">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="remove-student-title"
                className="text-base font-extrabold text-slate-900 dark:text-white leading-tight"
              >
                Kick Student from Group
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {groupName ? `Cohort: ${groupName}` : 'Cohort Roster'}
              </p>
            </div>
          </div>

          <button
            id="close-remove-student-modal-btn"
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Target Student Highlight Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-750 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
              {studentName ? studentName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {studentName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Status: Active Profile
              </div>
            </div>
          </div>

          {/* Explicit User Confirmation Message */}
          <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-850/80 text-rose-900 dark:text-rose-200 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">
                Are you sure you want to kick this student from the group? Their profile will remain in the global directory.
              </p>
            </div>
            <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 pl-6.5 leading-normal">
              The student will be removed from this specific group roster, but all contact info and historical records remain intact in the Master Register for future reassignment.
            </p>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            id="cancel-remove-student-btn"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-750 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            id="confirm-remove-student-btn"
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <UserMinus className="w-4 h-4" />
            <span>{isProcessing ? 'Kicking...' : 'Kick'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
