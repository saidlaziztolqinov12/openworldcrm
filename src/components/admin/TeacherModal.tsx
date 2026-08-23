import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { useData } from '../../context/DataContext';
import { X, UserCheck, Mail, Briefcase, Lock, Sparkles, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { PhoneInput } from '../common/PhoneInput';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherToEdit?: User | null;
  onSuccess?: () => void;
}

export const TeacherModal: React.FC<TeacherModalProps> = ({
  isOpen,
  onClose,
  teacherToEdit,
  onSuccess
}) => {
  const { addTeacher, updateTeacher } = useData();

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [title, setTitle] = useState('Mr.');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarColor, setAvatarColor] = useState('bg-indigo-600');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const AVATAR_COLORS = [
    { label: 'Indigo', value: 'bg-indigo-600' },
    { label: 'Blue', value: 'bg-blue-600' },
    { label: 'Sky', value: 'bg-sky-600' },
    { label: 'Emerald', value: 'bg-emerald-600' },
    { label: 'Violet', value: 'bg-violet-600' },
    { label: 'Rose', value: 'bg-rose-600' }
  ];

  const TITLE_OPTIONS = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Instructor'];

  useEffect(() => {
    if (!isOpen) return;

    if (teacherToEdit) {
      setFirstName(teacherToEdit.firstName || teacherToEdit.name.split(' ')[0] || '');
      setSurname(teacherToEdit.surname || teacherToEdit.name.split(' ').slice(1).join(' ') || '');
      setEmail(teacherToEdit.email);
      setPhone(teacherToEdit.phone || '+998 ');
      setTitle(teacherToEdit.title || 'Mr.');
      setSubject(teacherToEdit.subject || '');
      setPassword(teacherToEdit.password || '');
      setAvatarColor(teacherToEdit.avatarColor || 'bg-indigo-600');
    } else {
      setFirstName('');
      setSurname('');
      setEmail('');
      setPhone('+998 ');
      setTitle('Mr.');
      setSubject('');
      setPassword('');
      setAvatarColor('bg-indigo-600');
    }
    setError('');
  }, [teacherToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !surname.trim()) {
      setError('Please provide both First Name and Surname.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required for instructor account sign-in.');
      return;
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone === '+998' || cleanPhone.length < 9) {
      setError('Please provide a valid Uzbekistan phone number (+998).');
      return;
    }
    if (!subject.trim()) {
      setError('Please enter a Job Title or Subject Specialty (e.g. English).');
      return;
    }
    if (!teacherToEdit && !password.trim()) {
      setError('Please set a password for the teacher account.');
      return;
    }

    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${surname.trim()}`;
      if (teacherToEdit) {
        await updateTeacher(teacherToEdit.id, {
          name: fullName,
          firstName: firstName.trim(),
          surname: surname.trim(),
          email: email.trim().toLowerCase(),
          phone: cleanPhone,
          title: title.trim(),
          subject: subject.trim(),
          password: password.trim() ? password.trim() : teacherToEdit.password,
          avatarColor
        });
      } else {
        await addTeacher({
          name: fullName,
          firstName: firstName.trim(),
          surname: surname.trim(),
          email: email.trim().toLowerCase(),
          role: 'teacher',
          phone: cleanPhone,
          title: title.trim(),
          subject: subject.trim(),
          password: password.trim(),
          avatarColor
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save teacher information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-600/25">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {teacherToEdit ? 'Edit Teacher Profile' : 'Add New Teacher'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Faculty account credentials & subject specialty</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          {/* First Name & Surname */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Jasur"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Surname <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  required
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="e.g. Aliyev"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Title & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Title
              </label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              >
                {TITLE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <PhoneInput
                required
                value={phone}
                onChange={setPhone}
                placeholder="90 234 5678"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Email (Used for Login) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher.name@center.com"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Job Title / Subject Specialty */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Job Title / Subject Specialty <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Briefcase className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. English, Mathematics, STEM & Robotics"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              {teacherToEdit ? 'New Password (leave empty to keep current)' : 'Account Password *'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required={!teacherToEdit}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="e.g. teacher123"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Avatar color */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Profile Avatar Color
            </label>
            <div className="flex items-center gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setAvatarColor(c.value)}
                  className={`w-8 h-8 rounded-full ${c.value} transition-transform cursor-pointer ${
                    avatarColor === c.value ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving...' : teacherToEdit ? 'Save Changes' : 'Create Teacher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
