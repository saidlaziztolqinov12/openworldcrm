import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Group, Student, AttendanceStatusMap, AttendanceMarksMap, AttendanceCommentsMap } from '../../types';
import { createSmsUri } from '../../lib/sms';
import {
  X,
  MessageSquare,
  Phone,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Award,
  Send
} from 'lucide-react';

interface NotifyParentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  date: string;
  students: Student[];
  statusMap: AttendanceStatusMap;
  marksMap?: AttendanceMarksMap;
  commentsMap?: AttendanceCommentsMap;
  topicCovered?: string;
}

export const NotifyParentsModal: React.FC<NotifyParentsModalProps> = ({
  isOpen,
  onClose,
  group,
  date,
  students,
  statusMap,
  marksMap = {},
  commentsMap = {},
  topicCovered
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'absent' | 'present'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredStudents = students.filter((s) => {
    const st = statusMap[s.id] || 'present';
    if (filterMode === 'absent') return st === 'absent';
    if (filterMode === 'present') return st === 'present';
    return true;
  });

  const generateMessage = (student: Student): string => {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    const status = statusMap[student.id] || 'present';
    const statusText = status === 'present' ? 'Present' : 'Absent';
    const rawMark = marksMap[student.id];
    const markText = (rawMark !== undefined && rawMark !== null && rawMark !== '') ? String(rawMark) : 'N/A';
    const rawComment = commentsMap[student.id];
    const commentText = (rawComment && rawComment.trim())
      ? rawComment.trim()
      : (status === 'absent' ? 'Absent' : 'Good participation');

    return `Open World Lesson Update:
• Student: ${student.firstName} ${student.surname}
• Date: ${formattedDate} (${group.name})
• Attendance: ${statusText}
• Mark: ${markText}
• Comment: ${commentText}
${topicCovered ? `• Topic: ${topicCovered}\n` : ''}Instructor: ${group.teacherName}`;
  };

  const handleCopy = (studentId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(studentId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Send SMS Notification to Parents
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct native SMS dispatch for {group.name} with attendance, marks & comments
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Audience Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Students ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('absent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'absent'
                    ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-300'
                }`}
              >
                Absent ({students.filter((s) => statusMap[s.id] === 'absent').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('present')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'present'
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                }`}
              >
                Present ({students.filter((s) => (statusMap[s.id] || 'present') === 'present').length})
              </button>
            </div>

            <span className="text-xs text-slate-400 dark:text-slate-500">
              Showing {filteredStudents.length} of {students.length} recipients
            </span>
          </div>

          {/* Student notification list */}
          {filteredStudents.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-400 dark:text-slate-500">No students in this filter view.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student, idx) => {
                const status = statusMap[student.id] || 'present';
                const mark = marksMap[student.id];
                const comment = commentsMap[student.id];
                const message = generateMessage(student);
                const smsUrl = createSmsUri(student.parentPhone, message);

                return (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-3 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            status === 'absent'
                              ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {status === 'absent' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 flex-wrap">
                            <span>{student.firstName} {student.surname}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                status === 'absent'
                                  ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                  : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              }`}
                            >
                              {status === 'absent' ? 'Absent' : 'Present'}
                            </span>
                            {mark !== undefined && mark !== null && mark !== '' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                <Award className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                Mark: {mark}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 font-mono mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>Parent: {student.parentPhone}</span>
                            {comment && (
                              <span className="text-slate-600 dark:text-slate-400 font-sans truncate max-w-xs ml-2">
                                • "{comment}"
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {/* Native SMS Button */}
                        <a
                          href={smsUrl}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-all hover:-translate-y-0.5 active:scale-95"
                          title="Send pre-filled Native SMS"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send SMS</span>
                        </a>

                        {/* Copy text button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(student.id, message)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                          title="Copy text report to clipboard"
                        >
                          {copiedId === student.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Compact preview box */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-150 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {message}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Recipient counts: {students.length} total • {students.filter((s) => (statusMap[s.id] || 'present') === 'present').length} present • {students.filter((s) => statusMap[s.id] === 'absent').length} absent
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
