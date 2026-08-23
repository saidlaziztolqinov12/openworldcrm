/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { Sidebar } from './components/common/Sidebar';
import { TopBar } from './components/common/TopBar';
import { MobileNav } from './components/common/MobileNav';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TeacherManagement } from './components/admin/TeacherManagement';
import { TeacherProfileView } from './components/admin/TeacherProfileView';
import { GlobalAnalytics } from './components/admin/GlobalAnalytics';
import { AllStudentsDirectory } from './components/admin/AllStudentsDirectory';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { TeacherAttendanceLog } from './components/teacher/TeacherAttendanceLog';
import { TeacherStudentsDirectory } from './components/teacher/TeacherStudentsDirectory';
import { GroupDetailView } from './components/groups/GroupDetailView';
import { StudentModal } from './components/students/StudentModal';
import { InboxView } from './components/notifications/InboxView';

const MainApp: React.FC = () => {
  const { currentUser, isAdmin, isTeacher } = useAuth();
  const { groups, teachers } = useData();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<string>(
    isAdmin ? 'admin-dashboard' : 'teacher-dashboard'
  );

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Group detail drilldown state
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // Global Add Student modal state (triggered from views)
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState<boolean>(false);

  // Sync default tab when user changes role
  useEffect(() => {
    if (isAdmin && !['admin-dashboard', 'admin-students', 'teachers', 'analytics', 'inbox'].includes(activeTab)) {
      setActiveTab('admin-dashboard');
    } else if (isTeacher && !['teacher-dashboard', 'teacher-students', 'teacher-attendance-history', 'inbox'].includes(activeTab)) {
      setActiveTab('teacher-dashboard');
    }
  }, [isAdmin, isTeacher, activeTab]);

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
      case 'teacher-dashboard':
        return 'Overview Dashboard';
      case 'admin-students':
        return 'Students Directory';
      case 'teacher-students':
        return 'My Students Roster';
      case 'teachers':
        return 'Teachers Roster';
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
                    />
                  )}
                  {activeTab === 'admin-students' && (
                    <AllStudentsDirectory onSelectGroup={handleSelectGroup} />
                  )}
                  {activeTab === 'teachers' && (
                    <TeacherManagement
                      onSelectGroup={handleSelectGroup}
                      onSelectTeacher={handleSelectTeacher}
                    />
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
      <AuthProvider>
        <DataProvider>
          <MainApp />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
