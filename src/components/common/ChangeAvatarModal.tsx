import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NOTIONIST_AVATARS } from '../admin/TeacherModal';
import { X, Sparkles, Check } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface ChangeAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangeAvatarModal: React.FC<ChangeAvatarModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser } = useAuth();
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

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!currentUser) return;
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Choose Your Avatar</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Select a Notionist avatar for your profile</p>
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
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
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
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1.5 truncate w-full text-center">
                    {av.name}
                  </span>
                </button>
              );
            })}
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
            {saving ? 'Saving...' : 'Save Avatar'}
          </button>
        </div>
      </div>
    </div>
  );
};
