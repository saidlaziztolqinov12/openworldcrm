import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Group, Student, AttendanceRecord, MonthlyRosterStudent } from '../../types';
import { useData } from '../../context/DataContext';
import { AnimatedCounter } from '../common/AnimatedCounter';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  Users,
  CalendarCheck2,
  MessageSquare,
  X,
  BookOpen,
  HelpCircle,
  Lock,
  UserX,
  Clock
} from 'lucide-react';

interface ActiveCellDetail {
  student: MonthlyRosterStudent;
  dateStr: string;
  dayNumber: number;
  dayOfWeek: string;
  status: 'present' | 'absent' | 'late' | 'unrecorded';
  mark?: number | string;
  comment?: string;
  topicCovered?: string;
  position: {
    top: number;
    left: number;
  };
}

interface MonthlyAttendanceSheetProps {
  group: Group;
  students: Student[];
  attendanceRecords: AttendanceRecord[];
}

export const MonthlyAttendanceSheet: React.FC<MonthlyAttendanceSheetProps> = ({
  group,
  students: defaultStudents,
  attendanceRecords
}) => {
  const { getMonthlyAttendanceRoster } = useData();

  // Current selected month & year (defaulting to current date)
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0 - 11

  // Active cell popover state
  const [activeCellDetail, setActiveCellDetail] = useState<ActiveCellDetail | null>(null);

  // Close popover on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveCellDetail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Month Navigation
  const handlePrevMonth = () => {
    setActiveCellDetail(null);
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setActiveCellDetail(null);
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleJumpToCurrent = () => {
    setActiveCellDetail(null);
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
  };

  // Month Title (e.g. "August 2026")
  const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleString('en-US', {
    month: 'long'
  });
  const monthYearTitle = `${monthName} ${selectedYear}`;
  const yearMonthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  // Dynamic Historical Roster for this group and month (Condition A, Condition B, Condition C)
  const rosterStudents = useMemo(() => {
    if (getMonthlyAttendanceRoster) {
      return getMonthlyAttendanceRoster(group.id, yearMonthStr);
    }
    return defaultStudents.map((s) => ({ ...s, isHistoricalLeft: false }));
  }, [getMonthlyAttendanceRoster, group.id, yearMonthStr, defaultStudents]);

  // Calculate days in the selected month
  const daysInMonth = useMemo(() => {
    const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const days: { dayNumber: number; dateStr: string; dayOfWeek: string; isToday: boolean }[] = [];
    const todayISO = today.toISOString().substring(0, 10);

    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(selectedYear, selectedMonth, day);
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' }); // 'M', 'T', 'W'...
      days.push({
        dayNumber: day,
        dateStr,
        dayOfWeek,
        isToday: dateStr === todayISO
      });
    }
    return days;
  }, [selectedYear, selectedMonth]);

  // Strict Group-Scoped Attendance Index: Map<dateStr, AttendanceRecord>
  // Strictly filter by group.id so past attendance from other groups NEVER leaks
  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((r) => {
      if (r.groupId === group.id) {
        map.set(r.date, r);
      }
    });
    return map;
  }, [attendanceRecords, group.id]);

  // Compute daily totals and running cumulative counts across roster students (active + historical)
  const { dailyStats, monthlyTotalAttended, totalConductedSessions } = useMemo(() => {
    let runningCumulative = 0;
    let sessionsCount = 0;

    const stats = daysInMonth.map((day) => {
      const rec = recordsByDate.get(day.dateStr);
      let presentCount = 0;
      let absentCount = 0;
      const hasRecord = !!rec;

      if (rec && rec.statusMap) {
        sessionsCount++;
        rosterStudents.forEach((s) => {
          // If historical and after last attendance date, don't count
          if (s.isHistoricalLeft && s.lastAttendanceDateInGroupInMonth && day.dateStr > s.lastAttendanceDateInGroupInMonth) {
            return;
          }
          const st = rec.statusMap[s.id];
          if (st === 'present' || st === 'late') {
            presentCount++;
          } else if (st === 'absent') {
            absentCount++;
          }
        });
        runningCumulative += presentCount;
      }

      return {
        dayNumber: day.dayNumber,
        dateStr: day.dateStr,
        hasRecord,
        presentCount,
        absentCount,
        cumulativePresent: hasRecord ? runningCumulative : null
      };
    });

    return {
      dailyStats: stats,
      monthlyTotalAttended: runningCumulative,
      totalConductedSessions: sessionsCount
    };
  }, [daysInMonth, recordsByDate, rosterStudents]);

  // Individual student monthly attendance stats
  const studentStats = useMemo(() => {
    const map = new Map<string, { presentCount: number; absentCount: number; assessedSessions: number; rate: number }>();

    rosterStudents.forEach((s) => {
      let present = 0;
      let absent = 0;
      let assessed = 0;

      daysInMonth.forEach((day) => {
        // If historical departed and day is past departure, skip
        if (s.isHistoricalLeft && s.lastAttendanceDateInGroupInMonth && day.dateStr > s.lastAttendanceDateInGroupInMonth) {
          return;
        }

        const rec = recordsByDate.get(day.dateStr);
        if (rec && rec.statusMap) {
          const st = rec.statusMap[s.id];
          if (st === 'present' || st === 'late') {
            present++;
            assessed++;
          } else if (st === 'absent') {
            absent++;
            assessed++;
          }
        }
      });

      const rate = assessed > 0 ? Math.round((present / assessed) * 100) : 100;
      map.set(s.id, { presentCount: present, absentCount: absent, assessedSessions: assessed, rate });
    });

    return map;
  }, [rosterStudents, daysInMonth, recordsByDate]);

  // Handle cell click to show soft popover box
  const handleCellClick = (
    e: React.MouseEvent<HTMLTableCellElement>,
    student: MonthlyRosterStudent,
    day: { dayNumber: number; dateStr: string; dayOfWeek: string }
  ) => {
    e.stopPropagation();

    // If student is historical departed and clicked day is after their departure, cell is locked
    if (student.isHistoricalLeft && student.lastAttendanceDateInGroupInMonth && day.dateStr > student.lastAttendanceDateInGroupInMonth) {
      return;
    }

    const rec = recordsByDate.get(day.dateStr);
    const status = rec?.statusMap?.[student.id] || 'unrecorded';
    const mark = rec?.marksMap?.[student.id];
    const comment = rec?.commentsMap?.[student.id];
    const topicCovered = rec?.topicCovered;

    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 300;
    const popoverHeight = 240;

    // Center horizontally over the cell, clamped within viewport bounds
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left < 16) left = 16;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }

    // Place above cell if space permits, otherwise below
    let top = rect.top - popoverHeight - 8;
    if (top < 16) {
      top = rect.bottom + 8;
    }

    setActiveCellDetail({
      student,
      dateStr: day.dateStr,
      dayNumber: day.dayNumber,
      dayOfWeek: day.dayOfWeek,
      status,
      mark,
      comment,
      topicCovered,
      position: { top, left }
    });
  };

  return (
    <div className="space-y-5 w-full max-w-full">
      {/* Month Picker & Summary Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-lg border-none shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        {/* Month Selector Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-md border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-xs transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 sm:px-4 py-1 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 min-w-[140px] sm:min-w-[160px] justify-center">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{monthYearTitle}</span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-xs transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleJumpToCurrent}
            className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Top KPI Metrics with Rolling Animated Number Counters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-bold text-indigo-900 dark:text-indigo-200">
            <CalendarCheck2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>
              <AnimatedCounter value={totalConductedSessions} /> {totalConductedSessions === 1 ? 'Lesson' : 'Lessons'} in {monthName}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-bold text-emerald-900 dark:text-emerald-200">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>
              <AnimatedCounter value={monthlyTotalAttended} /> Total Attended Lessons
            </span>
          </div>
        </div>
      </div>

      {/* Legend / Info guide with Historical Retention & Lock explanation */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-900 px-4 py-2.5 rounded-md border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-slate-700 dark:text-slate-200">Cell Key:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-green-50 dark:bg-emerald-950/80 border border-green-400 dark:border-emerald-600 text-green-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shadow-xs">
              +
            </span>
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-red-50 dark:bg-rose-950/80 border border-red-400 dark:border-rose-600 text-red-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center shadow-xs">
              -
            </span>
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 font-medium text-xs flex items-center justify-center">
              ?
            </span>
            <span>No lesson recorded</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-400 font-mono text-xs flex items-center justify-center">
              /
            </span>
            <span>Locked (Post-Departure)</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          💡 Swipe/scroll horizontally to inspect all days of {monthName}
        </span>
      </div>

      {/* Monthly Sheet Matrix Table - strictly scrollable within its container */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border-none shadow-xs overflow-hidden max-w-full transition-colors">
        {rosterStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            No students found for this group in {monthYearTitle}.
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              {/* Header Row: Student column & Day numbers */}
              <thead>
                <tr className="bg-slate-900 dark:bg-slate-950 text-white font-bold border-b border-slate-800 text-[11px]">
                  {/* Sticky left column for Student Name */}
                  <th className="sticky left-0 z-20 bg-slate-900 dark:bg-slate-950 px-4 py-3 min-w-[220px] max-w-[260px] border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center justify-between">
                      <span># Student Name</span>
                      <span className="text-[10px] font-normal text-slate-400">({rosterStudents.length})</span>
                    </div>
                  </th>

                  {/* Day columns 1..31 */}
                  {daysInMonth.map((day) => {
                    const hasRec = recordsByDate.has(day.dateStr);
                    return (
                      <th
                        key={day.dayNumber}
                        className={`p-1.5 text-center min-w-[34px] border-r border-slate-800 ${
                          day.isToday
                            ? 'bg-indigo-700 text-white font-extrabold'
                            : hasRec
                            ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                            : 'text-slate-400 font-normal'
                        }`}
                        title={`${monthName} ${day.dayNumber}, ${selectedYear} (${day.dayOfWeek})`}
                      >
                        <div className="flex flex-col items-center select-none">
                          <span className="text-[10px] text-slate-300 leading-none">
                            {day.dayOfWeek}
                          </span>
                          <span className="text-xs font-extrabold mt-0.5">
                            {day.dayNumber}
                          </span>
                        </div>
                      </th>
                    );
                  })}

                  {/* Summary Column */}
                  <th className="bg-slate-900 dark:bg-slate-950 px-3 py-3 text-center min-w-[120px] border-l border-slate-800">
                    <div className="flex flex-col items-center">
                      <span>Monthly Summary</span>
                      <span className="text-[10px] text-slate-400 font-normal">Attended / Total</span>
                    </div>
                  </th>
                </tr>
              </thead>

              {/* Student Rows with Staggered Fade-in Animation & Historical Tagging */}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {rosterStudents.map((student, idx) => {
                  const stats = studentStats.get(student.id);
                  const isHistorical = student.isHistoricalLeft;

                  return (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.025, 0.4) }}
                      className={`${
                        isHistorical
                          ? 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors'
                      }`}
                    >
                      {/* Sticky Student Name cell */}
                      <td
                        className={`sticky left-0 z-10 ${
                          isHistorical
                            ? 'bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400'
                            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                        } px-4 py-2.5 font-medium border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.04)] whitespace-nowrap transition-colors`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-slate-400 dark:text-slate-500 font-mono text-[11px] shrink-0">
                            {idx + 1}.
                          </span>
                          <span
                            className={`font-bold truncate ${
                              isHistorical ? 'text-slate-600 dark:text-slate-400 line-through decoration-slate-300' : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {student.firstName} {student.surname}
                          </span>
                          {isHistorical && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shrink-0 flex items-center gap-1">
                              <UserX className="w-2.5 h-2.5" />
                              <span>Left Cohort</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Matrix cells for each day */}
                      {daysInMonth.map((day) => {
                        const rec = recordsByDate.get(day.dateStr);
                        const status = rec?.statusMap?.[student.id];
                        const isSelected =
                          activeCellDetail?.student.id === student.id &&
                          activeCellDetail?.dateStr === day.dateStr;

                        // Condition B constraint: Lock all date cells after student's departure
                        const isAfterDeparture =
                          isHistorical &&
                          student.lastAttendanceDateInGroupInMonth &&
                          day.dateStr > student.lastAttendanceDateInGroupInMonth;

                        if (isAfterDeparture) {
                          return (
                            <td
                              key={day.dayNumber}
                              className="p-1 text-center border-r border-slate-100 dark:border-slate-800/60 bg-slate-100/50 dark:bg-slate-950/40 text-slate-300 dark:text-slate-600 cursor-not-allowed select-none"
                              title={`Transferred / Left cohort before ${day.dateStr}`}
                            >
                              <div className="w-7 h-7 mx-auto rounded-lg flex items-center justify-center text-xs text-slate-300 dark:text-slate-600 font-mono select-none">
                                /
                              </div>
                            </td>
                          );
                        }

                        if (status === 'present') {
                          return (
                            <td
                              key={day.dayNumber}
                              onClick={(e) => handleCellClick(e, student, day)}
                              className={`p-1 text-center border-r border-slate-100 dark:border-slate-800/80 cursor-pointer transition-all hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 active:scale-95 ${
                                isSelected ? 'ring-2 ring-indigo-500 rounded-lg z-10' : ''
                              }`}
                              title={`Click to view details for ${student.firstName} on ${day.dateStr}`}
                            >
                              <div className="w-7 h-7 mx-auto rounded-lg bg-green-50 dark:bg-emerald-950/80 border border-green-400 dark:border-emerald-600 text-green-700 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center shadow-xs">
                                +
                              </div>
                            </td>
                          );
                        }

                        if (status === 'late') {
                          return (
                            <td
                              key={day.dayNumber}
                              onClick={(e) => handleCellClick(e, student, day)}
                              className={`p-1 text-center border-r border-slate-100 dark:border-slate-800/80 cursor-pointer transition-all hover:bg-amber-100/50 dark:hover:bg-amber-900/40 active:scale-95 ${
                                isSelected ? 'ring-2 ring-indigo-500 rounded-lg z-10' : ''
                              }`}
                              title={`Late for ${student.firstName} on ${day.dateStr}`}
                            >
                              <div className="w-7 h-7 mx-auto rounded-lg bg-amber-50 dark:bg-amber-950/80 border border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300 font-extrabold text-xs flex items-center justify-center shadow-xs" title="Late (Kechikdi)">
                                K
                              </div>
                            </td>
                          );
                        }

                        if (status === 'absent') {
                          return (
                            <td
                              key={day.dayNumber}
                              onClick={(e) => handleCellClick(e, student, day)}
                              className={`p-1 text-center border-r border-slate-100 dark:border-slate-800/80 cursor-pointer transition-all hover:bg-rose-100/50 dark:hover:bg-rose-900/40 active:scale-95 ${
                                isSelected ? 'ring-2 ring-indigo-500 rounded-lg z-10' : ''
                              }`}
                              title={`Click to view details for ${student.firstName} on ${day.dateStr}`}
                            >
                              <div className="w-7 h-7 mx-auto rounded-lg bg-red-50 dark:bg-rose-950/80 border border-red-400 dark:border-rose-600 text-red-700 dark:text-rose-300 font-extrabold text-xs flex items-center justify-center shadow-xs">
                                -
                              </div>
                            </td>
                          );
                        }

                        // No record
                        return (
                          <td
                            key={day.dayNumber}
                            onClick={(e) => handleCellClick(e, student, day)}
                            className={`p-1 text-center border-r border-slate-100 dark:border-slate-800/60 text-slate-300 dark:text-slate-600 font-medium cursor-pointer transition-all hover:bg-slate-100/70 dark:hover:bg-slate-800/60 active:scale-95 ${
                              isSelected ? 'ring-2 ring-indigo-500 rounded-lg z-10' : ''
                            }`}
                            title={`Click to view details for ${student.firstName} on ${day.dateStr}`}
                          >
                            <div className="w-7 h-7 mx-auto rounded-lg flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-600 select-none">
                              ?
                            </div>
                          </td>
                        );
                      })}

                      {/* Student Attendance Rate / Total (Scoped to selected month) */}
                      <td className="px-3 py-2 text-center border-l border-slate-200 dark:border-slate-800 whitespace-nowrap bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                              <AnimatedCounter value={stats?.presentCount || 0} />
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                              / {stats?.assessedSessions || 0}
                            </span>
                          </div>
                          {stats && stats.assessedSessions > 0 && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                stats.rate >= 90
                                    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60'
                                    : stats.rate >= 75
                                    ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60'
                                    : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60'
                              }`}
                            >
                              {stats.rate}%
                            </span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>

              {/* Bottom Summary Rows with Rolling Counters */}
              <tfoot>
                {/* 1. Daily Present Count */}
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                  <td className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 border-r border-slate-300 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-extrabold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Daily Present Count</span>
                    </div>
                  </td>

                  {dailyStats.map((stat) => (
                    <td
                      key={stat.dayNumber}
                      className={`p-1 text-center border-r border-slate-200 dark:border-slate-700 font-mono text-xs ${
                        stat.hasRecord
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold'
                          : 'text-slate-400 dark:text-slate-600 font-normal'
                      }`}
                    >
                      {stat.hasRecord ? stat.presentCount : '—'}
                    </td>
                  ))}

                  <td className="px-3 py-2.5 text-center border-l border-slate-300 dark:border-slate-700 bg-emerald-100/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-extrabold">
                    <AnimatedCounter value={monthlyTotalAttended} />
                  </td>
                </tr>

                {/* 2. Running Cumulative Total of Attended Lessons */}
                <tr className="bg-indigo-900 dark:bg-indigo-950 text-white font-bold border-t border-indigo-800 dark:border-indigo-900 text-xs">
                  <td className="sticky left-0 z-10 bg-indigo-900 dark:bg-indigo-950 px-4 py-2.5 border-r border-indigo-800 dark:border-indigo-900 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-1.5 text-indigo-100 font-extrabold">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Cumulative Total</span>
                    </div>
                  </td>

                  {dailyStats.map((stat) => (
                    <td
                      key={stat.dayNumber}
                      className={`p-1 text-center border-r border-indigo-800/60 dark:border-indigo-900/60 font-mono text-[11px] ${
                        stat.hasRecord
                          ? 'bg-indigo-950/80 dark:bg-slate-900/90 text-indigo-200 font-bold'
                          : 'text-indigo-400/40 dark:text-indigo-500/30 font-normal'
                      }`}
                      title={stat.cumulativePresent !== null ? `Cumulative: ${stat.cumulativePresent} attended lessons up to day ${stat.dayNumber}` : undefined}
                    >
                      {stat.cumulativePresent !== null ? stat.cumulativePresent : '—'}
                    </td>
                  ))}

                  <td className="px-3 py-2.5 text-center border-l border-indigo-800 dark:border-indigo-900 bg-indigo-950 dark:bg-slate-950 text-indigo-200 font-black">
                    <AnimatedCounter value={monthlyTotalAttended} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Soft Popover Box over clicked cell */}
      <AnimatePresence>
        {activeCellDetail && (
          <>
            {/* Soft dismiss backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/10 dark:bg-black/30 backdrop-blur-[1px] transition-opacity"
              onClick={() => setActiveCellDetail(null)}
            />

            {/* Soft Floating Box Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              style={{
                top: typeof window !== 'undefined' && window.innerWidth > 640 ? activeCellDetail.position.top : undefined,
                left: typeof window !== 'undefined' && window.innerWidth > 640 ? activeCellDetail.position.left : undefined,
              }}
              className="fixed z-50 max-sm:inset-x-4 max-sm:top-1/2 max-sm:-translate-y-1/2 w-[calc(100vw-32px)] sm:w-[320px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 text-slate-800 dark:text-slate-100 transition-all"
            >
              {/* Header: Student Name & Close Button */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                    {activeCellDetail.student.firstName.charAt(0)}
                    {activeCellDetail.student.surname.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm truncate leading-tight flex items-center gap-1.5">
                      <span>{activeCellDetail.student.firstName} {activeCellDetail.student.surname}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
                      {group.name} {activeCellDetail.student.isHistoricalLeft && '(Historical record)'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveCellDetail(null)}
                  className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Body Content */}
              <div className="space-y-3 pt-3">
                {/* Status & Date */}
                <div className="flex items-center justify-between gap-2">
                  {/* Status Pill */}
                  {activeCellDetail.status === 'present' ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Present</span>
                    </div>
                  ) : activeCellDetail.status === 'late' ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-extrabold text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Late (Kechikdi)</span>
                    </div>
                  ) : activeCellDetail.status === 'absent' ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-extrabold text-xs">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Absent</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Not Recorded</span>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>
                      {new Date(activeCellDetail.dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* Mark / Grade */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                    <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Academic Mark:</span>
                  </div>
                  {activeCellDetail.mark !== undefined && activeCellDetail.mark !== '' ? (
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                      {activeCellDetail.mark}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 font-normal italic">
                      Not graded
                    </span>
                  )}
                </div>

                {/* Teacher Comments */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <MessageSquare className="w-3 h-3 text-slate-400" />
                    <span>Comments</span>
                  </div>
                  <div className="text-xs p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 min-h-[38px] flex items-center">
                    {activeCellDetail.comment ? (
                      <span className="italic font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                        "{activeCellDetail.comment}"
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 text-xs italic">
                        No comments recorded.
                      </span>
                    )}
                  </div>
                </div>

                {/* Topic Covered if available */}
                {activeCellDetail.topicCovered && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">
                      Topic: <strong className="text-slate-700 dark:text-slate-300">{activeCellDetail.topicCovered}</strong>
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
