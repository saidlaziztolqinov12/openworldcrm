import React, { useState, useEffect, useMemo } from 'react';
import { Student } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { X, UserPlus, Calendar, FileText, GraduationCap, ArrowRightLeft } from 'lucide-react';
import { PhoneInput } from '../common/PhoneInput';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  studentToEdit?: Student | null;
  onSuccess?: () => void;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  groupId,
  studentToEdit,
  onSuccess
}) => {
  const { groups, addStudent, updateStudent, transferStudent } = useData();
  const { isAdmin, currentUser } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [parentPhone, setParentPhone] = useState('+998901234567');
  const [birthDate, setBirthDate] = useState('2009-05-15');
  const [notes, setNotes] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(groupId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReassignConfirm, setShowReassignConfirm] = useState(false);

  // Groups eligible for this user (memoized to prevent new array references on every keystroke render)
  const availableGroups = useMemo(() => {
    return isAdmin
      ? groups.filter((g) => !g.archived)
      : groups.filter((g) => g.teacherId === currentUser?.id && !g.archived);
  }, [groups, isAdmin, currentUser?.id]);

  useEffect(() => {
    if (!isOpen) return;

    if (studentToEdit) {
      setFirstName(studentToEdit.firstName || '');
      setSurname(studentToEdit.surname || '');
      setParentPhone(studentToEdit.parentPhone || '+998901234567');
      setBirthDate(studentToEdit.birthDate || '2009-05-15');
      setNotes(studentToEdit.notes || '');
      setSelectedGroupId(studentToEdit.groupId || groupId || availableGroups[0]?.id || '');
    } else {
      setFirstName('');
      setSurname('');
      setParentPhone('+998901234567');
      setBirthDate('2009-05-15');
      setNotes('');
      setSelectedGroupId(groupId || availableGroups[0]?.id || '');
    }
    setError('');
    setShowReassignConfirm(false);
  }, [isOpen, studentToEdit, groupId]);

  // Keep selectedGroupId populated if availableGroups loads after initial render
  useEffect(() => {
    if (isOpen && !selectedGroupId && availableGroups.length > 0) {
      setSelectedGroupId(groupId || availableGroups[0].id);
    }
  }, [isOpen, selectedGroupId, availableGroups, groupId]);

  if (!isOpen) return null;

  const executeSave = async () => {
    setLoading(true);
    setError('');
    const cleanPhone = parentPhone.trim();
    try {
      if (studentToEdit) {
        // If group changed, ensure transfer metadata & isolated history are preserved
        if (selectedGroupId !== studentToEdit.groupId) {
          await transferStudent(studentToEdit.id, selectedGroupId);
        }
        await updateStudent(studentToEdit.id, {
          firstName: firstName.trim(),
          surname: surname.trim(),
          parentPhone: cleanPhone,
          birthDate,
          notes: notes.trim(),
          groupId: selectedGroupId
        });
      } else {
        await addStudent({
          firstName: firstName.trim(),
          surname: surname.trim(),
          parentPhone: cleanPhone,
          birthDate,
          notes: notes.trim(),
          groupId: selectedGroupId,
          enrolledDate: new Date().toISOString().substring(0, 10),
          status: 'active'
        });
      }
      setShowReassignConfirm(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save student record.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !surname.trim()) {
      setError('Please provide student first name and surname');
      return;
    }
    const cleanPhone = parentPhone.trim();
    if (!cleanPhone || cleanPhone === '+998' || cleanPhone.length < 9) {
      setError('Please enter a valid phone number with Uzbekistan country code (+998)');
      return;
    }

    // If an existing student is changing cohorts, require confirmation prompt
    if (studentToEdit && selectedGroupId !== studentToEdit.groupId) {
      setShowReassignConfirm(true);
      return;
    }

    executeSave();
  };

  const targetGroupName = groups.find((g) => g.id === selectedGroupId)?.name || 'Selected Cohort';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {studentToEdit ? 'Edit Student Profile' : 'Enroll New Student'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {studentToEdit ? 'Update student details and assigned cohort' : 'Add student to learning center registry'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Group assignment selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Assigned Cohort / Group
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <GraduationCap className="w-4 h-4" />
              </div>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {availableGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.schedule}) — {g.teacherName}
                  </option>
                ))}
              </select>
            </div>
            {studentToEdit && selectedGroupId !== studentToEdit.groupId && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                <ArrowRightLeft className="w-3 h-3" />
                Changing cohort requires confirmation upon saving.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Jasur"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Surname *
              </label>
              <input
                type="text"
                required
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="e.g. Karimov"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Parent phone */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Parent Contact Phone (SMS / Notification) *
            </label>
            <PhoneInput
              required
              value={parentPhone}
              onChange={setParentPhone}
              placeholder="90 123 4567"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Uzbekistan mobile number format (+998)</p>
          </div>

          {/* Birth date */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Date of Birth
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Academic Notes / Targets
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Target score IELTS 7.5, excellent in Speaking & Vocabulary."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving...' : studentToEdit ? 'Save Changes' : 'Enroll Student'}
            </button>
          </div>
        </form>
      </div>

      {/* ================= REASSIGNMENT CONFIRMATION MODAL ================= */}
      {showReassignConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <ArrowRightLeft className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Confirm Group Reassignment
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Confirm group reassignment for{' '}
                <strong className="text-slate-900 dark:text-white">
                  {firstName} {surname}
                </strong>{' '}
                to <strong className="text-indigo-600 dark:text-indigo-400">{targetGroupName}</strong>?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReassignConfirm(false)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSave}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Reassigning...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

