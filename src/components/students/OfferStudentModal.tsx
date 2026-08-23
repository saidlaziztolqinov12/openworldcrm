import React, { useState } from 'react';
import { Group, Student } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { TeacherAvatar } from '../common/TeacherAvatar';
import { X, Send, CheckCircle2, Clock, Building2 } from 'lucide-react';

interface OfferStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  currentGroup: Group;
}

export const OfferStudentModal: React.FC<OfferStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  currentGroup
}) => {
  const { groups, teachers, sendNotification } = useData();
  const { currentUser } = useAuth();
  const [processingGroupId, setProcessingGroupId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen || !student) return null;

  const activeGroups = groups.filter((g) => !g.archived);

  const handleInviteToGroup = async (targetGroup: Group) => {
    setProcessingGroupId(targetGroup.id);
    const teacherObj = teachers.find((t) => t.id === targetGroup.teacherId);
    const targetTeacherName = teacherObj?.name || targetGroup.teacherName || 'Instructor';
    const studentFullName = `${student.firstName} ${student.surname}`;

    try {
      await sendNotification({
        recipientId: targetGroup.teacherId || 'admin-1',
        recipientRole: 'teacher',
        senderId: currentUser?.id || 'teacher',
        senderName: currentUser?.name || 'Instructor',
        senderRole: currentUser?.role || 'teacher',
        type: 'STUDENT_OFFER',
        title: `Student Offer: ${studentFullName}`,
        message: `${currentUser?.name || 'Instructor'} offered student ${studentFullName} from ${currentGroup.name} to join your group ${targetGroup.name}.`,
        studentId: student.id,
        studentName: studentFullName,
        groupId: currentGroup.id,
        sourceGroupId: currentGroup.id,
        currentGroupId: currentGroup.id,
        currentGroupName: currentGroup.name,
        targetGroupId: targetGroup.id,
        targetGroupName: targetGroup.name,
        requestingTeacherId: currentUser?.id || 'teacher',
        targetTeacherId: targetGroup.teacherId || 'admin-1',
        status: 'PENDING',
        priority: 'important'
      });

      setFeedback(`Offer successfully sent to ${targetTeacherName} for ${targetGroup.name}!`);
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 2500);
    } catch (err) {
      console.error(err);
      setFeedback('Failed to send group offer. Please try again.');
    } finally {
      setProcessingGroupId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 transition-colors">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Offer Student to Group
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Student: <span className="font-semibold text-slate-700 dark:text-slate-300">{student.firstName} {student.surname}</span> (Current: {currentGroup.name})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Toast */}
        {feedback && (
          <div className="m-6 mb-0 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Group List Body */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Select Target Academy Group ({activeGroups.length} Active)
          </p>

          {activeGroups.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">
              No active academy groups available.
            </div>
          ) : (
            activeGroups.map((g) => {
              const teacherObj = teachers.find((t) => t.id === g.teacherId) || {
                name: g.teacherName || 'Assigned Instructor',
                firstName: g.teacherName?.split(' ')[0],
                surname: g.teacherName?.split(' ').slice(1).join(' '),
                avatarColor: 'bg-indigo-600'
              };
              const isCurrent = g.id === currentGroup.id;
              const isProcessing = processingGroupId === g.id;

              return (
                <div
                  key={g.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCurrent
                      ? 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <TeacherAvatar teacher={teacherObj} className="w-11 h-11 rounded-xl shrink-0" />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                          {g.name}
                        </h3>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Current Group
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                          {teacherObj.name}
                        </span>
                        {g.schedule && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {g.schedule}
                          </span>
                        )}
                        {g.level && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                            {g.level}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 sm:text-right">
                    <button
                      type="button"
                      disabled={isCurrent || isProcessing}
                      onClick={() => handleInviteToGroup(g)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isProcessing ? 'Sending...' : 'Invite to Group'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-750 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
