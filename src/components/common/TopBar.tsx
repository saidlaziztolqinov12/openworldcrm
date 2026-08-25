import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, LogOut, ShieldCheck, User, BarChart2, Bell } from 'lucide-react';
import { LogoutConfirmModal } from './LogoutConfirmModal';

interface TopBarProps {
  activeTabTitle?: string;
  onOpenTeacherActivity?: () => void;
  onNavigate?: (tab: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ activeTabTitle, onOpenTeacherActivity, onNavigate }) => {
  const { currentUser, isAdmin, isSuperAdmin, logout } = useAuth();
  const { notifications } = useData();
  const { isDark, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate unread or pending notifications count for current user
  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    return notifications.filter((n) => {
      const isRecipient = n.recipientId === currentUser.id;
      const isGlobal =
        n.recipientId === 'GLOBAL' ||
        n.recipientId === 'all_teachers' ||
        n.recipientId === 'all' ||
        n.recipientRole === 'all' ||
        (n.recipientRole === 'teacher' && (n.recipientId === 'GLOBAL' || n.recipientId === 'all_teachers'));
      const isPendingRequest =
        (n.type?.toLowerCase() === 'request' || n.type?.toLowerCase() === 'transfer_request') &&
        (n.status?.toLowerCase() === 'pending' || !n.status);
      const isUnread = !n.read;
      return (isRecipient || isGlobal) && (isUnread || isPendingRequest);
    }).length;
  }, [notifications, currentUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const initials = currentUser?.firstName && currentUser?.surname
    ? `${currentUser.firstName.charAt(0)}${currentUser.surname.charAt(0)}`
    : currentUser?.name
    ? currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'OW';

  const fullName = currentUser?.firstName && currentUser?.surname
    ? `${currentUser.firstName} ${currentUser.surname}`
    : currentUser?.name || 'Staff Member';

  const userRole = currentUser?.role || (isSuperAdmin ? 'super_admin' : isAdmin ? 'admin' : 'teacher');
  const roleBadgeConfig = (() => {
    if (userRole === 'super_admin') {
      return {
        label: 'Super Admin',
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
      };
    } else if (userRole === 'admin') {
      return {
        label: 'Administrator',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
      };
    } else {
      return {
        label: 'Instructor',
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
      };
    }
  })();

  return (
    <>
      <header className="h-14 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-3 sm:px-6 lg:px-8 shrink-0 z-20 transition-colors duration-200">
        {/* Left Side: Active Section / Context */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">
              {activeTabTitle || 'Open World'}
            </span>
          </div>
        </div>

        {/* Right Side: Standalone Theme Toggle, Notifications, Role Badge & Circular Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Standalone Day/Night Mode Icon-Only Toggle with Motion Animation */}
          <motion.button
            id="topbar-theme-toggle-btn"
            type="button"
            onClick={toggleTheme}
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.06 }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative overflow-hidden"
            title={isDark ? 'Switch to Day Mode' : 'Switch to Night Mode (Telegram Dark)'}
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="flex items-center justify-center"
                >
                  <Sun className="w-4 h-4 text-amber-400 stroke-[2.2]" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, scale: 0.4, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: -90, scale: 0.4, opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="flex items-center justify-center"
                >
                  <Moon className="w-4 h-4 text-slate-700 dark:text-slate-200 stroke-[2.2]" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Notifications Bell Icon Button */}
          <motion.button
            id="topbar-notifications-btn"
            type="button"
            onClick={() => {
              if (onNavigate) onNavigate('inbox');
            }}
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.06 }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
            title="Inbox & Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 stroke-[2.2]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </motion.button>

          {/* Role Badge Pill */}
          <span className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-full shrink-0 ${roleBadgeConfig.className}`}>
            {roleBadgeConfig.label}
          </span>

          {/* Interactive Circular Profile Picture */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="topbar-user-profile-btn"
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-semibold text-xs flex items-center justify-center ring-2 ring-transparent hover:ring-indigo-500/30 active:scale-95 transition-all cursor-pointer shadow-xs select-none"
              title={`${fullName} - Profile`}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <span>{initials}</span>
            </button>

            {/* Minimalist Profile Dropdown Menu */}
            {isDropdownOpen && (
              <div
                id="topbar-profile-dropdown"
                className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200/90 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* User Info Stack */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {currentUser?.email || (isAdmin ? 'admin@center.com' : 'teacher@center.com')}
                      </p>
                      <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-md ${
                        isSuperAdmin 
                          ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300' 
                          : isAdmin 
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' 
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {isSuperAdmin ? 'Super Administrator' : isAdmin ? 'Administrator' : 'Instructor'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dropdown Menu Items */}
                <div className="p-1 space-y-0.5">
                  {onOpenTeacherActivity && (
                    <button
                      id="dropdown-activity-btn"
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenTeacherActivity();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors font-medium text-left cursor-pointer"
                    >
                      <BarChart2 className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>See Activity</span>
                    </button>
                  )}
                  <button
                    id="dropdown-logout-btn"
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors font-medium text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
        userName={currentUser?.name}
      />
    </>
  );
};
