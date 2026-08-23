import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Group, AttendanceRecord, Student } from '../../types';
import { Calendar } from 'lucide-react';

interface CohortAnalyticsChartProps {
  group: Group;
  yearMonth: string; // "YYYY-MM"
  attendanceRecords: AttendanceRecord[];
  students: Student[];
}

export const CohortAnalyticsChart: React.FC<CohortAnalyticsChartProps> = ({
  group,
  yearMonth,
  attendanceRecords,
  students
}) => {
  const [hoveredLesson, setHoveredLesson] = useState<{
    lesson: string;
    date?: string;
    percentage: number;
    fraction: string;
    x: number;
    y: number;
  } | null>(null);

  // Group roster students
  const rosterStudents = useMemo(() => {
    return students.filter((s) => s.groupId === group.id && s.status !== 'inactive');
  }, [students, group.id]);

  // Compute 13 lessons for this group in the selected yearMonth
  const lessonsData = useMemo(() => {
    const groupRecords = attendanceRecords
      .filter((r) => r.groupId === group.id && r.date.startsWith(yearMonth))
      .sort((a, b) => a.date.localeCompare(b.date));

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
      const rec = groupRecords[i];
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

  const avgAttendance = useMemo(() => {
    const recorded = lessonsData.filter((d) => d.hasRecord);
    if (recorded.length === 0) return 0;
    const sum = recorded.reduce((acc, cur) => acc + cur.percentage, 0);
    return Math.round(sum / recorded.length);
  }, [lessonsData]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-5 sm:p-6 shadow-xs border-none space-y-4 transition-colors">
      {/* Cohort Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{group.name}</h3>
            <span className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-bold">
              Avg: {avgAttendance}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {group.schedule} • {rosterStudents.length} Students Enrolled
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <span>13 Monthly Lesson Cycles</span>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="relative pt-6 pb-2">
        {/* Y-Axis Grid Lines & Labels */}
        <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none text-[10px] font-mono text-slate-400 dark:text-slate-500">
          <div className="border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center pr-2">
            <span>100%</span>
          </div>
          <div className="border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center pr-2">
            <span>75%</span>
          </div>
          <div className="border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center pr-2">
            <span>50%</span>
          </div>
          <div className="border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center pr-2">
            <span>25%</span>
          </div>
          <div className="border-b border-slate-200 dark:border-slate-700 flex justify-between items-center pr-2">
            <span>0%</span>
          </div>
        </div>

        {/* Bars Grid */}
        <div className="relative h-48 flex items-end justify-between gap-1 sm:gap-2 px-2 z-10">
          {lessonsData.map((item, idx) => {
            const heightPercentage = item.percentage;

            return (
              <div
                key={item.lesson}
                className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredLesson({
                    lesson: item.lesson,
                    date: item.date,
                    percentage: item.percentage,
                    fraction: `${item.presentCount}/${item.totalStudents} Students`,
                    x: rect.left + rect.width / 2,
                    y: rect.top
                  });
                }}
                onMouseLeave={() => setHoveredLesson(null)}
              >
                {/* Animated Staggered Bar */}
                <div className="w-full max-w-[28px] h-full flex items-end">
                  <motion.div
                    initial={{ height: '0%' }}
                    animate={{ height: `${Math.max(item.hasRecord ? 4 : 0, heightPercentage)}%` }}
                    transition={{
                      duration: 0.8,
                      delay: idx * 0.05,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    className={`w-full rounded-t-[4px] transition-colors ${
                      item.hasRecord
                        ? 'bg-emerald-500 hover:bg-emerald-400 shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                </div>

                {/* X-Axis Lesson Label */}
                <span className="mt-2 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {item.lesson}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Custom Tooltip */}
      {hoveredLesson && (
        <div
          style={{
            position: 'fixed',
            top: hoveredLesson.y - 64,
            left: hoveredLesson.x,
            transform: 'translateX(-50%)',
            zIndex: 100
          }}
          className="pointer-events-none bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl border border-slate-700 text-xs whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="font-extrabold text-emerald-400 flex items-center gap-1.5">
            <span>{hoveredLesson.lesson}</span>
            {hoveredLesson.date && <span className="text-[10px] text-slate-400 font-normal">({hoveredLesson.date})</span>}
          </div>
          <div className="text-slate-200 font-semibold mt-0.5">
            {hoveredLesson.percentage}% — {hoveredLesson.fraction}
          </div>
        </div>
      )}
    </div>
  );
};
