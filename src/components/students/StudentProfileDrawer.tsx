import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../../types';
import { useData } from '../../context/DataContext';
import { X, Phone, Calendar, BookOpen, Clock, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { TeacherAvatar } from '../common/TeacherAvatar';

interface StudentProfileDrawerProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StudentProfileDrawer: React.FC<StudentProfileDrawerProps> = ({
  student,
  isOpen,
  onClose
}) => {
  const { groups, teachers, attendanceRecords } = useData();

  const [isCurrentExpanded, setIsCurrentExpanded] = useState(false);
  const [expandedPastGroups, setExpandedPastGroups] = useState<Record<string, boolean>>({});

  if (!isOpen || !student) return null;

  const currentGroup = student.groupId ? groups.find((g) => g.id === student.groupId) : null;
  const currentGroupTeacher = currentGroup
    ? teachers.find((t) => t.id === currentGroup.teacherId)
    : null;

  // Gather past groups
  const pastGroupIds: string[] = [];
  if (student.previousGroupId) pastGroupIds.push(student.previousGroupId);
  attendanceRecords.forEach((r) => {
    if (r.statusMap && r.statusMap[student.id] && r.groupId !== student.groupId && !pastGroupIds.includes(r.groupId)) {
      pastGroupIds.push(r.groupId);
    }
  });
  const previousGroupsList = pastGroupIds.map((id) => groups.find((g) => g.id === id)).filter(Boolean) as any[];

  // Helper to compute monthly breakdown and full calendar days for any group
  const getMonthlyBreakdown = (groupId: string) => {
    const groupRecords = attendanceRecords
      .filter((r) => r.groupId === groupId && r.statusMap && r.statusMap[student.id])
      .sort((a, b) => a.date.localeCompare(b.date));

    const monthMap = new Map<string, Array<{ date: string; status: string }>>();

    groupRecords.forEach((r) => {
      const status = r.statusMap[student.id];
      if (!status) return;
      const monthKey = r.date.slice(0, 7); // YYYY-MM
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push({ date: r.date, status });
    });

    const months = Array.from(monthMap.entries()).map(([monthKey, sessions]) => {
      let present = 0;
      let late = 0;
      let absent = 0;

      const sessionsMap = new Map<string, string>();
      sessions.forEach((s) => {
        sessionsMap.set(s.date, s.status);
        if (s.status === 'present') present++;
        else if (s.status === 'late') late++;
        else if (s.status === 'absent') absent++;
      });
      const total = present + late + absent;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      const [yearStr, monthStr] = monthKey.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const dateObj = new Date(year, month - 1, 1);
      const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Generate all days in the month for full calendar grid
      const daysInMonth = new Date(year, month, 0).getDate();
      const calendarDays: Array<{ dayNum: number; dateStr: string; weekday: string; status?: string }> = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayPad = String(d).padStart(2, '0');
        const monthPad = String(month).padStart(2, '0');
        const dateStr = `${year}-${monthPad}-${dayPad}`;
        const dayDateObj = new Date(year, month - 1, d);
        const weekday = dayDateObj.toLocaleDateString('en-US', { weekday: 'narrow' }); // M, T, W, T, F, S, S
        const status = sessionsMap.get(dateStr);
        calendarDays.push({
          dayNum: d,
          dateStr,
          weekday,
          status
        });
      }

      return {
        monthKey,
        monthName,
        calendarDays,
        present,
        late,
        absent,
        total,
        rate
      };
    });

    return months.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  };

  const currentMonths = currentGroup ? getMonthlyBreakdown(currentGroup.id) : [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <AnimatePresence>
        <motion.div
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 overflow-y-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-indigo-600/25">
                {student.firstName.charAt(0)}{student.surname.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {student.firstName} {student.surname}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">
                    ID: #{student.studentId || student.id.slice(-5)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                      student.status === 'inactive'
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                    }`}
                  >
                    {student.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 flex-1">
            {/* Quick Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Phone className="w-3.5 h-3.5 text-indigo-500" />
                  Parent Phone
                </div>
                <div className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                  {student.parentPhone}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  Birthdate
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {student.birthDate || 'Not specified'}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  Current Group
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {currentGroup ? currentGroup.name : 'Unassigned'}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Enrolled Date
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {student.enrolledDate}
                </div>
              </div>
            </div>

            {student.telegramChatId || student.parentTelegramId ? (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Parent Telegram Chat ID
                </div>
                <div className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                  {student.telegramChatId || student.parentTelegramId}
                </div>
              </div>
            ) : null}

            {/* Notes if any */}
            {student.notes && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold block mb-1">Student Notes:</span>
                {student.notes}
              </div>
            )}

            {/* SECTION 1: Current Group Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                  Current Group History
                </h3>
              </div>

              {currentGroup ? (
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TeacherAvatar
                        teacher={{
                          name: currentGroupTeacher?.name || 'Instructor',
                          firstName: currentGroupTeacher?.firstName,
                          surname: currentGroupTeacher?.surname,
                          avatarColor: currentGroupTeacher?.avatarColor
                        }}
                        className="w-10 h-10"
                      />
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {currentGroup.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Instructor: <span className="font-bold">{currentGroupTeacher?.name || 'Assigned Staff'}</span>
                        </p>
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                          Studying since: {student.enrolledDate}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expandable monthly calendar dropdown */}
                  <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/60">
                    <button
                      onClick={() => setIsCurrentExpanded(!isCurrentExpanded)}
                      className="w-full flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 py-1.5 cursor-pointer"
                    >
                      <span>Monthly Attendance Calendars ({currentMonths.length} active months)</span>
                      {isCurrentExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isCurrentExpanded && (
                      <div className="mt-3 space-y-4 pt-2">
                        {currentMonths.length > 0 ? (
                          currentMonths.map((m) => (
                            <div
                              key={m.monthKey}
                              className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs shadow-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                  {m.monthName}
                                </span>
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
                                  Rate: {m.rate}%
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                                  Present: {m.present}
                                </span>
                                {m.late > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                                    Late: {m.late}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                                  Absent: {m.absent}
                                </span>
                              </div>

                              {/* Monthly Calendar Grid */}
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="grid grid-cols-7 gap-1.5">
                                  {m.calendarDays.map((cal, cIdx) => {
                                    const isPresentOrLate = cal.status === 'present' || cal.status === 'late';
                                    const isAbsent = cal.status === 'absent';

                                    let boxStyle = 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700/60 opacity-60';
                                    if (isPresentOrLate) {
                                      boxStyle = 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 font-bold shadow-xs';
                                    } else if (isAbsent) {
                                      boxStyle = 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700 font-bold shadow-xs';
                                    }

                                    return (
                                      <div
                                        key={cIdx}
                                        className={`p-1 rounded-lg border flex flex-col items-center justify-center text-center transition-all ${boxStyle}`}
                                        title={`${cal.dateStr}${cal.status ? `: ${cal.status}` : ' (No session)'}`}
                                      >
                                        <span className="text-[9px] uppercase tracking-wider font-semibold opacity-75">
                                          {cal.weekday}
                                        </span>
                                        <span className="text-xs font-mono font-bold mt-0.5">
                                          {cal.dayNum}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-500 italic text-center py-2">
                            No attendance records found for current group yet.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-500 italic text-center">
                  Student is currently not enrolled in any active group.
                </div>
              )}
            </div>

            {/* SECTION 2: Previous Groups History Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                  Previous Groups History
                </h3>
              </div>

              {previousGroupsList.length > 0 ? (
                <div className="space-y-3">
                  {previousGroupsList.map((pg) => {
                    const pgTeacher = teachers.find((t) => t.id === pg.teacherId);
                    const pgMonths = getMonthlyBreakdown(pg.id);
                    const isExpanded = expandedPastGroups[pg.id] || false;
                    const periodStart = pg.createdAt ? new Date(pg.createdAt).toLocaleDateString() : 'Past';
                    const periodEnd = student.transferDate ? new Date(student.transferDate).toLocaleDateString() : 'Recent';

                    return (
                      <div
                        key={pg.id}
                        className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <TeacherAvatar
                              teacher={{
                                name: pgTeacher?.name || 'Instructor',
                                firstName: pgTeacher?.firstName,
                                surname: pgTeacher?.surname,
                                avatarColor: pgTeacher?.avatarColor
                              }}
                              className="w-10 h-10"
                            />
                            <div>
                              <span className="font-extrabold text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                                Past Cohort
                              </span>
                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                                {pg.name}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Instructor: <span className="font-bold">{pgTeacher?.name || 'Staff'}</span>
                              </p>
                              <p className="text-[11px] text-slate-400 italic mt-0.5">
                                Active period: {periodStart} — {periodEnd}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Expandable historical monthly calendars */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                          <button
                            onClick={() =>
                              setExpandedPastGroups((prev) => ({
                                ...prev,
                                [pg.id]: !isExpanded
                              }))
                            }
                            className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1.5 cursor-pointer"
                          >
                            <span>Monthly Attendance History ({pgMonths.length} active months)</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 space-y-4 pt-2">
                              {pgMonths.length > 0 ? (
                                pgMonths.map((m) => (
                                  <div
                                    key={m.monthKey}
                                    className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs shadow-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                        {m.monthName}
                                      </span>
                                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                        Rate: {m.rate}%
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                                        Present: {m.present}
                                      </span>
                                      {m.late > 0 && (
                                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                                          Late: {m.late}
                                        </span>
                                      )}
                                      <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                                        Absent: {m.absent}
                                      </span>
                                    </div>

                                    {/* Monthly Calendar Grid */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                      <div className="grid grid-cols-7 gap-1.5">
                                        {m.calendarDays.map((cal, cIdx) => {
                                          const isPresentOrLate = cal.status === 'present' || cal.status === 'late';
                                          const isAbsent = cal.status === 'absent';

                                          let boxStyle = 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700/60 opacity-60';
                                          if (isPresentOrLate) {
                                            boxStyle = 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 font-bold shadow-xs';
                                          } else if (isAbsent) {
                                            boxStyle = 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700 font-bold shadow-xs';
                                          }

                                          return (
                                            <div
                                              key={cIdx}
                                              className={`p-1 rounded-lg border flex flex-col items-center justify-center text-center transition-all ${boxStyle}`}
                                              title={`${cal.dateStr}${cal.status ? `: ${cal.status}` : ' (No session)'}`}
                                            >
                                              <span className="text-[9px] uppercase tracking-wider font-semibold opacity-75">
                                                {cal.weekday}
                                              </span>
                                              <span className="text-xs font-mono font-bold mt-0.5">
                                                {cal.dayNum}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-slate-500 italic text-center py-2">
                                  No historical attendance records preserved for this past group.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-500 italic text-center">
                  No previous group history.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
