import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { CalendarCheck2, Search, Filter, BookOpen, Clock, Users, ArrowRight, Award } from 'lucide-react';

interface TeacherAttendanceLogProps {
  onSelectGroup: (groupId: string) => void;
}

export const TeacherAttendanceLog: React.FC<TeacherAttendanceLogProps> = ({ onSelectGroup }) => {
  const { currentUser } = useAuth();
  const { groups, attendanceRecords } = useData();

  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const myGroups = groups.filter((g) => g.teacherId === currentUser?.id);
  const myGroupIds = new Set(myGroups.map((g) => g.id));

  const filteredRecords = attendanceRecords
    .filter((r) => myGroupIds.has(r.groupId))
    .filter((r) => (selectedGroupId === 'all' ? true : r.groupId === selectedGroupId))
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const groupName = groups.find((g) => g.id === r.groupId)?.name?.toLowerCase() || '';
      const topic = (r.topicCovered || '').toLowerCase();
      return groupName.includes(q) || topic.includes(q) || r.date.includes(q);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 pb-20 md:pb-12 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Attendance & Grades Log
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete history of completed registers, grades, and covered curriculum topics
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 outline-none"
          >
            <option value="all">All My Groups</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topic or date..."
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Record list */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition-colors">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm">
            No attendance records match your criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRecords.map((record) => {
              const grp = groups.find((g) => g.id === record.groupId);
              const pCount = Object.values(record.statusMap || {}).filter((v) => v === 'present').length;
              const aCount = Object.values(record.statusMap || {}).filter((v) => v === 'absent').length;
              const total = pCount + aCount;
              const rate = total > 0 ? Math.round((pCount / total) * 100) : 100;
              const marksCount = Object.keys(record.marksMap || {}).filter((k) => record.marksMap?.[k] !== '' && record.marksMap?.[k] !== undefined).length;

              return (
                <div
                  key={record.id}
                  onClick={() => onSelectGroup(record.groupId)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {grp?.name || 'Group'}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        • {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {rate}% Attendance
                      </span>
                      {marksCount > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                          <Award className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          {marksCount} Graded
                        </span>
                      )}
                    </div>

                    {record.topicCovered && (
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                        Topic: {record.topicCovered}
                      </p>
                    )}

                    {record.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        {record.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="text-emerald-600 dark:text-emerald-400">{pCount} Present</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-rose-600 dark:text-rose-400">{aCount} Absent</span>
                    </div>

                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/80 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <span>Open Roll</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
