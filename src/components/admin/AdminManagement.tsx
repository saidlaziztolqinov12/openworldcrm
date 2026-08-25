import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';
import { AdminModal } from './AdminModal';
import {
  ShieldCheck,
  Plus,
  Mail,
  Phone,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  Crown
} from 'lucide-react';

export const AdminManagement: React.FC = () => {
  const { admins, deleteTeacher } = useData();
  const { currentUser } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<User | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorWarning, setErrorWarning] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!adminToDelete) return;
    if (adminToDelete.id === 'admin-1' || adminToDelete.email === 'admin@center.com') {
      setErrorWarning('Cannot delete the primary center director account.');
      setAdminToDelete(null);
      return;
    }
    if (currentUser && adminToDelete.id === currentUser.id) {
      setErrorWarning('You cannot delete your own currently logged-in account.');
      setAdminToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTeacher(adminToDelete.id);
      setAdminToDelete(null);
      setToastMessage('Admin account removed successfully.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Failed to delete admin:', err);
      setErrorWarning('Failed to delete admin account.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 overflow-x-hidden">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3">
          <span>{toastMessage}</span>
        </div>
      )}
      {errorWarning && (
        <div className="fixed top-5 right-5 z-50 bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorWarning}</span>
          <button onClick={() => setErrorWarning(null)} className="ml-2 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border-none shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full w-fit mb-1.5 border border-purple-200/60 dark:border-purple-800/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Super Admin Directory</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            All System Administrators
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage center administrative accounts, credentials, and super privileges
          </p>
        </div>

        <button
          onClick={() => {
            setAdminToEdit(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Admin</span>
        </button>
      </div>

      {/* Admins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {admins.map((admin) => {
          const isDirector = admin.id === 'admin-1' || admin.email === 'admin@center.com' || admin.role === 'super_admin';

          return (
            <div
              key={admin.id}
              className="bg-white dark:bg-slate-900 rounded-md border-none p-5 sm:p-6 shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-purple-600/30">
                      {admin.name ? admin.name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{admin.name}</h3>
                        {isDirector ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1 shadow-xs">
                            <Crown className="w-3 h-3 text-amber-500" />
                            <span>Director / Super Admin</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                            {admin.title || 'Administrator'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{admin.subject || 'Center Administration'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setAdminToEdit(admin);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Admin"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!isDirector && (
                      <button
                        onClick={() => setAdminToDelete(admin)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                        title="Delete Admin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-md border border-slate-100 dark:border-slate-700/60 text-xs">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="font-medium truncate">{admin.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>{admin.phone}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Account Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  Active Access
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setAdminToEdit(null);
        }}
        adminToEdit={adminToEdit}
        onSuccess={() => {
          setToastMessage(adminToEdit ? 'Admin account updated successfully.' : 'Admin account created successfully.');
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />

      {/* Delete Confirmation Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">Delete Admin Account?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to remove <strong className="text-slate-700 dark:text-slate-200">{adminToDelete.name}</strong>? This administrator will immediately lose access to the portal.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setAdminToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Delete Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
