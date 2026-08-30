import React from 'react';
import { Group, Student } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { BookOpen, Clock, Users, CalendarCheck2, ChevronRight, Edit2 } from 'lucide-react';

export interface GroupCardProps {
  group: Group;
  students?: Student[];
  studentCount?: number;
  onSelect: (groupId: string) => void;
  onEdit?: (group: Group) => void;
  formatSchedule?: (schedule: string) => string;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  students = [],
  studentCount,
  onSelect,
  onEdit,
  formatSchedule
}) => {
  const { t } = useLanguage();
  const count = studentCount !== undefined ? studentCount : students.filter((s) => s.groupId === group.id && s.status !== 'inactive').length;

  const displaySchedule = formatSchedule ? formatSchedule(group.schedule) : group.schedule;

  return (
    <div
      id={`group-card-${group.id}`}
      className="bg-white dark:bg-slate-900 rounded-md border-none p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug truncate">
              {group.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onEdit && (
              <button
                id={`edit-group-btn-${group.id}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(group);
                }}
                className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                title={t('groups.editGroup') || 'Edit Group'}
                aria-label="Edit group"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="w-9 h-9 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Schedule & Enrolled students */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">{displaySchedule}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span>{t('teacherDashboard.enrolledStudents', { count })}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <button
          id={`take-attendance-btn-${group.id}`}
          onClick={() => onSelect(group.id)}
          className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <CalendarCheck2 className="w-3.5 h-3.5" />
          <span>{t('teacherDashboard.takeAttendance')}</span>
        </button>
        <button
          id={`view-details-btn-${group.id}`}
          onClick={() => onSelect(group.id)}
          className="p-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={t('teacherDashboard.viewDetails')}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
