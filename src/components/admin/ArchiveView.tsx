import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { GroupActivityLog } from '../../types';
import {
  Archive,
  Search,
  User,
  BookOpen,
  UserCheck,
  Clock,
  ShieldCheck
} from 'lucide-react';

export const ArchiveView: React.FC = () => {
  const { groupActivityLogs } = useData();
  const { language, t } = useLanguage();

  const [filter, setFilter] = useState<'all' | 'students' | 'groups' | 'staff' | 'telegram'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCount, setDisplayCount] = useState(20);

  // Parse log description to extract metadata names
  const parseLogMetadata = (log: GroupActivityLog) => {
    let studentName: string | null = null;
    let groupName: string | null = null;
    let teacherName: string | null = null;

    const desc = log.description;
    if (desc.includes('Enrolled student') || desc.includes('Removed student')) {
      const match = desc.match(/(?:Enrolled|Removed) student (.+?) (?:into|from)/);
      if (match) studentName = match[1];
    } else if (desc.includes('transferred in') || desc.includes('transferred out')) {
      const match = desc.match(/^(.+?) transferred/);
      if (match) studentName = match[1];
    }

    if (desc.includes('Created group')) {
      const match = desc.match(/Created group "(.+?)"/);
      if (match) groupName = match[1];
    }

    if (desc.includes('Assigned Instructor')) {
      const match = desc.match(/Assigned Instructor (.+?) to group/);
      if (match) teacherName = match[1];
    }

    return { studentName, groupName, teacherName };
  };

  // Map actionType to dictionary action keys
  const getTranslatedActionTitle = (log: GroupActivityLog) => {
    const type = log.actionType;
    const desc = log.description.toLowerCase();

    if (type === 'STUDENT_ENROLLED' || desc.includes('enrolled')) {
      return t('archiveView.actions.student_added');
    }
    if (type === 'STUDENT_REMOVED' || desc.includes('removed')) {
      return t('archiveView.actions.student_removed');
    }
    if (type === 'TEACHER_ASSIGNED' || desc.includes('assigned instructor')) {
      return t('archiveView.actions.group_updated');
    }
    if (type === 'GROUP_CREATED' || desc.includes('created group')) {
      return t('archiveView.actions.group_created');
    }
    if (type === 'TRANSFER_APPROVED' || type === 'STUDENT_TRANSFERRED_OUT') {
      return t('archiveView.actions.student_assigned');
    }
    if (desc.includes('telegram')) {
      if (desc.includes('disconnect') || desc.includes('removed')) {
        return t('archiveView.actions.telegram_disconnected');
      }
      return t('archiveView.actions.telegram_connected');
    }
    if (desc.includes('staff') || desc.includes('admin')) {
      return t('archiveView.actions.staff_added');
    }
    return log.description;
  };

  // Filter logs based on category and search query
  const filteredLogs = useMemo(() => {
    return groupActivityLogs.filter((log) => {
      const desc = log.description.toLowerCase();
      const actor = log.actorName.toLowerCase();
      const type = log.actionType.toLowerCase();

      // Category filter
      if (filter === 'students') {
        const isStudent = type.includes('student') || desc.includes('student') || desc.includes('enrolled') || desc.includes('removed');
        if (!isStudent) return false;
      } else if (filter === 'groups') {
        const isGroup = type.includes('group') || type.includes('transfer') || desc.includes('group') || desc.includes('cohort');
        if (!isGroup) return false;
      } else if (filter === 'staff') {
        const isStaff = type.includes('teacher') || desc.includes('instructor') || desc.includes('staff') || desc.includes('admin');
        if (!isStaff) return false;
      } else if (filter === 'telegram') {
        const isTelegram = desc.includes('telegram') || desc.includes('bot');
        if (!isTelegram) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return desc.includes(q) || actor.includes(q) || type.includes(q);
      }

      return true;
    });
  }, [groupActivityLogs, filter, searchQuery]);

  const visibleLogs = useMemo(() => {
    return filteredLogs.slice(0, displayCount);
  }, [filteredLogs, displayCount]);

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return new Intl.DateTimeFormat(language === 'uz' ? 'uz-UZ' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Archive className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('archiveView.archive_title')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {language === 'uz'
              ? "Markazdagi barcha muhim harakatlar va o'zgarishlarning xronologik auditi."
              : "Chronological audit trail of all core activities and system updates."}
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'uz' ? "Tarix va harakatlarni qidirish..." : "Search logs..."}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'students', 'groups', 'staff', 'telegram'] as const).map((tab) => {
          const isActive = filter === tab;
          const labelMap = {
            all: t('archiveView.filter_all'),
            students: t('archiveView.filter_students'),
            groups: t('archiveView.filter_groups'),
            staff: t('archiveView.filter_staff'),
            telegram: t('archiveView.filter_telegram')
          };
          return (
            <button
              key={tab}
              onClick={() => {
                setFilter(tab);
                setDisplayCount(20);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {labelMap[tab]}
            </button>
          );
        })}
      </div>

      {/* Logs Feed */}
      {visibleLogs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t('archiveView.empty_logs')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleLogs.map((log) => {
            const { studentName, groupName, teacherName } = parseLogMetadata(log);
            const actionTitle = getTranslatedActionTitle(log);

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                      {log.actionType}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {actionTitle}
                  </h3>

                  {/* Metadata tags */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {studentName && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        {language === 'uz' ? 'Talaba' : 'Student'}: <strong className="font-semibold text-slate-900 dark:text-white">{studentName}</strong>
                      </span>
                    )}

                    {groupName && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                        {language === 'uz' ? 'Guruh' : 'Group'}: <strong className="font-semibold text-slate-900 dark:text-white">{groupName}</strong>
                      </span>
                    )}

                    {teacherName && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                        {language === 'uz' ? "O'qituvchi" : 'Teacher'}: <strong className="font-semibold text-slate-900 dark:text-white">{teacherName}</strong>
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                      {language === 'uz' ? 'Bajaruvchi' : 'Performed by'}: <strong className="font-semibold text-slate-900 dark:text-white">{log.actorName || 'System'}</strong>
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Load More Button */}
          {filteredLogs.length > displayCount && (
            <div className="pt-4 text-center">
              <button
                onClick={() => setDisplayCount((prev) => prev + 20)}
                className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                {t('archiveView.load_more')} ({filteredLogs.length - displayCount} more)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
