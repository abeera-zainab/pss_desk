import { useEffect, useState } from "react";
import type { LeaveRequestDTO, LeaveType } from "@shared/types";
import { api, apiError } from "../lib/api";
import { Badge, Modal, Spinner, ErrorText } from "../components/ui";
import { formatDate } from "../lib/format";
import { useAuth } from "../store/auth";
import { card, label, input, btnDark, heading, tableHead, colors } from "../lib/theme";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faCalendarDay, 
  faUser, 
  faClock, 
  faCheckCircle, 
  faTimesCircle, 
  faHourglassHalf,
  faCalendarAlt,
  faUserCheck,
  faUserTimes,
  faRocket,
  faSearch,
  faFilter,
  faCircle,
  faChartBar,
  faArrowRight,
  faHistory
} from '@fortawesome/free-solid-svg-icons';

// Keyframes for animations
function LeaveKeyframes() {
  return (
    <style>{`
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.25); }
        50% { box-shadow: 0 0 20px 4px rgba(99, 102, 241, 0.08); }
      }
    `}</style>
  );
}

const LEAVE_TYPES: LeaveType[] = ["SICK", "CASUAL", "EARNED", "UNPAID"];

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  APPROVED: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-red-50 text-red-600"
};

const STATUS_ICON: Record<string, any> = {
  PENDING: faHourglassHalf,
  APPROVED: faCheckCircle,
  REJECTED: faTimesCircle
};

