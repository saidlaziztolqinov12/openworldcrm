import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useData } from '../../context/DataContext';
import { Group, Student, AttendanceRecord } from '../../types';
import { TeacherModal } from './TeacherModal';
import { TeacherAvatar } from '../common/TeacherAvatar';
import {
  ArrowLeft,
  Mail,
  Phone,
  Edit2,
  Calendar,
  BookOpen,
  Users,
  BarChart2,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

interface TeacherProfileViewProps {
  teacherId: string;
  onBack: () => void;
  onSelectGroup: (groupId: string) => void;
  isReadOnly?: boolean;
}

export const TeacherProfileView: React.FC<TeacherProfileViewProps> = ({
  teacherId,
  onBack,
  onSelectGroup,
  isReadOnly = false
}) => {
  const { teachers, groups, students, attendanceRecords, getMonthlyAttendanceRoster } = useData();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const teacher = teachers.find((t) => t.id === teacherId);

  // Generate past 12 months options (e.g. Current Month, Last Month, August, September, etc.)
  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const value = `${year}-${String(month + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      opts.push({ value, label });
      date.setMonth(date.getMonth() - 1);
    }
    return opts;
  }, []);

  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(monthOptions[0]?.value || '2026-08');

  if (!teacher) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Teacher not found</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-xs font-bold cursor-pointer"
        >
          Back
        </button>
      </div>
    );
  }

  // Assigned cohorts for this teacher
  const assignedGroups = groups.filter((g) => g.teacherId === teacher.id && !g.archived);

  return (
    <div className="space-y-8 pb-20 md:pb-12 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 overflow-x-hidden">
      {/* Top Navigation & Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-md shadow-xs border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isReadOnly ? 'Close Activity View' : 'Back to Staff List'}</span>
        </button>

        {/* Global Month/Year Filter */}
        <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs">
          <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Select Month:</span>
          <select
            value={selectedYearMonth}
            onChange={(e) => setSelectedYearMonth(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Teacher Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 sm:p-8 shadow-xs border border-slate-200/60 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div className="flex items-start sm:items-center gap-5">
          {/* Prominent Initials Avatar Badge */}
          <TeacherAvatar teacher={teacher} className="w-16 h-16 rounded-2xl text-xl shadow-lg" />

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {teacher.name}
              </h1>
              {teacher.title && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  {teacher.title}
                </span>
              )}
            </div>

            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {teacher.subject || 'Lead Instructor'}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                <span>{teacher.email}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-indigo-500" />
                <span>{teacher.phone}</span>
              </div>
            </div>
          </div>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Reports & Analytics Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <BarChart2 className="w-4 h-4" />
              <span>Cohort Analytics & Attendance Reports</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Assigned Cohorts Performance ({assignedGroups.length})
            </h2>
          </div>
        </div>

        {assignedGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg p-12 text-center space-y-3 border border-slate-200/60 dark:border-slate-800/80">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">No Assigned Cohorts</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              This instructor is currently not assigned to any active cohorts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {assignedGroups.map((group) => (
              <CohortAnalyticsCard
                key={group.id}
                group={group}
                yearMonth={selectedYearMonth}
                students={students}
                attendanceRecords={attendanceRecords}
                onSelectGroup={onSelectGroup}
                getMonthlyAttendanceRoster={getMonthlyAttendanceRoster}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Teacher Modal */}
      {!isReadOnly && (
        <TeacherModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          teacherToEdit={teacher}
        />
      )}
    </div>
  );
};

interface CohortAnalyticsCardProps {
  group: Group;
  yearMonth: string;
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  onSelectGroup: (groupId: string) => void;
  getMonthlyAttendanceRoster?: (groupId: string, yearMonth: string) => any[];
}

const CohortAnalyticsCard: React.FC<CohortAnalyticsCardProps> = ({
  group,
  yearMonth,
  students,
  attendanceRecords,
  onSelectGroup,
  getMonthlyAttendanceRoster
}) => {
  // Roster students currently available in this cohort
  const rosterStudents = useMemo(() => {
    return students.filter((s) => s.groupId === group.id && s.status !== 'inactive');
  }, [students, group.id]);

  // Compute 13 lessons data for this group in yearMonth, deduplicated by unique date
  const chartData = useMemo(() => {
    const groupRecords = attendanceRecords
      .filter((r) => r.groupId === group.id && r.date.startsWith(yearMonth))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Deduplicate by date (unique lesson dates in month)
    const dateMap = new Map<string, AttendanceRecord>();
    groupRecords.forEach((r) => {
      if (!dateMap.has(r.date)) {
        dateMap.set(r.date, r);
      } else {
        const existing = dateMap.get(r.date)!;
        dateMap.set(r.date, {
          ...existing,
          statusMap: { ...existing.statusMap, ...r.statusMap }
        });
      }
    });

    const uniqueRecords = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const totalStudents = Math.max(1, rosterStudents.length);
    const data: Array<{
      lesson: string;
      date?: string;
      percentage: number;
      presentCount: number;
      totalStudents: number;
      hasRecord: boolean;
    }> = [];

    for (let i = 0; i < 13; i++) {
      const rec = uniqueRecords[i];
      const lessonName = `L${i + 1}`;
      if (rec && rec.statusMap) {
        let present = 0;
        rosterStudents.forEach((s) => {
          if (rec.statusMap[s.id] === 'present') {
            present++;
          }
        });
        const pct = Math.round((present / totalStudents) * 100);
        data.push({
          lesson: lessonName,
          date: rec.date,
          percentage: pct,
          presentCount: present,
          totalStudents,
          hasRecord: true
        });
      } else {
        data.push({
          lesson: lessonName,
          percentage: 0,
          presentCount: 0,
          totalStudents,
          hasRecord: false
        });
      }
    }
    return data;
  }, [attendanceRecords, group.id, yearMonth, rosterStudents]);

  const lessonsCompletedCount = chartData.filter((d) => d.hasRecord).length;

  // Total attended lessons strictly from monthly sheet logic (including historical left students)
  const totalAttendedLessons = useMemo(() => {
    const groupRecords = attendanceRecords.filter(
      (r) => r.groupId === group.id && r.date.startsWith(yearMonth)
    );
    const uniqueDates = Array.from(new Set(groupRecords.map((r) => r.date)));
    const monthlyRoster = getMonthlyAttendanceRoster
      ? getMonthlyAttendanceRoster(group.id, yearMonth)
      : rosterStudents;

    let attendedSum = 0;
    uniqueDates.forEach((dateStr) => {
      const recordsOnDate = groupRecords.filter((r) => r.date === dateStr);
      const combinedStatusMap: Record<string, string> = {};
      recordsOnDate.forEach((rec) => {
        if (rec.statusMap) {
          Object.assign(combinedStatusMap, rec.statusMap);
        }
      });

      monthlyRoster.forEach((s: any) => {
        if (s.isHistoricalLeft && s.lastAttendanceDateInGroupInMonth && dateStr > s.lastAttendanceDateInGroupInMonth) {
          return;
        }
        if (combinedStatusMap[s.id] === 'present') {
          attendedSum++;
        }
      });
    });

    return attendedSum;
  }, [attendanceRecords, group.id, yearMonth, getMonthlyAttendanceRoster, rosterStudents]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-xs border border-slate-200/60 dark:border-slate-800/80 space-y-6 transition-colors flex flex-col justify-between">
      {/* Card Header & Cohort Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{group.name}</h3>
            <button
              onClick={() => onSelectGroup(group.id)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              View Roster &rarr;
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {group.schedule} • Room {group.room || 'Main Hall'}
          </p>
        </div>
      </div>

      {/* Responsive Bar Chart with Smooth Staggered Growth Animation (First) */}
      <div className="h-60 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <XAxis
              dataKey="lesson"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1">
                      <div className="font-bold text-emerald-400 flex items-center justify-between gap-3">
                        <span>{data.lesson}</span>
                        {data.date && <span className="text-[10px] text-slate-400 font-normal">{data.date}</span>}
                      </div>
                      <div className="font-semibold text-slate-100">
                        {data.percentage}% — {data.presentCount}/{data.totalStudents} Students
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="percentage"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={1400}
              animationEasing="ease-in-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.hasRecord ? '#10b981' : '#cbd5e1'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Metrics Information Below the Graph (Requirement 4) */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-100 dark:border-slate-700/50">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Students Enrolled</div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{rosterStudents.length}</div>
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-100 dark:border-slate-700/50">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Lessons Completed</div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{lessonsCompletedCount} / 13</div>
        </div>

        <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-md border border-emerald-200/50 dark:border-emerald-800/50">
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold">Attended Lessons</div>
          <div className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300 mt-0.5">{totalAttendedLessons}</div>
        </div>
      </div>
    </div>
  );
};
