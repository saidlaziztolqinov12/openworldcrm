import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Group, User } from '../../types';
import { GroupModal } from '../groups/GroupModal';
import { TeacherModal } from './TeacherModal';
import { AdminModal } from './AdminModal';
import { AnimatedCounter } from '../common/AnimatedCounter';
import { getLocalMonth } from '../../lib/dateUtils';
import { getAvailableInstructors } from '../../lib/teacherUtils';
import {
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck2,
  Plus,
  Clock,
  UserCheck,
  UserPlus,
  Search,
  Edit2,
  Archive,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  Trash2,
  Wallet
} from 'lucide-react';

interface AdminDashboardProps {
  onSelectGroup: (groupId: string) => void;
  onNavigateTeachers: () => void;
  onNavigateAnalytics: () => void;
  onNavigateStudents?: () => void;
  onNavigateSalaryAdvances: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSelectGroup,
  onNavigateTeachers,
  onNavigateAnalytics,
  onNavigateStudents,
  onNavigateSalaryAdvances
}) => {
  const {
    groups,
    users,
    teachers,
    students,
    attendanceRecords,
    archiveGroup,
    deleteGroup,
    reassignTeacher
  } = useData();
  const { currentUser, isSuperAdmin } = useAuth();
  const { t, language } = useLanguage();

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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);

  // Available teachers: teachers + strictly ONE superadmin (with teaching capability)
  const availableTeachers = useMemo(() => {
    return getAvailableInstructors(users, teachers, currentUser, isSuperAdmin);
  }, [users, teachers, currentUser, isSuperAdmin]);

  // Center-wide KPI computations
  const activeGroups = groups.filter((g) => !g.archived);
  const totalActiveStudents = students.filter((s) => s.status !== 'inactive').length;

  const currentMonthStr = getLocalMonth();
  const monthRecords = attendanceRecords.filter((r) => r.date.startsWith(currentMonthStr));
  const totalLessonsConductedThisMonth = monthRecords.length;

  // Groups taught by current admin
  const myTeachingGroupsCount = groups.filter(
    (g) =>
      (g.teacherId === currentUser?.id ||
        (currentUser?.uid && g.teacherId === currentUser.uid) ||
        g.teacherId === 'admin-1') &&
      !g.archived
  ).length;

  // Filter groups
  const filteredGroups = groups
    .filter((g) => (showArchived ? true : !g.archived))
    .filter((g) => {
      if (selectedTeacherFilter === 'all') return true;

      const isSuperAdminFilter =
        selectedTeacherFilter === currentUser?.id ||
        (currentUser?.uid && selectedTeacherFilter === currentUser.uid) ||
        selectedTeacherFilter === 'admin-1' ||
        availableTeachers.some(
          (t) =>
            t.id === selectedTeacherFilter &&
            (t.role === 'super_admin' || (t.role as any) === 'superadmin')
        );

      if (isSuperAdminFilter) {
        return (
          g.teacherId === selectedTeacherFilter ||
          g.teacherId === currentUser?.id ||
          (currentUser?.uid && g.teacherId === currentUser.uid) ||
          g.teacherId === 'admin-1'
        );
      }
      return g.teacherId === selectedTeacherFilter;
    })
    .filter((g) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        g.schedule.toLowerCase().includes(q) ||
        g.teacherName.toLowerCase().includes(q)
      );
    });

  const handleTeacherReassignChange = async (groupId: string, newTeacherId: string) => {
    const t = availableTeachers.find((tech) => tech.id === newTeacherId) || users.find((u) => u.id === newTeacherId) || teachers.find((tech) => tech.id === newTeacherId);
    if (t) {
      await reassignTeacher(groupId, t.id, t.name);
    }
  };

  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsDeletingGroup(true);
    try {
      await deleteGroup(groupToDelete.id);
      setGroupToDelete(null);
    } catch (err) {
      console.error('Failed to delete group:', err);
    } finally {
      setIsDeletingGroup(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 overflow-x-hidden">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3">
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Admin Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 rounded-lg p-6 sm:p-7 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden border-none">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>{t('adminDashboard.hub')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {t('adminDashboard.title')}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full sm:w-auto md:min-w-[340px] relative z-10">
          <button
            onClick={onNavigateSalaryAdvances}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-md font-medium text-xs sm:text-sm transition-all shadow-sm bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-slate-600 cursor-pointer"
            title="Manage Teacher Salary Advances"
          >
            <Wallet className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">{t('adminDashboard.salaryAdvances')}</span>
          </button>

          <button
            onClick={() => setIsAddAdminModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-md font-medium text-xs sm:text-sm transition-all shadow-sm bg-purple-950 hover:bg-purple-900 text-purple-100 border border-purple-700 hover:border-purple-500 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-purple-300 shrink-0" />
            <span className="truncate">{t('adminDashboard.addAdmin')}</span>
          </button>

          <button
            onClick={() => setIsTeacherModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-md font-medium text-xs sm:text-sm transition-all shadow-sm bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700/80 hover:border-slate-600 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">{t('adminDashboard.addTeacher')}</span>
          </button>

          <button
            onClick={() => {
              setGroupToEdit(null);
              setIsNewGroupModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-md font-medium text-xs sm:text-sm transition-all shadow-sm bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/80 shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white shrink-0" />
            <span className="truncate">{t('adminDashboard.createGroup')}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div
          onClick={onNavigateStudents}
          className={`bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs transition-all duration-300 ${
            onNavigateStudents ? 'cursor-pointer hover:shadow-md hover:-translate-y-1 group' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">{t('adminDashboard.activeStudents')}</span>
            <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                <AnimatedCounter value={totalActiveStudents} durationMs={3000} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{t('adminDashboard.enrolledAcross')}</p>
            </div>
            {onNavigateStudents && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {t('adminDashboard.viewAll')}
              </span>
            )}
          </div>
        </div>

        {/* Active Groups */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('adminDashboard.activeGroups')}</span>
            <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <BookOpen className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              <AnimatedCounter value={activeGroups.length} durationMs={3000} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              <AnimatedCounter value={teachers.length} durationMs={3000} /> {t('adminDashboard.activeInstructors')}
            </p>
          </div>
        </div>

        {/* Lessons this month */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('adminDashboard.sessionsLogged')}</span>
            <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              <AnimatedCounter value={totalLessonsConductedThisMonth} durationMs={3000} />
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
              {t('adminDashboard.conductedThisMonth')}
            </p>
          </div>
        </div>

        {/* Total Teachers */}
        <div
          onClick={onNavigateTeachers}
          className="bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-1 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">{t('adminDashboard.totalTeachers')}</span>
            <div className="w-8 h-8 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                <AnimatedCounter value={teachers.length} durationMs={3000} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{t('adminDashboard.activeInstructorsLower')}</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {t('adminDashboard.manage')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Groups Section */}
      <div className="space-y-4">
        {/* Filters & Actions Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-lg border-none shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('adminDashboard.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
              />
            </div>

            {/* Quick Toggle: All Groups vs My Groups */}
            {myTeachingGroupsCount > 0 && (
              <div className="flex items-center rounded-md bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedTeacherFilter('all')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                    selectedTeacherFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {language === 'uz' ? 'Barcha guruhlar' : 'All Cohorts'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTeacherFilter(currentUser?.id || '')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                    selectedTeacherFilter === currentUser?.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {language === 'uz' ? 'Mening guruhlarim' : 'My Groups'} ({myTeachingGroupsCount})
                </button>
              </div>
            )}

            {/* Filter by Teacher */}
            <select
              value={selectedTeacherFilter}
              onChange={(e) => setSelectedTeacherFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 outline-none transition-colors"
            >
              <option value="all">{t('adminDashboard.allTeachers', { count: availableTeachers.length })}</option>
              {availableTeachers.map((t) => {
                const isSuper = t.role === 'super_admin' || (t.role as any) === 'superadmin' || t.id === 'admin-1';
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} {isSuper ? '(Super Admin & Instructor)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
              <span>{t('adminDashboard.showArchived')}</span>
            </label>

            <button
              onClick={() => {
                setGroupToEdit(null);
                setIsNewGroupModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('adminDashboard.newGroup')}</span>
            </button>
          </div>
        </div>

        {/* Groups Grid */}
        {filteredGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg border-none p-12 text-center shadow-xs transition-colors">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">{t('adminDashboard.noGroupsFound')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery ? t('adminDashboard.tryAdjusting') : t('adminDashboard.createFirst')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGroups.map((group) => {
              const groupStudentsList = students.filter((s) => s.groupId === group.id && s.status !== 'inactive');

              return (
                <div
                  key={group.id}
                  className={`bg-white dark:bg-slate-900 rounded-md border-none p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between ${
                    group.archived ? 'opacity-60 bg-slate-50 dark:bg-slate-900/60' : ''
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {group.archived && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {t('adminDashboard.archived')}
                          </span>
                        )}
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-1 leading-snug">
                          {group.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setGroupToEdit(group);
                            setIsNewGroupModalOpen(true);
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title={t('adminDashboard.editGroup')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => archiveGroup(group.id, !group.archived)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title={group.archived ? t('adminDashboard.restoreGroup') : t('adminDashboard.archiveGroup')}
                        >
                          {group.archived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setGroupToDelete(group)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title={t('adminDashboard.deleteGroup')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Schedule & Student Counts */}
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{formatSchedule(group.schedule)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>{t('adminDashboard.enrolledStudents', { count: groupStudentsList.length })}</span>
                      </div>
                    </div>

                    {/* Teacher Reassignment Dropdown */}
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-md border border-slate-100 dark:border-slate-700/60">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        {t('adminDashboard.assignedTeacher')}
                      </label>
                      <select
                        value={
                          availableTeachers.some((t) => t.id === group.teacherId)
                            ? group.teacherId
                            : (group.teacherId === 'admin-1' ||
                               group.teacherId === currentUser?.id ||
                               (currentUser?.uid && group.teacherId === currentUser.uid))
                            ? (availableTeachers.find(
                                (t) =>
                                  t.role === 'super_admin' ||
                                  (t.role as any) === 'superadmin' ||
                                  t.id === 'admin-1'
                              )?.id || group.teacherId)
                            : group.teacherId
                        }
                        onChange={(e) => handleTeacherReassignChange(group.id, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {availableTeachers.map((t) => {
                          const isSuper = t.role === 'super_admin' || (t.role as any) === 'superadmin' || t.id === 'admin-1';
                          return (
                            <option key={t.id} value={t.id}>
                              {t.name} {isSuper ? '(Super Admin & Instructor)' : `(${t.title || 'Teacher'})`}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Open Roster / Register */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => onSelectGroup(group.id)}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{t('adminDashboard.openRoster')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <GroupModal
        isOpen={isNewGroupModalOpen}
        onClose={() => {
          setIsNewGroupModalOpen(false);
          setGroupToEdit(null);
        }}
        groupToEdit={groupToEdit}
      />

      <TeacherModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        onSuccess={() => {
          setToastMessage(t('adminDashboard.accountCreated'));
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />

      {/* Delete Group Strict Confirmation Modal */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {t('adminDashboard.deleteGroup')}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t('adminDashboard.deleteConfirmText').replace('{name}', groupToDelete.name)}
              </p>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
              {t('adminDashboard.deleteWarning')}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setGroupToDelete(null)}
                disabled={isDeletingGroup}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGroup}
                disabled={isDeletingGroup}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingGroup ? t('adminDashboard.deleting') : t('adminDashboard.deleteGroup')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      <AdminModal
        isOpen={isAddAdminModalOpen}
        onClose={() => setIsAddAdminModalOpen(false)}
        onSuccess={() => {
          setToastMessage(t('adminDashboard.adminCreated'));
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />
    </div>
  );
};