export default function Leave() {
  const user = useAuth((s) => s.user);
  const canReview = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [requests, setRequests] = useState<LeaveRequestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  function load() {
    setLoading(true);
    api
      .getLeaveRequests({})
      .then(setRequests)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleApprove(id: string) {
    try {
      await api.approveLeave(id);
      load();
    } catch (e) {
      alert(apiError(e));
    }
  }

  const filteredRequests = requests.filter(r => 
    r.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === 'PENDING').length;
  const approvedRequests = requests.filter(r => r.status === 'APPROVED').length;

  return (
    <div className="p-6 lg:p-8" style={{ background: "#F8FAFC", minHeight: '100vh' }}>
      <LeaveKeyframes />

      {/* Header */}
      <div className="mb-6" style={{ animation: "fadeUp 0.5s ease-out both" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div 
                className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-md"
                style={{ 
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)',
                }}
              >
                <FontAwesomeIcon icon={faCalendarDay} className="text-xl text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: "#1A1D23" }}>
                  Leave Management
                </h1>
                <p className="mt-0.5 text-sm flex items-center gap-3" style={{ color: "#64748B" }}>
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-indigo-400 text-xs" />
                    {totalRequests} total
                  </span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faHourglassHalf} className="text-amber-400 text-xs" />
                    {pendingRequests} pending
                  </span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-400 text-xs" />
                    {approvedRequests} approved
                  </span>
                </p>
              </div>
            </div>
          </div>
          
          <button
            className="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg active:scale-95"
            style={{ 
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
            }}
            onClick={() => setShowRequest(true)}
          >
            <FontAwesomeIcon icon={faPlus} className="text-sm" />
            Request Leave
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <FontAwesomeIcon 
              icon={faSearch} 
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "#94A3B8" }}
            />
            <input
              type="text"
              placeholder="Search by employee or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border bg-white px-4 py-2.5 pl-10 text-sm transition-colors duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              style={{ borderColor: "#E2E8F0" }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div 
              className="h-12 w-12 animate-spin rounded-full border-4"
              style={{ 
                borderColor: '#E2E8F0',
                borderTopColor: '#6366F1',
              }}
            />
            <p className="text-sm font-medium" style={{ color: "#64748B" }}>Loading leave requests...</p>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border bg-white shadow-sm overflow-hidden" style={{ borderColor: "#E2E8F0", animation: "fadeUp 0.5s ease-out both" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50" style={{ borderColor: "#E2E8F0" }}>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faUser} className="text-[10px] text-indigo-400" />
                      Employee
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-[10px] text-indigo-400" />
                      Type
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendarDay} className="text-[10px] text-indigo-400" />
                      From
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCalendarDay} className="text-[10px] text-indigo-400" />
                      To
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faChartBar} className="text-[10px] text-indigo-400" />
                      Days
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCircle} className="text-[10px] text-indigo-400" />
                      Status
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    Reason
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                    Review note
                  </th>
                  {canReview && (
                    <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#E2E8F0" }}>
                {filteredRequests.map((r, index) => (
                  <tr 
                    key={r.id} 
                    className="hover:bg-gray-50/60"
                    style={{ animation: `slideIn 0.3s ease-out ${index * 30}ms both` }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ 
                            background: `linear-gradient(135deg, #6366F1, #8B5CF6)`,
                          }}
                        >
                          {r.user?.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <span className="font-medium" style={{ color: "#1A1D23" }}>{r.user?.name ?? "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-indigo-50 text-indigo-600">
                        {r.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#64748B" }}>
                      {formatDate(r.startDate)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#64748B" }}>
                      {formatDate(r.endDate)}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "#1A1D23" }}>
                      {r.days}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE[r.status]}>
                        <FontAwesomeIcon icon={STATUS_ICON[r.status]} className="mr-1.5 text-[9px]" />
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[14rem]" style={{ color: "#64748B" }}>
                      {r.reason || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[14rem]" style={{ color: r.status === "REJECTED" ? "#B91C1C" : "#64748B" }}>
                      {r.status === "REJECTED" && r.reviewComment ? r.reviewComment : "—"}
                    </td>
                    {canReview && (
                      <td className="px-4 py-3 text-right">
                        {r.status === "PENDING" &&
                          (user?.role === "ADMIN" || r.user?.managerId === user?.id) && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors duration-200 hover:bg-emerald-50"
                              onClick={() => handleApprove(r.id)}
                            >
                              <FontAwesomeIcon icon={faCheckCircle} className="text-[10px]" />
                              Approve
                            </button>
                            <button
                              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors duration-200 hover:bg-red-50"
                              onClick={() => setRejectingId(r.id)}
                            >
                              <FontAwesomeIcon icon={faTimesCircle} className="text-[10px]" />
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredRequests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#EEF2FF" }}>
                <FontAwesomeIcon icon={faCalendarDay} className="text-2xl text-indigo-400" />
              </div>
              <p className="mt-3 text-sm font-medium" style={{ color: "#1A1D23" }}>No leave requests found</p>
              <p className="text-xs" style={{ color: "#64748B" }}>Try adjusting your search</p>
            </div>
          )}
        </div>
      )}

      {showRequest && (
        <RequestLeaveModal
          onClose={() => setShowRequest(false)}
          onCreated={() => {
            setShowRequest(false);
            load();
          }}
        />
      )}

      {rejectingId && (
        <RejectLeaveModal
          leaveId={rejectingId}
          onClose={() => setRejectingId(null)}
          onDone={() => {
            setRejectingId(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function RequestLeaveModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<LeaveType>("CASUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
    if (days > 30) {
      setError("Leave requests cannot exceed 30 days");
      return;
    }

    setSaving(true);
    try {
      await api.requestLeave({ type, startDate, endDate, reason });
      onCreated();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Request Leave" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className={label}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
            <FontAwesomeIcon icon={faCalendarAlt} className="text-indigo-500" />
            Leave Type
          </span>
          <select 
            className={`${input} mt-1.5 rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100`} 
            value={type} 
            onChange={(e) => setType(e.target.value as LeaveType)}
          >
            {LEAVE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className={label}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
            <FontAwesomeIcon icon={faCalendarDay} className="text-indigo-500" />
            Start Date
          </span>
          <input 
            className={`${input} mt-1.5 rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100`} 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            required 
          />
        </label>

        <label className={label}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
            <FontAwesomeIcon icon={faCalendarDay} className="text-indigo-500" />
            End Date
          </span>
          <input 
            className={`${input} mt-1.5 rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100`} 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            required 
          />
        </label>

        <label className={label}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
            <FontAwesomeIcon icon={faRocket} className="text-indigo-500" />
            Reason
          </span>
          <textarea 
            className={`${input} mt-1.5 min-h-[80px] rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100`} 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
            required 
            placeholder="Provide reason for leave..."
          />
        </label>

        <ErrorText message={error} />

        <div className="flex items-center gap-3 pt-2">
          <button
            className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors duration-200 hover:bg-gray-200"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={saving}
            style={{ 
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)'
            }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Submitting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faRocket} />
                Submit Request
              </span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RejectLeaveModal({
  leaveId,
  onClose,
  onDone
}: {
  leaveId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reviewComment, setReviewComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.rejectLeave(leaveId, reviewComment);
      onDone();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Reject Leave Request" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className={label}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#1A1D23" }}>
            <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />
            Reason for Rejection
          </span>
          <textarea 
            className={`${input} mt-1.5 min-h-[80px] rounded-xl border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100`} 
            value={reviewComment} 
            onChange={(e) => setReviewComment(e.target.value)} 
            required 
            placeholder="Provide reason for rejection..."
          />
        </label>

        <ErrorText message={error} />

        <div className="flex items-center gap-3 pt-2">
          <button
            className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors duration-200 hover:bg-gray-200"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={saving}
            style={{ 
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
            }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Rejecting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faTimesCircle} />
                Reject
              </span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}