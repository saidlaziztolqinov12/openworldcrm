/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { Sidebar } from './components/common/Sidebar';
import { TopBar } from './components/common/TopBar';
import { MobileNav } from './components/common/MobileNav';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TeacherManagement } from './components/admin/TeacherManagement';
import { TeacherProfileView } from './components/admin/TeacherProfileView';
import { GlobalAnalytics } from './components/admin/GlobalAnalytics';
import { AllStudentsDirectory } from './components/admin/AllStudentsDirectory';
import { SalaryAdvancesView } from './components/admin/SalaryAdvancesView';
import { AdminManagement } from './components/admin/AdminManagement';
import { PaymentsView } from './components/admin/PaymentsView';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { TeacherAttendanceLog } from './components/teacher/TeacherAttendanceLog';
import { TeacherStudentsDirectory } from './components/teacher/TeacherStudentsDirectory';
import { GroupDetailView } from './components/groups/GroupDetailView';
import { StudentModal } from './components/students/StudentModal';
import { InboxView } from './components/notifications/InboxView';

const MainApp: React.FC = () => {
  const { currentUser, isAdmin, isTeacher, isSuperAdmin, isLoading } = useAuth();
  const { groups, teachers } = useData();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<string>(
    isAdmin ? 'admin-dashboard' : 'teacher-dashboard'
  );

  const [toastWarning, setToastWarning] = useState<string | null>(null);

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Group detail drilldown state
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // Global Add Student modal state (triggered from views)
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState<boolean>(false);

  // Sync default tab when user changes role
  useEffect(() => {
    if ((activeTab === 'salary-advances' || activeTab === 'all-admins') && !isSuperAdmin) {
      setActiveTab('admin-dashboard');
      setToastWarning('Access restricted to Super Admin only.');
      setTimeout(() => setToastWarning(null), 3500);
    }
    if (isAdmin && !['admin-dashboard', 'admin-students', 'payments', 'teachers', 'all-admins', 'salary-advances', 'analytics', 'inbox'].includes(activeTab)) {
      setActiveTab('admin-dashboard');
    } else if (isTeacher && !['teacher-dashboard', 'teacher-students', 'teacher-attendance-history', 'inbox'].includes(activeTab)) {
      setActiveTab('teacher-dashboard');
    }
  }, [isAdmin, isTeacher, isSuperAdmin, activeTab]);

  // Keep latest navigation state in ref for safe, event-driven back handling
  const navStateRef = useRef({
    isAddStudentModalOpen,
    selectedGroupId,
    selectedTeacherId,
    activeTab,
    isAdmin,
    isTeacher
  });

  useEffect(() => {
    navStateRef.current = {
      isAddStudentModalOpen,
      selectedGroupId,
      selectedTeacherId,
      activeTab,
      isAdmin,
      isTeacher
    };
  }, [isAddStudentModalOpen, selectedGroupId, selectedTeacherId, activeTab, isAdmin, isTeacher]);

  // Android Hardware / Gesture Back Button navigation handler via Capacitor
  useEffect(() => {
    // Safe Web Fallback: ensure listener only binds on native mobile (Android/iOS)
    if (!Capacitor.isNativePlatform()) return;

    let backListenerHandle: { remove: () => Promise<void> } | null = null;
    let isSubscribed = true;

    const setupBackListener = async () => {
      try {
        const handle = await CapacitorApp.addListener('backButton', () => {
          const {
            isAddStudentModalOpen: isModalOpen,
            selectedGroupId: groupId,
            selectedTeacherId: teacherId,
            activeTab: currentTab,
            isAdmin: userIsAdmin
          } = navStateRef.current;

          // 1. Dispatch custom event allowing any active subcomponent modal to intercept first
          const customBackEvent = new CustomEvent('hardware-back', { cancelable: true });
          const defaultPrevented = !window.dispatchEvent(customBackEvent);
          if (defaultPrevented) return;

          // 2. If the global student modal is open, close it first
          if (isModalOpen) {
            setIsAddStudentModalOpen(false);
            return;
          }

          // 3. If in group drilldown or teacher profile, go back to the previous list
          if (groupId) {
            setSelectedGroupId(null);
            return;
          }

          if (teacherId) {
            setSelectedTeacherId(null);
            return;
          }

          // 4. If on the root/home dashboard, minimize/exit the app
          const isHomeDashboard = userIsAdmin
            ? currentTab === 'admin-dashboard'
            : currentTab === 'teacher-dashboard';

          if (isHomeDashboard) {
            CapacitorApp.exitApp();
          } else {
            // Otherwise, navigate back to the main dashboard overview
            setActiveTab(userIsAdmin ? 'admin-dashboard' : 'teacher-dashboard');
          }
        });

        if (!isSubscribed) {
          handle.remove();
        } else {
          backListenerHandle = handle;
        }
      } catch (err) {
        console.warn('Capacitor backButton listener registration error:', err);
      }
    };

    setupBackListener();

    return () => {
      isSubscribed = false;
      if (backListenerHandle) {
        backListenerHandle.remove();
      }
    };
  }, []);

  useEffect(() => {
    const handleNavigateInbox = () => {
      setActiveTab('inbox');
    };
    window.addEventListener('navigate-to-inbox', handleNavigateInbox);
    return () => {
      window.removeEventListener('navigate-to-inbox', handleNavigateInbox);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/30 animate-pulse mb-4">
          <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-lg font-bold tracking-tight text-white mb-1">Open World</h2>
        <p className="text-xs text-slate-400 font-medium">Ilova yuklanmoqda...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
  };

  const handleBackFromGroup = () => {
    setSelectedGroupId(null);
  };

  const handleSelectTeacher = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
  };

  const handleBackFromTeacher = () => {
    setSelectedTeacherId(null);
  };

  const handleSidebarTabSelect = (tab: string) => {
    if ((tab === 'salary-advances' || tab === 'all-admins') && !isSuperAdmin) {
      setToastWarning('Access restricted to Super Admin only.');
      setTimeout(() => setToastWarning(null), 3500);
      return;
    }
    if (tab === 'payments' && !isAdmin) {
      setToastWarning('Access restricted to administrators.');
      setTimeout(() => setToastWarning(null), 3500);
      return;
    }
    setSelectedGroupId(null);
    setSelectedTeacherId(null);
    setActiveTab(tab);
  };

  const handleOpenAddStudent = () => {
    setIsAddStudentModalOpen(true);
  };

  // Find a default group for new student enrollment if available
  const defaultGroupId = isAdmin
    ? (groups.find((g) => !g.archived)?.id || '')
    : (groups.find((g) => g.teacherId === currentUser?.id && !g.archived)?.id || groups[0]?.id || '');

  // Tab title helper for the TopBar
  const getTabTitle = () => {
    if (selectedGroupId) {
      const group = groups.find((g) => g.id === selectedGroupId);
      return group ? `${group.name}` : 'Cohort Details';
    }
    if (selectedTeacherId) {
      const teacher = teachers.find((t) => t.id === selectedTeacherId);
      return teacher ? `${teacher.name}'s Profile` : 'Teacher Profile';
    }
    switch (activeTab) {
      case 'admin-dashboard':
        return 'Learning Center Management';
      case 'teacher-dashboard':
        return 'Teacher Workspace';
      case 'admin-students':
        return 'Students Directory';
      case 'payments':
        return 'Student Payments Ledger';
      case 'teacher-students':
        return 'My Students Roster';
      case 'teachers':
        return 'Teachers Roster';
      case 'all-admins':
        return 'All Administrators';
      case 'salary-advances':
        return 'Salary Advances';
      case 'analytics':
        return 'Center Analytics';
      case 'teacher-attendance-history':
        return 'Attendance Log';
      case 'inbox':
        return 'Inbox & Requests';
      default:
        return 'Open World';
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-indigo-600 selection:text-white transition-colors duration-200">
      {toastWarning && (
        <div className="fixed top-5 right-5 z-50 bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3">
          <span>{toastWarning}</span>
        </div>
      )}
      {/* Collapsible Left-Hand Sidebar (Desktop) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSidebarTabSelect}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenAddStudent={handleOpenAddStudent}
      />

      {/* Main Wrapper with Top Navigation Bar and Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <TopBar
          activeTabTitle={getTabTitle()}
          onOpenTeacherActivity={isTeacher && currentUser ? () => setSelectedTeacherId(currentUser.id) : undefined}
          onNavigate={handleSidebarTabSelect}
        />

        {/* Main Content Area */}
        <main className="flex-1 h-full overflow-y-auto min-w-0 w-full overflow-x-hidden flex flex-col px-3 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {selectedGroupId ? (
            <GroupDetailView
              groupId={selectedGroupId}
              onBack={handleBackFromGroup}
            />
          ) : selectedTeacherId ? (
            <TeacherProfileView
              teacherId={selectedTeacherId}
              onBack={handleBackFromTeacher}
              onSelectGroup={handleSelectGroup}
              isReadOnly={!isAdmin}
            />
          ) : (
            <>
              {/* Admin Views */}
              {isAdmin && (
                <>
                  {activeTab === 'admin-dashboard' && (
                    <AdminDashboard
                      onSelectGroup={handleSelectGroup}
                      onNavigateTeachers={() => setActiveTab('teachers')}
                      onNavigateAnalytics={() => setActiveTab('analytics')}
                      onNavigateStudents={() => setActiveTab('admin-students')}
                      onNavigateSalaryAdvances={() => setActiveTab('salary-advances')}
                    />
                  )}
                  {activeTab === 'admin-students' && (
                    <AllStudentsDirectory onSelectGroup={handleSelectGroup} />
                  )}
                  {activeTab === 'payments' && (
                    <PaymentsView />
                  )}
                  {activeTab === 'teachers' && (
                    <TeacherManagement
                      onSelectGroup={handleSelectGroup}
                      onSelectTeacher={handleSelectTeacher}
                    />
                  )}
                  {activeTab === 'all-admins' && (
                    <AdminManagement />
                  )}
                  {activeTab === 'salary-advances' && (
                    <SalaryAdvancesView />
                  )}
                  {activeTab === 'analytics' && (
                    <GlobalAnalytics onSelectGroup={handleSelectGroup} />
                  )}
                  {activeTab === 'inbox' && (
                    <InboxView onSelectGroup={handleSelectGroup} />
                  )}
                </>
              )}

              {/* Teacher Views */}
              {isTeacher && (
                <>
                  {activeTab === 'teacher-dashboard' && (
                    <TeacherDashboard
                      onSelectGroup={handleSelectGroup}
                      onNavigateStudents={() => setActiveTab('teacher-students')}
                    />
                  )}
                  {activeTab === 'teacher-students' && (
                    <TeacherStudentsDirectory onSelectGroup={handleSelectGroup} />
                  )}
                  {activeTab === 'teacher-attendance-history' && (
                    <TeacherAttendanceLog onSelectGroup={handleSelectGroup} />
                  )}
                  {activeTab === 'inbox' && (
                    <InboxView onSelectGroup={handleSelectGroup} />
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar for quick access */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedGroupId(null);
          setActiveTab(tab);
        }}
      />

      {/* Quick Add Student Modal */}
      <StudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        groupId={defaultGroupId}
        onSuccess={() => {
          setIsAddStudentModalOpen(false);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <DataProvider>
            <MainApp />
          </DataProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
