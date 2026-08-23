import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Group, GroupActivityLog, GroupActivityActionType } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Archive,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  CheckCircle2,
  UserCheck,
  FolderPlus,
  FileText,
  Clock,
  User,
  Search,
  Filter,
  Plus,
  Calendar,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  X,
  Check
} from 'lucide-react';

interface GroupArchiveTabProps {
  group: Group;
}

export const GroupArchiveTab: React.FC<GroupArchiveTabProps> = ({ group }) => {
  const { getGroupActivityLogs, logGroupActivity } = useData();
  const { currentUser, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Retrieve logs for this group sorted newest first
  const groupLogs = useMemo(() => {
    return getGroupActivityLogs(group.id);
  }, [getGroupActivityLogs, group.id]);

  // Filter logs by search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return groupLogs;
    const q = searchQuery.toLowerCase();
    return groupLogs.filter((log) => {
      const matchesDesc = log.description.toLowerCase().includes(q);
      const matchesActor = log.actorName.toLowerCase().includes(q);
      const matchesType = log.actionType.toLowerCase().includes(q);
      return matchesDesc || matchesActor || matchesType;
    });
  }, [groupLogs, searchQuery]);

  // Group events by Date Header (Today, Yesterday, Formatted Date)
  const groupedLogs = useMemo(() => {
    const today = new Date();
    const todayDateStr = today.toISOString().substring(0, 10);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDateStr = yesterday.toISOString().substring(0, 10);

    const groupsMap = new Map<string, { header: string; dateKey: string; logs: GroupActivityLog[] }>();

    filteredLogs.forEach((log) => {
      const logDate = new Date(log.timestamp);
      const logDateStr = !isNaN(logDate.getTime()) ? log.timestamp.substring(0, 10) : todayDateStr;

      let headerLabel = '';
      if (logDateStr === todayDateStr) {
        headerLabel = 'Today';
      } else if (logDateStr === yesterdayDateStr) {
        headerLabel = 'Yesterday';
      } else {
        headerLabel = !isNaN(logDate.getTime())
          ? logDate.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })
          : logDateStr;
      }

      if (!groupsMap.has(logDateStr)) {
        groupsMap.set(logDateStr, {
          header: headerLabel,
          dateKey: logDateStr,
          logs: []
        });
      }

      groupsMap.get(logDateStr)!.logs.push(log);
    });

    return Array.from(groupsMap.values());
  }, [filteredLogs]);

  // Handle adding custom audit note
  const handleAddCustomNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !currentUser) return;

    setIsSubmittingNote(true);
    try {
      await logGroupActivity({
        groupId: group.id,
        actorId: currentUser.id,
        actorName: currentUser.name + (currentUser.role === 'admin' ? ' (Admin)' : ''),
        actionType: 'CUSTOM_NOTE',
        description: noteContent.trim()
      });
      setNoteContent('');
      setIsAddNoteModalOpen(false);
    } catch (err) {
      console.error('Failed to log custom note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Helper to format 12-hour time
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Just now';
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  // Helper for action type icon, colors, and badge label
  const getActionConfig = (actionType: GroupActivityActionType) => {
    switch (actionType) {
      case 'STUDENT_ENROLLED':
        return {
          icon: UserPlus,
          badge: 'Student Enrolled',
          iconBg: 'bg-emerald-500 text-white shadow-xs ring-4 ring-emerald-50 dark:ring-emerald-950/40',
          badgeStyle: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80',
          dotColor: 'bg-emerald-500'
        };
      case 'STUDENT_REMOVED':
        return {
          icon: UserMinus,
          badge: 'Student Removed',
          iconBg: 'bg-rose-500 text-white shadow-xs ring-4 ring-rose-50 dark:ring-rose-950/40',
          badgeStyle: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80',
          dotColor: 'bg-rose-500'
        };
      case 'STUDENT_TRANSFERRED_OUT':
        return {
          icon: ArrowRightLeft,
          badge: 'Transferred Out',
          iconBg: 'bg-amber-500 text-white shadow-xs ring-4 ring-amber-50 dark:ring-amber-950/40',
          badgeStyle: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80',
          dotColor: 'bg-amber-500'
        };
      case 'TRANSFER_APPROVED':
        return {
          icon: CheckCircle2,
          badge: 'Transfer Approved',
          iconBg: 'bg-blue-600 text-white shadow-xs ring-4 ring-blue-50 dark:ring-blue-950/40',
          badgeStyle: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80',
          dotColor: 'bg-blue-600'
        };
      case 'TEACHER_ASSIGNED':
        return {
          icon: UserCheck,
          badge: 'Teacher Assigned',
          iconBg: 'bg-purple-600 text-white shadow-xs ring-4 ring-purple-50 dark:ring-purple-950/40',
          badgeStyle: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/80',
          dotColor: 'bg-purple-600'
        };
      case 'GROUP_CREATED':
        return {
          icon: FolderPlus,
          badge: 'Cohort Created',
          iconBg: 'bg-indigo-600 text-white shadow-xs ring-4 ring-indigo-50 dark:ring-indigo-950/40',
          badgeStyle: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80',
          dotColor: 'bg-indigo-600'
        };
      case 'CUSTOM_NOTE':
      default:
        return {
          icon: FileText,
          badge: 'Audit Note',
          iconBg: 'bg-slate-600 text-white shadow-xs ring-4 ring-slate-100 dark:ring-slate-800',
          badgeStyle: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          dotColor: 'bg-slate-600'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs transition-colors space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Section Title and Count */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Group Activity & Archive Audit
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {groupLogs.length} Events
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable audit trail of cohort enrollments, transfers, instructor assignments, and notes
              </p>
            </div>
          </div>

          {/* Action CTA: Add Custom Log / Note */}
          <button
            type="button"
            onClick={() => setIsAddNoteModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer self-start md:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Add Audit Note</span>
          </button>
        </div>

        {/* Search bar & Actions bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Chronological Activity Stream
          </p>

          {/* Search input */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search activity by name or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Timeline View */}
      {groupedLogs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {searchQuery ? 'No matching audit records found' : 'No activity logged yet'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search query to find the desired activity record.'
              : 'All cohort actions, enrollments, student transfers, and custom notes will automatically appear here in chronological order.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groupedLogs.map((groupSection, groupIndex) => (
            <div key={groupSection.dateKey} className="space-y-3">
              {/* Clean Date Header */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-extrabold shadow-2xs border border-slate-200/80 dark:border-slate-700/80">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{groupSection.header}</span>
                </div>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  {groupSection.logs.length} {groupSection.logs.length === 1 ? 'event' : 'events'}
                </span>
              </div>

              {/* Vertical Timeline Container */}
              <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {groupSection.logs.map((log, logIdx) => {
                  const config = getActionConfig(log.actionType);
                  const Icon = config.icon;
                  const formattedTime = formatTime(log.timestamp);

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(logIdx * 0.03, 0.3) }}
                      className="relative"
                    >
                      {/* Timeline Node Icon */}
                      <div
                        className={`absolute -left-6 sm:-left-8 top-3.5 w-6 h-6 sm:w-7 sm:h-7 rounded-xl ${config.iconBg} flex items-center justify-center shrink-0 z-10`}
                      >
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>

                      {/* Event Card Content */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.badgeStyle}`}
                            >
                              {config.badge}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>by <strong className="text-slate-800 dark:text-slate-200 font-bold">{log.actorName}</strong></span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formattedTime}</span>
                          </div>
                        </div>

                        {/* Event Description */}
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                          {log.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Custom Audit Note Modal */}
      <AnimatePresence>
        {isAddNoteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Add Custom Audit Note
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Record an official log entry for {group.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddNoteModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomNote} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Audit Note / Entry Details
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="e.g. Conducted term evaluation meeting with parents, reviewed mock exam results..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddNoteModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNote || !noteContent.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmittingNote ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save to Archive</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
