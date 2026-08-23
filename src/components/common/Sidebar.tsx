import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  GraduationCap,
  LayoutDashboard,
  UserCheck,
  BarChart3,
  CalendarCheck2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  WifiOff,
  Inbox
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  onOpenAddStudent?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { isOnline, students, groups, teachers, notifications } = useData();

  const visibleNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (isAdmin) return true;
      return (
        n.recipientId === currentUser?.id ||
        n.recipientId === 'GLOBAL' ||
        n.recipientId === 'all_teachers' ||
        n.recipientId === 'all'
      );
    });
  }, [notifications, isAdmin, currentUser]);

  const unreadCount = useMemo(() => {
    return visibleNotifications.filter((n) => !n.read).length;
  }, [visibleNotifications]);

  const pendingTransfers = useMemo(() => {
    return visibleNotifications.filter(
      (n) =>
        (n.type === 'TRANSFER_REQUEST' || n.type === 'transfer_request') &&
        (n.status === 'PENDING' || n.status === 'pending')
    ).length;
  }, [visibleNotifications]);

  // Main navigation items with "Enroll Student" removed
  const navItems = isAdmin
    ? [
        {
          id: 'admin-dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: groups.filter((g) => !g.archived).length.toString()
        },
        {
          id: 'admin-students',
          label: 'All Students',
          icon: GraduationCap,
          badge: students.filter((s) => s.status !== 'inactive').length.toString()
        },
        {
          id: 'teachers',
          label: 'Teachers Roster',
          icon: UserCheck,
          badge: teachers.length.toString()
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3
        },
        {
          id: 'inbox',
          label: 'Inbox',
          icon: Inbox,
          badge: (pendingTransfers > 0 ? pendingTransfers : unreadCount > 0 ? unreadCount : undefined)?.toString()
        }
      ]
    : [
        {
          id: 'teacher-dashboard',
          label: 'Dashboard',
          icon: BookOpen,
          badge: groups.filter((g) => g.teacherId === currentUser?.id && !g.archived).length.toString()
        },
        {
          id: 'teacher-students',
          label: 'My Students',
          icon: GraduationCap,
          badge: students.filter((s) => {
            const myGroupIds = new Set(
              groups.filter((g) => g.teacherId === currentUser?.id).map((g) => g.id)
            );
            return myGroupIds.has(s.groupId) && s.status !== 'inactive';
          }).length.toString()
        },
        {
          id: 'teacher-attendance-history',
          label: 'Attendance Log',
          icon: CalendarCheck2
        },
        {
          id: 'inbox',
          label: 'Inbox',
          icon: Inbox,
          badge: unreadCount > 0 ? unreadCount.toString() : undefined
        }
      ];

  return (
    <aside
      id="app-sidebar"
      className={`hidden md:flex flex-col h-full flex-shrink-0 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-200 z-30 select-none ${
        isCollapsed ? 'w-16' : 'w-52 lg:w-56'
      }`}
    >
      {/* Brand & Toggle Header */}
      {isCollapsed ? (
        <div className="h-14 flex items-center justify-center px-2 border-b border-slate-200/80 dark:border-slate-800 bg-transparent">
          <button
            id="toggle-sidebar-btn"
            onClick={() => setIsCollapsed(false)}
            className="w-8 h-8 rounded-md bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-transparent gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <div className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1 truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-white truncate">
                  Open World
                </span>
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase shrink-0">
                  {isAdmin ? 'Admin' : 'Teacher'}
                </span>
              </div>
            </div>
          </div>

          {/* Toggle button to collapse */}
          <button
            id="toggle-sidebar-btn"
            onClick={() => setIsCollapsed(true)}
            className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {!isCollapsed && (
          <div className="px-2.5 pt-1 pb-1.5 text-[11px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            Menu
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              className={`flex items-center transition-all cursor-pointer ${
                isCollapsed
                  ? `w-10 h-10 mx-auto justify-center rounded-md ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                    }`
                  : `w-full gap-2.5 px-3 py-2 rounded-md text-left text-xs ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/80 dark:bg-indigo-950/60'
                        : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-semibold'
                    }`
              }`}
            >
              <div
                className={`flex items-center justify-center shrink-0 ${
                  isCollapsed
                    ? 'w-full h-full'
                    : `w-4.5 h-4.5 ${
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`
                }`}
              >
                <Icon
                  className={isCollapsed ? 'w-5 h-5' : 'w-4.5 h-4.5'}
                  strokeWidth={isActive ? 2.4 : 2.2}
                />
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="truncate tracking-tight">{item.label}</span>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ml-1 shrink-0 font-bold ${
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100/80 dark:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800'
                          : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sync Status Footer */}
      <div className="px-2 py-2 border-t border-slate-200/80 dark:border-slate-800 bg-transparent">
        {isCollapsed ? (
          <div
            className="w-8 h-6 mx-auto flex items-center justify-center rounded-md text-slate-400"
            title={isOnline ? 'Cloud database connected' : 'Offline local cache'}
          >
            {isOnline ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-500" />
            )}
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 text-xs py-1 px-2 rounded-md text-slate-500 dark:text-slate-400"
            title={isOnline ? 'Cloud database connected' : 'Offline local mode'}
          >
            {isOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Cloud Synced
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  Offline Cache
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
