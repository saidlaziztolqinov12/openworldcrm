import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { SalaryAdvance, User } from '../../types';
import { TeacherAvatar } from '../common/TeacherAvatar';
import {
  Wallet,
  Plus,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  X,
  Check,
  AlertTriangle,
  Banknote,
  Receipt,
  Users,
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { todayLocalDateString } from '../../utils/date';

const MONTH_NAMES = [
  { num: '01', short: 'Jan', full: 'January' },
  { num: '02', short: 'Feb', full: 'February' },
  { num: '03', short: 'Mar', full: 'March' },
  { num: '04', short: 'Apr', full: 'April' },
  { num: '05', short: 'May', full: 'May' },
  { num: '06', short: 'Jun', full: 'June' },
  { num: '07', short: 'Jul', full: 'July' },
  { num: '08', short: 'Aug', full: 'August' },
  { num: '09', short: 'Sep', full: 'September' },
  { num: '10', short: 'Oct', full: 'October' },
  { num: '11', short: 'Nov', full: 'November' },
  { num: '12', short: 'Dec', full: 'December' }
];

export const SalaryAdvancesView: React.FC = () => {
  const { salaryAdvances, teachers, addSalaryAdvance, updateSalaryAdvance, deleteSalaryAdvance } = useData();
  const { currentUser } = useAuth();

  // Current month state (YYYY-MM)
  const now = new Date();
  const currentActualYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentActualYearMonth);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Month & Year Picker popup state
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(() => parseInt(selectedMonth.split('-')[0], 10) || now.getFullYear());

  // Expanded teacher accordion state (set of teacherIds)
  const [expandedTeachers, setExpandedTeachers] = useState<Record<string, boolean>>({});

  // Modal state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAdvance, setEditingAdvance] = useState<SalaryAdvance | null>(null);

  // Form states
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formAmountInput, setFormAmountInput] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(todayLocalDateString());
  const [formNote, setFormNote] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete confirmation state
  const [advanceToDelete, setAdvanceToDelete] = useState<SalaryAdvance | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Helper to format month display (e.g. "2026-08" -> "August 2026")
  const formatMonthTitle = (ym: string) => {
    try {
      const [year, month] = ym.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return ym;
    }
  };

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    const newYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newYm);
    setPickerYear(d.getFullYear());
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    const newYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newYm);
    setPickerYear(d.getFullYear());
  };

  const handleOpenMonthPicker = () => {
    const [year] = selectedMonth.split('-').map(Number);
    setPickerYear(year || now.getFullYear());
    setIsMonthPickerOpen(true);
  };

  const handleSelectMonthFromPicker = (monthNumStr: string) => {
    const newYm = `${pickerYear}-${monthNumStr}`;
    setSelectedMonth(newYm);
    setIsMonthPickerOpen(false);
  };

  const handleJumpToCurrentMonth = () => {
    setSelectedMonth(currentActualYearMonth);
    setPickerYear(now.getFullYear());
    setIsMonthPickerOpen(false);
  };

  // Filter advances matching selectedMonth
  const monthAdvances = useMemo(() => {
    return salaryAdvances.filter((adv) => {
      const advMonth = adv.monthYear || (adv.date ? adv.date.substring(0, 7) : '');
      return advMonth === selectedMonth;
    });
  }, [salaryAdvances, selectedMonth]);

  // Aggregate advances by month for month picker badges
  const advancesCountByYearMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    salaryAdvances.forEach((adv) => {
      const ym = adv.monthYear || (adv.date ? adv.date.substring(0, 7) : '');
      if (ym) {
        counts[ym] = (counts[ym] || 0) + 1;
      }
    });
    return counts;
  }, [salaryAdvances]);

  // Aggregate by teacherId
  const teacherGroupedMap = useMemo(() => {
    const map = new Map<
      string,
      {
        teacherId: string;
        teacherName: string;
        teacher: User | undefined;
        totalAmount: number;
        advanceCount: number;
        transactions: SalaryAdvance[];
      }
    >();

    monthAdvances.forEach((adv) => {
      const teacher = teachers.find((t) => t.id === adv.teacherId);
      const teacherName = adv.teacherName || teacher?.name || 'Unknown Teacher';

      if (!map.has(adv.teacherId)) {
        map.set(adv.teacherId, {
          teacherId: adv.teacherId,
          teacherName,
          teacher,
          totalAmount: 0,
          advanceCount: 0,
          transactions: []
        });
      }

      const group = map.get(adv.teacherId)!;
      group.totalAmount += Number(adv.amount) || 0;
      group.advanceCount += 1;
      group.transactions.push(adv);
    });

    // Sort transactions within each teacher by date newest first
    map.forEach((group) => {
      group.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return Array.from(map.values());
  }, [monthAdvances, teachers]);

  // Filtered list based on search query
  const filteredTeacherGroups = useMemo(() => {
    if (!searchQuery.trim()) return teacherGroupedMap;
    const q = searchQuery.toLowerCase();
    return teacherGroupedMap.filter((g) => g.teacherName.toLowerCase().includes(q));
  }, [teacherGroupedMap, searchQuery]);

  // Academy Totals for selected month
  const totalAcademyAdvances = useMemo(() => {
    return monthAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  }, [monthAdvances]);

  const uniqueTeachersCount = useMemo(() => {
    return teacherGroupedMap.length;
  }, [teacherGroupedMap]);

  const formatUZS = (num: number) => {
    return num.toLocaleString('en-US').replace(/,/g, ' ') + ' UZS';
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handleOpenAdd = (defaultTeacherId?: string) => {
    setEditingAdvance(null);
    setFormTeacherId(defaultTeacherId || teachers[0]?.id || '');
    setFormAmountInput('');
    setFormDate(todayLocalDateString());
    setFormNote('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (adv: SalaryAdvance) => {
    setEditingAdvance(adv);
    setFormTeacherId(adv.teacherId);
    setFormAmountInput(adv.amount.toLocaleString('en-US').replace(/,/g, ' '));
    setFormDate(adv.date || todayLocalDateString());
    setFormNote(adv.note || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setFormAmountInput('');
      return;
    }
    const num = parseInt(raw, 10);
    setFormAmountInput(num.toLocaleString('en-US').replace(/,/g, ' '));
  };

  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTeacherId) {
      setFormError('Please select a teacher.');
      return;
    }
    const cleanAmount = parseInt(formAmountInput.replace(/\D/g, ''), 10);
    if (!cleanAmount || cleanAmount <= 0) {
      setFormError('Please enter a valid advance amount.');
      return;
    }
    if (!formDate) {
      setFormError('Please select a date.');
      return;
    }

    const selectedTeacher = teachers.find((t) => t.id === formTeacherId);
    const teacherName = selectedTeacher?.name || 'Teacher';
    const monthYear = formDate.substring(0, 7);

    setIsSaving(true);
    setFormError(null);

    try {
      // Package full teacher metadata along with record
      const advancePayload = {
        teacherId: formTeacherId,
        teacherName,
        teacherEmail: selectedTeacher?.email || '',
        teacherPhone: selectedTeacher?.phone || '',
        teacherTitle: selectedTeacher?.title || '',
        teacherSubject: selectedTeacher?.subject || '',
        teacherAvatarColor: selectedTeacher?.avatarColor || '',
        amount: cleanAmount,
        date: formDate,
        monthYear,
        note: formNote.trim() || undefined,
        createdById: currentUser?.id,
        createdByName: currentUser?.name
      };

      if (editingAdvance) {
        await updateSalaryAdvance(editingAdvance.id, advancePayload);
        setSuccessToast('Salary advance updated and synced to database!');
      } else {
        await addSalaryAdvance(advancePayload);
        setSuccessToast('Salary advance recorded and added to database!');
      }

      setIsModalOpen(false);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      console.error('Failed to save salary advance to database:', err);
      setFormError('Failed to save record to database. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!advanceToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSalaryAdvance(advanceToDelete.id);
      setAdvanceToDelete(null);
      setSuccessToast('Salary advance deleted successfully.');
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      console.error('Failed to delete advance:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleTeacherExpand = (teacherId: string) => {
    setExpandedTeachers((prev) => ({
      ...prev,
      [teacherId]: !prev[teacherId]
    }));
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 overflow-x-hidden">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
          <Check className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header & Record Button */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-lg border-none shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full w-fit mb-1.5 border border-indigo-200/60 dark:border-indigo-800/60">
            <Wallet className="w-3.5 h-3.5" />
            <span>Financials & Advances</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Teacher Salary Advances
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track and manage cash advances distributed to faculty members with live database sync
          </p>
        </div>

        <button
          onClick={() => handleOpenAdd()}
          className="px-4 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Advance</span>
        </button>
      </div>

      {/* Top Controls: 1) Distinctive Clickable Month & Year Button, 2) Unified Total Advances & Transactions Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Distinctive Month & Year Selector Card */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-lg border-none shadow-xs flex flex-col justify-between gap-3 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
              <span>Billing Cycle Month</span>
            </span>
            <button
              onClick={handleJumpToCurrentMonth}
              className={`text-[11px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
                selectedMonth === currentActualYearMonth
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                  : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Current Month
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handlePrevMonth}
              className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/70 dark:border-slate-800 shrink-0"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Clickable, Distinctive Month & Year Button */}
            <button
              onClick={handleOpenMonthPicker}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-50/90 via-slate-50 to-indigo-50/90 dark:from-slate-800 dark:via-slate-850 dark:to-slate-800 border border-indigo-200/80 dark:border-indigo-800/80 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-sm transition-all flex items-center justify-between group cursor-pointer text-left"
              title="Click to choose any month & year"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    Choose Month
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    {formatMonthTitle(selectedMonth)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/80 dark:bg-slate-900/80 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <span>Select</span>
                <ChevronDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform" />
              </div>
            </button>

            <button
              onClick={handleNextMonth}
              className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/70 dark:border-slate-800 shrink-0"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1) Unified "Total Advances & Total Transactions in One Button/Card" */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-lg border-none shadow-xs flex flex-col justify-between gap-3 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-indigo-500" />
              <span>Monthly Advances Summary</span>
            </span>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
              {formatMonthTitle(selectedMonth)}
            </span>
          </div>

          {/* Unified Combined Button / Metric Container */}
          <div className="p-3.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-750 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Advances
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {formatUZS(totalAcademyAdvances)}
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="space-y-0.5 text-left sm:text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Transactions
                </div>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
                  <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {monthAdvances.length} {monthAdvances.length === 1 ? 'record' : 'records'}
                  </span>
                  <span className="text-slate-400 font-normal">
                    ({uniqueTeachersCount} {uniqueTeachersCount === 1 ? 'teacher' : 'teachers'})
                  </span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-indigo-100/70 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-lg border-none shadow-xs flex items-center gap-3 transition-colors">
        <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
        <input
          type="text"
          placeholder="Filter teachers by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* 4) Neat Mobile-First Teacher-Grouped Accordion List */}
      <div className="space-y-3">
        {filteredTeacherGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg p-10 sm:p-14 text-center shadow-xs border-none">
            <Wallet className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No salary advances recorded for {formatMonthTitle(selectedMonth)}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Click "+ Record Advance" above to add a new cash advance entry with automatic database persistence.
            </p>
          </div>
        ) : (
          filteredTeacherGroups.map((group) => {
            const isExpanded = !!expandedTeachers[group.teacherId];
            return (
              <div
                key={group.teacherId}
                className="bg-white dark:bg-slate-900 rounded-lg border-none shadow-xs overflow-hidden transition-all"
              >
                {/* 4) Teacher Card Header (Mobile Optimized: Name on top, Took [Amount] ([Count] times) directly under it) */}
                <div
                  onClick={() => toggleTeacherExpand(group.teacherId)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors select-none"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <TeacherAvatar
                      teacher={group.teacher || { name: group.teacherName }}
                      className="w-10 h-10 sm:w-11 sm:h-11 shrink-0"
                    />
                    <div className="min-w-0">
                      {/* Teacher's Name */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                          {group.teacherName}
                        </h3>
                        {group.teacher?.title && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                            {group.teacher.title}
                          </span>
                        )}
                      </div>

                      {/* Under it: How much they took and how many times */}
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          Took{' '}
                          <strong className="font-extrabold text-indigo-600 dark:text-indigo-400">
                            {formatUZS(group.totalAmount)}
                          </strong>
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {group.advanceCount} {group.advanceCount === 1 ? 'time' : 'times'}
                        </span>
                        {group.teacher?.subject && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                            <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">
                              {group.teacher.subject}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-2">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Total Taken
                      </span>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {formatUZS(group.totalAmount)}
                      </span>
                    </div>

                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isExpanded
                          ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* 4) Expanded Accordion Content: Dropdown showing when and how much taken each time */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4 sm:p-5 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                        <span>
                          Advance History for {group.teacherName} ({group.transactions.length})
                        </span>
                      </div>
                      <button
                        onClick={() => handleOpenAdd(group.teacherId)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Advance</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {group.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="bg-white dark:bg-slate-900 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                              <Banknote className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                  {formatUZS(tx.amount)}
                                </span>
                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {formatDateDisplay(tx.date)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                {tx.note ? (
                                  <span>
                                    Note: <strong className="text-slate-700 dark:text-slate-300">{tx.note}</strong>
                                  </span>
                                ) : (
                                  <span className="italic text-slate-400">No specific note</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                            <button
                              onClick={() => handleOpenEdit(tx)}
                              className="px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Edit advance"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setAdvanceToDelete(tx)}
                              className="px-2.5 py-1.5 rounded-md bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Delete advance"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 2) Distinctive Interactive Month & Year Picker Modal */}
      {isMonthPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <h3 className="font-extrabold text-base tracking-tight">Select Billing Month</h3>
              </div>
              <button
                onClick={() => setIsMonthPickerOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Year Changer */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700">
                <button
                  onClick={() => setPickerYear((y) => y - 1)}
                  className="p-2 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer"
                  title="Previous Year"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Year
                  </span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {pickerYear}
                  </span>
                </div>
                <button
                  onClick={() => setPickerYear((y) => y + 1)}
                  className="p-2 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer"
                  title="Next Year"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 gap-2">
                {MONTH_NAMES.map((m) => {
                  const ymKey = `${pickerYear}-${m.num}`;
                  const isSelected = selectedMonth === ymKey;
                  const isCurrent = currentActualYearMonth === ymKey;
                  const recordCount = advancesCountByYearMonth[ymKey] || 0;

                  return (
                    <button
                      key={m.num}
                      onClick={() => handleSelectMonthFromPicker(m.num)}
                      className={`p-3 rounded-lg text-center transition-all relative flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/30 scale-102'
                          : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-slate-200/60 dark:border-slate-750'
                      }`}
                    >
                      <span className="text-xs font-black">{m.short}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'}`}>
                        {m.full}
                      </span>

                      {/* Small badge if advances exist */}
                      {recordCount > 0 && (
                        <span
                          className={`mt-1 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          {recordCount} {recordCount === 1 ? 'adv' : 'advs'}
                        </span>
                      )}

                      {/* Indicator for current actual month */}
                      {isCurrent && !isSelected && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" title="Current Month" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleJumpToCurrentMonth}
                  className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Jump to Today ({formatMonthTitle(currentActualYearMonth)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMonthPickerOpen(false)}
                  className="px-3 py-1.5 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3) Record / Edit Advance Modal with Database Sync */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border-none animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {editingAdvance ? 'Edit Salary Advance' : 'Record Salary Advance'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Saves directly to database with teacher details attached
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdvance} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3 rounded-md text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Teacher Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Select Teacher *</span>
                  {formTeacherId && (
                    <span className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400">
                      {teachers.find((t) => t.id === formTeacherId)?.subject || ''}
                    </span>
                  )}
                </label>
                <select
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.title ? `(${t.title})` : ''} {t.subject ? `— ${t.subject}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount (UZS) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Amount (UZS) *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="e.g. 1 500 000"
                    value={formAmountInput}
                    onChange={handleAmountChange}
                    className="w-full px-3 py-2.5 pr-14 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <span className="absolute right-3 text-xs font-bold text-slate-400">UZS</span>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Date of Advance *
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Note / Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Note / Purpose (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Medical emergency, urgent travel, equipment..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving ? 'Saving to Database...' : editingAdvance ? 'Update Advance' : 'Save to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {advanceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-sm p-6 border-none animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              Delete Salary Advance?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Are you sure you want to delete this advance of <strong className="text-slate-900 dark:text-white">{formatUZS(advanceToDelete.amount)}</strong> for <strong className="text-slate-900 dark:text-white">{advanceToDelete.teacherName}</strong> from the database? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setAdvanceToDelete(null)}
                className="px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Advance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
