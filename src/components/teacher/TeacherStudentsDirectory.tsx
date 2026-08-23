import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Student } from '../../types';
import { StudentModal } from '../students/StudentModal';
import { StudentProfileDrawer } from '../students/StudentProfileDrawer';
import {
  Users,
  Search,
  Plus,
  ArrowUpDown,
  BookOpen,
  Calendar,
  Phone,
  FileText,
  MoreVertical
} from 'lucide-react';

interface TeacherStudentsDirectoryProps {
  onSelectGroup: (groupId: string) => void;
}

export const TeacherStudentsDirectory: React.FC<TeacherStudentsDirectoryProps> = ({
  onSelectGroup: _onSelectGroup
}) => {
  const { currentUser } = useAuth();
  const { students, groups } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [profileDrawerStudent, setProfileDrawerStudent] = useState<Student | null>(null);
  const [activeMenuStudentId, setActiveMenuStudentId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  // Scoped strictly to the active teacher's groups
  const myGroups = useMemo(() => {
    return groups.filter((g) => g.teacherId === currentUser?.id);
  }, [groups, currentUser]);

  const myGroupIds = useMemo(() => {
    return new Set(myGroups.map((g) => g.id));
  }, [myGroups]);

  // Filter and sort students belonging only to this teacher
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => myGroupIds.has(s.groupId))
      .filter((s) => {
        const fullName = `${s.firstName} ${s.surname}`.toLowerCase();
        const matchesSearch = !searchQuery.trim() || fullName.includes(searchQuery.trim().toLowerCase());
        const matchesGroup = selectedGroupFilter === 'all' || s.groupId === selectedGroupFilter;
        return matchesSearch && matchesGroup;
      })
      .sort((a, b) => {
        const dateA = new Date(a.enrolledDate || 0).getTime();
        const dateB = new Date(b.enrolledDate || 0).getTime();
        return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
      });
  }, [students, myGroupIds, searchQuery, selectedGroupFilter, sortOrder]);

  const totalMyStudents = useMemo(() => {
    return students.filter((s) => myGroupIds.has(s.groupId)).length;
  }, [students, myGroupIds]);

  const handleAddNew = () => {
    setStudentToEdit(null);
    setIsStudentModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border-none shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-full w-fit mb-1.5 border border-indigo-200/60 dark:border-indigo-800/60">
            <Users className="w-3.5 h-3.5" />
            <span>Assigned Roster</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            My Students
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete list of students enrolled in your groups
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAddNew}
            disabled={myGroups.length === 0}
            className="px-4 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll in Class</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border-none shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md text-xs sm:text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter and Sort controls */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Group Filter */}
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 outline-none flex-1 sm:flex-none"
          >
            <option value="all">My Groups ({totalMyStudents})</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Sort order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all hover:-translate-y-0.5 active:scale-95 shrink-0 cursor-pointer"
            title="Toggle chronological sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">
              {sortOrder === 'oldest' ? 'Added: Oldest First' : 'Added: Newest First'}
            </span>
          </button>
        </div>
      </div>

      {/* Directory Table / Minimalist Flat List */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border-none overflow-hidden shadow-xs transition-colors">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
              {filteredStudents.length} {filteredStudents.length === 1 ? 'Student' : 'Students'}
            </span>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            {searchQuery
              ? `No students found matching "${searchQuery}".`
              : "No students found. Click 'Add Student' to enroll your first student."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
               <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3 w-16">#</th>
                  <th className="px-5 py-3">Student Name</th>
                  <th className="px-5 py-3 text-right sticky right-0 bg-slate-50 dark:bg-slate-950/90 z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredStudents.map((student, idx) => {
                  const isAssigned = Boolean(student.groupId && groups.some((g) => g.id === student.groupId && !g.archived));
                  return (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(idx * 0.015, 0.25) }}
                      className={`transition-colors ${
                        isAssigned
                          ? 'bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                          : 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
                      }`}
                    >
                      <td className="px-5 py-3 text-slate-400 dark:text-slate-500 font-mono text-xs w-16">
                        {idx + 1}
                      </td>

                      {/* Student Name */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                            {student.firstName.charAt(0)}
                            {student.surname.charAt(0)}
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                              <span>{student.firstName} {student.surname}</span>
                              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                                #{student.studentId || student.id.slice(-5)}
                              </span>
                            </div>
                            <div>
                              {isAssigned ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                                  Assigned
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                                  Unassigned
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Actions 3-dot menu */}
                      <td className="px-5 py-3 text-right whitespace-nowrap relative sticky right-0 bg-white dark:bg-slate-900 z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              if (activeMenuStudentId === student.id) {
                                setActiveMenuStudentId(null);
                                setMenuPosition(null);
                              } else {
                                setActiveMenuStudentId(student.id);
                                setMenuPosition({
                                  top: rect.bottom + 4,
                                  right: window.innerWidth - rect.right
                                });
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Global Fixed Action Menu Dropdown */}
      {activeMenuStudentId && menuPosition && (
        <>
          <div
            className="fixed inset-0 z-[99999]"
            onClick={() => {
              setActiveMenuStudentId(null);
              setMenuPosition(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: menuPosition.top,
              right: menuPosition.right,
              zIndex: 100000
            }}
            className="w-44 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 text-left"
          >
            <button
              onClick={() => {
                const targetStudent = students.find((s) => s.id === activeMenuStudentId);
                setActiveMenuStudentId(null);
                setMenuPosition(null);
                if (targetStudent) setProfileDrawerStudent(targetStudent);
              }}
              className="w-full px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Check Profile</span>
            </button>
            <button
              onClick={() => {
                const targetStudent = students.find((s) => s.id === activeMenuStudentId);
                setActiveMenuStudentId(null);
                setMenuPosition(null);
                if (targetStudent) {
                  setStudentToEdit(targetStudent);
                  setIsStudentModalOpen(true);
                }
              }}
              className="w-full px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Edit Student</span>
            </button>
          </div>
        </>
      )}



      {/* Student Enrollment / Edit Modal */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setStudentToEdit(null);
        }}
        groupId={myGroups[0]?.id || ''}
        studentToEdit={studentToEdit}
      />

      {/* Student Profile Drawer */}
      <StudentProfileDrawer
        isOpen={Boolean(profileDrawerStudent)}
        onClose={() => setProfileDrawerStudent(null)}
        student={profileDrawerStudent}
      />
    </div>
  );
};
