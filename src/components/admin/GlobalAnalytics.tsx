import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { AnimatedCounter } from '../common/AnimatedCounter';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Download,
  BookOpen,
  ArrowRight
} from 'lucide-react';

interface GlobalAnalyticsProps {
  onSelectGroup: (groupId: string) => void;
}

export const GlobalAnalytics: React.FC<GlobalAnalyticsProps> = ({ onSelectGroup }) => {
  const { groups, teachers, students, attendanceRecords } = useData();

  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

  // Filter attendance records by month and group
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((r) => {
      const matchMonth = r.date.startsWith(selectedMonth);
      const matchGroup = selectedGroupFilter === 'all' || r.groupId === selectedGroupFilter;
      return matchMonth && matchGroup;
    });
  }, [attendanceRecords, selectedMonth, selectedGroupFilter]);

  // Aggregate breakdown (Present & Absent)
  let totalPresences = 0;
  let totalAbsences = 0;
  let totalMarksCount = 0;
  let sumMarks = 0;

  filteredRecords.forEach((rec) => {
    Object.values(rec.statusMap || {}).forEach((st) => {
      if (st === 'present') totalPresences++;
      else if (st === 'absent') totalAbsences++;
    });

    Object.values(rec.marksMap || {}).forEach((m) => {
      if (typeof m === 'number' && !isNaN(m)) {
        sumMarks += m;
        totalMarksCount++;
      } else if (typeof m === 'string' && m.trim() !== '' && !isNaN(Number(m))) {
        sumMarks += Number(m);
        totalMarksCount++;
      }
    });
  });

  const totalEntries = totalPresences + totalAbsences;
  const overallRate =
    totalEntries > 0 ? Math.round((totalPresences / totalEntries) * 100) : 100;
  const averageMark =
    totalMarksCount > 0 ? Math.round((sumMarks / totalMarksCount) * 10) / 10 : null;

  // Export CSV Report
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Group Name,Instructor,Topic Covered,Present,Absent,Graded Count\n';

    filteredRecords.forEach((rec) => {
      const grp = groups.find((g) => g.id === rec.groupId);
      const p = Object.values(rec.statusMap || {}).filter((v) => v === 'present').length;
      const a = Object.values(rec.statusMap || {}).filter((v) => v === 'absent').length;
      const graded = Object.keys(rec.marksMap || {}).filter((k) => rec.marksMap?.[k] !== '' && rec.marksMap?.[k] !== undefined).length;
      const topic = `"${(rec.topicCovered || '').replace(/"/g, '""')}"`;
      const groupName = `"${(grp?.name || '').replace(/"/g, '""')}"`;
      const teacher = `"${(grp?.teacherName || '').replace(/"/g, '""')}"`;

      csvContent += `${rec.date},${groupName},${teacher},${topic},${p},${a},${graded}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Open_World_Attendance_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border-none shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md w-fit mb-1.5 border border-indigo-200 dark:border-indigo-800">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Attendance & Marks Telemetry</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Center Attendance & Academic Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Global attendance distribution, average academic marks, and downloadable registers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 outline-none transition-colors"
          />

          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 outline-none transition-colors"
          >
            <option value="all">All Learning Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Rate Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Present */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Present Marks</span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              <AnimatedCounter value={totalPresences} durationMs={3000} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              {totalEntries > 0 ? Math.round((totalPresences / totalEntries) * 100) : 0}% of all records
            </p>
          </div>
        </div>

        {/* Absent */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Absent Marks</span>
            <div className="w-8 h-8 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              <AnimatedCounter value={totalAbsences} durationMs={3000} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              {totalEntries > 0 ? Math.round((totalAbsences / totalEntries) * 100) : 0}% missed sessions
            </p>
          </div>
        </div>

        {/* Average Mark / Grade */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Average Mark</span>
            <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Award className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {averageMark !== null ? (
                <AnimatedCounter value={averageMark} decimals={1} durationMs={3000} />
              ) : (
                'N/A'
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Across {totalMarksCount} graded assessments
            </p>
          </div>
        </div>

        {/* Overall Attendance Efficiency */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Attendance Rate</span>
            <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              <AnimatedCounter value={overallRate} suffix="%" durationMs={3000} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Present vs Absent ratio</p>
          </div>
        </div>
      </div>

      {/* Full Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border-none overflow-hidden shadow-xs transition-colors">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Recorded Session Registers ({filteredRecords.length} entries for {selectedMonth})
          </h3>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            No attendance registers recorded for this month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Group</th>
                  <th className="px-6 py-3">Topic / Curriculum</th>
                  <th className="px-6 py-3 text-center">Present</th>
                  <th className="px-6 py-3 text-center">Absent</th>
                  <th className="px-6 py-3 text-center">Graded</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredRecords.map((r) => {
                  const grp = groups.find((g) => g.id === r.groupId);
                  const p = Object.values(r.statusMap || {}).filter((v) => v === 'present').length;
                  const a = Object.values(r.statusMap || {}).filter((v) => v === 'absent').length;
                  const gradedCount = Object.keys(r.marksMap || {}).filter((k) => r.marksMap?.[k] !== '' && r.marksMap?.[k] !== undefined).length;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {grp?.name || 'Group'}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-slate-600 dark:text-slate-400">
                        {r.topicCovered || <span className="text-slate-400 dark:text-slate-500 italic">No topic recorded</span>}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {p}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-rose-600 dark:text-rose-400">
                        {a}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        {gradedCount > 0 ? `${gradedCount} students` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectGroup(r.groupId)}
                          className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold transition-colors border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
