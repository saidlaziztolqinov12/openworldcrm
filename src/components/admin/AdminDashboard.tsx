import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Group, User } from '../../types';
import { GroupModal } from '../groups/GroupModal';
import { TeacherModal } from './TeacherModal';
import { AnimatedCounter } from '../common/AnimatedCounter';
import {
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck2,
  Plus,
  Clock,
  UserCheck,
  TrendingUp,
  Search,
  Edit2,
  Archive,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  Trash2
} from 'lucide-react';

interface AdminDashboardProps {
  onSelectGroup: (groupId: string) => void;
  onNavigateTeachers: () => void;
  onNavigateAnalytics: () => void;
  onNavigateStudents?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSelectGroup,
  onNavigateTeachers,
  onNavigateAnalytics,
  onNavigateStudents
}) => {
  const {
    groups,
    teachers,
    students,
    attendanceRecords,
    archiveGroup,
    deleteGroup,
    reassignTeacher,
    migrateMissingStudentIds
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleRunMigration = async () => {
    try {
      const count = await migrateMissingStudentIds();
      setToastMessage(`Successfully assigned unique 5-digit IDs to ${count} students!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e) {
      console.error(e);
      setToastMessage('Migration failed.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Modals
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);

  // Center-wide KPI computations
  const activeGroups = groups.filter((g) => !g.archived);
  const totalActiveStudents = students.filter((s) => s.status !== 'inactive').length;

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const monthRecords = attendanceRecords.filter((r) => r.date.startsWith(currentMonthStr));
  const totalLessonsConductedThisMonth = monthRecords.length;

  // Global attendance rate (Present vs Absent)
  let totalStatusEntries = 0;
  let presentEntries = 0;
  attendanceRecords.forEach((rec) => {
    Object.values(rec.statusMap || {}).forEach((st) => {
      totalStatusEntries++;
      if (st === 'present') {
        presentEntries++;
      }
    });
  });
  const globalAttendanceRate =
    totalStatusEntries > 0 ? Math.round((presentEntries / totalStatusEntries) * 100) : 95;

  // Filter groups
  const filteredGroups = groups
    .filter((g) => (showArchived ? true : !g.archived))
    .filter((g) => (selectedTeacherFilter === 'all' ? true : g.teacherId === selectedTeacherFilter))
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
    const t = teachers.find((tech) => tech.id === newTeacherId);
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
      {/* Admin Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 rounded-lg p-6 sm:p-7 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden border-none">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Center Director Hub • Global Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Learning Center Management
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Monitor center-wide performance, reassign instructors, manage student rosters, and inspect attendance in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={handleRunMigration}
            className="px-3.5 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            title="Assign 5-digit unique IDs to any students missing them"
          >
            <span>Assign 5-Digit IDs</span>
          </button>

          <button
            onClick={() => setIsTeacherModalOpen(true)}
            className="px-4 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Add Teacher</span>
          </button>

          <button
            onClick={() => {
              setGroupToEdit(null);
              setIsNewGroupModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Group</span>
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
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">Active Students</span>
            <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                <AnimatedCounter value={totalActiveStudents} durationMs={3000} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Enrolled across all groups</p>
            </div>
            {onNavigateStudents && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                View All →
              </span>
            )}
          </div>
        </div>

        {/* Active Groups */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Active Groups</span>
            <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <BookOpen className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              <AnimatedCounter value={activeGroups.length} durationMs={3000} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              <AnimatedCounter value={teachers.length} durationMs={3000} /> Active Instructors
            </p>
          </div>
        </div>

        {/* Lessons this month */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Sessions Logged</span>
            <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              <AnimatedCounter value={totalLessonsConductedThisMonth} durationMs={3000} />
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
              Conducted this month
            </p>
          </div>
        </div>

        {/* Global Attendance Rate */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Center Attendance</span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              <AnimatedCounter value={globalAttendanceRate} suffix="%" durationMs={3000} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Average presence rate</p>
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
                placeholder="Search groups, schedule, teacher..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
              />
            </div>

            {/* Filter by Teacher */}
            <select
              value={selectedTeacherFilter}
              onChange={(e) => setSelectedTeacherFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 outline-none transition-colors"
            >
              <option value="all">All Teachers ({teachers.length})</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
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
              <span>Show Archived</span>
            </label>

            <button
              onClick={() => {
                setGroupToEdit(null);
                setIsNewGroupModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Group</span>
            </button>
          </div>
        </div>

        {/* Groups Grid */}
        {filteredGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg border-none p-12 text-center shadow-xs transition-colors">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">No learning groups found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first learning cohort to get started.'}
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
                            Archived
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
                          title="Edit Group"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => archiveGroup(group.id, !group.archived)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title={group.archived ? 'Restore Group' : 'Archive Group'}
                        >
                          {group.archived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setGroupToDelete(group)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Delete Group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Schedule & Student Counts */}
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{group.schedule}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span><strong>{groupStudentsList.length}</strong> Enrolled Students</span>
                      </div>
                    </div>

                    {/* Teacher Reassignment Dropdown */}
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-md border border-slate-100 dark:border-slate-700/60">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Assigned Teacher (Admin Reassign)
                      </label>
                      <select
                        value={group.teacherId}
                        onChange={(e) => handleTeacherReassignChange(group.id, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.title || 'Teacher'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Open Roster / Register */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => onSelectGroup(group.id)}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Roster & Attendance</span>
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
                Delete Group
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900 dark:text-white">
                  "{groupToDelete.name}"
                </strong>? All associated records will be removed.
              </p>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
              Enrolled students will be automatically unassigned and marked as ready for new cohort placement.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setGroupToDelete(null)}
                disabled={isDeletingGroup}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGroup}
                disabled={isDeletingGroup}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingGroup ? 'Deleting...' : 'Delete Group'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
