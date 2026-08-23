import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
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
  Banknote
} from 'lucide-react';

export const SalaryAdvancesView: React.FC = () => {
  const { salaryAdvances, teachers, addSalaryAdvance, updateSalaryAdvance, deleteSalaryAdvance } = useData();

  // Current month state (YYYY-MM)
  const now = new Date();
  const defaultYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultYearMonth);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expanded teacher accordion state (set of teacherIds)
  const [expandedTeachers, setExpandedTeachers] = useState<Record<string, boolean>>({});

  // Modal state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAdvance, setEditingAdvance] = useState<SalaryAdvance | null>(null);

  // Form states
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formAmountInput, setFormAmountInput] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().substring(0, 10));
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
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Filter advances matching selectedMonth
  const monthAdvances = useMemo(() => {
    return salaryAdvances.filter((adv) => {
      const advMonth = adv.monthYear || (adv.date ? adv.date.substring(0, 7) : '');
      return advMonth === selectedMonth;
    });
  }, [salaryAdvances, selectedMonth]);

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

  const formatUZS = (num: number) => {
    return num.toLocaleString('en-US').replace(/,/g, ' ') + ' UZS';
  };

  const handleOpenAdd = () => {
    setEditingAdvance(null);
    setFormTeacherId(teachers[0]?.id || '');
    setFormAmountInput('');
    setFormDate(new Date().toISOString().substring(0, 10));
    setFormNote('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (adv: SalaryAdvance) => {
    setEditingAdvance(adv);
    setFormTeacherId(adv.teacherId);
    setFormAmountInput(adv.amount.toLocaleString('en-US').replace(/,/g, ' '));
    setFormDate(adv.date || new Date().toISOString().substring(0, 10));
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

    const teacher = teachers.find((t) => t.id === formTeacherId);
    const teacherName = teacher?.name || 'Teacher';
    const monthYear = formDate.substring(0, 7);

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingAdvance) {
        await updateSalaryAdvance(editingAdvance.id, {
          teacherId: formTeacherId,
          teacherName,
          amount: cleanAmount,
          date: formDate,
          monthYear,
          note: formNote.trim() || undefined
        });
        setSuccessToast('Salary advance updated successfully!');
      } else {
        await addSalaryAdvance({
          teacherId: formTeacherId,
          teacherName,
          amount: cleanAmount,
          date: formDate,
          monthYear,
          note: formNote.trim() || undefined
        });
        setSuccessToast('Salary advance recorded successfully!');
      }

      setIsModalOpen(false);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      console.error('Failed to save salary advance:', err);
      setFormError('Failed to save record. Please try again.');
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
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border-none shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full w-fit mb-1.5 border border-indigo-200/60 dark:border-indigo-800/60">
            <Wallet className="w-3.5 h-3.5" />
            <span>Financials & Advances</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Teacher Salary Advances
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track and manage cash advances distributed to faculty members prior to monthly payroll
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Advance</span>
        </button>
      </div>

      {/* Top Month Selector & Academy Summary Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Month Selector Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs flex flex-col items-center justify-center gap-3 transition-colors">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Select Billing Month
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white text-sm">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{formatMonthTitle(selectedMonth)}</span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Academy Summary Stat Cards */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Academy Advances
            </span>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {formatUZS(totalAcademyAdvances)}
            </div>
          </div>
          <div className="w-11 h-11 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border-none shadow-xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Transactions
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {monthAdvances.length} <span className="text-xs font-semibold text-slate-400">entries</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border-none shadow-xs flex items-center gap-3 transition-colors">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
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
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Teacher-Grouped Accordion List */}
      <div className="space-y-3">
        {filteredTeacherGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-lg p-12 text-center shadow-xs border-none">
            <Wallet className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No salary advances recorded for this month</h3>
            <p className="text-xs text-slate-400 mt-1">
              Click "+ Record Advance" above to add a new cash advance entry for any teacher.
            </p>
          </div>
        ) : (
          filteredTeacherGroups.map((group) => {
            const isExpanded = !!expandedTeachers[group.teacherId];
            return (
              <div
                key={group.teacherId}
                className="bg-white dark:bg-slate-900 rounded-lg border-none shadow-xs overflow-hidden transition-colors"
              >
                {/* Teacher Card Header (Clickable Accordion Toggle) */}
                <div
                  onClick={() => toggleTeacherExpand(group.teacherId)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <TeacherAvatar teacher={group.teacher || { name: group.teacherName, email: '' }} className="w-10 h-10" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                          {group.teacherName}
                        </h3>
                        {group.teacher?.title && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                            {group.teacher.title}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {group.teacher?.subject || 'Instructor'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* Badge */}
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Took {group.advanceCount} {group.advanceCount === 1 ? 'time' : 'times'}
                    </span>

                    {/* Total Amount */}
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block sm:hidden">Total</span>
                      <span className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400">
                        {formatUZS(group.totalAmount)}
                      </span>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded Accordion Content: Sub-list of individual advances */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-4 sm:p-5 space-y-3 animate-in fade-in">
                    <div className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 mb-2">
                      Individual Transaction History ({group.transactions.length})
                    </div>

                    <div className="space-y-2">
                      {group.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="bg-white dark:bg-slate-900 rounded-md p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs border-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                              <Banknote className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {tx.date}
                                </span>
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                  {formatUZS(tx.amount)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                {tx.note ? `Note: ${tx.note}` : 'No note provided'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleOpenEdit(tx)}
                              className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Edit advance"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setAdvanceToDelete(tx)}
                              className="px-2.5 py-1.5 rounded bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
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

      {/* Record / Edit Advance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md overflow-hidden border-none animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {editingAdvance ? 'Edit Salary Advance' : 'Record Salary Advance'}
                </h3>
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
                <div className="bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3 rounded-md text-xs font-bold">
                  {formError}
                </div>
              )}

              {/* Teacher Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Teacher *
                </label>
                <select
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.title ? `(${t.title})` : ''}
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
                  Date *
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
                  Note / Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Medical emergency, equipment..."
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
                  className="px-5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : editingAdvance ? 'Update Advance' : 'Save Advance'}
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
              Are you sure you want to delete this advance of <strong className="text-slate-900 dark:text-white">{formatUZS(advanceToDelete.amount)}</strong> for <strong className="text-slate-900 dark:text-white">{advanceToDelete.teacherName}</strong>? This action cannot be undone.
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
