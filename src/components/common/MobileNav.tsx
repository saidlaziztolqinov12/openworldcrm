import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  CalendarCheck2,
  BookOpen,
  GraduationCap,
  LogOut,
  UserCheck,
  Inbox
} from 'lucide-react';
import { LogoutConfirmModal } from './LogoutConfirmModal';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const { isAdmin, currentUser, logout } = useAuth();
  const { notifications } = useData();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const visibleNotifications = notifications.filter((n) => {
    if (isAdmin) return true;
    return (
      n.recipientId === currentUser?.id ||
      n.recipientId === 'GLOBAL' ||
      n.recipientId === 'all_teachers' ||
      n.recipientId === 'all'
    );
  });

  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 safe-area-pb text-slate-600 dark:text-slate-300 shadow-lg">
        <div className="flex items-center justify-around">
          {isAdmin ? (
            <>
              <button
                onClick={() => setActiveTab('admin-dashboard')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'admin-dashboard'
                    ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" strokeWidth={activeTab === 'admin-dashboard' ? 2.4 : 2.2} />
                <span className="text-[10.5px] mt-0.5 tracking-tight">Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('admin-students')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'admin-students'
                    ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold'
                }`}
              >
                <GraduationCap className="w-5 h-5" strokeWidth={activeTab === 'admin-students' ? 2.4 : 2.2} />
                <span className="text-[10.5px] mt-0.5 tracking-tight">Students</span>
              </button>

              <button
                onClick={() => setActiveTab('teachers')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'teachers'
                    ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold'
                }`}
              >
                <UserCheck className="w-5 h-5" strokeWidth={activeTab === 'teachers' ? 2.4 : 2.2} />
                <span className="text-[10.5px] mt-0.5 tracking-tight">Teachers</span>
              </button>

              <button
                onClick={() => setActiveTab('inbox')}
                className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'inbox'
                    ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold'
                }`}
              >
                <Inbox className="w-5 h-5" strokeWidth={activeTab === 'inbox' ? 2.4 : 2.2} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                )}
                <span className="text-[10.5px] mt-0.5 tracking-tight">Inbox</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('teacher-dashboard')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'teacher-dashboard'
                    ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold'
                }`}
              >
                <BookOpen className="w-5 h-5" strokeWidth={activeTab === 'teacher-dashboard' ? 2.4 : 2.2} />
                <span className="text-[10.5px] mt-0.5 tracking-tight">My Groups</span>
              </button>

              <button
                onClick={() => setActiveTab('teacher-students')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'teacher-students'
                    ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold'
                }`}
              >
                <GraduationCap className="w-5 h-5" strokeWidth={activeTab === 'teacher-students' ? 2.4 : 2.2} />
                <span className="text-[10.5px] mt-0.5 tracking-tight">Students</span>
              </button>

              <button
                onClick={() => setActiveTab('teacher-attendance-history')}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'teacher-attendance-history'
                    ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold'
                }`}
              >
                <CalendarCheck2 className="w-5 h-5" strokeWidth={activeTab === 'teacher-attendance-history' ? 2.4 : 2.2} />
                <span className="text-[10.5px] mt-0.5 tracking-tight">Log</span>
              </button>

              <button
                onClick={() => setActiveTab('inbox')}
                className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'inbox'
                    ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold'
                }`}
              >
                <Inbox className="w-5 h-5" strokeWidth={activeTab === 'inbox' ? 2.4 : 2.2} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                )}
                <span className="text-[10.5px] mt-0.5 tracking-tight">Inbox</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer font-semibold"
          >
            <LogOut className="w-5 h-5" strokeWidth={2.2} />
            <span className="text-[10px] mt-0.5">Log Out</span>
          </button>
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
        userName={currentUser?.name}
      />
    </>
  );
};
