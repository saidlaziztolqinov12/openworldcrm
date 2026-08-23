import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  Megaphone,
  Check,
  AlertTriangle,
  X,
  CheckCheck,
  Layers,
  User
} from 'lucide-react';

interface InboxViewProps {
  onSelectGroup?: (groupId: string) => void;
}

type AdminScope = 'my_notifications' | 'global_announcements' | 'all_activity';
type CategoryFilter = 'all' | 'transfer_requests' | 'announcements' | 'unread';

export const InboxView: React.FC<InboxViewProps> = ({ onSelectGroup: _onSelectGroup }) => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    approveTransferRequest,
    rejectTransferRequest,
    publishAnnouncement
  } = useData();
  const { currentUser, isAdmin } = useAuth();

  // Admin Scope Filter
  const [adminScope, setAdminScope] = useState<AdminScope>('all_activity');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Announcement Form State
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [isPublishing, setIsPublishing] = useState(false);

  // Helper to normalize types and status
  const isTransferType = (type?: string) => {
    if (!type) return false;
    const t = type.toUpperCase();
    return t === 'TRANSFER_REQUEST' || t === 'TRANSFER';
  };

  const isStudentOfferType = (type?: string) => {
    if (!type) return false;
    const t = type.toUpperCase();
    return t === 'STUDENT_OFFER';
  };

  const isTransferOrOfferType = (type?: string) => {
    return isTransferType(type) || isStudentOfferType(type);
  };

  const isAnnouncementType = (type?: string) => {
    if (!type) return false;
    const t = type.toUpperCase();
    return t === 'ANNOUNCEMENT';
  };

  const isPendingStatus = (status?: string) => {
    if (!status) return true;
    return status.toUpperCase() === 'PENDING';
  };

  const isApprovedStatus = (status?: string) => {
    if (!status) return false;
    return status.toUpperCase() === 'APPROVED' || status.toUpperCase() === 'COMPLETED';
  };

  const isRejectedStatus = (status?: string) => {
    if (!status) return false;
    return status.toUpperCase() === 'REJECTED';
  };

  // 1. Filter notifications strictly by User Role & Scope
  const scopedNotifications = useMemo(() => {
    if (!currentUser) return [];

    if (!isAdmin) {
      // STRICT TEACHER SCOPE:
      // Show ONLY messages where recipientId === currentUserId OR recipientId === "GLOBAL" / "all_teachers" / "all"
      return notifications.filter((n) => {
        const isRecipient = n.recipientId === currentUser.id;
        const isGlobal =
          n.recipientId === 'GLOBAL' ||
          n.recipientId === 'all_teachers' ||
          n.recipientId === 'all' ||
          n.recipientRole === 'all' ||
          (n.recipientRole === 'teacher' && (n.recipientId === 'GLOBAL' || n.recipientId === 'all_teachers'));

        return isRecipient || isGlobal;
      });
    }

    // ADMIN SCOPES:
    switch (adminScope) {
      case 'my_notifications':
        return notifications.filter(
          (n) =>
            n.recipientId === currentUser.id ||
            n.recipientRole === 'admin' ||
            n.recipientId === 'admin' ||
            n.recipientId === 'admin-1'
        );
      case 'global_announcements':
        return notifications.filter(
          (n) =>
            isAnnouncementType(n.type) ||
            n.recipientId === 'GLOBAL' ||
            n.recipientId === 'all_teachers' ||
            n.recipientId === 'all'
        );
      case 'all_activity':
      default:
        return notifications;
    }
  }, [notifications, isAdmin, currentUser, adminScope]);

  // 2. Apply Category Filters (All, Transfer Requests, Announcements, Unread)
  const filteredNotifications = useMemo(() => {
    return scopedNotifications
      .filter((n) => {
        if (categoryFilter === 'unread') return !n.read;
        if (categoryFilter === 'transfer_requests') return isTransferType(n.type);
        if (categoryFilter === 'announcements') return isAnnouncementType(n.type);
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [scopedNotifications, categoryFilter]);

  // Counters for UI Badges
  const unreadCountInScope = useMemo(() => {
    return scopedNotifications.filter((n) => !n.read).length;
  }, [scopedNotifications]);

  const pendingTransfersInScope = useMemo(() => {
    return scopedNotifications.filter(
      (n) => isTransferType(n.type) && isPendingStatus(n.status)
    ).length;
  }, [scopedNotifications]);

  const announcementsInScope = useMemo(() => {
    return scopedNotifications.filter((n) => isAnnouncementType(n.type)).length;
  }, [scopedNotifications]);

  // Admin Scope Badges
  const myNotifsCount = useMemo(() => {
    if (!isAdmin) return 0;
    return notifications.filter(
      (n) =>
        n.recipientId === currentUser?.id ||
        n.recipientRole === 'admin' ||
        n.recipientId === 'admin' ||
        n.recipientId === 'admin-1'
    ).length;
  }, [notifications, isAdmin, currentUser]);

  const globalAnnouncementsCount = useMemo(() => {
    if (!isAdmin) return 0;
    return notifications.filter(
      (n) =>
        isAnnouncementType(n.type) ||
        n.recipientId === 'GLOBAL' ||
        n.recipientId === 'all_teachers' ||
        n.recipientId === 'all'
    ).length;
  }, [notifications, isAdmin]);

  // Handlers
  const handleApprove = async (notificationId: string) => {
    setProcessingId(notificationId);
    try {
      await approveTransferRequest(notificationId);
      setActionFeedback({
        type: 'success',
        message: 'Student successfully transferred!'
      });
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (e) {
      console.error(e);
      setActionFeedback({
        type: 'error',
        message: 'Failed to approve transfer.'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (notificationId: string) => {
    setProcessingId(notificationId);
    try {
      await rejectTransferRequest(notificationId);
      setActionFeedback({
        type: 'success',
        message: 'Transfer request rejected.'
      });
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (e) {
      console.error(e);
      setActionFeedback({
        type: 'error',
        message: 'Failed to reject request.'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead(currentUser?.id);
      setActionFeedback({
        type: 'success',
        message: 'All marked as read.'
      });
      setTimeout(() => setActionFeedback(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementMessage.trim()) return;

    setIsPublishing(true);
    try {
      await publishAnnouncement(
        announcementTitle.trim(),
        announcementMessage.trim(),
        announcementPriority
      );
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncementPriority('normal');
      setIsAnnouncementModalOpen(false);
      setActionFeedback({
        type: 'success',
        message: 'Announcement sent.'
      });
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (e) {
      console.error(e);
      setActionFeedback({
        type: 'error',
        message: 'Failed to send announcement.'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 overflow-x-hidden">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Inbox
        </h1>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {unreadCountInScope > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-slate-500" />
              <span>Mark All Read</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Megaphone className="w-4 h-4" />
              <span>Broadcast Announcement</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Toast Feedback */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Scope Control (Strictly shown when Admin) */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-1.5 transition-colors">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 px-3 uppercase tracking-wider hidden sm:inline">
            Scope:
          </span>
          <button
            onClick={() => setAdminScope('my_notifications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              adminScope === 'my_notifications'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Notifications</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                adminScope === 'my_notifications'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {myNotifsCount}
            </span>
          </button>

          <button
            onClick={() => setAdminScope('global_announcements')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              adminScope === 'global_announcements'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Global Announcements</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                adminScope === 'global_announcements'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {globalAnnouncementsCount}
            </span>
          </button>

          <button
            onClick={() => setAdminScope('all_activity')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              adminScope === 'all_activity'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Staff Activity</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                adminScope === 'all_activity'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {notifications.length}
            </span>
          </button>
        </div>
      )}

      {/* Category Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All ({scopedNotifications.length})
          </button>

          <button
            onClick={() => setCategoryFilter('transfer_requests')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'transfer_requests'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Requests</span>
            {pendingTransfersInScope > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-extrabold ml-0.5">
                {pendingTransfersInScope}
              </span>
            )}
          </button>

          <button
            onClick={() => setCategoryFilter('announcements')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'announcements'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Announcements</span>
            {announcementsInScope > 0 && (
              <span className="text-[10px] font-bold text-slate-400 ml-0.5">
                ({announcementsInScope})
              </span>
            )}
          </button>

          <button
            onClick={() => setCategoryFilter('unread')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'unread'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Unread</span>
            {unreadCountInScope > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold ml-0.5">
                {unreadCountInScope}
              </span>
            )}
          </button>
        </div>

        <span className="text-xs text-slate-400 dark:text-slate-500 px-2 font-medium">
          {filteredNotifications.length} notification{filteredNotifications.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 text-sm font-medium">
            No new notifications
          </div>
        ) : (
          filteredNotifications.map((notification, idx) => {
            const isTransfer = isTransferType(notification.type);
            const isStudentOffer = isStudentOfferType(notification.type);
            const isTransferOrOffer = isTransfer || isStudentOffer;
            const isAnnouncement = isAnnouncementType(notification.type);
            const isPending = isPendingStatus(notification.status);
            const isApproved = isApprovedStatus(notification.status);
            const isRejected = isRejectedStatus(notification.status);

            const isRecipient = notification.recipientId === currentUser?.id;
            const canActionTransfer = isTransferOrOffer && isPending && (isRecipient || isAdmin);

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                className={`p-5 rounded-3xl border transition-all ${
                  !notification.read
                    ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/80 shadow-xs ring-1 ring-indigo-500/20'
                    : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                }`}
                onClick={() => {
                  if (!notification.read) {
                    markNotificationAsRead(notification.id, currentUser?.id);
                  }
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                        isTransferOrOffer
                          ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          : isAnnouncement
                          ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isTransferOrOffer ? (
                        <ArrowRightLeft className="w-5 h-5" />
                      ) : isAnnouncement ? (
                        <Megaphone className="w-5 h-5" />
                      ) : (
                        <Bell className="w-5 h-5" />
                      )}
                    </div>

                    {/* Content: Sender Name, Message, Timestamp */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {notification.senderName || 'Staff Member'}
                        </span>

                        {isStudentOffer ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                            📥 A student offer
                          </span>
                        ) : isTransfer ? (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                              isPending
                                ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                : isApproved
                                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {isPending
                              ? 'PENDING'
                              : isApproved
                              ? 'APPROVED'
                              : isRejected
                              ? 'REJECTED'
                              : notification.status || 'PENDING'}
                          </span>
                        ) : null}

                        {isAnnouncement && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            ANNOUNCEMENT
                          </span>
                        )}

                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                        )}
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {new Date(notification.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Approve & Add / Reject */}
                  {canActionTransfer && (
                    <div className="flex items-center gap-2 sm:self-center shrink-0 pt-2 sm:pt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(notification.id);
                        }}
                        disabled={processingId === notification.id}
                        className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{processingId === notification.id ? 'Processing...' : 'Reject'}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(notification.id);
                        }}
                        disabled={processingId === notification.id}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{processingId === notification.id ? 'Approving...' : 'Approve & Add'}</span>
                      </button>
                    </div>
                  )}

                  {/* Resolved status indicator */}
                  {isTransferOrOffer && !isPending && (
                    <div className="sm:self-center shrink-0">
                      {isApproved ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approved</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800">
                          <XCircle className="w-4 h-4" />
                          <span>Declined</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Broadcast Announcement Modal */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
                  <Megaphone className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Broadcast Announcement
                </h2>
              </div>
              <button
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="e.g. Schedule Update"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Urgency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'important', 'urgent'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAnnouncementPriority(p)}
                      className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                        announcementPriority === p
                          ? p === 'urgent'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : p === 'important'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Message *
                </label>
                <textarea
                  rows={4}
                  required
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  placeholder="Type your announcement..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isPublishing ? 'Sending...' : 'Send Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
