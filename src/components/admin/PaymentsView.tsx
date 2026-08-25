import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { StudentPayment, Installment, Student } from '../../types';
import { db } from '../../firebase.config';
import { collection, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  CreditCard,
  Search,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  DollarSign,
  TrendingUp,
  X,
  FileText,
  User,
  Check,
  AlertTriangle,
  Eye,
  Edit3
} from 'lucide-react';

export const PaymentsView: React.FC = () => {
  const { students, groups, recordStudentPayment, deleteStudentPaymentInstallment, updateStudentMonthlyFee } = useData();
  const { currentUser } = useAuth();

  // Current month state (YYYY-MM)
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [studentPayments, setStudentPayments] = useState<StudentPayment[]>([]);

  // Listen directly to active month's subcollection: student_payments/${currentDate}/records
  useEffect(() => {
    const colRef = collection(db, 'student_payments', currentDate, 'records');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items: StudentPayment[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          items.push({
            id: `${d.id}_${currentDate}`,
            studentId: d.id,
            studentName: data.studentName || '',
            groupId: data.groupId || '',
            groupName: data.groupName || '',
            monthYear: currentDate,
            monthlyFee: data.monthlyFee ?? 500000,
            totalPaid: data.totalPaid ?? 0,
            status: data.status || 'unpaid',
            installments: data.installments || [],
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString()
          });
        });
        setStudentPayments(items);
      },
      (error) => {
        console.warn('Student payments subcollection listener notice:', error);
      }
    );

    return () => unsubscribe();
  }, [currentDate]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordStudent, setRecordStudent] = useState<Student | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card / Bank Transfer' | 'Payme / Click' | 'Other'>('Cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History Drawer/Modal state
  const [historyPayment, setHistoryPayment] = useState<StudentPayment | null>(null);

  // Edit fee modal state
  const [editingFeePayment, setEditingFeePayment] = useState<StudentPayment | null>(null);
  const [editingFeeStudent, setEditingFeeStudent] = useState<Student | null>(null);
  const [feeInput, setFeeInput] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Parse monthYear for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formattedMonthYearDisplay = useMemo(() => {
    const [y, m] = currentDate.split('-');
    const monthIndex = parseInt(m, 10) - 1;
    return `${monthNames[monthIndex] || m} ${y}`;
  }, [currentDate]);

  const handlePrevMonth = () => {
    const [y, m] = currentDate.split('-').map(Number);
    let newY = y;
    let newM = m - 1;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setCurrentDate(`${newY}-${String(newM).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentDate.split('-').map(Number);
    let newY = y;
    let newM = m + 1;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    setCurrentDate(`${newY}-${String(newM).padStart(2, '0')}`);
  };

  // Active students list
  const activeStudents = useMemo(() => {
    return students.filter((s) => s.status !== 'inactive');
  }, [students]);

  // Combined payment records for all active students in current month
  const studentRows = useMemo(() => {
    return activeStudents.map((student) => {
      const docId = `${student.id}_${currentDate}`;
      const paymentRecord = studentPayments.find((p) => p.id === docId);
      const group = groups.find((g) => g.id === student.groupId);
      const groupName = group ? group.name : 'Unassigned';

      const monthlyFee = paymentRecord ? paymentRecord.monthlyFee : 500000;
      const totalPaid = paymentRecord ? paymentRecord.totalPaid : 0;
      const remaining = Math.max(0, monthlyFee - totalPaid);

      let status: 'unpaid' | 'partial' | 'paid' = 'unpaid';
      if (totalPaid >= monthlyFee) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partial';
      }

      return {
        student,
        docId,
        group,
        groupName,
        monthlyFee,
        totalPaid,
        remaining,
        status,
        paymentRecord: paymentRecord || {
          id: docId,
          studentId: student.id,
          studentName: `${student.firstName} ${student.surname}`,
          groupId: student.groupId || '',
          groupName,
          monthYear: currentDate,
          monthlyFee,
          totalPaid: 0,
          status: 'unpaid' as const,
          installments: []
        }
      };
    });
  }, [activeStudents, studentPayments, groups, currentDate]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return studentRows.filter((row) => {
      const fullName = `${row.student.firstName} ${row.student.surname}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase());
      const matchesGroup = selectedGroupFilter === 'all' || row.student.groupId === selectedGroupFilter;
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [studentRows, searchTerm, selectedGroupFilter, statusFilter]);

  // Academy Monthly Stats
  const stats = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let totalRemaining = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    studentRows.forEach((row) => {
      totalExpected += row.monthlyFee;
      totalCollected += row.totalPaid;
      totalRemaining += row.remaining;
      if (row.status === 'paid') paidCount++;
      else if (row.status === 'partial') partialCount++;
      else unpaidCount++;
    });

    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return {
      totalExpected,
      totalCollected,
      totalRemaining,
      collectionRate,
      paidCount,
      partialCount,
      unpaidCount,
      totalStudents: studentRows.length
    };
  }, [studentRows]);

  // Format currency
  const formatUZS = (val: number) => {
    return val.toLocaleString('en-US').replace(/,/g, ' ') + ' UZS';
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setAmountInput(raw);
  };

  const formattedAmountInput = useMemo(() => {
    if (!amountInput) return '';
    return Number(amountInput).toLocaleString('en-US').replace(/,/g, ' ');
  }, [amountInput]);

  const handleOpenRecordModal = (student?: Student) => {
    if (student) {
      setRecordStudent(student);
    } else if (activeStudents.length > 0) {
      setRecordStudent(activeStudents[0]);
    }
    setAmountInput('');
    setPaymentMethod('Cash');
    setPaymentDate(new Date().toISOString().substring(0, 10));
    setPaymentNote('');
    setIsRecordModalOpen(true);
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordStudent) return;
    const numericAmount = parseFloat(amountInput);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const group = groups.find((g) => g.id === recordStudent.groupId);
      const groupName = group ? group.name : 'Unassigned';

      await recordStudentPayment({
        studentId: recordStudent.id,
        studentName: `${recordStudent.firstName} ${recordStudent.surname}`,
        groupId: recordStudent.groupId || '',
        groupName,
        monthYear: currentDate,
        amount: numericAmount,
        method: paymentMethod,
        date: paymentDate,
        note: paymentNote.trim() || undefined
      });

      setToastMessage(`Payment of ${numericAmount.toLocaleString('en-US')} UZS recorded successfully.`);
      setTimeout(() => setToastMessage(null), 3500);
      setIsRecordModalOpen(false);
    } catch (err) {
      console.error('Failed to record payment:', err);
      alert('Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMonthYear = currentDate;
  const toast = {
    success: (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3500);
    },
    error: (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleDeleteInstallment = async (studentId: string, installmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this payment record?")) return;

    try {
      const docId = `${studentId}_${selectedMonthYear}`;
      await deleteStudentPaymentInstallment(docId, installmentId);

      // Update local history payment state if modal is open
      if (historyPayment) {
        const updated = historyPayment.installments.filter((item: any) => String(item.id) !== String(installmentId));
        const newTotalPaid = updated.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
        const fee = Number(historyPayment.monthlyFee || 0);

        let newStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
        if (newTotalPaid >= fee && fee > 0) {
          newStatus = 'paid';
        } else if (newTotalPaid > 0) {
          newStatus = 'partial';
        }

        if (updated.length === 0) {
          setHistoryPayment(null);
        } else {
          setHistoryPayment({
            ...historyPayment,
            totalPaid: newTotalPaid,
            status: newStatus,
            installments: updated
          });
        }
      }

      toast.success("Payment record deleted and balance updated.");
    } catch (error: any) {
      console.error("Failed to delete installment:", error);
      toast.error("Failed to delete payment record: " + (error?.message || 'Unknown error'));
    }
  };

  const handleUpdateFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeePayment || !editingFeeStudent) return;
    const feeVal = parseFloat(feeInput);
    if (isNaN(feeVal) || feeVal < 0) {
      alert('Please enter a valid monthly fee amount.');
      return;
    }

    try {
      const group = groups.find((g) => g.id === editingFeeStudent.groupId);
      const groupName = group ? group.name : 'Unassigned';

      await updateStudentMonthlyFee(editingFeePayment.id, feeVal, {
        studentId: editingFeeStudent.id,
        studentName: `${editingFeeStudent.firstName} ${editingFeeStudent.surname}`,
        groupId: editingFeeStudent.groupId || '',
        groupName,
        monthYear: currentDate
      });

      setToastMessage('Monthly tuition fee updated successfully.');
      setTimeout(() => setToastMessage(null), 3500);
      setEditingFeePayment(null);
      setEditingFeeStudent(null);
    } catch (err) {
      console.error('Failed to update fee:', err);
      alert('Failed to update fee.');
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 overflow-x-hidden">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Month Selector */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border-none shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full w-fit mb-1.5 border border-emerald-200/60 dark:border-emerald-800/60">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Monthly Tuition Ledger</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Student Payments & Collections
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track student monthly tuition fees, installments, payment methods, and financial summaries
          </p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Month Navigator */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{formattedMonthYearDisplay}</span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => handleOpenRecordModal()}
            className="px-4 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Academy Monthly Stats Summary (2x2 grid on mobile, 3-cols on sm+) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Collected */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Collected
            </p>
            <h3 className="text-base sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatUZS(stats.totalCollected)}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {stats.paidCount} paid in full
            </p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Outstanding
            </p>
            <h3 className="text-base sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              {formatUZS(stats.totalRemaining)}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {stats.unpaidCount} unpaid, {stats.partialCount} partial
            </p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Collection Rate & Paid Count (Colspan 2 on mobile) */}
        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Rate & Paid Count
              </p>
              <h3 className="text-base sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                {stats.paidCount}/{activeStudents.length} Paid ({stats.collectionRate}%)
              </h3>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats.collectionRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student by name..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Group Filter & Swipeable Status Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Groups ({groups.length})</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Status Filter Pills (Horizontal swipeable on mobile) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold overflow-x-auto no-scrollbar whitespace-nowrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'unpaid'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Unpaid</span>
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'partial'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Partial</span>
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'paid'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Paid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Students Table (hidden md:block) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/50">
                <th className="py-3.5 px-5">Student Name & Group</th>
                <th className="py-3.5 px-4">Expected Fee</th>
                <th className="py-3.5 px-4">Total Paid</th>
                <th className="py-3.5 px-4">Remaining Balance</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    No student payment records found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  return (
                    <tr
                      key={row.student.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Student Name & Group */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {row.student.firstName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white">
                              {row.student.firstName} {row.student.surname}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {row.groupName} {row.student.studentId ? `• ID: ${row.student.studentId}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Expected Fee */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-1.5 group">
                          <span>{formatUZS(row.monthlyFee)}</span>
                          <button
                            onClick={() => {
                              setEditingFeePayment(row.paymentRecord);
                              setEditingFeeStudent(row.student);
                              setFeeInput(row.monthlyFee.toString());
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                            title="Edit Expected Tuition Fee"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Total Paid */}
                      <td className="py-4 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatUZS(row.totalPaid)}
                      </td>

                      {/* Remaining Balance */}
                      <td className="py-4 px-4 font-mono font-bold">
                        {row.remaining > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded">
                            {formatUZS(row.remaining)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                            0 UZS (Cleared)
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4">
                        {row.status === 'paid' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Paid in Full 🟢</span>
                          </span>
                        )}
                        {row.status === 'partial' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Partial 🟡</span>
                          </span>
                        )}
                        {row.status === 'unpaid' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Unpaid 🔴</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenRecordModal(row.student)}
                            className="px-3 py-1.5 rounded-md bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Record</span>
                          </button>
                          <button
                            onClick={() => setHistoryPayment(row.paymentRecord)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="View Installment History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Student Cards List (block md:hidden) */}
      <div className="block md:hidden space-y-3">
        {filteredRows.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            No student payment records found matching the filters.
          </div>
        ) : (
          filteredRows.map((row) => {
            let statusBadgeStyles = '';
            let statusLabel = '';
            if (row.status === 'paid') {
              statusBadgeStyles = 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
              statusLabel = 'Paid in Full 🟢';
            } else if (row.status === 'partial') {
              statusBadgeStyles = 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
              statusLabel = 'Partial 🟡';
            } else {
              statusBadgeStyles = 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
              statusLabel = 'Unpaid 🔴';
            }

            return (
              <div
                key={row.student.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm space-y-3"
              >
                {/* Header: Student Name + Group Badge + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-base text-zinc-900 dark:text-white leading-snug">
                        {row.student.firstName} {row.student.surname}
                      </h3>
                      <button
                        onClick={() => {
                          setEditingFeePayment(row.paymentRecord);
                          setEditingFeeStudent(row.student);
                          setFeeInput(row.monthlyFee.toString());
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                        title="Edit Expected Tuition Fee"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md mt-1 inline-block">
                      {row.groupName} {row.student.studentId ? `• ID: ${row.student.studentId}` : ''}
                    </span>
                  </div>
                  {/* Status Badge */}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${statusBadgeStyles}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Progress & Financial Breakdown */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                    <span>Expected Fee:</span>
                    <span className="font-bold text-zinc-900 dark:text-white font-mono">{formatUZS(row.monthlyFee)} UZS</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                    <span>Total Paid:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatUZS(row.totalPaid)} UZS</span>
                  </div>
                  {row.status !== 'paid' && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400 font-medium">
                      <span>Remaining:</span>
                      <span className="font-mono">{formatUZS(row.remaining)} UZS</span>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleOpenRecordModal(row.student)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 shadow-sm active:scale-[0.98] transition cursor-pointer"
                  >
                    + Record Pay
                  </button>
                  <button
                    onClick={() => setHistoryPayment(row.paymentRecord)}
                    className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 active:scale-[0.98] transition cursor-pointer"
                  >
                    History ({row.paymentRecord?.installments?.length || 0})
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Record Payment Modal / Bottom Sheet */}
      {isRecordModalOpen && recordStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Record Tuition Payment</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Month: {formattedMonthYearDisplay}</p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Student
                </label>
                <select
                  value={recordStudent.id}
                  onChange={(e) => {
                    const found = students.find((s) => s.id === e.target.value);
                    if (found) setRecordStudent(found);
                  }}
                  className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {activeStudents.map((s) => {
                    const g = groups.find((gr) => gr.id === s.groupId);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.surname} ({g ? g.name : 'Unassigned'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Payment Amount (UZS)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formattedAmountInput}
                    onChange={handleAmountChange}
                    placeholder="e.g. 500,000"
                    className="w-full pl-4 pr-16 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    UZS
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card / Bank Transfer">Card / Bank Transfer</option>
                    <option value="Payme / Click">Payme / Click</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Note / Description (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. 1st installment, August tuition balance"
                  className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? 'Recording...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Installment History Modal / Bottom Sheet */}
      {historyPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {historyPayment.studentName}
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {historyPayment.groupName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Installment History for {formattedMonthYearDisplay}
                </p>
              </div>
              <button
                onClick={() => setHistoryPayment(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl grid grid-cols-3 gap-2 text-center sm:text-left">
                <div>
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">Expected Fee</p>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
                    {formatUZS(historyPayment.monthlyFee)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Paid</p>
                  <p className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    {formatUZS(historyPayment.totalPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">Remaining</p>
                  <p className="text-xs sm:text-sm font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                    {formatUZS(Math.max(0, historyPayment.monthlyFee - historyPayment.totalPaid))}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                  Itemized Installment Transactions ({historyPayment.installments.length})
                </h4>
                {historyPayment.installments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No payment installments recorded for this month yet.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {historyPayment.installments.map((inst) => (
                      <div
                        key={inst.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                              +{formatUZS(inst.amount)}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              {inst.method}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">{inst.date}</span>
                          </div>
                          {inst.note && <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{inst.note}"</p>}
                          <p className="text-[10px] text-slate-400">
                            Recorded by <strong className="text-slate-600 dark:text-slate-300">{inst.recordedByName}</strong> on {new Date(inst.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDeleteInstallment(historyPayment.studentId, inst.id)}
                          className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0"
                          title="Delete Installment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setHistoryPayment(null)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expected Fee Modal */}
      {editingFeePayment && editingFeeStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              Edit Monthly Tuition Fee
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Student: {editingFeeStudent.firstName} {editingFeeStudent.surname} ({formattedMonthYearDisplay})
            </p>

            <form onSubmit={handleUpdateFeeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Expected Fee (UZS)
                </label>
                <input
                  type="number"
                  required
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFeePayment(null);
                    setEditingFeeStudent(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                >
                  Save Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
