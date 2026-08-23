import React, { useState, useEffect } from 'react';
import { Group, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { X, BookOpen, Clock, UserCheck } from 'lucide-react';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupToEdit?: Group | null;
  onSuccess?: (groupId: string) => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  groupToEdit,
  onSuccess
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { teachers, addGroup, updateGroup } = useData();

  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (groupToEdit) {
      setName(groupToEdit.name || '');
      setSchedule(groupToEdit.schedule || '');
      setTeacherId(groupToEdit.teacherId || '');
    } else {
      setName('');
      setSchedule('Mon/Wed/Fri 10:00 AM - 11:30 AM');
      // If teacher is creating, assign to themselves; if admin, assign to first teacher
      if (isAdmin) {
        setTeacherId(teachers[0]?.id || '');
      } else {
        setTeacherId(currentUser?.id || teachers[0]?.id || '');
      }
    }
    setError('');
  }, [isOpen, groupToEdit, isAdmin, currentUser?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    if (!schedule.trim()) {
      setError('Schedule details are required');
      return;
    }
    if (!teacherId) {
      setError('Please assign a teacher to this group');
      return;
    }

    const assignedTeacher = teachers.find((t) => t.id === teacherId);
    const teacherName = assignedTeacher ? assignedTeacher.name : (currentUser?.name || 'Assigned Teacher');

    setLoading(true);
    try {
      if (groupToEdit) {
        await updateGroup(groupToEdit.id, {
          name: name.trim(),
          schedule: schedule.trim(),
          teacherId,
          teacherName
        });
        if (onSuccess) onSuccess(groupToEdit.id);
      } else {
        const newId = await addGroup({
          name: name.trim(),
          schedule: schedule.trim(),
          teacherId,
          teacherName,
          archived: false
        });
        if (onSuccess) onSuccess(newId);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {groupToEdit ? 'Edit Learning Group' : 'Create New Group'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {groupToEdit ? 'Update group title, schedule, or assigned teacher' : 'Set up a new cohort and schedule'}
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Group Title / Subject
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. IELTS Mastery 7.5+, General English B2"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Weekly Schedule & Time
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Clock className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="e.g. Mon/Wed/Fri 10:00 AM - 11:30 AM"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Teacher Assignment */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Assigned Instructor / Teacher
            </label>
            {isAdmin ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <UserCheck className="w-4 h-4" />
                </div>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none transition-colors"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.title || 'Teacher'})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium">
                <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Assigned to You: <strong>{currentUser?.name}</strong></span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving...' : groupToEdit ? 'Update Group' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
