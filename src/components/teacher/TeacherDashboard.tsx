import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Group } from '../../types';
import { GroupModal } from '../groups/GroupModal';
import { EditGroupModal } from '../groups/EditGroupModal';
import { CohortAnalyticsChart } from './CohortAnalyticsChart';
import {
  BookOpen,
  CalendarCheck2,
  Users,
  Plus,
  Clock,
  ChevronRight,
  Sparkles,
  BarChart2,
  Calendar,
  Edit2
} from 'lucide-react';

interface TeacherDashboardProps {
  onSelectGroup: (groupId: string) => void;
  onNavigateStudents?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onSelectGroup,
  onNavigateStudents
}) => {
  const { currentUser } = useAuth();
  const { groups, students, attendanceRecords } = useData();
  const { language, t } = useLanguage();
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);

  const handleEditClick = (group: Group) => {
    setGroupToEdit(group);
    setIsEditModalOpen(true);
  };

  // Helper to format schedule days based on current language
  const formatSchedule = (schedule: string): string => {
    if (!schedule) return '';
    const dayMap: Record<string, string> = {
      'monday': t('days.monday'),
      'tuesday': t('days.tuesday'),
      'wednesday': t('days.wednesday'),
      'thursday': t('days.thursday'),
      'friday': t('days.friday'),
      'saturday': t('days.saturday'),
      'sunday': t('days.sunday'),
      'mon': t('days.mon'),
      'tue': t('days.tue'),
      'wed': t('days.wed'),
      'thu': t('days.thu'),
      'fri': t('days.fri'),
      'sat': t('days.sat'),
      'sun': t('days.sun'),
    };
    let result = schedule;
    for (const [key, val] of Object.entries(dayMap)) {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      result = result.replace(regex, val);
    }
    return result;
  };

  // Generate past 12 months options
  const monthOptions = useMemo(() => {
    const uzMonths = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
    const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const opts: { value: string; label: string }[] = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const value = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthName = language === 'uz' ? uzMonths[month] : enMonths[month];
      const label = `${monthName} ${year}`;
      opts.push({ value, label });
      date.setMonth(date.getMonth() - 1);
    }
    return opts;
  }, [language]);

  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(monthOptions[0]?.value || '2026-08');

  // Filter groups strictly assigned to this teacher (or created by this teacher)
  const myGroups = groups.filter(
    (g) => g.teacherId === currentUser?.id && !g.archived
  );

  // Compute teacher summary metrics
  const myGroupIds = new Set(myGroups.map((g) => g.id));
  const myStudents = students.filter((s) => myGroupIds.has(s.groupId) && s.status !== 'inactive');

  const uzMonthsArr = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
  const enMonthsArr = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date();
  const currentMonthName = `${language === 'uz' ? uzMonthsArr[now.getMonth()] : enMonthsArr[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="space-y-8 pb-20 md:pb-12 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 overflow-x-hidden">
      {/* Teacher Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 rounded-lg p-6 sm:p-7 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden border-none">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>{t('teacherDashboard.workspace')} • {currentMonthName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {t('dashboard.welcome')}, {currentUser?.name}
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            {t('teacherDashboard.managingSummary', { groups: myGroups.length, students: myStudents.length })}
          </p>
        </div>

        <button
          onClick={() => setIsNewGroupModalOpen(true)}
          className="relative z-10 px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('teacherDashboard.createNewGroup')}</span>
        </button>
      </div>

      {/* Assigned Groups Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('teacherDashboard.myGroups')}</h2>
          </div>

          <button
            onClick={() => setIsNewGroupModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors border border-indigo-200/60 dark:border-indigo-800/60 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('groups.addGroup')}</span>
          </button>
        </div>

        {myGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg border-none p-12 text-center shadow-xs transition-colors">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">{t('teacherDashboard.noGroupsAssigned')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {language === 'uz' ? "Yangi guruh yarating yoki markaz adminidan guruh biriktirishini so'rang." : "Create a new learning cohort or ask the center admin to assign you to an existing group."}
            </p>
            <button
              onClick={() => setIsNewGroupModalOpen(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md text-xs font-bold shadow-xs hover:bg-indigo-700 cursor-pointer"
            >
              {t('teacherDashboard.createNewGroup')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myGroups.map((group) => {
              const groupStudentList = students.filter((s) => s.groupId === group.id && s.status !== 'inactive');

              return (
                <div
                  key={group.id}
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
                        <button
                          id={`edit-group-btn-${group.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(group);
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                          title={t('groups.editGroup') || 'Edit Group'}
                          aria-label="Edit group"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-9 h-9 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Schedule & Enrolled students */}
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{formatSchedule(group.schedule)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>{t('teacherDashboard.enrolledStudents', { count: groupStudentList.length })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => onSelectGroup(group.id)}
                      className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CalendarCheck2 className="w-3.5 h-3.5" />
                      <span>{t('teacherDashboard.takeAttendance')}</span>
                    </button>
                    <button
                      onClick={() => onSelectGroup(group.id)}
                      className="p-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title={t('teacherDashboard.viewDetails')}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Group Modal */}
      <GroupModal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        onSuccess={(groupId) => {
          onSelectGroup(groupId);
        }}
      />

      {/* Edit Group Modal */}
      {isEditModalOpen && groupToEdit && (
        <EditGroupModal
          group={groupToEdit}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setGroupToEdit(null);
          }}
        />
      )}
    </div>
  );
};


