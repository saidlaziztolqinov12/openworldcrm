import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NOTIONIST_AVATARS } from '../admin/TeacherModal';
import { X, Sparkles, Check, ShieldCheck, Mail, User as UserIcon } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser, isAdmin, isSuperAdmin } = useAuth();
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser?.avatar) {
      setSelectedUrl(currentUser.avatar);
    } else {
      setSelectedUrl(NOTIONIST_AVATARS[0].url);
    }
    setError('');
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const initials = currentUser.firstName && currentUser.surname
    ? `${currentUser.firstName.charAt(0)}${currentUser.surname.charAt(0)}`
    : currentUser.name
    ? currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const fullName = currentUser.firstName && currentUser.surname
    ? `${currentUser.firstName} ${currentUser.surname}`
    : currentUser.name || 'User Profile';

  const roleLabel = isSuperAdmin ? 'Super Administrator' : isAdmin ? 'Administrator' : 'Instructor';

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const userId = currentUser.uid || currentUser.id;
      if (!userId) throw new Error('User ID not found');

      await updateDoc(doc(db, 'users', userId), {
        avatar: selectedUrl,
        updatedAt: serverTimestamp()
      });

      setCurrentUser((prev) => (prev ? { ...prev, avatar: selectedUrl } : null));
      onClose();
    } catch (err: any) {
      console.error('Failed to update avatar:', err);
      setError(err?.message || 'Failed to update avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">My Profile & Avatar</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage your account identity and Notionist avatar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* User Info Card */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
            <div className="relative shrink-0">
              {selectedUrl ? (
                <img src={selectedUrl} alt={fullName} className="w-16 h-16 rounded-full object-cover border-2 border-indigo-600 shadow-md bg-white dark:bg-slate-800" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-sm ring-2 ring-white dark:ring-slate-900" title="Active">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{fullName}</h3>
              {currentUser.email && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{currentUser.email}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <ShieldCheck className="w-3 h-3" />
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Avatar Selector Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Select Notionist Avatar Preset
              </label>
              <span className="text-[10px] text-slate-400">14 Curated Styles</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-56 overflow-y-auto p-1">
              {NOTIONIST_AVATARS.map((av) => {
                const isSelected = selectedUrl === av.url;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedUrl(av.url)}
                    className={`relative group aspect-square rounded-2xl p-2 bg-slate-50 dark:bg-slate-800/60 border-2 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 ring-4 ring-indigo-600/20 shadow-md scale-105'
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={av.url} alt={av.name} className="w-full h-full object-cover rounded-full" />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1 truncate w-full text-center">
                      {av.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/25 disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {saving ? 'Saving...' : 'Save Profile Avatar'}
          </button>
        </div>
      </div>
    </div>
  );
};
