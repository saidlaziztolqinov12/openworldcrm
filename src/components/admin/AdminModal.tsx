import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { useData } from '../../context/DataContext';
import { formatAuthLogin } from '../../lib/authUtils';
import { X, ShieldCheck, Mail, Phone, Lock, User as UserIcon, Eye, EyeOff, Sparkles, Check } from 'lucide-react';
import { PhoneInput } from '../common/PhoneInput';
import { NOTIONIST_AVATARS } from './TeacherModal';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminToEdit?: User | null;
  onSuccess?: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  adminToEdit,
  onSuccess
}) => {
  const { addAdmin, updateTeacher } = useData();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [title, setTitle] = useState('Administrator');
  const [avatar, setAvatar] = useState(NOTIONIST_AVATARS[0].url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (adminToEdit) {
      setName(adminToEdit.name || '');
      setUsername(adminToEdit.username || adminToEdit.email?.split('@')[0] || '');
      setEmail(adminToEdit.email || '');
      setPhone(adminToEdit.phone || '+998 ');
      setPassword(adminToEdit.password || '');
      setTitle(adminToEdit.title || 'Administrator');
      setAvatar(adminToEdit.avatar || NOTIONIST_AVATARS[0].url);
    } else {
      setName('');
      setUsername('');
      setEmail('');
      setPhone('+998 ');
      setPassword('');
      setTitle('Administrator');
      setAvatar(NOTIONIST_AVATARS[0].url);
    }
    setError('');
  }, [adminToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide full name for the admin.');
      return;
    }
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Login/Username is required for admin sign-in.');
      return;
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone === '+998' || cleanPhone.length < 9) {
      setError('Please provide a valid Uzbekistan phone number (+998).');
      return;
    }
    if (!adminToEdit && !password.trim()) {
      setError('Please set a password for the admin account.');
      return;
    }

    setLoading(true);
    try {
      const resolvedEmail = formatAuthLogin(cleanUsername);
      if (adminToEdit) {
        await updateTeacher(adminToEdit.id, {
          name: name.trim(),
          username: cleanUsername.toLowerCase(),
          email: resolvedEmail,
          phone: cleanPhone,
          title: title.trim(),
          password: password.trim() ? password.trim() : adminToEdit.password,
          avatar
        });
      } else {
        await addAdmin({
          name: name.trim(),
          username: cleanUsername.toLowerCase(),
          email: resolvedEmail,
          phone: cleanPhone,
          title: title.trim(),
          password: password.trim(),
          subject: 'Administration',
          avatarColor: 'bg-purple-600',
          avatar
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to save admin account.');
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
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shadow-purple-600/25">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {adminToEdit ? 'Edit Admin Account' : 'Add New Admin'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Center administrative privileges & credentials</p>
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
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jamshid Karimov"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Login / Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jamshid or admin_2"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number</label>
            <PhoneInput value={phone} onChange={setPhone} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Admin Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Administrator"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Choose Notionist Avatar
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80">
              {NOTIONIST_AVATARS.map((av) => {
                const isSelected = avatar === av.url;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setAvatar(av.url)}
                    className={`relative group aspect-square rounded-xl p-1.5 bg-white dark:bg-slate-800 border-2 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden ${
                      isSelected
                        ? 'border-purple-600 dark:border-purple-500 ring-2 ring-purple-600/30 scale-105 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 opacity-80 hover:opacity-100'
                    }`}
                    title={av.name}
                  >
                    <img src={av.url} alt={av.name} className="w-full h-full object-cover rounded-full" />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {adminToEdit ? 'New Password (leave blank to keep current)' : 'Password'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                {...(!adminToEdit ? { required: true } : {})}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{adminToEdit ? 'Save Changes' : 'Create Admin Account'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
